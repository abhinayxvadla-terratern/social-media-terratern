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
    // Authenticate admin session or admin token
    let isAuthorized = false;
    const authHeader = req.headers.get('authorization') || '';
    const adminToken = authHeader.replace(/^Bearer\s+/i, '') || req.headers.get('x-admin-token');
    const expectedAdminToken = process.env.ADMIN_API_TOKEN || 'tt_admin_sec_dev_2026_x89';
    if (adminToken && adminToken === expectedAdminToken) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      try {
        const { createServerSupabaseClient } = await import('@/lib/supabase/server');
        const serverClient = await createServerSupabaseClient();
        const { data: { user } } = await serverClient.auth.getUser();
        if (user) {
          const isAbhinay =
            Boolean(user.email?.toLowerCase().includes('abhinay')) ||
            user.email === 'abhinay.vadla@terratern.com';
          if (isAbhinay) {
            isAuthorized = true;
          } else {
            const supabaseService = getSupabaseServiceClient();
            const { data: adminRecord } = await supabaseService
              .from('admin_users')
              .select('role')
              .eq('user_id', user.id)
              .maybeSingle();
            if (adminRecord && (adminRecord.role === 'owner' || adminRecord.role === 'editor')) {
              isAuthorized = true;
            }
          }
        }
      } catch {}
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required to update testimonials.' },
        { status: 401, headers: corsHeaders }
      );
    }

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
