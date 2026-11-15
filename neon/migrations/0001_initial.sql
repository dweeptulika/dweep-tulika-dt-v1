-- Dweep Tulika Neon PostgreSQL baseline.
-- Additive, provider-neutral schema. Supabase Auth remains the identity provider.
-- Do not add credentials, auth sessions, or password hashes to these tables.

create table if not exists public.editorial_profiles (
  id uuid primary key,
  display_name text not null,
  role text not null default 'editor' check (role in ('editor', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key,
  title text not null,
  slug text not null unique,
  category text not null,
  source text not null default 'newsroom',
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
  status text not null default 'draft' check (status in ('draft', 'published', 'scheduled')),
  scheduled_for timestamptz,
  published_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists articles_public_path_idx
  on public.articles(public_path) where public_path is not null;
create index if not exists articles_status_published_idx
  on public.articles(status, published_at desc);
create index if not exists articles_category_idx
  on public.articles(category);

create table if not exists public.media (
  id uuid primary key,
  file_path text not null unique,
  public_url text not null,
  alt_text text not null default '',
  caption text not null default '',
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.advertisements (
  id uuid primary key,
  name text not null,
  advertiser text not null default '',
  image_url text not null,
  target_url text,
  placement text not null default 'homepage'
    check (placement in ('homepage', 'article', 'sidebar')),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists advertisements_active_idx
  on public.advertisements(active, starts_at, ends_at);
create index if not exists advertisements_placement_idx
  on public.advertisements(placement);

create table if not exists public.team_members (
  id uuid primary key,
  name text not null,
  designation text not null,
  department text not null default 'Editorial',
  biography text not null default '',
  tagline text,
  image_url text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_members_public_order_idx
  on public.team_members(is_active, sort_order, created_at);
