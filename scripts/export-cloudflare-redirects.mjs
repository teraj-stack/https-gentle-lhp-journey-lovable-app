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
 * Domena: mcml.pro (jedyna kanoniczna domena projektu).
 *
 * Uruchom:
 *   node scripts/export-cloudflare-redirects.mjs              # pełny eksport (pliki)
 *   node scripts/export-cloudflare-redirects.mjs --dry-run    # tylko walidacja + diff
 *   node scripts/export-cloudflare-redirects.mjs --dry-run --strict   # exit 1 przy warn (CI)
 *   node scripts/export-cloudflare-redirects.mjs --upload     # eksport + PUT do Cloudflare
 *   node scripts/export-cloudflare-redirects.mjs --upload --confirm   # bez interaktywnego pytania
 *   node scripts/export-cloudflare-redirects.mjs --clear --upload    # wyczyść listę i wgraj nowe
 *   node scripts/export-cloudflare-redirects.mjs --clear              # tylko wyczyść (bez uploadu)
 *   node scripts/export-cloudflare-redirects.mjs --clear --dry-run    # podgląd: ile reguł zostanie usuniętych (bez PUT)
 *   node scripts/export-cloudflare-redirects.mjs --clear --yes-clear   # CI: pomiń pytanie "wpisz CLEAR"
 *   CF_CLEAR_CONFIRM=CLEAR node scripts/export-cloudflare-redirects.mjs --clear  # alternatywa env var
 *   node scripts/export-cloudflare-redirects.mjs --upload --json                 # raport do /mnt/documents/cloudflare-report.json
 *   node scripts/export-cloudflare-redirects.mjs --upload --json=/tmp/cf.json    # własna ścieżka raportu
 *
 * Upload wymaga env vars:
 *   CF_API_TOKEN   — token z permission "Account / Account Filter Lists / Edit"
 *   CF_ACCOUNT_ID  — ID konta Cloudflare
 *   CF_LIST_ID     — ID listy LUB lista wielu list rozdzielonych przecinkami:
 *                      "abc123..."                          # 1 lista
 *                      "abc123...,def456..."                # 2 listy (label = list1, list2)
 *                      "prod=abc123...,stg=def456..."       # 2 listy z etykietami
 *
 * Endpoint: PUT /accounts/{account_id}/rules/lists/{list_id}/items
 *   — replace-all (zastępuje całą zawartość listy). Idempotentne.
 *   Wiele list jest przetwarzanych sekwencyjnie z osobnym diff/confirm/poll
 *   i końcowym raportem statusów per lista.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, extname, join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src/lib/seo/redirectsMap.ts");
// OUT_DIR — katalog docelowy artefaktów. Domyślnie /mnt/documents (środowisko
// Lovable). Konfigurowalny przez env CF_OUT_DIR — przydatne w testach (tmpdir),
// CI z innymi mountami i lokalnym debug bez pisania do współdzielonej lokalizacji.
const OUT_DIR = (process.env.CF_OUT_DIR || "/mnt/documents").replace(/\/+$/, "");
const DOMAIN = "https://mcml.pro";

// ── CLI flags ───────────────────────────────────────────────────────────────
// --dry-run / -n  : nie zapisuj plików; pokaż diff vs poprzedni eksport + walidację.
// --strict        : exit 1 przy ostrzeżeniach (przydatne w CI).
// --upload        : po wygenerowaniu plików zrób PUT na Cloudflare API.
// --confirm       : pomiń interaktywne pytanie przed (nie-destrukcyjnym) PUT-em uploadu.
//                    UWAGA: --confirm SAM W SOBIE NIE WYSTARCZA dla --clear.
// --clear         : przed PUT-em z apiItems wyczyść listę (PUT z pustą tablicą).
//                    Razem z --upload daje "świeży reset". Sam (bez --upload)
//                    tylko czyści listę i kończy — przydatne np. przy migracji.
//                    Razem z --dry-run pokazuje ile reguł zostanie usuniętych
//                    (i dodanych, jeśli też --upload), ale nie wykonuje żadnego PUT.
//                    Tryb interaktywny: skrypt ZAWSZE prosi o wpisanie dokładnie
//                    słowa "CLEAR" (case-sensitive) per lista — `y/yes` nie wystarczy.
//                    Tryb non-interactive (CI / scripted): wymagana jest jawna flaga
//                    --yes-clear LUB env `CF_CLEAR_CONFIRM=CLEAR` (samo --confirm
//                    nie wystarczy, żeby uniknąć przypadkowego wymazania w pipeline).
// --json[=path]   : zapisz ustrukturyzowany raport (diff + clear + upload, per lista)
//                    do pliku JSON. Bez ścieżki domyślnie /mnt/documents/cloudflare-report.json.
//                    Działa też z --dry-run (raport "co by się stało", bez PUT).
//                    Alternatywnie: env CF_REPORT_JSON=/path/to/report.json.
const RAW_ARGS = process.argv.slice(2);
const ARGS = new Set(RAW_ARGS);
const DRY_RUN = ARGS.has("--dry-run") || ARGS.has("-n");
const STRICT = ARGS.has("--strict");
const UPLOAD = ARGS.has("--upload");
const CONFIRM = ARGS.has("--confirm");
const CLEAR = ARGS.has("--clear");
const YES_CLEAR = ARGS.has("--yes-clear") || process.env.CF_CLEAR_CONFIRM === "CLEAR";
const HELP = ARGS.has("--help") || ARGS.has("-h");
// --run-id[=value] : identyfikator przebiegu, do korelacji logów z raportem.
//                    Priorytet: --run-id=<v> > env CF_RUN_ID > wygenerowany UUID v4.
//                    Zapisywany w report.run_id i logowany do stdout na starcie.
const RUN_ID = (() => {
  const withValue = RAW_ARGS.find((a) => a.startsWith("--run-id="));
  if (withValue) {
    const v = withValue.slice("--run-id=".length).trim();
    if (v) return v;
  }
  if (process.env.CF_RUN_ID && process.env.CF_RUN_ID.trim()) return process.env.CF_RUN_ID.trim();
  return randomUUID();
})();
const JSON_REPORT_PATH = (() => {
  const withValue = RAW_ARGS.find((a) => a.startsWith("--json="));
  if (withValue) return withValue.slice("--json=".length).trim() || null;
  if (ARGS.has("--json")) return process.env.CF_REPORT_JSON || "/mnt/documents/cloudflare-report.json";
  return process.env.CF_REPORT_JSON || null;
})();
// --html[=path]   : zapisz dodatkowo czytelny raport HTML (te same dane co JSON,
//                    z tabelami diff/clear/upload). Bez ścieżki: pochodna od JSON
//                    (ta sama nazwa, rozszerzenie .html) lub /mnt/documents/cloudflare-report.html.
//                    Alternatywnie: env CF_REPORT_HTML=/path/to/report.html.
const HTML_REPORT_PATH = (() => {
  const withValue = RAW_ARGS.find((a) => a.startsWith("--html="));
  if (withValue) return withValue.slice("--html=".length).trim() || null;
  if (ARGS.has("--html") || process.env.CF_REPORT_HTML) {
    if (process.env.CF_REPORT_HTML) return process.env.CF_REPORT_HTML;
    if (JSON_REPORT_PATH) return JSON_REPORT_PATH.replace(/\.json$/i, "") + ".html";
    return "/mnt/documents/cloudflare-report.html";
  }
  return null;
})();
// --log[=path]    : zapisz transcript stdout/stderr do pliku log. RUN_ID jest
//                    dodawany i jako segment ścieżki, i do nazwy pliku
//                    (np. /mnt/documents/cloudflare-runs/<run_id>/
//                    export-cloudflare-redirects.<run_id>.log), żeby łatwo
//                    skorelować log z konkretnym raportem JSON/HTML.
//                    Bez ścieżki: pochodna od --json/--html lub domyślny
//                    katalog /mnt/documents/cloudflare-runs/<run_id>/.
//                    Env: CF_REPORT_LOG.
function fileSafeRunId(runId) {
  const safe = String(runId ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+$/, "")
    .slice(0, 128);
  return safe || "run";
}

function injectRunIdIntoLogFilename(fileName, runIdPath) {
  const ext = extname(fileName);
  const stem = ext ? fileName.slice(0, -ext.length) : fileName;
  return `${stem}.${runIdPath}${ext || ".log"}`;
}

function buildRunScopedLogPath(basePath, runId) {
  const runIdPath = fileSafeRunId(runId);
  const defaultFile = `export-cloudflare-redirects.${runIdPath}.log`;
  const base = String(basePath ?? "").trim();
  if (!base) return join(OUT_DIR, "cloudflare-runs", runIdPath, defaultFile);
  if (/[\\/]$/.test(base)) return join(base, runIdPath, defaultFile);

  const dir = dirname(base);
  const file = basename(base);
  const fileWithRunId = injectRunIdIntoLogFilename(file, runIdPath);
  return dir === "." ? join(runIdPath, fileWithRunId) : join(dir, runIdPath, fileWithRunId);
}
const LOG_PATH = (() => {
  const withValue = RAW_ARGS.find((a) => a.startsWith("--log="));
  let base = null;
  if (withValue) {
    base = withValue.slice("--log=".length).trim() || null;
  } else if (ARGS.has("--log") || process.env.CF_REPORT_LOG) {
    if (process.env.CF_REPORT_LOG) base = process.env.CF_REPORT_LOG;
    else if (JSON_REPORT_PATH) base = JSON_REPORT_PATH.replace(/\.json$/i, "") + ".log";
    else if (HTML_REPORT_PATH) base = HTML_REPORT_PATH.replace(/\.html?$/i, "") + ".log";
    else base = "";
  }
  return base !== null ? buildRunScopedLogPath(base, RUN_ID) : null;
})();

// Tee console.log/error → plik logu (po wstrzyknięciu RUN_ID do nazwy).
if (LOG_PATH) {
  try {
    mkdirSync(dirname(resolve(LOG_PATH)), { recursive: true });
    // Truncate / start fresh.
    writeFileSync(LOG_PATH, "", "utf8");
    const { appendFileSync } = await import("node:fs");
    const stripAnsi = (s) => String(s).replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");
    const tee = (orig, level) => (...args) => {
      orig(...args);
      try {
        const line = args
          .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
          .join(" ");
        appendFileSync(LOG_PATH, `[${new Date().toISOString()}] [run_id=${RUN_ID}] [${level}] ${stripAnsi(line)}\n`, "utf8");
      } catch { /* swallow */ }
    };
    console.log = tee(console.log.bind(console), "log");
    console.error = tee(console.error.bind(console), "err");
    console.warn = tee(console.warn.bind(console), "warn");
    console.error(`📝 Log zapisywany: ${LOG_PATH}`);
  } catch (err) {
    console.error(`⚠️  Nie udało się otworzyć log file: ${err?.message ?? err}`);
  }
}

// Pisze minimalny raport "abort" (counts=0, brak operacji) i kończy proces.
// Używane gdy skrypt nie może wystartować (--help, brak env, brak entries),
// ale użytkownik podał --json — CI musi mieć artefakt do zarchiwizowania.
// Schema kompatybilny ze standardowym raportem (te same pola top-level),
// z dodatkowym `aborted: { reason, detail, exit_code }`.
function writeAbortReportAndExit(reason, detail, exitCode = 1) {
  let stub = null;
  if (JSON_REPORT_PATH || HTML_REPORT_PATH) {
    try {
      let schemaVer = "1.1";
      try { schemaVer = REPORT_SCHEMA_VERSION; } catch { /* TDZ */ }
      let domainVal = null;
      try { domainVal = typeof DOMAIN === "string" ? DOMAIN : null; } catch { /* TDZ */ }
      stub = {
        schema_version: schemaVer,
        run_id: RUN_ID,
        generated_at: new Date().toISOString(),
        domain: domainVal,
        flags: {
          dry_run: !!DRY_RUN,
          clear: !!CLEAR,
          upload: !!UPLOAD,
          strict: !!STRICT,
          confirm: !!CONFIRM,
          yes_clear: !!YES_CLEAR,
          help: !!HELP,
        },
        totals: {
          lists: 0,
          by_status: { completed: 0, unchanged: 0, skipped: 0, failed: 0, timeout: 0 },
          operations: { total: 0, by_status: {} },
          diff: {
            total: { adds: 0, changes: 0, deletes: 0 },
            by_phase: {
              clear: { adds: 0, changes: 0, deletes: 0 },
              upload: { adds: 0, changes: 0, deletes: 0 },
            },
          },
        },
        lists: [],
        aborted: { reason, detail: detail ?? null, exit_code: exitCode },
      };
      try {
        if (typeof validateReport === "function") stub._validation = validateReport(stub);
      } catch { /* TDZ */ }
    } catch (err) {
      console.error(`⚠️  Nie udało się zbudować abort-raportu: ${err?.message ?? err}`);
    }
  }
  if (JSON_REPORT_PATH && stub) {
    try {
      const dir = dirname(resolve(JSON_REPORT_PATH));
      mkdirSync(dir, { recursive: true });
      writeFileSync(JSON_REPORT_PATH, JSON.stringify(stub, null, 2) + "\n", "utf8");
      console.error(`📄 Raport JSON (abort: ${reason}) zapisany: ${JSON_REPORT_PATH}`);
    } catch (err) {
      console.error(`⚠️  Nie udało się zapisać abort-raportu JSON: ${err?.message ?? err}`);
    }
  }
  if (HTML_REPORT_PATH && stub && typeof writeHtmlReport === "function") {
    try { writeHtmlReport(HTML_REPORT_PATH, stub); } catch (err) {
      console.error(`⚠️  Nie udało się zapisać abort-raportu HTML: ${err?.message ?? err}`);
    }
  }
  process.exit(exitCode);
}

if (HELP) {
  console.log(
    [
      "Użycie: node scripts/export-cloudflare-redirects.mjs [opcje]",
      "",
      "Opcje:",
      "  --dry-run, -n        Pokaż diff/plan bez wykonywania PUT.",
      "  --upload             Wgraj nowe reguły na Cloudflare (PUT /items).",
      "  --confirm            Pomiń interaktywne potwierdzenie (nie dotyczy --clear).",
      "  --clear              Wyczyść listę przed uploadem (wymaga 'CLEAR' lub --yes-clear).",
      "  --yes-clear          Akceptuj --clear w trybie non-interactive (CI).",
      "  --strict             Traktuj warningi jako błędy.",
      "  --json[=path]        Zapisz raport JSON (domyślnie /mnt/documents/cloudflare-report.json).",
      "  --html[=path]        Zapisz raport HTML (pochodna od --json lub /mnt/documents/cloudflare-report.html).",
      "  --log[=path]         Zapisz transcript do log (run_id wstrzyknięty w nazwę pliku).",
      "  --run-id=<id>        Identyfikator przebiegu do korelacji z logami (env CF_RUN_ID, domyślnie UUID).",
      "  --verify-run=<id>    Zweryfikuj spójność run_id w istniejącym katalogu cloudflare-runs/<id>/ (bez eksportu, exit 1 przy niespójności).",
      "  --help, -h           Pokaż tę pomoc.",
      "",
      "Env: CF_API_TOKEN, CF_ACCOUNT_ID, CF_LIST_ID, CF_REPORT_JSON, CF_REPORT_HTML, CF_REPORT_LOG, CF_CLEAR_CONFIRM.",
    ].join("\n"),
  );
  writeAbortReportAndExit("help", "User requested --help; no operations executed.", 0);
}

// ── Tryb --verify-run=<id>: walidacja istniejącego katalogu bez eksportu ────
// Sprawdza, że WSZYSTKIE pliki w cloudflare-runs/<id>/ (rekurencyjnie) zawierają
// w treści dokładnie ten sam run_id. Dodatkowo, jeśli istnieje manifest.json w
// katalogu, weryfikuje też wszystkie ścieżki z `manifest.artifacts` (poza
// `run_dir`) — łapie to także "finalne" artefakty leżące poza katalogiem run
// (np. /mnt/documents/cloudflare-bulk-redirects.csv).
// Zawsze zwraca exit 0 przy spójności i exit 1 przy jakiejkolwiek niezgodności,
// niezależnie od --strict (verify ma być deterministyczny w CI).
const VERIFY_RUN_ID = (() => {
  const withValue = RAW_ARGS.find((a) => a.startsWith("--verify-run="));
  if (withValue) {
    const v = withValue.slice("--verify-run=".length).trim();
    if (v) return v;
  }
  if (RAW_ARGS.includes("--verify-run")) {
    console.error("❌ --verify-run wymaga wartości: --verify-run=<run_id>");
    process.exit(1);
  }
  return null;
})();

if (VERIFY_RUN_ID) {
  const runIdPath = fileSafeRunId(VERIFY_RUN_ID);
  const runDir = join(OUT_DIR, "cloudflare-runs", runIdPath);
  if (!existsSync(runDir) || !statSync(runDir).isDirectory()) {
    console.error(`❌ --verify-run: katalog nie istnieje: ${runDir}`);
    process.exit(1);
  }

  const collected = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isFile()) collected.push(full);
    }
  };
  walk(runDir);

  // Dorzuć ścieżki z manifestu (jeśli jest) — łapie artefakty poza run_dir.
  const manifestPath = join(runDir, "manifest.json");
  if (existsSync(manifestPath)) {
    try {
      const m = JSON.parse(readFileSync(manifestPath, "utf8"));
      const arts = m?.artifacts ?? {};
      for (const [key, p] of Object.entries(arts)) {
        if (!p || key === "run_dir") continue;
        if (typeof p !== "string") continue;
        if (existsSync(p) && statSync(p).isFile() && !collected.includes(p)) {
          collected.push(p);
        }
      }
    } catch (err) {
      console.error(`⚠️  --verify-run: nie udało się sparsować manifest.json (${err?.message ?? err})`);
    }
  }

  if (collected.length === 0) {
    console.error(`❌ --verify-run: brak plików do weryfikacji w ${runDir}`);
    process.exit(1);
  }

  const mismatches = [];
  const perFile = [];
  for (const p of collected) {
    try {
      const content = readFileSync(p, "utf8");
      const ok = content.includes(VERIFY_RUN_ID);
      perFile.push({ path: p, ok, ...(ok ? {} : { reason: "run_id not found in file content" }) });
      if (!ok) mismatches.push({ path: p });
    } catch (err) {
      const msg = err?.message ?? String(err);
      perFile.push({ path: p, ok: false, reason: `read error: ${msg}` });
      mismatches.push({ path: p, error: msg });
    }
  }

  const report = {
    schema_version: 1,
    kind: "run_id-verification",
    mode: "verify-run",
    run_id: VERIFY_RUN_ID,
    run_dir: runDir,
    generated_at: new Date().toISOString(),
    stats: {
      checked: collected.length,
      ok: collected.length - mismatches.length,
      mismatched: mismatches.length,
      consistency_ratio: collected.length === 0 ? 0 : (collected.length - mismatches.length) / collected.length,
    },
    mismatches,
    files: perFile,
  };
  // Domyślny raport JSON walidacji ZAWSZE pod <run_dir>/run_id-verification.json
  // (backwards-compatible). Dodatkowo, jeśli użytkownik podał --json[=path],
  // zapisujemy KOPIĘ raportu pod wskazaną ścieżką (resolve względem OUT_DIR
  // dla ścieżek względnych — żeby CF_OUT_DIR było respektowane także tutaj).
  // Bez `=path` flaga --json kieruje raport do
  //   <OUT_DIR>/cloudflare-runs/<run_id>/run_id-verification.json,
  // czyli to samo miejsce co default — operacja idempotentna.
  const reportPath = join(runDir, "run_id-verification.json");
  const extraJsonPaths = [];
  if (JSON_REPORT_PATH) {
    const p = JSON_REPORT_PATH === "/mnt/documents/cloudflare-report.json"
      // Domyślna wartość parsera --json bez `=` — w trybie verify chcemy
      // domyślnie raport walidacji (a nie eksportu), w katalogu OUT_DIR.
      ? join(OUT_DIR, "cloudflare-runs", runIdPath, "run_id-verification.json")
      : (JSON_REPORT_PATH.startsWith("/") ? JSON_REPORT_PATH : join(OUT_DIR, JSON_REPORT_PATH));
    if (p !== reportPath) extraJsonPaths.push(p);
  }
  try {
    const json = JSON.stringify(report, null, 2);
    writeFileSync(reportPath, json, "utf8");
    console.log(`📝 raport walidacji: ${reportPath}`);
    for (const extra of extraJsonPaths) {
      try {
        mkdirSync(dirname(extra), { recursive: true });
        writeFileSync(extra, json, "utf8");
        console.log(`📝 raport walidacji (--json): ${extra}`);
      } catch (err) {
        console.error(`⚠️  nie udało się zapisać ${extra}: ${err?.message ?? err}`);
      }
    }
  } catch (err) {
    console.error(`⚠️  nie udało się zapisać ${reportPath}: ${err?.message ?? err}`);
  }

  // --html[=path]: dodatkowy, czytelny raport HTML walidacji.
  if (HTML_REPORT_PATH) {
    const htmlPath = HTML_REPORT_PATH === "/mnt/documents/cloudflare-report.html"
      ? join(OUT_DIR, "cloudflare-runs", runIdPath, "run_id-verification.html")
      : (HTML_REPORT_PATH.startsWith("/") ? HTML_REPORT_PATH : join(OUT_DIR, HTML_REPORT_PATH));
    try {
      const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      const rows = report.files.map((f) =>
        `<tr class="${f.ok ? "ok" : "bad"}"><td>${f.ok ? "✓" : "✗"}</td><td>${esc(f.key ?? "")}</td><td><code>${esc(f.path)}</code></td><td>${esc(f.reason ?? "")}</td></tr>`,
      ).join("\n");
      const html = `<!doctype html><html lang="pl"><meta charset="utf-8"><title>run_id verification — ${esc(report.run_id)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#222}h1{margin:0 0 8px}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}tr.ok{background:#f4faf5}tr.bad{background:#fdecec}code{font:12px ui-monospace,monospace}.stats{margin:8px 0;color:#555}</style>
<h1>run_id verification</h1>
<div class="stats">mode=<b>${esc(report.mode)}</b> · run_id=<code>${esc(report.run_id)}</code> · run_dir=<code>${esc(report.run_dir)}</code> · generated_at=${esc(report.generated_at)}</div>
<div class="stats">checked=<b>${report.stats.checked}</b> · ok=<b>${report.stats.ok}</b> · mismatched=<b>${report.stats.mismatched}</b> · ratio=<b>${report.stats.consistency_ratio.toFixed(4)}</b></div>
<table><thead><tr><th>OK</th><th>key</th><th>path</th><th>reason</th></tr></thead><tbody>${rows}</tbody></table></html>`;
      mkdirSync(dirname(htmlPath), { recursive: true });
      writeFileSync(htmlPath, html, "utf8");
      console.log(`📝 raport walidacji (--html): ${htmlPath}`);
    } catch (err) {
      console.error(`⚠️  nie udało się zapisać HTML raportu walidacji: ${err?.message ?? err}`);
    }
  }

  console.log(`🔎 --verify-run=${VERIFY_RUN_ID}`);
  console.log(`   katalog: ${runDir}`);
  console.log(`   sprawdzono plików: ${collected.length}`);
  if (mismatches.length === 0) {
    console.log(`✓ run_id consistency OK: wszystkie ${collected.length} pliki zawierają run_id=${VERIFY_RUN_ID}`);
    process.exit(0);
  }
  console.error(`❌ run_id mismatch w ${mismatches.length}/${collected.length} pliku(-ach):`);
  for (const m of mismatches) {
    console.error(`   • ${m.path}${m.error ? ` (read error: ${m.error})` : ""}`);
  }
  process.exit(1);
}

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
  writeAbortReportAndExit("no_entries", "SEO_REDIRECTS map is empty or unparseable.", 1);
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
console.log(`run_id=${RUN_ID}`);
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
  writeAbortReportAndExit("validation_errors", `${errors.length} validation error(s) in redirects map.`, 1);
}

if (DRY_RUN && !CLEAR && !UPLOAD) {
  console.log(`\n🔍 DRY RUN — nie zapisano żadnych plików.`);
  console.log(`   Aby wykonać eksport: node scripts/export-cloudflare-redirects.mjs\n`);

  // Gdy użytkownik podał --json/--html (lub env CF_REPORT_*), zapisz raport
  // "dry-run-only" (puste results/counts, ale pełne meta: schema_version,
  // run_id, flags, walidacja). Dzięki temu CI / testy integracyjne mogą
  // archiwizować artefakty także bez --upload (bo --upload + --dry-run
  // odpaliłby fetch do Cloudflare API). Idempotentne i backwards-compatible:
  // bez --json/--html zachowanie się nie zmienia.
  //
  // setImmediate — zapis odpalamy po zakończeniu top-level evaluation, żeby
  // uniknąć TDZ na const-ach (REPORT_SCHEMA_VERSION, helperach itd.) używanych
  // wewnątrz writeJsonReport/buildReportInMemory/writeHtmlReport.
  if (JSON_REPORT_PATH || HTML_REPORT_PATH) {
    setImmediate(() => {
      try {
        const emptyResults = [];
        const emptyCounts = { completed: 0, unchanged: 0, skipped: 0, failed: 0, timeout: 0 };
        const emptyOps = [];
        let report = null;
        if (JSON_REPORT_PATH) {
          report = writeJsonReport(JSON_REPORT_PATH, emptyResults, emptyCounts, emptyOps);
        }
        if (HTML_REPORT_PATH) {
          const reportForHtml = report ?? buildReportInMemory(emptyResults, emptyCounts, emptyOps);
          writeHtmlReport(HTML_REPORT_PATH, reportForHtml);
        }
      } catch (err) {
        console.error(`⚠️  Nie udało się zapisać raportu dry-run: ${err?.message ?? err}`);
        process.exit(1);
      }
      if (STRICT && warnings.length) process.exit(1);
      process.exit(0);
    });
  } else {
    if (STRICT && warnings.length) process.exit(1);
    process.exit(0);
  }
}

if (DRY_RUN && (CLEAR || UPLOAD)) {
  console.log(
    `\n🔍 DRY RUN aktywny razem z ${CLEAR ? "--clear" : ""}${CLEAR && UPLOAD ? " + " : ""}${UPLOAD ? "--upload" : ""} ` +
      `— pominę zapis plików oraz wszelkie PUT-y do Cloudflare (tylko GET + raport).`,
  );
}

// W trybie DRY_RUN nie zapisujemy plików — apiItems generujemy zawsze (w pamięci),
// bo i tak są potrzebne do diff/walidacji w uploadToCloudflare.
if (!DRY_RUN) mkdirSync(OUT_DIR, { recursive: true });

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
  "run_id",
].join(",");

const cfRows = entries.map(({ from, to }) => {
  const sourceUrl = `${DOMAIN}${from}`;
  const targetUrl = `${DOMAIN}${to}`;
  return [sourceUrl, targetUrl, "301", "true", "false", "false", "false", RUN_ID].join(",");
});

const cfCsv = [cfHeader, ...cfRows].join("\n") + "\n";
if (!DRY_RUN) writeFileSync(`${OUT_DIR}/cloudflare-bulk-redirects.csv`, cfCsv, "utf8");

// ── 2) Uproszczony CSV "source,target" ──────────────────────────────────────
const simpleHeader = "source,target,run_id";
const simpleRows = entries.map(
  ({ from, to }) => `${DOMAIN}${from},${DOMAIN}${to},${RUN_ID}`,
);
const simpleCsv = [simpleHeader, ...simpleRows].join("\n") + "\n";
if (!DRY_RUN) writeFileSync(`${OUT_DIR}/cloudflare-redirects-simple.csv`, simpleCsv, "utf8");

// ── 3) JSON dla Cloudflare API (PUT /lists/{id}/items) ─────────────────────
// Uwaga: pole `run_id` znajduje się obok obiektu `redirect` (Cloudflare API
// ignoruje nieznane pola na poziomie itemu), żeby zachować spójność danych
// między CSV/JSON/manifestem przy zachowaniu zgodności ze schematem CF.
const apiItems = entries.map(({ from, to }) => ({
  run_id: RUN_ID,
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
if (!DRY_RUN) {
  writeFileSync(
    `${OUT_DIR}/cloudflare-bulk-redirects.json`,
    JSON.stringify(apiItems, null, 2) + "\n",
    "utf8",
  );
}

// ── 4) Czytelny TXT z powodami ──────────────────────────────────────────────
const GENERATED_AT = new Date().toISOString();
const txtLines = [
  `# Cloudflare Bulk Redirects — eksport z SEO_REDIRECTS`,
  `# run_id: ${RUN_ID}`,
  `# Domena: ${DOMAIN}`,
  `# Wpisów: ${entries.length}`,
  `# Wygenerowano: ${GENERATED_AT}`,
  `# Status: 301 (permanent), Preserve query string: true`,
  ``,
  ...entries.map(
    ({ from, to, reason }) =>
      `${DOMAIN}${from}  →  ${DOMAIN}${to}${reason ? `   # ${reason}` : ""}`,
  ),
  ``,
];
if (!DRY_RUN) writeFileSync(`${OUT_DIR}/cloudflare-redirects.txt`, txtLines.join("\n"), "utf8");

// ── 4b) Manifest pośredni — ustandaryzowany schemat (spójność pipeline'u) ───
// Pola obowiązkowe:
//   schema_version : monotonicznie rosnący integer (bumpować przy breaking change)
//   run_id         : identyfikator przebiegu (ten sam co w CSV/JSON/log)
//   generated_at   : ISO-8601 UTC, wspólny dla całego runu
//   config_hash    : sha256 (skrócony) źródłowej mapy SEO_REDIRECTS + DOMAIN +
//                    schema_version → wykrywanie zmian konfiguracji między runami
//   domain         : docelowa domena (https://mcml.pro)
//   totals         : agregaty (na razie liczba wpisów)
//   inputs         : pliki źródłowe pipeline'u (do reprodukcji runu)
//   artifacts      : ścieżki WSZYSTKICH artefaktów (pośrednich i finalnych);
//                    `null` = artefakt nie został wygenerowany w tym runie.
const MANIFEST_SCHEMA_VERSION = 3;
const SOURCE_BYTES = (() => {
  try { return readFileSync(SRC, "utf8"); } catch { return ""; }
})();
const CONFIG_HASH = createHash("sha256")
  .update(`v${MANIFEST_SCHEMA_VERSION}|${DOMAIN}|`)
  .update(SOURCE_BYTES)
  .digest("hex")
  .slice(0, 16);

const RUN_DIR = `${OUT_DIR}/cloudflare-runs/${fileSafeRunId(RUN_ID)}`;

// ── Linki do artefaktów dla danego run_id ──────────────────────────────────
// `download_url` (preferowany do otwarcia w UI) wymaga publicznego base URL,
// pod którym serwowane jest /mnt/documents. Konfigurowalne przez env:
//   CF_ARTIFACT_BASE_URL=https://example.com/artifacts   (bez końcowego "/")
// Jeśli env nie jest ustawione → `download_url` = null, zostają tylko
// `file_url` (file://) i `rel_path` (ścieżka względna do OUT_DIR), które
// działają lokalnie i są łatwe do złożenia w dowolnym proxy.
const ARTIFACT_BASE_URL = (process.env.CF_ARTIFACT_BASE_URL || "").replace(/\/+$/, "") || null;
const toRelPath = (absPath) => {
  if (!absPath) return null;
  const abs = String(absPath);
  return abs.startsWith(`${OUT_DIR}/`) ? abs.slice(OUT_DIR.length + 1) : abs;
};
const linksFor = (absPath) => {
  if (!absPath) return null;
  const rel = toRelPath(absPath);
  return {
    path: absPath,
    rel_path: rel,
    file_url: `file://${absPath}`,
    download_url: ARTIFACT_BASE_URL && rel ? `${ARTIFACT_BASE_URL}/${rel}` : null,
  };
};

const artifactPaths = {
  bulk_csv: DRY_RUN ? null : `${OUT_DIR}/cloudflare-bulk-redirects.csv`,
  bulk_json: DRY_RUN ? null : `${OUT_DIR}/cloudflare-bulk-redirects.json`,
  simple_csv: DRY_RUN ? null : `${OUT_DIR}/cloudflare-redirects-simple.csv`,
  txt: DRY_RUN ? null : `${OUT_DIR}/cloudflare-redirects.txt`,
  log: LOG_PATH ?? null,
  json_report: JSON_REPORT_PATH ?? null,
  html_report: HTML_REPORT_PATH ?? null,
  manifest: `${RUN_DIR}/cloudflare-export-manifest.json`,
  run_dir: RUN_DIR,
};

const manifest = {
  schema_version: MANIFEST_SCHEMA_VERSION,
  run_id: RUN_ID,
  generated_at: GENERATED_AT,
  config_hash: CONFIG_HASH,
  domain: DOMAIN,
  dry_run: DRY_RUN,
  totals: { entries: entries.length },
  inputs: {
    source_map: SRC,
    prev_simple_csv: existsSync(PREV_FILE) ? PREV_FILE : null,
  },
  // Surowe ścieżki — kompat wstecz (schema v2).
  artifacts: artifactPaths,
  // Skróty do najczęściej otwieranych raportów (UX).
  links: {
    json_report: linksFor(artifactPaths.json_report),
    html_report: linksFor(artifactPaths.html_report),
    manifest: linksFor(artifactPaths.manifest),
    log: linksFor(artifactPaths.log),
  },
  // Per-artefakt linki (download_url/file_url/rel_path) dla wszystkich plików.
  artifact_links: Object.fromEntries(
    Object.entries(artifactPaths).map(([k, v]) => [k, linksFor(v)]),
  ),
};
if (!DRY_RUN) {
  const manifestPath = manifest.artifacts.manifest;
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(
    `✓ ${manifestPath} (manifest v${MANIFEST_SCHEMA_VERSION} run_id=${RUN_ID} config_hash=${CONFIG_HASH})`,
  );
  if (manifest.links.html_report?.download_url) {
    console.log(`🔗 HTML: ${manifest.links.html_report.download_url}`);
  }
  if (manifest.links.json_report?.download_url) {
    console.log(`🔗 JSON: ${manifest.links.json_report.download_url}`);
  }
}

// ── 4c) Walidacja spójności run_id we wszystkich artefaktach ────────────────
// Każdy plik produkowany przez ten run MUSI zawierać RUN_ID w treści. Dzięki
// temu artefakty z katalogu cloudflare-runs/<run_id>/ + powiązane finalne pliki
// (bulk_csv/json, simple_csv, txt, log, json/html report) można odfiltrować
// czysto po `grep` bez polegania na nazwach plików.
// W razie niezgodności: log błędu + (w trybie --strict) exit 1.
if (!DRY_RUN) {
  // ── Test-only hook: nadpisz wskazany artefakt treścią bez RUN_ID, żeby
  // zasymulować niespójność i sprawdzić exit-code w trybie --strict. Aktywne
  // wyłącznie gdy ustawiono CF_TEST_CORRUPT_ARTIFACT (klucz z manifest.artifacts,
  // np. "txt", "bulk_csv"). Nigdy nie używać poza testami integracyjnymi.
  const CORRUPT_KEY = (process.env.CF_TEST_CORRUPT_ARTIFACT || "").trim();
  if (CORRUPT_KEY) {
    const target = manifest.artifacts[CORRUPT_KEY];
    if (target && existsSync(target)) {
      try {
        writeFileSync(target, `# CF_TEST_CORRUPT_ARTIFACT=${CORRUPT_KEY} — bez run_id\n`, "utf8");
        console.warn(`⚠️  TEST HOOK: nadpisano ${CORRUPT_KEY} (${target}) treścią bez run_id`);
      } catch (err) {
        console.error(`⚠️  TEST HOOK failed: ${err?.message ?? err}`);
      }
    } else {
      console.warn(`⚠️  TEST HOOK: artefakt "${CORRUPT_KEY}" nie istnieje w manifest.artifacts`);
    }
  }

  const checks = Object.entries(manifest.artifacts)
    .filter(([key, p]) => p && key !== "run_dir" && existsSync(p));
  const mismatches = [];
  const perFile = [];
  for (const [key, p] of checks) {
    try {
      const content = readFileSync(p, "utf8");
      const ok = content.includes(RUN_ID);
      perFile.push({ key, path: p, ok, ...(ok ? {} : { reason: "run_id not found in file content" }) });
      if (!ok) mismatches.push({ key, path: p });
    } catch (err) {
      const msg = err?.message ?? String(err);
      perFile.push({ key, path: p, ok: false, reason: `read error: ${msg}` });
      mismatches.push({ key, path: p, error: msg });
    }
  }

  // Raport walidacji jako osobny artefakt — łatwy do parsowania w CI/dashboards.
  const verificationReport = {
    schema_version: 1,
    kind: "run_id-verification",
    mode: "post-export",
    run_id: RUN_ID,
    run_dir: RUN_DIR,
    generated_at: new Date().toISOString(),
    stats: {
      checked: checks.length,
      ok: checks.length - mismatches.length,
      mismatched: mismatches.length,
      consistency_ratio: checks.length === 0 ? 0 : (checks.length - mismatches.length) / checks.length,
    },
    mismatches,
    files: perFile,
  };
  const verificationPath = `${RUN_DIR}/run_id-verification.json`;
  try {
    mkdirSync(RUN_DIR, { recursive: true });
    writeFileSync(verificationPath, JSON.stringify(verificationReport, null, 2), "utf8");
    console.log(`📝 raport walidacji: ${verificationPath}`);
  } catch (err) {
    console.error(`⚠️  nie udało się zapisać ${verificationPath}: ${err?.message ?? err}`);
  }

  if (mismatches.length === 0) {
    console.log(`✓ run_id consistency: ${checks.length} artefaktów zawiera run_id=${RUN_ID}`);
  } else {
    console.error(`❌ run_id mismatch w ${mismatches.length} artefakcie(-ach):`);
    for (const m of mismatches) {
      console.error(`   • ${m.key}: ${m.path}${m.error ? ` (read error: ${m.error})` : ""}`);
    }
    if (STRICT) {
      console.error(`💥 --strict: kończę z exit code 1 z powodu niespójności run_id.`);
      process.exit(1);
    }
  }
}

// ── Podsumowanie do stdout ──────────────────────────────────────────────────
const byTarget = entries.reduce((acc, e) => {
  acc[e.to] = (acc[e.to] || 0) + 1;
  return acc;
}, {});
if (DRY_RUN) {
  console.log(`✓ [dry-run] przygotowano ${entries.length} reguł 301 dla ${DOMAIN} (bez zapisu plików)`);
} else {
  console.log(`✓ Wyeksportowano ${entries.length} reguł 301 dla ${DOMAIN}`);
  console.log(`✓ /mnt/documents/cloudflare-bulk-redirects.csv  (Dashboard upload)`);
  console.log(`✓ /mnt/documents/cloudflare-bulk-redirects.json (API PUT /lists/{id}/items)`);
  console.log(`✓ /mnt/documents/cloudflare-redirects-simple.csv (source,target)`);
  console.log(`✓ /mnt/documents/cloudflare-redirects.txt       (z powodami)`);
}
console.log(`\nTop celów:`);
for (const [to, n] of Object.entries(byTarget).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  ${n.toString().padStart(3)} → ${to}`);
}

// ── 5) Opcjonalny upload do Cloudflare API ─────────────────────────────────
if (UPLOAD || CLEAR) {
  await uploadToCloudflare();
}

async function uploadToCloudflare() {
  const token = process.env.CF_API_TOKEN;
  const accountId = process.env.CF_ACCOUNT_ID;
  const listIdRaw = process.env.CF_LIST_ID;

  console.log(`\n${"─".repeat(72)}\n☁️  Upload do Cloudflare API\n${"─".repeat(72)}`);

  // Walidacja apiItems tylko gdy faktycznie wgramy nowe reguły. --clear bez
  // --upload czyści listę i wychodzi, więc kształt apiItems jest nieistotny.
  if (UPLOAD) validateApiItemsSchema(apiItems);

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
    writeAbortReportAndExit("missing_env", `Missing required env vars: ${missing.join(", ")}.`, 1);
  }

  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    console.error(`❌ CF_ACCOUNT_ID powinien być 32-znakowym hex (otrzymano długość ${accountId.length}).`);
    writeAbortReportAndExit("invalid_account_id", `CF_ACCOUNT_ID must be 32-char hex (got length ${accountId.length}).`, 1);
  }

  // ── Parsuj CF_LIST_ID: "id1" | "id1,id2" | "label=id1,label2=id2" ────────
  const lists = parseListIds(listIdRaw);
  if (!lists.length) {
    console.error(`❌ CF_LIST_ID nie zawiera żadnego prawidłowego ID (32-znakowy hex).`);
    writeAbortReportAndExit("invalid_list_id", "CF_LIST_ID does not contain any valid 32-char hex id.", 1);
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
    sync: "✅",
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

    // Szczegóły operacji Cloudflare (PUT-y wykonane na tej liście).
    // Każda faza (clear / upload) ma własny operation_id i finalny status.
    const ops = Array.isArray(r.operations) ? r.operations : [];
    for (const op of ops) {
      const opIcon = statusIcon[op.status] ?? "? ";
      const opIdStr = op.operationId ?? "—";
      const opNote = op.error
        ? `  — ${op.error}`
        : op.timeoutSec
          ? `  — timeout po ${op.timeoutSec}s`
          : op.note
            ? `  — ${op.note}`
            : "";
      console.log(
        `       ${opIcon} ${op.phase.padEnd(7)} ${op.status.padEnd(10)} op_id=${opIdStr}${opNote}`,
      );
    }
  }
  console.log(
    `\n  Sumarycznie: ${counts.completed} completed, ${counts.unchanged} unchanged, ` +
      `${counts.skipped} skipped, ${counts.failed} failed, ${counts.timeout} timeout`,
  );

  // Agregat operacji (suma wszystkich PUT-ów na wszystkich listach).
  const allOps = results.flatMap((r) => (Array.isArray(r.operations) ? r.operations : []));
  if (allOps.length) {
    const opCounts = allOps.reduce((acc, op) => {
      acc[op.status] = (acc[op.status] ?? 0) + 1;
      return acc;
    }, {});
    const summary = Object.entries(opCounts)
      .map(([s, n]) => `${n} ${s}`)
      .join(", ");
    console.log(`  Operacji Cloudflare: ${allOps.length} (${summary})`);
  }


  // ── Opcjonalny zapis ustrukturyzowanego raportu JSON ─────────────────────
  // Zawiera: meta (timestamp, domain, flagi, totals), per-list (status, stats,
  // diff details, operations z operation_id). Zapisywany ZAWSZE jeśli włączono
  // --json (lub env), również przy failed/timeout, żeby CI mógł go zarchiwizować.
  let jsonReport = null;
  if (JSON_REPORT_PATH) {
    jsonReport = writeJsonReport(JSON_REPORT_PATH, results, counts, allOps);
  }
  if (HTML_REPORT_PATH) {
    // Jeśli nie wygenerowano JSON-a (tylko --html), zbuduj raport in-memory
    // tym samym pipeline'em — gwarantuje 1:1 zgodność danych.
    const reportForHtml = jsonReport ?? buildReportInMemory(results, counts, allOps);
    writeHtmlReport(HTML_REPORT_PATH, reportForHtml);
  }

  if (counts.failed > 0 || counts.timeout > 0) {
    console.error(`\n⛔ Co najmniej jedna lista nie zakończyła się sukcesem.`);
    process.exit(1);
  }
  if (DRY_RUN) {
    console.log(`\n🔍 DRY RUN — nie wykonano żadnego PUT-u na Cloudflare.`);
    if (STRICT && warnings.length) process.exit(1);
  }
}

// Aktualna wersja schematu raportu JSON. Bump przy każdej zmianie kontraktu.
//   "1"   — początkowa wersja
//   "1.1" — dodano _validation { ok, issues[] } + placeholdery dla braków
const REPORT_SCHEMA_VERSION = "1.1";

// Definicja wymaganych pól na każdym poziomie. Używana przez validateReport,
// żeby brakujące/niewłaściwe pola trafiły do _validation.issues, ale zapis
// pliku nadal nastąpił (best-effort dla CI).
const REPORT_REQUIRED = {
  top: ["schema_version", "run_id", "generated_at", "domain", "flags", "totals", "lists"],
  flags: ["dry_run", "clear", "upload", "strict"],
  totals: ["lists", "by_status", "operations"],
  list: ["label", "id", "status"],
  operation: ["phase", "status"],
};

function validateReport(report) {
  const issues = [];
  const push = (path, msg) => issues.push({ path, message: msg });

  for (const f of REPORT_REQUIRED.top) {
    if (report[f] === undefined || report[f] === null) push(f, "missing required field");
  }
  if (report.schema_version && report.schema_version !== REPORT_SCHEMA_VERSION) {
    push("schema_version", `expected "${REPORT_SCHEMA_VERSION}", got "${report.schema_version}"`);
  }
  if (report.generated_at && Number.isNaN(Date.parse(report.generated_at))) {
    push("generated_at", "not a valid ISO timestamp");
  }
  if (report.flags && typeof report.flags === "object") {
    for (const f of REPORT_REQUIRED.flags) {
      if (typeof report.flags[f] !== "boolean") push(`flags.${f}`, "missing or not boolean");
    }
  }
  if (report.totals && typeof report.totals === "object") {
    for (const f of REPORT_REQUIRED.totals) {
      if (report.totals[f] === undefined || report.totals[f] === null) {
        push(`totals.${f}`, "missing required field");
      }
    }
  }
  if (Array.isArray(report.lists)) {
    report.lists.forEach((l, i) => {
      for (const f of REPORT_REQUIRED.list) {
        if (l[f] === undefined || l[f] === null || l[f] === "") {
          push(`lists[${i}].${f}`, "missing required field");
        }
      }
      if (Array.isArray(l.operations)) {
        l.operations.forEach((op, j) => {
          for (const f of REPORT_REQUIRED.operation) {
            if (op[f] === undefined || op[f] === null) {
              push(`lists[${i}].operations[${j}].${f}`, "missing required field");
            }
          }
        });
      }
    });
  } else if (report.lists !== undefined) {
    push("lists", "must be an array");
  }
  return { ok: issues.length === 0, issues };
}

// Zapisuje ustrukturyzowany raport JSON dla multi-list flow.
// Schema "1.1": top-level + per-list pola wymagane (patrz REPORT_REQUIRED).
// Wynik validateReport trafia do report._validation. Plik jest zapisywany
// ZAWSZE (nawet przy brakach), żeby CI mógł go zarchiwizować i pokazać issues.
// Skumulowane statystyki diff (adds/changes/deletes) po wszystkich listach.
// Zwraca strukturę: { total, by_phase: { clear, upload } }, żeby łatwo było
// porównać przebiegi (np. „w tym wpisie clear usunął 120, a upload dodał 118").
//
// Heurystyka phase splitting (per lista, na bazie obecnych operations):
//   • clear-only           → wszystkie deletes idą do `clear`, adds/changes = 0.
//   • upload-only          → wszystko (adds/changes/deletes) idzie do `upload`.
//   • clear + upload       → clear.deletes = remoteCount (cała lista przed wipe),
//                            upload.adds   = localCount (pełna nowa lista),
//                            upload.changes = upload.deletes = 0 (po clear nie ma diffa).
//   • brak operations      → traktujemy jak "planowany diff" (upload).
function aggregateDiffStats(results) {
  const empty = () => ({ adds: 0, changes: 0, deletes: 0 });
  const total = empty();
  const byPhase = { clear: empty(), upload: empty() };
  if (!Array.isArray(results)) return { total, by_phase: byPhase };

  for (const r of results) {
    const s = r?.stats ?? {};
    const adds = Number(s.adds) || 0;
    const changes = Number(s.changes) || 0;
    const deletes = Number(s.deletes) || 0;
    const remoteCount = Number(s.remoteCount) || 0;
    const localCount = Number(s.localCount) || 0;

    total.adds += adds;
    total.changes += changes;
    total.deletes += deletes;

    const ops = Array.isArray(r?.operations) ? r.operations : [];
    const hasClear = ops.some((o) => /clear/i.test(o?.phase ?? ""));
    const hasUpload = ops.some((o) => o?.phase === "upload");

    if (hasClear && hasUpload) {
      byPhase.clear.deletes += remoteCount;
      byPhase.upload.adds += localCount;
    } else if (hasClear) {
      byPhase.clear.deletes += remoteCount || deletes;
    } else {
      byPhase.upload.adds += adds;
      byPhase.upload.changes += changes;
      byPhase.upload.deletes += deletes;
    }
  }
  return { total, by_phase: byPhase };
}

// Buduje obiekt raportu (bez zapisu) — używany przez writeJsonReport
// oraz przez --html gdy --json nie jest aktywny. Gwarantuje 1:1 zgodność.
function buildReportInMemory(results, counts, allOps) {
  try {
    const opCounts = (allOps ?? []).reduce((acc, op) => {
      const s = op?.status ?? "unknown";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});
    const report = {
      schema_version: REPORT_SCHEMA_VERSION,
      run_id: RUN_ID,
      generated_at: new Date().toISOString(),
      domain: DOMAIN ?? null,
      flags: {
        dry_run: !!DRY_RUN,
        clear: !!CLEAR,
        upload: !!UPLOAD,
        strict: !!STRICT,
        confirm: !!CONFIRM,
        yes_clear: !!YES_CLEAR,
      },
      totals: {
        lists: Array.isArray(results) ? results.length : 0,
        by_status: { ...(counts ?? {}) },
        operations: {
          total: Array.isArray(allOps) ? allOps.length : 0,
          by_status: opCounts,
        },
        diff: aggregateDiffStats(results),
      },
      lists: Array.isArray(results)
        ? results.map((r) => ({
            label: r?.label ?? null,
            id: r?.id ?? null,
            status: r?.status ?? "unknown",
            note: r?.note ?? null,
            error: r?.error ?? null,
            stats: r?.stats ?? null,
            operations: Array.isArray(r?.operations) ? r.operations : [],
          }))
        : [],
    };
    report._validation = validateReport(report);
    return report;
  } catch (err) {
    return {
      schema_version: REPORT_SCHEMA_VERSION,
      run_id: RUN_ID,
      generated_at: new Date().toISOString(),
      domain: DOMAIN ?? null,
      flags: {},
      totals: { lists: 0, by_status: {}, operations: { total: 0, by_status: {} } },
      lists: [],
      _build_error: err?.message ?? String(err),
      _validation: { ok: false, issues: [{ path: "_build_error", message: err?.message ?? String(err) }] },
    };
  }
}

// Zapisuje ustrukturyzowany raport JSON dla multi-list flow.
function writeJsonReport(targetPath, results, counts, allOps) {
  const report = buildReportInMemory(results, counts, allOps);

  report._validation = validateReport(report);
  if (!report._validation.ok) {
    console.error(
      `⚠️  Raport JSON ma ${report._validation.issues.length} problem(ów) walidacji ` +
        `(schema_version=${REPORT_SCHEMA_VERSION}). Plik zostanie zapisany mimo to.`,
    );
    for (const issue of report._validation.issues.slice(0, 10)) {
      console.error(`   • ${issue.path}: ${issue.message}`);
    }
    if (report._validation.issues.length > 10) {
      console.error(`   … i ${report._validation.issues.length - 10} więcej (zobacz _validation w pliku).`);
    }
  }

  try {
    const dir = dirname(resolve(targetPath));
    mkdirSync(dir, { recursive: true });
    writeFileSync(targetPath, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log(
      `\n📄 Raport JSON zapisany: ${targetPath} ` +
        `(schema=${REPORT_SCHEMA_VERSION}, validation=${report._validation.ok ? "ok" : "issues"})`,
    );
  } catch (err) {
    console.error(`⚠️  Nie udało się zapisać raportu JSON do ${targetPath}: ${err?.message ?? err}`);
  }
  return report;
}

// HTML escape (single-source helper, używany w renderze raportu HTML).
function htmlEscape(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Renderuje pojedynczą tabelę HTML; jeśli rows puste — zwraca placeholder.
function renderHtmlTable(headers, rows, emptyMsg) {
  if (!rows.length) return `<p class="empty">${htmlEscape(emptyMsg)}</p>`;
  const thead = headers.map((h) => `<th>${htmlEscape(h)}</th>`).join("");
  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${htmlEscape(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
}

// Generuje samodzielny plik HTML z raportu JSON (te same dane).
// Sekcje per-list: meta, diff (adds/changes/deletes), clear (operacje fazy clear),
// upload (operacje fazy upload + verify-clear). Plik zapisywany ZAWSZE — także
// gdy raport jest "abort" lub ma błędy walidacji.
function writeHtmlReport(targetPath, report) {
  const statusClass = (s) => {
    const v = String(s ?? "").toLowerCase();
    if (["completed", "ok"].includes(v)) return "ok";
    if (["unchanged", "skipped"].includes(v)) return "muted";
    if (["failed", "timeout"].includes(v)) return "bad";
    return "neutral";
  };

  const flagsHtml = Object.entries(report.flags ?? {})
    .map(([k, v]) => `<span class="chip ${v ? "on" : "off"}">${htmlEscape(k)}: ${v ? "on" : "off"}</span>`)
    .join(" ");

  const totalsRows = Object.entries(report.totals?.by_status ?? {}).map(([k, v]) => [k, String(v)]);
  const opTotals = Object.entries(report.totals?.operations?.by_status ?? {}).map(([k, v]) => [k, String(v)]);

  const listSections = (report.lists ?? [])
    .map((l, idx) => {
      const stats = l.stats ?? {};
      const details = stats.details ?? {};
      const ops = Array.isArray(l.operations) ? l.operations : [];

      const adds = (details.adds ?? []).map((u) => ["+ add", u]);
      const changes = (details.changes ?? []).map((c) => [
        "~ change",
        typeof c === "string" ? c : c?.source ?? JSON.stringify(c),
        typeof c === "object" && c?.field ? c.field : "",
      ]);
      const deletes = (details.deletes ?? []).map((u) => ["− delete", u]);

      const diffRows = [
        ...adds.map((r) => [r[0], r[1], ""]),
        ...changes,
        ...deletes.map((r) => [r[0], r[1], ""]),
      ];

      const clearOps = ops.filter((o) => /clear/i.test(o.phase ?? ""));
      const uploadOps = ops.filter((o) => !/clear/i.test(o.phase ?? ""));

      const opRow = (o) => [
        o.phase ?? "",
        o.status ?? "",
        o.operationId ?? "",
        o.timeoutSec != null ? `${o.timeoutSec}s` : "",
        o.error ?? o.note ?? "",
      ];

      return `
<section class="list">
  <h2>
    <span class="badge ${statusClass(l.status)}">${htmlEscape(l.status ?? "unknown")}</span>
    <span class="label">${htmlEscape(l.label ?? "(no label)")}</span>
    <code class="id">${htmlEscape(l.id ?? "")}</code>
  </h2>
  ${l.error ? `<p class="err">⛔ ${htmlEscape(l.error)}</p>` : ""}
  ${l.note ? `<p class="note">ℹ️ ${htmlEscape(l.note)}</p>` : ""}

  <div class="stats">
    <span>local: <b>${htmlEscape(stats.localCount ?? "—")}</b></span>
    <span>remote: <b>${htmlEscape(stats.remoteCount ?? "—")}</b></span>
    <span>+adds: <b>${htmlEscape(stats.adds ?? adds.length)}</b></span>
    <span>~changes: <b>${htmlEscape(stats.changes ?? changes.length)}</b></span>
    <span>−deletes: <b>${htmlEscape(stats.deletes ?? deletes.length)}</b></span>
  </div>

  <h3>Diff</h3>
  ${renderHtmlTable(["Op", "Source", "Field"], diffRows, "Brak różnic — listy zsynchronizowane.")}

  <h3>Clear</h3>
  ${renderHtmlTable(["Phase", "Status", "Operation ID", "Timeout", "Note / Error"], clearOps.map(opRow), "Brak operacji clear (nie użyto --clear lub pominięto).")}

  <h3>Upload</h3>
  ${renderHtmlTable(["Phase", "Status", "Operation ID", "Timeout", "Note / Error"], uploadOps.map(opRow), "Brak operacji upload (nie użyto --upload lub dry-run).")}
</section>`;
    })
    .join("\n");

  const validationHtml = report._validation && !report._validation.ok
    ? `<div class="warn"><strong>⚠️ ${report._validation.issues.length} problem(ów) walidacji schematu:</strong>
        <ul>${report._validation.issues
          .slice(0, 20)
          .map((i) => `<li><code>${htmlEscape(i.path)}</code>: ${htmlEscape(i.message)}</li>`)
          .join("")}</ul></div>`
    : "";

  const abortedHtml = report.aborted
    ? `<div class="warn"><strong>⛔ Aborted:</strong> ${htmlEscape(report.aborted.reason)}
        ${report.aborted.detail ? ` — ${htmlEscape(report.aborted.detail)}` : ""}
        (exit ${htmlEscape(report.aborted.exit_code)})</div>`
    : "";

  const html = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Cloudflare Redirects Report — ${htmlEscape(report.domain ?? "")}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
           background: #0e0f12; color: #e6e6e6; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 18px; margin: 28px 0 8px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    h3 { font-size: 14px; margin: 16px 0 6px; color: #c9a84c; text-transform: uppercase; letter-spacing: .05em; }
    code { font: 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; color: #b8b8b8; }
    .meta { color: #9aa0a6; font-size: 12px; margin-bottom: 16px; }
    .chip { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #2a2a2e;
            font-size: 11px; margin-right: 4px; }
    .chip.on { background: #2d4a2d; color: #b6e8b6; }
    .chip.off { background: #2a2a2e; color: #888; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;
             font-weight: 600; letter-spacing: .04em; }
    .badge.ok { background: #1e4a2a; color: #a6e8b6; }
    .badge.bad { background: #5a1e1e; color: #f3a6a6; }
    .badge.muted { background: #2a2a2e; color: #aaa; }
    .badge.neutral { background: #2a3a4a; color: #a6c8e8; }
    .label { font-weight: 600; }
    .id { font-size: 11px; color: #777; }
    .stats { display: flex; gap: 16px; flex-wrap: wrap; padding: 8px 12px; background: #17181c;
             border-radius: 6px; margin: 8px 0 12px; font-size: 13px; }
    .stats b { color: #c9a84c; }
    table { width: 100%; border-collapse: collapse; background: #17181c; border-radius: 6px; overflow: hidden;
            font-size: 13px; }
    th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #2a2a2e; vertical-align: top; }
    th { background: #1e1f23; color: #c9a84c; font-weight: 600; font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: 0; }
    td { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
    .empty { color: #777; font-style: italic; padding: 8px 0; }
    .err { color: #f3a6a6; }
    .note { color: #a6c8e8; }
    .warn { background: #3a2a1a; border-left: 3px solid #c9a84c; padding: 10px 14px; margin: 12px 0; border-radius: 4px; }
    .warn ul { margin: 6px 0 0; padding-left: 20px; }
    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    .summary > div { background: #17181c; padding: 12px 16px; border-radius: 6px; }
    section.list { margin-top: 32px; padding-top: 16px; border-top: 1px solid #2a2a2e; }
    @media (max-width: 720px) { .summary { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Cloudflare Redirects Report</h1>
  <div class="meta">
    Domain: <b>${htmlEscape(report.domain ?? "—")}</b> ·
    Generated: <b>${htmlEscape(report.generated_at ?? "—")}</b> ·
    Schema: <code>${htmlEscape(report.schema_version ?? "—")}</code> ·
    Run: <code>${htmlEscape(report.run_id ?? "—")}</code>
  </div>
  <div>${flagsHtml}</div>
  ${abortedHtml}
  ${validationHtml}

  <div class="summary">
    <div>
      <h3>Lists by status</h3>
      ${renderHtmlTable(["Status", "Count"], totalsRows, "Brak danych.")}
    </div>
    <div>
      <h3>Operations (${htmlEscape(report.totals?.operations?.total ?? 0)})</h3>
      ${renderHtmlTable(["Status", "Count"], opTotals, "Brak operacji.")}
    </div>
    <div>
      <h3>Diff totals (all lists)</h3>
      ${renderHtmlTable(
        ["Phase", "+ Adds", "~ Changes", "− Deletes"],
        [
          ["total",  String(report.totals?.diff?.total?.adds ?? 0),
                     String(report.totals?.diff?.total?.changes ?? 0),
                     String(report.totals?.diff?.total?.deletes ?? 0)],
          ["clear",  String(report.totals?.diff?.by_phase?.clear?.adds ?? 0),
                     String(report.totals?.diff?.by_phase?.clear?.changes ?? 0),
                     String(report.totals?.diff?.by_phase?.clear?.deletes ?? 0)],
          ["upload", String(report.totals?.diff?.by_phase?.upload?.adds ?? 0),
                     String(report.totals?.diff?.by_phase?.upload?.changes ?? 0),
                     String(report.totals?.diff?.by_phase?.upload?.deletes ?? 0)],
        ],
        "Brak danych diff.",
      )}
    </div>
  </div>

  ${listSections || `<p class="empty">Brak list w raporcie.</p>`}
</body>
</html>
`;

  try {
    const dir = dirname(resolve(targetPath));
    mkdirSync(dir, { recursive: true });
    writeFileSync(targetPath, html, "utf8");
    console.log(`📄 Raport HTML zapisany: ${targetPath}`);
  } catch (err) {
    console.error(`⚠️  Nie udało się zapisać raportu HTML do ${targetPath}: ${err?.message ?? err}`);
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

  // Pobierz aktualną zawartość listy (potrzebne i do diff, i do --clear).
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

  // Krok B: diff vs aktualna zawartość (pomijany przy --clear bez --upload, bo
  // i tak chcemy wszystko usunąć — diff byłby tylko szumem).
  let stats = {
    adds: 0,
    changes: 0,
    deletes: remoteMap.size,
    localCount: 0,
    remoteCount: remoteMap.size,
  };
  let remoteAdds = [];
  let remoteChanges = [];
  let remoteDeletes = [];

  if (UPLOAD) {
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
    stats = {
      adds: remoteAdds.length,
      changes: remoteChanges.length,
      deletes: remoteDeletes.length,
      localCount: localMap.size,
      remoteCount: remoteMap.size,
      // Pełne listy do --json reportu (puste tablice w przypadku braku zmian).
      details: {
        adds: remoteAdds.map(({ src, to }) => ({ source_url: src, target_url: to })),
        changes: remoteChanges.map(({ src, diffs }) => ({ source_url: src, diffs })),
        deletes: remoteDeletes.map(({ src, to }) => ({ source_url: src, target_url: to })),
      },
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
    if (!CLEAR && !remoteAdds.length && !remoteChanges.length && !remoteDeletes.length) {
      console.log(`  ✓ Lista już zsynchronizowana — pomijam PUT.`);
      return { status: "unchanged", stats, note: "lista już zsynchronizowana" };
    }
  }

  // Krok B.1: DRY RUN — pokaż plan i zakończ przed jakimkolwiek PUT-em.
  if (DRY_RUN) {
    if (CLEAR) {
      const willDelete = remoteMap.size;
      const willAdd = UPLOAD ? localMap.size : 0;
      console.log(
        `\n🔍 [dry-run] --clear ${UPLOAD ? "+ --upload " : ""}dla "${list.label}":`,
      );
      console.log(`     • do usunięcia: ${willDelete} reguł (cała aktualna lista)`);
      if (UPLOAD) console.log(`     • następnie do dodania: ${willAdd} reguł z apiItems`);
      console.log(`     • PUT NIE zostanie wykonany (dry-run).`);
      return {
        status: "unchanged",
        stats: {
          ...stats,
          adds: willAdd,
          changes: 0,
          deletes: willDelete,
          localCount: UPLOAD ? localMap.size : 0,
        },
        note: `dry-run: ${willDelete} do usunięcia${UPLOAD ? `, ${willAdd} do dodania` : ""}`,
      };
    }
    console.log(
      `\n🔍 [dry-run] --upload dla "${list.label}": +${stats.adds}/~${stats.changes}/-${stats.deletes} (PUT pominięty).`,
    );
    return {
      status: "unchanged",
      stats,
      note: `dry-run: +${stats.adds}/~${stats.changes}/-${stats.deletes}`,
    };
  }

  // Krok B.2: confirm (per lista). --clear zawsze wymaga DODATKOWEJ, jawnej zgody —
  // samo --confirm nie wystarcza, żeby uniknąć przypadkowego wymazania w CI/skrypcie.
  if (CLEAR) {
    console.log(
      `\n⚠️  --clear wykasuje WSZYSTKIE ${remoteMap.size} reguł z listy "${list.label}" (${list.id})` +
        (UPLOAD ? `, a następnie załaduje ${localMap.size} nowych.` : `.`),
    );
    console.log(`   ⛔ Operacja DESTRUKCYJNA i NIEODWRACALNA.`);

    if (YES_CLEAR) {
      console.log(`   ✓ --yes-clear / CF_CLEAR_CONFIRM=CLEAR — pomijam pytanie interaktywne.`);
    } else if (process.stdin.isTTY) {
      const phrase = await promptExactPhrase(
        `   Aby potwierdzić, wpisz dokładnie słowo CLEAR (case-sensitive) dla "${list.label}": `,
        "CLEAR",
      );
      if (!phrase) {
        console.log(`✗ Pominięto listę "${list.label}" — nie wpisano "CLEAR".`);
        return { status: "skipped", stats, note: 'brak potwierdzenia "CLEAR"' };
      }
    } else {
      console.error(
        `   ❌ Tryb non-interactive (brak TTY) — wymagana jawna flaga --yes-clear ` +
          `LUB env CF_CLEAR_CONFIRM=CLEAR. --confirm tu NIE wystarcza.`,
      );
      return {
        status: "skipped",
        stats,
        note: "non-interactive bez --yes-clear/CF_CLEAR_CONFIRM",
      };
    }
  } else if (!CONFIRM) {
    console.log(`\n⚠️  PUT zastąpi całą listę "${list.label}": ${remoteMap.size} → ${localMap.size} reguł.`);
    const ok = await promptYesNo(`   Kontynuować dla "${list.label}"? [y/N]: `);
    if (!ok) {
      console.log(`✗ Pominięto listę "${list.label}".`);
      return { status: "skipped", stats, note: "anulowane przez użytkownika" };
    }
  }

  // Operacje wykonane na tej liście — każdy PUT (clear / upload) dostaje wpis
  // z phase, operation_id i finalnym statusem (do raportu końcowego).
  const operations = [];

  // Krok C0: --clear → PUT z pustą tablicą (wymazuje wszystkie items).
  // Cloudflare przyjmuje `[]` jako prawidłowy body i zwraca operation_id.
  if (CLEAR) {
    if (remoteMap.size === 0) {
      console.log(`→ --clear: lista już pusta, pomijam wymazanie.`);
      operations.push({ phase: "clear", status: "skipped", operationId: null, note: "lista już pusta" });
    } else {
      console.log(`→ --clear: PUT ${baseUrl}/items z pustą tablicą (wymazuję ${remoteMap.size} reguł)`);
      const clearRes = await replaceListItems({
        baseUrl,
        accountId,
        headers,
        items: [],
        label: `clear ${list.label}`,
      });
      operations.push({
        phase: "clear",
        status: clearRes.status,
        operationId: clearRes.operationId,
        error: clearRes.error,
        timeoutSec: clearRes.timeoutSec,
      });
      if (clearRes.status === "completed") {
        console.log(`✅ Lista "${list.label}" wyczyszczona.`);

        // Post-clear verification: GET listy i upewnij się, że jest pusta.
        // Cloudflare bywa eventually-consistent — krótki retry z backoff.
        console.log(`→ Weryfikacja: GET ${baseUrl}/items (oczekuję 0 items)…`);
        const verifyResult = await verifyListIsEmpty({ baseUrl, headers, label: list.label });
        operations.push({
          phase: "verify-clear",
          status: verifyResult.empty ? "completed" : "failed",
          operationId: null,
          error: verifyResult.empty
            ? undefined
            : `lista po clear ma nadal ${verifyResult.residualCount} items (oczekiwano 0)`,
          note: verifyResult.empty
            ? `potwierdzono: 0 items po ${verifyResult.attempts} prób(ach)`
            : undefined,
        });

        if (!verifyResult.empty) {
          const sample = verifyResult.sample.length
            ? ` Przykładowe pozostałe: ${verifyResult.sample.slice(0, 3).join(", ")}${
                verifyResult.sample.length > 3 ? "…" : ""
              }`
            : "";
          console.error(
            `❌ Verify-clear FAIL dla "${list.label}": lista nadal zawiera ${verifyResult.residualCount} items po ${verifyResult.attempts} prób(ach).${sample}`,
          );
          return {
            status: "failed",
            stats,
            operations,
            error: `verify-clear: lista nadal ma ${verifyResult.residualCount} items (op_id=${clearRes.operationId})`,
          };
        }
        console.log(`✅ Verify-clear OK: lista "${list.label}" potwierdzona jako pusta.`);
      } else if (clearRes.status === "failed") {
        // Nie ruszamy uploadu jeśli clear failed.
        return {
          status: "failed",
          stats,
          operations,
          error: `clear failed: ${clearRes.error}`,
        };
      } else if (clearRes.status === "timeout") {
        return {
          status: "timeout",
          stats,
          operations,
          note: `clear timeout po ${clearRes.timeoutSec}s`,
        };
      }
    }
    if (!UPLOAD) {
      // --clear bez --upload → kończymy tutaj. stats.localCount=0.
      return {
        status: "completed",
        stats: { ...stats, adds: 0, changes: 0, localCount: 0 },
        operations,
        note: `wyczyszczone (${remoteMap.size} usuniętych)`,
      };
    }
  }

  // Krok C: PUT replace-all z apiItems.
  // Cloudflare API może odrzucić nieznane pola na poziomie itemu, więc do uploadu
  // wysyłamy tylko `{ redirect }`. Pole `run_id` zachowujemy jedynie w lokalnych
  // artefaktach (CSV/JSON/manifest) dla spójności pipeline'u.
  const uploadItems = apiItems.map(({ redirect }) => ({ redirect }));
  console.log(`→ PUT ${baseUrl}/items (${uploadItems.length} reguł)`);
  const result = await replaceListItems({
    baseUrl,
    accountId,
    headers,
    items: uploadItems,
    label: `PUT ${list.label}`,
  });
  operations.push({
    phase: "upload",
    status: result.status,
    operationId: result.operationId,
    error: result.error,
    timeoutSec: result.timeoutSec,
  });
  if (result.status === "completed") {
    console.log(`✅ Lista "${list.label}" zaktualizowana (${apiItems.length} reguł).`);
    return { status: "completed", stats, operations };
  }
  if (result.status === "timeout") {
    return { status: "timeout", stats, operations, note: `timeout po ${result.timeoutSec}s` };
  }
  if (result.status === "failed") {
    return { status: "failed", stats, operations, error: `upload failed: ${result.error}` };
  }
  // Sync (brak operation_id).
  return { status: "completed", stats, operations, note: "brak operation_id (sync)" };
}

// Wspólny helper: PUT /items + (opcjonalny) polling statusu operacji.
// Używany zarówno przez --clear (items=[]) jak i właściwy upload.
// Rzuca wyjątkiem TYLKO przy HTTP error PUT-a (brak operation_id w ogóle).
// Zwraca: { status: "completed"|"failed"|"timeout"|"sync", operationId, timeoutSec?, error? }.
// Status "failed" jest zwracany (a nie throw) — dzięki temu raport końcowy
// może pokazać operation_id zarówno dla sukcesów jak i porażek.
async function replaceListItems({ baseUrl, accountId, headers, items, label }) {
  const putRes = await fetchWithRetry(
    `${baseUrl}/items`,
    { method: "PUT", headers, body: JSON.stringify(items) },
    { label },
  );
  const putJson = await putRes.json().catch(() => ({}));
  if (!putRes.ok || !putJson.success) {
    throw new Error(
      `${label} HTTP ${putRes.status}: ${JSON.stringify(putJson.errors ?? putJson).slice(0, 200)}`,
    );
  }
  const operationId = putJson.result?.operation_id ?? null;
  console.log(`  ✓ ${label} zaakceptowane (operation_id=${operationId ?? "n/a"})`);
  if (!operationId) return { status: "sync", operationId: null };

  const opUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/rules/lists/bulk_operations/${operationId}`;
  const start = Date.now();
  const TIMEOUT_MS = 60_000;
  let lastStatus = "";
  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 2000));
    const opRes = await fetchWithRetry(opUrl, { headers }, { label: `poll ${label}`, maxRetries: 3 });
    const opJson = await opRes.json().catch(() => ({}));
    const status = opJson.result?.status;
    if (status !== lastStatus) {
      console.log(`    · status: ${status}${opJson.result?.error ? ` (${opJson.result.error})` : ""}`);
      lastStatus = status;
    }
    if (status === "completed") return { status: "completed", operationId };
    if (status === "failed") {
      const error = opJson.result?.error ?? "unknown";
      console.error(`  ❌ ${label} failed: ${error}`);
      return { status: "failed", operationId, error };
    }
  }
  console.warn(`  ⚠️  ${label}: timeout (${TIMEOUT_MS / 1000}s) — sprawdź ręcznie w Dashboard.`);
  return { status: "timeout", operationId, timeoutSec: TIMEOUT_MS / 1000 };
}

// Wymaga wpisania DOKŁADNIE podanej frazy (case-sensitive, trim wokoło).
// Zwraca true gdy wpisano `expected`, w przeciwnym razie false.
// Używane do destrukcyjnych operacji typu --clear, gdzie zwykłe y/N to za mało.
function promptExactPhrase(question, expected) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (data) => {
      const ans = String(data).replace(/\r?\n$/, "").trim();
      if (ans === expected) {
        resolve(true);
      } else {
        console.log(`   ✗ Wpisano "${ans}" — oczekiwano dokładnie "${expected}". Anuluję.`);
        resolve(false);
      }
    });
  });
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

// ── Post-clear verification: potwierdza, że lista jest faktycznie pusta ────
// Cloudflare bulk_operations zwraca "completed" zanim eventual consistency
// dogoni GET /items, więc retry-ujemy z krótkim backoff.
// Zwraca: { empty, residualCount, sample[], attempts }.
async function verifyListIsEmpty({ baseUrl, headers, label, maxAttempts = 4, delayMs = 1500 }) {
  let last = { residualCount: 0, sample: [] };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Wystarczy pierwsza strona (per_page=25). Jeśli nie jest pusta, lista nie jest pusta.
    const res = await fetchWithRetry(
      `${baseUrl}/items?per_page=25`,
      { headers },
      { label: `verify-clear ${label} (próba ${attempt}/${maxAttempts})`, maxRetries: 3 },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(
        `verify-clear: HTTP ${res.status} — ${JSON.stringify(json.errors ?? json).slice(0, 160)}`,
      );
    }
    const items = Array.isArray(json.result) ? json.result : [];
    // Preferuj `result_info.total_count` jeśli CF go podaje, fallback to per-page count.
    const reportedTotal =
      typeof json.result_info?.total_count === "number" ? json.result_info.total_count : null;
    const residualCount = reportedTotal ?? items.length;
    last = {
      residualCount,
      sample: items.map((it) => it.redirect?.source_url).filter(Boolean),
    };
    if (residualCount === 0) {
      return { empty: true, residualCount: 0, sample: [], attempts: attempt };
    }
    if (attempt < maxAttempts) {
      console.log(
        `   · verify-clear próba ${attempt}/${maxAttempts}: ${residualCount} items pozostało, retry za ${delayMs}ms…`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return { empty: false, ...last, attempts: maxAttempts };
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

