-- RLS ポリシー(§6.3 / 不変条件1・2・5)
--
-- 閲覧ルールは一本:
--   「自分が作成者である」または「item_shares 経由で共有されたスペースのメンバーである」
--
-- ポリシー同士が相互にテーブルを参照すると RLS の再帰評価が起きるため、
-- メンバーシップ・所有権の判定は SECURITY DEFINER のヘルパー関数に集約する。
-- (関数は definer 権限で RLS を通らずに判定するだけで、行データは返さない)

-- ---------------------------------------------------------------------------
-- ヘルパー関数
-- ---------------------------------------------------------------------------

-- 現在のユーザーが指定スペースのメンバーか
create or replace function public.is_space_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = target_space_id
      and user_id = (select auth.uid())
  );
$$;

-- 現在のユーザーが指定アイテムの作成者か
create or replace function public.owns_item(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.items
    where id = target_item_id
      and owner_id = (select auth.uid())
  );
$$;

-- 指定アイテムが「現在のユーザーがメンバーであるスペース」に共有されているか
create or replace function public.has_shared_access(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.item_shares s
    join public.space_members m on m.space_id = s.space_id
    where s.item_id = target_item_id
      and m.user_id = (select auth.uid())
  );
$$;

-- 現在のユーザーが指定ユーザーと同じスペースに属しているか(プロフィール閲覧用)
create or replace function public.shares_space_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.space_members a
    join public.space_members b on b.space_id = a.space_id
    where a.user_id = (select auth.uid())
      and b.user_id = target_user_id
  );
$$;

revoke execute on function
  public.is_space_member(uuid),
  public.owns_item(uuid),
  public.has_shared_access(uuid),
  public.shares_space_with(uuid)
from public, anon;

grant execute on function
  public.is_space_member(uuid),
  public.owns_item(uuid),
  public.has_shared_access(uuid),
  public.shares_space_with(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- RLS 有効化(全テーブル。ポリシーが無い操作はすべて拒否される)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.items enable row level security;
alter table public.item_shares enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: 本人+同じスペースのメンバーのみ閲覧可。更新は本人のみ
-- ---------------------------------------------------------------------------

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.shares_space_with(id)
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- insert はサインアップトリガ(SECURITY DEFINER)のみが行うため、ポリシーは作らない

-- ---------------------------------------------------------------------------
-- spaces / space_members: メンバーのみ閲覧可(§6.3)
-- 作成・更新・招待は P3 で導入(P1 では個人スペースをトリガで作るのみ)
-- ---------------------------------------------------------------------------

create policy spaces_select on public.spaces
  for select to authenticated
  using (public.is_space_member(id));

create policy space_members_select on public.space_members
  for select to authenticated
  using (public.is_space_member(space_id));

-- ---------------------------------------------------------------------------
-- items: 閲覧は「作成者」または「共有先スペースのメンバー」(一本のルール)
--        作成・更新・削除は作成者のみ(§6.3。タスク担当者の例外は P5 で導入)
-- ---------------------------------------------------------------------------

create policy items_select on public.items
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or public.has_shared_access(id)
  );

create policy items_insert on public.items
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.is_space_member(origin_space_id)
  );

create policy items_update on public.items
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy items_delete on public.items
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- item_shares: 共有の実体(F-06)
--   閲覧: アイテム作成者(自分の共有状態の可視化 F-06-4)/共有先スペースのメンバー
--   追加: アイテム作成者 かつ 共有先スペースのメンバー(§6.3)
--   削除(共有解除): アイテム作成者のみ(F-06-3)
-- ---------------------------------------------------------------------------

create policy item_shares_select on public.item_shares
  for select to authenticated
  using (
    public.owns_item(item_id)
    or public.is_space_member(space_id)
  );

create policy item_shares_insert on public.item_shares
  for insert to authenticated
  with check (
    shared_by = (select auth.uid())
    and public.owns_item(item_id)
    and public.is_space_member(space_id)
  );

create policy item_shares_delete on public.item_shares
  for delete to authenticated
  using (public.owns_item(item_id));
