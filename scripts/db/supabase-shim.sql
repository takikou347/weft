-- ローカル素のPostgreSQLで supabase/migrations を検証するための最小シム。
-- Supabase が提供する auth スキーマ・ロール・既定権限を模倣する。
-- 本番・ローカルSupabaseでは実行しないこと(Supabase側に同等物が存在する)。

create schema if not exists auth;

-- Supabase Auth の auth.users のうち、本アプリが参照する列のみ
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- auth.uid(): request.jwt.claims の sub を返す(Supabase実装と同じ挙動)
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

-- Supabase の API ロール
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- 注意: 既定権限(default privileges)による自動付与はあえて行わない。
-- 実環境ではマイグレーション実行ロールによって既定権限が適用されない場合が
-- あるため、テーブル権限はマイグレーション側で明示的に GRANT する方針
-- (20260719100004_rls.sql)。このシムも同じ条件で検証する。
