-- P3 共有: グループ作成・招待・コメント・リアクション(F-02, F-06, F-07)

-- ---------------------------------------------------------------------------
-- ヘルパー: 現在のユーザーのスペースでのロール(非メンバーは null)
-- ---------------------------------------------------------------------------

create or replace function public.space_role_of(target_space_id uuid)
returns public.space_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.space_members
  where space_id = target_space_id
    and user_id = (select auth.uid());
$$;

-- アイテムが指定スペースへ共有されているか
create or replace function public.is_item_shared_to(
  target_item_id uuid,
  target_space_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.item_shares
    where item_id = target_item_id
      and space_id = target_space_id
  );
$$;

revoke execute on function
  public.space_role_of(uuid),
  public.is_item_shared_to(uuid, uuid)
from public, anon;

grant execute on function
  public.space_role_of(uuid),
  public.is_item_shared_to(uuid, uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- グループ作成(F-02-1): スペース作成とownerメンバー登録を1トランザクションで
-- ---------------------------------------------------------------------------

create or replace function public.create_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_space_id uuid;
  trimmed text := btrim(coalesce(group_name, ''));
begin
  if uid is null then
    raise exception 'ログインが必要です';
  end if;
  if trimmed = '' or char_length(trimmed) > 50 then
    raise exception 'グループ名は1〜50文字で入れてください';
  end if;

  insert into public.spaces (type, name, created_by)
  values ('group', trimmed, uid)
  returning id into new_space_id;

  insert into public.space_members (space_id, user_id, role)
  values (new_space_id, uid, 'owner');

  return new_space_id;
end;
$$;

revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;

-- スペース設定の変更(F-02-6)は owner / admin のみ
create policy spaces_update on public.spaces
  for update to authenticated
  using (public.space_role_of(id) in ('owner', 'admin'))
  with check (public.space_role_of(id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- メンバー管理(F-02-5)
--   退出: 自分の行を消せる(ownerは除く: グループを放置させない)
--   除名: owner / admin が owner 以外を外せる
--   ロール変更(F-02-4): owner が owner 以外の行を member/admin に変更できる
-- ---------------------------------------------------------------------------

create policy space_members_delete on public.space_members
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'owner')
    or (
      public.space_role_of(space_id) in ('owner', 'admin')
      and role <> 'owner'
    )
  );

create policy space_members_update on public.space_members
  for update to authenticated
  using (
    public.space_role_of(space_id) = 'owner'
    and role <> 'owner'
  )
  with check (role in ('member', 'admin'));

grant update, delete on public.space_members to authenticated;

-- ---------------------------------------------------------------------------
-- 招待(F-02-3): 有効期限付きトークン。作成は owner / admin
-- 受諾は SECURITY DEFINER の RPC(未メンバーでも行を追加できる必要があるため)
-- ---------------------------------------------------------------------------

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  expires_at timestamptz not null default now() + interval '7 days',
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.invitations is '招待リンク(有効期限つきトークン。既定7日)';

grant select, insert, delete on public.invitations to authenticated;

alter table public.invitations enable row level security;

create policy invitations_select on public.invitations
  for select to authenticated
  using (public.space_role_of(space_id) in ('owner', 'admin'));

create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.space_role_of(space_id) in ('owner', 'admin')
  );

create policy invitations_delete on public.invitations
  for delete to authenticated
  using (public.space_role_of(space_id) in ('owner', 'admin'));

-- 招待の下見(参加前にスペース名を見せる)
create or replace function public.invitation_preview(invite_token text)
returns table (space_name text, space_type public.space_type, expired boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.name, s.type, i.expires_at < now()
  from public.invitations i
  join public.spaces s on s.id = i.space_id
  where i.token = invite_token;
$$;

-- 招待の受諾: 期限内トークンなら member として参加
create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  target_space uuid;
begin
  if uid is null then
    raise exception 'ログインが必要です';
  end if;

  select space_id into target_space
  from public.invitations
  where token = invite_token
    and expires_at > now();

  if target_space is null then
    raise exception '招待が見つからないか、期限が切れています';
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (target_space, uid, 'member')
  on conflict (space_id, user_id) do nothing;

  return target_space;
end;
$$;

revoke execute on function
  public.invitation_preview(text),
  public.accept_invitation(text)
from public, anon;

grant execute on function
  public.invitation_preview(text),
  public.accept_invitation(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- コメント(F-07-4): スペース全員に可視のオープン型。非公開返信は作らない(不変条件3・4)
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.comments is 'コメント(どのスペース文脈かを保持。スペース全員に可視)';

create index comments_item_space_idx on public.comments (item_id, space_id, created_at);

grant select, insert, delete on public.comments to authenticated;

alter table public.comments enable row level security;

create policy comments_select on public.comments
  for select to authenticated
  using (public.is_space_member(space_id));

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_space_member(space_id)
    and public.is_item_shared_to(item_id, space_id)
  );

create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- リアクション(F-07-5): スタンプ
-- ---------------------------------------------------------------------------

create table public.reactions (
  item_id uuid not null references public.items (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (item_id, space_id, user_id, emoji)
);

comment on table public.reactions is 'スタンプによるリアクション';

grant select, insert, delete on public.reactions to authenticated;

alter table public.reactions enable row level security;

create policy reactions_select on public.reactions
  for select to authenticated
  using (public.is_space_member(space_id));

create policy reactions_insert on public.reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_space_member(space_id)
    and public.is_item_shared_to(item_id, space_id)
  );

create policy reactions_delete on public.reactions
  for delete to authenticated
  using (user_id = (select auth.uid()));
