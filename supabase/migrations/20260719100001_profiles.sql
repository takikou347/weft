-- profiles: Supabase Auth のユーザーと1対1のプロフィール(§6.1 / F-01-4)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'ユーザープロフィール(auth.users と1対1)';

-- updated_at 自動更新(以後のテーブルでも共用)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
