import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/api-security';
import { generateUniqueSlug, generatePageKey } from '@/lib/utils';
import { PageType } from '@/lib/types';

export async function POST(req: NextRequest) {
  // Verify ADMIN_API_TOKEN
  const adminToken = process.env.ADMIN_API_TOKEN || 'tt_admin_sec_dev_2026_x89';
  const authHeader = req.headers.get('authorization');
  const customHeader = req.headers.get('x-admin-token');

  const tokenProvided =
    authHeader?.replace(/^Bearer\s+/i, '').trim() || customHeader?.trim();

  if (!tokenProvided || tokenProvided !== adminToken) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing ADMIN_API_TOKEN.' },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { name, page_type = 'quiz', keyword = '', page_url = '' } = body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Page "name" is required.' }, { status: 400 });
  }

  const validTypes: PageType[] = ['quiz', 'lead_pdf', 'welcome', 'other'];
  const finalType = validTypes.includes(page_type) ? page_type : 'quiz';

  const supabase = getSupabaseServiceClient();

  // Fetch existing slugs to ensure uniqueness
  const { data: existingPages, error: fetchErr } = await supabase
    .from('pages')
    .select('slug');

  if (fetchErr) {
    return NextResponse.json(
      { error: 'Database error fetching existing slugs.' },
      { status: 500 }
    );
  }

  const existingSlugs = (existingPages || []).map((p: any) => p.slug);
  const slug = generateUniqueSlug(name.trim(), existingSlugs);
  const page_key = generatePageKey();

  // Extract base origin from page_url if provided
  const allowed_origins: string[] = [];
  if (page_url && typeof page_url === 'string') {
    try {
      const parsed = new URL(page_url);
      allowed_origins.push(parsed.origin);
    } catch {
      allowed_origins.push(page_url);
    }
  }

  // Insert the new page in draft status
  const { data: newPage, error: insertErr } = await supabase
    .from('pages')
    .insert({
      name: name.trim(),
      slug,
      page_key,
      page_type: finalType,
      status: 'draft',
      keyword: keyword ? String(keyword).trim() : null,
      page_url: page_url ? String(page_url).trim() : null,
      allowed_origins,
      closed_message: 'This page is currently closed.',
    })
    .select()
    .single();

  if (insertErr || !newPage) {
    return NextResponse.json(
      { error: insertErr?.message || 'Failed to create page.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Page registered successfully.',
      page: {
        id: newPage.id,
        name: newPage.name,
        slug: newPage.slug,
        page_key: newPage.page_key,
        page_type: newPage.page_type,
        status: newPage.status,
        allowed_origins: newPage.allowed_origins,
        created_at: newPage.created_at,
      },
      connect_snippet: `<!-- TerraTern Lead Page Snippet -->\n<script src="${req.nextUrl.origin}/connect.js" data-page-key="${newPage.page_key}" data-slug="${newPage.slug}" async></script>\n<div id="terrateern-lead-engine" data-slug="${newPage.slug}"></div>`,
    },
    { status: 201 }
  );
}
