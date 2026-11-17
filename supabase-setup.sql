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

create table if not exists public.site_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique,
  link_type text not null,
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.projects drop column if exists category;

alter table public.projects enable row level security;
alter table public.site_links enable row level security;
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
grant select on public.site_links to anon, authenticated;
grant insert, update, delete on public.site_links to authenticated;

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

drop policy if exists "Anyone can view site links" on public.site_links;
create policy "Anyone can view site links"
  on public.site_links for select
  to anon, authenticated
  using (true);

drop policy if exists "Project admins can add site links" on public.site_links;
create policy "Project admins can add site links"
  on public.site_links for insert
  to authenticated
  with check (
    (select public.is_project_admin())
    and created_by = (select auth.uid())
  );

drop policy if exists "Project admins can update site links" on public.site_links;
create policy "Project admins can update site links"
  on public.site_links for update
  to authenticated
  using ((select public.is_project_admin()))
  with check ((select public.is_project_admin()));

drop policy if exists "Project admins can delete site links" on public.site_links;
create policy "Project admins can delete site links"
  on public.site_links for delete
  to authenticated
  using ((select public.is_project_admin()));

insert into public.site_links (title, url, link_type, description)
values
  ('Adafruit Learning System', 'https://learn.adafruit.com/', 'Electronics', 'Friendly guides for electronics, microcontrollers, sensors, and creative builds.'),
  ('Arduino Documentation', 'https://docs.arduino.cc/', 'Electronics', 'Official board, language, and library references for Arduino projects.'),
  ('SparkFun Tutorials', 'https://learn.sparkfun.com/', 'Electronics', 'Practical tutorials covering components, circuits, and embedded projects.'),
  ('Raspberry Pi Documentation', 'https://www.raspberrypi.com/documentation/', 'Electronics', 'Official setup and software guides for Raspberry Pi computers and microcontrollers.'),
  ('KiCad Documentation', 'https://docs.kicad.org/', 'CAD & Fabrication', 'Reference manuals and tutorials for designing printed circuit boards.'),
  ('FreeCAD Documentation', 'https://wiki.freecad.org/', 'CAD & Fabrication', 'Open-source parametric 3D modeling guides and workbench references.'),
  ('Onshape Learning Center', 'https://www.onshape.com/en/learning-center', 'CAD & Fabrication', 'Lessons and resources for cloud-based CAD and product design.'),
  ('Prusa Knowledge Base', 'https://help.prusa3d.com/', '3D Printing', 'Printer setup, troubleshooting, materials, and slicer guides.'),
  ('Printables', 'https://www.printables.com/', '3D Printing', 'A community library of printable models and practical project files.'),
  ('PlatformIO Documentation', 'https://docs.platformio.org/', 'Software & Tools', 'Documentation for building, testing, and debugging embedded firmware.'),
  ('GitHub Explore', 'https://github.com/explore', 'Software & Tools', 'Discover open-source projects, tools, and ideas from the developer community.'),
  ('Hackaday', 'https://hackaday.com/', 'Learning & Inspiration', 'Fresh hardware projects, engineering stories, and inventive experiments.'),
  ('Instructables', 'https://www.instructables.com/', 'Learning & Inspiration', 'Step-by-step community projects across making, repair, and DIY.')
on conflict (url) do nothing;
