-- Dynamic editorial team profiles for the About page.
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  designation text not null,
  department text not null default 'Editorial',
  biography text not null default '',
  tagline text,
  image_url text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_public_order_idx
  on public.team_members(is_active, sort_order, created_at);

alter table public.team_members enable row level security;
grant select on public.team_members to anon, authenticated;
grant insert, update, delete on public.team_members to authenticated;

drop policy if exists "public can read active team members" on public.team_members;
create policy "public can read active team members"
  on public.team_members for select to anon, authenticated
  using (is_active = true);

drop policy if exists "admins can manage team members" on public.team_members;
create policy "admins can manage team members"
  on public.team_members for all to authenticated
  using (exists (
    select 1 from public.editorial_profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.editorial_profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

drop trigger if exists team_members_touch_updated_at on public.team_members;
create trigger team_members_touch_updated_at
before update on public.team_members
for each row execute function public.touch_updated_at();

-- Preserve the three existing About-page profiles as editable records.
insert into public.team_members
  (id, name, designation, department, biography, tagline, image_url, sort_order, is_active)
values
  ('a1111111-1111-4111-8111-111111111111', 'R. Vineeth',
   'Editor-in-Chief | Investigative & Data Journalist', 'Editorial',
   'Former Indian Air Force personnel and journalist from the Andaman & Nicobar Islands, R. Vineeth leads Dweep Tulika’s editorial work with a focus on investigative journalism, data journalism, public affairs and accountability reporting. His work through Dweep Tulika includes examining public-interest issues, analysing information and records, and bringing grassroots concerns into public discourse. His journalism is informed by field engagement, regional realities and an interest in documenting issues that affect island communities.',
   'Investigating Issues. Interpreting Data. Amplifying Public Voices.',
   '/images/team/r-vineeth.webp', 1, true),
  ('b2222222-2222-4222-8222-222222222222', 'Birendra Kishore Talukdar',
   'Publisher & Editor, Bengali Monthly Newspaper', 'Publishing',
   'Senior cultural personality from the Andaman & Nicobar Islands associated with performing arts, regional cultural activities and community engagement for several decades. A respected artist and recipient of multiple honours across the fields of art and culture, he has remained actively involved in cultural preservation, public communication and community outreach initiatives. He has also contributed to journalism and public-interest reporting through Dweep Tulika and as Sub-Editor of News Spot Light. In addition, he previously served as Advisor to the Sylhet Divisional Committee of the International Human Rights Crime Reporters Foundation (IHCRF), reflecting his long-standing association with media, social awareness and public-interest initiatives.',
   'Committed to Culture, Community & Credible Journalism',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhu4UqeXIK0MARkWKP6RvhreOnb_7jlnvFSUrDfmiCYA61f_NbNpWQmzZBAhWL7mP8AZmLn_zu7CMuSDt_4wUhUH98acP1LQNRejIrOEHBnfxGGfK6R0B56i0z2fLwdNP1__RjkqCEFan6DGnKoppsXYJuRs-WVk2nSSnfq3e5QpEUEX2AlPy9SWIK-1DFU/s320/WhatsApp%20Image%202025-06-29%20at%202.22.22%20PM.jpeg',
   2, true),
  ('c3333333-3333-4333-8333-333333333333', 'Mrs. Chapala Talukdar',
   'Sub Editor | Local Issues & Ground Reports | Proofreader', 'Editorial',
   'Mrs. Chapala Talukdar contributes to Dweep Tulika’s editorial work through coverage of local issues and ground reports, along with proofreading and language review. Her role supports the accuracy, clarity and consistency of published content, helping ensure that community concerns and local developments are presented with care and attention to detail.',
   'Grounded in the Community. Guided by Accuracy.',
   '/images/team/chapala-talukdar.webp', 3, true)
on conflict (id) do nothing;
