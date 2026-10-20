-- Soft-delete newsroom articles without losing article data or redirect history.
-- Public and admin queries must filter deleted_at IS NULL after this migration is applied.
begin;
alter table public.articles add column if not exists deleted_at timestamptz;
create index if not exists articles_deleted_at_idx on public.articles(deleted_at) where deleted_at is not null;
commit;
