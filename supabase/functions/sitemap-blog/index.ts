// Public sitemap of blog posts. Pulls from blog_posts where published = true.
// Returns valid sitemap XML with <lastmod> from updated_at.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { preflightResponse } from "../_shared/preflight.ts";

const SITE = "https://mcml.pro";

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(corsHeaders);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(url, anon);

    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("published", true)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const urls = (data ?? [])
      .map((p) => {
        const lastmod = (p.updated_at ?? p.published_at ?? new Date().toISOString()).slice(0, 10);
        return `  <url><loc>${SITE}/blog/${escapeXml(p.slug)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
      })
      .join("\n");

    const blogIndexLastmod =
      data && data.length > 0
        ? (data[0].updated_at ?? data[0].published_at ?? new Date().toISOString()).slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/blog</loc><lastmod>${blogIndexLastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
${urls}
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    });
  } catch (e) {
    console.error("sitemap-blog error", e);
    return new Response(`<!-- error: ${String(e)} -->`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
