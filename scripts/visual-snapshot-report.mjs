#!/usr/bin/env node
/**
 * Generuje HTML raport z nieudanych snapshotów wizualnych Playwrighta dla
 * spec'ów live preview (admin-vein-images-live-preview*.spec.ts).
 *
 * Co robi:
 *  - Skanuje katalog `test-results/` (gdzie Playwright zrzuca per-test artifacts).
 *  - Dla każdego nieudanego snapshota wykrywa trio plików:
 *      * `*-expected.png`  — baseline z `*-snapshots/`
 *      * `*-actual.png`    — zrobiony w tym runie
 *      * `*-diff.png`      — pixel-diff wygenerowany przez Playwrighta
 *  - Filtruje TYLKO nieudane testy z plikami visual regression (live-preview*).
 *  - Renderuje pojedynczy plik `test-results/visual-report/index.html` z trzema
 *    obrazami obok siebie (CSS grid), metadanymi testu, viewport name z nazwy
 *    pliku, oraz timestamp generacji.
 *  - Kopiuje obrazy do `test-results/visual-report/assets/` żeby HTML był
 *    PRZENOŚNY (jedno-katalogowy artifact dla CI upload, np. GitHub Actions
 *    `actions/upload-artifact`).
 *
 * Czemu post-run skrypt zamiast custom Playwright reporter:
 *  - Nie wpływa na `createLovableConfig` (zachowujemy istniejące reportery).
 *  - Działa na artefaktach z dowolnego runa (CI re-analizuje stare runs,
 *    lokalnie debugujesz ostatni run bez reruna).
 *  - Brak zależności od Playwright API surface (TestResult, Reporter interface),
 *    który zmienia się między majorami.
 *
 * Uruchamianie:
 *   node scripts/visual-snapshot-report.mjs
 *   (opcjonalnie po `bun run test:e2e`)
 *
 * Exit codes:
 *   0 — raport wygenerowany (nawet jeśli 0 failures — pusty raport informuje
 *       że nic nie poszło źle).
 *   2 — nie znaleziono `test-results/` (nie uruchomiono Playwrighta).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const TEST_RESULTS_DIR = path.join(PROJECT_ROOT, "test-results");
const REPORT_DIR = path.join(TEST_RESULTS_DIR, "visual-report");
const ASSETS_DIR = path.join(REPORT_DIR, "assets");

/**
 * Filtr ścieżek — interesują nas TYLKO nieudane snapshoty z spec'ów live preview.
 * Inne wizualne testy (np. tooltip-last-change.spec.ts) celowo pomijamy,
 * żeby raport był skupiony na live preview.
 */
const isLivePreviewVisualPath = (p) => /live-preview/i.test(p);

/**
 * Rozpoznaje viewport z nazwy pliku snapshota.
 * Przykłady:
 *   live-preview-mobile-state-a-empty-actual.png        → mobile / state-a-empty
 *   live-preview-desktop-stable-after-flash-diff.png    → desktop / stable-after-flash
 *   live-preview-small-mobile-dark-state-c-...-expected.png → small-mobile / dark-state-c-...
 */
const parseSnapshotName = (filename) => {
  // Strip suffix (-expected.png / -actual.png / -diff.png).
  const base = filename
    .replace(/-(expected|actual|diff)\.png$/i, "")
    .replace(/^live-preview-/, "");
  // Pierwsze 1-2 segmenty to viewport (small-mobile, mobile, tablet, desktop).
  const viewportMatch = base.match(/^(small-mobile|mobile|tablet|desktop)-(.+)$/);
  if (!viewportMatch) return { viewport: "unknown", state: base };
  return { viewport: viewportMatch[1], state: viewportMatch[2] };
};

/**
 * Zbiera wszystkie pliki PNG z test-results rekursywnie.
 * Zwraca array { absPath, relPath, dir, base }.
 */
const walkPngs = async (dir, acc = []) => {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Pomijamy nasz własny output żeby nie skanować rekurencyjnie.
      if (full.startsWith(REPORT_DIR)) continue;
      await walkPngs(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".png")) {
      acc.push({
        absPath: full,
        relPath: path.relative(TEST_RESULTS_DIR, full),
        dir: path.dirname(full),
        base: entry.name,
      });
    }
  }
  return acc;
};

/**
 * Grupuje pliki w trio (expected, actual, diff) per snapshot key.
 * Klucz = ścieżka katalogu testu + base name bez sufiksu.
 *
 * Snapshot bez triady (np. tylko -actual gdy pierwszy run generuje baseline)
 * też wpada do raportu — z brakującymi polami zaznaczonymi jako null,
 * żeby user widział że coś jest niekompletne.
 */
const groupSnapshotTrios = (pngs) => {
  const groups = new Map();
  for (const png of pngs) {
    if (!isLivePreviewVisualPath(png.relPath)) continue;
    const m = png.base.match(/^(.+)-(expected|actual|diff)\.png$/i);
    if (!m) continue;
    const [, stem, kind] = m;
    const key = `${png.dir}::${stem}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        stem,
        dir: png.dir,
        // Test name = nazwa katalogu testu (Playwright zrzuca per-test).
        // Format: tests-visual-admin-vein-images-live-preview-spec-mobile-...
        testName: path.basename(png.dir),
        expected: null,
        actual: null,
        diff: null,
      });
    }
    groups.get(key)[kind.toLowerCase()] = png;
  }
  return Array.from(groups.values());
};

/**
 * Kopiuje obraz do assets/ z deterministyczną nazwą (test+kind).
 * Zwraca relatywną ścieżkę dla HTML <img src>.
 */
const copyAsset = async (png, prefix, kind) => {
  const safeName = `${prefix}-${kind}.png`.replace(/[^a-z0-9._-]/gi, "_");
  const target = path.join(ASSETS_DIR, safeName);
  await fs.copyFile(png.absPath, target);
  return path.relative(REPORT_DIR, target);
};

/**
 * Escape do bezpiecznego HTML — podstawowy, wystarczający bo źródłem są
 * nazwy plików (kontrolowane przez nasz spec).
 */
const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderHtml = ({ trios, generatedAt, totalFailures }) => {
  // Zbieramy unikalne wartości viewport / state z trios, żeby wypełnić <select>'y.
  // Sortujemy alfabetycznie dla deterministycznej kolejności w UI (łatwiej znaleźć).
  const viewportSet = new Set();
  const stateSet = new Set();
  const enriched = trios.map((t, idx) => {
    const { viewport, state } = parseSnapshotName(t.stem + "-actual.png");
    viewportSet.add(viewport);
    stateSet.add(state);
    const isComplete = t.expected && t.actual && t.diff;
    const status = isComplete ? "failed" : "incomplete"; // lower-case dla data-attr / filtra
    return { ...t, idx, viewport, state, status };
  });
  const viewports = Array.from(viewportSet).sort();
  const states = Array.from(stateSet).sort();

  const cards = enriched
    .map((t) => {
      const statusUpper = t.status.toUpperCase();
      const statusClass = t.status === "failed" ? "status-failed" : "status-incomplete";
      const cell = (label, asset, fallback) =>
        asset
          ? `<figure>
               <figcaption>${escapeHtml(label)}</figcaption>
               <a href="${escapeHtml(asset)}" target="_blank" rel="noopener">
                 <img loading="lazy" src="${escapeHtml(asset)}" alt="${escapeHtml(label)} — ${escapeHtml(t.stem)}" />
               </a>
             </figure>`
          : `<figure class="missing">
               <figcaption>${escapeHtml(label)}</figcaption>
               <div class="missing-box">${escapeHtml(fallback)}</div>
             </figure>`;
      // data-* atrybuty są tym, na czym filtruje JS w runtime — żaden re-run nie jest potrzebny.
      // data-search agreguje wszystko, co jest sensowne do free-text search (stem + ścieżka katalogu testu).
      const searchHaystack = `${t.stem} ${t.testName}`.toLowerCase();
      return `
        <article class="card"
                 id="snap-${t.idx}"
                 data-viewport="${escapeHtml(t.viewport)}"
                 data-state="${escapeHtml(t.state)}"
                 data-status="${escapeHtml(t.status)}"
                 data-search="${escapeHtml(searchHaystack)}">
          <header class="card-header">
            <div>
              <h2>${escapeHtml(t.stem)}</h2>
              <p class="meta">
                <span class="badge ${statusClass}">${statusUpper}</span>
                <span class="badge badge-viewport">${escapeHtml(t.viewport)}</span>
                <span class="badge badge-state">${escapeHtml(t.state)}</span>
              </p>
              <p class="path">${escapeHtml(t.testName)}</p>
            </div>
          </header>
          <div class="trio">
            ${cell("Expected (baseline)", t.expectedAsset, "Brak baseline'u — pierwszy run snapshota?")}
            ${cell("Actual (ten run)", t.actualAsset, "Brak — test się nie wykonał?")}
            ${cell("Diff (różnica pikseli)", t.diffAsset, "Brak diff — snapshot przeszedł?")}
          </div>
        </article>`;
    })
    .join("\n");

  const renderOptions = (values) =>
    values
      .map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)
      .join("");

  // ---- Breakdown agregacje (per viewport, per state) ----
  // Liczymy failed / incomplete osobno, żeby user widział czy "regresja rośnie"
  // (failed = realna różnica wizualna), czy to pierwszy run (incomplete = brak baseline).
  // Sortujemy malejąco po total — najgorsze viewporty/states na górze.
  const aggregate = (key) => {
    const map = new Map();
    enriched.forEach((t) => {
      const k = t[key];
      if (!map.has(k)) map.set(k, { name: k, failed: 0, incomplete: 0, total: 0 });
      const row = map.get(k);
      row[t.status] += 1;
      row.total += 1;
    });
    return Array.from(map.values()).sort((a, b) =>
      b.total - a.total || b.failed - a.failed || a.name.localeCompare(b.name)
    );
  };
  const byViewport = aggregate("viewport");
  const byState = aggregate("state");

  const renderBreakdownTable = (rows, label, filterKey) => {
    if (rows.length === 0) return "";
    const tbody = rows
      .map((r) => {
        // data-filter-* atrybuty pozwalają JS-owi ustawić odpowiedni select po kliknięciu wiersza.
        // To "skok do filtra" — szybciej niż ręczne wybieranie z dropdowna.
        const failedCell = r.failed > 0
          ? `<td class="num num-failed">${r.failed}</td>`
          : `<td class="num num-zero">0</td>`;
        const incompleteCell = r.incomplete > 0
          ? `<td class="num num-incomplete">${r.incomplete}</td>`
          : `<td class="num num-zero">0</td>`;
        return `<tr class="breakdown-row"
                    data-filter-key="${escapeHtml(filterKey)}"
                    data-filter-value="${escapeHtml(r.name)}"
                    tabindex="0"
                    role="button"
                    aria-label="Filtruj po ${escapeHtml(label)}: ${escapeHtml(r.name)}">
                  <th scope="row">${escapeHtml(r.name)}</th>
                  ${failedCell}
                  ${incompleteCell}
                  <td class="num">${r.total}</td>
                </tr>`;
      })
      .join("");
    return `
      <div class="breakdown-table-wrap">
        <h3>${escapeHtml(label)}</h3>
        <table class="breakdown-table">
          <thead>
            <tr>
              <th scope="col">${escapeHtml(label)}</th>
              <th scope="col" class="num">Failed</th>
              <th scope="col" class="num">Incomplete</th>
              <th scope="col" class="num">Total</th>
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>`;
  };

  const breakdownSection = totalFailures === 0
    ? ""
    : `
    <section class="breakdown" aria-label="Liczba snapshotów per viewport i state">
      <h2 class="breakdown-title">Gdzie rosną regresje?</h2>
      <p class="breakdown-hint">Kliknij wiersz, żeby ustawić filtr na ten viewport / state.</p>
      <div class="breakdown-grid">
        ${renderBreakdownTable(byViewport, "Viewport", "viewport")}
        ${renderBreakdownTable(byState, "State", "state")}
      </div>
    </section>`;

  const filterBar = totalFailures === 0
    ? ""
    : `
    <section class="filter-bar" aria-label="Filtry raportu">
      <div class="filter-group">
        <label for="f-viewport">Viewport</label>
        <select id="f-viewport">
          <option value="">— wszystkie —</option>
          ${renderOptions(viewports)}
        </select>
      </div>
      <div class="filter-group">
        <label for="f-state">State</label>
        <select id="f-state">
          <option value="">— wszystkie —</option>
          ${renderOptions(states)}
        </select>
      </div>
      <div class="filter-group">
        <label for="f-status">Status</label>
        <select id="f-status">
          <option value="">— wszystkie —</option>
          <option value="failed">FAILED</option>
          <option value="incomplete">INCOMPLETE</option>
        </select>
      </div>
      <div class="filter-group filter-group-grow">
        <label for="f-q">Szukaj (stem / ścieżka)</label>
        <input id="f-q" type="search" placeholder="np. dark-state-c lub mobile" autocomplete="off" />
      </div>
      <div class="filter-group filter-group-actions">
        <button type="button" id="f-reset" class="btn-reset">Wyczyść</button>
      </div>
      <p class="filter-counter" id="f-counter" aria-live="polite"></p>
    </section>`;

  const summaryLine =
    totalFailures === 0
      ? `<p class="empty">Brak nieudanych snapshotów live preview w tym runie. ✓</p>`
      : `<p class="summary">Znaleziono <strong>${totalFailures}</strong> nieudany snapshot live preview.</p>`;

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>Visual snapshot report — live preview</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg: #0f1115;
      --fg: #e8eaed;
      --muted: #9aa0a6;
      --border: #2a2d33;
      --card: #14171d;
      --accent: #4fc3f7;
      --danger: #ef5350;
      --warn: #ffa726;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #fafafa; --fg: #1a1a1a; --muted: #555;
        --border: #e0e0e0; --card: #fff; --accent: #0288d1;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 24px;
      background: var(--bg); color: var(--fg);
      font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    header.page-header { max-width: 1400px; margin: 0 auto 24px; }
    header.page-header h1 { margin: 0 0 8px; font-size: 22px; }
    header.page-header .meta { color: var(--muted); font-size: 13px; margin: 0; }
    .summary { font-size: 16px; max-width: 1400px; margin: 0 auto 24px; }
    .empty {
      max-width: 1400px; margin: 0 auto;
      padding: 24px; background: var(--card); border: 1px solid var(--border);
      border-radius: 8px; text-align: center; font-size: 16px;
    }
    .card {
      max-width: 1400px; margin: 0 auto 32px;
      background: var(--card); border: 1px solid var(--border); border-radius: 8px;
      overflow: hidden;
    }
    .card-header {
      padding: 16px 20px; border-bottom: 1px solid var(--border);
    }
    .card-header h2 {
      margin: 0 0 6px; font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 14px; word-break: break-all;
    }
    .meta { margin: 4px 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .path {
      margin: 4px 0 0; color: var(--muted); font-family: ui-monospace, monospace;
      font-size: 11px; word-break: break-all;
    }
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.4px; border: 1px solid var(--border);
    }
    .status-failed { background: rgba(239,83,80,.15); color: var(--danger); border-color: var(--danger); }
    .status-incomplete { background: rgba(255,167,38,.15); color: var(--warn); border-color: var(--warn); }
    .badge-viewport { background: rgba(79,195,247,.12); color: var(--accent); border-color: var(--accent); }
    .badge-state { color: var(--muted); }
    .trio {
      display: grid; gap: 12px; padding: 16px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 900px) { .trio { grid-template-columns: 1fr 1fr 1fr; } }
    figure { margin: 0; }
    figcaption {
      font-size: 12px; font-weight: 600; color: var(--muted);
      margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    figure img {
      width: 100%; height: auto; display: block;
      border: 1px solid var(--border); border-radius: 4px;
      background:
        linear-gradient(45deg, #888 25%, transparent 25%),
        linear-gradient(-45deg, #888 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #888 75%),
        linear-gradient(-45deg, transparent 75%, #888 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    }
    figure.missing .missing-box {
      padding: 24px; border: 1px dashed var(--border); border-radius: 4px;
      color: var(--muted); text-align: center; font-style: italic; font-size: 13px;
    }
    /* ---- Filter bar ---- */
    .filter-bar {
      max-width: 1400px; margin: 0 auto 24px;
      padding: 16px; background: var(--card);
      border: 1px solid var(--border); border-radius: 8px;
      display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;
    }
    .filter-group { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
    .filter-group-grow { flex: 1 1 220px; }
    .filter-group-actions { justify-content: flex-end; min-width: auto; }
    .filter-group label {
      font-size: 11px; font-weight: 600; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .filter-group select,
    .filter-group input {
      background: var(--bg); color: var(--fg);
      border: 1px solid var(--border); border-radius: 4px;
      padding: 6px 8px; font: inherit; min-height: 32px;
    }
    .filter-group select:focus,
    .filter-group input:focus,
    .btn-reset:focus {
      outline: 2px solid var(--accent); outline-offset: 2px;
    }
    .btn-reset {
      background: transparent; color: var(--fg);
      border: 1px solid var(--border); border-radius: 4px;
      padding: 6px 12px; cursor: pointer; font: inherit; min-height: 32px;
    }
    .btn-reset:hover { border-color: var(--accent); color: var(--accent); }
    .filter-counter {
      flex-basis: 100%; margin: 4px 0 0; color: var(--muted); font-size: 12px;
    }
    .card[hidden] { display: none; }
    .no-results {
      max-width: 1400px; margin: 0 auto;
      padding: 24px; background: var(--card); border: 1px dashed var(--border);
      border-radius: 8px; text-align: center; color: var(--muted);
    }
  </style>
</head>
<body>
  <header class="page-header">
    <h1>Visual snapshot report — live preview</h1>
    <p class="meta">Wygenerowano: ${escapeHtml(generatedAt)} · Źródło: <code>test-results/</code></p>
  </header>
  ${summaryLine}
  ${filterBar}
  <div id="cards-container">${cards}</div>
  <p id="no-results" class="no-results" hidden>Żaden snapshot nie pasuje do filtra. Wyczyść filtr, żeby zobaczyć wszystkie.</p>
  <script>
  (function () {
    // Filtrowanie po stronie klienta — żaden re-run testów nie jest potrzebny.
    // Stan filtra jest synchronizowany z URL (query params) i z localStorage,
    // żeby przeładowanie strony / udostępnienie linka zachowywało wybór.
    var STORAGE_KEY = "visual-report-filter-v1";
    var $ = function (id) { return document.getElementById(id); };
    var fields = ["viewport", "state", "status", "q"];
    var inputs = {
      viewport: $("f-viewport"),
      state: $("f-state"),
      status: $("f-status"),
      q: $("f-q"),
    };
    if (!inputs.viewport) return; // brak filter-bar (0 failures) — nic nie robimy.

    var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
    var counter = $("f-counter");
    var noResults = $("no-results");

    function readUrlState() {
      var p = new URLSearchParams(window.location.search);
      var s = {};
      fields.forEach(function (k) { s[k] = p.get(k) || ""; });
      return s;
    }
    function readStorageState() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
      catch (e) { return {}; }
    }
    // URL ma pierwszeństwo nad localStorage (link "głębszy" niż preferencja sesji).
    var urlState = readUrlState();
    var stored = readStorageState();
    var initial = {};
    fields.forEach(function (k) { initial[k] = urlState[k] || stored[k] || ""; });
    fields.forEach(function (k) { if (inputs[k]) inputs[k].value = initial[k]; });

    function applyFilter() {
      var v = inputs.viewport.value;
      var st = inputs.state.value;
      var status = inputs.status.value;
      var q = inputs.q.value.trim().toLowerCase();
      var visible = 0;
      cards.forEach(function (card) {
        var matchV = !v || card.dataset.viewport === v;
        var matchS = !st || card.dataset.state === st;
        var matchSt = !status || card.dataset.status === status;
        var matchQ = !q || (card.dataset.search || "").indexOf(q) !== -1;
        var show = matchV && matchS && matchSt && matchQ;
        card.hidden = !show;
        if (show) visible++;
      });
      counter.textContent = "Pokazano " + visible + " z " + cards.length + " snapshotów.";
      noResults.hidden = visible !== 0;

      // Zapis stanu do URL (bez przeładowania) i do localStorage.
      var p = new URLSearchParams();
      var snapshot = {};
      fields.forEach(function (k) {
        var val = inputs[k].value;
        snapshot[k] = val;
        if (val) p.set(k, val);
      });
      var query = p.toString();
      var newUrl = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch (e) {}
    }

    fields.forEach(function (k) {
      var ev = inputs[k].tagName === "SELECT" ? "change" : "input";
      inputs[k].addEventListener(ev, applyFilter);
    });
    $("f-reset").addEventListener("click", function () {
      fields.forEach(function (k) { inputs[k].value = ""; });
      applyFilter();
    });

    applyFilter();
  })();
  </script>
</body>
</html>`;
};

const main = async () => {
  // Sanity: czy są w ogóle wyniki?
  try {
    await fs.access(TEST_RESULTS_DIR);
  } catch {
    console.error(
      `[visual-snapshot-report] Nie znaleziono ${TEST_RESULTS_DIR}. ` +
        `Najpierw uruchom: bun run test:e2e`,
    );
    process.exit(2);
  }

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.mkdir(ASSETS_DIR, { recursive: true });

  const pngs = await walkPngs(TEST_RESULTS_DIR);
  const trios = groupSnapshotTrios(pngs);

  // Zostawiamy tylko "interesujące" trio: failed (jest diff) lub incomplete
  // (brakuje któregokolwiek z 3 plików). Snapshoty które przeszły nie zostawiają
  // -actual/-expected/-diff w test-results, więc naturalnie ich tu nie widzimy.
  const failed = trios.filter((t) => t.diff || !(t.expected && t.actual));

  // Kopiujemy obrazy do assets/, żeby HTML był samowystarczalny (CI artifact upload).
  for (let i = 0; i < failed.length; i++) {
    const t = failed[i];
    const prefix = `${i.toString().padStart(3, "0")}-${t.stem}`;
    if (t.expected) t.expectedAsset = await copyAsset(t.expected, prefix, "expected");
    if (t.actual) t.actualAsset = await copyAsset(t.actual, prefix, "actual");
    if (t.diff) t.diffAsset = await copyAsset(t.diff, prefix, "diff");
  }

  const html = renderHtml({
    trios: failed,
    generatedAt: new Date().toISOString(),
    totalFailures: failed.length,
  });

  const indexPath = path.join(REPORT_DIR, "index.html");
  await fs.writeFile(indexPath, html, "utf8");

  console.log(
    `[visual-snapshot-report] ✓ Raport: ${path.relative(PROJECT_ROOT, indexPath)} ` +
      `(${failed.length} ${failed.length === 1 ? "snapshot" : "snapshotów"})`,
  );
};

main().catch((err) => {
  console.error("[visual-snapshot-report] Błąd:", err);
  process.exit(1);
});
