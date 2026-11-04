-- ==============================================================================
-- Migration 03: Administrative Analytics Views
-- Filename: 20261103000003_create_views.sql
-- Description:
--   Creates analytical views for admin dashboards:
--   1. page_stats      - Per page: views, starts, submits, leads, conversion %
--   2. daily_trend     - Per page per day funnel trend metrics
--   3. answer_dropoff  - Answer events grouped by page and meta question number
--   4. leads_by_source - Source and keyword breakdown with lead counts
--
-- Security Note:
--   All views are created with `WITH (security_invoker = true)` per Supabase
--   and PostgreSQL 15+ best practices. This guarantees that Row Level Security (RLS)
--   from underlying tables is strictly respected when querying views.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. View: page_stats
-- High-level overview per page showing aggregate top-of-funnel and bottom-of-funnel
-- metrics, lead counts, and overall conversion percentage.
-- ------------------------------------------------------------------------------
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

comment on view public.page_stats is 'High-level funnel statistics and conversion rate per page.';

-- ------------------------------------------------------------------------------
-- 2. View: daily_trend
-- Tracks day-by-day activity and conversion trends per page, allowing administrators
-- to monitor campaign spikes, traffic shifts, and conversion rate changes over time.
-- ------------------------------------------------------------------------------
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

comment on view public.daily_trend is 'Daily breakdown of views, starts, submits, and leads per page.';

-- ------------------------------------------------------------------------------
-- 3. View: answer_dropoff
-- Analyzes drop-off across quiz questions or multi-step forms by grouping
-- answer events by page and question number from the event meta JSONB.
-- ------------------------------------------------------------------------------
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

comment on view public.answer_dropoff is 'Quiz/multi-step dropoff analysis grouping answers by question number.';

-- ------------------------------------------------------------------------------
-- 4. View: leads_by_source
-- Attribution analysis reporting total, complete, and partial lead counts
-- segmented by acquisition source and keyword.
-- ------------------------------------------------------------------------------
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

comment on view public.leads_by_source is 'Lead acquisition counts grouped by page, source, and keyword.';

-- ------------------------------------------------------------------------------
-- View Permissions
-- Revoke direct anon/public access and grant SELECT to authenticated role.
-- Underlying tables are still guarded by RLS via security_invoker.
-- ------------------------------------------------------------------------------
grant select on public.page_stats to authenticated;
grant select on public.daily_trend to authenticated;
grant select on public.answer_dropoff to authenticated;
grant select on public.leads_by_source to authenticated;

revoke all on public.page_stats from anon, public;
revoke all on public.daily_trend from anon, public;
revoke all on public.answer_dropoff from anon, public;
revoke all on public.leads_by_source from anon, public;
