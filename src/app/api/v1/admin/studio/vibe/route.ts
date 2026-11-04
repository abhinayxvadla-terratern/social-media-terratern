import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { vibeCodePage } from '@/lib/vibe-engine';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    // Check admin roster
    const { data: adminRecord } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!adminRecord || (adminRecord.role !== 'owner' && adminRecord.role !== 'editor')) {
      return NextResponse.json(
        { error: 'Forbidden: You need owner or editor permissions to vibe-code pages' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { prompt, currentConfig, history } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt string is required' }, { status: 400 });
    }

    const result = await vibeCodePage(prompt, currentConfig, history);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Vibe API Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error in Vibe Studio engine' },
      { status: 500 }
    );
  }
}
