-- ==============================================================================
-- Migration 02: Indexes and Triggers
-- Filename: 20261103000002_create_indexes_and_triggers.sql
-- Description:
--   1. Creates updated_at trigger function and attaches it to pages and app_settings.
--   2. Creates required performance indexes:
--      - leads(page_id, created_at)
--      - leads(phone_e164)
--      - events(page_id, type, created_at)
--      - pages(slug)
--      - pages(page_key)
--   3. Creates partial unique index:
--      - leads(page_id, phone_e164) for complete leads (is_partial = false)
--   4. Creates foreign key and auxiliary indexes for optimal JOIN and query speeds:
--      - events(lead_id)
--      - pages(pdf_asset_id)
--      - leads(visitor_id)
--      - events(visitor_id)
--      - events answer dropoff expression index
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Trigger Function: set_updated_at()
-- Automatically updates the updated_at column to the current timestamp on row update.
-- ------------------------------------------------------------------------------
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

comment on function public.set_updated_at() is 'Trigger function to automatically maintain updated_at timestamps.';

-- Attach trigger to public.pages
drop trigger if exists trigger_pages_set_updated_at on public.pages;
create trigger trigger_pages_set_updated_at
  before update on public.pages
  for each row
  execute function public.set_updated_at();

-- Attach trigger to public.app_settings
drop trigger if exists trigger_app_settings_set_updated_at on public.app_settings;
create trigger trigger_app_settings_set_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Required Indexes
-- ------------------------------------------------------------------------------

-- Index on pages(slug) for fast page lookups by URL path
create index if not exists pages_slug_idx
  on public.pages (slug);

-- Index on pages(page_key) for fast validation of client requests
create index if not exists pages_page_key_idx
  on public.pages (page_key);

-- Composite index on leads(page_id, created_at) for fast page lead filtering and chronological sorting
create index if not exists leads_page_id_created_at_idx
  on public.leads (page_id, created_at desc);

-- Index on leads(phone_e164) for contact matching and deduplication
create index if not exists leads_phone_e164_idx
  on public.leads (phone_e164)
  where phone_e164 is not null;

-- Composite index on events(page_id, type, created_at) for funnel event tracking and aggregation
create index if not exists events_page_id_type_created_at_idx
  on public.events (page_id, type, created_at desc);

-- ------------------------------------------------------------------------------
-- 3. Partial Unique Index for Complete Leads
-- Ensures that within any given page, a phone number can only have ONE completed lead.
-- Allows multiple partial dropoffs or null phones, but strictly enforces uniqueness
-- on completed submissions.
-- ------------------------------------------------------------------------------
create unique index if not exists leads_page_phone_complete_idx
  on public.leads (page_id, phone_e164)
  where is_partial = false and phone_e164 is not null;

-- ------------------------------------------------------------------------------
-- 4. Foreign Key and Query Optimization Indexes
-- Follows Postgres best practices: always index foreign keys to prevent table locks
-- during cascades and speed up JOIN operations.
-- ------------------------------------------------------------------------------

-- Foreign key index on pages(pdf_asset_id)
create index if not exists pages_pdf_asset_id_idx
  on public.pages (pdf_asset_id)
  where pdf_asset_id is not null;

-- Foreign key index on events(lead_id)
create index if not exists events_lead_id_idx
  on public.events (lead_id)
  where lead_id is not null;

-- Visitor session indexing for rapid device/user lookup
create index if not exists leads_visitor_id_idx
  on public.leads (visitor_id)
  where visitor_id is not null;

create index if not exists events_visitor_id_idx
  on public.events (visitor_id);

-- Partial index for fast quiz answer dropoff analysis
create index if not exists events_answers_dropoff_idx
  on public.events (page_id, (meta->>'question_number'))
  where type = 'answer';
