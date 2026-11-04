/**
 * TerraTern Lead Page Engine - API Security, Rate Limiting & CORS
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// In-memory rate limiting store
interface RateRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateRecord>();

// Clean up stale rate records every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check sliding window rate limit
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Extract client IP from Next.js request
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/**
 * Supabase Service Client instance
 */
export function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * CORS and allowed_origins validator
 */
export function validateOriginAndCors(
  req: NextRequest,
  allowedOrigins: string[] = []
): { isAllowed: boolean; corsHeaders: Record<string, string> } {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  const requestOrigin = origin || (referer ? new URL(referer).origin : null);

  // Default headers
  const baseHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-visitor-id, x-page-key',
    'Access-Control-Max-Age': '86400',
  };

  // If no allowed_origins specified or contains wildcard '*', allow all
  if (!allowedOrigins || allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
    return {
      isAllowed: true,
      corsHeaders: {
        ...baseHeaders,
        'Access-Control-Allow-Origin': requestOrigin || '*',
      },
    };
  }

  // Normalization helper
  const cleanOrigin = (urlStr: string) => {
    try {
      return new URL(urlStr).origin.toLowerCase();
    } catch {
      return urlStr.toLowerCase();
    }
  };

  const normalizedAllowed = allowedOrigins.map(cleanOrigin);

  // If request origin is missing (e.g. server-to-server or direct curl), allow
  if (!requestOrigin) {
    return {
      isAllowed: true,
      corsHeaders: {
        ...baseHeaders,
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  const normalizedRequest = cleanOrigin(requestOrigin);
  const isMatch =
    normalizedAllowed.includes(normalizedRequest) ||
    normalizedRequest.includes('localhost') ||
    normalizedRequest.includes('127.0.0.1');

  if (isMatch) {
    return {
      isAllowed: true,
      corsHeaders: {
        ...baseHeaders,
        'Access-Control-Allow-Origin': requestOrigin,
      },
    };
  }

  return {
    isAllowed: false,
    corsHeaders: {
      ...baseHeaders,
      'Access-Control-Allow-Origin': normalizedAllowed[0] || '',
    },
  };
}

/**
 * Generate 10-minute signed download token using HMAC-SHA256
 */
const TOKEN_SECRET =
  process.env.DOWNLOAD_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'tt_secret_download_signing_key_2026';

export function createDownloadToken(payload: {
  page_key: string;
  lead_id: string;
  storage_path: string;
}): string {
  const exp = Date.now() + 10 * 60 * 1000; // 10 minutes from now
  const data = JSON.stringify({ ...payload, exp });
  const b64Data = Buffer.from(data).toString('base64url');
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET).update(b64Data).digest('base64url');
  return `${b64Data}.${hmac}`;
}

/**
 * Verify signed download token
 */
export function verifyDownloadToken(
  token: string
): { valid: boolean; payload?: { page_key: string; lead_id: string; storage_path: string; exp: number } } {
  try {
    const [b64Data, signature] = token.split('.');
    if (!b64Data || !signature) return { valid: false };

    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64Data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(b64Data, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return { valid: false }; // Expired
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
