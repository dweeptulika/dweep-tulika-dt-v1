-- Dweep Tulika newsroom schema
-- Run this in the Supabase SQL Editor after creating the project.
-- Authentication is handled by Supabase Auth; only authenticated editorial users
-- can create/update newsroom records.

create extension if not exists pgcrypto;

create table if not exists public.editorial_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'editor',
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null,
  author text not null default 'Dweep Tulika',
  excerpt text not null default '',
  body_html text not null default '',
  featured_image text,
  seo_title text,
  meta_description text,
  social_image text,
  status text not null default 'draft' check (status in ('draft','published','scheduled')),
  scheduled_for timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_published_idx
  on public.articles(status, published_at desc);

create index if not exists articles_category_idx
  on public.articles(category);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  file_path text not null unique,
  public_url text not null,
  alt_text text not null default '',
  caption text not null default '',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.editorial_profiles enable row level security;
alter table public.articles enable row level security;
alter table public.media enable row level security;

-- Explicit Data API grants.
-- The current Supabase project setup can keep automatic table exposure OFF;
-- these grants provide only the privileges required by the newsroom.

grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;
grant select on public.editorial_profiles to authenticated;
grant select, insert, update, delete on public.media to authenticated;

-- Public readers may only see published stories.
drop policy if exists "public can read published articles" on public.articles;
create policy "public can read published articles"
  on public.articles for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

-- Authenticated editorial users may manage newsroom records.
drop policy if exists "editors can read all articles" on public.articles;
create policy "editors can read all articles"
  on public.articles for select to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

drop policy if exists "editors can insert articles" on public.articles;
create policy "editors can insert articles"
  on public.articles for insert to authenticated
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

drop policy if exists "editors can update articles" on public.articles;
create policy "editors can update articles"
  on public.articles for update to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

drop policy if exists "editors can delete articles" on public.articles;
create policy "editors can delete articles"
  on public.articles for delete to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

drop policy if exists "editors can manage media" on public.media;
create policy "editors can manage media"
  on public.media for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

drop policy if exists "editors can read profiles" on public.editorial_profiles;
create policy "editors can read profiles"
  on public.editorial_profiles for select to authenticated
  using (id = auth.uid());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_touch_updated_at on public.articles;
create trigger articles_touch_updated_at
before update on public.articles
for each row execute function public.touch_updated_at();


-- Storage: only authenticated editorial users may upload, replace, or delete
-- objects in the public news-media bucket. Public reads are provided by the
-- bucket's public setting.
drop policy if exists "editors can upload news media"
on storage.objects;

create policy "editors can upload news media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'news-media'
  and exists (
    select 1
    from public.editorial_profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "editors can update news media"
on storage.objects;

create policy "editors can update news media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'news-media'
  and exists (
    select 1
    from public.editorial_profiles p
    where p.id = auth.uid()
  )
)
with check (
  bucket_id = 'news-media'
  and exists (
    select 1
    from public.editorial_profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "editors can delete news media"
on storage.objects;

create policy "editors can delete news media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'news-media'
  and exists (
    select 1
    from public.editorial_profiles p
    where p.id = auth.uid()
  )
);
