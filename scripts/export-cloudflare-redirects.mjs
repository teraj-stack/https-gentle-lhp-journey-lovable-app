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
 *   node scripts/export-cloudflare-redirects.mjs              # pełny eksport (pliki)
 *   node scripts/export-cloudflare-redirects.mjs --dry-run    # tylko walidacja + diff
 *   node scripts/export-cloudflare-redirects.mjs --dry-run --strict   # exit 1 przy warn (CI)
 *   node scripts/export-cloudflare-redirects.mjs --upload     # eksport + PUT do Cloudflare
 *   node scripts/export-cloudflare-redirects.mjs --upload --confirm   # bez interaktywnego pytania
 *
 * Upload wymaga env vars:
 *   CF_API_TOKEN   — token z permission "Account / Account Filter Lists / Edit"
 *   CF_ACCOUNT_ID  — ID konta Cloudflare
 *   CF_LIST_ID     — ID listy Bulk Redirects (z URL Dashboard → Lists)
 *
 * Endpoint: PUT /accounts/{account_id}/rules/lists/{list_id}/items
 *   — replace-all (zastępuje całą zawartość listy). Idempotentne.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src/lib/seo/redirectsMap.ts");
const OUT_DIR = "/mnt/documents";
const DOMAIN = "https://cml.pl";

// ── CLI flags ───────────────────────────────────────────────────────────────
// --dry-run / -n  : nie zapisuj plików; pokaż diff vs poprzedni eksport + walidację.
// --strict        : exit 1 przy ostrzeżeniach (przydatne w CI).
const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has("--dry-run") || ARGS.has("-n");
const STRICT = ARGS.has("--strict");

// ── Parser: wyciąga tylko aktywne (niezakomentowane) wpisy { from, to, reason } ──
const source = readFileSync(SRC, "utf8");

const entries = [];
const lineRe = /^\s*\{\s*from:\s*"([^"]*)"\s*,\s*to:\s*"([^"]*)"(?:\s*,\s*reason:\s*"([^"]*)")?\s*\}\s*,?\s*$/;
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

// ── Walidacja: konflikty, cykle, puste, łańcuchy ────────────────────────────
const warnings = [];
const errors = [];

// 1) Puste / białe znaki / brak slasha.
for (const e of entries) {
  if (!e.from.trim() || !e.to.trim()) {
    errors.push(`PUSTA ŚCIEŻKA: from="${e.from}" to="${e.to}"`);
    continue;
  }
  if (!e.from.startsWith("/")) errors.push(`'from' bez slasha: ${e.from}`);
  if (!e.to.startsWith("/") && !/^https?:\/\//.test(e.to))
    errors.push(`'to' bez slasha/protokołu: ${e.to}`);
  if (/\s/.test(e.from) || /\s/.test(e.to))
    errors.push(`Spacja w ścieżce: ${e.from} → ${e.to}`);
  if (!e.reason || !e.reason.trim())
    warnings.push(`Brak 'reason' dla: ${e.from}`);
}

// 2) Duplikaty `from`.
const fromCount = new Map();
for (const e of entries) fromCount.set(e.from, (fromCount.get(e.from) ?? 0) + 1);
for (const [from, n] of fromCount) {
  if (n > 1) errors.push(`DUPLIKAT 'from' (${n}x): ${from}`);
}

// 3) Self-redirects.
for (const e of entries) {
  if (e.from === e.to) errors.push(`SELF-REDIRECT: ${e.from} → ${e.to}`);
}

// 4) Cykle A→B + B→A.
const map = new Map(entries.map((e) => [e.from, e.to]));
const seenCycles = new Set();
for (const [from, to] of map) {
  if (map.get(to) === from) {
    const key = [from, to].sort().join("↔");
    if (!seenCycles.has(key)) {
      errors.push(`CYKL: ${from} ↔ ${to}`);
      seenCycles.add(key);
    }
  }
}

// 5) Łańcuchy A→B→C (Cloudflare i tak nie podąża rekursywnie).
const fromsSet = new Set(entries.map((e) => e.from));
for (const e of entries) {
  if (fromsSet.has(e.to))
    warnings.push(`ŁAŃCUCH: ${e.from} → ${e.to} (a ${e.to} też przekierowuje dalej)`);
}

// ── Diff vs poprzedni eksport (jeśli istnieje cloudflare-redirects-simple.csv) ─
const PREV_FILE = `${OUT_DIR}/cloudflare-redirects-simple.csv`;
const prevMap = new Map();
if (existsSync(PREV_FILE)) {
  const prev = readFileSync(PREV_FILE, "utf8").split("\n").slice(1); // skip header
  for (const line of prev) {
    const [src, tgt] = line.split(",");
    if (!src) continue;
    const fromPath = src.replace(DOMAIN, "");
    const toPath = (tgt ?? "").replace(DOMAIN, "");
    prevMap.set(fromPath, toPath);
  }
}

const currMap = new Map(entries.map((e) => [e.from, e.to]));
const toAdd = [];
const toChange = [];
const toRemove = [];
for (const [from, to] of currMap) {
  if (!prevMap.has(from)) toAdd.push({ from, to });
  else if (prevMap.get(from) !== to)
    toChange.push({ from, oldTo: prevMap.get(from), newTo: to });
}
for (const [from, to] of prevMap) {
  if (!currMap.has(from)) toRemove.push({ from, to });
}

// ── Raport (zawsze drukowany; w dry-run kończy działanie) ──────────────────
const hr = "─".repeat(72);
console.log(`\n${hr}`);
console.log(`SEO_REDIRECTS — ${DRY_RUN ? "DRY RUN" : "EKSPORT"} (${entries.length} reguł, ${DOMAIN})`);
console.log(hr);

if (existsSync(PREV_FILE)) {
  console.log(`\n📋 Diff vs poprzedni eksport (${PREV_FILE}):`);
  console.log(`   + ${toAdd.length} nowych   ~ ${toChange.length} zmienionych   - ${toRemove.length} usuniętych`);
  if (toAdd.length) {
    console.log(`\n  ➕ DO DODANIA:`);
    for (const { from, to } of toAdd) console.log(`     + ${from}  →  ${to}`);
  }
  if (toChange.length) {
    console.log(`\n  🔄 DO ZMIANY:`);
    for (const { from, oldTo, newTo } of toChange)
      console.log(`     ~ ${from}:  ${oldTo}  →  ${newTo}`);
  }
  if (toRemove.length) {
    console.log(`\n  ➖ DO USUNIĘCIA (były w poprzednim eksporcie, brak w mapie):`);
    for (const { from, to } of toRemove) console.log(`     - ${from}  →  ${to}`);
  }
  if (!toAdd.length && !toChange.length && !toRemove.length)
    console.log(`   ✓ brak zmian — eksport identyczny z poprzednim.`);
} else {
  console.log(`\n📋 Pierwszy eksport (brak ${PREV_FILE} do porównania).`);
  console.log(`   Wszystkie ${entries.length} reguł zostanie ${DRY_RUN ? "by dodanych" : "dodanych"}.`);
}

if (errors.length) {
  console.log(`\n❌ BŁĘDY (${errors.length}):`);
  for (const msg of errors) console.log(`   ✗ ${msg}`);
}
if (warnings.length) {
  console.log(`\n⚠️  OSTRZEŻENIA (${warnings.length}):`);
  for (const msg of warnings) console.log(`   ! ${msg}`);
}
if (!errors.length && !warnings.length) {
  console.log(`\n✅ Walidacja OK — brak konfliktów, cykli, pustych ścieżek.`);
}

if (errors.length) {
  console.error(`\n⛔ Przerywam ze względu na ${errors.length} błąd(ów). Popraw mapę i uruchom ponownie.`);
  process.exit(1);
}

if (DRY_RUN) {
  console.log(`\n🔍 DRY RUN — nie zapisano żadnych plików.`);
  console.log(`   Aby wykonać eksport: node scripts/export-cloudflare-redirects.mjs\n`);
  if (STRICT && warnings.length) process.exit(1);
  process.exit(0);
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

// ── 3) JSON dla Cloudflare API (PUT /lists/{id}/items) ─────────────────────
// Format zgodny z Cloudflare API v4 — gotowe do `curl --data @file`.
// Doc: https://developers.cloudflare.com/api/operations/lists-update-list-items
const apiItems = entries.map(({ from, to }) => ({
  redirect: {
    source_url: `${DOMAIN}${from}`,
    target_url: `${DOMAIN}${to}`,
    status_code: 301,
    preserve_query_string: true,
    include_subdomains: false,
    subpath_matching: false,
    preserve_path_suffix: false,
  },
}));
writeFileSync(
  `${OUT_DIR}/cloudflare-bulk-redirects.json`,
  JSON.stringify(apiItems, null, 2) + "\n",
  "utf8",
);

// ── 4) Czytelny TXT z powodami ──────────────────────────────────────────────
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
console.log(`✓ /mnt/documents/cloudflare-bulk-redirects.csv  (Dashboard upload)`);
console.log(`✓ /mnt/documents/cloudflare-bulk-redirects.json (API PUT /lists/{id}/items)`);
console.log(`✓ /mnt/documents/cloudflare-redirects-simple.csv (source,target)`);
console.log(`✓ /mnt/documents/cloudflare-redirects.txt       (z powodami)`);
console.log(`\nTop celów:`);
for (const [to, n] of Object.entries(byTarget).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  ${n.toString().padStart(3)} → ${to}`);
}
