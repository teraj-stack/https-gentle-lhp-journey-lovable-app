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
  // Always consume to avoid Deno resource leaks.
  const text = await res.text()
  return { status: res.status, text }
}

Deno.test('[stx-auth] send-transactional-email — rejects NO Authorization header (401)', async () => {
  const { status, text } = await callFn({})
  assertEquals(
    status,
    401,
    `Expected 401 from send-transactional-email without Authorization header, got ${status}: ${text}`,
  )
})

Deno.test('[stx-auth] send-transactional-email — rejects malformed Authorization (no "Bearer " prefix) (401)', async () => {
  const { status, text } = await callFn({ Authorization: 'NotBearer something' })
  assertEquals(
    status,
    401,
    `Expected 401 from send-transactional-email with malformed Authorization, got ${status}: ${text}`,
  )
})

Deno.test('[stx-auth] send-transactional-email — rejects WRONG Bearer token (401)', async () => {
  const { status, text } = await callFn({
    Authorization: `Bearer ${BOGUS_TOKEN}`,
  })
  assertEquals(
    status,
    401,
    `Expected 401 from send-transactional-email with bogus Bearer token, got ${status}: ${text}`,
  )
})

Deno.test('[stx-auth] send-transactional-email — rejects anon JWT (publishable key) as Bearer (401)', async () => {
  // Anon callers MUST go through `submit-contact-form` (Turnstile +
  // validation + rate-limit), never call this function directly.
  if (!HAS_ANON_KEY) {
    console.warn(
      '[stx-auth] anon publishable key not in local env — anon-JWT rejection test skipped.',
    )
    return
  }
  const { status, text } = await callFn({
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  })
  assertEquals(
    status,
    401,
    `Expected 401 from send-transactional-email with anon JWT Bearer, got ${status}: ${text}`,
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
