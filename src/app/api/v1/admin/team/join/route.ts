import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

// GET /api/v1/admin/team/join?token=... - Validate invite link
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token')?.trim();

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Invite token is required.' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase.rpc('api_verify_team_invite', { p_token: token });

  if (error || !data) {
    return NextResponse.json(
      { valid: false, error: error?.message || 'Failed to verify invitation link.' },
      { status: 500 }
    );
  }

  if (!data.valid) {
    return NextResponse.json(
      { valid: false, error: data.error || 'This invitation link is invalid or has expired.' },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
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

  const { data, error } = await supabase.rpc('api_accept_team_invite', {
    p_token: token.trim(),
    p_password: password,
  });

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Failed to activate team member account.' },
      { status: 500 }
    );
  }

  if (!data.success) {
    return NextResponse.json(
      { error: data.error || 'Failed to activate team member account.' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: data.message || 'Account activated successfully! You can now sign in.',
    email: data.email,
    role: data.role,
  });
}
