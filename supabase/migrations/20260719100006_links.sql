-- links: アイテム同士の双方向リンク(F-09、§6.1)
-- 無向リンク。重複を防ぐため item_id_a < item_id_b に正規化して格納する

create table public.links (
  item_id_a uuid not null references public.items (id) on delete cascade,
  item_id_b uuid not null references public.items (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id_a, item_id_b),
  constraint links_ordered check (item_id_a < item_id_b)
);

comment on table public.links is '双方向リンク(無向)。a < b に正規化';

create index links_item_b_idx on public.links (item_id_b);

-- 現在のユーザーがアイテムを閲覧できるか(作成者 or 共有先メンバー)
create or replace function public.can_view_item(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.owns_item(target_item_id)
    or public.has_shared_access(target_item_id);
$$;

revoke execute on function public.can_view_item(uuid) from public, anon;
grant execute on function public.can_view_item(uuid) to authenticated;

grant select, insert, delete on public.links to authenticated;

alter table public.links enable row level security;

-- F-09-5: 両端とも閲覧できる場合のみリンクが見える(見えないリンク先は存在自体を隠す)
create policy links_select on public.links
  for select to authenticated
  using (
    public.can_view_item(item_id_a)
    and public.can_view_item(item_id_b)
  );

create policy links_insert on public.links
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.can_view_item(item_id_a)
    and public.can_view_item(item_id_b)
  );

create policy links_delete on public.links
  for delete to authenticated
  using (created_by = (select auth.uid()));
