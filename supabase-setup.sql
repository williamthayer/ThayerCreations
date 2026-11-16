create table if not exists public.project_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  cover_image_url text not null,
  body_html text not null default '',
  gallery_images jsonb not null default '[]'::jsonb,
  downloads jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.projects drop column if exists category;

alter table public.projects enable row level security;
alter table public.project_admins enable row level security;

create or replace function public.is_project_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_project_admin() from public;
grant execute on function public.is_project_admin() to anon, authenticated;
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

drop policy if exists "Anyone can view published projects" on public.projects;
create policy "Anyone can view published projects"
  on public.projects for select
  to anon, authenticated
  using (published or (select public.is_project_admin()));

drop policy if exists "Project admins can add projects" on public.projects;
create policy "Project admins can add projects"
  on public.projects for insert
  to authenticated
  with check (
    (select public.is_project_admin())
    and created_by = (select auth.uid())
  );

drop policy if exists "Project admins can update projects" on public.projects;
create policy "Project admins can update projects"
  on public.projects for update
  to authenticated
  using ((select public.is_project_admin()))
  with check ((select public.is_project_admin()));

drop policy if exists "Project admins can delete projects" on public.projects;
create policy "Project admins can delete projects"
  on public.projects for delete
  to authenticated
  using ((select public.is_project_admin()));
