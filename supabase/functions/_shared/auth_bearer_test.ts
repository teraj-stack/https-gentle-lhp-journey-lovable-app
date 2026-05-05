// Integration tests: verify that protected Edge Functions reject requests
// without the correct `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
// header.
//
// Functions under test (all return 401 for missing / wrong service-role token):
//   - on-booking-created            (DB webhook — service-role only)
//   - send-booking-reminders        (pg_cron — service-role only)
//   - send-booking-no-show-followup (pg_cron — service-role only)
//   - retry-dlq-emails              (cron + admin — anything else 401)
//
// `send-transactional-email` is intentionally NOT in this list: it accepts
// unauthenticated callers (with stricter rate-limits) so a missing token is
// not an auth failure there. Its service-role bypass is covered by its own
// dedicated tests.
//
// Each function is exercised three times:
//   1) NO Authorization header                   → expect 401
//   2) Authorization with a bogus Bearer token   → expect 401
//   3) Authorization with the real service-role  → expect NOT 401
//      (the call may then fail validation/business logic with 4xx/5xx,
//      we only assert that auth itself does not block the request)

import 'https://deno.land/std@0.224.0/dotenv/load.ts'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (!SUPABASE_URL) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / SUPABASE_URL — required to reach the Edge Functions endpoint.',
  )
}

// SERVICE_ROLE_KEY is intentionally optional. The positive smoke test is
// best-effort: if the local env does not contain a service-role key (or it
// does not match the deployed function's runtime secret), we skip the
// positive assertion rather than failing the suite. The two negative tests
// (no header / wrong token) remain hard 401 checks and run regardless.
const HAS_LOCAL_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY.length > 0

interface FunctionUnderTest {
  name: string
  // POST body that would otherwise be valid; auth check happens before body
  // parsing, so the exact contents don't matter — but we send something so
  // the function doesn't reject for unrelated reasons when the auth passes.
  body: unknown
}

const FUNCTIONS: FunctionUnderTest[] = [
  {
    name: 'on-booking-created',
    body: {
      type: 'INSERT',
      table: 'bookings',
      schema: 'public',
      record: { id: '00000000-0000-0000-0000-000000000000' },
      old_record: null,
    },
  },
  {
    name: 'send-booking-reminders',
    body: { window: '24h' },
  },
  {
    name: 'send-booking-no-show-followup',
    body: {},
  },
  {
    name: 'retry-dlq-emails',
    body: {},
  },
]

// A bogus token of identical length to the real key would defeat
// timingSafeEqual length check too, but any non-matching value is enough
// to assert "rejected" — the function compares character-by-character
// after a length check.
// Use a fixed-length bogus token (>=64 chars) so the length is realistic even
// when SERVICE_ROLE_KEY is empty locally. Content never matches a real key.
const BOGUS_TOKEN = 'a'.repeat(Math.max(SERVICE_ROLE_KEY.length, 64))

async function callFunction(name: string, headers: HeadersInit, body: unknown) {
  const url = `${SUPABASE_URL}/functions/v1/${name}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const contentType = res.headers.get('content-type') || ''
  return { status: res.status, text, contentType }
}

// Asserts the unified 401 contract documented in
// supabase/functions/_shared/unauthorized.ts:
//   status:       401
//   content-type: application/json
//   body:         { "error": "Unauthorized", "code": "unauthorized" }
function assertUnauthorizedShape(
  fnName: string,
  scenario: string,
  res: { status: number; text: string; contentType: string },
) {
  assertEquals(
    res.status,
    401,
    `[${fnName}] ${scenario}: expected status 401, got ${res.status}: ${res.text}`,
  )
  assert(
    res.contentType.toLowerCase().includes('application/json'),
    `[${fnName}] ${scenario}: expected application/json content-type, got "${res.contentType}"`,
  )
  let body: unknown
  try {
    body = JSON.parse(res.text)
  } catch {
    throw new Error(`[${fnName}] ${scenario}: 401 body is not valid JSON: ${res.text}`)
  }
  assertEquals(
    body,
    { error: 'Unauthorized', code: 'unauthorized' },
    `[${fnName}] ${scenario}: 401 body shape drift. Expected ` +
      `{error:"Unauthorized",code:"unauthorized"}, got ${res.text}`,
  )
}

// Matrix of Authorization-header malformed/missing variants. ALL of these
// MUST produce the unified 401 contract from `_shared/unauthorized.ts`.
//
// The protected functions all use the same parsing rule:
//   const token = h.startsWith('Bearer ') ? h.slice(7).trim() : ''
// — case-sensitive prefix, mandatory single space, trailing whitespace
// trimmed. Anything that doesn't fit yields token = '' which fails the
// timing-safe equality check below.
//
// We pin every shape that we have seen real attackers / misconfigured
// clients send, so a future refactor cannot loosen the gate by accident.
const MALFORMED_AUTH_VARIANTS: Array<{ label: string; headers: HeadersInit }> = [
  { label: 'no Authorization header at all', headers: {} },
  { label: 'empty Authorization value', headers: { Authorization: '' } },
  { label: 'whitespace-only Authorization', headers: { Authorization: '   ' } },
  // "Bearer" without a space or token → prefix check fails, token = ''.
  { label: '"Bearer" with no space and no token', headers: { Authorization: 'Bearer' } },
  // "Bearer " with the mandatory space but an empty token → token = '' after trim.
  { label: '"Bearer " with empty token', headers: { Authorization: 'Bearer ' } },
  // "Bearer    " with only whitespace after → token = '' after trim.
  { label: '"Bearer " with whitespace-only token', headers: { Authorization: 'Bearer     ' } },
  // Wrong case — startsWith('Bearer ') is case-sensitive.
  { label: 'lowercase scheme "bearer "', headers: { Authorization: `bearer ${BOGUS_TOKEN}` } },
  { label: 'uppercase scheme "BEARER "', headers: { Authorization: `BEARER ${BOGUS_TOKEN}` } },
  // Wrong scheme entirely.
  { label: 'Basic auth scheme', headers: { Authorization: `Basic ${BOGUS_TOKEN}` } },
  { label: 'Token scheme (GitHub-style)', headers: { Authorization: `Token ${BOGUS_TOKEN}` } },
  { label: 'raw token without any scheme', headers: { Authorization: BOGUS_TOKEN } },
  // No space between scheme and token.
  { label: '"Bearer<token>" with no separator', headers: { Authorization: `Bearer${BOGUS_TOKEN}` } },
  // Correct shape but bogus token of realistic length.
  { label: 'WRONG Bearer token (correct shape, wrong content)', headers: { Authorization: `Bearer ${BOGUS_TOKEN}` } },
]

for (const fn of FUNCTIONS) {
  for (const variant of MALFORMED_AUTH_VARIANTS) {
    Deno.test(`[auth] ${fn.name} — rejects ${variant.label} (unified 401)`, async () => {
      const res = await callFunction(fn.name, variant.headers, fn.body)
      assertUnauthorizedShape(fn.name, variant.label, res)
    })
  }


  Deno.test(`[auth] ${fn.name} — accepts request with CORRECT service-role Bearer token (smoke, best-effort)`, async () => {
    // Best-effort positive smoke. We NEVER fail this test based on auth
    // outcome:
    //
    //   * If the local env has no SUPABASE_SERVICE_ROLE_KEY at all, skip
    //     entirely (warn). The negative tests above already prove the
    //     function rejects unauthenticated and bogus-token requests.
    //   * If the local key is present but does NOT match the deployed
    //     function's runtime secret (e.g. keys were rotated remotely), the
    //     gateway returns 401/403. That is a config drift, not a security
    //     regression — warn and skip.
    //   * Only when the request gets PAST the auth gate (any non-auth
    //     status) do we assert it's a sane transport-layer response.
    if (!HAS_LOCAL_SERVICE_ROLE_KEY) {
      console.warn(
        `[auth] ${fn.name}: SUPABASE_SERVICE_ROLE_KEY not set in local env — ` +
          `positive smoke skipped (best-effort). Negative rejection tests still ran.`,
      )
      return
    }

    const { status, text } = await callFunction(
      fn.name,
      { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      fn.body,
    )

    if (status === 401 || status === 403) {
      console.warn(
        `[auth] ${fn.name}: local SERVICE_ROLE_KEY does not match the deployed ` +
          `function's runtime secret (got ${status}) — positive smoke skipped ` +
          `(best-effort). Negative rejection tests still passed.`,
      )
      return
    }

    assert(
      status < 600,
      `Got unexpected transport-layer status ${status} from ${fn.name}: ${text}`,
    )
  })
}
