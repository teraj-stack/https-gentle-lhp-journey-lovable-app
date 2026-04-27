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
 *   node scripts/visual-snapshot-report.mjs --max-failures=50
 *   node scripts/visual-snapshot-report.mjs -m 50
 *   node scripts/visual-snapshot-report.mjs --max-copy=20 --max-discovery=50
 *   node scripts/visual-snapshot-report.mjs --sort=viewport,-state
 *   node scripts/visual-snapshot-report.mjs --sort=status,path --max-failures=50
 *   MAX_FAILURES=50 node scripts/visual-snapshot-report.mjs
 *   MAX_COPY=20 MAX_DISCOVERY=50 SORT=viewport,state node scripts/visual-snapshot-report.mjs
 *   (opcjonalnie po `bun run test:e2e`)
 *
 * Sortowanie (`--sort=<keys>`, env `SORT`, default `path,stem`):
 *   Steruje kolejnością trio PRZED `--max-failures`, więc decyduje, co
 *   wpadnie do pierwszych N i co trafi do sekcji "omitted". Wartość to
 *   lista kluczy oddzielonych przecinkami; prefix `-` = malejąco. Klucze:
 *     viewport — small-mobile / mobile / tablet / desktop (alfabetycznie)
 *     state    — np. state-a-empty / dark-state-c-...
 *     path     — katalog testu (Playwright spec)
 *     stem     — pełna nazwa snapshota (zawsze finalny tie-breaker)
 *     status   — failed (realne regresje) przed incomplete (brak baseline)
 *   Przykłady:
 *     --sort=status,viewport   → najpierw failed, w obrębie po viewport
 *     --sort=viewport,-state   → mobile pierwsze, w obrębie odwrócony state
 *     --sort=-status           → najpierw incomplete (np. po dodaniu nowego specu)
 *   Nieznane klucze → warning + skip; pusta wartość → fallback na default.
 *
 * Fail-fast — trzy poziomy obcinania (od najbardziej do najmniej agresywnego):
 *
 *   --max-failures=N (alias -m, env MAX_FAILURES)
 *     Globalny limit kart w raporcie. Sortuje failed trio deterministycznie
 *     (po dir + stem) i zostawia pierwsze N. Wszystko poza tym jest pomijane:
 *     karty NIE są renderowane, asset NIE jest kopiowany, discovery NIE biegnie.
 *     Najszybsze, ale traci kontekst (user nie zobaczy że ma więcej regresji
 *     niż N — jest tylko banner z totalem).
 *
 *   --max-copy=N (env MAX_COPY)
 *     Limit dla DROGIEGO kopiowania PNG (3 pliki * fs.copyFile per trio).
 *     Pierwsze N trio dostaje pełną triadę obrazów; reszta renderuje się jako
 *     karta z placeholderami "(pominięto kopiowanie — --max-copy)" — user wie
 *     że regresja istnieje, widzi metadane (viewport / state / nazwę), ale nie
 *     ma podglądu pikseli. Idealne gdy chcesz zobaczyć GDZIE są regresje
 *     (breakdown per viewport/state) bez płacenia za 1500 plików IO.
 *
 *   --max-discovery=N (env MAX_DISCOVERY)
 *     Limit dla discovery artefaktów Playwrighta (trace.zip / video / error-context).
 *     Każde discovery to readdir + heurystyki — tanie pojedynczo, ale 500x się
 *     skaluje. Pierwsze N trio dostaje pełne deep-linki (Trace Viewer, Video,
 *     Error context); reszta tylko podstawowy footer (Playwright report + folder).
 *
 *   Hierarchia: --max-failures TNIE FIRST (przed wszystkim), więc
 *   --max-copy / --max-discovery działają na już obcięty zbiór. Jeśli
 *   --max-copy > liczby kart po --max-failures, jest no-op (i odwrotnie).
 *   Wszystkie limity są niezależne — można łączyć dowolnie. Brak limitu
 *   = pełna obróbka wszystkich kart (back-compat z poprzednim zachowaniem).
 *
 *   Walidacja: dodatnie liczby całkowite. Złe wartości → warning + brak limitu
 *   (skrypt jest idempotentnym narzędziem post-run, nie wywalamy CI za literówkę).
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
// Domyślna lokalizacja Playwright HTML reportera.
// Jeśli projekt używa innego (np. ENV PLAYWRIGHT_HTML_REPORT), readinę tu fallback.
const PLAYWRIGHT_REPORT_DIR = path.join(
  PROJECT_ROOT,
  process.env.PLAYWRIGHT_HTML_REPORT || "playwright-report",
);
// Trace Viewer hostowany przez Playwright zespół — przyjmuje URL do trace.zip.
// Działa, jeśli plik jest dostępny przez HTTP (np. CI artifact link).
// Lokalnie linkujemy file:// — Trace Viewer wymaga drag-and-drop,
// więc dla lokalnych runów dajemy też przycisk "Pokaż trace lokalnie".
const TRACE_VIEWER_URL = "https://trace.playwright.dev/";

/**
 * Parser argumentów CLI. Wspierane flagi (każda osobno walidowana):
 *   --max-failures=N | --max-failures N | -m N | env MAX_FAILURES
 *     globalny limit kart w raporcie (tnie przed wszystkim)
 *   --max-copy=N | --max-copy N | env MAX_COPY
 *     limit dla kopiowania PNG do assets/ (drogie IO)
 *   --max-discovery=N | --max-discovery N | env MAX_DISCOVERY
 *     limit dla discovery artefaktów Playwrighta (readdir per katalog)
 *
 * Walidacja: dodatnia liczba całkowita. Błędna wartość → warning + null
 * (raport bez limitu). Celowo NIE crashujemy — skrypt jest idempotentny
 * narzędziem post-run, nie chcemy żeby literówka w CI wywaliła build.
 */
// Klucze dozwolone dla --sort. Każdy ma `extract(t)` zwracający string/number
// porównywalny w localeCompare. Wybór sterowany priorytetami debugowania:
//   viewport → grupuje regresje per breakpoint (mobile vs desktop pierwsze)
//   state    → grupuje per scenariusz (state-a-empty vs dark-state-c-...)
//   path     → katalog testu (Playwright spec → łatwiej re-runować całą sutę)
//   stem     → pełna nazwa snapshota (default tie-breaker)
//   status   → "failed" przed "incomplete" (priorytet realnych regresji)
const SORT_KEYS = {
  viewport: (t) => t._viewport,
  state: (t) => t._state,
  path: (t) => t.dir,
  stem: (t) => t.stem,
  // Lower-case sort: "failed" < "incomplete" alfabetycznie, co dobrze pasuje
  // do intencji ("najpierw realne regresje, potem brak baseline'u").
  status: (t) => (t.expected && t.actual && t.diff ? "failed" : "incomplete"),
};
const DEFAULT_SORT = "path,stem"; // Back-compat z poprzednim zachowaniem.

const parseCliArgs = (argv) => {
  // Mapa: nazwa flagi → { aliases:[], envVar, value:null, kind }
  // kind = "int" (dodatnia liczba) | "str" (dowolny string, walidacja per-flag)
  const flags = {
    maxFailures: { long: "--max-failures", short: "-m", env: "MAX_FAILURES", value: null, kind: "int" },
    maxCopy: { long: "--max-copy", short: null, env: "MAX_COPY", value: null, kind: "int" },
    maxDiscovery: { long: "--max-discovery", short: null, env: "MAX_DISCOVERY", value: null, kind: "int" },
    sort: { long: "--sort", short: null, env: "SORT", value: null, kind: "str" },
  };

  const tryAssign = (flagKey, raw, source) => {
    if (raw === null || raw === undefined) return;
    const def = flags[flagKey];
    if (def.kind === "int") {
      const n = Number.parseInt(raw, 10);
      if (Number.isInteger(n) && n > 0) {
        def.value = n;
      } else {
        console.warn(
          `[visual-snapshot-report] Ignoruję ${source}="${raw}" — oczekiwano dodatniej liczby całkowitej.`,
        );
      }
    } else {
      // String — walidacja per-flag w consume site.
      def.value = String(raw);
    }
  };

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    for (const [key, def] of Object.entries(flags)) {
      // Forma --flag=value
      if (a.startsWith(`${def.long}=`)) {
        tryAssign(key, a.slice(def.long.length + 1), def.long);
        break;
      }
      // Forma --flag value (lub -m value)
      if (a === def.long || (def.short && a === def.short)) {
        tryAssign(key, args[i + 1], a);
        i++; // zjada następny token
        break;
      }
    }
  }

  // Env fallback tylko dla flag, których CLI nie ustawił.
  for (const [key, def] of Object.entries(flags)) {
    if (flags[key].value === null && process.env[def.env]) {
      tryAssign(key, process.env[def.env], def.env);
    }
  }

  return {
    maxFailures: flags.maxFailures.value,
    maxCopy: flags.maxCopy.value,
    maxDiscovery: flags.maxDiscovery.value,
    sort: flags.sort.value, // string lub null (=> default)
  };
};

/**
 * Parsuje "--sort=viewport,-state,path" → [{key:"viewport",dir:1},
 * {key:"state",dir:-1},{key:"path",dir:1}]. Klucze nieznane → warning + skip
 * (NIE crash — back-compat z polityką "literówka w CI nie wywala buildu").
 * Pusty/null input → null (caller użyje DEFAULT_SORT).
 */
const parseSortSpec = (raw) => {
  if (!raw) return null;
  const parts = String(raw)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const spec = [];
  for (const p of parts) {
    const dir = p.startsWith("-") ? -1 : 1;
    const key = p.replace(/^[+-]/, "");
    if (!Object.prototype.hasOwnProperty.call(SORT_KEYS, key)) {
      console.warn(
        `[visual-snapshot-report] Ignoruję klucz sortowania "${key}" — dozwolone: ${Object.keys(SORT_KEYS).join(", ")}.`,
      );
      continue;
    }
    spec.push({ key, dir });
  }
  return spec.length > 0 ? spec : null;
};

/**
 * Buduje comparator z [{key,dir}, ...]. Zawsze dokleja `stem` jako finalny
 * tie-breaker, żeby output był deterministyczny nawet gdy user poda tylko
 * "viewport" (inaczej fs.readdir order by się zachowała w obrębie viewportu).
 */
const buildComparator = (spec) => {
  const withTieBreaker = [...spec];
  if (!withTieBreaker.some((s) => s.key === "stem")) {
    withTieBreaker.push({ key: "stem", dir: 1 });
  }
  return (a, b) => {
    for (const { key, dir } of withTieBreaker) {
      const va = SORT_KEYS[key](a);
      const vb = SORT_KEYS[key](b);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  };
};

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

/**
 * Wykrywa dodatkowe artefakty Playwrighta w katalogu testu (`t.dir`):
 *  - trace.zip          → link do Trace Viewera (https://trace.playwright.dev/)
 *  - video.webm / *.webm → link do nagrania
 *  - error-context.md   → snapshot stanu DOM/console (Playwright 1.40+)
 *
 * Wszystko relatywne do REPORT_DIR, żeby zachować przenośność (CI artifact upload
 * pakuje cały `test-results/`, więc relatywne ścieżki działają out-of-the-box).
 */
const discoverPlaywrightArtifacts = async (testDir) => {
  let entries = [];
  try {
    entries = await fs.readdir(testDir, { withFileTypes: true });
  } catch {
    return { trace: null, video: null, errorContext: null };
  }
  const find = (predicate) => {
    const hit = entries.find((e) => e.isFile() && predicate(e.name));
    return hit ? path.join(testDir, hit.name) : null;
  };
  return {
    trace: find((n) => n === "trace.zip" || n.endsWith(".trace.zip")),
    video: find((n) => n.endsWith(".webm")),
    errorContext: find((n) => n === "error-context.md"),
  };
};

/**
 * Sprawdza, czy Playwright HTML report istnieje. Zwraca relatywną ścieżkę
 * od REPORT_DIR do `index.html` reportera lub null, jeśli go nie ma.
 *
 * Uwaga: Playwright HTML reporter NIE eksponuje deep-linków per test case
 * przez stabilny URL — testId jest hashem generowanym przy renderze. Dlatego
 * linkujemy do listy + kopiujemy nazwę testu do clipboardu, żeby user wkleił
 * w search box reportera.
 */
const discoverPlaywrightReport = async () => {
  try {
    await fs.access(path.join(PLAYWRIGHT_REPORT_DIR, "index.html"));
    return path.relative(REPORT_DIR, path.join(PLAYWRIGHT_REPORT_DIR, "index.html"));
  } catch {
    return null;
  }
};

/**
 * Renderuje pasek linków na dole karty: Playwright HTML report, folder
 * artefaktów, trace viewer, video, error-context. Każdy link jest opcjonalny
 * — pokazujemy tylko te, dla których faktycznie mamy plik.
 *
 * Trace Viewer URL używa schematu ?trace=<URL>. Lokalnie file:// nie zadziała
 * (CORS Trace Viewera), więc dajemy też kopiowalną komendę `playwright show-trace`,
 * która zawsze działa lokalnie (przycisk "Kopiuj komendę").
 */
const renderCardLinks = (t, playwrightReportRel) => {
  const links = [];
  if (playwrightReportRel) {
    // Playwright HTML reporter nie ma stabilnego deep-linka per test case
    // (testId = lokalny hash). Dlatego linkujemy do listy + kopiujemy nazwę
    // testu do clipboardu, żeby user wkleił w search box reportera.
    links.push(`
      <a class="card-link card-link-primary"
         href="${escapeHtml(playwrightReportRel)}"
         target="_blank"
         rel="noopener"
         data-copy-on-click="${escapeHtml(t.testName)}"
         title="Otwórz Playwright HTML report (nazwa testu skopiowana do clipboardu)">
        📊 Playwright report
      </a>`);
  }
  if (t.tracePath) {
    // Trace Viewer hostowany przez Playwright. Działa, gdy plik jest
    // dostępny przez HTTP. Lokalnie file:// nie pójdzie — stąd
    // alternatywny przycisk z komendą.
    const traceUrl = `${TRACE_VIEWER_URL}?trace=${encodeURIComponent(t.tracePath)}`;
    links.push(`
      <a class="card-link"
         href="${escapeHtml(traceUrl)}"
         target="_blank"
         rel="noopener"
         title="Otwórz trace.zip w Trace Viewerze (działa, gdy plik jest dostępny przez HTTP)">
        🔬 Trace Viewer
      </a>
      <button type="button"
              class="card-link card-link-button"
              data-copy="npx playwright show-trace ${t.dir.replace(PROJECT_ROOT + path.sep, "")}/trace.zip"
              title="Kopiuj komendę CLI do otwarcia trace lokalnie">
        📋 show-trace CLI
      </button>`);
  }
  if (t.videoPath) {
    links.push(`
      <a class="card-link" href="${escapeHtml(t.videoPath)}" target="_blank" rel="noopener"
         title="Otwórz nagranie testu (.webm)">
        🎬 Video
      </a>`);
  }
  if (t.errorContextPath) {
    links.push(`
      <a class="card-link" href="${escapeHtml(t.errorContextPath)}" target="_blank" rel="noopener"
         title="Snapshot stanu DOM/console w momencie błędu">
        🧾 Error context
      </a>`);
  }
  if (t.testDirPath) {
    // Link do katalogu z artefaktami (file:// w przeglądarce otworzy folder
    // w explorerze). Działa lokalnie; w CI artefakty są zwykle w innym
    // miejscu, więc przycisk kopiuje też ścieżkę do clipboardu.
    links.push(`
      <button type="button"
              class="card-link card-link-button"
              data-copy="${escapeHtml(t.testDirPath)}"
              title="Kopiuj ścieżkę do katalogu artefaktów testu">
        📁 Folder artefaktów
      </button>`);
  }
  if (links.length === 0) return "";
  return `<footer class="card-links" aria-label="Linki do szczegółów Playwrighta">${links.join("")}</footer>`;
};

const renderHtml = ({
  trios,
  generatedAt,
  totalFailures,
  playwrightReportRel,
  truncation,
  copyTruncation,
  discoveryTruncation,
}) => {
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
      // Gdy --max-copy obciął kopiowanie dla tego trio, pokazujemy dedykowany
      // placeholder (informujący że plik istnieje, ale nie został skopiowany)
      // zamiast ogólnego "brak baseline'u" — inaczej user pomyli to z incomplete.
      const cell = (label, asset, fallback) => {
        if (asset) {
          return `<figure>
               <figcaption>${escapeHtml(label)}</figcaption>
               <a href="${escapeHtml(asset)}" target="_blank" rel="noopener">
                 <img loading="lazy" src="${escapeHtml(asset)}" alt="${escapeHtml(label)} — ${escapeHtml(t.stem)}" />
               </a>
             </figure>`;
        }
        const isCopySkipped = t.copySkipped;
        const message = isCopySkipped
          ? "Pominięto kopiowanie (--max-copy). Patrz: folder artefaktów."
          : fallback;
        return `<figure class="missing${isCopySkipped ? " missing-copy-skipped" : ""}">
               <figcaption>${escapeHtml(label)}</figcaption>
               <div class="missing-box">${escapeHtml(message)}</div>
             </figure>`;
      };
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
          ${renderCardLinks(t, playwrightReportRel)}
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

  // ---- Sekcja "Pominięte przez --max-failures" ----
  // Jawna lista trio, które nie weszły do raportu, żeby user wiedział DOKŁADNIE
  // co zostało odcięte (a nie tylko że "było ich więcej"). Renderujemy jako
  // <details> domyślnie zwinięte — przy 500+ pominiętych nie chcemy wybuchu UI.
  // Każdy wiersz pokazuje stem + viewport + state + testName, żeby user mógł:
  //   1. Skopiować nazwę i wkleić w `--filter` na ponowny run,
  //   2. Zobaczyć w breakdown czy pominięte nie są zdominowane przez jeden viewport.
  // Dodatkowo dajemy przycisk "Kopiuj listę" (whitespace-separated stems),
  // który ułatwia re-run po konkretne testy.
  const omittedSection =
    truncation && truncation.omitted && truncation.omitted.length > 0
      ? (() => {
          const stemsForCopy = truncation.omitted.map((o) => o.stem).join(" ");
          const rows = truncation.omitted
            .map(
              (o) => `
              <tr>
                <td><code>${escapeHtml(o.stem)}</code></td>
                <td>${escapeHtml(o.viewport)}</td>
                <td>${escapeHtml(o.state)}</td>
                <td class="omitted-testname">${escapeHtml(o.testName)}</td>
              </tr>`,
            )
            .join("");
          return `
            <details class="omitted-section" open>
              <summary>
                <span class="omitted-summary-label">
                  📋 Pominięte przez <code>--max-failures=${truncation.limit}</code>:
                  <strong>${truncation.omitted.length}</strong> ${truncation.omitted.length === 1 ? "trio" : "trio"}
                </span>
                <button type="button"
                        class="card-link card-link-button omitted-copy-btn"
                        data-copy="${escapeHtml(stemsForCopy)}"
                        title="Kopiuj wszystkie pominięte stems oddzielone spacją">
                  📋 Kopiuj listę stems
                </button>
              </summary>
              <div class="omitted-table-wrap">
                <table class="omitted-table">
                  <thead>
                    <tr>
                      <th>Stem</th>
                      <th>Viewport</th>
                      <th>State</th>
                      <th>Test (katalog)</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
              <p class="omitted-hint">
                Wskazówka: uruchom skrypt bez <code>--max-failures</code> (lub z większą wartością),
                żeby zobaczyć karty z obrazami dla powyższych trio.
              </p>
            </details>`;
        })()
      : "";

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
    /* ---- Breakdown (per viewport / per state) ---- */
    .breakdown {
      max-width: 1400px; margin: 0 auto 24px;
      padding: 16px 20px; background: var(--card);
      border: 1px solid var(--border); border-radius: 8px;
    }
    .breakdown-title { margin: 0 0 4px; font-size: 16px; }
    .breakdown-hint { margin: 0 0 12px; color: var(--muted); font-size: 12px; }
    .breakdown-grid {
      display: grid; gap: 16px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 720px) {
      .breakdown-grid { grid-template-columns: 1fr 1fr; }
    }
    .breakdown-table-wrap h3 {
      margin: 0 0 8px; font-size: 12px; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .breakdown-table {
      width: 100%; border-collapse: collapse; font-size: 13px;
    }
    .breakdown-table th,
    .breakdown-table td {
      text-align: left; padding: 6px 10px;
      border-bottom: 1px solid var(--border);
    }
    .breakdown-table thead th {
      font-size: 11px; color: var(--muted); font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .breakdown-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .num-failed { color: var(--danger); font-weight: 600; }
    .num-incomplete { color: var(--warn); font-weight: 600; }
    .num-zero { color: var(--muted); }
    .breakdown-row { cursor: pointer; }
    .breakdown-row:hover { background: rgba(127,127,127,.08); }
    .breakdown-row:focus { outline: 2px solid var(--accent); outline-offset: -2px; }
    .breakdown-row.is-active { background: rgba(79,195,247,.12); }
    /* ---- Card links (Playwright deep links) ---- */
    .card-links {
      display: flex; flex-wrap: wrap; gap: 8px;
      padding: 12px 16px; border-top: 1px solid var(--border);
      background: rgba(127,127,127,.04);
    }
    .card-link {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 6px 10px; border-radius: 4px;
      border: 1px solid var(--border); background: var(--bg);
      color: var(--fg); text-decoration: none; font-size: 12px;
      font-family: inherit; cursor: pointer;
    }
    .card-link:hover { border-color: var(--accent); color: var(--accent); }
    .card-link:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
    .card-link-primary { border-color: var(--accent); color: var(--accent); font-weight: 600; }
    .card-link.is-copied { border-color: var(--accent); background: rgba(79,195,247,.15); }
    .header-link {
      display: inline-block; margin-left: 12px; padding: 4px 10px;
      border: 1px solid var(--border); border-radius: 4px;
      color: var(--accent); text-decoration: none; font-size: 12px;
    }
    .header-link:hover { border-color: var(--accent); }
    .truncation-banner {
      max-width: 1400px; margin: 0 auto 16px;
      padding: 12px 16px; background: rgba(255,167,38,.12);
      border: 1px solid var(--warn); border-left-width: 4px; border-radius: 6px;
      color: var(--fg); font-size: 13px;
    }
    /* Soft variant — używana dla --max-copy / --max-discovery, czyli ograniczeń
       optymalizacyjnych (nie obcinają kart, tylko ich zawartość). */
    .truncation-banner-soft {
      background: rgba(127,127,127,.08);
      border-color: rgba(127,127,127,.4);
    }
    .truncation-banner code {
      background: rgba(127,127,127,.15); padding: 1px 6px;
      border-radius: 3px; font-size: 12px;
    }
    /* Sekcja "Pominięte przez --max-failures" — zwijana lista trio bez kart.
       Tabela ma stałą max-height + scroll, żeby 500+ wierszy nie rozwalało layoutu. */
    .omitted-section {
      max-width: 1400px; margin: 0 auto 16px;
      background: var(--card); border: 1px solid var(--border);
      border-left: 4px solid var(--warn); border-radius: 6px; padding: 12px 16px;
    }
    .omitted-section > summary {
      cursor: pointer; list-style: none; display: flex;
      align-items: center; justify-content: space-between; gap: 12px;
      flex-wrap: wrap; font-size: 14px;
    }
    .omitted-section > summary::-webkit-details-marker { display: none; }
    .omitted-section > summary::before {
      content: "▶"; display: inline-block; margin-right: 8px;
      transition: transform .15s; color: var(--muted); font-size: 10px;
    }
    .omitted-section[open] > summary::before { transform: rotate(90deg); }
    .omitted-summary-label { display: inline-flex; align-items: center; gap: 6px; }
    .omitted-copy-btn { margin-left: auto; }
    .omitted-table-wrap {
      max-height: 360px; overflow: auto; margin-top: 12px;
      border: 1px solid var(--border); border-radius: 4px;
    }
    .omitted-table {
      width: 100%; border-collapse: collapse; font-size: 12px;
    }
    .omitted-table th, .omitted-table td {
      padding: 6px 10px; text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .omitted-table thead th {
      position: sticky; top: 0; background: var(--card);
      color: var(--muted); font-weight: 600; z-index: 1;
    }
    .omitted-table tbody tr:hover { background: rgba(127,127,127,.06); }
    .omitted-table code { font-size: 11px; word-break: break-all; }
    .omitted-testname { color: var(--muted); font-size: 11px; word-break: break-all; }
    .omitted-hint { margin: 10px 4px 0; color: var(--muted); font-size: 12px; }
    /* Placeholder dla figure gdy --max-copy obciął kopiowanie — bardziej
       neutralny niż czerwony "missing", żeby user nie myślał że to błąd. */
    .missing-copy-skipped .missing-box {
      background: rgba(127,127,127,.08);
      border-style: dashed;
    }
  </style>
</head>
<body>
  <header class="page-header">
    <h1>Visual snapshot report — live preview${
      playwrightReportRel
        ? ` <a class="header-link" href="${escapeHtml(playwrightReportRel)}" target="_blank" rel="noopener">📊 Otwórz pełny Playwright report</a>`
        : ""
    }</h1>
    <p class="meta">Wygenerowano: ${escapeHtml(generatedAt)} · Źródło: <code>test-results/</code>${
      playwrightReportRel
        ? ""
        : ` · <em>(Playwright HTML report nie znaleziony w <code>playwright-report/</code> — uruchom z reporterem html, żeby aktywować deep linki)</em>`
    }</p>
  </header>
  ${truncation
    ? `<aside class="truncation-banner" role="status">
         ⚠ Fail-fast: pokazano <strong>${truncation.shown}</strong> z <strong>${truncation.total}</strong>
         nieudanych snapshotów (limit <code>--max-failures=${truncation.limit}</code>).
         Pełny zestaw zobaczysz po uruchomieniu skryptu bez tej flagi.
       </aside>`
    : ""}
  ${copyTruncation
    ? `<aside class="truncation-banner truncation-banner-soft" role="status">
         ⚠ Fail-fast (kopiowanie PNG): skopiowano obrazy dla pierwszych
         <strong>${copyTruncation.processed}</strong> z <strong>${copyTruncation.total}</strong>
         trio (limit <code>--max-copy=${copyTruncation.limit}</code>).
         Pozostałe karty pokazują metadane bez podglądu — pełną triadę znajdziesz w katalogu artefaktów.
       </aside>`
    : ""}
  ${discoveryTruncation
    ? `<aside class="truncation-banner truncation-banner-soft" role="status">
         ⚠ Fail-fast (discovery artefaktów): wykryto trace/video/error-context dla pierwszych
         <strong>${discoveryTruncation.processed}</strong> z <strong>${discoveryTruncation.total}</strong>
         trio (limit <code>--max-discovery=${discoveryTruncation.limit}</code>).
         Reszta kart ma tylko podstawowy footer (Playwright report + folder).
       </aside>`
    : ""}
  ${summaryLine}
  ${omittedSection}
  ${breakdownSection}
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

      // Zaznacz w breakdown wiersze, które odpowiadają aktywnym filtrom —
      // user widzi od razu, którą "kategorię" ma zawężoną.
      var breakdownRows = document.querySelectorAll(".breakdown-row");
      Array.prototype.forEach.call(breakdownRows, function (row) {
        var key = row.dataset.filterKey;
        var val = row.dataset.filterValue;
        var active = (key === "viewport" && v === val) || (key === "state" && st === val);
        row.classList.toggle("is-active", active);
        row.setAttribute("aria-pressed", active ? "true" : "false");
      });

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

    // Klikalne wiersze w breakdown — toggle filtra dla danego viewport / state.
    // Drugi klik na ten sam wiersz = czyści ten wymiar (UX: row działa jak switch).
    function toggleBreakdownFilter(row) {
      var key = row.dataset.filterKey;
      var val = row.dataset.filterValue;
      if (!key || !inputs[key]) return;
      inputs[key].value = inputs[key].value === val ? "" : val;
      applyFilter();
      // Przewiń do listy, żeby user widział wynik kliknięcia bez scrollowania.
      var container = document.getElementById("cards-container");
      if (container) container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    Array.prototype.forEach.call(document.querySelectorAll(".breakdown-row"), function (row) {
      row.addEventListener("click", function () { toggleBreakdownFilter(row); });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleBreakdownFilter(row);
        }
      });
    });

    applyFilter();

    // ---- Clipboard helpers dla deep linków Playwrighta ----
    // [data-copy="..."]          → button kopiuje wartość do clipboardu, brak nawigacji
    // [data-copy-on-click="..."] → link działa normalnie (target=_blank), ale po drodze
    //                              kopiuje wartość (np. nazwę testu do wklejenia w search)
    function flashCopied(el) {
      el.classList.add("is-copied");
      var orig = el.textContent;
      el.textContent = "✓ Skopiowano";
      setTimeout(function () {
        el.classList.remove("is-copied");
        el.textContent = orig;
      }, 1200);
    }
    function copyText(text) {
      // Preferuj nowoczesne API; fallback dla file:// gdzie clipboard może być zablokowany.
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
      return Promise.resolve();
    }
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-copy]");
      if (btn) {
        e.preventDefault();
        copyText(btn.getAttribute("data-copy")).then(function () { flashCopied(btn); });
        return;
      }
      var link = e.target.closest("[data-copy-on-click]");
      if (link) {
        // NIE preventDefault — link ma się otworzyć normalnie.
        copyText(link.getAttribute("data-copy-on-click")).catch(function () {});
      }
    });
  })();
  </script>
</body>
</html>`;
};

const main = async () => {
  const { maxFailures, maxCopy, maxDiscovery, sort: sortRaw } = parseCliArgs(process.argv);

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
  const allFailed = trios.filter((t) => t.diff || !(t.expected && t.actual));

  // Pre-kompute viewport/state per trio — używane zarówno w sort comparator,
  // jak i później w renderHtml / liście "omitted". Trzymamy w prywatnych
  // polach `_viewport` / `_state`, żeby nie duplikować wywołań parseSnapshotName.
  for (const t of allFailed) {
    const parsed = parseSnapshotName(t.stem + "-actual.png");
    t._viewport = parsed.viewport;
    t._state = parsed.state;
  }

  // Sortowanie deterministyczne PRZED ewentualnym obcięciem przez --max-failures.
  // Bez tego "pierwsze N" zależałoby od kolejności fs.readdir (platform-specific).
  // User może nadpisać porządek przez --sort, np.:
  //   --sort=viewport,-state    (najpierw mobile, w obrębie odwrócony state)
  //   --sort=status,path        (najpierw realne failures, potem incomplete)
  // buildComparator dokleja stem jako finalny tie-breaker (cross-OS stability).
  const sortSpec = parseSortSpec(sortRaw) || parseSortSpec(DEFAULT_SORT);
  allFailed.sort(buildComparator(sortSpec));

  if (sortRaw) {
    const human = sortSpec.map((s) => (s.dir === -1 ? `-${s.key}` : s.key)).join(",");
    console.log(`[visual-snapshot-report] Sortowanie: ${human}`);
  }

  // Fail-fast (poziom 1): obetnij globalnie PRZED dalszą obróbką.
  // Wszystko poza tym slice'em w ogóle nie wchodzi do raportu.
  const truncatedBy = maxFailures !== null && allFailed.length > maxFailures;
  const failed = truncatedBy ? allFailed.slice(0, maxFailures) : allFailed;

  if (truncatedBy) {
    console.log(
      `[visual-snapshot-report] ⚠ Fail-fast: znaleziono ${allFailed.length} failed snapshotów, ` +
        `obcięto do pierwszych ${maxFailures} (--max-failures).`,
    );
  }

  // Fail-fast (poziom 2 i 3): osobne limity dla DROGICH operacji per trio.
  // - copyLimit  → ile pierwszych trio kopiuje 3 PNG do assets/ (najdroższe IO)
  // - discoveryLimit → ile pierwszych trio robi readdir w katalogu testu
  // Brak limitu (null) = obrabiamy wszystkie z `failed`. Limit > failed.length
  // = no-op (nie crashujemy, po prostu nic nie obcinamy).
  const copyLimit = maxCopy !== null ? Math.min(maxCopy, failed.length) : failed.length;
  const discoveryLimit =
    maxDiscovery !== null ? Math.min(maxDiscovery, failed.length) : failed.length;

  if (maxCopy !== null && failed.length > maxCopy) {
    console.log(
      `[visual-snapshot-report] ⚠ Fail-fast (kopiowanie): kopiuję PNG dla pierwszych ${copyLimit} ` +
        `z ${failed.length} trio (--max-copy=${maxCopy}). Reszta = placeholder.`,
    );
  }
  if (maxDiscovery !== null && failed.length > maxDiscovery) {
    console.log(
      `[visual-snapshot-report] ⚠ Fail-fast (discovery): wykrywam artefakty Playwrighta dla ` +
        `pierwszych ${discoveryLimit} z ${failed.length} trio (--max-discovery=${maxDiscovery}).`,
    );
  }

  // Pętla obróbki per trio. Dwa niezależne progi sterują tym, ile pracy
  // faktycznie wykonujemy. Karta zawsze powstaje (metadata jest darmowa);
  // pomijamy tylko drogie IO. Flagujemy `copySkipped` w obiekcie trio,
  // żeby renderHtml mógł pokazać placeholder zamiast brakującego obrazka.
  for (let i = 0; i < failed.length; i++) {
    const t = failed[i];
    const prefix = `${i.toString().padStart(3, "0")}-${t.stem}`;

    if (i < copyLimit) {
      if (t.expected) t.expectedAsset = await copyAsset(t.expected, prefix, "expected");
      if (t.actual) t.actualAsset = await copyAsset(t.actual, prefix, "actual");
      if (t.diff) t.diffAsset = await copyAsset(t.diff, prefix, "diff");
    } else {
      // Placeholder mode: nie kopiujemy obrazków, ale flagujemy żeby cell()
      // pokazał czytelny komunikat zamiast "brak baseline'u".
      t.copySkipped = true;
    }

    if (i < discoveryLimit) {
      const artifacts = await discoverPlaywrightArtifacts(t.dir);
      // Konwertujemy bezwzględne ścieżki na relatywne od REPORT_DIR — przenośność.
      t.tracePath = artifacts.trace ? path.relative(REPORT_DIR, artifacts.trace) : null;
      t.videoPath = artifacts.video ? path.relative(REPORT_DIR, artifacts.video) : null;
      t.errorContextPath = artifacts.errorContext
        ? path.relative(REPORT_DIR, artifacts.errorContext)
        : null;
    } else {
      // Discovery pominięte — link do Playwright reportu i folderu testu i tak
      // działa (nie wymagają readdir per trio), więc footer NIE będzie pusty.
      t.discoverySkipped = true;
      t.tracePath = null;
      t.videoPath = null;
      t.errorContextPath = null;
    }
    // testDirPath jest darmowy (path.relative, brak IO) → zawsze ustawiamy.
    t.testDirPath = path.relative(REPORT_DIR, t.dir);
  }

  const playwrightReportRel = await discoverPlaywrightReport();

  const html = renderHtml({
    trios: failed,
    generatedAt: new Date().toISOString(),
    totalFailures: failed.length,
    playwrightReportRel,
    truncation: truncatedBy
      ? {
          shown: failed.length,
          total: allFailed.length,
          limit: maxFailures,
          // Pełna lista pominiętych trio (wszystko po slice'ie). Wzbogacamy
          // o viewport/state z parseSnapshotName, żeby user mógł zorientować
          // się GDZIE są dalsze regresje bez re-runa skryptu bez limitu.
          // testName = nazwa katalogu Playwrighta — jednoznaczny lokator.
          omitted: allFailed.slice(maxFailures).map((t) => ({
            stem: t.stem,
            viewport: t._viewport,
            state: t._state,
            testName: t.testName,
          })),
        }
      : null,
    copyTruncation:
      maxCopy !== null && failed.length > maxCopy
        ? { processed: copyLimit, total: failed.length, limit: maxCopy }
        : null,
    discoveryTruncation:
      maxDiscovery !== null && failed.length > maxDiscovery
        ? { processed: discoveryLimit, total: failed.length, limit: maxDiscovery }
        : null,
  });

  const indexPath = path.join(REPORT_DIR, "index.html");
  await fs.writeFile(indexPath, html, "utf8");

  const noun = failed.length === 1 ? "snapshot" : "snapshotów";
  const parts = [truncatedBy ? `${failed.length} z ${allFailed.length} ${noun} (obcięto)` : `${failed.length} ${noun}`];
  if (maxCopy !== null && failed.length > maxCopy) parts.push(`copy=${copyLimit}`);
  if (maxDiscovery !== null && failed.length > maxDiscovery) parts.push(`discovery=${discoveryLimit}`);
  console.log(
    `[visual-snapshot-report] ✓ Raport: ${path.relative(PROJECT_ROOT, indexPath)} (${parts.join(", ")})`,
  );
};

main().catch((err) => {
  console.error("[visual-snapshot-report] Błąd:", err);
  process.exit(1);
});
