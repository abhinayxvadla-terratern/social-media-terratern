-- ==============================================================================
-- Migration 07: Team Management & RBAC Helper Functions
-- Filename: 20261103000007_create_team_rbac_functions.sql
-- Description:
--   Enables owners to view, invite, update, and remove admin team members.
-- ==============================================================================

-- 1. Get all admin team members joined with auth.users
create or replace function public.api_get_team_members()
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only logged-in admins can view the team roster
  if not exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  ) then
    raise exception 'Unauthorized';
  end if;

  return query
  select 
    a.user_id,
    u.email::text,
    a.role,
    a.created_at,
    u.last_sign_in_at
  from public.admin_users a
  join auth.users u on u.id = a.user_id
  order by 
    case when a.role = 'owner' then 1 when a.role = 'editor' then 2 else 3 end,
    a.created_at asc;
end;
$$;

grant execute on function public.api_get_team_members() to authenticated;

-- 2. Update team member role (Owner only)
create or replace function public.api_update_team_role(
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_owner_count int;
begin
  -- Check caller is owner
  select role into v_caller_role from public.admin_users where user_id = (select auth.uid());
  if v_caller_role != 'owner' then
    return jsonb_build_object('success', false, 'error', 'Only owners can update team member roles');
  end if;

  if p_role not in ('owner', 'editor', 'viewer') then
    return jsonb_build_object('success', false, 'error', 'Invalid role');
  end if;

  -- Ensure we don't demote the last remaining owner
  if p_role != 'owner' then
    select count(*) into v_owner_count from public.admin_users where role = 'owner';
    if v_owner_count <= 1 and exists (select 1 from public.admin_users where user_id = p_user_id and role = 'owner') then
      return jsonb_build_object('success', false, 'error', 'Cannot demote the last remaining owner');
    end if;
  end if;

  update public.admin_users
  set role = p_role
  where user_id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.api_update_team_role(uuid, text) to authenticated;

-- 3. Remove team member (Owner only)
create or replace function public.api_remove_team_member(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_owner_count int;
begin
  select role into v_caller_role from public.admin_users where user_id = (select auth.uid());
  if v_caller_role != 'owner' then
    return jsonb_build_object('success', false, 'error', 'Only owners can remove team members');
  end if;

  -- Ensure we don't delete the last owner
  if exists (select 1 from public.admin_users where user_id = p_user_id and role = 'owner') then
    select count(*) into v_owner_count from public.admin_users where role = 'owner';
    if v_owner_count <= 1 then
      return jsonb_build_object('success', false, 'error', 'Cannot remove the last remaining owner');
    end if;
  end if;

  delete from public.admin_users where user_id = p_user_id;
  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.api_remove_team_member(uuid) to authenticated;
