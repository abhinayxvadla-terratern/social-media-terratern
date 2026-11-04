import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseServiceClient,
  validateOriginAndCors,
  checkRateLimit,
  getClientIp,
} from '@/lib/api-security';

export async function OPTIONS(req: NextRequest) {
  const { corsHeaders } = validateOriginAndCors(req);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { page_key, visitor_id, type, meta, _hp, honeypot } = body || {};

  // Honeypot spam trap: if filled, reject silently
  if ((_hp && String(_hp).trim()) || (honeypot && String(honeypot).trim())) {
    return NextResponse.json({ success: true, filtered: true });
  }

  if (!page_key || typeof page_key !== 'string') {
    return NextResponse.json({ error: 'page_key is required.' }, { status: 400 });
  }

  if (!visitor_id || typeof visitor_id !== 'string') {
    return NextResponse.json({ error: 'visitor_id is required.' }, { status: 400 });
  }

  const validTypes = ['view', 'start', 'answer', 'download', 'submit'];
  if (!type || !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid event type. Must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    );
  }

  // Rate limit: 60 events per minute per IP + visitor
  const rateKey = `event:${ip}:${visitor_id}`;
  const rate = checkRateLimit(rateKey, 60, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  const supabase = getSupabaseServiceClient();

  // Retrieve page to check allowed_origins and status
  const { data: pageRows, error: pageErr } = await supabase.rpc('api_get_page_status', {
    p_page_key: page_key.trim(),
  });

  if (pageErr || !pageRows || pageRows.length === 0) {
    return NextResponse.json({ error: 'Unknown or invalid page key.' }, { status: 404 });
  }

  const page = pageRows[0];
  const { isAllowed, corsHeaders } = validateOriginAndCors(req, page.allowed_origins);

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Origin not allowed for this page.' },
      { status: 403, headers: corsHeaders }
    );
  }

  if (!page.is_live) {
    return NextResponse.json(
      {
        error: 'Page is not active.',
        closed_message: page.closed_message,
        closed_redirect_url: page.closed_redirect_url,
      },
      { status: 403, headers: corsHeaders }
    );
  }

  // Record the event
  const { data: res, error: eventErr } = await supabase.rpc('api_record_event', {
    p_page_key: page_key.trim(),
    p_visitor_id: visitor_id.trim(),
    p_type: type,
    p_meta: meta || {},
  });

  if (eventErr || (res && !res.success)) {
    return NextResponse.json(
      { error: res?.error || 'Failed to record event.' },
      { status: 400, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    { success: true, event_id: res.event_id },
    { headers: corsHeaders }
  );
}
