-- ==============================================================================
-- Migration: Create Team Invite Activation & Verification RPCs
-- Filename: supabase/migrations/20261106000008_create_team_invite_activation_rpc.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  token text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_invites' AND policyname = 'team_invites_admin_policy'
  ) THEN
    CREATE POLICY "team_invites_admin_policy"
    ON public.team_invites
    FOR ALL
    TO authenticated
    USING (private.is_editor_or_owner())
    WITH CHECK (private.is_editor_or_owner());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_invites' AND policyname = 'team_invites_anon_read'
  ) THEN
    CREATE POLICY "team_invites_anon_read"
    ON public.team_invites
    FOR SELECT
    TO anon
    USING (expires_at > now() AND accepted_at IS NULL);
  END IF;
END $$;

-- Verify Invite Function
CREATE OR REPLACE FUNCTION public.api_verify_team_invite(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite record;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invitation token is required.');
  END IF;

  SELECT id, email, role, expires_at, accepted_at
  INTO v_invite
  FROM public.team_invites
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invitation link is invalid or does not exist.');
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invitation link has already been used. Please log in with your password.');
  END IF;

  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invitation link has expired. Please ask your administrator for a new invite.');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'email', v_invite.email,
    'role', v_invite.role,
    'expires_at', v_invite.expires_at
  );
END;
$$;

-- Accept Invite & Set Password Function
CREATE OR REPLACE FUNCTION public.api_accept_team_invite(
  p_token text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
  v_clean_email text;
  v_existing_id uuid;
BEGIN
  -- 1. Validate inputs
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation token is required.');
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters in length.');
  END IF;

  -- 2. Fetch the invitation
  SELECT id, email, role, expires_at, accepted_at
  INTO v_invite
  FROM public.team_invites
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation link is invalid or does not exist.');
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation link has already been used. Please log in with your password.');
  END IF;

  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation link has expired. Please ask your administrator to send a new invite.');
  END IF;

  v_clean_email := lower(trim(v_invite.email));

  -- 3. Check if user already exists in auth.users
  SELECT id INTO v_existing_id
  FROM auth.users
  WHERE lower(email) = v_clean_email;

  IF v_existing_id IS NOT NULL THEN
    -- Update password and ensure email is confirmed
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_existing_id;

    v_user_id := v_existing_id;
  ELSE
    -- Generate new user id
    v_user_id := gen_random_uuid();

    -- Insert new user into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_clean_email,
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"email_verified":true}'::jsonb,
      now(),
      now()
    );

    -- Insert email identity into auth.identities
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  -- 4. Register / Update role in public.admin_users
  INSERT INTO public.admin_users (user_id, role, created_at)
  VALUES (v_user_id, v_invite.role, now())
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;

  -- 5. Mark invite as accepted
  UPDATE public.team_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account activated successfully!',
    'email', v_clean_email,
    'role', v_invite.role,
    'user_id', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.api_verify_team_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_accept_team_invite(text, text) TO anon, authenticated;
