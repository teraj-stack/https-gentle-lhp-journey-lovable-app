// Integration tests for `submit-contact-form` — the ONLY anon-callable path
// that ultimately produces clinic-branded emails (see the function header
// comment for the full security rationale).
//
// We exercise the front edge of the function (validation + Turnstile),
// NOT the downstream email send. Because Turnstile verification happens
// against Cloudflare's live siteverify endpoint with the project's secret,
// we can't forge a valid Turnstile token from a test — the highest-value
// thing we can pin is the gatekeeping behaviour:
//
//   * Wrong HTTP method                       → 405
//   * Invalid JSON body                       → 400
//   * Unknown / missing formType              → 400
//   * Missing turnstileToken                  → 400
//   * Bogus turnstileToken (Cloudflare reject)→ 403  (or 502 if outage)
//   * Tolerates being called with the anon Bearer (no service-role required)
//
// This complements `send-transactional-email/auth_hardening_test.ts`:
//   - send-transactional-email = service-role-only, hard 401 for everyone else
//   - submit-contact-form      = anon-callable, but only emits emails after
//                                Turnstile + Zod-style validation + fixed
//                                template/recipient allowlist

import 'https://deno.land/std@0.224.0/dotenv/load.ts'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const SUPABASE_URL =
  Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY =
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ??
  Deno.env.get('SUPABASE_ANON_KEY') ??
  ''

if (!SUPABASE_URL) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / SUPABASE_URL — required to reach the Edge Functions endpoint.',
  )
}

const ENDPOINT = `${SUPABASE_URL}/functions/v1/submit-contact-form`

// All anon-callable Edge Functions on Supabase require AT LEAST the anon
// publishable key on the request (gateway-level check before our code runs).
// If the local env doesn't have it, skip the suite — there is nothing
// meaningful we can assert about the function's own validation logic.
const HAS_ANON_KEY = SUPABASE_ANON_KEY.length > 0
function anonHeaders(extra: HeadersInit = {}): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  }
}

async function postRaw(body: BodyInit, headers: HeadersInit) {
  const res = await fetch(ENDPOINT, { method: 'POST', headers, body })
  const text = await res.text()
  return { status: res.status, text }
}

async function postJson(body: unknown, headers: HeadersInit = anonHeaders()) {
  return postRaw(JSON.stringify(body), headers)
}

Deno.test('[scf] submit-contact-form — GET is rejected as 405', async () => {
  if (!HAS_ANON_KEY) {
    console.warn('[scf] anon publishable key not in local env — skipping.')
    return
  }
  const res = await fetch(ENDPOINT, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  await res.text()
  assertEquals(
    res.status,
    405,
    `Expected 405 for GET ${ENDPOINT}, got ${res.status}`,
  )
})

Deno.test('[scf] submit-contact-form — invalid JSON body returns 400', async () => {
  if (!HAS_ANON_KEY) {
    console.warn('[scf] anon publishable key not in local env — skipping.')
    return
  }
  const { status, text } = await postRaw('this is not json', anonHeaders())
  assertEquals(status, 400, `Expected 400 for invalid JSON, got ${status}: ${text}`)
})

Deno.test('[scf] submit-contact-form — missing/unknown formType returns 400', async () => {
  if (!HAS_ANON_KEY) {
    console.warn('[scf] anon publishable key not in local env — skipping.')
    return
  }
  for (const payload of [
    {}, // missing
    { formType: 'unknown' }, // unknown literal
    { formType: 'admin' }, // attempt to widen allowlist
  ]) {
    const { status, text } = await postJson(payload)
    assertEquals(
      status,
      400,
      `Expected 400 for invalid formType=${JSON.stringify(payload)}, got ${status}: ${text}`,
    )
  }
})

Deno.test('[scf] submit-contact-form — missing turnstileToken returns 400', async () => {
  if (!HAS_ANON_KEY) {
    console.warn('[scf] anon publishable key not in local env — skipping.')
    return
  }
  const { status, text } = await postJson({
    formType: 'contact',
    email: 'qa+scf@example.invalid',
    message: 'hello',
  })
  assertEquals(
    status,
    400,
    `Expected 400 when turnstileToken is missing, got ${status}: ${text}`,
  )
})

Deno.test('[scf] submit-contact-form — bogus turnstileToken is rejected by Cloudflare (403)', async () => {
  // This call is real: it goes out to Cloudflare's siteverify API with the
  // project's TURNSTILE_SECRET_KEY and a fake response token. Cloudflare
  // returns success=false and the function maps that to 403.
  // If Cloudflare itself is unreachable, the function returns 502 — we
  // accept either as a "Turnstile gate held" signal.
  if (!HAS_ANON_KEY) {
    console.warn('[scf] anon publishable key not in local env — skipping.')
    return
  }
  const { status, text } = await postJson({
    formType: 'contact',
    turnstileToken: 'bogus-token-from-integration-test',
    email: 'qa+scf-bogus@example.invalid',
    message: 'hello',
  })
  // The function MUST NOT have proceeded past Turnstile (no 200 / 2xx).
  // 403 = Cloudflare rejected, 502/503 = Cloudflare unreachable or
  // TURNSTILE_SECRET_KEY unset. All three prove the gate held.
  assert(
    status >= 400 && status < 600,
    `submit-contact-form returned non-error status ${status} with a bogus Turnstile token — ` +
      `Open Email Relay regression risk. Body: ${text}`,
  )
  assert(
    [403, 502, 503].includes(status),
    `Expected 403/502/503 (Turnstile rejected or unavailable), got ${status}: ${text}`,
  )
})

Deno.test('[scf] submit-contact-form — does NOT require service-role auth (anon Bearer is sufficient to be parsed)', async () => {
  // Negative-of-a-negative: prove this function is NOT mistakenly hardened
  // to service-role-only. With anon Bearer + missing Turnstile we expect a
  // 400 from our own validation — NOT a 401 from a service-role gate.
  if (!HAS_ANON_KEY) {
    console.warn('[scf] anon publishable key not in local env — skipping.')
    return
  }
  const { status, text } = await postJson({ formType: 'contact' })
  assert(
    status !== 401,
    `submit-contact-form unexpectedly returned 401 to an anon caller — ` +
      `that would break the public contact form. Body: ${text}`,
  )
  // We expect 400 (missing turnstileToken). Allow 400/403/422 to keep this
  // resilient if validation order changes.
  assert(
    [400, 403, 422].includes(status),
    `Expected 400/403/422 from anon caller with incomplete payload, got ${status}: ${text}`,
  )
})
