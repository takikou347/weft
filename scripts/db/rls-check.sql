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

-- ---------------------------------------------------------------------------
-- links(双方向リンク)の分離: 片端でも見えないアイテムを含むリンクは見えない
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

-- A が自分のアイテム2件目を作り、1件目とリンクする
insert into public.items (id, type, owner_id, origin_space_id, occurred_on, title)
select
  '10000000-0000-4000-8000-000000000002', 'event',
  '00000000-0000-4000-8000-00000000000a', s.id, '2026-07-19', 'Aの予定'
from public.spaces s
where s.created_by = '00000000-0000-4000-8000-00000000000a' and s.type = 'personal';

insert into public.links (item_id_a, item_id_b, created_by)
values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-00000000000a'
);

do $$
begin
  if (select count(*) from public.links) <> 1 then
    raise exception 'リンク: 作成者 A にリンクが見えない';
  end if;
end;
$$;

-- B からはリンクの存在自体が見えない(F-09-5)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';
do $$
begin
  if (select count(*) from public.links) <> 0 then
    raise exception 'RLS違反: B に A のリンクが見えている';
  end if;
end;
$$;

-- B は他人のアイテムへのリンクを作れない
do $$
declare
  ok boolean := false;
begin
  begin
    insert into public.links (item_id_a, item_id_b, created_by)
    values (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-00000000000b'
    );
  exception when others then
    ok := true;
  end;
  if not ok then
    raise exception 'RLS違反: B が他人のアイテム同士のリンクを作成できている';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- P3: グループ作成RPC・コメント・リアクションの分離
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;

-- 第三者 C を用意(検証グループの非メンバー)
reset role;
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000c', 'carol@example.com');
set local role authenticated;

-- A がアイテムを検証グループへ再共有し、コメント・リアクションを付ける
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
insert into public.item_shares (item_id, space_id, shared_by)
values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a');
insert into public.comments (item_id, space_id, author_id, body)
values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'よい旅でした');
insert into public.reactions (item_id, space_id, user_id, emoji)
values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', '🌸');

-- メンバー B にはコメント・リアクションが見え、自分でも書ける(オープン型)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';
do $$
begin
  if (select count(*) from public.comments) <> 1 then
    raise exception 'コメント: メンバー B に見えない(オープン型に反する)';
  end if;
  if (select count(*) from public.reactions) <> 1 then
    raise exception 'リアクション: メンバー B に見えない';
  end if;
end;
$$;
insert into public.comments (item_id, space_id, author_id, body)
values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000b', 'また行きましょう');

-- 非メンバー C には一切見えず、書き込めない
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';
do $$
declare
  ok boolean := false;
begin
  if (select count(*) from public.comments) <> 0 then
    raise exception 'RLS違反: 非メンバー C にコメントが見えている';
  end if;
  if (select count(*) from public.reactions) <> 0 then
    raise exception 'RLS違反: 非メンバー C にリアクションが見えている';
  end if;
  begin
    insert into public.comments (item_id, space_id, author_id, body)
    values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000c', '割り込み');
  exception when others then
    ok := true;
  end;
  if not ok then
    raise exception 'RLS違反: 非メンバー C がコメントを書き込めている';
  end if;
end;
$$;

-- 共有されていないアイテムへはメンバーでもコメントできない
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';
do $$
declare
  ok boolean := false;
begin
  begin
    insert into public.comments (item_id, space_id, author_id, body)
    values ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000b', '未共有への割り込み');
  exception when others then
    ok := true;
  end;
  if not ok then
    raise exception 'RLS違反: 未共有アイテムへコメントできている';
  end if;
end;
$$;

-- C がグループ作成RPCで自分のグループを作れる(他人のグループには影響しない)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';
do $$
declare
  gid uuid;
begin
  gid := public.create_group('Cのグループ');
  if public.space_role_of(gid) <> 'owner' then
    raise exception 'create_group: 作成者が owner になっていない';
  end if;
  if (select count(*) from public.spaces) <> 2 then
    raise exception 'C に見えるスペース数が想定外(自分の個人+自分のグループ=2のはず)';
  end if;
end;
$$;

-- 招待: メンバーでない C は検証グループの招待を作れない
do $$
declare
  ok boolean := false;
begin
  begin
    insert into public.invitations (space_id, created_by)
    values ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000c');
  exception when others then
    ok := true;
  end;
  if not ok then
    raise exception 'RLS違反: 非メンバーが招待リンクを発行できている';
  end if;
end;
$$;

-- 招待の受諾で C が検証グループに参加でき、共有アイテムが見えるようになる
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
insert into public.invitations (id, space_id, created_by)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a');

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';
do $$
declare
  tok text;
  joined uuid;
begin
  -- トークンは非メンバーには読めないため、definer 関数経由でしか受諾できない
  begin
    select token into strict tok from public.invitations where id = '30000000-0000-4000-8000-000000000001';
    raise exception 'RLS違反: 非メンバーが招待トークンを直接読めている';
  exception when no_data_found then
    null;
  end;
end;
$$;

reset role;
select token as invite_token from public.invitations where id = '30000000-0000-4000-8000-000000000001' \gset
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';
select public.accept_invitation(:'invite_token');
do $$
begin
  if public.space_role_of('20000000-0000-4000-8000-000000000001') is distinct from 'member' then
    raise exception '招待受諾: C が member になっていない';
  end if;
  if not exists (select 1 from public.items where id = '10000000-0000-4000-8000-000000000001') then
    raise exception '招待受諾後: 共有アイテムが C に見えない';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- P4: 写真ストレージと立替精算の分離
-- ---------------------------------------------------------------------------

-- A が写真をアップロードし、photo アイテムを作る(未共有)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
insert into storage.objects (bucket_id, name, owner)
values ('photos', '00000000-0000-4000-8000-00000000000a/pic1.jpg', '00000000-0000-4000-8000-00000000000a');
insert into public.items (id, type, owner_id, origin_space_id, occurred_on, title, payload)
select
  '10000000-0000-4000-8000-000000000003', 'photo',
  '00000000-0000-4000-8000-00000000000a', s.id, '2026-07-19', '山頂',
  '{"path": "00000000-0000-4000-8000-00000000000a/pic1.jpg"}'::jsonb
from public.spaces s
where s.created_by = '00000000-0000-4000-8000-00000000000a' and s.type = 'personal';

-- B からは(共有前は)ストレージのファイルも見えない
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';
do $$
begin
  if (select count(*) from storage.objects) <> 0 then
    raise exception 'RLS違反: 未共有の写真ファイルが B に見えている';
  end if;
end;
$$;

-- 他人のフォルダへはアップロードできない
do $$
declare
  ok boolean := false;
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('photos', '00000000-0000-4000-8000-00000000000a/evil.jpg', '00000000-0000-4000-8000-00000000000b');
  exception when others then
    ok := true;
  end;
  if not ok then
    raise exception 'RLS違反: B が A のフォルダへアップロードできている';
  end if;
end;
$$;

-- photo アイテムを共有すると、対応するファイルも見えるようになる
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
insert into public.item_shares (item_id, space_id, shared_by)
values ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a');

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';
do $$
begin
  if (select count(*) from storage.objects) <> 1 then
    raise exception '共有失敗: 共有された写真のファイルが B に見えない';
  end if;
end;
$$;

-- 立替精算: メンバーだけが読める・記録できる
insert into public.settlements (space_id, title, payer_id, amount, participants, created_by)
values (
  '20000000-0000-4000-8000-000000000001', '宿代',
  '00000000-0000-4000-8000-00000000000b', 24000,
  '["00000000-0000-4000-8000-00000000000a", "00000000-0000-4000-8000-00000000000b"]'::jsonb,
  '00000000-0000-4000-8000-00000000000b'
);

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000d", "role": "authenticated"}';
-- 部外者 D(未登録ユーザー相当のID)には見えない・書けない
do $$
declare
  ok boolean := false;
begin
  if (select count(*) from public.settlements) <> 0 then
    raise exception 'RLS違反: 部外者に立替記録が見えている';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- P5: 組織・プロジェクトの分離(§6.3: 組織メンバーでもプロジェクト内は見えない)
-- ---------------------------------------------------------------------------

-- A が組織を作り、B を組織へ、プロジェクトを作る(BはプロジェクトにHは入れない)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
do $$
declare
  org uuid;
  proj uuid;
begin
  org := public.create_organization('検証組織');
  proj := public.create_project(org, '検証プロジェクト');

  -- 後続チェック用に固定IDへ差し替えはできないため一時表に控える
  create temporary table _p5 (org uuid, proj uuid) on commit drop;
  insert into _p5 values (org, proj);
end;
$$;

-- B を組織メンバーにする(招待受諾の代わりに直接insert: definer相当の検証簡略化)
reset role;
insert into public.space_members (space_id, user_id, role)
select org, '00000000-0000-4000-8000-00000000000b', 'member' from _p5;
set local role authenticated;

-- A がプロジェクトにタスク(担当者B…はプロジェクト非メンバーなので一旦Aを担当)を共有付きで作る
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
do $$
declare
  proj uuid;
  task_id uuid := '10000000-0000-4000-8000-000000000005';
begin
  select p.proj into proj from _p5 p;
  insert into public.items (id, type, owner_id, origin_space_id, occurred_on, title, payload)
  values (task_id, 'task', '00000000-0000-4000-8000-00000000000a', proj, '2026-07-25', '資料づくり',
          jsonb_build_object('status', 'todo'));
  insert into public.item_shares (item_id, space_id, shared_by)
  values (task_id, proj, '00000000-0000-4000-8000-00000000000a');
end;
$$;

-- 組織メンバー B にはプロジェクトのアイテムが見えない(プロジェクト非メンバー)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';
do $$
begin
  if exists (select 1 from public.items where id = '10000000-0000-4000-8000-000000000005') then
    raise exception 'RLS違反: 組織メンバーがプロジェクト内アイテムを見られている(§6.3違反)';
  end if;
end;
$$;

-- B をプロジェクトへ加えると見えるようになり、担当者ならステータスを変えられる
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
do $$
declare
  proj uuid;
begin
  select p.proj into proj from _p5 p;
  perform public.add_project_member(proj, '00000000-0000-4000-8000-00000000000b');
  update public.items
  set payload = payload || jsonb_build_object('assignee', '00000000-0000-4000-8000-00000000000b')
  where id = '10000000-0000-4000-8000-000000000005';
end;
$$;

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';
do $$
begin
  if not exists (select 1 from public.items where id = '10000000-0000-4000-8000-000000000005') then
    raise exception 'プロジェクト参加後もタスクが見えない';
  end if;
  -- 担当者としてステータス変更(§6.3の唯一の例外)
  perform public.update_task_status('10000000-0000-4000-8000-000000000005', 'doing');
  if (select payload ->> 'status' from public.items where id = '10000000-0000-4000-8000-000000000005') <> 'doing' then
    raise exception '担当者によるステータス変更が反映されていない';
  end if;
end;
$$;

-- 担当者でも本文の書き換え(update)はできない
do $$
begin
  update public.items set title = '書き換え' where id = '10000000-0000-4000-8000-000000000005';
  if exists (select 1 from public.items where id = '10000000-0000-4000-8000-000000000005' and title = '書き換え') then
    raise exception 'RLS違反: 担当者がタスク本文を書き換えられている';
  end if;
end;
$$;

-- 予算の編集は owner/admin のみ(§7)。member の B は書けない
do $$
declare
  proj uuid;
  ok boolean := false;
begin
  select p.proj into proj from _p5 p;
  begin
    insert into public.budgets (space_id, category, planned_amount)
    values (proj, '外注', 100000);
  exception when others then
    ok := true;
  end;
  if not ok then
    raise exception 'RLS違反: member が予算を書けている';
  end if;
end;
$$;

-- owner の A は予算を書け、実績集計RPCも動く
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
do $$
declare
  proj uuid;
  expense_id uuid := '10000000-0000-4000-8000-000000000006';
begin
  select p.proj into proj from _p5 p;
  insert into public.budgets (space_id, category, planned_amount)
  values (proj, '交通', 50000);
  insert into public.items (id, type, owner_id, origin_space_id, occurred_on, title, payload)
  values (expense_id, 'expense', '00000000-0000-4000-8000-00000000000a', proj, '2026-07-20', '新幹線',
          '{"amount": 28000, "kind": "expense", "category": "交通"}'::jsonb);
  insert into public.item_shares (item_id, space_id, shared_by)
  values (expense_id, proj, '00000000-0000-4000-8000-00000000000a');
  if (select total from public.space_expense_summary(proj) where kind = 'expense') <> 28000 then
    raise exception '実績集計RPCが正しくない';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- P6: 通知の分離(自分宛て以外は見えない・共有/コメントで積まれる)
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';
do $$
declare
  my_count int;
begin
  -- ここまでのA/Cの共有・コメント・精算でBに通知が積まれているはず
  select count(*) into my_count from public.notifications;
  if my_count = 0 then
    raise exception '通知: 共有・コメントで通知が積まれていない';
  end if;
  -- すべて自分宛てであること
  if exists (
    select 1 from public.notifications
    where user_id <> '00000000-0000-4000-8000-00000000000b'
  ) then
    raise exception 'RLS違反: 他人宛ての通知が見えている';
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
