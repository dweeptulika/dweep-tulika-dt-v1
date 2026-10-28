-- Additive schema required by the unified newsroom and legacy Blogger adoption flow.
-- Does not rewrite existing article rows or alter existing public-read policies.
alter table public.articles add column if not exists source text not null default 'newsroom';
alter table public.articles add column if not exists legacy_id text;
alter table public.articles add column if not exists legacy_url text;
alter table public.articles add column if not exists public_path text;

create unique index if not exists articles_public_path_idx
  on public.articles(public_path)
  where public_path is not null;
