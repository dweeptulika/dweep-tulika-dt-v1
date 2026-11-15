# Reversible backend migration

## Current state

The production application remains on Supabase. This branch is an isolated preparation branch; it is not deployed and does not change production data, DNS, authentication, or hosting.

The application currently has direct Supabase dependencies in public article reads, admin article editing, advertisement management, team management, media uploads, middleware authorization, password recovery, and the legacy-article API. A provider switch is therefore not safe until those call sites have been moved behind tested interfaces.

## Target architecture

- Keep the existing Next.js application and Vercel hosting.
- Retain Supabase as the initial provider and rollback source.
- Evaluate Neon PostgreSQL for relational data and Cloudflare R2 for media object storage in a separate, non-production environment.
- Keep Supabase Auth during the first trial if it remains operational; authentication migration is a separate workstream.
- Select providers only through server-side configuration. Never expose database credentials or storage secrets through `NEXT_PUBLIC_*` variables.

## Migration invariants

1. Preserve article IDs, slugs, public paths, publication timestamps, status, author attribution, SEO fields, and article HTML byte-for-byte.
2. Preserve image object keys and verify every object by size and checksum where available. Reconcile the known difference between media rows and storage objects before copying.
3. Preserve category relationships, advertisements, team profiles, and editor/admin authorization.
4. Preserve canonical URLs, Blogger archive fallbacks, search, category pages, sitemap output, and redirects.
5. Never copy password hashes or active sessions as ordinary application data.
6. Do not enable the alternative provider until all required adapters and acceptance tests pass.
7. Keep production on Supabase until the user explicitly approves a separately reviewed cutover.

## Workstreams

- Data access: articles, categories, redirects, advertisements, team members, editorial profiles.
- Identity and authorization: login, recovery, session cookies, role checks, and server-side authorization.
- Media: upload, public delivery, metadata, object reconciliation, and deletion behavior.
- Operational workflows: create/edit/publish/schedule articles, legacy adoption, and advertisement/team management.
- Verification: data reconciliation, URL parity, image checks, permission tests, build/type checks, and rollback rehearsal.

## Acceptance gates

- Source and schema inventory is complete, including RLS policies, triggers, functions, grants, storage policies, and auth configuration.
- A restorable, verified backup/export exists before any data copy.
- All record counts reconcile and all article HTML and identifiers are preserved.
- All media objects are accounted for and every referenced image resolves.
- Public and admin routes behave equivalently in an isolated environment.
- Login, recovery, editor/admin permissions, publishing, scheduling, and uploads pass tests.
- Rollback to Supabase is rehearsed.
- The user explicitly approves any production cutover.

## Current implementation boundary

The provider guard in `lib/backend/provider.ts` only validates configuration and fails closed when the alternative provider is selected before its adapter is implemented. It does not route application queries and must not be treated as a completed backend abstraction.
