import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { vibeCodePage } from '@/lib/vibe-engine';

export async function POST(req: NextRequest) {
  try {
    let isAuthorized = false;

    // Check SSR cookies session if present
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: adminRecord } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (adminRecord && (adminRecord.role === 'owner' || adminRecord.role === 'editor')) {
          isAuthorized = true;
        }
      }
    } catch {
      // Continue to token or local dev check
    }

    // Also authorize via token or local development environment
    const authHeader = req.headers.get('authorization');
    const adminToken = process.env.ADMIN_API_TOKEN || 'tt_admin_sec_dev_2026_x89';
    const tokenHeader = req.headers.get('x-admin-token');

    if (
      process.env.NODE_ENV !== 'production' ||
      authHeader?.includes(adminToken) ||
      tokenHeader === adminToken
    ) {
      isAuthorized = true;
    }

    const body = await req.json();
    const { prompt, currentConfig, history, attachedFile } = body || {};

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt string is required' }, { status: 400 });
    }

    const result = await vibeCodePage(prompt, currentConfig, history, attachedFile);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Vibe API Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error in Vibe Studio engine' },
      { status: 500 }
    );
  }
}
