# Supabase dependency inventory

This inventory is based on direct source inspection of the migration branch. It records why changing only the database URL or adding a provider environment variable would not migrate the application.

## Direct database and storage call sites

| Area | Source file | Current dependency | Required abstraction |
|---|---|---|---|
| Public article reads and advertisement reads | `lib/data.ts` | Supabase JS client; articles and advertisements | Server-side content repository |
| Server session client | `lib/supabase/server.ts` | `@supabase/ssr`, Next.js cookies | Keep as Supabase Auth adapter until auth is separately migrated |
| Browser session client | `lib/supabase/client.ts` | `@supabase/ssr` | Keep as Supabase Auth adapter until auth is separately migrated |
| Admin article editor | `app/admin/client.tsx` | Auth, articles CRUD, duplicate checks, media upload, media metadata | Admin article service and media storage interface |
| Advertisement editor | `components/AdvertisementPanel.tsx` | Advertisement CRUD, current-user lookup, media upload | Advertisement service and media storage interface |
| Team manager | `app/admin/team/team-manager.tsx` | Team CRUD, editorial role lookup, media upload | Team service, authorization service and media storage interface |
| About page | `app/about/page.tsx` | Public team-member query | Server-side team repository |
| Admin proxy | `proxy.ts` | Supabase claims and editorial profile role lookup | Auth/session adapter plus server authorization service |
| Legacy article API | `app/api/admin/legacy-articles/route.ts` | Auth user and editorial profile role lookup | Authorization service |
| Login | `app/admin/login/client.tsx` | Supabase password sign-in | Auth adapter |
| Forgot password | `app/admin/forgot-password/page.tsx` | Supabase recovery email | Auth adapter |
| Auth callback | `app/auth/callback/route.ts` | PKCE exchange and OTP verification | Supabase Auth callback adapter |
| Recovery completion | `app/auth/complete/page.tsx` | Dedicated recovery client and session transfer | Supabase Auth recovery adapter |
| Password reset | `app/auth/reset-password/page.tsx` | Session set/check and password update | Auth adapter |

## Data and storage contract

The current article contract includes IDs, title, slug, category, author, excerpt, raw `body_html`, featured image, SEO title, meta description, social image, status, scheduled/published timestamps, audit users, timestamps, source, legacy identifiers/URL, public path, and featured-image metadata.

Related data includes categories and article-category links, article redirects, media metadata, advertisements, team members, and editorial profiles. Storage currently uses the public `news-media` bucket. The alternative storage adapter must preserve object keys and public URL behavior or provide an explicit, tested URL compatibility layer.

## Authentication boundary

Supabase Auth is coupled to server cookies, browser sessions, PKCE recovery, OTP verification, password reset, and role checks. The initial database/storage migration should not attempt to copy password hashes or sessions. Keep Supabase Auth as a separate provider until a dedicated identity migration is designed and tested.

## Known reconciliation issue

The inspected project inventory showed 252 rows in `public.media` and 258 objects in `storage.objects`. This six-object difference must be explained by a full object-to-metadata reconciliation before any media copy. It is not safe to assume that every object has a media row or that every media row has a valid object.

## Implementation order

1. Add repository/service interfaces and preserve existing Supabase implementations as the default.
2. Move public reads first and prove output parity against the current implementation.
3. Move server-side admin reads/writes behind services without changing the UI.
4. Move media operations behind a storage interface; retain object paths.
5. Keep auth on Supabase and centralize authorization checks.
6. Implement Neon and R2 adapters only after the interfaces and data contract are stable.
7. Run isolated integration tests and reconciliation before any trial.

## Verification not yet performed

No alternative database or object store has been provisioned. No credentials have been added. No full local build, typecheck, lint, integration test, data export/import, media copy, or rollback rehearsal has been completed. This inventory is not evidence of a completed migration.
