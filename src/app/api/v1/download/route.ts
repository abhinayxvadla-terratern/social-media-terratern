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
  const format = searchParams.get('format'); // if 'json', returns JSON instead of redirect

  if (!token) {
    return NextResponse.json(
      { error: 'Download token (?token=...) is required.' },
      { status: 400 }
    );
  }

  const verified = verifyDownloadToken(token);
  if (!verified.valid || !verified.payload) {
    return NextResponse.json(
      { error: 'This download link is invalid or has expired (links expire after 10 minutes).' },
      { status: 403 }
    );
  }

  const { page_key, lead_id, storage_path } = verified.payload;
  const supabase = getSupabaseServiceClient();

  // Create fresh signed URL from Supabase Storage
  const { data: signData, error: signErr } = await supabase.storage
    .from('pdfs')
    .createSignedUrl(storage_path, 600); // 10 minutes

  if (signErr || !signData?.signedUrl) {
    return NextResponse.json(
      { error: 'Unable to generate download file link.' },
      { status: 500 }
    );
  }

  // Record download event
  try {
    await supabase.rpc('api_record_event', {
      p_page_key: page_key,
      p_visitor_id: lead_id,
      p_type: 'download',
      p_meta: { storage_path },
      p_lead_id: lead_id,
    });
  } catch {
    // Non-blocking event logging
  }

  if (format === 'json') {
    return NextResponse.json({ download_url: signData.signedUrl });
  }

  // Redirect visitor directly to signed Supabase PDF storage URL
  return NextResponse.redirect(signData.signedUrl, 302);
}
