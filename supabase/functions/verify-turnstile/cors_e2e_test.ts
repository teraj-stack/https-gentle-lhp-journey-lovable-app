// End-to-end CORS test that exercises real, deployed Edge Functions over
// HTTP — exactly the way a browser does it.
//
// Why this test exists (and is not just another unit test):
//   The unit tests in `_shared/preflight_test.ts` and `_shared/cors_test.ts`
//   prove that the helpers PRODUCE the right Response object. They cannot
//   prove that:
//     1. Each function actually wires `if (OPTIONS) return preflightResponse(...)`
//        BEFORE any other early-return (auth, rate-limit, body parse, …).
//     2. The Supabase Functions runtime / edge proxy preserves our headers
//        end-to-end (some platforms strip non-standard `Access-Control-*`
//        headers or rewrite the status of a 204).
//     3. The "real" follow-up request — the one the browser sends AFTER
//        the preflight passes — also carries CORS headers on its response,
//        even when the function's business logic rejects the call.
//
// Why a TABLE of functions (and not a single hand-written test)?
//   The CORS contract MUST hold for every browser-facing edge function.
//   Listing the functions + their safe probe payload in ONE place makes
//   it trivial to add coverage for a new function (one row) and means a
//   regression in `_shared/cors.ts` lights up across the whole table at
//   once instead of slipping through because only `verify-turnstile`
//   happened to be tested.
//
//   Each row pins:
//     * `name`        — function slug (= URL path segment).
//     * `method`      — verb of the real follow-up request.
//     * `body`        — payload the function will SAFELY reject without
//                       side-effects (no DB writes, no email sends, no
//                       external state mutation). The CORS contract is
//                       what we assert, NOT business success.
//     * `extraReqHeaders` — headers the browser would advertise in
//                       Access-Control-Request-Headers, beyond the
//                       canonical Supabase set. Lets us cover functions
//                       that opt into `buildCorsHeaders({extraAllowHeaders})`.
//
// If this test ever starts failing, the most likely cause is a regression
// in `_shared/cors.ts` / `_shared/preflight.ts` OR a function that
// accidentally re-introduced its own local `corsHeaders` literal and
// drifted from the shared contract.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CORS_ALLOW_HEADERS, corsHeaders } from "../_shared/cors.ts";
import { preflightResponse } from "../_shared/preflight.ts";

/**
 * The exact CORS header snapshot the shared `preflightResponse(corsHeaders)`
 * helper produces. Built ONCE here so every per-function assertion compares
 * against the SAME source of truth — if `_shared/cors.ts` ever changes
 * (header added/removed/renamed, Max-Age value tweaked, casing changed),
 * this snapshot regenerates automatically and every function in the table
 * is re-checked against the new contract in the same CI run.
 *
 * We snapshot the helper's actual `Response` rather than re-computing the
 * map by hand: that way we also catch a regression in `preflightResponse`
 * itself (e.g. someone adding a default Allow-Origin or stripping a header
 * via `{ ...corsHeaders }`).
 */
const EXPECTED_PREFLIGHT_HEADERS: ReadonlyMap<string, string> = (() => {
  const ref = preflightResponse(corsHeaders);
  // Drain body so the helper Response doesn't leak in the test runtime.
  void ref.body?.cancel();
  const map = new Map<string, string>();
  for (const [k, v] of ref.headers.entries()) {
    // `Headers.entries()` already lower-cases names — pin that here so the
    // comparison against the server response (also lower-cased below) is
    // byte-exact and not subject to platform casing drift.
    map.set(k.toLowerCase(), v);
  }
  return map;
})();

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ??
  Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

// Origin we pretend to be a browser for. The functions intentionally
// echo `*` (see `_shared/cors.ts`) so the exact value doesn't matter —
// what matters is that the server doesn't reject the cross-origin probe.
const ORIGIN = "https://cml.pl";

// Canonical Supabase JS client header set — sourced from the SAME
// constant the production code advertises in `Access-Control-Allow-Headers`.
// This guarantees the test's preflight `Access-Control-Request-Headers`
// can never drift from what the server actually allows: if someone
// shrinks (or extends) `CORS_ALLOW_HEADERS` in `_shared/cors.ts`, this
// probe automatically follows, and the server-side assertions below
// keep checking the exact same header names.
const CANONICAL_REQ_HEADERS = CORS_ALLOW_HEADERS;
// Header names we assert appear in the server's `Allow-Headers`
// response. Derived from the shared constant so the list stays in
// lock-step; lower-cased because HTTP header values are compared
// case-insensitively and the server may normalise casing.
const CANONICAL_REQ_HEADER_NAMES = CORS_ALLOW_HEADERS
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter((h) => h.length > 0);

/**
 * The single source of truth for which functions this test exercises and
 * how to safely probe them. Add a new row here to extend coverage — no
 * other code changes required.
 *
 * Picking a safe `body`:
 *   * Must be syntactically valid JSON the function will REJECT in
 *     validation/auth — never reach a DB write, email send, or any
 *     external side-effect.
 *   * Token / id values use a `bogus-e2e-cors-test-*` prefix so they're
 *     trivially greppable in production logs if they ever leak.
 */
const FUNCTIONS: ReadonlyArray<{
  name: string;
  method: "POST" | "GET";
  body?: unknown;
  extraReqHeaders?: string;
}> = [
  // Idempotent POST, no DB writes — the safest probe in the codebase.
  // Failure modes (403/503/429) all flow through shared corsHeaders.
  { name: "verify-turnstile", method: "POST", body: { token: "bogus-e2e-cors-test-token" } },
  // Public form submission — rejects without captcha token before any DB write.
  { name: "submit-contact-form", method: "POST", body: { __e2e_cors_probe: true } },
  // Public unsubscribe handler — rejects malformed token before mutating state.
  { name: "handle-email-unsubscribe", method: "POST", body: { token: "bogus-e2e-cors-test-token" } },
  // Public reminder opt-out — same shape as unsubscribe.
  { name: "handle-reminder-opt-out", method: "POST", body: { token: "bogus-e2e-cors-test-token" } },
];

for (const fn of FUNCTIONS) {
  const FN_URL = `${SUPABASE_URL}/functions/v1/${fn.name}`;
  const requestHeaders = fn.extraReqHeaders
    ? `${CANONICAL_REQ_HEADERS}, ${fn.extraReqHeaders}`
    : CANONICAL_REQ_HEADERS;

  Deno.test(
    `E2E CORS [${fn.name}] — browser preflight (OPTIONS) is 2xx with full CORS headers + Max-Age`,
    async () => {
      // Faithfully model what the browser sends for a non-simple request:
      //   * Origin                            (required by Fetch spec)
      //   * Access-Control-Request-Method     (the verb of the real request)
      //   * Access-Control-Request-Headers    (the custom headers the real
      //                                        request will include)
      // No Authorization on the preflight — that is the spec contract.
      const preflightRes = await fetch(FN_URL, {
        method: "OPTIONS",
        headers: {
          Origin: ORIGIN,
          "Access-Control-Request-Method": fn.method,
          "Access-Control-Request-Headers": requestHeaders,
        },
      });
      // ALWAYS consume the body, even when empty — Deno leaks resources
      // otherwise and the test runner will fail the whole file.
      await preflightRes.text();

      // (1) 2xx success. We pin 204 because that's the contract the
      //     `preflightResponse` helper documents — a future drift to 200
      //     should fail here so the author updates intentionally.
      assert(
        preflightRes.status >= 200 && preflightRes.status < 300,
        `[${fn.name}] preflight must be 2xx, got ${preflightRes.status}`,
      );
      assertEquals(
        preflightRes.status,
        204,
        `[${fn.name}] preflight should be 204 No Content per the shared helper contract`,
      );

      // (2) The three browser-mandatory CORS headers must be present so
      //     the browser proceeds to send the real request.
      assertEquals(
        preflightRes.headers.get("access-control-allow-origin"),
        "*",
        `[${fn.name}] Allow-Origin must be '*' (project-wide policy in _shared/cors.ts)`,
      );
      const allowHeaders = preflightRes.headers.get(
        "access-control-allow-headers",
      );
      assert(allowHeaders !== null, `[${fn.name}] Allow-Headers must be set`);
      const allowHeadersLower = allowHeaders!.toLowerCase();
      for (const required of CANONICAL_REQ_HEADER_NAMES) {
        assert(
          allowHeadersLower.includes(required),
          `[${fn.name}] Allow-Headers must include "${required}" (from CORS_ALLOW_HEADERS), got ${JSON.stringify(allowHeaders)}`,
        );
      }

      // (3) Max-Age — the cache contract added in this iteration.
      //     Browsers silently drop a non-integer value, so we assert the
      //     wire format too.
      const maxAge = preflightRes.headers.get("access-control-max-age");
      assert(
        maxAge !== null && /^[1-9]\d*$/.test(maxAge),
        `[${fn.name}] Access-Control-Max-Age must be a positive integer seconds string, got ${JSON.stringify(maxAge)}`,
      );
    },
  );

  Deno.test(
    `E2E CORS [${fn.name}] — follow-up ${fn.method} after preflight carries CORS headers on its response`,
    async () => {
      // Run the preflight ourselves first (cheap, idempotent) so a
      // failure here localises to the preflight, not the follow-up.
      const preflightRes = await fetch(FN_URL, {
        method: "OPTIONS",
        headers: {
          Origin: ORIGIN,
          "Access-Control-Request-Method": fn.method,
          "Access-Control-Request-Headers": requestHeaders,
        },
      });
      await preflightRes.text();
      assertEquals(
        preflightRes.status,
        204,
        `[${fn.name}] preflight must succeed first`,
      );

      // Now the "real" request. We deliberately send a payload the
      // function will reject — the POINT of this test is that EVEN ON
      // A REJECTED CALL the response must carry CORS headers, otherwise
      // the browser would surface an opaque "CORS error" instead of the
      // JSON error body.
      const realRes = await fetch(FN_URL, {
        method: fn.method,
        headers: {
          Origin: ORIGIN,
          "Content-Type": "application/json",
          // Anon apikey is required by the Functions gateway even when
          // the function itself runs with `verify_jwt = false`. Using
          // the publishable key matches what the browser SDK sends.
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: fn.body !== undefined ? JSON.stringify(fn.body) : undefined,
      });
      // Consume the body first to avoid leaks even if assertions throw.
      const bodyText = await realRes.text();

      // (1) Status is something the function actually produced, not a
      //     gateway-level CORS rejection (which manifests as a network
      //     error, not a Response — so reaching this line at all already
      //     proves the gateway accepted the cross-origin call).
      assert(
        realRes.status >= 200 && realRes.status < 600,
        `[${fn.name}] expected an HTTP status from the function, got ${realRes.status}`,
      );

      // (2) The critical assertion: Allow-Origin is on the REAL response.
      //     Without it the browser blocks the JS from reading the body
      //     and the user sees an opaque CORS error instead of the JSON
      //     error message.
      assertEquals(
        realRes.headers.get("access-control-allow-origin"),
        "*",
        `[${fn.name}] real-request response must include Access-Control-Allow-Origin (status was ${realRes.status}, body: ${bodyText.slice(0, 200)})`,
      );
    },
  );

  Deno.test(
    `E2E CORS [${fn.name}] — OPTIONS headers match preflightResponse(corsHeaders) exactly, even after the endpoint returns a 4xx (auth-rejected / validation-rejected)`,
    async () => {
      // Step 1: baseline OPTIONS, no auth context. Must match the helper
      // snapshot byte-for-byte (modulo headers the gateway/runtime adds —
      // we only assert the CORS-relevant subset that the helper owns).
      const baselineOptions = await fetch(FN_URL, {
        method: "OPTIONS",
        headers: {
          Origin: ORIGIN,
          "Access-Control-Request-Method": fn.method,
          "Access-Control-Request-Headers": requestHeaders,
        },
      });
      await baselineOptions.text();
      assertEquals(
        baselineOptions.status,
        204,
        `[${fn.name}] baseline OPTIONS must be 204 (preflightResponse contract)`,
      );
      for (const [name, expected] of EXPECTED_PREFLIGHT_HEADERS) {
        assertEquals(
          baselineOptions.headers.get(name),
          expected,
          `[${fn.name}] baseline OPTIONS header "${name}" must match preflightResponse(corsHeaders) exactly`,
        );
      }

      // Step 2: trigger a 4xx rejection path on the SAME isolate by
      // sending the real request without apikey/Authorization. Different
      // functions surface this as different 4xx codes:
      //   * gateway-enforced auth (verify_jwt = true)  → 401
      //   * function-enforced auth (manual JWT check)  → 401 / 403
      //   * verify_jwt = false + early body validation → 400 / 404 / 422
      // The CORS contract under test is invariance of the OPTIONS
      // response, not the specific 4xx — so we accept any client error
      // and rely on the OPTIONS comparison below to do the real work.
      const unauthRealRes = await fetch(FN_URL, {
        method: fn.method,
        headers: {
          Origin: ORIGIN,
          "Content-Type": "application/json",
          // intentionally NO apikey, NO Authorization
        },
        body: fn.body !== undefined ? JSON.stringify(fn.body) : undefined,
      });
      await unauthRealRes.text();
      assert(
        unauthRealRes.status >= 400 && unauthRealRes.status < 500,
        `[${fn.name}] unauth real request must surface a 4xx to exercise the rejected path, got ${unauthRealRes.status}`,
      );

      // Step 3: re-run OPTIONS AFTER the 401/403. The helper contract
      // says preflight is never authenticated and never varies — the
      // response headers MUST be identical to the baseline (and to the
      // helper snapshot). Catches any regression where a function
      // accidentally lets an auth/middleware layer mutate OPTIONS
      // headers based on prior request state.
      const postFailureOptions = await fetch(FN_URL, {
        method: "OPTIONS",
        headers: {
          Origin: ORIGIN,
          "Access-Control-Request-Method": fn.method,
          "Access-Control-Request-Headers": requestHeaders,
        },
      });
      await postFailureOptions.text();
      assertEquals(
        postFailureOptions.status,
        204,
        `[${fn.name}] OPTIONS after 401/403 must still be 204`,
      );
      for (const [name, expected] of EXPECTED_PREFLIGHT_HEADERS) {
        assertEquals(
          postFailureOptions.headers.get(name),
          expected,
          `[${fn.name}] OPTIONS after 401/403: header "${name}" must still match preflightResponse(corsHeaders) exactly (drift after auth rejection)`,
        );
      }
    },
  );
}
