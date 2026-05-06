// Shared CORS preflight (OPTIONS) response builder.
//
// All Edge Functions called from a browser MUST handle the CORS preflight
// `OPTIONS` request. The browser sends it BEFORE the real request and
// expects the server to advertise the allowed origin / methods / headers
// — even if the real request would be rejected as unauthorized.
//
// That last point is the contract that makes preflight tricky:
//
//   The preflight itself is NEVER authenticated. It must succeed
//   (2xx + full CORS headers) regardless of whether the caller has a
//   valid Authorization header. If we returned 401 on OPTIONS, the
//   browser would never get to send the real request and the user
//   would see an opaque "CORS error" with no diagnostic info.
//
// Centralising this here gives us a single contract:
//
//   * HTTP status:    204 No Content (smallest legal success)
//   * Body:           empty (No Content semantics)
//   * Headers:        every CORS header the caller passes in, verbatim
//
// Why 204 (and not 200)?
//   * 204 is the canonical "success, nothing to read" status. The Fetch
//     spec explicitly allows it for preflight, and most CDNs/proxies
//     treat 204 as cacheable per `Access-Control-Max-Age`. Returning
//     200 would force callers to also omit a body manually — using 204
//     makes "no body" the type-level guarantee.
//
// Why preserve caller's CORS map verbatim (no defaults)?
//   * Different functions advertise different origins / methods. A
//     "default" preflight helper that injected `Access-Control-Allow-
//     Origin: *` would silently broaden the attack surface for a
//     server-to-server-only function that deliberately passes `{}`.
//   * Mirrors the contract pinned by `unauthorizedResponse({})`: the
//     helper NEVER invents CORS headers the caller didn't ask for.
//
// Usage in a function:
//
//   if (req.method === 'OPTIONS') return preflightResponse(corsHeaders)
//
// (Drops the boilerplate `new Response(null, { headers: corsHeaders })`
// that every function currently repeats.)

export function preflightResponse(corsHeaders: Record<string, string>): Response {
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders },
  })
}
