-- 個人スペースの既定名を「わたしの帳面」→「個人」に変更(UI文言の一般化に追随)。
-- RLSポリシーの変更はなし(データとトリガー関数内の既定値のみ)。

-- 既存データの更新
update public.spaces set name = '個人' where type = 'personal' and name = 'わたしの帳面';

-- サインアップトリガーの既定名を差し替え(それ以外は 20260719100007 と同一)
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
  values ('personal', '個人', new.id)
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
