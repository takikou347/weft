-- items / item_shares: 記録の実体と選択的共有(§6.1 / §6.2)
-- 共有は item_shares への行追加のみ。データ本体は移動・複製しない(不変条件2)

create type public.item_type as enum ('event', 'diary', 'expense', 'task', 'document', 'photo');

create table public.items (
  id uuid primary key default gen_random_uuid(),
  type public.item_type not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  origin_space_id uuid not null references public.spaces (id) on delete cascade,
  occurred_on date not null,
  title text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.items is 'アイテム(予定・日記・収支・タスク・ドキュメント・写真)。type別の固有属性は payload に格納';

create index items_owner_occurred_idx on public.items (owner_id, occurred_on desc, created_at desc);

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

create table public.item_shares (
  item_id uuid not null references public.items (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  shared_by uuid not null references auth.users (id) on delete cascade,
  shared_at timestamptz not null default now(),
  primary key (item_id, space_id)
);

comment on table public.item_shares is '共有=このテーブルへの行追加のみ。この行があるスペースのメンバーだけがアイテムを閲覧できる';

create index item_shares_space_id_idx on public.item_shares (space_id);
