-- Editorial series are separate from categories and article types.
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.article_series (
  article_id uuid not null references public.articles(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, series_id)
);

create index if not exists article_series_series_idx
  on public.article_series(series_id, article_id);

alter table public.series enable row level security;
alter table public.article_series enable row level security;

grant select on public.series to anon, authenticated;
grant select, insert, update, delete on public.series to authenticated;
grant select on public.article_series to anon, authenticated;
grant select, insert, update, delete on public.article_series to authenticated;

create policy "public can read series" on public.series
  for select to anon, authenticated using (true);
create policy "editors can manage series" on public.series
  for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

create policy "public can read series for published articles" on public.article_series
  for select to anon, authenticated
  using (exists (
    select 1 from public.articles a
    where a.id = article_series.article_id
      and a.status in ('published','scheduled')
      and a.published_at is not null
      and a.published_at <= now()
  ));
create policy "editors can manage article series" on public.article_series
  for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));
