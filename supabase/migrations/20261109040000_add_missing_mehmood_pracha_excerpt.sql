-- Add a careful, allegation-attributed excerpt to the one published article missing one.
update public.articles
set excerpt = 'Advocate Mehmood Pracha has asked the CBI to register an FIR and investigate allegations concerning Gautam Adani, Prime Minister Narendra Modi and others. The complaint is an allegation, not a finding of guilt.'
where slug = 'mehmood-pracha-seeks-cbi-fir-against-gautam-adani-narendra-modi-and-others-cites-alleged-misuse-of-public-office'
  and coalesce(trim(excerpt), '') = '';
