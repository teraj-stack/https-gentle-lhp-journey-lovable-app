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
// Active consumers (DB-backed) — limits centralized in RATE_LIMITS below.
// Each consumer simply calls `checkRateLimitDb(supabase, ENDPOINT, ip)`
// and the config is auto-resolved.
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

// ============================================================
// SINGLE SOURCE OF TRUTH for per-endpoint rate limits.
//
// Any change here must be mirrored in the SQL function
// public.get_top_rate_limited_ips (CTE `limits`). The admin
// dashboard uses that CTE to compute "denied" counts.
//
// Add new endpoints here BEFORE wiring them up in the function code,
// then bump the SQL CTE in a migration.
// ============================================================
export const RATE_LIMITS = {
  'handle-email-unsubscribe':    { max: 10, windowMs: 60_000 },
  'handle-reminder-opt-out':     { max: 10, windowMs: 60_000 },
  'preview-transactional-email': { max: 10, windowMs: 60_000 },
  'verify-turnstile':            { max: 30, windowMs: 60_000 },
  'on-booking-created':          { max: 60, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>

export type RateLimitedEndpoint = keyof typeof RATE_LIMITS

// Resolve config by endpoint name. Falls back to DEFAULT_RATE_LIMIT
// for unknown endpoints (defensive — should not happen at runtime).
export function getRateLimitConfig(endpoint: string): RateLimitConfig {
  return (RATE_LIMITS as Record<string, RateLimitConfig>)[endpoint] ?? DEFAULT_RATE_LIMIT
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
  // If omitted, resolved from RATE_LIMITS registry above. Pass an explicit
  // config only for ad-hoc / testing scenarios.
  config: RateLimitConfig = getRateLimitConfig(endpoint),
): Promise<RateLimitResult> {
  const failOpen = (mode: 'rpc_error' | 'empty_result' | 'exception', detail: string) => {
    // Strukturalna linia logu: jednolinijkowy JSON, łatwy do filtrowania
    // w Supabase analytics_query (event_message LIKE '%[rate-limit][fail-open]%').
    const logLine = JSON.stringify({
      tag: '[rate-limit][fail-open]',
      endpoint,
      ip,
      mode,
      detail,
      limit: config.max,
      windowMs: config.windowMs,
      ts: new Date().toISOString(),
    })
    console.error(logLine)

    // Audytowy wpis w token_validation_failures, żeby /admin/system-health
    // mógł zliczyć fail-openy obok rate_limited / invalid_token.
    // Fire-and-forget — nie blokujemy ścieżki requestu.
    logTokenFailure(supabase, {
      endpoint,
      reason: 'rate_limit_failopen',
      ip: ip === 'unknown' ? null : ip,
      userAgent: null,
      metadata: { mode, detail, limit: config.max, windowMs: config.windowMs },
    })

    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: config.max,
      limit: config.max,
    }
  }

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
      return failOpen('rpc_error', error.message)
    }
    // RPC returns a SETOF (one row); supabase-js gives back an array.
    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      return failOpen('empty_result', 'RPC returned no rows')
    }
    return {
      allowed: !!row.allowed,
      retryAfterSec: row.retry_after_sec ?? 0,
      remaining: row.remaining ?? 0,
      limit: config.max,
    }
  } catch (err) {
    return failOpen('exception', err instanceof Error ? err.message : String(err))
  }
}

export type FailureReason =
  | 'invalid_token'
  | 'rate_limited'
  | 'expired'
  | 'already_used'
  | 'unauthorized'
  | 'invalid_payload'
  | 'rate_limit_failopen'

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

  // EdgeRuntime is injected globally by Supabase Edge Runtime; absent under
  // plain `deno test`. Cast through globalThis to silence type-checker.
  const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime
  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(promise)
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
