-- ==============================================================================
-- Migration 05: Security, RBAC Helper Functions, and Row Level Security (RLS)
-- Filename: 20261103000005_create_security_and_rls.sql
-- Description:
--   Configures enterprise-grade security and RLS policies across all tables
--   and the private 'pdfs' storage bucket:
--   1. Helper functions with SECURITY DEFINER and search_path isolation
--   2. RLS enabled on all 6 tables and storage.objects
--   3. Anonymous users cannot read or write anything directly
--   4. Logged-in admin users (owner, editor, viewer) can read everything
--   5. Only owner and editor can insert/update/delete pages and assets
--   6. Viewer role is strictly read-only
--   7. Public writes (leads, events) only permitted via server-side service key
--   8. Storage bucket 'pdfs': upload/update/delete restricted to owner/editor;
--      downloads require signed links (no public read policy)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Private Schema & RBAC Helper Functions
-- Uses a non-exposed 'private' schema and empty search_path so the functions
-- are not exposed via PostgREST RPC endpoints while remaining accessible to RLS policies.
-- ------------------------------------------------------------------------------
create schema if not exists private;

-- Check if current authenticated user is listed in admin_users
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

-- Check if current authenticated user has 'owner' or 'editor' role
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

-- Check if current authenticated user has 'owner' role
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

comment on function private.is_admin() is 'Returns true if calling user is any admin role (owner, editor, or viewer).';
comment on function private.is_editor_or_owner() is 'Returns true if calling user is owner or editor.';
comment on function private.is_owner() is 'Returns true if calling user is owner.';

-- Permissions on helper functions: authenticated can execute; revoked from anon/public
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

revoke all on function private.is_editor_or_owner() from public, anon;
grant execute on function private.is_editor_or_owner() to authenticated;

revoke all on function private.is_owner() from public, anon;
grant execute on function private.is_owner() to authenticated;

-- ------------------------------------------------------------------------------
-- 2. Enable Row Level Security (RLS) on all tables
-- Note: storage.objects already has RLS enabled by default in Supabase.
-- ------------------------------------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.app_settings enable row level security;
alter table public.assets enable row level security;
alter table public.pages enable row level security;
alter table public.leads enable row level security;
alter table public.events enable row level security;

-- ------------------------------------------------------------------------------
-- 3. Table Policies: admin_users
-- - SELECT: Any logged-in admin can read the admin user roster
-- - INSERT/UPDATE/DELETE: Restricted exclusively to owners
-- ------------------------------------------------------------------------------
drop policy if exists "admin_users_select_policy" on public.admin_users;
create policy "admin_users_select_policy"
  on public.admin_users
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "admin_users_insert_policy" on public.admin_users;
create policy "admin_users_insert_policy"
  on public.admin_users
  for insert
  to authenticated
  with check ((select private.is_owner()));

drop policy if exists "admin_users_update_policy" on public.admin_users;
create policy "admin_users_update_policy"
  on public.admin_users
  for update
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

drop policy if exists "admin_users_delete_policy" on public.admin_users;
create policy "admin_users_delete_policy"
  on public.admin_users
  for delete
  to authenticated
  using ((select private.is_owner()));

-- ------------------------------------------------------------------------------
-- 4. Table Policies: app_settings
-- - SELECT: Any logged-in admin can read settings
-- - INSERT/DELETE: Restricted to owners
-- - UPDATE: Allowed for owners and editors
-- ------------------------------------------------------------------------------
drop policy if exists "app_settings_select_policy" on public.app_settings;
create policy "app_settings_select_policy"
  on public.app_settings
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "app_settings_insert_policy" on public.app_settings;
create policy "app_settings_insert_policy"
  on public.app_settings
  for insert
  to authenticated
  with check ((select private.is_owner()));

drop policy if exists "app_settings_update_policy" on public.app_settings;
create policy "app_settings_update_policy"
  on public.app_settings
  for update
  to authenticated
  using ((select private.is_editor_or_owner()))
  with check ((select private.is_editor_or_owner()));

drop policy if exists "app_settings_delete_policy" on public.app_settings;
create policy "app_settings_delete_policy"
  on public.app_settings
  for delete
  to authenticated
  using ((select private.is_owner()));

-- ------------------------------------------------------------------------------
-- 5. Table Policies: assets
-- - SELECT: Any logged-in admin can view assets
-- - INSERT/UPDATE/DELETE: Only owner and editor (viewer is read-only)
-- ------------------------------------------------------------------------------
drop policy if exists "assets_select_policy" on public.assets;
create policy "assets_select_policy"
  on public.assets
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "assets_insert_policy" on public.assets;
create policy "assets_insert_policy"
  on public.assets
  for insert
  to authenticated
  with check ((select private.is_editor_or_owner()));

drop policy if exists "assets_update_policy" on public.assets;
create policy "assets_update_policy"
  on public.assets
  for update
  to authenticated
  using ((select private.is_editor_or_owner()))
  with check ((select private.is_editor_or_owner()));

drop policy if exists "assets_delete_policy" on public.assets;
create policy "assets_delete_policy"
  on public.assets
  for delete
  to authenticated
  using ((select private.is_editor_or_owner()));

-- ------------------------------------------------------------------------------
-- 6. Table Policies: pages
-- - SELECT: Any logged-in admin can view pages
-- - INSERT/UPDATE/DELETE: Only owner and editor (viewer is read-only)
-- ------------------------------------------------------------------------------
drop policy if exists "pages_select_policy" on public.pages;
create policy "pages_select_policy"
  on public.pages
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "pages_insert_policy" on public.pages;
create policy "pages_insert_policy"
  on public.pages
  for insert
  to authenticated
  with check ((select private.is_editor_or_owner()));

drop policy if exists "pages_update_policy" on public.pages;
create policy "pages_update_policy"
  on public.pages
  for update
  to authenticated
  using ((select private.is_editor_or_owner()))
  with check ((select private.is_editor_or_owner()));

drop policy if exists "pages_delete_policy" on public.pages;
create policy "pages_delete_policy"
  on public.pages
  for delete
  to authenticated
  using ((select private.is_editor_or_owner()));

-- ------------------------------------------------------------------------------
-- 7. Table Policies: leads
-- - SELECT: Any logged-in admin can read lead details
-- - INSERT/UPDATE: No client/public insert policy exists! All leads are inserted
--   via backend server endpoints executing with the Supabase service_role key.
-- - DELETE: Only owner can prune or remove test/spam leads.
-- ------------------------------------------------------------------------------
drop policy if exists "leads_select_policy" on public.leads;
create policy "leads_select_policy"
  on public.leads
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "leads_delete_policy" on public.leads;
create policy "leads_delete_policy"
  on public.leads
  for delete
  to authenticated
  using ((select private.is_owner()));

-- ------------------------------------------------------------------------------
-- 8. Table Policies: events
-- - SELECT: Any logged-in admin can read analytics events
-- - INSERT: No client/public insert policy exists. Event ingestion is handled
--   exclusively by server-side endpoints executing with the service_role key.
-- ------------------------------------------------------------------------------
drop policy if exists "events_select_policy" on public.events;
create policy "events_select_policy"
  on public.events
  for select
  to authenticated
  using ((select private.is_admin()));

-- ------------------------------------------------------------------------------
-- 9. Storage Policies: bucket "pdfs" on storage.objects
-- - SELECT: Authenticated admins can view/list files in the bucket
-- - INSERT: Only owner and editor can upload new PDFs
-- - UPDATE: Only owner and editor can replace/upsert existing PDFs
-- - DELETE: Only owner and editor can remove PDFs
-- - Public / Anon: Zero policies granted. No public reads. File downloads must
--   be served via temporary signed URLs generated by the server.
-- ------------------------------------------------------------------------------
drop policy if exists "storage_pdfs_select_policy" on storage.objects;
create policy "storage_pdfs_select_policy"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (select private.is_admin())
  );

drop policy if exists "storage_pdfs_insert_policy" on storage.objects;
create policy "storage_pdfs_insert_policy"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pdfs'
    and (select private.is_editor_or_owner())
  );

drop policy if exists "storage_pdfs_update_policy" on storage.objects;
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

drop policy if exists "storage_pdfs_delete_policy" on storage.objects;
create policy "storage_pdfs_delete_policy"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (select private.is_editor_or_owner())
  );
