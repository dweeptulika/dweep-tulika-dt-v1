-- Add editorial metadata for featured images without changing existing article text or URLs.
alter table public.articles
  add column if not exists featured_image_alt text,
  add column if not exists featured_image_caption text;

-- Correct the known independent-reporter byline for the BRTF missing-worker report.
-- This changes only the article's author metadata; the published body remains untouched.
update public.articles
set author = 'Mohammed Farzan'
where slug = '24-year-old-brtf-worker-reported-missing-after-disappearing-near-coast-guard-panipat-gate'
  and author = 'Dweep Tulika';
