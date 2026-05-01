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
// --upload        : po wygenerowaniu plików zrób PUT na Cloudflare API.
// --confirm       : pomiń interaktywne pytanie przed PUT (CI / scripted runs).
const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has("--dry-run") || ARGS.has("-n");
const STRICT = ARGS.has("--strict");
const UPLOAD = ARGS.has("--upload");
const CONFIRM = ARGS.has("--confirm");

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

// ── 5) Opcjonalny upload do Cloudflare API ─────────────────────────────────
if (UPLOAD) {
  await uploadToCloudflare();
}

async function uploadToCloudflare() {
  const token = process.env.CF_API_TOKEN;
  const accountId = process.env.CF_ACCOUNT_ID;
  const listIdRaw = process.env.CF_LIST_ID;

  console.log(`\n${"─".repeat(72)}\n☁️  Upload do Cloudflare API\n${"─".repeat(72)}`);

  // ── Pre-flight: walidacja struktury apiItems pod kątem schematu Cloudflare ─
  validateApiItemsSchema(apiItems);

  const missing = [];
  if (!token) missing.push("CF_API_TOKEN");
  if (!accountId) missing.push("CF_ACCOUNT_ID");
  if (!listIdRaw) missing.push("CF_LIST_ID");
  if (missing.length) {
    console.error(`❌ Brak env vars: ${missing.join(", ")}`);
    console.error(`   Ustaw je przed uruchomieniem, np.:`);
    console.error(`     export CF_API_TOKEN="cf_xxx..."`);
    console.error(`     export CF_ACCOUNT_ID="abc123..."`);
    console.error(`     export CF_LIST_ID="def456..."                # pojedyncza lista`);
    console.error(`     export CF_LIST_ID="prod=def456...,stg=789abc..."  # wiele list (label=id)`);
    process.exit(1);
  }

  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    console.error(`❌ CF_ACCOUNT_ID powinien być 32-znakowym hex (otrzymano długość ${accountId.length}).`);
    process.exit(1);
  }

  // ── Parsuj CF_LIST_ID: "id1" | "id1,id2" | "label=id1,label2=id2" ────────
  const lists = parseListIds(listIdRaw);
  if (!lists.length) {
    console.error(`❌ CF_LIST_ID nie zawiera żadnego prawidłowego ID (32-znakowy hex).`);
    process.exit(1);
  }
  console.log(
    `→ ${lists.length} ${lists.length === 1 ? "lista" : "listy/list"} do aktualizacji: ${lists
      .map((l) => `${l.label}(${l.id.slice(0, 8)}…)`)
      .join(", ")}`,
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Sekwencyjnie (nie równolegle) — żeby logi były czytelne, a konflikty
  // limitów Cloudflare (1 bulk operation/account na raz) nie wywoływały 429.
  const results = [];
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];
    console.log(`\n${"═".repeat(72)}`);
    console.log(`[${i + 1}/${lists.length}] Lista: ${list.label} (${list.id})`);
    console.log("═".repeat(72));
    try {
      const res = await uploadOne({ accountId, list, headers });
      results.push({ ...list, ...res });
    } catch (err) {
      results.push({
        ...list,
        status: "failed",
        error: err?.message ?? String(err),
        stats: null,
      });
      console.error(`❌ Lista "${list.label}" failed: ${err?.message ?? err}`);
      // Kontynuuj kolejne listy mimo błędu — raport końcowy pokaże wszystkie.
    }
  }

  // ── Raport końcowy per lista ──────────────────────────────────────────────
  console.log(`\n${"─".repeat(72)}\n📋 RAPORT KOŃCOWY (${results.length} ${results.length === 1 ? "lista" : "list"})\n${"─".repeat(72)}`);
  const statusIcon = {
    completed: "✅",
    unchanged: "✓ ",
    skipped: "⊘ ",
    failed: "❌",
    timeout: "⏱ ",
  };
  const counts = { completed: 0, unchanged: 0, skipped: 0, failed: 0, timeout: 0 };
  for (const r of results) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    const icon = statusIcon[r.status] ?? "? ";
    const stats = r.stats
      ? `(+${r.stats.adds}/~${r.stats.changes}/-${r.stats.deletes}, ${r.stats.localCount} reguł)`
      : "";
    const extra = r.error ? `  — ${r.error}` : r.note ? `  — ${r.note}` : "";
    console.log(`  ${icon} ${r.label.padEnd(20)} ${r.status.padEnd(10)} ${stats}${extra}`);
  }
  console.log(
    `\n  Sumarycznie: ${counts.completed} completed, ${counts.unchanged} unchanged, ` +
      `${counts.skipped} skipped, ${counts.failed} failed, ${counts.timeout} timeout`,
  );

  if (counts.failed > 0 || counts.timeout > 0) {
    console.error(`\n⛔ Co najmniej jedna lista nie zakończyła się sukcesem.`);
    process.exit(1);
  }
}

// Parsuje "id" | "id1,id2" | "label=id1,other=id2" → [{ label, id }].
// Spacje wokół przecinków i znaków `=` są tolerowane.
function parseListIds(raw) {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  parts.forEach((part, idx) => {
    let label, id;
    if (part.includes("=")) {
      const [l, v] = part.split("=").map((s) => s.trim());
      label = l;
      id = v;
    } else {
      id = part;
      label = `list${idx + 1}`;
    }
    if (!/^[a-f0-9]{32}$/i.test(id)) {
      console.warn(`⚠️  Pomijam nieprawidłowe ID listy: "${id}" (oczekiwano 32-znakowego hex).`);
      return;
    }
    if (seen.has(id)) {
      console.warn(`⚠️  Pomijam duplikat ID: ${id}.`);
      return;
    }
    seen.add(id);
    out.push({ label, id });
  });
  return out;
}

// Wykonuje cały pipeline (sanity → diff → confirm → PUT → poll) dla 1 listy.
// Zwraca { status, stats?, note?, error? } — nigdy nie wywołuje process.exit.
async function uploadOne({ accountId, list, headers }) {
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/rules/lists/${list.id}`;

  // Krok A: sanity check tokena + dostępu do listy.
  console.log(`→ GET ${baseUrl} (sanity check)`);
  const checkRes = await fetchWithRetry(baseUrl, { headers }, { label: `GET ${list.label}` });
  const checkJson = await checkRes.json().catch(() => ({}));
  if (!checkRes.ok || !checkJson.success) {
    const hint =
      checkRes.status === 401 || checkRes.status === 403
        ? ' (sprawdź permission "Account Filter Lists / Edit")'
        : checkRes.status === 404
          ? ` (lista ${list.id} nie istnieje na koncie ${accountId})`
          : "";
    throw new Error(`Sanity check HTTP ${checkRes.status}${hint}`);
  }
  const listMeta = checkJson.result ?? {};
  console.log(`✓ Lista "${listMeta.name ?? "?"}" (kind=${listMeta.kind ?? "?"}, items=${listMeta.num_items ?? "?"})`);
  if (listMeta.kind && listMeta.kind !== "redirect") {
    throw new Error(`Lista jest typu "${listMeta.kind}", oczekiwano "redirect"`);
  }

  // Krok B: diff vs aktualna zawartość.
  const remoteItems = await fetchAllListItems(baseUrl, headers);
  const remoteMap = new Map();
  for (const it of remoteItems) {
    const r = it.redirect ?? {};
    if (!r.source_url) continue;
    remoteMap.set(r.source_url, {
      target_url: r.target_url ?? "",
      status_code: r.status_code ?? 301,
      preserve_query_string: r.preserve_query_string ?? false,
    });
  }
  const localMap = new Map();
  for (const it of apiItems) {
    const r = it.redirect;
    localMap.set(r.source_url, {
      target_url: r.target_url,
      status_code: r.status_code,
      preserve_query_string: r.preserve_query_string,
    });
  }

  const remoteAdds = [];
  const remoteChanges = [];
  const remoteDeletes = [];
  for (const [src, loc] of localMap) {
    const rem = remoteMap.get(src);
    if (!rem) {
      remoteAdds.push({ src, to: loc.target_url });
      continue;
    }
    const diffs = [];
    if (rem.target_url !== loc.target_url) diffs.push(`target: ${rem.target_url} → ${loc.target_url}`);
    if (rem.status_code !== loc.status_code) diffs.push(`status: ${rem.status_code} → ${loc.status_code}`);
    if (rem.preserve_query_string !== loc.preserve_query_string)
      diffs.push(`preserve_qs: ${rem.preserve_query_string} → ${loc.preserve_query_string}`);
    if (diffs.length) remoteChanges.push({ src, diffs });
  }
  for (const [src, rem] of remoteMap) {
    if (!localMap.has(src)) remoteDeletes.push({ src, to: rem.target_url });
  }

  const stats = {
    adds: remoteAdds.length,
    changes: remoteChanges.length,
    deletes: remoteDeletes.length,
    localCount: localMap.size,
    remoteCount: remoteMap.size,
  };

  console.log(`\n📊 DIFF: Remote ${remoteMap.size} → Local ${localMap.size} (+${stats.adds}/~${stats.changes}/-${stats.deletes})`);
  if (remoteAdds.length) {
    console.log(`  ➕ DO DODANIA (${remoteAdds.length}):`);
    for (const { src, to } of remoteAdds) console.log(`     + ${src}  →  ${to}`);
  }
  if (remoteChanges.length) {
    console.log(`  🔄 DO ZMIANY (${remoteChanges.length}):`);
    for (const { src, diffs } of remoteChanges) {
      console.log(`     ~ ${src}`);
      for (const d of diffs) console.log(`         · ${d}`);
    }
  }
  if (remoteDeletes.length) {
    console.log(`  ➖ DO USUNIĘCIA (${remoteDeletes.length}):`);
    for (const { src, to } of remoteDeletes) console.log(`     - ${src}  →  ${to}`);
  }
  if (!remoteAdds.length && !remoteChanges.length && !remoteDeletes.length) {
    console.log(`  ✓ Lista już zsynchronizowana — pomijam PUT.`);
    return { status: "unchanged", stats, note: "lista już zsynchronizowana" };
  }

  // Krok B.2: confirm (per lista — jeśli admin chce część odrzucić).
  if (!CONFIRM) {
    console.log(`\n⚠️  PUT zastąpi całą listę "${list.label}": ${remoteMap.size} → ${localMap.size} reguł.`);
    const ok = await promptYesNo(`   Kontynuować dla "${list.label}"? [y/N]: `);
    if (!ok) {
      console.log(`✗ Pominięto listę "${list.label}".`);
      return { status: "skipped", stats, note: "anulowane przez użytkownika" };
    }
  }

  // Krok C: PUT replace-all.
  console.log(`→ PUT ${baseUrl}/items (${apiItems.length} reguł)`);
  const putRes = await fetchWithRetry(
    `${baseUrl}/items`,
    { method: "PUT", headers, body: JSON.stringify(apiItems) },
    { label: `PUT ${list.label}` },
  );
  const putJson = await putRes.json().catch(() => ({}));
  if (!putRes.ok || !putJson.success) {
    throw new Error(
      `PUT HTTP ${putRes.status}: ${JSON.stringify(putJson.errors ?? putJson).slice(0, 200)}`,
    );
  }
  const operationId = putJson.result?.operation_id;
  console.log(`✓ PUT zaakceptowane (operation_id=${operationId ?? "n/a"})`);

  // Krok D: poll statusu operacji.
  if (!operationId) return { status: "completed", stats, note: "brak operation_id (sync)" };

  const opUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/rules/lists/bulk_operations/${operationId}`;
  const start = Date.now();
  const TIMEOUT_MS = 60_000;
  let lastStatus = "";
  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 2000));
    const opRes = await fetchWithRetry(opUrl, { headers }, { label: `poll ${list.label}`, maxRetries: 3 });
    const opJson = await opRes.json().catch(() => ({}));
    const status = opJson.result?.status;
    if (status !== lastStatus) {
      console.log(`  · status: ${status}${opJson.result?.error ? ` (${opJson.result.error})` : ""}`);
      lastStatus = status;
    }
    if (status === "completed") {
      console.log(`✅ Lista "${list.label}" zaktualizowana (${apiItems.length} reguł).`);
      return { status: "completed", stats };
    }
    if (status === "failed") {
      throw new Error(`Operacja failed: ${opJson.result?.error ?? "unknown"}`);
    }
  }
  console.warn(`⚠️  Timeout (${TIMEOUT_MS / 1000}s) — sprawdź ręcznie w Dashboard.`);
  return { status: "timeout", stats, note: `timeout po ${TIMEOUT_MS / 1000}s` };
}

function promptYesNo(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (data) => {
      const ans = String(data).trim().toLowerCase();
      resolve(ans === "y" || ans === "yes");
    });
  });
}

// ── fetch z exponential backoff dla błędów sieciowych i 429/5xx ────────────
// Retryable:
//   • Network errors (fetch throws — DNS, ECONNRESET, ETIMEDOUT, socket hangup).
//   • HTTP 429 (rate limit) — respektujemy Retry-After (sekundy lub HTTP-date).
//   • HTTP 5xx (transient server error).
// Nie-retryable: 4xx ≠ 429 (auth/validation — re-try i tak nie pomoże).
//
// Backoff: 1s, 2s, 4s, 8s, 16s (cap 30s) + jitter ±25%. Domyślnie 5 prób.
async function fetchWithRetry(url, init, opts = {}) {
  const { label = "fetch", maxRetries = 5, baseDelayMs = 1000, maxDelayMs = 30_000 } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);
      // 429 / 5xx → retry (jeśli zostały próby).
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        const delay = retryAfter ?? backoffDelay(attempt, baseDelayMs, maxDelayMs);
        console.warn(
          `  ⟳ ${label}: HTTP ${res.status}, retry ${attempt + 1}/${maxRetries} za ${Math.round(delay)}ms`,
        );
        await sleep(delay);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt >= maxRetries) break;
      const delay = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      console.warn(
        `  ⟳ ${label}: network error "${err?.code ?? err?.message ?? err}", retry ${attempt + 1}/${maxRetries} za ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastErr ?? new Error(`${label}: wyczerpano ${maxRetries} prób`);
}

function backoffDelay(attempt, baseMs, maxMs) {
  const exp = Math.min(baseMs * 2 ** attempt, maxMs);
  // Jitter ±25% — rozprasza zsynchronizowane retries (thundering herd).
  const jitter = exp * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, exp + jitter);
}

function parseRetryAfter(header) {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  // HTTP-date format.
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Pobiera wszystkie items z listy Cloudflare (paginacja cursor-based) ────
// GET /accounts/{id}/rules/lists/{id}/items?per_page=25&cursor=...
// Zwraca tablicę surowych obiektów { redirect: {...}, ...metadata }.
async function fetchAllListItems(baseUrl, headers) {
  const all = [];
  let cursor = "";
  // Zabezpieczenie przed nieskończoną pętlą (max ~10 000 items = 400 stron).
  for (let page = 0; page < 400; page++) {
    const url = `${baseUrl}/items?per_page=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const res = await fetchWithRetry(url, { headers }, { label: `GET items page ${page + 1}`, maxRetries: 4 });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      console.error(`❌ Nie udało się pobrać listy items z Cloudflare: HTTP ${res.status}`);
      console.error(`   Errors:`, JSON.stringify(json.errors ?? json, null, 2));
      process.exit(1);
    }
    if (Array.isArray(json.result)) all.push(...json.result);
    cursor = json.result_info?.cursors?.after ?? "";
    if (!cursor) break;
  }
  return all;
}

// ── Walidacja apiItems pod kątem schematu Cloudflare Bulk Redirects ────────
// Doc: https://developers.cloudflare.com/api/operations/lists-update-list-items
// Schema oczekuje tablicy `[{ redirect: { source_url, target_url, status_code, ... } }]`
// gdzie:
//   • source_url  — absolutny URL z protokołem (http/https), bez query/fragmentu, max 2048
//   • target_url  — absolutny URL lub ścieżka; status_code ∈ {301,302,307,308}
//   • flagi boolean: preserve_query_string / include_subdomains / subpath_matching / preserve_path_suffix
// Wymuszamy też brak duplikatów source_url i unikalność po normalizacji (lowercase host).
function validateApiItemsSchema(items) {
  const errs = [];
  const ALLOWED_STATUS = new Set([301, 302, 307, 308]);
  const REQUIRED_BOOLS = [
    "preserve_query_string",
    "include_subdomains",
    "subpath_matching",
    "preserve_path_suffix",
  ];
  const seenSources = new Map(); // normalized → original index

  if (!Array.isArray(items) || items.length === 0) {
    errs.push("apiItems musi być niepustą tablicą.");
  }

  items.forEach((item, idx) => {
    const where = `apiItems[${idx}]`;
    if (!item || typeof item !== "object") {
      errs.push(`${where}: nie jest obiektem.`);
      return;
    }
    const r = item.redirect;
    if (!r || typeof r !== "object") {
      errs.push(`${where}.redirect: brak obiektu redirect.`);
      return;
    }

    // source_url — wymagany, absolutny URL.
    if (typeof r.source_url !== "string" || !r.source_url) {
      errs.push(`${where}.redirect.source_url: brak lub nie-string.`);
    } else {
      const u = safeUrl(r.source_url);
      if (!u) errs.push(`${where}.redirect.source_url: nie jest poprawnym URL ("${r.source_url}").`);
      else if (!/^https?:$/.test(u.protocol))
        errs.push(`${where}.redirect.source_url: protokół musi być http/https ("${u.protocol}").`);
      else if (u.search) errs.push(`${where}.redirect.source_url: nie może zawierać query string ("${u.search}").`);
      else if (u.hash) errs.push(`${where}.redirect.source_url: nie może zawierać fragmentu ("${u.hash}").`);
      else if (r.source_url.length > 2048)
        errs.push(`${where}.redirect.source_url: > 2048 znaków (${r.source_url.length}).`);

      // Duplikaty po lowercased host + path.
      if (u) {
        const norm = `${u.protocol}//${u.host.toLowerCase()}${u.pathname}`;
        if (seenSources.has(norm))
          errs.push(`${where}.redirect.source_url: duplikat ${norm} (poprzednio w apiItems[${seenSources.get(norm)}]).`);
        else seenSources.set(norm, idx);
      }
    }

    // target_url — wymagany, absolutny URL lub ścieżka /...
    if (typeof r.target_url !== "string" || !r.target_url) {
      errs.push(`${where}.redirect.target_url: brak lub nie-string.`);
    } else {
      const looksAbsolute = /^https?:\/\//i.test(r.target_url);
      if (looksAbsolute) {
        const u = safeUrl(r.target_url);
        if (!u) errs.push(`${where}.redirect.target_url: nie jest poprawnym URL ("${r.target_url}").`);
      } else if (!r.target_url.startsWith("/")) {
        errs.push(`${where}.redirect.target_url: musi być absolutnym URL lub ścieżką zaczynającą się od / ("${r.target_url}").`);
      }
      if (r.target_url.length > 2048)
        errs.push(`${where}.redirect.target_url: > 2048 znaków (${r.target_url.length}).`);
    }

    // Self-redirect (po normalizacji).
    if (typeof r.source_url === "string" && typeof r.target_url === "string") {
      const su = safeUrl(r.source_url);
      const tu = safeUrl(r.target_url);
      if (su && tu) {
        const sNorm = `${su.protocol}//${su.host.toLowerCase()}${su.pathname}`;
        const tNorm = `${tu.protocol}//${tu.host.toLowerCase()}${tu.pathname}`;
        if (sNorm === tNorm)
          errs.push(`${where}: SELF-REDIRECT (source = target po normalizacji): ${sNorm}`);
      }
    }

    // status_code — int z dozwolonego zbioru.
    if (!Number.isInteger(r.status_code) || !ALLOWED_STATUS.has(r.status_code)) {
      errs.push(
        `${where}.redirect.status_code: musi być jedną z {${[...ALLOWED_STATUS].join(", ")}} (otrzymano ${JSON.stringify(r.status_code)}).`,
      );
    }

    // Flagi boolean — wymagane (Cloudflare przyjmuje też brak, ale lepiej być explicit).
    for (const key of REQUIRED_BOOLS) {
      if (typeof r[key] !== "boolean")
        errs.push(`${where}.redirect.${key}: musi być boolean (otrzymano ${typeof r[key]}).`);
    }

    // subpath_matching=true wymaga preserve_path_suffix=true (Cloudflare odrzuca odwrotnie).
    if (r.subpath_matching === true && r.preserve_path_suffix !== true) {
      errs.push(`${where}.redirect: subpath_matching=true wymaga preserve_path_suffix=true.`);
    }
  });

  if (errs.length) {
    console.error(`\n❌ Walidacja apiItems nie powiodła się (${errs.length} błędów):`);
    for (const e of errs) console.error(`   ✗ ${e}`);
    console.error(`\n⛔ Przerywam — popraw mapę i uruchom ponownie.`);
    process.exit(1);
  }
  console.log(`✓ Walidacja apiItems OK (${items.length} reguł zgodnych ze schematem Cloudflare).`);
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

