// Single source of CORS headers for every Edge Function in this project.
//
// Why centralise?
//   * 16+ functions previously each defined their own `corsHeaders`
//     literal. Drift was inevitable: some lost `apikey`, some lost
//     `x-client-info`, one was missing `Access-Control-Allow-Origin`
//     entirely. A browser-facing function with a stale Allow-Headers
//     list silently fails with an opaque "CORS error" — there is no
//     server-side log of the rejection.
//   * Pairing this module with `preflight.ts` and `unauthorized.ts`
//     guarantees that every browser-facing entry point goes through
//     the same three primitives: `corsHeaders`, `preflightResponse`,
//     `unauthorizedResponse`. New functions just import — there is no
//     copy-pasted CORS literal left to forget to update.
//
// Allowed headers default
//   `authorization, x-client-info, apikey, content-type` is the
//   canonical Supabase JS client set. Functions called from the
//   browser via `supabase.functions.invoke` always send all four.
//
// Origin policy
//   `*` is intentional and correct here: this codebase serves a
//   public marketing/clinic site (cml.pl + custom domains) AND
//   authenticated admin panel from the same origin set. The auth
//   contract is enforced in code (Bearer / service-role check),
//   NOT by browser-side CORS. Narrowing `Allow-Origin` would only
//   break legitimate callers without adding security.

export const CORS_ALLOW_HEADERS =
  'authorization, x-client-info, apikey, content-type'

// Preflight cache lifetime (seconds) advertised via `Access-Control-Max-Age`.
//
// Why cache preflight at all?
//   The browser sends an OPTIONS preflight before every non-simple
//   cross-origin request (anything with `Authorization`, JSON body,
//   custom headers, etc. — i.e. effectively every call this codebase
//   makes via `supabase.functions.invoke`). Without `Max-Age`, the
//   browser repeats the OPTIONS round-trip for EACH such request,
//   doubling latency and edge-function invocations.
//
// Why 86400 (24h)?
//   * It is the documented hard cap that Chromium honours
//     (`PreflightResultMaxAgeSeconds`); larger values are silently
//     clamped, smaller values waste round-trips. Firefox's cap is
//     even higher (24h) so 86400 is the universally-respected sweet
//     spot.
//   * The set of allowed headers/methods in this project changes only
//     when an edge function is redeployed — there is no per-user state
//     in the preflight response, so caching for a day is safe.
export const CORS_MAX_AGE_SECONDS = 86400

export const corsHeaders: Readonly<Record<string, string>> = Object.freeze({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
  'Access-Control-Max-Age': String(CORS_MAX_AGE_SECONDS),
})

/**
 * Build a CORS header map that extends the canonical defaults.
 *
 * Use this ONLY when a function genuinely needs more than the
 * default set — e.g. webhook signature headers (`x-lovable-signature`)
 * or non-default methods (`POST, OPTIONS`).
 *
 * Always returns a fresh object — safe to mutate or spread further.
 */
export function buildCorsHeaders(opts: {
  /** Extra header names appended to the canonical Allow-Headers list. */
  extraAllowHeaders?: string
  /** Value for Access-Control-Allow-Methods (omit if not needed). */
  allowMethods?: string
} = {}): Record<string, string> {
  const headers: Record<string, string> = { ...corsHeaders }
  if (opts.extraAllowHeaders && opts.extraAllowHeaders.trim().length > 0) {
    headers['Access-Control-Allow-Headers'] =
      `${CORS_ALLOW_HEADERS}, ${opts.extraAllowHeaders}`
  }
  if (opts.allowMethods && opts.allowMethods.trim().length > 0) {
    headers['Access-Control-Allow-Methods'] = opts.allowMethods
  }
  return headers
}
