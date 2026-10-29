-- Multi-category support with legacy-safe backfill.
-- Safe to run against an existing project: does not delete or rewrite existing category assignments.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

insert into public.categories (slug, name) values
  ('andaman-nicobar', 'Andaman News'),
  ('national', 'National'),
  ('politics', 'Politics'),
  ('editorial', 'Editorial'),
  ('culture', 'Culture'),
  ('business', 'Business'),
  ('sports', 'Sports')
on conflict (slug) do update set name = excluded.name;

create table if not exists public.article_categories (
  article_id uuid not null references public.articles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (article_id, category_id)
);

create index if not exists article_categories_category_idx
  on public.article_categories(category_id, article_id);

alter table public.articles
  add column if not exists article_type text not null default 'news';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.articles'::regclass
      and conname = 'articles_article_type_check'
  ) then
    alter table public.articles
      add constraint articles_article_type_check
      check (article_type in ('news','feature','editorial','opinion','interview','explainer','review','press-release','photo-story','video','live-blog'));
  end if;
end $$;

-- Backfill only articles that currently have no category relationships.
-- The existing articles.category value remains untouched for compatibility.
insert into public.article_categories (article_id, category_id, is_primary)
select a.id, c.id, true
from public.articles a
join public.categories c
  on lower(trim(c.name)) = lower(trim(a.category))
where not exists (
  select 1 from public.article_categories existing
  where existing.article_id = a.id
)
on conflict (article_id, category_id) do nothing;

-- If an article already has relationships but none is primary, mark its first
-- existing relationship primary without replacing or deleting assignments.
with unprimary as (
  select ac.article_id, ac.category_id,
         row_number() over (partition by ac.article_id order by ac.created_at, ac.category_id) as rn
  from public.article_categories ac
  where not exists (
    select 1 from public.article_categories p
    where p.article_id = ac.article_id and p.is_primary
  )
)
update public.article_categories ac
set is_primary = true
from unprimary u
where ac.article_id = u.article_id
  and ac.category_id = u.category_id
  and u.rn = 1;

alter table public.categories enable row level security;
alter table public.article_categories enable row level security;

grant select on public.categories to anon, authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select on public.article_categories to anon, authenticated;
grant select, insert, update, delete on public.article_categories to authenticated;

drop policy if exists "public can read categories" on public.categories;
create policy "public can read categories"
  on public.categories for select to anon, authenticated
  using (true);

drop policy if exists "editors can manage categories" on public.categories;
create policy "editors can manage categories"
  on public.categories for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));

drop policy if exists "public can read categories for published articles" on public.article_categories;
create policy "public can read categories for published articles"
  on public.article_categories for select to anon, authenticated
  using (exists (
    select 1 from public.articles a
    where a.id = article_categories.article_id
      and a.status in ('published','scheduled')
      and a.published_at is not null
      and a.published_at <= now()
  ));

drop policy if exists "editors can manage article categories" on public.article_categories;
create policy "editors can manage article categories"
  on public.article_categories for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid()));
