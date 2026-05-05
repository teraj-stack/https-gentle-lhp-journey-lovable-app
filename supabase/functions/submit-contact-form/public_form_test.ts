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
//
// All request setup goes through the shared helpers in
// `_shared/auth_test_helpers.ts` so adding a new check is a one-liner and
// the request shape stays consistent with the other Edge Function suites.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  CallResult,
  HAS_ANON_KEY,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  callFunction,
  sendRequest,
} from '../_shared/auth_test_helpers.ts'

const FN = 'submit-contact-form'

/**
 * Build the standard anon-caller header set: Supabase API gateway requires
 * BOTH `apikey` and `Authorization: Bearer <anon>` for anon-callable
 * functions to even reach our handler.
 */
function anonHeaders(extra: HeadersInit = {}): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...(extra as Record<string, string>),
  }
}

/**
 * Send a JSON POST through the shared `callFunction` helper, with the
 * standard anon caller headers. Mirrors `callFunction`'s `CallResult`
 * contract so assertions stay uniform across all Edge Function tests.
 */
function postJson(body: unknown, extra: HeadersInit = {}): Promise<CallResult> {
  return callFunction(FN, anonHeaders(extra), body)
}

/**
 * Send a raw (non-JSON) body to exercise the invalid-JSON path. Goes
 * through the shared `sendRequest` so response handling (body consumption,
 * header capture for CORS asserts) matches every other suite.
 */
function postRaw(body: BodyInit, extra: HeadersInit = {}): Promise<CallResult> {
  const headers = new Headers(anonHeaders(extra))
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const req = new Request(`${SUPABASE_URL}/functions/v1/${FN}`, {
    method: 'POST',
    headers,
    body,
  })
  return sendRequest(req)
}

/** Skip-with-warning if the local env can't reach the gateway at all. */
function skipIfNoAnonKey(): boolean {
  if (HAS_ANON_KEY) return false
  console.warn(`[scf] ${FN}: anon publishable key not in local env — skipping.`)
  return true
}

Deno.test(`[scf] ${FN} — GET is rejected as 405`, async () => {
  if (skipIfNoAnonKey()) return
  // GET path: bypass POST-only helpers and hit the endpoint directly via
  // sendRequest so the body-consumption / header-capture contract still
  // matches the rest of the suite.
  const req = new Request(`${SUPABASE_URL}/functions/v1/${FN}`, {
    method: 'GET',
    headers: new Headers(anonHeaders()),
  })
  const { status, text } = await sendRequest(req)
  assertEquals(status, 405, `Expected 405 for GET ${FN}, got ${status}: ${text}`)
})

Deno.test(`[scf] ${FN} — invalid JSON body returns 400`, async () => {
  if (skipIfNoAnonKey()) return
  const { status, text } = await postRaw('this is not json')
  assertEquals(status, 400, `Expected 400 for invalid JSON, got ${status}: ${text}`)
})

Deno.test(`[scf] ${FN} — missing/unknown formType returns 400`, async () => {
  if (skipIfNoAnonKey()) return
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

Deno.test(`[scf] ${FN} — missing turnstileToken returns 400`, async () => {
  if (skipIfNoAnonKey()) return
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

Deno.test(`[scf] ${FN} — bogus turnstileToken is rejected by Cloudflare (403)`, async () => {
  // This call is real: it goes out to Cloudflare's siteverify API with the
  // project's TURNSTILE_SECRET_KEY and a fake response token. Cloudflare
  // returns success=false and the function maps that to 403.
  // If Cloudflare itself is unreachable, the function returns 502 — we
  // accept either as a "Turnstile gate held" signal.
  if (skipIfNoAnonKey()) return
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
    `${FN} returned non-error status ${status} with a bogus Turnstile token — ` +
      `Open Email Relay regression risk. Body: ${text}`,
  )
  assert(
    [403, 502, 503].includes(status),
    `Expected 403/502/503 (Turnstile rejected or unavailable), got ${status}: ${text}`,
  )
})

Deno.test(
  `[scf] ${FN} — does NOT require service-role auth (anon Bearer is sufficient to be parsed)`,
  async () => {
    // Negative-of-a-negative: prove this function is NOT mistakenly hardened
    // to service-role-only. With anon Bearer + missing Turnstile we expect a
    // 400 from our own validation — NOT a 401 from a service-role gate.
    if (skipIfNoAnonKey()) return
    const { status, text } = await postJson({ formType: 'contact' })
    assert(
      status !== 401,
      `${FN} unexpectedly returned 401 to an anon caller — ` +
        `that would break the public contact form. Body: ${text}`,
    )
    // We expect 400 (missing turnstileToken). Allow 400/403/422 to keep this
    // resilient if validation order changes.
    assert(
      [400, 403, 422].includes(status),
      `Expected 400/403/422 from anon caller with incomplete payload, got ${status}: ${text}`,
    )
  },
)
