#!/usr/bin/env node
/**
 * Eksport SEO_REDIRECTS → Cloudflare Bulk Redirects.
 *
 * Generuje DWA pliki w /mnt/documents/:
 *
 *  1. cloudflare-bulk-redirects.csv  — pełny schemat zgodny z Cloudflare
 *     (Dashboard → Bulk Redirects → "Edit list" → "Upload from a file"):
 *
 *       Source URL, Target URL, Status, Preserve query string,
 *       Include subdomains, Subpath matching, Preserve path suffix
 *
 *  2. cloudflare-redirects-simple.csv — uproszczone "source,target" do
 *     ręcznego dopisywania pojedynczych reguł lub jako backup.
 *
 *  3. cloudflare-redirects.txt — czytelna lista par "from → to" (#reason)
 *     dla code review / dokumentacji wewnętrznej.
 *
 * Domena: cml.pl (zgodnie z core memory: "Must use https://cml.pl ONLY").
 *
 * Uruchom:
 *   node scripts/export-cloudflare-redirects.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src/lib/seo/redirectsMap.ts");
const OUT_DIR = "/mnt/documents";
const DOMAIN = "https://cml.pl";

// ── Parser: wyciąga tylko aktywne (niezakomentowane) wpisy { from, to, reason } ──
import { readFileSync } from "node:fs";
const source = readFileSync(SRC, "utf8");

const entries = [];
const lineRe = /^\s*\{\s*from:\s*"([^"]+)"\s*,\s*to:\s*"([^"]+)"(?:\s*,\s*reason:\s*"([^"]*)")?\s*\}\s*,?\s*$/;
for (const raw of source.split("\n")) {
  // Pomiń linie zakomentowane (// ... { from: ...).
  if (/^\s*\/\//.test(raw)) continue;
  const m = raw.match(lineRe);
  if (m) entries.push({ from: m[1], to: m[2], reason: m[3] ?? "" });
}

if (entries.length === 0) {
  console.error("Nie znaleziono żadnych aktywnych wpisów w SEO_REDIRECTS — przerywam.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

// ── 1) Pełny CSV Cloudflare ─────────────────────────────────────────────────
// Kolumny zgodne z dokumentacją Cloudflare Bulk Redirects:
//   https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/create-dashboard/
const cfHeader = [
  "Source URL",
  "Target URL",
  "Status",
  "Preserve query string",
  "Include subdomains",
  "Subpath matching",
  "Preserve path suffix",
].join(",");

const cfRows = entries.map(({ from, to }) => {
  const sourceUrl = `${DOMAIN}${from}`;
  const targetUrl = `${DOMAIN}${to}`;
  // 301 permanent, zachowaj query (?utm_*), bez subdomen, exact match path, bez suffixu.
  return [sourceUrl, targetUrl, "301", "true", "false", "false", "false"].join(",");
});

const cfCsv = [cfHeader, ...cfRows].join("\n") + "\n";
writeFileSync(`${OUT_DIR}/cloudflare-bulk-redirects.csv`, cfCsv, "utf8");

// ── 2) Uproszczony CSV "source,target" ──────────────────────────────────────
const simpleHeader = "source,target";
const simpleRows = entries.map(({ from, to }) => `${DOMAIN}${from},${DOMAIN}${to}`);
const simpleCsv = [simpleHeader, ...simpleRows].join("\n") + "\n";
writeFileSync(`${OUT_DIR}/cloudflare-redirects-simple.csv`, simpleCsv, "utf8");

// ── 3) Czytelny TXT z powodami ──────────────────────────────────────────────
const txtLines = [
  `# Cloudflare Bulk Redirects — eksport z SEO_REDIRECTS`,
  `# Domena: ${DOMAIN}`,
  `# Wpisów: ${entries.length}`,
  `# Wygenerowano: ${new Date().toISOString()}`,
  `# Status: 301 (permanent), Preserve query string: true`,
  ``,
  ...entries.map(
    ({ from, to, reason }) =>
      `${DOMAIN}${from}  →  ${DOMAIN}${to}${reason ? `   # ${reason}` : ""}`,
  ),
  ``,
];
writeFileSync(`${OUT_DIR}/cloudflare-redirects.txt`, txtLines.join("\n"), "utf8");

// ── Podsumowanie do stdout ──────────────────────────────────────────────────
const byTarget = entries.reduce((acc, e) => {
  acc[e.to] = (acc[e.to] || 0) + 1;
  return acc;
}, {});
console.log(`✓ Wyeksportowano ${entries.length} reguł 301 dla ${DOMAIN}`);
console.log(`✓ /mnt/documents/cloudflare-bulk-redirects.csv (pełny schemat CF)`);
console.log(`✓ /mnt/documents/cloudflare-redirects-simple.csv (source,target)`);
console.log(`✓ /mnt/documents/cloudflare-redirects.txt (z powodami)`);
console.log(`\nTop celów:`);
for (const [to, n] of Object.entries(byTarget).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  ${n.toString().padStart(3)} → ${to}`);
}
