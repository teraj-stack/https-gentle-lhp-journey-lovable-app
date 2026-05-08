// Pinning tests for the shared CORS module.
//
// These exist to catch silent drift: if `corsHeaders` ever loses a
// required header (e.g. `apikey`) every browser-facing function
// would break with an opaque CORS error and no server log. The
// linked snapshot in this test fails LOUDLY in CI instead.

import { assert, assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { CORS_ALLOW_HEADERS, buildCorsHeaders, corsHeaders } from './cors.ts'

Deno.test('corsHeaders — canonical shape (Allow-Origin + Allow-Headers, no Methods)', () => {
  // Pin the EXACT shape so any accidental rename or removal fails CI.
  assertEquals(corsHeaders['Access-Control-Allow-Origin'], '*')
  assertEquals(corsHeaders['Access-Control-Allow-Headers'], CORS_ALLOW_HEADERS)
  // No Allow-Methods by default — adding one would advertise a
  // method some functions don't actually implement.
  assertEquals(
    (corsHeaders as Record<string, string>)['Access-Control-Allow-Methods'],
    undefined,
  )
})

Deno.test('CORS_ALLOW_HEADERS — includes every header the Supabase JS client sends', () => {
  // Browser invokes via `supabase.functions.invoke` send all four.
  // Dropping any one of these is a guaranteed silent CORS failure.
  for (const required of ['authorization', 'x-client-info', 'apikey', 'content-type']) {
    assert(
      CORS_ALLOW_HEADERS.includes(required),
      `CORS_ALLOW_HEADERS must include "${required}", got "${CORS_ALLOW_HEADERS}"`,
    )
  }
})

Deno.test('corsHeaders — frozen (cannot be mutated by a caller)', () => {
  // The shared map MUST be immutable: a function that did
  // `corsHeaders['X-Foo'] = 'bar'` would silently broaden CORS for
  // every other function in the next isolate that imported it.
  assert(Object.isFrozen(corsHeaders))
  assertThrows(
    () => {
      ;(corsHeaders as Record<string, string>)['X-Injected'] = 'nope'
    },
    TypeError,
  )
})

Deno.test('buildCorsHeaders() — returns canonical defaults when called with no opts', () => {
  const built = buildCorsHeaders()
  assertEquals(built['Access-Control-Allow-Origin'], '*')
  assertEquals(built['Access-Control-Allow-Headers'], CORS_ALLOW_HEADERS)
  assertEquals(built['Access-Control-Allow-Methods'], undefined)
})

Deno.test('buildCorsHeaders() — returns a fresh object (does not leak the frozen one)', () => {
  const a = buildCorsHeaders()
  const b = buildCorsHeaders()
  assert(a !== b, 'each call must return a new object')
  assert(a !== corsHeaders, 'must not return the frozen singleton')
  // And the returned object must be mutable for callers that need
  // to layer on Content-Type etc.
  a['X-Test'] = 'ok'
  assertEquals(a['X-Test'], 'ok')
})

Deno.test('buildCorsHeaders({ extraAllowHeaders }) — appends to canonical list', () => {
  const built = buildCorsHeaders({ extraAllowHeaders: 'x-lovable-signature, x-lovable-timestamp' })
  assertEquals(
    built['Access-Control-Allow-Headers'],
    `${CORS_ALLOW_HEADERS}, x-lovable-signature, x-lovable-timestamp`,
  )
})

Deno.test('buildCorsHeaders({ allowMethods }) — sets Allow-Methods verbatim', () => {
  const built = buildCorsHeaders({ allowMethods: 'POST, OPTIONS' })
  assertEquals(built['Access-Control-Allow-Methods'], 'POST, OPTIONS')
})

Deno.test('buildCorsHeaders({}) — empty / blank opts do not mutate defaults', () => {
  // Guard against `extraAllowHeaders: ""` overwriting Allow-Headers
  // with the canonical list duplicated, or `allowMethods: ""`
  // setting an empty Allow-Methods that breaks preflight.
  const built = buildCorsHeaders({ extraAllowHeaders: '   ', allowMethods: '' })
  assertEquals(built['Access-Control-Allow-Headers'], CORS_ALLOW_HEADERS)
  assertEquals(built['Access-Control-Allow-Methods'], undefined)
})
