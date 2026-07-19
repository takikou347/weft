-- P4: 写真ストレージ(F-07-2 アルバム / F-04-1 写真添付)と立替精算(F-07-6)

-- ---------------------------------------------------------------------------
-- 写真バケット(非公開)。パスは {user_id}/{uuid}.jpg
-- 閲覧は「自分のファイル」または「そのファイルを指す photo アイテムが
-- 共有されている場合」のみ(items のRLSと同じ一本のルールに従属させる)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.items i
        where i.type = 'photo'
          and i.payload ->> 'path' = storage.objects.name
          and public.has_shared_access(i.id)
      )
    )
  );

create policy photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 立替精算(F-07-6): 記録と計算のみ。送金機能は持たない(§9)
-- participants は user_id の配列(割り勘の対象者)
-- ---------------------------------------------------------------------------

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  event_item_id uuid references public.items (id) on delete set null,
  title text not null check (char_length(title) between 1 and 100),
  payer_id uuid not null references auth.users (id) on delete cascade,
  amount bigint not null check (amount > 0),
  participants jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'settled')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.settlements is '立替の記録(誰が払ったか・割り勘対象)。送金はしない';

create index settlements_space_idx on public.settlements (space_id, created_at desc);

create trigger settlements_set_updated_at
  before update on public.settlements
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.settlements to authenticated;

alter table public.settlements enable row level security;

create policy settlements_select on public.settlements
  for select to authenticated
  using (public.is_space_member(space_id));

create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_space_member(space_id)
  );

-- 精算済みへの変更・取り消しは記録した本人か払った本人
create policy settlements_update on public.settlements
  for update to authenticated
  using (
    (select auth.uid()) in (created_by, payer_id)
    and public.is_space_member(space_id)
  )
  with check (public.is_space_member(space_id));

create policy settlements_delete on public.settlements
  for delete to authenticated
  using ((select auth.uid()) in (created_by, payer_id));
