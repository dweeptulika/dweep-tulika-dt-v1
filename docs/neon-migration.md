# Neon backend migration

## Current implementation boundary

- Supabase remains the default provider in production.
- Neon is an opt-in content read provider controlled by the server-only `CONTENT_DATABASE_PROVIDER=neon` setting.
- The public newsroom read adapter currently covers published articles, article-by-path lookup, and active advertisements.
- Supabase Auth, admin CRUD, authorization, team management, and media upload/delivery remain on Supabase.
- Do not set the Neon provider in production until the schema and data have been copied and reconciled.

## Required environment

Set these only in a non-production Vercel Preview environment:

- `CONTENT_DATABASE_PROVIDER=neon`
- `DATABASE_URL` = Neon pooled connection string, including SSL mode.

`DATABASE_URL` must never use a `NEXT_PUBLIC_` prefix or be exposed to browser code. Keep the existing Supabase environment variables for authentication and admin workflows.

## Schema and data

Apply `neon/migrations/0001_initial.sql` to the Neon project before using the read adapter. The schema is intentionally additive and excludes foreign keys to Supabase Auth. Authentication IDs remain UUID references only; credentials, password hashes, and sessions are not copied.

Copy data with a separately reviewed export/import process. Preserve IDs, article HTML, slugs, public paths, timestamps, publication state, SEO fields, media keys, advertisements, and team records. Reconcile the known media inventory difference (252 metadata rows versus 258 storage objects) before copying media.

## Rollout gates

1. Apply schema on an isolated Neon branch and inspect all tables/indexes.
2. Export and verify source data before importing.
3. Reconcile row counts and article fields byte-for-byte.
4. Configure Preview-only environment variables and verify public route parity.
5. Migrate admin writes, team reads, authorization, and media separately.
6. Test login, recovery, editorial roles, publishing, scheduling, and uploads.
7. Rehearse rollback to Supabase.
8. Require explicit approval before any production environment or domain cutover.

## Migration progress (2026-11-15)

- Applied and verified the Neon schema on the project's production-named branch; the website is not cut over.
- Copied 136 articles, 1 advertisement, 7 categories, 25 article-category links, 7 team members, 2 editorial profile rows, 252 media metadata rows, and 0 article redirects from Supabase.
- The Supabase and Neon article row counts match, and both full-row and article-HTML aggregate hashes match exactly.
- Neon Preview access uses a dedicated read-only database role. The Vercel variables `CONTENT_DATABASE_PROVIDER=neon` and `DATABASE_URL` are scoped only to the `migration/reversible-backend-adapter` Preview branch.
- Supabase remains the authentication and admin write provider. No production environment variables or domain settings have been changed.

## Still outstanding

- Supabase Storage has 258 objects while its `public.media` metadata table has 252 rows. The six-object difference must be reconciled before any media cutover.
- All 258 Supabase Storage objects now have corresponding Neon media metadata (252 original records plus the six storage-only objects: one advertisement image and five team images). The binary objects have not yet been copied to Cloudflare R2.
- Verify the branch-scoped read-only connection against the live Preview deployment and exercise public pages.
- Complete the remaining admin write, authorization, media, login/recovery, publishing, scheduling, and rollback work before any production cutover.

## Cloudflare R2 media transfer

A guarded manual workflow is available at `.github/workflows/migrate-media-to-r2.yml`. It only runs from `migration/reversible-backend-adapter`.

Required GitHub Actions repository secrets:

- `NEON_MIGRATION_DATABASE_URL`: Neon connection string for a migration role with SELECT on `public` and UPDATE only on `public.media`, `public.articles`, `public.advertisements`, and `public.team_members`.
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`: HTTPS public hostname for the R2 bucket (custom domain preferred).

The workflow defaults to a dry run. Only dispatch with `apply=true` after all six secrets are configured and the R2 bucket's public HTTPS hostname is active. The script uploads each object under its original storage key, reads it back, verifies byte length and SHA-256, and only after every object passes verification updates matching URLs in `media`, article image fields and HTML, advertisements, and team profiles in one database transaction. It never deletes Supabase source objects.

Do not change production environment variables, DNS, or Supabase storage during this stage. Keep the Supabase bucket online until public preview URLs and rollback have been tested.
