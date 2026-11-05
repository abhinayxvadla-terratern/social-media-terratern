import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient, validateOriginAndCors } from '@/lib/api-security';

export async function OPTIONS(req: NextRequest) {
  const { corsHeaders } = validateOriginAndCors(req);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageKey = searchParams.get('key')?.trim();
  const slug = searchParams.get('slug')?.trim();

  if (!pageKey && !slug) {
    return NextResponse.json(
      { error: 'Page key (?key=...) or slug (?slug=...) is required.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();

  // Find page by key or slug
  let query = supabase
    .from('pages')
    .select(`
      id, name, slug, page_type, status, start_at, end_at,
      closed_message, closed_redirect_url, allowed_origins,
      pdf_asset_id, page_key, config,
      pdf_asset:assets (id, name, storage_path)
    `);

  if (pageKey) {
    query = query.eq('page_key', pageKey);
  } else if (slug) {
    query = query.eq('slug', slug);
  }

  const { data: pageRows, error: pageErr } = await query;

  if (pageErr || !pageRows || pageRows.length === 0) {
    return NextResponse.json(
      { error: 'Page not found.' },
      { status: 404 }
    );
  }

  const page = pageRows[0];

  // Check master kill switch
  const { data: settingData } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'master_kill_switch')
    .single();

  const killSwitchVal = settingData?.value;
  const isKillSwitch =
    killSwitchVal === true ||
    killSwitchVal?.master_kill_switch === true ||
    killSwitchVal === 'true';

  let isLive = false;
  if (!isKillSwitch) {
    if (page.status === 'live') {
      isLive = true;
    } else if (page.status === 'scheduled') {
      const now = new Date();
      const startOk = !page.start_at || new Date(page.start_at) <= now;
      const endOk = !page.end_at || new Date(page.end_at) >= now;
      isLive = startOk && endOk;
    }
  }

  const { isAllowed, corsHeaders } = validateOriginAndCors(req, page.allowed_origins);

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Unauthorized domain origin.' },
      { status: 403, headers: corsHeaders }
    );
  }

  const rawAsset = page.pdf_asset ?? (page as any).assets;
  const asset: any = Array.isArray(rawAsset) ? rawAsset[0] : rawAsset;

  return NextResponse.json(
    {
      live: isLive,
      status: page.status,
      name: page.name,
      slug: page.slug,
      page_key: page.page_key,
      page_type: page.page_type,
      closed_message: page.closed_message,
      closed_redirect_url: page.closed_redirect_url,
      has_pdf: Boolean(page.pdf_asset_id),
      pdf_name: asset?.name || null,
      config: page.config || {},
    },
    { headers: corsHeaders }
  );
}
