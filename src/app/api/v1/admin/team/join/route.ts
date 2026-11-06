import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/api-security';

// GET /api/v1/admin/team/join?token=... - Validate invite link
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token')?.trim();

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Invite token is required.' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: invite, error } = await supabase
    .from('team_invites')
    .select('id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !invite) {
    return NextResponse.json(
      { valid: false, error: 'This invitation link is invalid or does not exist.' },
      { status: 404 }
    );
  }

  if (invite.accepted_at) {
    return NextResponse.json(
      { valid: false, error: 'This invitation link has already been used. Please log in with your password.' },
      { status: 400 }
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { valid: false, error: 'This invitation link has expired. Please ask your administrator to send a new invite.' },
      { status: 410 }
    );
  }

  return NextResponse.json({
    valid: true,
    email: invite.email,
    role: invite.role,
  });
}

// POST /api/v1/admin/team/join - Team member sets password & activates account
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { token, password } = body || {};

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invite token is required.' }, { status: 400 });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters in length.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();

  // 1. Verify invite
  const { data: invite, error: fetchErr } = await supabase
    .from('team_invites')
    .select('id, email, role, expires_at, accepted_at')
    .eq('token', token.trim())
    .maybeSingle();

  if (fetchErr || !invite) {
    return NextResponse.json(
      { error: 'Invalid invitation link.' },
      { status: 404 }
    );
  }

  if (invite.accepted_at) {
    return NextResponse.json(
      { error: 'This invitation link has already been used. Please sign in directly.' },
      { status: 400 }
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This invitation link has expired. Please ask an administrator for a new invite.' },
      { status: 410 }
    );
  }

  const cleanEmail = invite.email.toLowerCase().trim();

  // 2. Check if user already exists in Supabase Auth
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUser = (userList?.users || []).find(
    (u) => u.email?.toLowerCase() === cleanEmail
  );

  let userId: string;

  if (existingUser) {
    // Update existing user password & confirm email
    const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: password,
        email_confirm: true,
      }
    );

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message || 'Failed to update user credentials.' },
        { status: 500 }
      );
    }
    userId = updated.user.id;
  } else {
    // Create new user in Supabase Auth
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
    });

    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message || 'Failed to create user account.' },
        { status: 500 }
      );
    }
    userId = created.user.id;
  }

  // 3. Register in admin_users with the invited role
  const { error: rbacErr } = await supabase
    .from('admin_users')
    .upsert(
      {
        user_id: userId,
        role: invite.role,
      },
      { onConflict: 'user_id' }
    );

  if (rbacErr) {
    return NextResponse.json(
      { error: 'Failed to assign administrator role: ' + rbacErr.message },
      { status: 500 }
    );
  }

  // 4. Mark invite as accepted
  await supabase
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  return NextResponse.json({
    success: true,
    message: 'Account activated successfully! You can now sign in.',
    email: cleanEmail,
  });
}
