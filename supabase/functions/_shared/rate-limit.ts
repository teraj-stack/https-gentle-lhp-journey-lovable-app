// ============================================================
// Shared rate-limiter + token failure logger.
//
// Two rate-limit implementations live here:
//   1) checkRateLimit()    — in-memory, per-isolate, BEST-EFFORT.
//                            Kept only for legacy callers; do not use.
//   2) checkRateLimitDb()  — DB-backed (rate_limit_buckets + RPC),
//                            atomic UPSERT, GLOBAL across isolates.
//                            Preferred for all new endpoints.
//
// Active consumers (DB-backed):
//   - handle-email-unsubscribe   (10/60s)
//   - handle-reminder-opt-out    (10/60s)
//   - verify-turnstile           (30/60s)
//   - preview-transactional-email (10/60s)
//   - on-booking-created         (60/60s)  ← DB webhook; Supabase retries
//                                            on 429 with backoff, harmless.
//
// update-booking-status — RL intentionally removed (token alone is the
// security boundary: 256-bit + single-use + 7d expiry). See its file.
//
// No remaining in-memory consumers — checkRateLimit() kept for legacy
// only and may be removed in a future cleanup.
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

// ============================================================
// DB-backed rate limiter (cross-isolate, atomic).
// Uses Postgres function check_and_increment_rate_limit which performs an
// atomic UPSERT on the rate_limit_buckets table. Unlike checkRateLimit()
// above, this gives one shared counter across ALL Deno isolates.
//
// Fail-open: if the DB call throws/errors, we allow the request and log
// a warning. RL is defense-in-depth, not the primary security boundary.
// ============================================================
export async function checkRateLimitDb(
  supabase: SupabaseClient,
  endpoint: string,
  ip: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc(
      'check_and_increment_rate_limit',
      {
        p_endpoint: endpoint,
        p_ip: ip,
        p_max: config.max,
        p_window_sec: Math.ceil(config.windowMs / 1000),
      },
    )
    if (error) {
      console.warn(
        '[rate-limit] DB rate-limit RPC failed, failing open:',
        error.message,
      )
      return {
        allowed: true,
        retryAfterSec: 0,
        remaining: config.max,
        limit: config.max,
      }
    }
    // RPC returns a SETOF (one row); supabase-js gives back an array.
    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      return {
        allowed: true,
        retryAfterSec: 0,
        remaining: config.max,
        limit: config.max,
      }
    }
    return {
      allowed: !!row.allowed,
      retryAfterSec: row.retry_after_sec ?? 0,
      remaining: row.remaining ?? 0,
      limit: config.max,
    }
  } catch (err) {
    console.warn(
      '[rate-limit] DB rate-limit threw, failing open:',
      err instanceof Error ? err.message : String(err),
    )
    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: config.max,
      limit: config.max,
    }
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
