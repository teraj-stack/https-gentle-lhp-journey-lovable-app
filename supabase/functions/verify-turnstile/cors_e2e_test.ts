// End-to-end CORS test that exercises a real, deployed Edge Function over
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
// We exercise the canonical browser two-step against `verify-turnstile`
// (chosen because it's a simple, idempotent POST that is safe to invoke
// repeatedly with a bogus payload — no DB writes, no email sends, no
// external side-effects beyond a single Turnstile siteverify probe).
//
//   STEP 1: OPTIONS  → must be 2xx (204) + full CORS bundle + Max-Age.
//   STEP 2: POST     → must carry CORS headers on its response too,
//                      regardless of whether the body validates.
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

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ??
  Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

const FN_URL = `${SUPABASE_URL}/functions/v1/verify-turnstile`;

// Origin we pretend to be a browser for. The function intentionally
// echoes `*` (see `_shared/cors.ts`) so the exact value doesn't matter —
// what matters is that the server doesn't reject the cross-origin probe.
const ORIGIN = "https://cml.pl";

Deno.test(
  "E2E CORS — browser preflight (OPTIONS) is 2xx with full CORS headers + Max-Age",
  async () => {
    // Faithfully model what the browser sends for a non-simple request:
    //   * Origin                            (required by Fetch spec)
    //   * Access-Control-Request-Method     (the verb of the real request)
    //   * Access-Control-Request-Headers    (the custom headers the real
    //                                        request will include — here
    //                                        the canonical Supabase set)
    // No Authorization on the preflight — that is the spec contract.
    const preflightRes = await fetch(FN_URL, {
      method: "OPTIONS",
      headers: {
        Origin: ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "authorization, x-client-info, apikey, content-type",
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
      `preflight must be 2xx, got ${preflightRes.status}`,
    );
    assertEquals(
      preflightRes.status,
      204,
      "preflight should be 204 No Content per the shared helper contract",
    );

    // (2) The three browser-mandatory CORS headers must be present so
    //     the browser proceeds to send the real request.
    assertEquals(
      preflightRes.headers.get("access-control-allow-origin"),
      "*",
      "Allow-Origin must be '*' (project-wide policy in _shared/cors.ts)",
    );
    const allowHeaders = preflightRes.headers.get(
      "access-control-allow-headers",
    );
    assert(
      allowHeaders !== null &&
        allowHeaders.toLowerCase().includes("authorization") &&
        allowHeaders.toLowerCase().includes("apikey") &&
        allowHeaders.toLowerCase().includes("content-type") &&
        allowHeaders.toLowerCase().includes("x-client-info"),
      `Allow-Headers must include the canonical Supabase set, got ${JSON.stringify(allowHeaders)}`,
    );

    // (3) Max-Age — the cache contract added in this iteration.
    //     Browsers silently drop a non-integer value, so we assert the
    //     wire format too.
    const maxAge = preflightRes.headers.get("access-control-max-age");
    assert(
      maxAge !== null && /^[1-9]\d*$/.test(maxAge),
      `Access-Control-Max-Age must be a positive integer seconds string, got ${JSON.stringify(maxAge)}`,
    );
  },
);

Deno.test(
  "E2E CORS — follow-up POST after preflight carries CORS headers on its response",
  async () => {
    // The browser only sends the real request if the preflight passed.
    // Run it ourselves first (cheap, idempotent) so a failure here
    // localises to the preflight, not the follow-up.
    const preflightRes = await fetch(FN_URL, {
      method: "OPTIONS",
      headers: {
        Origin: ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
    await preflightRes.text();
    assertEquals(preflightRes.status, 204, "preflight must succeed first");

    // Now the "real" request. We deliberately send a payload the
    // function will reject (no Turnstile token, or a bogus one) — the
    // POINT of this test is that EVEN ON A REJECTED CALL the response
    // must carry CORS headers, otherwise the browser would surface an
    // opaque "CORS error" instead of the JSON error body.
    //
    // verify-turnstile's failure modes for this payload:
    //   * { token: "bogus" } with TURNSTILE_SECRET_KEY set  → 403 JSON
    //   * TURNSTILE_SECRET_KEY missing                       → 503 JSON
    //   * rate-limited                                       → 429 JSON
    // All three flow through the shared `corsHeaders` spread, so any
    // status in {200, 400..599} is acceptable as long as CORS headers
    // are present.
    const realRes = await fetch(FN_URL, {
      method: "POST",
      headers: {
        Origin: ORIGIN,
        "Content-Type": "application/json",
        // Anon apikey is required by the Functions gateway even when
        // the function itself runs with `verify_jwt = false`. Using
        // the publishable key matches what the browser SDK sends.
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token: "bogus-e2e-cors-test-token" }),
    });
    // Consume the body first to avoid leaks even if assertions throw.
    const bodyText = await realRes.text();

    // (1) Status is something the function actually produced, not a
    //     gateway-level CORS rejection (which manifests as a network
    //     error, not a Response — so reaching this line at all already
    //     proves the gateway accepted the cross-origin POST).
    assert(
      realRes.status >= 200 && realRes.status < 600,
      `expected an HTTP status from the function, got ${realRes.status}`,
    );

    // (2) The critical assertion: Allow-Origin is on the REAL response.
    //     Without it the browser blocks the JS from reading `bodyText`
    //     and the user sees an opaque CORS error instead of, e.g.,
    //     "invalid Turnstile token".
    assertEquals(
      realRes.headers.get("access-control-allow-origin"),
      "*",
      `real-request response must include Access-Control-Allow-Origin (status was ${realRes.status}, body: ${bodyText.slice(0, 200)})`,
    );

    // (3) Sanity: the response is JSON-shaped (the function's contract),
    //     proving we reached the function's own handler and not a
    //     gateway error page that happens to set CORS.
    assert(
      bodyText.trim().startsWith("{"),
      `expected JSON body from the function, got: ${bodyText.slice(0, 200)}`,
    );
  },
);
