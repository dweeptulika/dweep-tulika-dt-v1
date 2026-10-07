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
  source text not null default 'newsroom' check (source in ('newsroom','blogger')),
  legacy_id text,
  legacy_url text,
  public_path text,
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

create unique index if not exists articles_public_path_idx
  on public.articles(public_path)
  where public_path is not null;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.article_categories (
  article_id uuid references public.articles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (article_id, category_id)
);

alter table public.categories enable row level security;
alter table public.article_categories enable row level security;
grant select on public.categories to anon, authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.article_categories to authenticated;
drop policy if exists "public can read categories" on public.categories;
create policy "public can read categories" on public.categories for select to anon, authenticated using (true);
drop policy if exists "editors can manage categories" on public.categories;
create policy "editors can manage categories" on public.categories for all to authenticated using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid())) with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));
drop policy if exists "public can read article categories" on public.article_categories;
create policy "public can read article categories" on public.article_categories for select to anon, authenticated using (true);
drop policy if exists "editors can manage article categories" on public.article_categories;
create policy "editors can manage article categories" on public.article_categories for all to authenticated using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid())) with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

insert into public.categories (slug,name) values
('andaman-nicobar','Andaman News'),('national','National'),('politics','Politics'),('editorial','Editorial'),('culture','Culture'),('business','Business'),('sports','Sports')
on conflict (slug) do nothing;

-- Backward-compatible adoption metadata for existing newsroom rows.
update public.articles set source = 'newsroom' where source is null;
update public.articles set public_path = '/' || to_char(published_at at time zone 'UTC','YYYY') || '/' || to_char(published_at at time zone 'UTC','MM') || '/' || slug || '.html'
where public_path is null and published_at is not null;

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


-- Advertisement control panel
create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  advertiser text not null default '',
  image_url text not null,
  target_url text,
  placement text not null default 'homepage' check (placement in ('homepage','article','sidebar')),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists advertisements_active_idx on public.advertisements(active, starts_at, ends_at);
create index if not exists advertisements_placement_idx on public.advertisements(placement);

alter table public.advertisements enable row level security;
grant select on public.advertisements to anon;
grant select, insert, update, delete on public.advertisements to authenticated;

drop policy if exists "public can read active advertisements" on public.advertisements;
create policy "public can read active advertisements"
  on public.advertisements for select to anon, authenticated
  using (
    active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "editors can manage advertisements" on public.advertisements;
create policy "editors can manage advertisements"
  on public.advertisements for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

drop trigger if exists advertisements_touch_updated_at on public.advertisements;
create trigger advertisements_touch_updated_at
before update on public.advertisements
for each row execute function public.touch_updated_at();
