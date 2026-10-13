-- Dweep Tulika slug history / permanent redirects
-- Preserves old published article URLs when an editor changes a public path.

create table if not exists public.article_redirects (
  old_path text primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  new_path text not null,
  status_code integer not null default 301 check (status_code = 301),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (old_path <> new_path)
);

create index if not exists article_redirects_article_idx
  on public.article_redirects(article_id);

create index if not exists article_redirects_new_path_idx
  on public.article_redirects(new_path);

alter table public.article_redirects enable row level security;

grant select on public.article_redirects to anon, authenticated;
grant insert, update, delete on public.article_redirects to authenticated;

drop policy if exists "public can read article redirects"
  on public.article_redirects;
create policy "public can read article redirects"
  on public.article_redirects for select
  to anon, authenticated
  using (true);

drop policy if exists "editors can manage article redirects"
  on public.article_redirects;
create policy "editors can manage article redirects"
  on public.article_redirects for all
  to authenticated
