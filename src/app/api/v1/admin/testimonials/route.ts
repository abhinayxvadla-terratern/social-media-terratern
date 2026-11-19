import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient, validateOriginAndCors } from '@/lib/api-security';
import { SEED_TESTIMONIALS, TestimonialItem } from '@/lib/public-directory';

export async function OPTIONS(req: NextRequest) {
  const { corsHeaders } = validateOriginAndCors(req);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { corsHeaders } = validateOriginAndCors(req);
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'public_testimonials')
      .maybeSingle();

    if (error || !data?.value) {
      return NextResponse.json(
        { success: true, testimonials: SEED_TESTIMONIALS },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, testimonials: data.value },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, testimonials: SEED_TESTIMONIALS },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  const { corsHeaders } = validateOriginAndCors(req);
  try {
    const body = await req.json();
    const supabase = getSupabaseServiceClient();

    let newTestimonials: TestimonialItem[] = [];

    // If an entire array was posted
    if (Array.isArray(body.testimonials)) {
      newTestimonials = body.testimonials;
    } else if (body.n && body.q) {
      // Single testimonial added
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'public_testimonials')
        .maybeSingle();

      const existing: TestimonialItem[] = Array.isArray(data?.value) ? data.value : SEED_TESTIMONIALS;
      const newItem: TestimonialItem = {
        id: `t_${Date.now()}`,
        n: body.n.trim(),
        c: body.c?.trim() || 'Global',
        q: body.q.trim(),
        rating: body.rating || 5,
        status: body.status || 'live',
      };
      newTestimonials = [newItem, ...existing];
    } else {
      return NextResponse.json({ error: 'Invalid testimonial data' }, { status: 400 });
    }

    const { error: upsertErr } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'public_testimonials',
          value: newTestimonials,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (upsertErr) throw upsertErr;

    return NextResponse.json(
      { success: true, testimonials: newTestimonials },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
