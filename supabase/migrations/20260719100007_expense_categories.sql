-- expense_categories: 収支カテゴリのカスタマイズ(F-05-2)
-- 本人だけが読み書きできる個人設定

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

comment on table public.expense_categories is '収支カテゴリ(ユーザーごとにカスタマイズ可能)';

grant select, insert, update, delete on public.expense_categories to authenticated;

alter table public.expense_categories enable row level security;

create policy expense_categories_all on public.expense_categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- サインアップ時に既定カテゴリも用意する(handle_new_user を差し替え)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_space_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );

  insert into public.spaces (type, name, created_by)
  values ('personal', 'わたしの帳面', new.id)
  returning id into new_space_id;

  insert into public.space_members (space_id, user_id, role)
  values (new_space_id, new.id, 'owner');

  insert into public.expense_categories (user_id, name, position)
  values
    (new.id, '食費', 1),
    (new.id, '日用品', 2),
    (new.id, '交通', 3),
    (new.id, '交際', 4),
    (new.id, '住まい', 5),
    (new.id, '娯楽', 6),
    (new.id, 'その他', 7),
    (new.id, '収入', 8);

  return new;
end;
$$;
