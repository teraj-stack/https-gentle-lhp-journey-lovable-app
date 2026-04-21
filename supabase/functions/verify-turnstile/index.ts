import { createClient } from "npm:@supabase/supabase-js@2";
import {
  checkRateLimitDb,
  getClientIp,
  ipForLog,
  logTokenFailure,
  rateLimitedResponse,
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ENDPOINT = "verify-turnstile";

// Turnstile is a captcha — bots that get this far already passed CF.
// We rate-limit anyway to stop replay/abuse of stolen tokens at scale.
const TURNSTILE_LIMIT = { max: 30, windowMs: 60_000 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");
  const ipLog = ipForLog(ip);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  // Supabase client used only for audit logging — failures here mustn't break verification.
  const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

  // DB-backed rate limit (cross-isolate, atomic) + log denials.
  // Fail-open if supabase client missing — verification must still work.
  const rl = supabase
    ? await checkRateLimitDb(supabase, ENDPOINT, ip, TURNSTILE_LIMIT)
    : { allowed: true, retryAfterSec: 0, remaining: TURNSTILE_LIMIT.max, limit: TURNSTILE_LIMIT.max };
  if (!rl.allowed) {
    console.warn(`Rate limit exceeded for IP ${ip} on ${ENDPOINT}`);
    if (supabase) {
      logTokenFailure(supabase, {
        endpoint: ENDPOINT,
        reason: "rate_limited",
        ip: ipLog,
        userAgent,
        metadata: { retryAfterSec: rl.retryAfterSec, method: req.method },
      });
    }
    return rateLimitedResponse(rl, corsHeaders);
  }

  try {
    const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secretKey) {
      console.error("TURNSTILE_SECRET_KEY is not configured");
      return new Response(JSON.stringify({ success: false, error: "Service unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      if (supabase) {
        logTokenFailure(supabase, {
          endpoint: ENDPOINT,
          reason: "invalid_payload",
          ip: ipLog,
          userAgent,
          metadata: { reason: "missing_token" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const result = await fetch(VERIFY_URL, { method: "POST", body: formData });
    const outcome = await result.json();

    if (!outcome.success && supabase) {
      logTokenFailure(supabase, {
        endpoint: ENDPOINT,
        reason: "invalid_token",
        ip: ipLog,
        userAgent,
        metadata: {
          errorCodes: outcome["error-codes"] ?? [],
          tokenPreview: token.slice(0, 8),
        },
      });
    }

    return new Response(JSON.stringify({ success: outcome.success }), {
      status: outcome.success ? 200 : 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return new Response(JSON.stringify({ success: false, error: "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
