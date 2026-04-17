// Deletes a file from the `blog-covers` storage bucket.
// Admin-only: validates JWT and `admin` role via has_role RPC.
// Accepts either a full public URL or a bucket path; only deletes if the file
// belongs to the `blog-covers` bucket — external URLs are silently ignored.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "blog-covers";

function extractBucketPath(input: string): string | null {
  if (!input) return null;
  // Full public URL: .../storage/v1/object/public/blog-covers/<path>
  const match = input.match(/\/storage\/v1\/object\/public\/blog-covers\/([^?#]+)/);
  if (match) return decodeURIComponent(match[1]);
  // Already a bare path (no protocol, no slashes from another bucket)
  if (!input.includes("://") && !input.startsWith("/")) return input;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", { _role: "admin" });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.url === "string" ? body.url : "";
    const path = extractBucketPath(raw);

    if (!path) {
      // External URL or empty — nothing to do, treat as success no-op.
      return new Response(JSON.stringify({ skipped: true, reason: "not_in_blog_covers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, service);
    const { data, error } = await admin.storage.from(BUCKET).remove([path]);
    if (error) throw error;

    return new Response(JSON.stringify({ deleted: data?.map((d: any) => d.name) ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-blog-cover error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
