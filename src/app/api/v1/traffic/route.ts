import { NextRequest, NextResponse } from 'next/server';
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

function readPersistedTraffic(): TrafficData {
  // Check writable paths
  for (const p of [TRAFFIC_FILE_PATH, TMP_TRAFFIC_PATH]) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.views === 'number') {
          cachedTraffic = {
            views: Math.max(parsed.views, 0),
            form_clicks: Number(parsed.form_clicks || 0),
            last_updated: parsed.last_updated || new Date().toISOString(),
          };
          return cachedTraffic;
        }
      }
    } catch {
      // Continue to next path
    }
  }
  return cachedTraffic;
}

function writePersistedTraffic(data: TrafficData) {
  cachedTraffic = data;
  const content = JSON.stringify(data);
  for (const p of [TRAFFIC_FILE_PATH, TMP_TRAFFIC_PATH]) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, content, 'utf8');
      break;
    } catch {
      // Continue
    }
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  const current = readPersistedTraffic();
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

    const current = readPersistedTraffic();
    const now = Date.now();

    if (type === 'view') {
      // Only count 1 view per visitor every 30 minutes to ensure real-time accuracy
      const vid = String(visitor_id || 'anon');
      const lastSeen = seenVisitors.get(vid);
      if (!lastSeen || now - lastSeen > 30 * 60 * 1000) {
        seenVisitors.set(vid, now);
        current.views += 1;
        current.last_updated = new Date().toISOString();
        writePersistedTraffic(current);
      }
    } else if (type === 'form_click') {
      // Increment general form button clicks (Hero, Header, Bottom Banner CTAs)
      current.form_clicks += 1;
      current.last_updated = new Date().toISOString();
      writePersistedTraffic(current);
    } else if (type === 'set_views' || type === 'reset') {
      current.views = typeof body.views === 'number' ? Math.max(0, body.views) : 0;
      current.last_updated = new Date().toISOString();
      writePersistedTraffic(current);
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
