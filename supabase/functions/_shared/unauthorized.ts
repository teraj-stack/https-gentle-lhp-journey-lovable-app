// Shared 401 response builder.
//
// All protected Edge Functions MUST use this helper when rejecting a
// request that fails the service-role / Authorization Bearer check.
// Centralising the shape gives us a single contract:
//
//   HTTP status: 401
//   Content-Type: application/json
//   Body: { "error": "Unauthorized", "code": "unauthorized" }
//
// Why a `code` field as well as `error`?
//   * `error`  is the human-readable message (kept for backward compat with
//              older clients / curl users).
//   * `code`   is a stable, machine-readable identifier ("unauthorized")
//              that clients and tests can switch on without parsing prose.
//
// The integration tests in `_shared/auth_bearer_test.ts` and
// `send-transactional-email/auth_hardening_test.ts` assert this exact shape,
// so any drift will fail CI.

export const UNAUTHORIZED_BODY = {
  error: 'Unauthorized',
  code: 'unauthorized',
} as const

export function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(UNAUTHORIZED_BODY), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
