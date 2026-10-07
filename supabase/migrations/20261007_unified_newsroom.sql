-- Dweep Tulika P1 unified newsroom migration
-- Safe additive migration for the existing Supabase project.

alter table public.articles add column if not exists source text not null default 'newsroom';
alter table public.articles add column if not exists legacy_id text;
alter table public.articles add column if not exists legacy_url text;
alter table public.articles add column if not exists public_path text;

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
grant select on public.article_categories to anon, authenticated;
grant select, insert, update, delete on public.article_categories to authenticated;

drop policy if exists "public can read categories" on public.categories;
create policy "public can read categories" on public.categories
for select to anon, authenticated using (true);

drop policy if exists "editors can manage categories" on public.categories;
create policy "editors can manage categories" on public.categories
for all to authenticated
using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

drop policy if exists "public can read article categories" on public.article_categories;
create policy "public can read article categories" on public.article_categories
for select to anon, authenticated using (true);

drop policy if exists "editors can manage article categories" on public.article_categories;
create policy "editors can manage article categories" on public.article_categories
for all to authenticated
using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

insert into public.categories (slug,name) values
('andaman-nicobar','Andaman News'),
('national','National'),
('politics','Politics'),
('editorial','Editorial'),
('culture','Culture'),
('business','Business'),
('sports','Sports')
on conflict (slug) do nothing;

update public.articles
set public_path = '/' || to_char(published_at at time zone 'UTC','YYYY') || '/' ||
                  to_char(published_at at time zone 'UTC','MM') || '/' || slug || '.html'
where public_path is null and published_at is not null;

insert into public.article_categories (article_id, category_id, is_primary)
select a.id, c.id, true
from public.articles a
join public.categories c on c.name = a.category
where not exists (
  select 1 from public.article_categories ac where ac.article_id = a.id
);
