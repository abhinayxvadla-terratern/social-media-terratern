-- ==============================================================================
-- Seed Script: Lead Page Engine Sample Data
-- Filename: supabase/seed.sql
-- Description:
--   Populates the database with realistic sample data:
--   1. Sample downloadable PDF asset in `assets`
--   2. One full-featured sample page in `pages` (Germany Opportunity Card Quiz)
--   3. Sample funnel tracking events in `events` (views, starts, answers, submits, downloads)
--   4. Sample leads in `leads` (complete and partial dropoffs)
--   5. Verifies all 4 analytical views with rich populated data
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Optional: Helper to connect your initial admin user
-- Replace the UUID below with your authenticated Supabase user's ID
-- (found in Supabase Dashboard -> Authentication -> Users).
-- ------------------------------------------------------------------------------
/*
insert into public.admin_users (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'owner')
on conflict (user_id) do update set role = 'owner';
*/

-- ------------------------------------------------------------------------------
-- 1. Insert Sample Digital Asset
-- ------------------------------------------------------------------------------
insert into public.assets (id, name, storage_path, created_at)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Germany Opportunity Card 2026 Points Checklist & Roadmap',
  'guides/germany-opportunity-card-2026.pdf',
  now() - interval '14 days'
)
on conflict (id) do update set
  name = excluded.name,
  storage_path = excluded.storage_path;

-- ------------------------------------------------------------------------------
-- 2. Insert Sample Page: "Germany Opportunity Card Eligibility Quiz"
-- ------------------------------------------------------------------------------
insert into public.pages (
  id,
  name,
  slug,
  page_type,
  status,
  start_at,
  end_at,
  keyword,
  page_url,
  closed_message,
  closed_redirect_url,
  pdf_asset_id,
  page_key,
  allowed_origins,
  created_at,
  updated_at
)
values (
  'b0000000-0000-0000-0000-000000000001',
  'Germany Opportunity Card Eligibility Quiz',
  'germany-opportunity-card-quiz',
  'quiz',
  'live',
  now() - interval '14 days',
  null,
  'germany opportunity card points test',
  'https://terratern.com/quiz/germany-opportunity-card',
  'This assessment is currently paused for updates. Please contact our advisory team.',
  'https://terratern.com/germany-opportunity-card',
  'a0000000-0000-0000-0000-000000000001',
  'pk_live_germany_quiz_2026_demo_key',
  array['https://terratern.com', 'https://staging.terratern.com', 'http://localhost:3000'],
  now() - interval '14 days',
  now()
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status,
  page_key = excluded.page_key,
  pdf_asset_id = excluded.pdf_asset_id;

-- ------------------------------------------------------------------------------
-- 3. Insert Sample Leads (Complete and Partial Drop-offs)
-- ------------------------------------------------------------------------------
insert into public.leads (
  id,
  page_id,
  name,
  email,
  phone_e164,
  country_code,
  source,
  keyword,
  post_id,
  utm,
  quiz_score,
  quiz_result,
  visitor_id,
  is_partial,
  consent,
  created_at
)
values
  -- Lead 1: Complete lead from LinkedIn organic campaign
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Aarav Sharma',
    'aarav.sharma@example.com',
    '+919876543210',
    'IN',
    'linkedin',
    'chancenkarte eligibility 2026',
    'li_post_789421',
    '{"utm_source": "linkedin", "utm_medium": "social", "utm_campaign": "germany_q1"}'::jsonb,
    78,
    'eligible_high_priority',
    'vis_linkedin_001',
    false,
    true,
    now() - interval '5 days'
  ),
  -- Lead 2: Complete lead from Google search ads
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Sara Al-Mansoor',
    'sara.mansoor@example.com',
    '+971501234567',
    'AE',
    'google_ads',
    'germany opportunity card requirements',
    'ad_group_germany_gulf',
    '{"utm_source": "google", "utm_medium": "cpc", "utm_campaign": "search_gulf_expats"}'::jsonb,
    65,
    'eligible_standard',
    'vis_google_002',
    false,
    true,
    now() - interval '3 days'
  ),
  -- Lead 3: Partial drop-off lead (user started quiz and gave contact email, but didn't finish phone/final submit)
  (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Daniel Miller',
    'daniel.miller@example.com',
    null,
    'US',
    'instagram',
    'work in germany',
    'ig_reel_4321',
    '{"utm_source": "instagram", "utm_medium": "reel", "utm_campaign": "tech_jobs_de"}'::jsonb,
    null,
    null,
    'vis_instagram_003',
    true,
    false,
    now() - interval '2 days'
  ),
  -- Lead 4: Complete lead from YouTube immigration tutorial
  (
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'Priya Nair',
    'priya.nair@example.com',
    '+919811223344',
    'IN',
    'youtube',
    'chancenkarte calculator',
    'yt_vid_de_2026',
    '{"utm_source": "youtube", "utm_medium": "video_desc", "utm_campaign": "free_quiz"}'::jsonb,
    82,
    'eligible_high_priority',
    'vis_youtube_004',
    false,
    true,
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------------------------
-- 4. Insert Sample Events to Demonstrate Funnel Tracking & Views
-- ------------------------------------------------------------------------------
insert into public.events (id, page_id, visitor_id, lead_id, type, meta, created_at)
values
  -- Visitor 1 (Aarav): view -> start -> Q1 -> Q2 -> Q3 -> submit -> download
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'vis_linkedin_001', null, 'view', '{"referrer": "https://linkedin.com"}'::jsonb, now() - interval '5 days 2 hours'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'vis_linkedin_001', null, 'start', '{"started_at_step": 1}'::jsonb, now() - interval '5 days 1 hour 58 minutes'),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'vis_linkedin_001', null, 'answer', '{"question_number": 1, "answer": "masters_degree", "points": 30}'::jsonb, now() - interval '5 days 1 hour 55 minutes'),
  ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'vis_linkedin_001', null, 'answer', '{"question_number": 2, "answer": "german_b1", "points": 20}'::jsonb, now() - interval '5 days 1 hour 50 minutes'),
  ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'vis_linkedin_001', null, 'answer', '{"question_number": 3, "answer": "5_years_exp", "points": 20}'::jsonb, now() - interval '5 days 1 hour 45 minutes'),
  ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'vis_linkedin_001', 'c0000000-0000-0000-0000-000000000001', 'submit', '{"total_score": 78}'::jsonb, now() - interval '5 days 1 hour 40 minutes'),
  ('e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'vis_linkedin_001', 'c0000000-0000-0000-0000-000000000001', 'download', '{"asset_id": "a0000000-0000-0000-0000-000000000001"}'::jsonb, now() - interval '5 days 1 hour 35 minutes'),

  -- Visitor 2 (Sara): view -> start -> Q1 -> Q2 -> Q3 -> submit
  ('e0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'vis_google_002', null, 'view', '{"referrer": "https://google.com"}'::jsonb, now() - interval '3 days 4 hours'),
  ('e0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 'vis_google_002', null, 'start', '{"started_at_step": 1}'::jsonb, now() - interval '3 days 3 hours 55 minutes'),
  ('e0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'vis_google_002', null, 'answer', '{"question_number": 1, "answer": "bachelors_degree", "points": 20}'::jsonb, now() - interval '3 days 3 hours 50 minutes'),
  ('e0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000001', 'vis_google_002', null, 'answer', '{"question_number": 2, "answer": "english_c1", "points": 15}'::jsonb, now() - interval '3 days 3 hours 45 minutes'),
  ('e0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000001', 'vis_google_002', null, 'answer', '{"question_number": 3, "answer": "3_years_exp", "points": 15}'::jsonb, now() - interval '3 days 3 hours 40 minutes'),
  ('e0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000001', 'vis_google_002', 'c0000000-0000-0000-0000-000000000002', 'submit', '{"total_score": 65}'::jsonb, now() - interval '3 days 3 hours 30 minutes'),

  -- Visitor 3 (Daniel): view -> start -> Q1 -> Q2 -> dropped off before submit
  ('e0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000001', 'vis_instagram_003', null, 'view', '{"referrer": "https://instagram.com"}'::jsonb, now() - interval '2 days 6 hours'),
  ('e0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000001', 'vis_instagram_003', null, 'start', '{"started_at_step": 1}'::jsonb, now() - interval '2 days 5 hours 55 minutes'),
  ('e0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000001', 'vis_instagram_003', null, 'answer', '{"question_number": 1, "answer": "diploma", "points": 10}'::jsonb, now() - interval '2 days 5 hours 50 minutes'),
  ('e0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000001', 'vis_instagram_003', null, 'answer', '{"question_number": 2, "answer": "german_a2", "points": 10}'::jsonb, now() - interval '2 days 5 hours 45 minutes'),

  -- Visitor 4 (Priya): view -> start -> Q1 -> Q2 -> Q3 -> submit -> download -> repeat visit
  ('e0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000001', 'vis_youtube_004', null, 'view', '{"referrer": "https://youtube.com"}'::jsonb, now() - interval '1 day 8 hours'),
  ('e0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000001', 'vis_youtube_004', null, 'start', '{"started_at_step": 1}'::jsonb, now() - interval '1 day 7 hours 55 minutes'),
  ('e0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000001', 'vis_youtube_004', null, 'answer', '{"question_number": 1, "answer": "masters_degree", "points": 30}'::jsonb, now() - interval '1 day 7 hours 50 minutes'),
  ('e0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000001', 'vis_youtube_004', null, 'answer', '{"question_number": 2, "answer": "german_b2", "points": 25}'::jsonb, now() - interval '1 day 7 hours 45 minutes'),
  ('e0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000001', 'vis_youtube_004', null, 'answer', '{"question_number": 3, "answer": "5_years_exp", "points": 20}'::jsonb, now() - interval '1 day 7 hours 40 minutes'),
  ('e0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000001', 'vis_youtube_004', 'c0000000-0000-0000-0000-000000000004', 'submit', '{"total_score": 82}'::jsonb, now() - interval '1 day 7 hours 30 minutes'),
  ('e0000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000001', 'vis_youtube_004', 'c0000000-0000-0000-0000-000000000004', 'download', '{"asset_id": "a0000000-0000-0000-0000-000000000001"}'::jsonb, now() - interval '1 day 7 hours 25 minutes'),
  ('e0000000-0000-0000-0000-000000000025', 'b0000000-0000-0000-0000-000000000001', 'vis_youtube_004', 'c0000000-0000-0000-0000-000000000004', 'repeat', '{"action": "revisited_page"}'::jsonb, now() - interval '1 day 2 hours')
on conflict (id) do nothing;