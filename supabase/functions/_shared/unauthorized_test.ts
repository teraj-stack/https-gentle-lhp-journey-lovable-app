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

Deno.test('unauthorizedResponse({}) — 401 + application/json, ZERO CORS headers invented', async () => {
  // Strict version of the "empty cors header bag" contract: when the
  // caller passes an empty record, the helper must NOT invent any
  // Access-Control-* headers on its own. The only header on the wire
  // should be the helper-injected `Content-Type: application/json`.
  //
  // Why this matters:
  //   * Some protected functions are server-to-server only and
  //     deliberately skip CORS — silently injecting e.g.
  //     `Access-Control-Allow-Origin: *` would broaden the function's
  //     attack surface in the browser without anyone noticing.
  //   * If a future refactor adds a "default cors" fallback inside the
  //     helper, every caller that opts out by passing `{}` would suddenly
  //     start emitting CORS — this test catches that drift.
  //
  // We assert THREE independent angles:
  //   1. Status + content-type contract still holds.
  //   2. No specific CORS header is present (spot-check canonical names).
  //   3. Full enumeration of headers on the wire equals exactly
  //      { 'content-type' } — no extras of any kind.

  const res = unauthorizedResponse({})

  // 1) Core contract.
  assertEquals(res.status, 401)
  assertEquals(res.headers.get('content-type'), 'application/json')

  // 2) Spot-check every CORS header the codebase ever sets.
  const forbiddenCorsHeaders = [
    'access-control-allow-origin',
    'access-control-allow-headers',
    'access-control-allow-methods',
    'access-control-allow-credentials',
    'access-control-expose-headers',
    'access-control-max-age',
  ]
  for (const name of forbiddenCorsHeaders) {
    assertEquals(
      res.headers.get(name),
      null,
      `helper must not invent "${name}" when caller passes {}`,
    )
  }

  // 3) Full enumeration: only `content-type` should be on the wire.
  // Catches arbitrary header injection (e.g. a debug `x-...` header
  // sneaking in via a future refactor) that a spot-check would miss.
  const wireNames: string[] = []
  res.headers.forEach((_v, k) => wireNames.push(k.toLowerCase()))
  assertEquals(
    wireNames.sort(),
    ['content-type'],
    `unauthorizedResponse({}) must emit exactly one header (content-type), got: ${wireNames.join(', ')}`,
  )

  // Body still matches canonical contract.
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

Deno.test('unauthorizedResponse — case-only duplicate CORS headers: values combined per Headers spec, no header lost', async () => {
  // Real-world scenario: a caller composes their cors map by spreading a
  // shared base and then "overriding" one entry with a differently-cased
  // key, e.g.
  //
  //   { ...BASE_CORS, 'access-control-allow-origin': dynamicOrigin }
  //
  // where BASE_CORS contains 'Access-Control-Allow-Origin'. Both entries
  // survive the JS object literal (different string keys) and get spread
  // into `new Headers({...})` inside the helper.
  //
  // Per the WHATWG Fetch spec, `new Headers(init)` iterates the init
  // record in insertion order and calls `append()` for each entry —
  // NOT `set()`. After name normalisation to lowercase, duplicates are
  // therefore COMBINED into a single header value joined by ", " in
  // insertion order. No entry is dropped, none throws.
  //
  // This test pins that exact behaviour at the helper boundary so:
  //   * a future refactor can't silently switch to a dedup pass that
  //     picks one entry and drops the others (which would silently
  //     break callers relying on spread-merge semantics);
  //   * callers reading this test learn the pitfall: case-only
  //     "overrides" do NOT replace — they CONCATENATE. The fix is to
  //     normalise their cors map keys before passing it in.
  //
  // We also assert that NO OTHER (non-duplicated) headers in the bag
  // are lost as a side effect of resolving the duplicates.

  const corsWithCasingDuplicates: Record<string, string> = {
    // Pair: canonical first, lowercase second.
    'Access-Control-Allow-Origin': 'https://first.example',
    'access-control-allow-origin': 'https://second.example',
    // Triple: lowercase, canonical, mixed-case — all three combined.
    'access-control-allow-methods': 'GET',
    'Access-Control-Allow-Methods': 'POST',
    'ACCESS-control-allow-METHODS': 'OPTIONS',
    // Untouched bystanders that must survive the combine unchanged.
    'Access-Control-Max-Age': '3600',
    'X-Custom-CORS-Header': 'preserved',
  }

  const res = unauthorizedResponse(corsWithCasingDuplicates)

  // Status + content-type contract still holds.
  assertEquals(res.status, 401)
  assertEquals(res.headers.get('content-type'), 'application/json')

  // Per Fetch spec: duplicates (after lowercase normalisation) are
  // combined with ", " in insertion order. Verify both pairs.
  assertEquals(
    res.headers.get('access-control-allow-origin'),
    'https://first.example, https://second.example',
    'case-only duplicate origins must be combined in insertion order',
  )
  assertEquals(
    res.headers.get('access-control-allow-methods'),
    'GET, POST, OPTIONS',
    'triple case-only duplicate methods must be combined in insertion order',
  )

  // CRITICAL: no value may be silently dropped. Both/all entries must
  // appear in the combined value. Guards against a future refactor
  // switching to a dedup pass that picks just one entry.
  const origin = res.headers.get('access-control-allow-origin') ?? ''
  assert(
    origin.includes('https://first.example'),
    `combined origin must retain the first entry, got "${origin}"`,
  )
  assert(
    origin.includes('https://second.example'),
    `combined origin must retain the second entry, got "${origin}"`,
  )
  const allowMethods = res.headers.get('access-control-allow-methods') ?? ''
  for (const method of ['GET', 'POST', 'OPTIONS']) {
    assert(
      allowMethods.includes(method),
      `combined allow-methods must retain "${method}", got "${allowMethods}"`,
    )
  }

  // Bystander headers (no duplicates) must be untouched.
  assertEquals(res.headers.get('access-control-max-age'), '3600')
  assertEquals(res.headers.get('x-custom-cors-header'), 'preserved')

  // Sanity: the wire must contain exactly one entry per LOGICAL header
  // name (after lowercase normalisation), plus the helper-injected
  // Content-Type. Duplicates collapse into a single combined header,
  // and no bystander is dropped.
  const wireNames: string[] = []
  res.headers.forEach((_v, k) => wireNames.push(k.toLowerCase()))
  const expectedLogicalNames = [
    'access-control-allow-origin',
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

Deno.test('unauthorizedResponse — unusual CORS values (empty, commas, internal whitespace) pass through unchanged', async () => {
  // Real-world CORS values are not always "clean ASCII tokens". Callers
  // sometimes pass:
  //   * an empty string (e.g. a feature-flagged header that is currently
  //     disabled but still emitted with a blank value),
  //   * comma-separated lists with various spacing,
  //   * non-ASCII / unicode (allowed by Fetch spec for header VALUES),
  //   * internal whitespace and tabs,
  //   * values that look like other HTTP syntax (semicolons, quotes).
  //
  // The helper must forward EVERY one of these byte-for-byte (modulo the
  // documented Headers normalisation: leading/trailing whitespace is
  // trimmed). It must NOT sanitise, escape, quote, or otherwise mutate
  // the value — that would silently break clients that rely on the
  // exact wire content for things like `Vary` lists or custom expose
  // headers.
  //
  // NOTE on `\n` / `\r\n`: per Fetch spec §header-value-validation, raw
  // CR/LF in a header value throws a `TypeError` at `new Headers(init)`
  // construction time (CRLF injection guard). That is enforced by the
  // RUNTIME, not this helper, so we don't include such values in the
  // pass-through matrix — instead we lock in that behaviour with a
  // dedicated assertion below so a future runtime change (or a helper
  // refactor that pre-sanitises values) is caught.

  const unusualCors: Record<string, string> = {
    'X-Empty-Value': '',
    'X-Comma-List': 'a, b, c, d',
    'X-Comma-Tight': 'a,b,c,d',
    // NOTE: non-ASCII / unicode values are NOT included — Fetch spec
    // requires header values to be ByteString (latin-1), and Deno
    // throws TypeError at Response construction otherwise. Callers
    // must pre-encode (e.g. percent-encoding) any non-ASCII data.
    'X-Internal-Whitespace': 'a   b\tc',
    'X-Semicolons': 'value; param=1; other="quoted"',
    'X-Long-Token': 'x'.repeat(512),
    'Access-Control-Expose-Headers': 'X-Request-Id, X-Trace-Id, X-Custom',
    'Access-Control-Max-Age': '0',
  }

  const res = unauthorizedResponse(unusualCors)

  assertEquals(res.status, 401)
  assertEquals(res.headers.get('content-type'), 'application/json')

  // Every value must round-trip verbatim. No escaping, no quoting, no
  // sanitisation. (Header-name casing is normalised by the Headers API
  // to lowercase — that is independent of value preservation.)
  for (const [name, value] of Object.entries(unusualCors)) {
    assertEquals(
      res.headers.get(name),
      value,
      `value of "${name}" must pass through unchanged (expected ${JSON.stringify(value)}, got ${JSON.stringify(res.headers.get(name))})`,
    )
  }

  // Pin documented Headers normalisation: LEADING/TRAILING whitespace
  // around a value is trimmed by `new Headers(init)`. This is part of
  // the contract callers see — assert it explicitly so a future helper
  // refactor (e.g. one that pre-pads values) doesn't silently change
  // the wire bytes.
  const trimRes = unauthorizedResponse({ 'X-Trim-Probe': '   trimmed   ' })
  assertEquals(
    trimRes.headers.get('x-trim-probe'),
    'trimmed',
    'leading/trailing whitespace is trimmed by Headers normalisation (documented contract)',
  )
  await trimRes.text()

  // Pin runtime-enforced CRLF guard: a raw newline in a value must
  // throw at construction time. The helper itself does NOT need to
  // sanitise — it relies on this guard. If the guard ever weakens,
  // this test fails and we must add explicit sanitisation in the helper.
  let threw = false
  try {
    unauthorizedResponse({ 'X-Newline': 'line1\nline2' })
  } catch (e) {
    threw = e instanceof TypeError
  }
  assert(
    threw,
    'raw \\n in CORS header value must throw TypeError (CRLF injection guard); ' +
      'if this regresses, the helper must add explicit value sanitisation',
  )

  await res.text()
})

Deno.test('unauthorizedResponse — true append-style duplicate CORS headers preserve order and join with ", "', async () => {
  // Scenario: a caller builds their CORS map by `append()`-ing the same
  // header name multiple times (the natural way to express e.g. a
  // multi-origin `Vary` list, or to combine a static base policy with a
  // dynamic per-request override). The helper accepts a `Record<string,
  // string>`, so the caller must flatten before passing — but the
  // flattened wire value MUST still preserve every appended entry in the
  // exact order they were appended, joined by ", " per Fetch spec
  // §concept-header-list-combine.
  //
  // Why we test this with a `Headers` instance as the source of truth:
  //   * `new Headers()` + `.append()` is the only API that natively
  //     models multi-valued headers in the Fetch spec.
  //   * `Headers.forEach((v, k) => obj[k] = v)` collapses duplicates
  //     into a SINGLE combined value (verified by runtime probe), so
  //     the caller's flattened `Record` already encodes the full
  //     ordered list. The helper must forward this verbatim.
  //   * If a future helper refactor decided to "clean up" comma-joined
  //     values (e.g. dedup tokens, sort alphabetically, or split on ","
  //     and re-emit one header per token), this test would fail and
  //     catch the silent breakage.
  //
  // We assert THREE independent angles:
  //   1. The combined value matches the canonical Fetch-spec join.
  //   2. Order of appended values is preserved (no sort, no dedup).
  //   3. Every individual appended value is present as a substring.

  // Build a Headers instance with three append()s on the same name plus
  // a two-append pair on a second name — covers both >2 and =2 cases.
  const source = new Headers()
  source.append('Access-Control-Allow-Origin', 'https://alpha.example')
  source.append('Access-Control-Allow-Origin', 'https://beta.example')
  source.append('Access-Control-Allow-Origin', 'https://gamma.example')
  source.append('Vary', 'Origin')
  source.append('Vary', 'Accept-Encoding')
  // Bystander: single value, must survive untouched.
  source.append('X-Custom-CORS-Header', 'preserved')

  // Caller flattens to Record<string, string> — Headers.forEach already
  // returns the combined value per spec, so this preserves order.
  const flattened: Record<string, string> = {}
  source.forEach((value, key) => {
    flattened[key] = value
  })

  // Sanity: the flattening step itself must produce the canonical join.
  // (If this assertion ever fails, the runtime changed Headers semantics
  // and the helper-level expectations below are moot.)
  assertEquals(
    flattened['access-control-allow-origin'],
    'https://alpha.example, https://beta.example, https://gamma.example',
    'Headers.forEach must yield Fetch-spec combined value (precondition)',
  )
  assertEquals(
    flattened['vary'],
    'Origin, Accept-Encoding',
    'Headers.forEach must yield Fetch-spec combined value (precondition)',
  )

  const res = unauthorizedResponse(flattened)

  // Status + content-type contract still holds.
  assertEquals(res.status, 401)
  assertEquals(res.headers.get('content-type'), 'application/json')

  // 1) Combined value matches canonical Fetch-spec join (", " separator).
  assertEquals(
    res.headers.get('access-control-allow-origin'),
    'https://alpha.example, https://beta.example, https://gamma.example',
    'three appended origins must arrive on the wire joined by ", " in append order',
  )
  assertEquals(
    res.headers.get('vary'),
    'Origin, Accept-Encoding',
    'two appended Vary tokens must arrive on the wire joined by ", " in append order',
  )

  // 2) Order is preserved — alpha BEFORE beta BEFORE gamma. Catches a
  // hypothetical refactor that sorts tokens alphabetically (which would
  // break clients relying on priority order, e.g. "preferred origin first").
  const origin = res.headers.get('access-control-allow-origin') ?? ''
  const idxAlpha = origin.indexOf('alpha.example')
  const idxBeta = origin.indexOf('beta.example')
  const idxGamma = origin.indexOf('gamma.example')
  assert(
    idxAlpha >= 0 && idxBeta > idxAlpha && idxGamma > idxBeta,
    `append order must be preserved (alpha < beta < gamma), got "${origin}"`,
  )
  const vary = res.headers.get('vary') ?? ''
  assert(
    vary.indexOf('Origin') >= 0 && vary.indexOf('Accept-Encoding') > vary.indexOf('Origin'),
    `Vary append order must be preserved (Origin < Accept-Encoding), got "${vary}"`,
  )

  // 3) Every individual appended value must be a substring of the
  // combined header — no silent dedup, no token loss.
  for (const expected of [
    'https://alpha.example',
    'https://beta.example',
    'https://gamma.example',
  ]) {
    assert(
      origin.includes(expected),
      `combined origin must retain "${expected}", got "${origin}"`,
    )
  }
  for (const expected of ['Origin', 'Accept-Encoding']) {
    assert(
      vary.includes(expected),
      `combined Vary must retain "${expected}", got "${vary}"`,
    )
  }

  // Bystander untouched.
  assertEquals(res.headers.get('x-custom-cors-header'), 'preserved')

  await res.text()
})

Deno.test('unauthorizedResponse — preserves caller-supplied Vary header verbatim, even alongside unusual CORS values', async () => {
  // Why a dedicated `Vary` test:
  //
  //   The `Vary` response header is the contract a server uses to tell
  //   downstream caches (CDNs, browsers, shared proxies) which request
  //   headers participated in producing the response. For CORS-aware
  //   endpoints the canonical value is `Vary: Origin` — it prevents a
  //   cached 401 with `Access-Control-Allow-Origin: https://a.example`
  //   from being served to a request from `https://b.example`.
  //
  //   If the helper EVER mutated, dropped, or "normalised" `Vary`, every
  //   protected function would silently get a CORS-cache-poisoning bug.
  //   Conversely, if the helper started INVENTING `Vary` on its own,
  //   server-to-server callers (which deliberately pass `{}`) would get
  //   surprise cache directives. Both directions need pinning.
  //
  // We assert FOUR independent angles in this single test:
  //
  //   1. Canonical case: caller passes `Vary: Origin` → wire = `Origin`.
  //   2. Multi-token case: caller passes `Vary: Origin, Accept-Encoding`
  //      → wire = exact same string (no token reordering, no dedup).
  //   3. Vary survives untouched even when the SAME cors bag contains
  //      unusual sibling values (empty strings, comma-lists, semicolons,
  //      long tokens) that exercise the value-pass-through code path.
  //   4. Negative: when caller omits `Vary`, helper does NOT invent one
  //      (parallel to the "ZERO CORS invented for {}" contract).

  // ── 1) Canonical Vary: Origin ─────────────────────────────────────
  const canonical = unauthorizedResponse({
    'Access-Control-Allow-Origin': 'https://cml.pl',
    'Vary': 'Origin',
  })
  assertEquals(canonical.status, 401)
  assertEquals(canonical.headers.get('content-type'), 'application/json')
  assertEquals(
    canonical.headers.get('vary'),
    'Origin',
    'canonical Vary: Origin must arrive on the wire unchanged',
  )
  await canonical.text()

  // ── 2) Multi-token Vary, exact byte preservation ──────────────────
  // Lock in: no sort, no dedup, no whitespace normalisation beyond what
  // `new Headers()` does to leading/trailing space (none here).
  const multi = unauthorizedResponse({
    'Access-Control-Allow-Origin': 'https://cml.pl',
    'Vary': 'Origin, Accept-Encoding, Accept-Language',
  })
  assertEquals(
    multi.headers.get('vary'),
    'Origin, Accept-Encoding, Accept-Language',
    'multi-token Vary must be byte-preserved (order, separators, casing)',
  )
  // Token-order assertion: catches a hypothetical refactor that sorts.
  const varyMulti = multi.headers.get('vary') ?? ''
  const iOrigin = varyMulti.indexOf('Origin')
  const iEnc = varyMulti.indexOf('Accept-Encoding')
  const iLang = varyMulti.indexOf('Accept-Language')
  assert(
    iOrigin >= 0 && iEnc > iOrigin && iLang > iEnc,
    `Vary token order must be preserved (Origin < Accept-Encoding < Accept-Language), got "${varyMulti}"`,
  )
  await multi.text()

  // ── 3) Vary survives untouched alongside unusual CORS values ──────
  // This is the "no zmienia go przy nietypowych wartościach CORS" leg
  // of the user's contract. We seed the bag with the same kind of edge-
  // case values exercised in the dedicated unusual-values test, plus a
  // canonical `Vary: Origin`, and assert Vary is byte-equal to what we
  // passed in.
  const noisyBag: Record<string, string> = {
    'Access-Control-Allow-Origin': 'https://cml.pl',
    'Vary': 'Origin',
    // Unusual siblings that exercise the value pass-through path:
    'X-Empty-Value': '',
    'X-Comma-Tight': 'a,b,c,d',
    'X-Internal-Whitespace': 'a   b\tc',
    'X-Semicolons': 'value; param=1; other="quoted"',
    'X-Long-Token': 'x'.repeat(512),
    'Access-Control-Expose-Headers': 'X-Request-Id, X-Trace-Id',
    'Access-Control-Max-Age': '86400',
  }
  const noisy = unauthorizedResponse(noisyBag)
  assertEquals(noisy.status, 401)
  assertEquals(noisy.headers.get('content-type'), 'application/json')
  assertEquals(
    noisy.headers.get('vary'),
    'Origin',
    'Vary must remain byte-equal to caller input even when bag contains unusual CORS values',
  )
  // Sanity: the noise siblings are independently preserved (proves the
  // helper actually walked them and still left Vary alone — not just
  // dropped everything).
  assertEquals(noisy.headers.get('x-empty-value'), '')
  assertEquals(noisy.headers.get('x-comma-tight'), 'a,b,c,d')
  assertEquals(noisy.headers.get('x-long-token'), 'x'.repeat(512))
  await noisy.text()

  // ── 4) Negative: no Vary in input → no Vary on the wire ───────────
  // Helper must not invent `Vary` when the caller doesn't ask for it.
  // This protects server-to-server callers from surprise cache hints.
  const noVary = unauthorizedResponse({
    'Access-Control-Allow-Origin': 'https://cml.pl',
  })
  assertEquals(
    noVary.headers.get('vary'),
    null,
    'helper must not invent a Vary header when caller omits it',
  )
  await noVary.text()

  // And the empty-bag case: definitely no Vary.
  const empty = unauthorizedResponse({})
  assertEquals(
    empty.headers.get('vary'),
    null,
    'unauthorizedResponse({}) must not invent Vary',
  )
  await empty.text()
})

Deno.test('unauthorizedResponse — raw "\\r" (CR) in CORS value throws TypeError, never silently sanitised', async () => {
  // Sibling to the existing `\n` (LF) CRLF-guard assertion: the Fetch
  // spec §header-value-validation forbids BOTH bare CR and bare LF
  // bytes inside a header value. Either one in isolation, or the
  // canonical CRLF sequence "\r\n", must trigger the runtime's CRLF
  // injection guard at `new Headers(init)` construction time and throw
  // a `TypeError`. The helper itself does NO sanitisation — it relies
  // on the runtime to reject malicious input.
  //
  // Why this matters as its own test:
  //   * `\r` is the harder half of the CRLF pair from a security
  //     standpoint: a smuggled `\r` followed by a single `\n` from
  //     downstream re-emission would fabricate a fake header line and
  //     enable HTTP response splitting. We MUST fail loud, not strip.
  //   * If a future runtime change started silently STRIPPING `\r`
  //     instead of throwing (e.g. to "be lenient with bad input"),
  //     this test fails — and that failure tells us we now have to
  //     add explicit sanitisation in the helper before deploy.
  //   * The `\n`-only test does not catch a hypothetical future
  //     regression that drops the LF check but keeps the CR check
  //     (or vice versa). Asserting both halves independently is the
  //     only way to pin both branches of the runtime contract.
  //
  // We assert THREE flavours of forbidden input:
  //   1. Bare CR in the MIDDLE of a value         ('value1\rvalue2')
  //   2. Canonical CRLF in the MIDDLE of a value  ('value1\r\nvalue2')
  //   3. Bare LF in the MIDDLE of a value         ('value1\nvalue2')
  //      (re-asserted here so a single test owns the full guard contract)
  //
  // NOTE on edge positions: per runtime probe, a bare `\r` at the very
  // start or end of a value is currently TRIMMED by `new Headers(init)`
  // along with regular whitespace, NOT thrown. We deliberately do NOT
  // assert that behaviour here because:
  //   * it's an artifact of header-value normalisation (whitespace
  //     trimming), not the CRLF guard itself;
  //   * it would lock in a runtime quirk that could legitimately
  //     change without weakening security (a `\r` that gets trimmed
  //     to nothing cannot smuggle a fake header line).
  //
  // The forbidden cases are EXACTLY the ones that could enable HTTP
  // response splitting — a CR/LF flanked by other bytes that would
  // survive the wire write.

  type ForbiddenCase = { label: string; value: string }
  const forbidden: ForbiddenCase[] = [
    { label: 'bare CR in middle', value: 'value1\rvalue2' },
    { label: 'canonical CRLF in middle', value: 'value1\r\nvalue2' },
    { label: 'bare LF in middle', value: 'value1\nvalue2' },
  ]

  for (const { label, value } of forbidden) {
    let caught: unknown = null
    try {
      unauthorizedResponse({ 'X-CRLF-Probe': value })
    } catch (e) {
      caught = e
    }
    assert(
      caught instanceof TypeError,
      `[${label}] raw CR/LF in CORS value must throw TypeError ` +
        `(CRLF injection guard); got ${caught === null ? 'no throw' : String(caught)}. ` +
        `If this regresses, the helper MUST add explicit value sanitisation ` +
        `before deploy — silent stripping enables HTTP response splitting.`,
    )
  }

  // Sanity: the helper still works for safe values that LOOK similar
  // but contain no raw CR/LF bytes — e.g. an escaped-as-text "\\r"
  // (a literal backslash-r, two characters). This proves the guard
  // is byte-precise and not a paranoid pattern match on the substring
  // "\r" that would break legitimate values.
  const safe = unauthorizedResponse({
    'X-Looks-Like-CR-But-Isnt': 'value1\\rvalue2', // literal backslash + 'r'
  })
  assertEquals(safe.status, 401)
  assertEquals(
    safe.headers.get('x-looks-like-cr-but-isnt'),
    'value1\\rvalue2',
    'literal backslash-r (no raw CR byte) must pass through unchanged',
  )
  await safe.text()
})
