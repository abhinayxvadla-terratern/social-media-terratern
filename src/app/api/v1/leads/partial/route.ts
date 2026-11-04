import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseServiceClient,
  validateOriginAndCors,
  checkRateLimit,
  getClientIp,
} from '@/lib/api-security';
import { validatePhone, validateName } from '@/lib/validation';

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

  const {
    page_key,
    visitor_id,
    name,
    phone,
    country_code = 'IN',
    source,
    keyword,
    post_id,
    utm,
    _hp,
    honeypot,
  } = body || {};

  // Honeypot check
  if ((_hp && String(_hp).trim()) || (honeypot && String(honeypot).trim())) {
    return NextResponse.json({ success: true, filtered: true });
  }

  if (!page_key || typeof page_key !== 'string') {
    return NextResponse.json({ error: 'page_key is required.' }, { status: 400 });
  }

  if (!visitor_id || typeof visitor_id !== 'string') {
    return NextResponse.json({ error: 'visitor_id is required.' }, { status: 400 });
  }

  // Validate phone
  const phoneRes = validatePhone(phone, country_code);
  if (!phoneRes.valid) {
    return NextResponse.json({ error: phoneRes.error }, { status: 422 });
  }

  // Clean name if provided
  let cleanedName = 'Visitor';
  if (name) {
    const nameRes = validateName(name);
    if (nameRes.valid && nameRes.cleanedName) {
      cleanedName = nameRes.cleanedName;
    }
  }

  // Rate limit
  const rateKey = `partial:${ip}:${visitor_id}`;
  const rate = checkRateLimit(rateKey, 20, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const supabase = getSupabaseServiceClient();

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

  const { data: res, error: partialErr } = await supabase.rpc('api_submit_partial_lead', {
    p_page_key: page_key.trim(),
    p_visitor_id: visitor_id.trim(),
    p_name: cleanedName,
    p_phone_e164: phoneRes.e164,
    p_country_code: country_code,
    p_source: source ? String(source).trim() : null,
    p_keyword: keyword ? String(keyword).trim() : null,
    p_post_id: post_id ? String(post_id).trim() : null,
    p_utm: utm && typeof utm === 'object' ? utm : {},
  });

  if (partialErr || (res && !res.success)) {
    return NextResponse.json(
      { error: res?.error || 'Failed to record partial lead.' },
      { status: 400, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      success: true,
      lead_id: res.lead_id,
      is_partial: true,
      already_exists: Boolean(res.already_exists),
    },
    { headers: corsHeaders }
  );
}
