-- サインアップ時の初期化(F-01-3)
-- auth.users への INSERT と同一トランザクションで、プロフィールと個人スペースを自動作成する

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

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
