import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/api-security';
import { AdminRole } from '@/lib/types';

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

// GET /api/v1/admin/team - List team members
export async function GET() {
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

  return NextResponse.json({ success: true, members: members || [] });
}

// POST /api/v1/admin/team - Invite / Add team member (Owner only)
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

  const { email, role = 'editor', password } = body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const validRoles: AdminRole[] = ['owner', 'editor', 'viewer'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
  }

  const serviceClient = getSupabaseServiceClient();

  // 1. Check if user already exists in auth.users
  const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
  let targetUser = (existingUsers?.users || []).find(
    (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
  );

  // 2. If user doesn't exist, create them
  if (!targetUser) {
    const tempPassword = password || `TT_${Math.random().toString(36).slice(2, 10)}!2026`;
    const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
    });

    if (createErr || !newUser.user) {
      return NextResponse.json(
        { error: createErr?.message || 'Failed to create user account' },
        { status: 500 }
      );
    }
    targetUser = newUser.user;
  }

  // 3. Insert or update in admin_users
  const { error: rbacErr } = await serviceClient
    .from('admin_users')
    .upsert({ user_id: targetUser.id, role }, { onConflict: 'user_id' });

  if (rbacErr) {
    return NextResponse.json({ error: rbacErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Team member ${email} assigned as ${role}`,
    user: { id: targetUser.id, email: targetUser.email, role },
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

  const serviceClient = getSupabaseServiceClient();

  // If demoting an owner, verify there is at least one other owner
  if (role !== 'owner') {
    const { count } = await serviceClient
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'owner');

    if ((count || 0) <= 1) {
      const { data: target } = await serviceClient
        .from('admin_users')
        .select('role')
        .eq('user_id', user_id)
        .single();

      if (target?.role === 'owner') {
        return NextResponse.json(
          { error: 'Cannot demote the last remaining owner account' },
          { status: 400 }
        );
      }
    }
  }

  const { error: updateErr } = await serviceClient
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

  if (!userId) {
    return NextResponse.json({ error: 'user_id parameter is required' }, { status: 400 });
  }

  const serviceClient = getSupabaseServiceClient();

  // Verify not deleting last owner
  const { count } = await serviceClient
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'owner');

  if ((count || 0) <= 1) {
    const { data: target } = await serviceClient
      .from('admin_users')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (target?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the last remaining owner account' },
        { status: 400 }
      );
    }
  }

  const { error: delErr } = await serviceClient
    .from('admin_users')
    .delete()
    .eq('user_id', userId);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Team member access revoked' });
}
