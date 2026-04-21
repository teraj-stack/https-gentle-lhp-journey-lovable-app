// ============================================================
// Shared rate-limiter + token failure logger.
// Used by public edge functions:
//   - update-booking-status
//   - handle-email-unsubscribe
//   - handle-reminder-opt-out
//   - verify-turnstile
//   - on-booking-created
//   - preview-transactional-email
//
// IMPORTANT: This rate-limiter is BEST-EFFORT.
// Supabase Edge Functions fan out across multiple Deno isolates.
// Each isolate keeps its own in-memory Map → a burst of N requests
// distributed across K isolates effectively raises the limit Kx.
// We keep it because:
//   1) Slows down naive single-isolate brute-forcers.
//   2) Drives the unified `token_validation_failures` audit log so admins
//      can detect abuse via /admin/system-health (≥10 failures / 10 min).
//
// True global rate-limiting requires a Postgres-backed bucket
// (separate concern, not implemented here).
// ============================================================

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface RateLimitConfig {
  max: number
  windowMs: number
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  max: 10,
  windowMs: 60_000,
}

interface Bucket {
  count: number
  resetAt: number
}

// Per-endpoint isolated buckets so noisy endpoint A can't starve endpoint B.
const bucketsByEndpoint = new Map<string, Map<string, Bucket>>()

function getBuckets(endpoint: string): Map<string, Bucket> {
  let map = bucketsByEndpoint.get(endpoint)
  if (!map) {
    map = new Map<string, Bucket>()
    bucketsByEndpoint.set(endpoint, map)
  }
  return map
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSec: number
  remaining: number
  limit: number
}

export function checkRateLimit(
  endpoint: string,
  ip: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): RateLimitResult {
  const now = Date.now()
  const buckets = getBuckets(endpoint)

  // Lazy cleanup so the Map doesn't grow unbounded per isolate.
  if (buckets.size > 100) {
    for (const [key, value] of buckets) {
      if (value.resetAt < now) buckets.delete(key)
    }
  }

  const bucket = buckets.get(ip)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + config.windowMs })
    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: config.max - 1,
      limit: config.max,
    }
  }

  if (bucket.count >= config.max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      remaining: 0,
      limit: config.max,
    }
  }

  bucket.count += 1
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: config.max - bucket.count,
    limit: config.max,
  }
}

export type FailureReason =
  | 'invalid_token'
  | 'rate_limited'
  | 'expired'
  | 'already_used'
  | 'unauthorized'
  | 'invalid_payload'

export interface LogFailureParams {
  endpoint: string
  reason: FailureReason
  ip: string | null
  userAgent: string | null
  metadata?: Record<string, unknown>
}

// Fire-and-forget audit log. Uses EdgeRuntime.waitUntil where available
// so logging never blocks the response path.
export function logTokenFailure(
  supabase: SupabaseClient,
  params: LogFailureParams,
): void {
  const promise = supabase
    .from('token_validation_failures')
    .insert({
      endpoint: params.endpoint,
      reason: params.reason,
      ip: params.ip,
      user_agent: params.userAgent,
      metadata: params.metadata ?? null,
    })
    .then(({ error }) => {
      if (error) {
        console.error(
          '[rate-limit] Failed to log token_validation_failure:',
          error.message,
        )
      }
    })

  // @ts-ignore - EdgeRuntime is available in Supabase Edge Runtime
  if (
    typeof EdgeRuntime !== 'undefined' &&
    // @ts-ignore
    typeof EdgeRuntime.waitUntil === 'function'
  ) {
    // @ts-ignore
    EdgeRuntime.waitUntil(promise)
  }
}

// Convenience: build the standard 429 response for a denied rate-limit check.
export function rateLimitedResponse(
  rl: RateLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ error: 'rate_limited', retryAfterSec: rl.retryAfterSec }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(rl.retryAfterSec),
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

// Helper: convert "unknown" → null for DB inserts (ip is nullable text).
export function ipForLog(ip: string): string | null {
  return ip === 'unknown' ? null : ip
}
