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

Deno.test('unauthorizedResponse — body is canonical JSON.stringify(UNAUTHORIZED_BODY) regardless of helper refactors', async () => {
  // Contract: the wire body must always equal the canonical
  // `JSON.stringify(UNAUTHORIZED_BODY)` — i.e. the same key insertion
  // order as the source constant, no pretty-printing, no whitespace,
  // no replacer-driven reordering. If a future refactor swaps the helper
  // to e.g. `JSON.stringify({ code, error })`, hand-builds the string,
  // or pretty-prints, this test fails before deploy.
  //
  // We assert THREE independent angles so the contract can't drift
  // silently if just one of them is "fixed" without updating the others:
  //   1. byte-for-byte equality with JSON.stringify(UNAUTHORIZED_BODY)
  //   2. key order on the wire matches Object.keys(UNAUTHORIZED_BODY)
  //   3. parsed body deep-equals the source constant

  const expected = JSON.stringify(UNAUTHORIZED_BODY)
  const res = unauthorizedResponse(SAMPLE_CORS)
  const text = await res.text()

  // 1) Exact byte equality with canonical stringify.
  assertEquals(
    text,
    expected,
    'wire body must be byte-equal to JSON.stringify(UNAUTHORIZED_BODY)',
  )

  // 2) Key order on the wire must match Object.keys(UNAUTHORIZED_BODY).
  // Extract keys in the order they appear in the serialized JSON via a
  // regex over the top-level "key": pattern — this is independent of
  // JSON.parse (which would normalise into an object and lose order on
  // some engines).
  const wireKeyOrder = [...text.matchAll(/"([^"\\]+)"\s*:/g)].map((m) => m[1])
  assertEquals(
    wireKeyOrder,
    Object.keys(UNAUTHORIZED_BODY),
    'serialized key order must match Object.keys(UNAUTHORIZED_BODY)',
  )

  // 3) Parsed body deep-equals the source constant.
  assertEquals(JSON.parse(text), UNAUTHORIZED_BODY)
})

Deno.test('unauthorizedResponse — preserves CORS headers regardless of caller-supplied casing', async () => {
  // HTTP header names are case-insensitive (RFC 7230 §3.2). Callers in
  // this codebase pass cors maps with inconsistent casing — some use the
  // canonical `Access-Control-Allow-Origin`, others the all-lowercase
  // `access-control-allow-origin`, and a few mixed-case oddities like
  // `Access-Control-Expose-Headers`. The helper must round-trip every
  // value to the wire without dropping any header, regardless of casing.
  //
  // Note: Fetch's `Headers` class normalises names to lowercase on
  // storage and `.get()` lookup, so we assert via lowercase keys — but
  // the INPUT casing is intentionally varied to prove the helper does
  // not, e.g., string-compare keys before forwarding.

  const mixedCaseCors = {
    'Access-Control-Allow-Origin': 'https://cml.pl',
    'access-control-allow-headers': 'authorization, apikey, content-type',
    'ACCESS-CONTROL-ALLOW-METHODS': 'POST, OPTIONS',
    'Access-control-Expose-Headers': 'x-request-id',
    'access-Control-Max-Age': '86400',
    'X-Custom-CORS-Header': 'preserved',
  }

  const res = unauthorizedResponse(mixedCaseCors)

  // Status + content-type contract still holds.
  assertEquals(res.status, 401)
  assertEquals(res.headers.get('content-type'), 'application/json')

  // Every caller-supplied header must be retrievable via its
  // case-insensitive lookup, with the original VALUE intact.
  for (const [name, value] of Object.entries(mixedCaseCors)) {
    assertEquals(
      res.headers.get(name),
      value,
      `header "${name}" must be preserved verbatim regardless of input casing`,
    )
    // And via the canonical lowercase form (proves Headers normalisation
    // didn't silently drop the entry).
    assertEquals(
      res.headers.get(name.toLowerCase()),
      value,
      `header "${name}" must be retrievable via its lowercase form`,
    )
  }

  // Sanity: total count of caller-supplied headers present on the
  // response equals the input count (no dedup / loss). +1 for the
  // helper-injected Content-Type.
  const wireNames = new Set<string>()
  res.headers.forEach((_v, k) => wireNames.add(k.toLowerCase()))
  const expectedNames = new Set(
    [...Object.keys(mixedCaseCors).map((k) => k.toLowerCase()), 'content-type'],
  )
  assertEquals(wireNames, expectedNames)

  await res.text()
})

Deno.test('unauthorizedResponse — case-only duplicate CORS headers: last write wins, others preserved', async () => {
  // Real-world scenario: a caller composes their cors map by spreading a
  // shared base and then overriding one entry with a differently-cased
  // key, e.g.
  //
  //   { ...BASE_CORS, 'access-control-allow-origin': dynamicOrigin }
  //
  // where BASE_CORS contains 'Access-Control-Allow-Origin'. Both entries
  // survive the object literal (different string keys), get spread into
  // `new Headers({...})` inside the helper, and Headers normalises both
  // names to the same lowercase form. Per the Fetch spec, sequential
  // `set()`-equivalent inserts of the same (normalised) name keep the
  // LAST value — never concatenate, never drop, never throw.
  //
  // This test pins that behaviour at the helper boundary so a future
  // refactor can't silently switch to e.g. `.append()` (which would
  // join values with ", " and break clients) or to a key-dedup pass
  // that picks the FIRST value (which would make spread-overrides a
  // no-op and silently break dynamic origin selection).
  //
  // We also assert that NO OTHER headers in the bag are lost as a side
  // effect of resolving the duplicate.

  const corsWithCasingDuplicates: Record<string, string> = {
    // Pair 1: canonical first, lowercase override second → lowercase wins.
    'Access-Control-Allow-Origin': 'https://first.example',
    'access-control-allow-origin': 'https://second.example',
    // Pair 2: lowercase first, UPPERCASE override second → UPPERCASE wins.
    'access-control-allow-headers': 'authorization, content-type',
    'ACCESS-CONTROL-ALLOW-HEADERS': 'authorization, apikey, content-type, x-extra',
    // Pair 3: three variants — last (mixed-case) must win.
    'access-control-allow-methods': 'GET',
    'Access-Control-Allow-Methods': 'GET, POST',
    'ACCESS-control-allow-METHODS': 'GET, POST, OPTIONS',
    // Untouched bystanders that must survive the dedup unchanged.
    'Access-Control-Max-Age': '3600',
    'X-Custom-CORS-Header': 'preserved',
  }

  const res = unauthorizedResponse(corsWithCasingDuplicates)

  // Status + content-type contract still holds.
  assertEquals(res.status, 401)
  assertEquals(res.headers.get('content-type'), 'application/json')

  // Last-write-wins for each duplicated logical header.
  assertEquals(
    res.headers.get('access-control-allow-origin'),
    'https://second.example',
    'duplicate CORS origin: last entry (lowercase) must win',
  )
  assertEquals(
    res.headers.get('access-control-allow-headers'),
    'authorization, apikey, content-type, x-extra',
    'duplicate allow-headers: last entry (UPPERCASE) must win',
  )
  assertEquals(
    res.headers.get('access-control-allow-methods'),
    'GET, POST, OPTIONS',
    'triple-duplicate allow-methods: final mixed-case entry must win',
  )

  // CRITICAL: values must NOT be concatenated with ", " (which would
  // happen if the helper accidentally used Headers.append() or merged
  // duplicates). Guard explicitly against the most likely drift modes.
  const origin = res.headers.get('access-control-allow-origin') ?? ''
  assert(
    !origin.includes('first.example'),
    `origin must drop the earlier value, got "${origin}"`,
  )
  assert(
    !origin.includes(','),
    `origin must not be a concatenation of duplicates, got "${origin}"`,
  )
  const allowMethods = res.headers.get('access-control-allow-methods') ?? ''
  // Last value legitimately contains commas ("GET, POST, OPTIONS"), so
  // assert it equals exactly the final entry — not a join of all three.
  assert(
    !allowMethods.includes('GET, POST, OPTIONS, GET'),
    `allow-methods must not concatenate duplicates, got "${allowMethods}"`,
  )

  // Bystander headers (no duplicates) must be untouched.
  assertEquals(res.headers.get('access-control-max-age'), '3600')
  assertEquals(res.headers.get('x-custom-cors-header'), 'preserved')

  // Sanity: the wire must contain exactly one entry per LOGICAL header
  // name (after lowercase normalisation), plus the helper-injected
  // Content-Type. No duplicates leak through, no bystanders dropped.
  const wireNames: string[] = []
  res.headers.forEach((_v, k) => wireNames.push(k.toLowerCase()))
  const expectedLogicalNames = [
    'access-control-allow-origin',
    'access-control-allow-headers',
    'access-control-allow-methods',
    'access-control-max-age',
    'x-custom-cors-header',
    'content-type',
  ].sort()
  assertEquals(
    wireNames.sort(),
    expectedLogicalNames,
    'wire headers must be exactly the deduplicated logical set + content-type',
  )

  await res.text()
})
