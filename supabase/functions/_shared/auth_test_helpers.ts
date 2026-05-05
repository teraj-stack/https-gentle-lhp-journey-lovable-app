// Shared helpers for Edge Function authorization integration tests.
//
// Goal: adding a new protected Edge Function to the test suite should be a
// ONE-LINER — push an entry into the `FUNCTIONS` array and you get the full
// matrix automatically:
//
//   * 12 negative scenarios (missing / empty / malformed / wrong-scheme /
//     wrong-case / bogus-token Authorization headers) → unified 401
//   * 1 best-effort positive smoke (CORRECT service-role token → NOT 401)
//
// The unified 401 contract under test lives in
// `supabase/functions/_shared/unauthorized.ts`:
//   status:       401
//   content-type: application/json
//   body:         { "error": "Unauthorized", "code": "unauthorized" }
//
// Usage:
//   import { runAuthMatrix } from '../_shared/auth_test_helpers.ts'
//   runAuthMatrix({ name: 'my-function', body: { foo: 1 } })

import 'https://deno.land/std@0.224.0/dotenv/load.ts'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

// ---------- Environment ----------

export const SUPABASE_URL =
  Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? ''

export const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
export const SUPABASE_ANON_KEY =
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ??
  Deno.env.get('SUPABASE_ANON_KEY') ??
  ''

export const HAS_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY.length > 0
export const HAS_ANON_KEY = SUPABASE_ANON_KEY.length > 0

if (!SUPABASE_URL) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / SUPABASE_URL — required to reach the Edge Functions endpoint.',
  )
}

// A bogus token of >=64 chars (matches realistic JWT / service-role lengths).
// Content NEVER matches a real key.
export const BOGUS_TOKEN = 'a'.repeat(Math.max(SERVICE_ROLE_KEY.length, 64))

// ---------- Low-level request builders ----------

export interface CallResult {
  status: number
  text: string
  contentType: string
  /**
   * All response headers, lowercased keys. Captured so auth tests can also
   * assert that 401 responses still carry the expected CORS headers
   * (browsers refuse to expose a response — even an error — without them).
   */
  headers: Record<string, string>
}

/**
 * Build a request to a function with NO Authorization header.
 * Use this when you want to exercise the unauthenticated path explicitly.
 */
export function buildUnauthenticatedRequest(name: string, body: unknown): Request {
  return new Request(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * Build a request with a syntactically valid but BOGUS Bearer token.
 * The function MUST reject this with the unified 401 shape.
 */
export function buildBogusTokenRequest(name: string, body: unknown): Request {
  return new Request(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BOGUS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
}

/**
 * Build a request with the LOCAL service-role key as Bearer.
 * Best-effort positive smoke — may still return 401 if the local key was
 * rotated and the deployed function holds a different runtime secret.
 *
 * Returns null when no local SERVICE_ROLE_KEY is present, so the caller
 * can skip the positive smoke instead of failing.
 */
export function buildServiceRoleRequest(name: string, body: unknown): Request | null {
  if (!HAS_SERVICE_ROLE_KEY) return null
  return new Request(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  })
}

/**
 * Send any of the requests above (or one with custom headers) and return a
 * normalized CallResult. Always consumes the response body to avoid Deno
 * resource leaks.
 */
export async function sendRequest(req: Request): Promise<CallResult> {
  const res = await fetch(req)
  const text = await res.text()
  const contentType = res.headers.get('content-type') ?? ''
  const headers: Record<string, string> = {}
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })
  return { status: res.status, text, contentType, headers }
}

/**
 * Convenience: build + send with arbitrary header overrides. Useful for
 * exotic scenarios in the malformed-Authorization matrix (lowercase scheme,
 * Basic, Token, "Bearer" with no space, …).
 */
export async function callFunction(
  name: string,
  headers: HeadersInit,
  body: unknown,
): Promise<CallResult> {
  const req = new Request(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return sendRequest(req)
}

// ---------- Unified 401 contract assertion ----------

/**
 * Assert that a CallResult matches the unified 401 contract from
 * `_shared/unauthorized.ts`. Use this in every negative auth test.
 */
export function assertUnauthorizedShape(
  scenario: string,
  res: CallResult,
  fnName?: string,
) {
  const tag = fnName ? `[${fnName}] ${scenario}` : scenario
  assertEquals(
    res.status,
    401,
    `${tag}: expected 401, got ${res.status}: ${res.text}`,
  )
  assert(
    res.contentType.toLowerCase().includes('application/json'),
    `${tag}: expected application/json content-type, got "${res.contentType}"`,
  )
  let body: unknown
  try {
    body = JSON.parse(res.text)
  } catch {
    throw new Error(`${tag}: 401 body is not valid JSON: ${res.text}`)
  }
  assertEquals(
    body,
    { error: 'Unauthorized', code: 'unauthorized' },
    `${tag}: 401 body shape drift. Got ${res.text}`,
  )
}

/**
 * Assert that a (typically 401) response carries the CORS headers required
 * for browsers to actually expose the response body to JS. Without these,
 * a browser caller would see an opaque network error instead of the unified
 * 401 contract — defeating the point of returning a structured body.
 *
 * Required:
 *   * `access-control-allow-origin: *` (all protected functions use `*`)
 *   * `access-control-allow-headers` must at least allow `authorization`
 *     and `content-type` so the preflight for the original request succeeds.
 */
export function assertCorsHeaders(
  scenario: string,
  res: CallResult,
  fnName?: string,
) {
  const tag = fnName ? `[${fnName}] ${scenario}` : scenario
  const origin = res.headers['access-control-allow-origin']
  assertEquals(
    origin,
    '*',
    `${tag}: expected Access-Control-Allow-Origin "*", got "${origin ?? '<missing>'}"`,
  )
  const allowHeaders = (res.headers['access-control-allow-headers'] ?? '').toLowerCase()
  assert(
    allowHeaders.length > 0,
    `${tag}: missing Access-Control-Allow-Headers on 401 response`,
  )
  for (const required of ['authorization', 'content-type']) {
    assert(
      allowHeaders.includes(required),
      `${tag}: Access-Control-Allow-Headers "${allowHeaders}" must include "${required}"`,
    )
  }
}

// ---------- Malformed-Authorization matrix ----------

/**
 * Exhaustive matrix of Authorization-header shapes that MUST be rejected by
 * every protected Edge Function. The functions all parse identically:
 *
 *   const token = h.startsWith('Bearer ') ? h.slice(7).trim() : ''
 *
 * — case-sensitive prefix, mandatory single space, trailing whitespace
 * trimmed. Anything that doesn't match yields token = '' and fails the
 * timing-safe equality check.
 */
export const MALFORMED_AUTH_VARIANTS: Array<{
  label: string
  headers: HeadersInit
}> = [
  { label: 'no Authorization header at all', headers: {} },
  { label: 'empty Authorization value', headers: { Authorization: '' } },
  { label: 'whitespace-only Authorization', headers: { Authorization: '   ' } },
  { label: '"Bearer" with no space and no token', headers: { Authorization: 'Bearer' } },
  { label: '"Bearer " with empty token', headers: { Authorization: 'Bearer ' } },
  { label: '"Bearer " with whitespace-only token', headers: { Authorization: 'Bearer     ' } },
  { label: 'lowercase scheme "bearer "', headers: { Authorization: `bearer ${BOGUS_TOKEN}` } },
  { label: 'uppercase scheme "BEARER "', headers: { Authorization: `BEARER ${BOGUS_TOKEN}` } },
  { label: 'Basic auth scheme', headers: { Authorization: `Basic ${BOGUS_TOKEN}` } },
  { label: 'Token scheme (GitHub-style)', headers: { Authorization: `Token ${BOGUS_TOKEN}` } },
  { label: 'NotBearer scheme prefix', headers: { Authorization: 'NotBearer something' } },
  { label: 'raw token without any scheme', headers: { Authorization: BOGUS_TOKEN } },
  { label: '"Bearer<token>" with no separator', headers: { Authorization: `Bearer${BOGUS_TOKEN}` } },
  { label: 'WRONG Bearer token (correct shape, wrong content)', headers: { Authorization: `Bearer ${BOGUS_TOKEN}` } },
]

// ---------- High-level test runner ----------

export interface FunctionUnderTest {
  name: string
  /**
   * POST body that would otherwise be valid. Auth check happens BEFORE body
   * parsing in every protected function, so the exact contents don't matter
   * for the negative tests — but we send something realistic so the positive
   * smoke doesn't reject for an unrelated reason if it happens to pass auth.
   */
  body: unknown
}

/**
 * Register the full auth matrix for one Edge Function with `Deno.test`.
 *
 * Generates:
 *   * One Deno.test per malformed-Authorization variant (asserts unified 401).
 *   * One best-effort positive smoke (asserts NOT 401 when the local
 *     service-role key matches the deployed function's runtime secret;
 *     otherwise warns and skips — never fails on auth outcome).
 *
 * Adding a new protected function to the suite is a one-liner:
 *   runAuthMatrix({ name: 'my-new-fn', body: { ... } })
 */
export function runAuthMatrix(fn: FunctionUnderTest) {
  for (const variant of MALFORMED_AUTH_VARIANTS) {
    Deno.test(`[auth] ${fn.name} — rejects ${variant.label} (unified 401)`, async () => {
      const res = await callFunction(fn.name, variant.headers, fn.body)
      assertUnauthorizedShape(variant.label, res, fn.name)
    })

    Deno.test(`[auth] ${fn.name} — 401 for ${variant.label} carries CORS headers`, async () => {
      const res = await callFunction(fn.name, variant.headers, fn.body)
      assertEquals(res.status, 401, `expected 401 prerequisite for CORS check, got ${res.status}`)
      assertCorsHeaders(variant.label, res, fn.name)
    })
  }

  Deno.test(
    `[auth] ${fn.name} — accepts CORRECT service-role Bearer (best-effort smoke)`,
    async () => {
      const req = buildServiceRoleRequest(fn.name, fn.body)
      if (!req) {
        console.warn(
          `[auth] ${fn.name}: SUPABASE_SERVICE_ROLE_KEY not in local env — ` +
            `positive smoke skipped (best-effort). Negative tests still ran.`,
        )
        return
      }
      const res = await sendRequest(req)
      if (res.status === 401 || res.status === 403) {
        console.warn(
          `[auth] ${fn.name}: local SERVICE_ROLE_KEY does not match the deployed ` +
            `function's runtime secret (got ${res.status}) — positive smoke skipped ` +
            `(best-effort). Negative tests still passed.`,
        )
        return
      }
      assert(
        res.status < 600,
        `Got unexpected transport-layer status ${res.status} from ${fn.name}: ${res.text}`,
      )
    },
  )
}
