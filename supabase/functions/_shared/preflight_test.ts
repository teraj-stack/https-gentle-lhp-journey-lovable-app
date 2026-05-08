// Pure unit test for the shared CORS preflight (OPTIONS) response builder
// `preflightResponse` from `_shared/preflight.ts`.
//
// Asserted contract (anchors a property every protected function relies on):
//   * status:    204 No Content
//   * body:      empty (No Content semantics; .text() === '')
//   * headers:   every caller-supplied CORS header preserved verbatim
//                (case-insensitively retrievable per Headers API)
//   * helper does NOT invent CORS headers when caller passes `{}`
//   * helper does NOT inject `Content-Type` (no body to type)
//   * does NOT depend on Authorization — preflight succeeds without auth
//
// The last point is the most important: per the Fetch spec, the browser
// sends the preflight BEFORE attaching `Authorization`, so a function
// that returned 401 on OPTIONS would break CORS for every browser caller.
// We exercise this by passing zero auth-related state — the helper has
// no way to read `req`, so the test trivially proves the contract holds.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { preflightResponse } from './preflight.ts'

const FULL_CORS = {
  'Access-Control-Allow-Origin': 'https://cml.pl',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
}

Deno.test('preflightResponse — status is 204 No Content', async () => {
  const res = preflightResponse(FULL_CORS)
  assertEquals(res.status, 204)
  await res.text()
})

Deno.test('preflightResponse — body is empty (No Content semantics)', async () => {
  const res = preflightResponse(FULL_CORS)
  assertEquals(
    await res.text(),
    '',
    '204 preflight must have an empty body — No Content forbids any payload',
  )
})

Deno.test('preflightResponse — preserves the full set of CORS headers verbatim', async () => {
  const res = preflightResponse(FULL_CORS)
  for (const [name, value] of Object.entries(FULL_CORS)) {
    assertEquals(
      res.headers.get(name),
      value,
      `preflight must preserve "${name}" verbatim, got ${JSON.stringify(res.headers.get(name))}`,
    )
  }
  await res.text()
})

Deno.test('preflightResponse — does NOT inject Content-Type (no body to type)', async () => {
  // Unlike `unauthorizedResponse`, which appends `Content-Type:
  // application/json` after spreading caller headers, preflight has no
  // body — adding a Content-Type would be misleading and some strict
  // CDN/proxy combos reject 204 with a Content-Length/Type mismatch.
  const res = preflightResponse(FULL_CORS)
  assertEquals(
    res.headers.get('content-type'),
    null,
    'preflight (204, empty body) must not declare a Content-Type',
  )
  await res.text()
})

Deno.test('preflightResponse({}) — 204 + ZERO CORS headers invented', async () => {
  // Mirrors the `unauthorizedResponse({})` contract: when the caller
  // passes an empty record, the helper must NOT invent any
  // Access-Control-* headers on its own. Server-to-server functions
  // that deliberately skip CORS would otherwise be silently broadened.
  //
  // The only valid header on the wire here is whatever the runtime
  // attaches automatically (none of the CORS family).
  const res = preflightResponse({})

  // Core contract.
  assertEquals(res.status, 204)
  assertEquals(await res.text(), '')

  // Spot-check every CORS header the codebase ever sets.
  const forbiddenCorsHeaders = [
    'access-control-allow-origin',
    'access-control-allow-headers',
    'access-control-allow-methods',
    'access-control-allow-credentials',
    'access-control-expose-headers',
    'access-control-max-age',
    'vary',
  ]
  for (const name of forbiddenCorsHeaders) {
    assertEquals(
      res.headers.get(name),
      null,
      `preflight helper must not invent "${name}" when caller passes {}`,
    )
  }
  // And no Content-Type either.
  assertEquals(res.headers.get('content-type'), null)
})

Deno.test('preflightResponse — succeeds WITHOUT Authorization (preflight contract)', async () => {
  // The single most important guarantee: the preflight must NEVER
  // depend on auth. Browsers send OPTIONS without `Authorization`,
  // and a 401 here would break CORS for every browser caller.
  //
  // The helper signature has no `req` parameter, so it CANNOT read
  // auth headers — that already proves the contract by construction.
  // We additionally assert at runtime that:
  //   1. status is the success-class 204 (NOT 401);
  //   2. status is in the 2xx success range generally (catches a
  //      future refactor that switches to 200 etc.);
  //   3. the response carries the full CORS bundle so the browser
  //      can proceed to send the real (authenticated) request.
  const res = preflightResponse(FULL_CORS)

  assert(
    res.status !== 401,
    'preflight must NEVER return 401 — browsers send OPTIONS unauthenticated',
  )
  assert(
    res.status >= 200 && res.status < 300,
    `preflight must return a 2xx status, got ${res.status}`,
  )
  // Browser-required CORS headers must be present so the real request
  // can follow. We only check the three the browser actually inspects
  // for a preflight to pass: Allow-Origin, Allow-Methods, Allow-Headers.
  assertEquals(res.headers.get('access-control-allow-origin'), 'https://cml.pl')
  assertEquals(res.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS')
  assertEquals(
    res.headers.get('access-control-allow-headers'),
    'authorization, x-client-info, apikey, content-type',
  )

  await res.text()
})

Deno.test('preflightResponse — produces a fresh Response on each call', async () => {
  // Responses are single-use (body can only be read once, even if
  // empty). Verify the helper is not memoising a shared instance.
  const a = preflightResponse(FULL_CORS)
  const b = preflightResponse(FULL_CORS)
  assert(a !== b, 'each call must return a new Response instance')
  assertEquals(await a.text(), '')
  assertEquals(await b.text(), '')
})

Deno.test('preflightResponse — preserves CORS headers regardless of caller-supplied casing', async () => {
  // HTTP header names are case-insensitive (RFC 7230 §3.2). Mirrors the
  // case-handling contract pinned for `unauthorizedResponse`. Callers
  // in this codebase pass cors maps with mixed casing — the preflight
  // helper must round-trip every value without dropping any header.
  const mixedCaseCors = {
    'Access-Control-Allow-Origin': 'https://cml.pl',
    'access-control-allow-headers': 'authorization, apikey',
    'ACCESS-CONTROL-ALLOW-METHODS': 'POST, OPTIONS',
    'Access-control-Max-Age': '3600',
  }
  const res = preflightResponse(mixedCaseCors)
  assertEquals(res.status, 204)
  for (const [name, value] of Object.entries(mixedCaseCors)) {
    assertEquals(
      res.headers.get(name),
      value,
      `preflight must preserve "${name}" regardless of input casing`,
    )
    assertEquals(
      res.headers.get(name.toLowerCase()),
      value,
      `preflight must expose "${name}" via canonical lowercase form`,
    )
  }
  await res.text()
})

Deno.test('preflightResponse — propagates Access-Control-Max-Age verbatim to the OPTIONS response', async () => {
  // The whole point of advertising `Access-Control-Max-Age` is to let
  // the browser cache the preflight result and skip the OPTIONS
  // round-trip for subsequent same-origin/same-method/same-headers
  // requests within the cache window. If the helper dropped or
  // rewrote the value, every browser caller would silently lose that
  // optimisation — there would be no error, just doubled latency and
  // doubled edge-function invocations.
  //
  // We assert two things at once:
  //   1. A caller-supplied Max-Age survives verbatim (string identity).
  //   2. The default `corsHeaders` exported from `_shared/cors.ts`
  //      already carries a non-empty, integer-seconds Max-Age — so
  //      every function that uses `preflightResponse(corsHeaders)`
  //      benefits from caching by default, with no per-function
  //      boilerplate.
  const { corsHeaders, CORS_MAX_AGE_SECONDS } = await import('./cors.ts')

  // (1) Caller-supplied value round-trips unchanged.
  const customMaxAge = '3600'
  const resCustom = preflightResponse({
    ...FULL_CORS,
    'Access-Control-Max-Age': customMaxAge,
  })
  assertEquals(resCustom.status, 204)
  assertEquals(
    resCustom.headers.get('access-control-max-age'),
    customMaxAge,
    'caller-supplied Access-Control-Max-Age must survive verbatim on the OPTIONS response',
  )
  await resCustom.text()

  // (2) Default `corsHeaders` already carry a sane Max-Age.
  const resDefault = preflightResponse(corsHeaders)
  const defaultMaxAge = resDefault.headers.get('access-control-max-age')
  assertEquals(
    defaultMaxAge,
    String(CORS_MAX_AGE_SECONDS),
    'default corsHeaders must advertise Access-Control-Max-Age = CORS_MAX_AGE_SECONDS',
  )
  // Sanity: the value is a positive integer number of seconds, not a
  // bogus string like "24h" or "" that browsers would silently ignore.
  assert(
    defaultMaxAge !== null && /^[1-9]\d*$/.test(defaultMaxAge),
    `Access-Control-Max-Age must be a positive integer seconds string, got ${JSON.stringify(defaultMaxAge)}`,
  )
  await resDefault.text()
})

Deno.test('preflightResponse — returns 2xx for OPTIONS regardless of Authorization presence/absence', async () => {
  // Belt-and-braces version of the "succeeds WITHOUT Authorization"
  // test: explicitly simulate the two real-world scenarios the browser
  // can produce for a preflight request and assert the helper's status
  // is in the 2xx success range in BOTH cases.
  //
  // Scenario A: no Authorization header at all (the spec-mandated
  //   browser behaviour — preflight is sent BEFORE auth is attached).
  // Scenario B: Authorization header present but bogus (e.g. expired
  //   bearer token, or a non-browser client that mistakenly attaches
  //   auth to its OPTIONS probe). The preflight contract still
  //   requires success — the real request is what gets rejected.
  //
  // The helper takes no Request, so the only way to "thread" the
  // header into the test is via the simulated incoming request the
  // caller's `Deno.serve` handler would inspect. We model that by
  // constructing the requests and asserting that — for either one —
  // the helper-produced response is 2xx.
  const corsForRealRoute = {
    'Access-Control-Allow-Origin': 'https://cml.pl',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  const optionsWithoutAuth = new Request('https://example.test/fn', {
    method: 'OPTIONS',
  })
  const optionsWithBogusAuth = new Request('https://example.test/fn', {
    method: 'OPTIONS',
    headers: { Authorization: 'Bearer not-a-real-token' },
  })

  for (const req of [optionsWithoutAuth, optionsWithBogusAuth]) {
    // Sanity: both requests really are OPTIONS (rules out a typo in
    // the test setup that would silently bypass the assertion).
    assertEquals(req.method, 'OPTIONS')

    const res = preflightResponse(corsForRealRoute)
    assert(
      res.status >= 200 && res.status < 300,
      `OPTIONS preflight must return 2xx regardless of Authorization, got ${res.status} (auth header: ${JSON.stringify(req.headers.get('authorization'))})`,
    )
    // Pin the canonical choice too — if a future refactor switches
    // from 204 to 200, that's a deliberate change the author should
    // see fail here and update intentionally.
    assertEquals(
      res.status,
      204,
      `preflight should specifically be 204 No Content (auth header: ${JSON.stringify(req.headers.get('authorization'))})`,
    )
    await res.text()
  }
})
