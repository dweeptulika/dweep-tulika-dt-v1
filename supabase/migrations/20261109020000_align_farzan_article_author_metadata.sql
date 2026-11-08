-- Align four additional independent-journalist records with their explicit article bylines.
-- Only the author metadata is changed; article bodies and public URLs are preserved.
update public.articles
set author = 'Mohammed Farzan'
where slug in (
  'private-bus-allegedly-hits-scooter-near-bathu-basti-woman-suffers-hip-fracture-fir-registered-six-days-later',
  'andaman-nicobar-police-issue-hue-and-cry-notice-for-missing-29-year-old-man-from-swaraj-dweep',
  'woman-alleges-assault-and-harassment-near-gb-pant-hospital-aberdeen-police-register-fir',
  'missing-brtf-worker-mukul-sorel-found-the-next-day-after-fir-reportedly-lost-his-way'
)
and author = 'Dweep Tulika';
