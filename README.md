# Dweep Tulika — DT V1

This package is generated from the supplied Blogger `feed(1).atom`.

Migration inventory:
- 160 LIVE posts
- 3 LIVE pages
- 2 DRAFT posts
- 1 pending-moderation COMMENT entry in the export

The live article URLs are preserved using the Blogger filename:
`/YYYY/MM/slug.html`

The old Blogger site should remain online until the new domain is fully tested.

## Run

npm install
npm run check
npm run dev

## Next production steps

1. Push this repository to GitHub.
2. Let Vercel create a preview deployment.
3. Test article routes, sitemap, robots and mobile layout.
4. Add image asset migration and content sanitisation checks.
5. Connect Supabase only after the migrated content model is validated.
6. Upgrade Vercel to a commercial plan before production launch.
