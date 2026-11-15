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
