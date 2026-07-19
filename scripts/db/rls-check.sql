-- RLS分離チェック(DBレベル)
-- 「ユーザーAの非共有アイテムがユーザーBに一切見えないこと」を検証する。
-- supabase-shim.sql + 全マイグレーション適用後に実行する。
-- 失敗時は exception で異常終了する(exit code 非0)。

\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- 準備: ユーザーA・Bを作成(サインアップトリガで profiles / 個人スペースが自動作成される)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'alice@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'bob@example.com');

-- トリガの結果検証(F-01-3)
do $$
declare
  space_count int;
begin
  select count(*) into space_count
  from public.spaces
  where type = 'personal'
    and created_by in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
  if space_count <> 2 then
    raise exception 'サインアップトリガ: 個人スペースが自動作成されていない(% 件)', space_count;
  end if;
  if (select count(*) from public.profiles) <> 2 then
    raise exception 'サインアップトリガ: profiles が自動作成されていない';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- A としてアイテムを作成
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

insert into public.items (id, type, owner_id, origin_space_id, occurred_on, title, body)
select
  '10000000-0000-4000-8000-000000000001',
  'diary',
  '00000000-0000-4000-8000-00000000000a',
  s.id,
  '2026-07-19',
  'Aの日記',
  'これはAだけの記録'
from public.spaces s
where s.created_by = '00000000-0000-4000-8000-00000000000a' and s.type = 'personal';

do $$
begin
  if (select count(*) from public.items) <> 1 then
    raise exception 'A は自分のアイテムが見えるはず';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- B からは A の非共有アイテムが一切見えないこと(不変条件1・5)
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';

do $$
begin
  -- 一覧
  if (select count(*) from public.items) <> 0 then
    raise exception 'RLS違反: B に A の非共有アイテムが見えている';
  end if;
  -- ID直指定
  if exists (select 1 from public.items where id = '10000000-0000-4000-8000-000000000001') then
    raise exception 'RLS違反: B が ID 直指定で A のアイテムを読めている';
  end if;
  -- スペース・メンバー・プロフィールの分離
  if (select count(*) from public.spaces) <> 1 then
    raise exception 'RLS違反: B に自分以外のスペースが見えている';
  end if;
  if exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-00000000000a') then
    raise exception 'RLS違反: B に無関係な A のプロフィールが見えている';
  end if;
end;
$$;

-- B は A のアイテムを更新・削除もできないこと
update public.items set title = '改ざん' where id = '10000000-0000-4000-8000-000000000001';
do $$
begin
  if exists (select 1 from public.items where title = '改ざん') then
    raise exception 'RLS違反: B が A のアイテムを更新できている';
  end if;
end;
$$;

-- B は A のアイテムを勝手に自分のスペースへ共有できないこと(owns_item チェック)
do $$
declare
  b_space uuid;
  ok boolean := false;
begin
  select id into b_space from public.spaces limit 1;
  begin
    insert into public.item_shares (item_id, space_id, shared_by)
    values ('10000000-0000-4000-8000-000000000001', b_space, '00000000-0000-4000-8000-00000000000b');
  exception when insufficient_privilege or others then
    ok := true;
  end;
  if not ok then
    raise exception 'RLS違反: B が他人のアイテムを共有できている';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 共有すると見える・解除すると見えなくなること(不変条件2の骨格。UIはP3)
-- ---------------------------------------------------------------------------

reset role;

-- A と B が同居するグループスペースを作る(P1にUIは無いのでDB直挿入で骨格のみ検証)
insert into public.spaces (id, type, name, created_by)
values ('20000000-0000-4000-8000-000000000001', 'group', '検証グループ', '00000000-0000-4000-8000-00000000000a');
insert into public.space_members (space_id, user_id, role) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'owner'),
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000b', 'member');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

-- A が自分のアイテムをグループへ共有(item_shares への行追加のみ)
insert into public.item_shares (item_id, space_id, shared_by)
values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a');

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';

do $$
begin
  if not exists (select 1 from public.items where id = '10000000-0000-4000-8000-000000000001') then
    raise exception '共有失敗: 共有先スペースのメンバー B にアイテムが見えない';
  end if;
end;
$$;

-- A が共有を解除すると B からは見えなくなる(元データは残る)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
delete from public.item_shares where item_id = '10000000-0000-4000-8000-000000000001';

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';
do $$
begin
  if exists (select 1 from public.items where id = '10000000-0000-4000-8000-000000000001') then
    raise exception '共有解除失敗: 解除後も B にアイテムが見えている';
  end if;
end;
$$;

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
do $$
begin
  if not exists (select 1 from public.items where id = '10000000-0000-4000-8000-000000000001') then
    raise exception '共有解除後に作成者 A の元データが消えている';
  end if;
end;
$$;

-- 匿名(anon)はテーブル権限ごと拒否されること(GRANTを一切与えていない)
reset role;
set local role anon;
set local request.jwt.claims to '';
do $$
declare
  denied int := 0;
begin
  begin
    perform count(*) from public.items;
  exception when insufficient_privilege then
    denied := denied + 1;
  end;
  begin
    perform count(*) from public.spaces;
  exception when insufficient_privilege then
    denied := denied + 1;
  end;
  begin
    perform count(*) from public.profiles;
  exception when insufficient_privilege then
    denied := denied + 1;
  end;
  if denied <> 3 then
    raise exception 'RLS違反: 匿名ロールがテーブルへアクセスできている(拒否 % / 3)', denied;
  end if;
end;
$$;

rollback;

\echo 'RLS分離チェック: すべて通過'
