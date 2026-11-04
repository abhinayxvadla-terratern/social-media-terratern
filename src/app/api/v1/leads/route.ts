import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseServiceClient,
  validateOriginAndCors,
  checkRateLimit,
  getClientIp,
  createDownloadToken,
} from '@/lib/api-security';
import { validateLead } from '@/lib/validation';

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
    email,
    phone,
    country_code = 'IN',
    consent,
    source,
    keyword,
    post_id,
    utm,
    quiz_score,
    quiz_result,
    _hp,
    honeypot,
  } = body || {};

  // Rate limiting: 10 lead submits per minute per IP + visitor
  const rateKey = `lead:${ip}:${visitor_id || 'anon'}`;
  const rate = checkRateLimit(rateKey, 10, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a moment.' },
      { status: 429 }
    );
  }

  if (!page_key || typeof page_key !== 'string') {
    return NextResponse.json({ error: 'page_key is required.' }, { status: 400 });
  }

  if (!visitor_id || typeof visitor_id !== 'string') {
    return NextResponse.json({ error: 'visitor_id is required.' }, { status: 400 });
  }

  // Universal Validation (Name, Email with MX/disposable check, Phone with libphonenumber-js, Consent, Honeypot)
  const validation = await validateLead(
    {
      name,
      email,
      phone,
      country_code,
      consent,
      honeypot: _hp || honeypot,
    },
    { checkMx: true }
  );

  if (!validation.valid) {
    return NextResponse.json(
      {
        error: 'Validation failed.',
        errors: validation.errors,
        suggestions: validation.suggestions,
      },
      { status: 422 }
    );
  }

  const supabase = getSupabaseServiceClient();

  // Retrieve page status & allowed origins
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

  const cleaned = validation.cleaned!;

  // Submit complete lead via database function
  const { data: res, error: submitErr } = await supabase.rpc('api_submit_lead', {
    p_page_key: page_key.trim(),
    p_visitor_id: visitor_id.trim(),
    p_name: cleaned.name,
    p_email: cleaned.email,
    p_phone_e164: cleaned.phone_e164,
    p_country_code: cleaned.country_code,
    p_consent: true,
    p_source: source ? String(source).trim() : null,
    p_keyword: keyword ? String(keyword).trim() : null,
    p_post_id: post_id ? String(post_id).trim() : null,
    p_utm: utm && typeof utm === 'object' ? utm : {},
    p_quiz_score: typeof quiz_score === 'number' ? quiz_score : null,
    p_quiz_result: quiz_result ? String(quiz_result).trim() : null,
  });

  if (submitErr || (res && !res.success)) {
    return NextResponse.json(
      { error: res?.error || 'Failed to record lead.' },
      { status: 400, headers: corsHeaders }
    );
  }

  let downloadUrl: string | null = null;
  let downloadToken: string | null = null;

  // If page has an attached PDF, generate 10-minute signed URL & token
  if (page.pdf_storage_path) {
    downloadToken = createDownloadToken({
      page_key: page_key.trim(),
      lead_id: res.lead_id,
      storage_path: page.pdf_storage_path,
    });

    const { data: signData } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(page.pdf_storage_path, 600); // 10 minutes (600s)

    downloadUrl = signData?.signedUrl || null;
  }

  return NextResponse.json(
    {
      success: true,
      lead_id: res.lead_id,
      repeat: Boolean(res.repeat),
      message: res.repeat ? 'Lead already registered.' : 'Lead submitted successfully.',
      download_url: downloadUrl,
      download_token: downloadToken,
    },
    { headers: corsHeaders }
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers.get('x-admin-token');
  const expectedToken = process.env.ADMIN_API_TOKEN || 'tt_admin_sec_dev_2026_x89';

  if (!token || token !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide valid Bearer token or X-Admin-Token header.' },
      { status: 401 }
    );
  }

  const supabase = getSupabaseServiceClient();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);
  const pageId = searchParams.get('page_id');
  const source = searchParams.get('source');
  const keyword = searchParams.get('keyword');
  const isPartial = searchParams.get('is_partial');

  let query = supabase
    .from('leads')
    .select('*, page:pages(id, name, slug)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (pageId) query = query.eq('page_id', pageId);
  if (source) query = query.eq('source', source);
  if (keyword) query = query.eq('keyword', keyword);
  if (isPartial !== null && isPartial !== undefined && isPartial !== '') {
    query = query.eq('is_partial', isPartial === 'true');
  }

  const { data: leads, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    count: leads?.length || 0,
    leads: leads || [],
  });
}
