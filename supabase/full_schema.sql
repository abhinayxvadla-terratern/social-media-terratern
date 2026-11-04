-- ==============================================================================
-- Consolidated Setup Script: Lead Page Engine
-- Filename: supabase/full_schema.sql
-- Description:
--   Complete, idempotent setup script combining Migrations 01 through 05.
--   Can be executed in a single run inside the Supabase Web SQL Editor.
-- ==============================================================================

-- ==============================================================================
-- PART 1: CORE TABLES
-- ==============================================================================

-- 1. Table: admin_users
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Authorized dashboard admins with assigned roles.';
comment on column public.admin_users.user_id is 'References the authenticated user in Supabase auth.users.';
comment on column public.admin_users.role is 'RBAC permission role: owner, editor, or viewer.';

-- 2. Table: assets
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.assets is 'Catalog of digital assets such as downloadable PDFs.';
comment on column public.assets.storage_path is 'Relative path of the object inside the storage bucket.';

-- 3. Table: pages
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (length(slug) > 0 and slug ~ '^[a-z0-9-]+$'),
  page_type text not null default 'quiz' check (page_type in ('quiz', 'lead_pdf', 'welcome', 'other')),
  status text not null default 'draft' check (status in ('draft', 'live', 'paused', 'scheduled')),
  start_at timestamptz,
  end_at timestamptz,
  keyword text,
  page_url text,
  closed_message text,
  closed_redirect_url text,
  pdf_asset_id uuid references public.assets(id) on delete set null,
  page_key text not null unique default replace(gen_random_uuid()::text, '-', ''),
  allowed_origins text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_page_schedule check (end_at is null or start_at is null or end_at > start_at)
);

comment on table public.pages is 'Landing pages, quizzes, and lead magnets configured in the engine.';
comment on column public.pages.slug is 'URL-friendly unique path identifier (lowercase letters, numbers, hyphens).';
comment on column public.pages.page_key is 'Random unique public key used by frontend client apps for verification.';
comment on column public.pages.allowed_origins is 'Array of allowed CORS origins or domain hostnames allowed to embed/run this page.';

-- 4. Table: leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  name text,
  email text,
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9]\d{1,14}$'),
  country_code text,
  source text,
  keyword text,
  post_id text,
  utm jsonb not null default '{}'::jsonb,
  quiz_score integer,
  quiz_result text,
  visitor_id text,
  is_partial boolean not null default false,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.leads is 'Leads collected across all pages, including partial and completed submissions.';
comment on column public.leads.phone_e164 is 'Normalized international phone number compliant with E.164 (e.g. +14155552671).';
comment on column public.leads.is_partial is 'True if lead dropped off before final submission; false for complete leads.';
comment on column public.leads.consent is 'Explicit marketing/contact consent flag provided by user.';

-- 5. Table: events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  visitor_id text not null,
  lead_id uuid references public.leads(id) on delete set null,
  type text not null check (type in ('view', 'start', 'answer', 'submit', 'download', 'repeat')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.events is 'Funnel interactions and analytics event stream.';
comment on column public.events.visitor_id is 'Anonymous client cookie or device identifier.';
comment on column public.events.type is 'Event type: view, start, answer, submit, download, or repeat.';
comment on column public.events.meta is 'Arbitrary metadata payload (e.g. {"question_number": 2, "choice": "A"}).';

-- 6. Table: app_settings
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Global system configuration key-value store.';

-- Seed initial master_kill_switch
insert into public.app_settings (key, value)
values ('master_kill_switch', 'false'::jsonb)
on conflict (key) do nothing;

-- ==============================================================================
-- PART 2: INDEXES AND TRIGGERS
-- ==============================================================================

-- Trigger Function: set_updated_at() with isolated search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers
create trigger trigger_pages_set_updated_at
  before update on public.pages
  for each row
  execute function public.set_updated_at();

create trigger trigger_app_settings_set_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_updated_at();

-- Required indexes
create index if not exists pages_slug_idx
  on public.pages (slug);

create index if not exists pages_page_key_idx
  on public.pages (page_key);

create index if not exists leads_page_id_created_at_idx
  on public.leads (page_id, created_at desc);

create index if not exists leads_phone_e164_idx
  on public.leads (phone_e164)
  where phone_e164 is not null;

create index if not exists events_page_id_type_created_at_idx
  on public.events (page_id, type, created_at desc);

-- Partial unique index for complete leads
create unique index if not exists leads_page_phone_complete_idx
  on public.leads (page_id, phone_e164)
  where is_partial = false and phone_e164 is not null;

-- Foreign key and performance indexes
create index if not exists pages_pdf_asset_id_idx
  on public.pages (pdf_asset_id)
  where pdf_asset_id is not null;

create index if not exists events_lead_id_idx
  on public.events (lead_id)
  where lead_id is not null;

create index if not exists leads_visitor_id_idx
  on public.leads (visitor_id)
  where visitor_id is not null;

create index if not exists events_visitor_id_idx
  on public.events (visitor_id);

create index if not exists events_answers_dropoff_idx
  on public.events (page_id, (meta->>'question_number'))
  where type = 'answer';

-- ==============================================================================
-- PART 3: ANALYTICS VIEWS
-- ==============================================================================

-- 1. View: page_stats
create or replace view public.page_stats
with (security_invoker = true) as
with event_counts as (
  select
    page_id,
    count(*) filter (where type = 'view') as views,
    count(*) filter (where type = 'start') as starts,
    count(*) filter (where type = 'submit') as submits,
    count(*) filter (where type = 'download') as downloads
  from public.events
  group by page_id
),
lead_counts as (
  select
    page_id,
    count(*) as total_leads,
    count(*) filter (where is_partial = false) as complete_leads,
    count(*) filter (where is_partial = true) as partial_leads
  from public.leads
  group by page_id
)
select
  p.id as page_id,
  p.name as page_name,
  p.slug as page_slug,
  p.page_type,
  p.status,
  coalesce(ec.views, 0) as views,
  coalesce(ec.starts, 0) as starts,
  coalesce(ec.submits, 0) as submits,
  coalesce(ec.downloads, 0) as downloads,
  coalesce(lc.total_leads, 0) as leads,
  coalesce(lc.complete_leads, 0) as complete_leads,
  coalesce(lc.partial_leads, 0) as partial_leads,
  case
    when coalesce(ec.views, 0) > 0 then
      round((coalesce(lc.total_leads, 0)::numeric / ec.views::numeric) * 100.0, 2)
    else 0.00
  end as conversion_percentage
from public.pages p
left join event_counts ec on ec.page_id = p.id
left join lead_counts lc on lc.page_id = p.id;

-- 2. View: daily_trend
create or replace view public.daily_trend
with (security_invoker = true) as
with daily_events as (
  select
    page_id,
    date_trunc('day', created_at)::date as report_date,
    count(*) filter (where type = 'view') as views,
    count(*) filter (where type = 'start') as starts,
    count(*) filter (where type = 'submit') as submits,
    count(*) filter (where type = 'answer') as answers,
    count(*) filter (where type = 'download') as downloads
  from public.events
  group by page_id, date_trunc('day', created_at)::date
),
daily_leads as (
  select
    page_id,
    date_trunc('day', created_at)::date as report_date,
    count(*) as leads,
    count(*) filter (where is_partial = false) as complete_leads,
    count(*) filter (where is_partial = true) as partial_leads
  from public.leads
  group by page_id, date_trunc('day', created_at)::date
),
all_dates as (
  select page_id, report_date from daily_events
  union
  select page_id, report_date from daily_leads
)
select
  ad.report_date,
  p.id as page_id,
  p.name as page_name,
  p.slug as page_slug,
  coalesce(de.views, 0) as views,
  coalesce(de.starts, 0) as starts,
  coalesce(de.submits, 0) as submits,
  coalesce(de.answers, 0) as answers,
  coalesce(de.downloads, 0) as downloads,
  coalesce(dl.leads, 0) as leads,
  coalesce(dl.complete_leads, 0) as complete_leads,
  coalesce(dl.partial_leads, 0) as partial_leads,
  case
    when coalesce(de.views, 0) > 0 then
      round((coalesce(dl.leads, 0)::numeric / de.views::numeric) * 100.0, 2)
    else 0.00
  end as conversion_percentage
from all_dates ad
join public.pages p on p.id = ad.page_id
left join daily_events de on de.page_id = ad.page_id and de.report_date = ad.report_date
left join daily_leads dl on dl.page_id = ad.page_id and dl.report_date = ad.report_date
order by ad.report_date desc, p.name asc;

-- 3. View: answer_dropoff
create or replace view public.answer_dropoff
with (security_invoker = true) as
select
  p.id as page_id,
  p.name as page_name,
  p.slug as page_slug,
  coalesce(
    e.meta->>'question_number',
    e.meta->>'question',
    e.meta->>'step',
    'unspecified'
  ) as question_number,
  count(*) as total_answers,
  count(distinct e.visitor_id) as unique_respondents,
  min(e.created_at) as first_answered_at,
  max(e.created_at) as last_answered_at
from public.events e
join public.pages p on p.id = e.page_id
where e.type = 'answer'
group by
  p.id,
  p.name,
  p.slug,
  coalesce(
    e.meta->>'question_number',
    e.meta->>'question',
    e.meta->>'step',
    'unspecified'
  )
order by
  p.name asc,
  question_number asc;

-- 4. View: leads_by_source
create or replace view public.leads_by_source
with (security_invoker = true) as
select
  p.id as page_id,
  p.name as page_name,
  p.slug as page_slug,
  coalesce(nullif(trim(l.source), ''), 'direct / organic') as source,
  coalesce(nullif(trim(l.keyword), ''), 'none') as keyword,
  count(*) as total_leads,
  count(*) filter (where is_partial = false) as complete_leads,
  count(*) filter (where is_partial = true) as partial_leads,
  min(l.created_at) as first_lead_at,
  max(l.created_at) as last_lead_at
from public.leads l
join public.pages p on p.id = l.page_id
group by
  p.id,
  p.name,
  p.slug,
  coalesce(nullif(trim(l.source), ''), 'direct / organic'),
  coalesce(nullif(trim(l.keyword), ''), 'none')
order by
  total_leads desc,
  p.name asc;

-- Permissions on views
grant select on public.page_stats to authenticated;
grant select on public.daily_trend to authenticated;
grant select on public.answer_dropoff to authenticated;
grant select on public.leads_by_source to authenticated;

revoke all on public.page_stats from anon, public;
revoke all on public.daily_trend from anon, public;
revoke all on public.answer_dropoff from anon, public;
revoke all on public.leads_by_source from anon, public;

-- ==============================================================================
-- PART 4: PRIVATE STORAGE BUCKET
-- ==============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pdfs',
  'pdfs',
  false,
  20971520, -- 20 MB max file size
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf'];

-- ==============================================================================
-- PART 5: SECURITY, RBAC FUNCTIONS, AND ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 1. Helper functions in isolated private schema
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create or replace function private.is_editor_or_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and role in ('owner', 'editor')
  );
$$;

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

revoke all on function private.is_editor_or_owner() from public, anon;
grant execute on function private.is_editor_or_owner() to authenticated;

revoke all on function private.is_owner() from public, anon;
grant execute on function private.is_owner() to authenticated;

-- 2. Enable RLS (storage.objects already has RLS enabled by default)
alter table public.admin_users enable row level security;
alter table public.app_settings enable row level security;
alter table public.assets enable row level security;
alter table public.pages enable row level security;
alter table public.leads enable row level security;
alter table public.events enable row level security;

-- 3. Policies: admin_users
create policy "admin_users_select_policy"
  on public.admin_users
  for select
  to authenticated
  using ((select private.is_admin()));

create policy "admin_users_insert_policy"
  on public.admin_users
  for insert
  to authenticated
  with check ((select private.is_owner()));

create policy "admin_users_update_policy"
  on public.admin_users
  for update
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

create policy "admin_users_delete_policy"
  on public.admin_users
  for delete
  to authenticated
  using ((select private.is_owner()));

-- 4. Policies: app_settings
create policy "app_settings_select_policy"
  on public.app_settings
  for select
  to authenticated
  using ((select private.is_admin()));

create policy "app_settings_insert_policy"
  on public.app_settings
  for insert
  to authenticated
  with check ((select private.is_owner()));

create policy "app_settings_update_policy"
  on public.app_settings
  for update
  to authenticated
  using ((select private.is_editor_or_owner()))
  with check ((select private.is_editor_or_owner()));

create policy "app_settings_delete_policy"
  on public.app_settings
  for delete
  to authenticated
  using ((select private.is_owner()));

-- 5. Policies: assets
create policy "assets_select_policy"
  on public.assets
  for select
  to authenticated
  using ((select private.is_admin()));

create policy "assets_insert_policy"
  on public.assets
  for insert
  to authenticated
  with check ((select private.is_editor_or_owner()));

create policy "assets_update_policy"
  on public.assets
  for update
  to authenticated
  using ((select private.is_editor_or_owner()))
  with check ((select private.is_editor_or_owner()));

create policy "assets_delete_policy"
  on public.assets
  for delete
  to authenticated
  using ((select private.is_editor_or_owner()));

-- 6. Policies: pages
create policy "pages_select_policy"
  on public.pages
  for select
  to authenticated
  using ((select private.is_admin()));

create policy "pages_insert_policy"
  on public.pages
  for insert
  to authenticated
  with check ((select private.is_editor_or_owner()));

create policy "pages_update_policy"
  on public.pages
  for update
  to authenticated
  using ((select private.is_editor_or_owner()))
  with check ((select private.is_editor_or_owner()));

create policy "pages_delete_policy"
  on public.pages
  for delete
  to authenticated
  using ((select private.is_editor_or_owner()));

-- 7. Policies: leads
create policy "leads_select_policy"
  on public.leads
  for select
  to authenticated
  using ((select private.is_admin()));

create policy "leads_delete_policy"
  on public.leads
  for delete
  to authenticated
  using ((select private.is_owner()));

-- 8. Policies: events
create policy "events_select_policy"
  on public.events
  for select
  to authenticated
  using ((select private.is_admin()));

-- 9. Storage Policies: bucket "pdfs" on storage.objects
create policy "storage_pdfs_select_policy"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (select private.is_admin())
  );

create policy "storage_pdfs_insert_policy"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pdfs'
    and (select private.is_editor_or_owner())
  );

create policy "storage_pdfs_update_policy"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (select private.is_editor_or_owner())
  )
  with check (
    bucket_id = 'pdfs'
    and (select private.is_editor_or_owner())
  );

create policy "storage_pdfs_delete_policy"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (select private.is_editor_or_owner())
  );
