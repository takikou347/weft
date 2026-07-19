-- P5 組織・プロジェクト(F-02-2, F-08)

-- ---------------------------------------------------------------------------
-- 組織の作成(F-02-1): グループ同様、作成者が owner
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_space_id uuid;
  trimmed text := btrim(coalesce(org_name, ''));
begin
  if uid is null then
    raise exception 'ログインが必要です';
  end if;
  if trimmed = '' or char_length(trimmed) > 50 then
    raise exception '名前は1〜50文字で入れてください';
  end if;

  insert into public.spaces (type, name, created_by)
  values ('organization', trimmed, uid)
  returning id into new_space_id;

  insert into public.space_members (space_id, user_id, role)
  values (new_space_id, uid, 'owner');

  return new_space_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- プロジェクトの作成(F-02-2): 組織の owner / admin のみ(§7)
-- 作成者がプロジェクトの owner になる
-- ---------------------------------------------------------------------------

create or replace function public.create_project(org_id uuid, project_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_space_id uuid;
  trimmed text := btrim(coalesce(project_name, ''));
begin
  if uid is null then
    raise exception 'ログインが必要です';
  end if;
  if trimmed = '' or char_length(trimmed) > 50 then
    raise exception '名前は1〜50文字で入れてください';
  end if;
  if not exists (
    select 1 from public.spaces
    where id = org_id and type = 'organization'
  ) then
    raise exception '組織が見つかりません';
  end if;
  if public.space_role_of(org_id) not in ('owner', 'admin') then
    raise exception 'プロジェクトを作れるのは組織の世話役・副世話役だけです';
  end if;

  insert into public.spaces (type, name, parent_space_id, created_by)
  values ('project', trimmed, org_id, uid)
  returning id into new_space_id;

  insert into public.space_members (space_id, user_id, role)
  values (new_space_id, uid, 'owner');

  insert into public.projects_meta (space_id) values (new_space_id);

  return new_space_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- プロジェクトへのメンバー追加: プロジェクトの owner/admin が、
-- 親組織のメンバーを直接加えられる(招待リンクも従来どおり使える)
-- ---------------------------------------------------------------------------

create or replace function public.add_project_member(
  project_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_org uuid;
begin
  select parent_space_id into parent_org
  from public.spaces
  where id = project_id and type = 'project';

  if parent_org is null then
    raise exception 'プロジェクトが見つかりません';
  end if;
  if public.space_role_of(project_id) not in ('owner', 'admin') then
    raise exception 'なかまを加えられるのはプロジェクトの世話役・副世話役だけです';
  end if;
  if not exists (
    select 1 from public.space_members
    where space_id = parent_org and user_id = target_user_id
  ) then
    raise exception '組織のなかまだけを加えられます';
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (project_id, target_user_id, 'member')
  on conflict (space_id, user_id) do nothing;
end;
$$;

revoke execute on function
  public.create_organization(text),
  public.create_project(uuid, text),
  public.add_project_member(uuid, uuid)
from public, anon;

grant execute on function
  public.create_organization(text),
  public.create_project(uuid, text),
  public.add_project_member(uuid, uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- 組織の owner/admin は配下プロジェクトの「存在とメタ情報」を見られる
-- (ダッシュボード F-08-5 のため。プロジェクト内のアイテムは見えないまま: §6.3)
-- ---------------------------------------------------------------------------

create or replace function public.is_parent_org_manager(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.spaces s
    join public.space_members m on m.space_id = s.parent_space_id
    where s.id = target_space_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  );
$$;

revoke execute on function public.is_parent_org_manager(uuid) from public, anon;
grant execute on function public.is_parent_org_manager(uuid) to authenticated;

create policy spaces_select_org_manager on public.spaces
  for select to authenticated
  using (public.is_parent_org_manager(id));

-- ---------------------------------------------------------------------------
-- projects_meta(F-08-1): プロジェクトの期間・状態・予算総額
-- ---------------------------------------------------------------------------

create table public.projects_meta (
  space_id uuid primary key references public.spaces (id) on delete cascade,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'done')),
  start_on date,
  end_on date,
  budget_total bigint not null default 0 check (budget_total >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.projects_meta is 'プロジェクト固有情報(状態・期間・予算総額)';

create trigger projects_meta_set_updated_at
  before update on public.projects_meta
  for each row execute function public.set_updated_at();

grant select, update on public.projects_meta to authenticated;

alter table public.projects_meta enable row level security;

create policy projects_meta_select on public.projects_meta
  for select to authenticated
  using (
    public.is_space_member(space_id)
    or public.is_parent_org_manager(space_id)
  );

-- 予算・状態の編集は owner / admin のみ(§7)
create policy projects_meta_update on public.projects_meta
  for update to authenticated
  using (public.space_role_of(space_id) in ('owner', 'admin'))
  with check (public.space_role_of(space_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- budgets(F-08-3): 予実の「予」側(費目別・期間別)
-- ---------------------------------------------------------------------------

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 20),
  planned_amount bigint not null check (planned_amount >= 0),
  period text check (period ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  unique (space_id, category, period)
);

comment on table public.budgets is '予算(費目別)。period は YYYY-MM、null は全期間';

grant select, insert, update, delete on public.budgets to authenticated;

alter table public.budgets enable row level security;

create policy budgets_select on public.budgets
  for select to authenticated
  using (
    public.is_space_member(space_id)
    or public.is_parent_org_manager(space_id)
  );

create policy budgets_write on public.budgets
  for insert to authenticated
  with check (public.space_role_of(space_id) in ('owner', 'admin'));

create policy budgets_update on public.budgets
  for update to authenticated
  using (public.space_role_of(space_id) in ('owner', 'admin'))
  with check (public.space_role_of(space_id) in ('owner', 'admin'));

create policy budgets_delete on public.budgets
  for delete to authenticated
  using (public.space_role_of(space_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- タスクのステータス変更(F-08-2): 作成者に加え、担当者にも許可(§6.3の唯一の例外)
-- ---------------------------------------------------------------------------

create or replace function public.update_task_status(
  target_item_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  item record;
begin
  if new_status not in ('todo', 'doing', 'done') then
    raise exception 'ステータスが正しくありません';
  end if;

  select id, owner_id, payload into item
  from public.items
  where id = target_item_id and type = 'task';

  if item.id is null then
    raise exception 'つとめが見つかりません';
  end if;
  if uid is distinct from item.owner_id
     and (item.payload ->> 'assignee') is distinct from uid::text then
    raise exception 'ステータスを変えられるのは作成者と担当者だけです';
  end if;

  update public.items
  set payload = payload || jsonb_build_object('status', new_status)
  where id = target_item_id;
end;
$$;

revoke execute on function public.update_task_status(uuid, text) from public, anon;
grant execute on function public.update_task_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- スペースの収支集計(F-05-5 / F-08-3 の「実」側)
-- そのスペースへ共有されている expense アイテムを合算(SECURITY INVOKER = RLS適用)
-- ---------------------------------------------------------------------------

create or replace function public.space_expense_summary(target_space_id uuid)
returns table (kind text, total bigint, entry_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(i.payload ->> 'kind', 'expense') as kind,
    coalesce(sum((i.payload ->> 'amount')::bigint), 0) as total,
    count(*) as entry_count
  from public.items i
  join public.item_shares s on s.item_id = i.id
  where s.space_id = target_space_id
    and i.type = 'expense'
  group by 1;
$$;

revoke execute on function public.space_expense_summary(uuid) from public, anon;
grant execute on function public.space_expense_summary(uuid) to authenticated;
