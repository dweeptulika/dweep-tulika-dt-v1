-- Align newsroom author metadata with explicit bylines while preserving published article text.
update public.articles
set author = case
  when slug in (
    'face-of-andaman-controversy-instagram-page-defends-ai-parody-reel-says-fictional-characters-were-used-not-contestants-photographs',
    'aiims-gorakhpur-director-dr-vibha-dutta-taken-to-private-hospital-for-cardiac-evaluation-non-operational-cath-lab-raises-questions',
    'mehmood-pracha-seeks-cbi-fir-against-gautam-adani-narendra-modi-and-others-cites-alleged-misuse-of-public-office'
  ) then 'Dweep Tulika News Desk'
  when slug in (
    'sri-lanka-reports-rising-influenza-activity-and-over-one-lakh-dengue-cases-who-highlights-regional-disease-trends',
    'sri-lankan-navy-commander-sameera-samarakoon-dies-in-sri-vijaya-puram-during-bimstec-2026-deployment'
  ) then 'Dweep Tulika Editorial Desk'
  when slug = 'infrastructure-what-was-built-what-was-delivered-the-headline-prime-minister-part-4'
    then 'Dweep Tulika Newsroom'
  else author
end
where slug in (
  'face-of-andaman-controversy-instagram-page-defends-ai-parody-reel-says-fictional-characters-were-used-not-contestants-photographs',
  'aiims-gorakhpur-director-dr-vibha-dutta-taken-to-private-hospital-for-cardiac-evaluation-non-operational-cath-lab-raises-questions',
  'mehmood-pracha-seeks-cbi-fir-against-gautam-adani-narendra-modi-and-others-cites-alleged-misuse-of-public-office',
  'sri-lanka-reports-rising-influenza-activity-and-over-one-lakh-dengue-cases-who-highlights-regional-disease-trends',
  'sri-lankan-navy-commander-sameera-samarakoon-dies-in-sri-vijaya-puram-during-bimstec-2026-deployment',
  'infrastructure-what-was-built-what-was-delivered-the-headline-prime-minister-part-4'
);
