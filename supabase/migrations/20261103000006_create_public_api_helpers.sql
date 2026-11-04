-- ==============================================================================
-- Migration 06: Public API Helper Functions (SECURITY DEFINER)
-- Filename: 20261103000006_create_public_api_helpers.sql
-- Description:
--   Provides database-level helper functions for public API operations.
--   Enforces page active status, campaign scheduling, kill switch checks,
--   origin validation, duplicate handling, and partial lead upgrades.
-- ==============================================================================

-- 1. Helper to retrieve page status and configuration safely
create or replace function public.api_get_page_status(p_page_key text)
returns table (
  page_id uuid,
  name text,
  slug text,
  page_type text,
  is_live boolean,
  status text,
  closed_message text,
  closed_redirect_url text,
  allowed_origins text[],
  pdf_asset_id uuid,
  pdf_name text,
  pdf_storage_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kill_switch boolean := false;
  v_page record;
  v_live boolean := false;
begin
  -- Check master kill switch
  select coalesce((value->>'master_kill_switch')::boolean, (value::text = 'true'))
  into v_kill_switch
  from public.app_settings
  where key = 'master_kill_switch';

  -- Find target page
  select 
    p.id, p.name, p.slug, p.page_type, p.status, p.start_at, p.end_at,
    p.closed_message, p.closed_redirect_url, p.allowed_origins,
    p.pdf_asset_id, a.name as asset_name, a.storage_path as asset_path
  into v_page
  from public.pages p
  left join public.assets a on a.id = p.pdf_asset_id
  where p.page_key = p_page_key;

  if not found then
    return;
  end if;

  -- Determine if page is actively live
  if v_kill_switch is true then
    v_live := false;
  elsif v_page.status = 'live' then
    v_live := true;
  elsif v_page.status = 'scheduled' then
    v_live := (
      (v_page.start_at is null or now() >= v_page.start_at) and
      (v_page.end_at is null or now() <= v_page.end_at)
    );
  else
    v_live := false;
  end if;

  return query select
    v_page.id,
    v_page.name,
    v_page.slug,
    v_page.page_type,
    v_live,
    v_page.status,
    v_page.closed_message,
    v_page.closed_redirect_url,
    v_page.allowed_origins,
    v_page.pdf_asset_id,
    v_page.asset_name,
    v_page.asset_path;
end;
$$;

-- Grant execution to public / anon / authenticated
grant execute on function public.api_get_page_status(text) to public, anon, authenticated;

-- 2. Helper to record events safely
create or replace function public.api_record_event(
  p_page_key text,
  p_visitor_id text,
  p_type text,
  p_meta jsonb default '{}'::jsonb,
  p_lead_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page record;
  v_event_id uuid;
begin
  -- Validate event type
  if p_type not in ('view', 'start', 'answer', 'submit', 'download', 'repeat') then
    return jsonb_build_object('success', false, 'error', 'Invalid event type');
  end if;

  -- Validate page status
  select * from public.api_get_page_status(p_page_key) into v_page;
  if v_page.page_id is null then
    return jsonb_build_object('success', false, 'error', 'Invalid page key');
  end if;

  if v_page.is_live is not true then
    return jsonb_build_object(
      'success', false,
      'error', 'Page is not active',
      'closed_message', v_page.closed_message,
      'closed_redirect_url', v_page.closed_redirect_url
    );
  end if;

  -- Insert event
  insert into public.events (page_id, visitor_id, lead_id, type, meta)
  values (v_page.page_id, p_visitor_id, p_lead_id, p_type, coalesce(p_meta, '{}'::jsonb))
  returning id into v_event_id;

  return jsonb_build_object('success', true, 'event_id', v_event_id);
end;
$$;

grant execute on function public.api_record_event(text, text, text, jsonb, uuid) to public, anon, authenticated;

-- 3. Helper to record partial leads
create or replace function public.api_submit_partial_lead(
  p_page_key text,
  p_visitor_id text,
  p_name text,
  p_phone_e164 text,
  p_country_code text default 'IN',
  p_source text default null,
  p_keyword text default null,
  p_post_id text default null,
  p_utm jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page record;
  v_lead_id uuid;
  v_existing record;
begin
  -- Validate page status
  select * from public.api_get_page_status(p_page_key) into v_page;
  if v_page.page_id is null then
    return jsonb_build_object('success', false, 'error', 'Invalid page key');
  end if;

  if v_page.is_live is not true then
    return jsonb_build_object('success', false, 'error', 'Page is not active');
  end if;

  -- Check if complete or partial lead already exists
  select id, is_partial from public.leads
  where page_id = v_page.page_id and phone_e164 = p_phone_e164
  limit 1
  into v_existing;

  if found then
    -- Already exists, don't overwrite complete leads with partial
    return jsonb_build_object('success', true, 'lead_id', v_existing.id, 'already_exists', true);
  end if;

  -- Insert partial lead
  insert into public.leads (
    page_id, name, phone_e164, country_code,
    source, keyword, post_id, utm, visitor_id,
    is_partial, consent
  ) values (
    v_page.page_id, p_name, p_phone_e164, coalesce(p_country_code, 'IN'),
    p_source, p_keyword, p_post_id, coalesce(p_utm, '{}'::jsonb), p_visitor_id,
    true, true
  )
  returning id into v_lead_id;

  return jsonb_build_object('success', true, 'lead_id', v_lead_id, 'is_partial', true);
end;
$$;

grant execute on function public.api_submit_partial_lead(text, text, text, text, text, text, text, text, jsonb) to public, anon, authenticated;

-- 4. Helper to record complete leads
create or replace function public.api_submit_lead(
  p_page_key text,
  p_visitor_id text,
  p_name text,
  p_email text,
  p_phone_e164 text,
  p_country_code text default 'IN',
  p_consent boolean default true,
  p_source text default null,
  p_keyword text default null,
  p_post_id text default null,
  p_utm jsonb default '{}'::jsonb,
  p_quiz_score integer default null,
  p_quiz_result text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page record;
  v_lead_id uuid;
  v_existing record;
begin
  -- Validate page status
  select * from public.api_get_page_status(p_page_key) into v_page;
  if v_page.page_id is null then
    return jsonb_build_object('success', false, 'error', 'Invalid page key');
  end if;

  if v_page.is_live is not true then
    return jsonb_build_object('success', false, 'error', 'Page is not active');
  end if;

  -- Check for existing lead for this phone on this page
  select id, is_partial from public.leads
  where page_id = v_page.page_id and phone_e164 = p_phone_e164
  limit 1
  into v_existing;

  if found and v_existing.is_partial is false then
    -- Complete duplicate lead: Log repeat event and return success
    insert into public.events (page_id, visitor_id, lead_id, type, meta)
    values (v_page.page_id, p_visitor_id, v_existing.id, 'repeat', jsonb_build_object('reason', 'duplicate_submission'));

    return jsonb_build_object(
      'success', true,
      'repeat', true,
      'lead_id', v_existing.id,
      'pdf_storage_path', v_page.pdf_storage_path
    );
  elsif found and v_existing.is_partial is true then
    -- Upgrade partial lead to complete
    update public.leads
    set name = p_name,
        email = p_email,
        country_code = coalesce(p_country_code, country_code),
        source = coalesce(p_source, source),
        keyword = coalesce(p_keyword, keyword),
        post_id = coalesce(p_post_id, post_id),
        utm = case when p_utm is not null and p_utm != '{}'::jsonb then p_utm else utm end,
        quiz_score = coalesce(p_quiz_score, quiz_score),
        quiz_result = coalesce(p_quiz_result, quiz_result),
        is_partial = false,
        consent = coalesce(p_consent, true)
    where id = v_existing.id;

    v_lead_id := v_existing.id;
  else
    -- Insert new complete lead
    insert into public.leads (
      page_id, name, email, phone_e164, country_code,
      source, keyword, post_id, utm, quiz_score, quiz_result,
      visitor_id, is_partial, consent
    ) values (
      v_page.page_id, p_name, p_email, p_phone_e164, coalesce(p_country_code, 'IN'),
      p_source, p_keyword, p_post_id, coalesce(p_utm, '{}'::jsonb), p_quiz_score, p_quiz_result,
      p_visitor_id, false, coalesce(p_consent, true)
    )
    returning id into v_lead_id;
  end if;

  -- Record submit event
  insert into public.events (page_id, visitor_id, lead_id, type, meta)
  values (v_page.page_id, p_visitor_id, v_lead_id, 'submit', jsonb_build_object('quiz_score', p_quiz_score));

  return jsonb_build_object(
    'success', true,
    'repeat', false,
    'lead_id', v_lead_id,
    'pdf_storage_path', v_page.pdf_storage_path
  );
end;
$$;

grant execute on function public.api_submit_lead(text, text, text, text, text, text, boolean, text, text, text, jsonb, integer, text) to public, anon, authenticated;
