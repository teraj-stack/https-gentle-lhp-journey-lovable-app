#!/usr/bin/env node
/**
 * SEO regression guard — runs before `vite build` (prebuild hook) and as `npm run seo:validate`.
 *
 * Fast, static checks only (no browser). What it catches:
 *   1. index.html          <title> length, meta description length, template defaults,
 *                          required canonical/og:* tags, JSON-LD parses + required @context/@type.
 *   2. public/robots.txt   exists, non-empty, no accidental sitewide `Disallow: /`,
 *                          Sitemap: directive present and points at BASE_URL.
 *   3. public/sitemap.xml  parses as XML-ish, every <loc> is https, uses BASE_URL host,
 *                          no localhost / lovable.app / bestcml.io / dev URLs, no dupes.
 *
 * Runtime (client-rendered) JSON-LD is validated by scripts/validate-jsonld.mjs (Playwright, opt-in).
 * This script stays static so it can run in every build without a headless browser.
 *
 * Exits non-zero on any error. Warnings print but don't fail the build.
 * Set SEO_VALIDATE_STRICT=1 to fail on warnings too.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://mcml.pro";
const BASE_HOST = new URL(BASE_URL).host;
const STRICT = process.env.SEO_VALIDATE_STRICT === "1";

const TITLE_MAX = 60;
const TITLE_MIN = 15;
const DESC_MAX = 160;
const DESC_MIN = 50;

const FORBIDDEN_HOSTS = [
  "localhost",
  "127.0.0.1",
  "lovable.app",   // preview / staging
  "bestcml.io",    // legacy domain
];

const TEMPLATE_TITLES = new Set(["lovable app", "vite app", "vite + react + ts"]);
const TEMPLATE_DESCS = new Set(["lovable generated project"]);

const errors = [];
const warnings = [];
const ok = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);
const pass = (msg) => ok.push(msg);

// ─────────────── index.html ───────────────
function checkIndexHtml() {
  const path = resolve("index.html");
  if (!existsSync(path)) return err("index.html: file missing");
  const html = readFileSync(path, "utf8");

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!titleMatch) err("index.html: <title> missing");
  else {
    const title = titleMatch[1].trim();
    if (!title) err("index.html: <title> empty");
    else if (TEMPLATE_TITLES.has(title.toLowerCase()))
      err(`index.html: <title> is a template default ("${title}")`);
    else if (title.length > TITLE_MAX)
      err(`index.html: <title> too long (${title.length} > ${TITLE_MAX}): "${title}"`);
    else if (title.length < TITLE_MIN)
      warn(`index.html: <title> short (${title.length} < ${TITLE_MIN} recommended): "${title}"`);
    else pass(`index.html: <title> (${title.length} chars)`);
  }

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (!descMatch) err("index.html: <meta name=\"description\"> missing");
  else {
    const desc = descMatch[1].trim();
    if (!desc) err("index.html: description empty");
    else if (TEMPLATE_DESCS.has(desc.toLowerCase()))
      err(`index.html: description is a template default ("${desc}")`);
    else if (desc.length > DESC_MAX)
      err(`index.html: description too long (${desc.length} > ${DESC_MAX})`);
    else if (desc.length < DESC_MIN)
      warn(`index.html: description short (${desc.length} < ${DESC_MIN} recommended)`);
    else pass(`index.html: meta description (${desc.length} chars)`);
  }

  const requiredMetas = [
    ["og:title", /<meta\s+property=["']og:title["']/i],
    ["og:description", /<meta\s+property=["']og:description["']/i],
    ["og:type", /<meta\s+property=["']og:type["']/i],
    ["twitter:card", /<meta\s+name=["']twitter:card["']/i],
  ];
  for (const [name, re] of requiredMetas) {
    if (!re.test(html)) warn(`index.html: recommended <meta ${name}> missing`);
    else pass(`index.html: ${name} present`);
  }

  // JSON-LD blocks: must parse; each must have @context + @type
  const ldRe = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m, ldCount = 0;
  while ((m = ldRe.exec(html))) {
    ldCount++;
    const raw = m[1].trim();
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { err(`index.html: JSON-LD block #${ldCount} invalid JSON — ${e.message}`); continue; }
    const nodes = Array.isArray(parsed) ? parsed
      : Array.isArray(parsed["@graph"]) ? parsed["@graph"]
      : [parsed];
    nodes.forEach((n, i) => {
      if (!n["@context"] && !parsed["@context"])
        err(`index.html: JSON-LD #${ldCount}[${i}] missing @context`);
      if (!n["@type"])
        err(`index.html: JSON-LD #${ldCount}[${i}] missing @type`);
    });
    if (parsed["@type"] === "WebSite" && parsed.potentialAction) {
      const pa = Array.isArray(parsed.potentialAction) ? parsed.potentialAction[0] : parsed.potentialAction;
      const url = typeof pa?.target === "string" ? pa.target : pa?.target?.urlTemplate;
      if (!url?.includes("{search_term_string}"))
        err("index.html: WebSite.SearchAction.target must include {search_term_string}");
      if (!pa?.["query-input"])
        err('index.html: WebSite.SearchAction missing "query-input"');
    }
  }
  if (ldCount === 0) warn("index.html: no JSON-LD blocks (recommend at least WebSite/Organization)");
  else pass(`index.html: ${ldCount} JSON-LD block(s) parsed`);
}

// ─────────────── robots.txt ───────────────
function checkRobots() {
  const path = resolve("public/robots.txt");
  if (!existsSync(path)) return err("public/robots.txt: file missing");
  const txt = readFileSync(path, "utf8");
  if (!txt.trim()) return err("public/robots.txt: empty");

  // Look for a wildcard `Disallow: /` under `User-agent: *` (blocks everything).
  const lines = txt.split(/\r?\n/).map(l => l.trim());
  let ua = null;
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const uaMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (uaMatch) { ua = uaMatch[1].trim(); continue; }
    if (ua === "*" && /^disallow:\s*\/\s*$/i.test(line))
      err("public/robots.txt: wildcard `Disallow: /` under `User-agent: *` blocks the entire site");
  }

  const sitemapLine = lines.find(l => /^sitemap:\s*/i.test(l));
  if (!sitemapLine) warn("public/robots.txt: no `Sitemap:` directive");
  else {
    const url = sitemapLine.replace(/^sitemap:\s*/i, "").trim();
    if (!url.startsWith(BASE_URL))
      warn(`public/robots.txt: Sitemap URL "${url}" doesn't start with ${BASE_URL}`);
    else pass(`public/robots.txt: Sitemap → ${url}`);
  }
}

// ─────────────── sitemap.xml ───────────────
function checkSitemap() {
  const path = resolve("public/sitemap.xml");
  if (!existsSync(path)) return err("public/sitemap.xml: file missing");
  const xml = readFileSync(path, "utf8");
  if (!xml.trim().startsWith("<?xml"))
    warn("public/sitemap.xml: missing XML prolog");

  if (!/<urlset\b/.test(xml) && !/<sitemapindex\b/.test(xml))
    return err("public/sitemap.xml: no <urlset> or <sitemapindex> root");

  const locs = Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map(m => m[1]);
  if (locs.length === 0)
    return err("public/sitemap.xml: no <loc> entries");
  pass(`public/sitemap.xml: ${locs.length} <loc> entries`);

  const seen = new Set();
  for (const loc of locs) {
    let u;
    try { u = new URL(loc); }
    catch { err(`sitemap.xml: invalid URL "${loc}"`); continue; }
    if (u.protocol !== "https:")
      err(`sitemap.xml: non-https URL "${loc}"`);
    for (const bad of FORBIDDEN_HOSTS) {
      if (u.host === bad || u.host.endsWith("." + bad))
        err(`sitemap.xml: forbidden host "${u.host}" in "${loc}"`);
    }
    // urlset (not sitemapindex) entries must match BASE_HOST
    if (/<urlset\b/.test(xml) && u.host !== BASE_HOST)
      err(`sitemap.xml: host "${u.host}" doesn't match BASE_URL host "${BASE_HOST}" (loc: ${loc})`);
    if (seen.has(loc)) err(`sitemap.xml: duplicate <loc> "${loc}"`);
    seen.add(loc);
  }
}

// ─────────────── run ───────────────
checkIndexHtml();
checkRobots();
checkSitemap();

console.log("\nSEO validation");
console.log("──────────────");
for (const line of ok) console.log("  ✅", line);
for (const line of warnings) console.log("  ⚠️ ", line);
for (const line of errors) console.log("  ❌", line);
console.log(`\nsummary: ${ok.length} ok, ${warnings.length} warning(s), ${errors.length} error(s)`);

const fail = errors.length > 0 || (STRICT && warnings.length > 0);
if (fail) {
  console.error("\nSEO validation failed. Fix the errors above or set SEO_VALIDATE_STRICT=0 for warnings.");
  process.exit(1);
}
process.exit(0);
