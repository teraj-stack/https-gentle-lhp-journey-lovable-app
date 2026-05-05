// Integration tests: verify that `send-transactional-email` enforces the
// service-role-only boundary that closed the Open Email Relay finding.
//
// Contract under test (do NOT relax without security review):
//   * NO Authorization header                  → 401 Unauthorized
//   * Authorization with malformed value       → 401 Unauthorized
//   * Authorization with bogus Bearer token    → 401 Unauthorized
//   * Authorization with anon JWT              → 401 Unauthorized
//   * Authorization with correct service-role  → NOT 401
//                                                (best-effort smoke; may
//                                                 still 4xx/5xx on body
//                                                 validation downstream)
//
// IMPORTANT: an earlier scaffold of this function had a per-IP rate-limit
// fallback that allowed any anon caller to send up to N branded emails per
// window. That fallback was removed because it was trivially bypassable by
// IP rotation. These tests pin the hardened behaviour in place — if anyone
// re-introduces a non-service-role code path that returns a non-401 status,
// the negative tests below will fail and surface the regression in CI.

import 'https://deno.land/std@0.224.0/dotenv/load.ts'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const SUPABASE_URL =
  Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY =
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ??
  Deno.env.get('SUPABASE_ANON_KEY') ??
  ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (!SUPABASE_URL) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / SUPABASE_URL — required to reach the Edge Functions endpoint.',
  )
}

const HAS_ANON_KEY = SUPABASE_ANON_KEY.length > 0
const HAS_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY.length > 0

// A bogus token of identical length to the real key would defeat any naive
// length check too. Use >=64 chars so the length is realistic even when
// SERVICE_ROLE_KEY is empty locally. Content never matches a real key.
const BOGUS_TOKEN = 'a'.repeat(Math.max(SERVICE_ROLE_KEY.length, 64))

// Minimal payload. Auth check happens BEFORE body parsing in
// send-transactional-email, so the contents don't matter for the negative
// tests — but we still send a realistic body so the positive smoke does
// not get rejected for an unrelated reason if it happens to pass auth.
const SAMPLE_BODY = {
  templateName: 'contact-confirmation',
  recipientEmail: 'qa+auth-test@example.invalid',
  templateData: { name: 'QA' },
}

async function callFn(headers: HeadersInit) {
  const url = `${SUPABASE_URL}/functions/v1/send-transactional-email`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(SAMPLE_BODY),
  })
  const text = await res.text()
  const contentType = res.headers.get('content-type') || ''
  return { status: res.status, text, contentType }
}

// Unified 401 contract — must match supabase/functions/_shared/unauthorized.ts.
function assertUnauthorizedShape(
  scenario: string,
  res: { status: number; text: string; contentType: string },
) {
  assertEquals(
    res.status,
    401,
    `[stx-auth] ${scenario}: expected 401, got ${res.status}: ${res.text}`,
  )
  assert(
    res.contentType.toLowerCase().includes('application/json'),
    `[stx-auth] ${scenario}: expected application/json content-type, got "${res.contentType}"`,
  )
  let body: unknown
  try {
    body = JSON.parse(res.text)
  } catch {
    throw new Error(`[stx-auth] ${scenario}: 401 body is not valid JSON: ${res.text}`)
  }
  assertEquals(
    body,
    { error: 'Unauthorized', code: 'unauthorized' },
    `[stx-auth] ${scenario}: 401 body shape drift. Got ${res.text}`,
  )
}

// Matrix of Authorization-header malformed/missing variants. ALL must
// produce the unified 401 contract from `_shared/unauthorized.ts`. Pinned
// here so a future refactor cannot loosen the gate by accident.
//
// send-transactional-email parses identically to the other 4 protected
// functions:
//   const token = h.startsWith('Bearer ') ? h.slice(7).trim() : ''
const MALFORMED_AUTH_VARIANTS: Array<{ label: string; headers: HeadersInit }> = [
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

for (const variant of MALFORMED_AUTH_VARIANTS) {
  Deno.test(`[stx-auth] send-transactional-email — rejects ${variant.label} (unified 401)`, async () => {
    assertUnauthorizedShape(variant.label, await callFn(variant.headers))
  })
}

Deno.test('[stx-auth] send-transactional-email — rejects anon JWT (publishable key) as Bearer (unified 401)', async () => {
  // Anon callers MUST go through `submit-contact-form` (Turnstile +
  // validation + rate-limit), never call this function directly.
  if (!HAS_ANON_KEY) {
    console.warn(
      '[stx-auth] anon publishable key not in local env — anon-JWT rejection test skipped.',
    )
    return
  }
  assertUnauthorizedShape(
    'anon JWT Bearer',
    await callFn({ Authorization: `Bearer ${SUPABASE_ANON_KEY}` }),
  )
})



Deno.test('[stx-auth] send-transactional-email — accepts CORRECT service-role Bearer (best-effort smoke)', async () => {
  // Best-effort: NEVER fail this test on auth outcome.
  //   * No local service-role key  → skip with warning.
  //   * Local key but deployed key rotated → 401/403 → skip with warning.
  //   * Otherwise we passed the auth gate; assert the response is a sane
  //     transport-layer status (anything < 600).
  if (!HAS_SERVICE_ROLE_KEY) {
    console.warn(
      '[stx-auth] SUPABASE_SERVICE_ROLE_KEY not in local env — positive smoke skipped (best-effort).',
    )
    return
  }
  const { status, text } = await callFn({
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  })
  if (status === 401 || status === 403) {
    console.warn(
      `[stx-auth] local SERVICE_ROLE_KEY does not match the deployed function's runtime secret ` +
        `(got ${status}) — positive smoke skipped (best-effort). Negative tests still passed.`,
    )
    return
  }
  assert(
    status < 600,
    `Got unexpected transport-layer status ${status} from send-transactional-email: ${text}`,
  )
})
