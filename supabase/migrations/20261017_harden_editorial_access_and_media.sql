-- Harden editorial write permissions and enforce the newsroom image upload limits.
-- Apply only after the unified-newsroom and article-redirect migrations.
begin;

-- Keep browser-side checks aligned with server-enforced storage limits.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news-media',
  'news-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Only users explicitly assigned an editor/admin role may manage newsroom content.
drop policy if exists "editors can manage categories" on public.categories;
create policy "editors can manage categories"
  on public.categories for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

drop policy if exists "editors can manage article categories" on public.article_categories;
create policy "editors can manage article categories"
  on public.article_categories for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

drop policy if exists "editors can read all articles" on public.articles;
create policy "editors can read all articles"
  on public.articles for select to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

drop policy if exists "editors can insert articles" on public.articles;
create policy "editors can insert articles"
  on public.articles for insert to authenticated
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

drop policy if exists "editors can update articles" on public.articles;
create policy "editors can update articles"
  on public.articles for update to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

drop policy if exists "editors can delete articles" on public.articles;
create policy "editors can delete articles"
  on public.articles for delete to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

drop policy if exists "editors can manage media" on public.media;
create policy "editors can manage media"
  on public.media for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

drop policy if exists "editors can manage advertisements" on public.advertisements;
create policy "editors can manage advertisements"
  on public.advertisements for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

drop policy if exists "editors can manage article redirects" on public.article_redirects;
create policy "editors can manage article redirects"
  on public.article_redirects for all to authenticated
  using (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')))
  with check (exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin')));

drop policy if exists "editors can upload news media" on storage.objects;
create policy "editors can upload news media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'news-media'
    and exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin'))
  );

drop policy if exists "editors can update news media" on storage.objects;
create policy "editors can update news media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'news-media'
    and exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin'))
  )
  with check (
    bucket_id = 'news-media'
    and exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin'))
  );

drop policy if exists "editors can delete news media" on storage.objects;
create policy "editors can delete news media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'news-media'
    and exists (select 1 from public.editorial_profiles p where p.id = auth.uid() and p.role in ('editor', 'admin'))
  );

commit;
