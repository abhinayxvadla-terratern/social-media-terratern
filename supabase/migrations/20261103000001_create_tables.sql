-- ==============================================================================
-- Migration 01: Create Core Tables for Lead Page Engine
-- Filename: 20261103000001_create_tables.sql
-- Description:
--   Creates the foundational tables:
--   1. admin_users  - Admin user directory referencing auth.users with roles
--   2. assets       - PDF files and assets tracking
--   3. pages        - Lead generation pages, quizzes, and landing pages
--   4. leads        - Captured leads with UTMs, scores, and completion status
--   5. events       - Funnel event stream (view, start, answer, submit, etc.)
--   6. app_settings - Key-value JSONB settings with default master_kill_switch
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: admin_users
-- Stores dashboard administrator users, their role permissions, and links
-- directly to Supabase's auth.users table.
-- Roles:
--   - owner:  Full access (can manage admins, settings, pages, assets)
--   - editor: Content access (insert/update/delete pages and assets)
--   - viewer: Read-only access across the dashboard
-- ------------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Authorized dashboard admins with assigned roles.';
comment on column public.admin_users.user_id is 'References the authenticated user in Supabase auth.users.';
comment on column public.admin_users.role is 'RBAC permission role: owner, editor, or viewer.';

-- ------------------------------------------------------------------------------
-- 2. Table: assets
-- Stores references to digital assets (such as downloadable lead PDFs)
-- stored in Supabase Storage.
-- ------------------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.assets is 'Catalog of digital assets such as downloadable PDFs.';
comment on column public.assets.storage_path is 'Relative path of the object inside the storage bucket.';

-- ------------------------------------------------------------------------------
-- 3. Table: pages
-- Core configuration for landing pages, quizzes, lead capture forms, etc.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. Table: leads
-- Captured lead submissions with contact info, scoring, and attribution data.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. Table: events
-- High-throughput event tracking stream for visitor actions throughout the funnel.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. Table: app_settings
-- System configurations, flags, and operational switches.
-- ------------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Global system configuration key-value store.';

-- Seed the initial master_kill_switch configuration
insert into public.app_settings (key, value)
values ('master_kill_switch', 'false'::jsonb)
on conflict (key) do nothing;
