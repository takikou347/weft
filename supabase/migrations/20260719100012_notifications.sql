-- P6 アプリ内通知(F-11-1)
-- 共有された / コメントされた / リアクションされた / タスクを割り当てられた /
-- 精算が登録された、をトリガで records に積む。配信はアプリ内のみ(F-11-2/3)

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null
    check (type in ('shared', 'comment', 'reaction', 'task_assigned', 'settlement')),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'アプリ内通知(F-11-1)';

create index notifications_user_idx on public.notifications (user_id, created_at desc);

grant select, update on public.notifications to authenticated;

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 既読化のみ(read_at 以外は書き換えない前提。挿入はトリガのみが行う)
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- トリガ関数(SECURITY DEFINER: RLSを通らず通知行を積む)
-- ---------------------------------------------------------------------------

-- 共有された: 共有先スペースの(共有者以外の)全員へ
create or replace function public.notify_on_share()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, payload)
  select
    m.user_id,
    'shared',
    jsonb_build_object(
      'item_id', new.item_id,
      'space_id', new.space_id,
      'actor_id', new.shared_by
    )
  from public.space_members m
  where m.space_id = new.space_id
    and m.user_id <> new.shared_by;
  return new;
end;
$$;

create trigger on_item_shared
  after insert on public.item_shares
  for each row execute function public.notify_on_share();

-- コメントされた: アイテムの作成者へ(自分のコメントは除く)
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_owner uuid;
begin
  select owner_id into item_owner from public.items where id = new.item_id;
  if item_owner is not null and item_owner <> new.author_id then
    insert into public.notifications (user_id, type, payload)
    values (
      item_owner,
      'comment',
      jsonb_build_object(
        'item_id', new.item_id,
        'space_id', new.space_id,
        'actor_id', new.author_id
      )
    );
  end if;
  return new;
end;
$$;

create trigger on_comment_added
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- リアクションされた: アイテムの作成者へ
create or replace function public.notify_on_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_owner uuid;
begin
  select owner_id into item_owner from public.items where id = new.item_id;
  if item_owner is not null and item_owner <> new.user_id then
    insert into public.notifications (user_id, type, payload)
    values (
      item_owner,
      'reaction',
      jsonb_build_object(
        'item_id', new.item_id,
        'space_id', new.space_id,
        'actor_id', new.user_id,
        'emoji', new.emoji
      )
    );
  end if;
  return new;
end;
$$;

create trigger on_reaction_added
  after insert on public.reactions
  for each row execute function public.notify_on_reaction();

-- タスクを割り当てられた: 担当者へ(自分で自分に割り当てた場合は除く)
create or replace function public.notify_on_task_assign()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignee uuid;
begin
  if new.type <> 'task' then
    return new;
  end if;
  assignee := nullif(new.payload ->> 'assignee', '')::uuid;
  if assignee is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and (old.payload ->> 'assignee') is not distinct from (new.payload ->> 'assignee') then
    return new;
  end if;
  if assignee <> new.owner_id then
    insert into public.notifications (user_id, type, payload)
    values (
      assignee,
      'task_assigned',
      jsonb_build_object(
        'item_id', new.id,
        'space_id', new.origin_space_id,
        'actor_id', new.owner_id
      )
    );
  end if;
  return new;
end;
$$;

create trigger on_task_assigned
  after insert or update on public.items
  for each row execute function public.notify_on_task_assign();

-- 精算が登録された: スペースの(記録者以外の)全員へ
create or replace function public.notify_on_settlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, payload)
  select
    m.user_id,
    'settlement',
    jsonb_build_object(
      'settlement_id', new.id,
      'space_id', new.space_id,
      'actor_id', new.created_by
    )
  from public.space_members m
  where m.space_id = new.space_id
    and m.user_id <> new.created_by;
  return new;
end;
$$;

create trigger on_settlement_added
  after insert on public.settlements
  for each row execute function public.notify_on_settlement();
