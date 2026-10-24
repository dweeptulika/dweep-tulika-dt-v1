-- Restrict newsroom-wide article access to explicitly authorised editorial roles.
-- Public published-article reads remain governed by the separate public policy.
-- This migration is intentionally reviewed in GitHub first; do not apply to production
-- until the policy test has passed in a safe environment.

drop policy if exists "editors can delete articles" on public.articles;
create policy "editors can delete articles"
on public.articles
for delete
to authenticated
using (
  exists (
    select 1
    from public.editorial_profiles p
    where p.id = auth.uid()
      and p.role in ('editor', 'admin')
  )
);

drop policy if exists "editors can insert articles" on public.articles;
create policy "editors can insert articles"
on public.articles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.editorial_profiles p
    where p.id = auth.uid()
      and p.role in ('editor', 'admin')
  )
);

drop policy if exists "editors can read all articles" on public.articles;
create policy "editors can read all articles"
on public.articles
for select
to authenticated
using (
  exists (
    select 1
    from public.editorial_profiles p
    where p.id = auth.uid()
      and p.role in ('editor', 'admin')
  )
);

drop policy if exists "editors can update articles" on public.articles;
create policy "editors can update articles"
on public.articles
for update
to authenticated
using (
  exists (
    select 1
    from public.editorial_profiles p
    where p.id = auth.uid()
      and p.role in ('editor', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.editorial_profiles p
    where p.id = auth.uid()
      and p.role in ('editor', 'admin')
  )
);
