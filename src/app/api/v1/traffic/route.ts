import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/api-security';
import fs from 'fs';
import path from 'path';

// Base benchmark traffic for the main Web Page (starts from 0, counting from now onwards)
const BASE_BENCHMARK_VIEWS = 0;
const TRAFFIC_FILE_PATH = path.join(process.cwd(), '.next', 'tt_traffic.json');
const TMP_TRAFFIC_PATH = path.join('/tmp', 'tt_traffic.json');

interface TrafficData {
  views: number;
  form_clicks: number;
  last_updated: string;
}

// Global in-memory counter cache
let cachedTraffic: TrafficData = {
  views: 0,
  form_clicks: 0,
  last_updated: new Date().toISOString(),
};

let lastDbSync = 0;

async function syncFromDatabase(): Promise<TrafficData> {
  const now = Date.now();
  // Fetch from Supabase app_settings every 30 seconds or if never synced
  if (now - lastDbSync > 30 * 1000 || lastDbSync === 0) {
    try {
      const supabase = getSupabaseServiceClient();
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'webpage_traffic')
        .maybeSingle();

      if (data?.value && typeof data.value.views === 'number') {
        cachedTraffic = {
          views: Math.max(0, Number(data.value.views)),
          form_clicks: Math.max(0, Number(data.value.form_clicks || 0)),
          last_updated: data.value.last_updated || new Date().toISOString(),
        };
        lastDbSync = now;
        return cachedTraffic;
      }
    } catch {
      // Fallback to local / cached memory
    }
  }
  return cachedTraffic;
}

async function persistToDatabase(data: TrafficData) {
  cachedTraffic = data;
  lastDbSync = Date.now();

  // 1. Write to local file/tmp for local fallbacks
  try {
    const content = JSON.stringify(data);
    for (const p of [TRAFFIC_FILE_PATH, TMP_TRAFFIC_PATH]) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, content, 'utf8');
        break;
      } catch {}
    }
  } catch {}

  // 2. Persist to Supabase app_settings for true serverless multi-instance persistence
  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from('app_settings').upsert(
      {
        key: 'webpage_traffic',
        value: {
          views: data.views,
          form_clicks: data.form_clicks,
          last_updated: data.last_updated,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.error('Failed to persist traffic to database:', err);
  }
}

// In-memory set of visited visitor IDs in the current session to avoid artificial refresh inflation
const seenVisitors = new Map<string, number>();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
    },
  });
}

export async function GET() {
  const current = await syncFromDatabase();
  return NextResponse.json(
    {
      success: true,
      data: {
        page: 'web_page',
        views: current.views,
        form_clicks: current.form_clicks,
        last_updated: current.last_updated,
      },
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, visitor_id, trigger } = body || {};

    const current = await syncFromDatabase();
    const now = Date.now();

    if (type === 'view') {
      // Only count 1 view per visitor every 30 minutes to ensure real-time accuracy
      const vid = String(visitor_id || 'anon');
      const lastSeen = seenVisitors.get(vid);
      if (!lastSeen || now - lastSeen > 30 * 60 * 1000) {
        seenVisitors.set(vid, now);
        current.views += 1;
        current.last_updated = new Date().toISOString();
        await persistToDatabase(current);
      }
    } else if (type === 'form_click') {
      // Increment general form button clicks (Hero, Header, Bottom Banner CTAs)
      current.form_clicks += 1;
      current.last_updated = new Date().toISOString();
      await persistToDatabase(current);
    } else if (type === 'set_views' || type === 'reset') {
      // Authenticate admin caller before permitting manual view changes
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
            isAuthorized = true;
          }
        } catch {}
      }

      if (!isAuthorized) {
        return NextResponse.json(
          { error: 'Unauthorized: Admin authentication required to override traffic numbers.' },
          { status: 401 }
        );
      }

      current.views = typeof body.views === 'number' ? Math.max(0, body.views) : 0;
      current.last_updated = new Date().toISOString();
      await persistToDatabase(current);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          page: 'web_page',
          views: current.views,
          form_clicks: current.form_clicks,
          recorded_type: type,
          trigger: trigger || null,
        },
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process traffic event' },
      { status: 400 }
    );
  }
}
