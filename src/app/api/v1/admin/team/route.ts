import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { AdminRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Helper to check caller is owner
async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Unauthorized: Not logged in', status: 401 };
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!adminUser || adminUser.role !== 'owner') {
    return { authorized: false, error: 'Forbidden: Owner role required', status: 403 };
  }

  return { authorized: true, callerId: user.id };
}

// GET /api/v1/admin/team - List team members and pending invites
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin users can list team members
  const { data: members, error } = await supabase.rpc('api_get_team_members');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also retrieve active pending invitations using authenticated client
  const { data: invites } = await supabase
    .from('team_invites')
    .select('*')
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const origin = req.headers.get('origin') || `${protocol}://${host}`;

  const formattedInvites = (invites || []).map((inv: any) => ({
    ...inv,
    invite_link: `${origin}/admin/join?token=${inv.token}&email=${encodeURIComponent(inv.email)}`,
  }));

  return NextResponse.json(
    {
      success: true,
      members: members || [],
      invites: formattedInvites,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

// POST /api/v1/admin/team - Generate Invite Link for new team member (Owner only, zero passcode required)
export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, role = 'editor' } = body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
  }

  const validRoles: AdminRole[] = ['owner', 'editor', 'viewer'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
  }

  const supabase = await createClient();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Generate unique secure invite token
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days validity

  // 2. Invalidate any existing pending invites for this email
  await supabase
    .from('team_invites')
    .delete()
    .eq('email', cleanEmail)
    .is('accepted_at', null);

  // 3. Insert new invite record
  const { data: newInvite, error: insertErr } = await supabase
    .from('team_invites')
    .insert({
      email: cleanEmail,
      role,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: 'Failed to create invite record: ' + insertErr.message }, { status: 500 });
  }

  // 4. Build absolute invite link with email prefilled
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const origin = req.headers.get('origin') || `${protocol}://${host}`;
  const inviteLink = `${origin}/admin/join?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

  return NextResponse.json({
    success: true,
    message: `Invite link created for ${cleanEmail}!`,
    invite_link: inviteLink,
    email: cleanEmail,
    role,
    token,
    expires_at: expiresAt,
  });
}

// PATCH /api/v1/admin/team - Update role (Owner only)
export async function PATCH(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { user_id, role } = body || {};
  if (!user_id || !role) {
    return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 });
  }

  const validRoles: AdminRole[] = ['owner', 'editor', 'viewer'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
  }

  const supabase = await createClient();

  // If demoting an owner, verify there is at least one other owner
  if (role !== 'owner') {
    const { count } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'owner');

    if ((count || 0) <= 1) {
      const { data: target } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user_id)
        .maybeSingle();

      if (target?.role === 'owner') {
        return NextResponse.json(
          { error: 'Cannot demote the last remaining owner account' },
          { status: 400 }
        );
      }
    }
  }

  const { error: updateErr } = await supabase
    .from('admin_users')
    .update({ role })
    .eq('user_id', user_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `Role updated to ${role}` });
}

// DELETE /api/v1/admin/team - Remove member (Owner only)
export async function DELETE(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id')?.trim();
  const inviteId = searchParams.get('invite_id')?.trim();

  const supabase = await createClient();

  // If revoking a pending invite
  if (inviteId) {
    const { error: inviteDelErr } = await supabase
      .from('team_invites')
      .delete()
      .eq('id', inviteId);

    if (inviteDelErr) {
      return NextResponse.json({ error: inviteDelErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Invitation link revoked.' });
  }

  if (!userId) {
    return NextResponse.json({ error: 'user_id or invite_id parameter is required' }, { status: 400 });
  }

  // Verify not deleting last owner
  const { count } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'owner');

  if ((count || 0) <= 1) {
    const { data: target } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (target?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the last remaining owner account' },
        { status: 400 }
      );
    }
  }

  const { error: delErr } = await supabase
    .from('admin_users')
    .delete()
    .eq('user_id', userId);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Team member access revoked' });
}
