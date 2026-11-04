import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/api-security';
import { generateUniqueSlug, generatePageKey } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      config,
      customSlug,
      customKeyword,
      pdfAssetId,
      status = 'live',
    } = body || {};

    if (!config || !config.name) {
      return NextResponse.json(
        { error: 'Page configuration with "name" is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Determine origin base URL
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol =
      req.headers.get('x-forwarded-proto') ||
      (host.includes('localhost') ? 'http' : 'https');
    const origin = req.headers.get('origin') || `${protocol}://${host}`;

    let savedPage: any = null;

    if (id) {
      // Update existing page
      const updateData: any = {
        name: config.name,
        page_type: config.page_type || 'calculator',
        status: status,
        keyword: customKeyword || config.keyword_suggestion || null,
        pdf_asset_id: pdfAssetId || null,
        config: config,
        updated_at: new Date().toISOString(),
      };

      if (customSlug) {
        updateData.slug = customSlug;
      }

      const { data: updated, error: updateErr } = await supabase
        .from('pages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        console.error('Failed to update page in publish route:', updateErr);
        throw updateErr;
      }
      savedPage = updated;
    } else {
      // Fetch existing slugs to guarantee uniqueness for new page
      const { data: existingPages } = await supabase
        .from('pages')
        .select('slug');

      const existingSlugs = (existingPages || []).map((p: any) => p.slug);
      const slug = generateUniqueSlug(
        customSlug || config.slug_suggestion || config.name,
        existingSlugs
      );
      const page_key = generatePageKey();

      const { data: inserted, error: insertError } = await supabase
        .from('pages')
        .insert({
          name: config.name,
          slug,
          page_key,
          page_type: config.page_type || 'calculator',
          status: status, // 'live' or 'draft'
          keyword: customKeyword || config.keyword_suggestion || null,
          pdf_asset_id: pdfAssetId || null,
          allowed_origins: [origin],
          closed_message:
            'This assessment is temporarily paused for updates. Please contact our team.',
          closed_redirect_url: 'https://terratern.com',
          config: config,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert page in publish route:', insertError);
        throw insertError;
      }
      savedPage = inserted;
    }

    const live_url = `${origin}/p/${savedPage.slug}`;
    const embed_script = `<script src="${origin}/connect.js" data-page-key="${savedPage.page_key}" async></script>`;
    const social_tracked_url = `${live_url}?src=ig_dm&kw=${encodeURIComponent(
      savedPage.keyword || 'GENERAL'
    )}&post_id=reel_101`;

    return NextResponse.json({
      success: true,
      message:
        status === 'live'
          ? 'Page published live successfully!'
          : 'Page saved as draft successfully!',
      page: savedPage,
      live_url,
      embed_script,
      social_tracked_url,
    });
  } catch (err: any) {
    console.error('Page publish API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save or publish page' },
      { status: 500 }
    );
  }
}
