import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseServiceClient,
  verifyDownloadToken,
  validateOriginAndCors,
} from '@/lib/api-security';

export async function OPTIONS(req: NextRequest) {
  const { corsHeaders } = validateOriginAndCors(req);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token')?.trim();
  const slug = searchParams.get('slug')?.trim();
  const pageKey = (searchParams.get('key') || searchParams.get('page_key'))?.trim();
  const assetId = searchParams.get('asset_id')?.trim();

  const supabase = getSupabaseServiceClient();

  let storagePath: string | null = null;
  let fileName = 'TerraTern-Report';
  let pageId: string | null = null;
  let visitorId: string | null = null;

  // 1. Resolve storage path via token if present
  if (token) {
    const verified = verifyDownloadToken(token);
    if (verified.valid && verified.payload) {
      storagePath = verified.payload.storage_path;
      visitorId = verified.payload.lead_id || null;
      if (verified.payload.page_key) {
        const { data: pData } = await supabase
          .from('pages')
          .select('id, name')
          .eq('page_key', verified.payload.page_key)
          .maybeSingle();
        if (pData) {
          pageId = pData.id;
          fileName = pData.name || fileName;
        }
      }
    }
  }

  // 2. Resolve via slug or pageKey if not resolved via token
  if (!storagePath && (slug || pageKey)) {
    let query = supabase
      .from('pages')
      .select('id, name, slug, page_key, pdf_asset_id, pdf_asset:assets (id, name, storage_path)');
    if (slug) query = query.eq('slug', slug);
    else if (pageKey) query = query.eq('page_key', pageKey);

    const { data: pageRows } = await query;
    if (pageRows && pageRows.length > 0) {
      const page = pageRows[0];
      pageId = page.id;
      const rawAsset = page.pdf_asset ?? (page as any).assets;
      const asset: any = Array.isArray(rawAsset) ? rawAsset[0] : rawAsset;
      if (asset?.storage_path) {
        storagePath = asset.storage_path;
        fileName = asset.name || page.name || 'TerraTern-Report';
      }
    }
  }

  // 3. Resolve via direct assetId
  if (!storagePath && assetId) {
    const { data: assetData } = await supabase
      .from('assets')
      .select('id, name, storage_path')
      .eq('id', assetId)
      .maybeSingle();
    if (assetData?.storage_path) {
      storagePath = assetData.storage_path;
      fileName = assetData.name || 'TerraTern-Report';
    }
  }

  if (!storagePath) {
    return NextResponse.json(
      { error: 'No attached document found for this page.' },
      { status: 404 }
    );
  }

  // Generate signed URL on server side
  const { data: signData, error: signErr } = await supabase.storage
    .from('pdfs')
    .createSignedUrl(storagePath, 300);

  if (signErr || !signData?.signedUrl) {
    return NextResponse.json(
      { error: 'Unable to access attached file from storage.' },
      { status: 500 }
    );
  }

  // Log download event non-blockingly
  try {
    if (pageId) {
      await supabase.from('events').insert({
        page_id: pageId,
        visitor_id: visitorId || 'anonymous_download',
        type: 'download',
        meta: { storage_path: storagePath, file_name: fileName },
      });
    }
  } catch (e) {
    console.warn('[Download API] Event track failed:', e);
  }

  // Fetch file bytes on server and stream directly to client as attachment (prevents browser ERR_BLOCKED_BY_CLIENT)
  try {
    const upstreamRes = await fetch(signData.signedUrl);
    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: 'Failed to retrieve document binary from storage.' },
        { status: 502 }
      );
    }

    const fileBuffer = await upstreamRes.arrayBuffer();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_\-\. ]/g, '').trim().replace(/\s+/g, '_') || 'TerraTern-Report';
    const finalFileName = cleanFileName.toLowerCase().endsWith('.pdf') ? cleanFileName : `${cleanFileName}.pdf`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${finalFileName}"`,
        'Content-Length': String(fileBuffer.byteLength),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err: any) {
    console.error('[Download API] Server streaming error:', err);
    return NextResponse.json({ error: 'Failed to stream document file.' }, { status: 500 });
  }
}
