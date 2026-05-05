// Pure unit test for the unified 401 response builder used by every
// protected Edge Function (`unauthorizedResponse` + `UNAUTHORIZED_BODY`
// from `_shared/unauthorized.ts`).
//
// The integration matrix in `_shared/auth_bearer_test.ts` already proves
// that each deployed function returns this contract over the wire — but
// that suite needs network + a live deployment. This test pins the
// contract at the source so any local change to the helper fails CI
// before deploy.
//
// Asserted contract:
//   * status:                401
//   * Content-Type:          application/json (exact match)
//   * arbitrary CORS headers passed in are preserved verbatim
//   * body parses as JSON and equals { error: "Unauthorized", code: "unauthorized" }
//   * body is the EXACT byte sequence (no whitespace / key reordering drift)
//   * UNAUTHORIZED_BODY is the same object the response is built from

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { UNAUTHORIZED_BODY, unauthorizedResponse } from './unauthorized.ts'

const SAMPLE_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.test('UNAUTHORIZED_BODY is the canonical { error, code } shape', () => {
  assertEquals(UNAUTHORIZED_BODY, { error: 'Unauthorized', code: 'unauthorized' })
})

Deno.test('unauthorizedResponse — status is 401', async () => {
  const res = unauthorizedResponse(SAMPLE_CORS)
  assertEquals(res.status, 401)
  await res.text() // consume to avoid resource leak
})

Deno.test('unauthorizedResponse — Content-Type is exactly application/json', async () => {
  const res = unauthorizedResponse(SAMPLE_CORS)
  assertEquals(res.headers.get('content-type'), 'application/json')
  await res.text()
})

Deno.test('unauthorizedResponse — preserves all CORS headers verbatim', async () => {
  const res = unauthorizedResponse(SAMPLE_CORS)
  assertEquals(
    res.headers.get('access-control-allow-origin'),
    SAMPLE_CORS['Access-Control-Allow-Origin'],
  )
  assertEquals(
    res.headers.get('access-control-allow-headers'),
    SAMPLE_CORS['Access-Control-Allow-Headers'],
  )
  await res.text()
})

Deno.test('unauthorizedResponse — body parses to { error, code } exactly', async () => {
  const res = unauthorizedResponse(SAMPLE_CORS)
  const body = await res.json()
  assertEquals(body, { error: 'Unauthorized', code: 'unauthorized' })
})

Deno.test('unauthorizedResponse — body bytes match canonical JSON encoding', async () => {
  const res = unauthorizedResponse(SAMPLE_CORS)
  const text = await res.text()
  // Pin the exact serialized form so an accidental switch to e.g. pretty-
  // printing (`JSON.stringify(x, null, 2)`) or key reordering fails fast.
  assertEquals(text, '{"error":"Unauthorized","code":"unauthorized"}')
})

Deno.test('unauthorizedResponse — works with empty cors header bag', async () => {
  const res = unauthorizedResponse({})
  assertEquals(res.status, 401)
  assertEquals(res.headers.get('content-type'), 'application/json')
  // No CORS headers should be invented when caller provides none.
  assertEquals(res.headers.get('access-control-allow-origin'), null)
  assertEquals(await res.text(), '{"error":"Unauthorized","code":"unauthorized"}')
})

Deno.test('unauthorizedResponse — caller cannot accidentally override Content-Type to non-JSON', async () => {
  // Current contract: helper appends `Content-Type: application/json` AFTER
  // spreading caller's cors headers, so a caller-supplied Content-Type is
  // overridden. Lock this behaviour in — drift here would let a function
  // accidentally serve text/plain on 401, breaking machine-readable error
  // handling for clients.
  const res = unauthorizedResponse({
    ...SAMPLE_CORS,
    'Content-Type': 'text/plain',
  })
  assertEquals(res.headers.get('content-type'), 'application/json')
  await res.text()
})

Deno.test('unauthorizedResponse — produces a fresh Response on each call', async () => {
  // Responses are single-use (body can only be read once). Verify the
  // helper is not memoising / sharing a Response instance.
  const a = unauthorizedResponse(SAMPLE_CORS)
  const b = unauthorizedResponse(SAMPLE_CORS)
  assert(a !== b, 'each call must return a new Response instance')
  assertEquals(await a.text(), await b.text())
})
