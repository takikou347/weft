-- spaces / space_members: 共有先となるスペースとメンバーシップ(§4.1 / §6.1 / F-02)

create type public.space_type as enum ('personal', 'group', 'organization', 'project');
create type public.space_role as enum ('owner', 'admin', 'member');

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  type public.space_type not null,
  name text not null,
  parent_space_id uuid references public.spaces (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 親を持てるのは project のみ(§4.1)
  constraint spaces_parent_only_for_project check (
    (type = 'project' and parent_space_id is not null)
    or (type <> 'project' and parent_space_id is null)
  )
);

comment on table public.spaces is 'スペース(personal / group / organization / project)';

create trigger spaces_set_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();

create table public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.space_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

comment on table public.space_members is 'スペースのメンバーシップ(role: owner/admin/member)';

create index space_members_user_id_idx on public.space_members (user_id);
