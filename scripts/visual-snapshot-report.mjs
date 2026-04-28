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
 * Fail-fast — pięć poziomów obcinania (kolejność w pipeline od góry do dołu):
 *
 *   --max-failures-per-viewport=N (env MAX_FAILURES_PER_VIEWPORT)
 *   --max-failures-per-state=N    (env MAX_FAILURES_PER_STATE)
 *     Proporcjonalne kapowanie per grupa (round-robin). Cel: gdy mamy 400 regresji
 *     w mobile + 5 w tablet, samo --max-failures=50 zjadłoby cały tablet.
 *     Per-grupa cap zostawia pierwsze N na grupę (zgodnie z aktualnym sortowaniem),
 *     więc każdy viewport / state ma reprezentację. Działa PRZED --max-failures.
 *
 *   --max-failures=N (alias -m, env MAX_FAILURES)
 *     Globalny limit kart w raporcie. Działa NA WIERZCHU per-grupa cap (więc
 *     najpierw balansujemy, potem ograniczamy globalnie). Wszystko poza tym
 *     jest pomijane: karty NIE są renderowane, asset NIE jest kopiowany,
 *     discovery NIE biegnie. Sekcja "Pominięte" pokazuje powód (badge).
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
    // Per-grupę limity (round-robin po viewport / state). Działają NIEZALEŻNIE
    // od --max-failures: można połączyć ("max 5 per viewport, do 50 łącznie").
    maxPerViewport: { long: "--max-failures-per-viewport", short: null, env: "MAX_FAILURES_PER_VIEWPORT", value: null, kind: "int" },
    maxPerState: { long: "--max-failures-per-state", short: null, env: "MAX_FAILURES_PER_STATE", value: null, kind: "int" },
    sort: { long: "--sort", short: null, env: "SORT", value: null, kind: "str" },
    // Auto-append podsumowania do trwałego pliku CSV (trend między runami).
    // Domyślnie: "<REPORT_DIR>/history.csv". Przekazanie wartości "off"/"false"/"none"
    // (lub flagi --no-history) wyłącza zapis. Custom path: --history=path/to/history.csv.
    history: { long: "--history", short: null, env: "HISTORY_CSV", value: null, kind: "str" },
    noHistory: { long: "--no-history", short: null, env: "NO_HISTORY", value: null, kind: "bool" },
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
    } else if (def.kind === "bool") {
      // Bool flag: presence (CLI bez wartości) lub env truthy ("1"/"true"/"yes").
      const s = String(raw).toLowerCase();
      def.value = s === "" || s === "1" || s === "true" || s === "yes" || s === "on";
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
      // Forma --flag value (lub -m value); dla bool: --flag bez wartości
      if (a === def.long || (def.short && a === def.short)) {
        if (def.kind === "bool") {
          tryAssign(key, "", a);
        } else {
          tryAssign(key, args[i + 1], a);
          i++; // zjada następny token
        }
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
    maxPerViewport: flags.maxPerViewport.value,
    maxPerState: flags.maxPerState.value,
    sort: flags.sort.value, // string lub null (=> default)
    history: flags.history.value, // string path, "off"/"false"/"none" lub null (=> default)
    noHistory: flags.noHistory.value === true, // bool
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

/**
 * Agreguje metryki oszczędności (PNG copy / discovery readdir / trio) per grupa
 * (viewport albo state). Pozwala odpowiedzieć: "która grupa najwięcej
 * oszczędziła w tym runie i czy tendencja jest stabilna w history".
 */
const aggregateSavingsByGroup = ({
  allFailed,
  rendered,
  copyLimit,
  discoveryLimit,
  keyFn,
}) => {
  const groups = new Map();
  const ensure = (k) => {
    if (!groups.has(k)) {
      groups.set(k, {
        trioBaseline: 0, trioRendered: 0,
        pngBaseline: 0, pngProcessed: 0,
        discoveryBaseline: 0, discoveryProcessed: 0,
      });
    }
    return groups.get(k);
  };
  for (const t of allFailed) {
    const g = ensure(keyFn(t));
    g.trioBaseline++;
    g.discoveryBaseline++;
    if (t.expected) g.pngBaseline++;
    if (t.actual) g.pngBaseline++;
    if (t.diff) g.pngBaseline++;
  }
  for (let i = 0; i < rendered.length; i++) {
    const t = rendered[i];
    const g = ensure(keyFn(t));
    g.trioRendered++;
    if (i < copyLimit) {
      if (t.expected) g.pngProcessed++;
      if (t.actual) g.pngProcessed++;
      if (t.diff) g.pngProcessed++;
    }
    if (i < discoveryLimit) g.discoveryProcessed++;
  }
  const pct = (saved, baseline) =>
    baseline > 0 ? Math.round((saved / baseline) * 1000) / 10 : 0;
  const out = {};
  for (const [k, g] of groups) {
    const trioSaved = g.trioBaseline - g.trioRendered;
    const pngSaved = g.pngBaseline - g.pngProcessed;
    const discoverySaved = g.discoveryBaseline - g.discoveryProcessed;
    out[k] = {
      trio: { baseline: g.trioBaseline, rendered: g.trioRendered, saved: trioSaved, savedPct: pct(trioSaved, g.trioBaseline) },
      png: { baseline: g.pngBaseline, processed: g.pngProcessed, saved: pngSaved, savedPct: pct(pngSaved, g.pngBaseline) },
      discovery: { baseline: g.discoveryBaseline, processed: g.discoveryProcessed, saved: discoverySaved, savedPct: pct(discoverySaved, g.discoveryBaseline) },
    };
  }
  return out;
};


/**
 * RFC 4180-aware CSV row splitter (module-level, reused by trends loader
 * i validator). Obsługuje pola w cudzysłowach z przecinkami / podwójnymi
 * cudzysłowami w środku — niezbędne dla kolumn `command` i `flag_history_path`,
 * które mogą zawierać spacje i przecinki.
 */
const splitCsvRow = (line) => {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (inQuotes) {
      if (ch === '"' && line[j + 1] === '"') { cur += '"'; j++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else if (ch === '"') { inQuotes = true; }
    else if (ch === ",") { out.push(cur); cur = ""; }
    else { cur += ch; }
  }
  out.push(cur);
  return out;
};

/**
 * Wczytuje historyczne wiersze z `history.csv` (jeśli istnieje) i zwraca
 * dane do narysowania sparkline'ów png_saved_pct + discovery_saved_pct.
 *
 * Resolver ścieżki history.csv musi być spójny z logiką auto-append na końcu
 * skryptu (default: REPORT_DIR/history.csv, --history=PATH override, --no-history
 * → null).
 *
 * "Bieżący run" jest dołączany na końcu z flagą isCurrent=true (oznaczany w UI),
 * żeby wykres pokazywał także TEN run, mimo że append do CSV zachodzi później.
 *
 * Każdy punkt zawiera oprócz png/discovery także `command` + wszystkie `flag_*`
 * kolumny (jako string), dzięki czemu UI może filtrować wykres po parametrach
 * uruchomienia bez re-runu skryptu.
 */
const TREND_FLAG_COLUMNS = [
  "flag_max_failures",
  "flag_max_per_viewport",
  "flag_max_per_state",
  "flag_max_copy",
  "flag_max_discovery",
  "flag_no_history",
  "flag_history_path",
];

/**
 * Pełna kanoniczna lista kolumn `savings.csv` / `history.csv` (schemaVersion 1).
 *
 * Trzymamy ją na module-levelu (a nie tylko lokalnie w funkcji zapisującej),
 * żeby:
 *  1. Walidator schematu mógł porównywać oczekiwany układ z plikiem.
 *  2. UI raportu mogło zaproponować eksport „pełny schemat" — wiersze
 *     wyrównane do tego samego nagłówka, z pustymi wartościami w polach,
 *     których embedded payload (`points`) nie zawiera (większość metryk
 *     trio_X/png_baseline/attribution_X/node_version/cwd_basename istnieje
 *     wyłącznie w oryginalnym CSV, nie w UI).
 *
 * Kolejność jest STABILNA — append do `history.csv` zakłada identyczny header
 * między runami, więc każda zmiana wymaga bumpa schemaVersion + re-archive
 * starych plików (patrz README sekcja „Schema validation").
 */
const SAVINGS_CSV_COLUMNS = [
  "generatedAt",
  "trio_baseline",
  "trio_rendered",
  "trio_saved",
  "trio_saved_pct",
  "png_baseline",
  "png_processed",
  "png_saved",
  "png_saved_pct",
  "discovery_baseline",
  "discovery_processed",
  "discovery_saved",
  "discovery_saved_pct",
  "limit_max_failures",
  "limit_max_per_viewport",
  "limit_max_per_state",
  "limit_max_copy",
  "limit_max_discovery",
  "attr_per_group_png",
  "attr_per_group_discovery",
  "attr_max_failures_png",
  "attr_max_failures_discovery",
  "attr_max_copy_png",
  "attr_max_discovery_readdir",
  "flag_max_failures",
  "flag_max_per_viewport",
  "flag_max_per_state",
  "flag_max_copy",
  "flag_max_discovery",
  "flag_no_history",
  "flag_history_path",
  "command",
  "node_version",
  "cwd_basename",
];

const loadTrendsHistory = async ({ historyRaw, noHistory, currentRun }) => {
  const historySentinelOff = ["off", "false", "none", "no", "0"];
  const historyDisabled =
    noHistory ||
    (historyRaw && historySentinelOff.includes(String(historyRaw).toLowerCase()));
  if (historyDisabled) return null;

  const historyPath = historyRaw
    ? path.isAbsolute(historyRaw)
      ? historyRaw
      : path.resolve(PROJECT_ROOT, historyRaw)
    : path.join(REPORT_DIR, "history.csv");

  let raw;
  try {
    raw = await fs.readFile(historyPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      // Pierwszy run — historii jeszcze nie ma. Pokażemy w UI sam current point
      // jako placeholder ("zbieramy dane").
      const points = [{
        ...currentRun,
        isCurrent: true,
        command: currentRun.command ?? "",
        flags: currentRun.flags ?? Object.fromEntries(TREND_FLAG_COLUMNS.map((n) => [n, ""])),
      }];
      return {
        source: path.relative(PROJECT_ROOT, historyPath),
        points,
        isFirstRun: true,
        flagColumns: TREND_FLAG_COLUMNS,
      };
    }
    console.warn(
      `[visual-snapshot-report] ⚠ Nie mogę odczytać ${path.relative(PROJECT_ROOT, historyPath)}: ${err.message}`,
    );
    return null;
  }

  // RFC 4180-aware split: history.csv może zawierać kolumny `command` /
  // `flag_history_path` z przecinkami i cudzysłowami (patrz csvEscape przy zapisie).
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  const header = splitCsvRow(lines[0]);
  const idxTime = header.indexOf("generatedAt");
  const idxPng = header.indexOf("png_saved_pct");
  const idxDisc = header.indexOf("discovery_saved_pct");
  if (idxTime < 0 || idxPng < 0 || idxDisc < 0) {
    console.warn(
      `[visual-snapshot-report] ⚠ ${path.relative(PROJECT_ROOT, historyPath)}: nagłówek bez ` +
        `generatedAt/png_saved_pct/discovery_saved_pct — pomijam wykres trendów.`,
    );
    return null;
  }
  const idxCommand = header.indexOf("command");
  // Mapa: nazwa flagi → indeks kolumny w history.csv (-1 gdy brak — starsze
  // pliki bez kolumn flag_*; takie wiersze dostaną pusty string i są filtrowalne
  // jako "(brak)" w UI).
  const flagIdx = Object.fromEntries(
    TREND_FLAG_COLUMNS.map((name) => [name, header.indexOf(name)]),
  );

  const points = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    const t = cols[idxTime];
    const png = Number.parseFloat(cols[idxPng]);
    const disc = Number.parseFloat(cols[idxDisc]);
    if (!t || !Number.isFinite(png) || !Number.isFinite(disc)) continue;
    const flags = {};
    for (const name of TREND_FLAG_COLUMNS) {
      const idx = flagIdx[name];
      flags[name] = idx >= 0 ? (cols[idx] ?? "") : "";
    }
    points.push({
      generatedAt: t,
      png,
      discovery: disc,
      isCurrent: false,
      command: idxCommand >= 0 ? (cols[idxCommand] ?? "") : "",
      flags,
    });
  }
  // Dodaj bieżący run jako ostatnia kropka (nie ma go jeszcze w CSV).
  // currentRun.command + currentRun.flags pochodzą z głównego flow (te same
  // wartości, które za chwilę pójdą do append history.csv).
  points.push({
    ...currentRun,
    isCurrent: true,
    command: currentRun.command ?? "",
    flags: currentRun.flags ?? Object.fromEntries(TREND_FLAG_COLUMNS.map((n) => [n, ""])),
  });

  // Limit: ostatnie 50 punktów, żeby SVG nie eksplodowało.
  const limited = points.slice(-50);
  return {
    source: path.relative(PROJECT_ROOT, historyPath),
    points: limited,
    totalPoints: points.length,
    truncated: points.length > limited.length,
    isFirstRun: false,
    flagColumns: TREND_FLAG_COLUMNS,
  };
};


const renderHtml = ({
  trios,
  generatedAt,
  totalFailures,
  playwrightReportRel,
  truncation,
  copyTruncation,
  discoveryTruncation,
  trends,
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

  // ---- Sekcja "Trendy oszczędności" (sparkline'y na bazie history.csv) ----
  // Renderujemy DWA inline SVG (png_saved_pct, discovery_saved_pct) z polyline
  // + ostatnia kropka oznaczona "now". Brak zewnętrznych zależności (Chart.js
  // itp.) — raport ma być samowystarczalny i otwierany z file://.
  // Skala Y: zawsze 0-100% (saved_pct), więc kropka 95% jest "wysoko" =
  // dużo oszczędzonego IO, kropka 0% = pełny baseline.
  const trendsSection = (() => {
    if (!trends || !trends.points || trends.points.length === 0) return "";
    const points = trends.points;
    const W = 560; // viewBox width
    const H = 80;  // viewBox height
    const PAD_L = 32; // miejsce na oś Y (0%/100% labels)
    const PAD_R = 12;
    const PAD_T = 8;
    const PAD_B = 16; // miejsce na axis labels (first/last timestamp)
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    // X: równomierne rozmieszczenie (index, NIE czas — gęsto pakowane runy
    // czasowo i tak wyglądałyby liniowo; index pokazuje kolejność a nie odstępy).
    // Y: 0% na dole, 100% na górze.
    const xFor = (i, n) =>
      n === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (n - 1)) * innerW;
    const yFor = (pct) => PAD_T + (1 - Math.max(0, Math.min(100, pct)) / 100) * innerH;

    const buildSpark = (key, color, label) => {
      const polyline = points
        .map((p, i) => `${xFor(i, points.length).toFixed(1)},${yFor(p[key]).toFixed(1)}`)
        .join(" ");
      const dots = points
        .map((p, i) => {
          const cx = xFor(i, points.length).toFixed(1);
          const cy = yFor(p[key]).toFixed(1);
          const isCurrent = p.isCurrent;
          const r = isCurrent ? 4 : 2.2;
          const cls = isCurrent ? "trend-dot trend-dot-current" : "trend-dot";
          // Tooltip natywny <title> — bez JS, zero deps.
          const ts = (p.generatedAt || "").replace("T", " ").replace(/\.\d+Z$/, "Z");
          return `<circle cx="${cx}" cy="${cy}" r="${r}" class="${cls}" fill="${color}"><title>${escapeHtml(ts)} — ${p[key].toFixed(1)}%${isCurrent ? " (this run)" : ""}</title></circle>`;
        })
        .join("");
      const last = points[points.length - 1][key];
      const first = points[0].generatedAt
        ? points[0].generatedAt.slice(0, 10)
        : "";
      const lastTs = points[points.length - 1].generatedAt
        ? points[points.length - 1].generatedAt.slice(0, 10)
        : "now";
      // data-spark="<key>" + data-color="<hex>" — JS filtra używa tych atrybutów,
      // żeby przerysować <g class="trend-series"> bez zmiany innych elementów SVG.
      return `
        <figure class="trend-chart" data-spark="${escapeHtml(key)}" data-color="${escapeHtml(color)}">
          <figcaption>${escapeHtml(label)} <span class="trend-current" data-trend-current>${last.toFixed(1)}%</span></figcaption>
          <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(label)} trend (${points.length} runów)" data-trend-svg data-w="${W}" data-h="${H}" data-pad-l="${PAD_L}" data-pad-r="${PAD_R}" data-pad-t="${PAD_T}" data-pad-b="${PAD_B}">
            <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${H - PAD_B}" class="trend-axis" />
            <line x1="${PAD_L}" y1="${H - PAD_B}" x2="${W - PAD_R}" y2="${H - PAD_B}" class="trend-axis" />
            <text x="${PAD_L - 4}" y="${PAD_T + 4}" text-anchor="end" class="trend-axis-label">100%</text>
            <text x="${PAD_L - 4}" y="${H - PAD_B}" text-anchor="end" class="trend-axis-label">0%</text>
            <text x="${PAD_L}" y="${H - 2}" text-anchor="start" class="trend-axis-label" data-trend-first>${escapeHtml(first)}</text>
            <text x="${W - PAD_R}" y="${H - 2}" text-anchor="end" class="trend-axis-label" data-trend-last>${escapeHtml(lastTs)}</text>
            <g class="trend-series" data-trend-series>
              ${points.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="1.5" />` : ""}
              ${dots}
            </g>
          </svg>
        </figure>`;
    };

    const note = trends.isFirstRun
      ? `<p class="trend-note">📈 Pierwszy run — historia zacznie się zbierać od następnego uruchomienia (<code>${escapeHtml(trends.source)}</code>).</p>`
      : `<p class="trend-note">📈 <span data-trend-count>${points.length} ${points.length === 1 ? "run" : "runów"}${trends.truncated ? ` (z ${trends.totalPoints}, pokazano ostatnie 50)` : ""}</span> z <code>${escapeHtml(trends.source)}</code>. Ostatnia kropka = ten run.</p>`;

    // ---- Filtr trendów: command + flag_* ----
    // Selecty są budowane z unikalnych wartości w `points` (po stronie klienta,
    // żeby JSON był source of truth). Etykieta "(brak)" oznacza wiersz z pustą
    // wartością — np. starsze history.csv bez kolumn flag_*.
    const flagLabels = {
      flag_max_failures: "max-failures",
      flag_max_per_viewport: "max-per-viewport",
      flag_max_per_state: "max-per-state",
      flag_max_copy: "max-copy",
      flag_max_discovery: "max-discovery",
      flag_no_history: "no-history",
      flag_history_path: "history-path",
    };
    const flagCols = trends.flagColumns || [];
    const flagSelects = flagCols
      .map((name) => `
          <label class="trends-filter-label">
            ${escapeHtml(flagLabels[name] || name)}
            <select class="trends-filter-select" data-trend-filter="${escapeHtml(name)}">
              <option value="">(wszystkie)</option>
            </select>
          </label>`)
      .join("");

    const filterBar = `
      <div class="trends-filter" role="group" aria-label="Filtry trendów">
        <label class="trends-filter-label">
          command
          <select class="trends-filter-select trends-filter-command" data-trend-filter="command">
            <option value="">(wszystkie)</option>
          </select>
        </label>
        ${flagSelects}
        <button type="button" class="trends-filter-reset" data-trend-reset>Resetuj</button>
        <label class="trends-filter-label trends-filter-export-mode" title="Skrócony: tylko kolumny obecne w wykresach. Pełny schemat: wszystkie kolumny savings.csv (puste tam, gdzie raport nie ma danych).">
          tryb eksportu
          <select class="trends-filter-select" data-trend-export-mode>
            <option value="subset" selected>Skrócony</option>
            <option value="full">Pełny schemat</option>
          </select>
        </label>
        <label class="trends-filter-label trends-filter-export-format" title="CSV: jeden plik. ZIP: spakowane CSV + metadata.json (deterministyczny). ZIP (split): osobne pliki png-saved.csv i discovery-saved.csv obok pełnego CSV — wygodne do narzędzi single-series.">
          format
          <select class="trends-filter-select" data-trend-export-format>
            <option value="csv" selected>CSV</option>
            <option value="zip">ZIP (CSV + metadata)</option>
            <option value="zip-split">ZIP split (PNG/discovery)</option>
          </select>
        </label>
        <label class="trends-filter-label trends-filter-zip-threshold" title="Powyżej tego progu (liczba przefiltrowanych wierszy) eksport zachowa się zgodnie z wybranym trybem poniżej. 0 = wyłącz.">
          próg ZIP (wiersze)
          <input type="number" class="trends-filter-input" data-trend-zip-threshold min="0" step="50" value="200" inputmode="numeric" style="max-width:88px" />
        </label>
        <label class="trends-filter-label trends-filter-zip-mode" title="Sugeruj: tylko podpowiedź w pasku statusu (CSV zostaje). Przełącz: jeśli format to CSV, automatycznie zmień na ZIP przed pobraniem (zapisuje wybór). Ignoruj: nic nie rób.">
          po przekroczeniu
          <select class="trends-filter-select" data-trend-zip-mode>
            <option value="suggest" selected>Sugeruj ZIP</option>
            <option value="switch">Przełącz na ZIP</option>
            <option value="off">Ignoruj próg</option>
          </select>
        </label>
        <button type="button" class="trends-filter-export" data-trend-export title="Pokaż podgląd 20 pierwszych wierszy, potem pobierz przefiltrowane runy w wybranym formacie">⬇ Podgląd i eksport…</button>
        <button type="button" class="trends-filter-copy-name" data-trend-copy-name title="Skopiuj do schowka nazwę paczki eksportu (timestamp + skrót filtra), żeby łatwo nazwać/posortować pobrane pliki.">⧉ Kopiuj nazwę</button>
        <span class="trends-filter-export-status" data-trend-export-status role="status" aria-live="polite"></span>
        <span class="trends-filter-zip-hint" data-trend-zip-hint role="status" aria-live="polite" hidden></span>
      </div>
      <div class="trends-filter-name-preview" data-trend-name-preview hidden>
        <span class="trends-filter-name-preview-label" aria-hidden="true">📦 Nazwa paczki:</span>
        <code class="trends-filter-name-preview-value" data-trend-name-preview-value tabindex="0" role="textbox" aria-readonly="true" aria-label="Aktualnie wyliczona nazwa paczki eksportu — kliknij, aby skopiować."></code>
        <span class="trends-filter-name-preview-meta" data-trend-name-preview-meta></span>
      </div>
      <details class="trends-filter-history" data-trend-history-wrap hidden>
        <summary class="trends-filter-history-summary">
          <span class="trends-filter-history-icon" aria-hidden="true">🕘</span>
          Ostatnie nazwy eksportu
          <span class="trends-filter-history-count" data-trend-history-count></span>
          <button type="button" class="trends-filter-history-clear" data-trend-history-clear title="Wyczyść historię nazw eksportu (lokalnie, w tej przeglądarce).">Wyczyść</button>
        </summary>
        <ul class="trends-filter-history-list" data-trend-history-list role="list"></ul>
      </details>`;

    // Embed pełnych danych (z command/flags) jako JSON. Klient czyta ten blok
    // przez document.getElementById, NIE eval — zero ryzyka XSS (escapujemy </).
    const jsonPayload = JSON.stringify({
      points,
      flagColumns: flagCols,
      flagLabels,
      // Pełna kanoniczna lista kolumn `savings.csv` — używana przez tryb
      // eksportu „Pełny schemat" (puste stringi dla pól, których embedded
      // payload nie zawiera, np. trio_*/png_baseline/attribution_*).
      fullSchemaColumns: SAVINGS_CSV_COLUMNS,
    }).replace(/</g, "\\u003c");

    return `
    <section class="trends" aria-label="Trendy oszczędności IO między runami" data-trends-root>
      <h2 class="trends-title">Trendy oszczędności IO</h2>
      ${note}
      ${filterBar}
      <details class="trends-combos" data-trends-combos>
        <summary>Unikalne kombinacje <code>command</code> + <code>flag_*</code> <span class="trends-combos-count" data-trends-combos-count></span></summary>
        <p class="trends-combos-hint">Kliknij wiersz, żeby ustawić selecty filtra na tę dokładnie kombinację. Sortowanie: malejąco po liczbie runów.</p>
        <div class="trends-combos-scroll">
          <table class="trends-combos-table" data-trends-combos-table>
            <thead><tr data-trends-combos-head></tr></thead>
            <tbody data-trends-combos-body></tbody>
          </table>
        </div>
      </details>
      <p class="trends-empty" data-trends-empty hidden>Żaden run nie pasuje do filtra. Wyczyść, żeby zobaczyć wszystkie.</p>
      <div class="trends-grid">
        ${buildSpark("png", "#c9a84c", "PNG copy saved %")}
        ${buildSpark("discovery", "#8ab4f8", "Discovery readdir saved %")}
      </div>
      <script type="application/json" id="trends-json">${jsonPayload}</script>
      <dialog class="export-preview-dialog" data-export-preview-dialog aria-labelledby="export-preview-title">
        <div class="export-preview-header">
          <h3 id="export-preview-title">Podgląd eksportu</h3>
          <p class="export-preview-meta" data-export-preview-meta></p>
          <div class="export-preview-filename" data-export-preview-filename hidden>
            <span class="export-preview-filename-label" aria-hidden="true">📦 Plik:</span>
            <code class="export-preview-filename-value" data-export-preview-filename-value tabindex="0" role="textbox" aria-readonly="true" aria-label="Nazwa pliku, który zostanie pobrany — kliknij, aby skopiować."></code>
            <button type="button" class="export-preview-filename-copy" data-export-preview-filename-copy title="Skopiuj nazwę pliku do schowka. Identyczna z wynikiem przycisku „⧉ Kopiuj nazwę".">⧉</button>
            <span class="export-preview-filename-match" data-export-preview-filename-match hidden></span>
          </div>
        </div>
        <div class="export-preview-body">
          <table class="export-preview-table" data-export-preview-table>
            <thead><tr data-export-preview-head></tr></thead>
            <tbody data-export-preview-body></tbody>
          </table>
          <p class="export-preview-truncated" data-export-preview-truncated hidden></p>
        </div>
        <div class="export-preview-footer">
          <span class="spacer" aria-hidden="true"></span>
          <button type="button" class="export-preview-cancel" data-export-preview-cancel>Anuluj</button>
          <button type="button" class="export-preview-confirm" data-export-preview-confirm>⬇ Pobierz CSV</button>
        </div>
      </dialog>
    </section>`;
  })();

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
          // Mapowanie reason → human-readable badge. Każdy powód ma własny
          // kolor (CSS class), żeby user szybko odróżnił "globalny limit"
          // od "ta grupa miała za dużo regresji".
          const reasonBadge = (o) => {
            if (o.reason === "viewport") {
              return `<span class="reason-badge reason-viewport" title="Limit per viewport: ${o.limit}">viewport &gt; ${escapeHtml(String(o.limit))}</span>`;
            }
            if (o.reason === "state") {
              return `<span class="reason-badge reason-state" title="Limit per state: ${o.limit}">state &gt; ${escapeHtml(String(o.limit))}</span>`;
            }
            return `<span class="reason-badge reason-global" title="Globalny limit --max-failures: ${o.limit}">--max-failures</span>`;
          };
          const rows = truncation.omitted
            .map(
              (o) => `
              <tr>
                <td>${reasonBadge(o)}</td>
                <td><code>${escapeHtml(o.stem)}</code></td>
                <td>${escapeHtml(o.viewport)}</td>
                <td>${escapeHtml(o.state)}</td>
                <td class="omitted-testname">${escapeHtml(o.testName)}</td>
              </tr>`,
            )
            .join("");
          // Składamy nagłówek opisujący WSZYSTKIE aktywne limity.
          const limitsParts = [];
          if (truncation.perViewportLimit !== null) {
            limitsParts.push(`<code>--max-failures-per-viewport=${truncation.perViewportLimit}</code>`);
          }
          if (truncation.perStateLimit !== null) {
            limitsParts.push(`<code>--max-failures-per-state=${truncation.perStateLimit}</code>`);
          }
          if (truncation.limit !== null) {
            limitsParts.push(`<code>--max-failures=${truncation.limit}</code>`);
          }
          const limitsLabel = limitsParts.length > 0 ? limitsParts.join(" + ") : "limity";
          return `
            <details class="omitted-section" open>
              <summary>
                <span class="omitted-summary-label">
                  📋 Pominięte przez ${limitsLabel}:
                  <strong>${truncation.omitted.length}</strong> trio
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
                      <th>Powód</th>
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
                Wskazówka: zwiększ odpowiedni limit (per-grupa lub globalny) albo wyłącz go
                całkowicie, żeby zobaczyć karty z obrazami dla powyższych trio.
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
    /* Badge dla kolumny "Powód" w tabeli omitted — odrębne kolory per typ
       limitu pomagają wzrokowo zgrupować "ten viewport ma za dużo regresji". */
    .reason-badge {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.3px; white-space: nowrap;
    }
    .reason-viewport { background: rgba(79,195,247,.18); color: var(--accent); }
    .reason-state    { background: rgba(255,167,38,.18); color: var(--warn); }
    .reason-global   { background: rgba(239,83,80,.15); color: var(--danger); }
    /* Placeholder dla figure gdy --max-copy obciął kopiowanie — bardziej
       neutralny niż czerwony "missing", żeby user nie myślał że to błąd. */
    .missing-copy-skipped .missing-box {
      background: rgba(127,127,127,.08);
      border-style: dashed;
    }
    /* ---- Trends (sparkline) ---- */
    .trends {
      margin: 1.5rem 0;
      padding: 1rem 1.25rem;
      border: 1px solid rgba(127,127,127,.2);
      border-radius: 8px;
      background: rgba(127,127,127,.04);
    }
    .trends-title { margin: 0 0 .25rem; font-size: 1rem; }
    .trend-note { margin: 0 0 .75rem; font-size: .85rem; opacity: .8; }
    .trend-note code { font-size: .8rem; padding: 1px 4px; border-radius: 3px; background: rgba(127,127,127,.12); }
    .trends-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .trend-chart { margin: 0; }
    .trend-chart figcaption {
      font-size: .85rem;
      margin-bottom: .25rem;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .trend-current { font-weight: 600; font-variant-numeric: tabular-nums; }
    .trend-chart svg { width: 100%; height: auto; display: block; }
    .trend-axis { stroke: rgba(127,127,127,.4); stroke-width: 0.5; }
    .trend-axis-label { font-size: 8px; fill: currentColor; opacity: .55; font-family: ui-monospace, monospace; }
    .trend-dot { stroke: none; opacity: .85; }
    .trend-dot-current { stroke: #fff; stroke-width: 1.2; opacity: 1; }
    @media (prefers-color-scheme: dark) {
      .trend-dot-current { stroke: #1a1a1a; }
    }
    .trends-filter {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem .75rem;
      align-items: flex-end;
      margin: 0 0 .75rem;
      padding: .5rem .75rem;
      border: 1px dashed rgba(127,127,127,.25);
      border-radius: 6px;
      background: rgba(127,127,127,.03);
    }
    .trends-filter-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: .75rem;
      opacity: .85;
      font-family: ui-monospace, monospace;
    }
    .trends-filter-select {
      font-size: .8rem;
      padding: 2px 4px;
      max-width: 220px;
      background: inherit;
      color: inherit;
      border: 1px solid rgba(127,127,127,.35);
      border-radius: 4px;
    }
    .trends-filter-input {
      font: inherit;
      font-size: .8rem;
      padding: 2px 4px;
      background: inherit;
      color: inherit;
      border: 1px solid rgba(127,127,127,.35);
      border-radius: 4px;
    }
    .trends-filter-zip-hint {
      font-size: .75rem;
      opacity: .85;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(201,168,76,.14);
      color: inherit;
      align-self: center;
    }
    .trends-filter-command { max-width: 320px; }
    .trends-filter-reset {
      font-size: .75rem;
      padding: 4px 10px;
      background: rgba(127,127,127,.12);
      color: inherit;
      border: 1px solid rgba(127,127,127,.3);
      border-radius: 4px;
      cursor: pointer;
      align-self: end;
    }
    .trends-filter-reset:hover { background: rgba(127,127,127,.22); }
    .trends-filter-export {
      font-size: .75rem;
      padding: 4px 10px;
      background: rgba(201,168,76,.14);
      color: inherit;
      border: 1px solid rgba(201,168,76,.45);
      border-radius: 4px;
      cursor: pointer;
      align-self: end;
    }
    .trends-filter-export:hover { background: rgba(201,168,76,.28); }
    .trends-filter-export:disabled { opacity: .45; cursor: not-allowed; }
    .trends-filter-copy-name {
      font-size: .72rem;
      padding: 4px 8px;
      background: rgba(127,127,127,.12);
      color: inherit;
      border: 1px solid rgba(127,127,127,.4);
      border-radius: 4px;
      cursor: pointer;
      align-self: end;
    }
    .trends-filter-copy-name:hover { background: rgba(127,127,127,.22); }
    .trends-filter-copy-name.is-copied {
      background: rgba(120,180,120,.22);
      border-color: rgba(120,180,120,.55);
    }
    .trends-filter-export-status {
      font-size: .72rem;
      opacity: .75;
      align-self: end;
      padding-bottom: 6px;
      min-height: 1em;
    }
    /* ---- Historia ostatnich nazw eksportu ---- */
    .trends-filter-history {
      margin-top: 6px;
      font-size: .72rem;
      border: 1px dashed rgba(127,127,127,.35);
      border-radius: 6px;
      padding: 4px 10px;
      background: rgba(127,127,127,.05);
    }
    .trends-filter-history[open] { background: rgba(127,127,127,.10); }
    .trends-filter-history-summary {
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      user-select: none;
    }
    .trends-filter-history-summary::-webkit-details-marker { display: none; }
    .trends-filter-history-icon { opacity: .8; }
    .trends-filter-history-count {
      opacity: .65;
      font-variant-numeric: tabular-nums;
    }
    .trends-filter-history-clear {
      margin-left: auto;
      font-size: .68rem;
      padding: 2px 8px;
      background: transparent;
      color: inherit;
      border: 1px solid rgba(127,127,127,.4);
      border-radius: 4px;
      cursor: pointer;
    }
    .trends-filter-history-clear:hover { background: rgba(127,127,127,.18); }
    .trends-filter-history-list {
      list-style: none;
      margin: 6px 0 4px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
      max-height: 220px;
      overflow-y: auto;
    }
    .trends-filter-history-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .trends-filter-history-btn {
      flex: 1 1 auto;
      text-align: left;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: .70rem;
      padding: 3px 8px;
      background: rgba(0,0,0,.18);
      color: inherit;
      border: 1px solid rgba(127,127,127,.3);
      border-radius: 4px;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .trends-filter-history-btn:hover {
      background: rgba(201,168,76,.18);
      border-color: rgba(201,168,76,.45);
    }
    .trends-filter-history-btn.is-copied {
      background: rgba(120,180,120,.22);
      border-color: rgba(120,180,120,.55);
    }
    .trends-filter-history-meta {
      flex: 0 0 auto;
      opacity: .55;
      font-variant-numeric: tabular-nums;
      font-size: .66rem;
    }
    /* ---- Live preview wyliczonej nazwy paczki ---- */
    .trends-filter-name-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 6px;
      padding: 6px 10px;
      font-size: .72rem;
      border: 1px solid rgba(201,168,76,.35);
      border-radius: 6px;
      background: rgba(201,168,76,.06);
    }
    .trends-filter-name-preview-label {
      flex: 0 0 auto;
      opacity: .85;
      font-weight: 500;
    }
    .trends-filter-name-preview-value {
      flex: 1 1 auto;
      min-width: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: .70rem;
      padding: 3px 8px;
      background: rgba(0,0,0,.25);
      border: 1px solid rgba(127,127,127,.3);
      border-radius: 4px;
      color: rgba(201,168,76,.95);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      user-select: all;
      transition: background .15s, border-color .15s;
    }
    .trends-filter-name-preview-value:hover {
      background: rgba(201,168,76,.16);
      border-color: rgba(201,168,76,.55);
    }
    .trends-filter-name-preview-value:focus-visible {
      outline: 2px solid rgba(201,168,76,.7);
      outline-offset: 1px;
    }
    .trends-filter-name-preview-value.is-copied {
      background: rgba(120,180,120,.22);
      border-color: rgba(120,180,120,.55);
      color: rgba(180,230,180,.95);
    }
    .trends-filter-name-preview-meta {
      flex: 0 0 auto;
      opacity: .55;
      font-variant-numeric: tabular-nums;
      font-size: .66rem;
    }
    /* ---- Dialog podglądu eksportu ---- */
    .export-preview-dialog {
      max-width: min(960px, 95vw);
      width: 95vw;
      border: 1px solid rgba(201,168,76,.45);
      border-radius: 10px;
      background: #1b1b1f;
      color: #e8e8e8;
      padding: 0;
      box-shadow: 0 30px 80px rgba(0,0,0,.5);
    }
    .export-preview-dialog::backdrop { background: rgba(0,0,0,.55); }
    .export-preview-header {
      padding: 14px 18px 8px;
      border-bottom: 1px solid rgba(127,127,127,.25);
    }
    .export-preview-header h3 {
      margin: 0 0 4px;
      font-size: 1rem;
      color: #c9a84c;
    }
    .export-preview-meta {
      font-size: .75rem;
      opacity: .8;
      font-family: ui-monospace, monospace;
    }
    .export-preview-filename {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
      padding: 6px 10px;
      font-size: .72rem;
      border: 1px solid rgba(201,168,76,.45);
      border-radius: 6px;
      background: rgba(201,168,76,.08);
    }
    .export-preview-filename-label {
      flex: 0 0 auto;
      opacity: .85;
      font-weight: 500;
    }
    .export-preview-filename-value {
      flex: 1 1 auto;
      min-width: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: .70rem;
      padding: 3px 8px;
      background: rgba(0,0,0,.30);
      border: 1px solid rgba(127,127,127,.35);
      border-radius: 4px;
      color: rgba(201,168,76,.95);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      user-select: all;
    }
    .export-preview-filename-value:hover {
      background: rgba(201,168,76,.18);
      border-color: rgba(201,168,76,.55);
    }
    .export-preview-filename-value:focus-visible {
      outline: 2px solid rgba(201,168,76,.7);
      outline-offset: 1px;
    }
    .export-preview-filename-value.is-copied {
      background: rgba(120,180,120,.22);
      border-color: rgba(120,180,120,.55);
    }
    .export-preview-filename-copy {
      flex: 0 0 auto;
      font-size: .70rem;
      padding: 3px 8px;
      background: rgba(127,127,127,.15);
      color: inherit;
      border: 1px solid rgba(127,127,127,.4);
      border-radius: 4px;
      cursor: pointer;
    }
    .export-preview-filename-copy:hover { background: rgba(201,168,76,.22); border-color: rgba(201,168,76,.55); }
    .export-preview-filename-copy.is-copied {
      background: rgba(120,180,120,.25);
      border-color: rgba(120,180,120,.55);
    }
    .export-preview-filename-match {
      flex: 0 0 auto;
      font-size: .66rem;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .export-preview-filename-match.is-match {
      background: rgba(120,180,120,.20);
      color: rgba(180,230,180,.95);
    }
    .export-preview-filename-match.is-mismatch {
      background: rgba(220,120,120,.22);
      color: rgba(245,180,180,.95);
    }
    .export-preview-body {
      padding: 8px 18px 4px;
      max-height: 55vh;
      overflow: auto;
    }
    .export-preview-table {
      width: 100%;
      border-collapse: collapse;
      font-family: ui-monospace, monospace;
      font-size: .72rem;
    }
    .export-preview-table th,
    .export-preview-table td {
      border: 1px solid rgba(127,127,127,.22);
      padding: 3px 6px;
      text-align: left;
      white-space: nowrap;
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .export-preview-table th {
      position: sticky;
      top: 0;
      background: #25252b;
      z-index: 1;
    }
    .export-preview-table td.is-empty { opacity: .35; font-style: italic; }
    .export-preview-table tr:nth-child(even) td { background: rgba(127,127,127,.05); }
    .export-preview-truncated {
      font-size: .72rem;
      opacity: .75;
      padding: 6px 0 0;
      font-style: italic;
    }
    .export-preview-footer {
      padding: 10px 18px 14px;
      border-top: 1px solid rgba(127,127,127,.25);
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
    }
    .export-preview-footer .spacer { flex: 1; }
    .export-preview-cancel,
    .export-preview-confirm {
      font-size: .8rem;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
    }
    .export-preview-cancel {
      background: rgba(127,127,127,.15);
      color: inherit;
      border: 1px solid rgba(127,127,127,.35);
    }
    .export-preview-cancel:hover { background: rgba(127,127,127,.25); }
    .export-preview-confirm {
      background: rgba(201,168,76,.22);
      color: #f4dfa3;
      border: 1px solid rgba(201,168,76,.6);
      font-weight: 600;
    }
    .export-preview-confirm:hover { background: rgba(201,168,76,.36); }
    .trends-empty {
      margin: .25rem 0 .75rem;
      font-size: .85rem;
      opacity: .8;
      font-style: italic;
    }
    .trends-combos {
      margin: 0 0 .75rem;
      padding: .25rem .5rem;
      border: 1px solid rgba(127,127,127,.2);
      border-radius: 6px;
      background: rgba(127,127,127,.03);
    }
    .trends-combos > summary {
      cursor: pointer;
      font-size: .85rem;
      padding: .25rem;
      user-select: none;
    }
    .trends-combos > summary code {
      font-size: .8rem;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(127,127,127,.12);
    }
    .trends-combos-count {
      opacity: .65;
      font-family: ui-monospace, monospace;
      font-size: .8rem;
      margin-left: .25rem;
    }
    .trends-combos-hint {
      margin: .25rem .25rem .5rem;
      font-size: .78rem;
      opacity: .75;
    }
    .trends-combos-scroll {
      max-height: 280px;
      overflow: auto;
      border-top: 1px solid rgba(127,127,127,.15);
    }
    .trends-combos-table {
      width: 100%;
      border-collapse: collapse;
      font-size: .78rem;
      font-family: ui-monospace, monospace;
    }
    .trends-combos-table th,
    .trends-combos-table td {
      padding: 4px 8px;
      text-align: left;
      border-bottom: 1px solid rgba(127,127,127,.12);
      white-space: nowrap;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .trends-combos-table th {
      position: sticky;
      top: 0;
      background: rgba(127,127,127,.08);
      backdrop-filter: blur(2px);
      font-weight: 600;
      opacity: .85;
    }
    .trends-combos-table tbody tr {
      cursor: pointer;
      transition: background .12s ease;
    }
    .trends-combos-table tbody tr:hover {
      background: rgba(201, 168, 76, .12);
    }
    .trends-combos-table tbody tr.is-active {
      background: rgba(201, 168, 76, .22);
      box-shadow: inset 3px 0 0 #c9a84c;
    }
    .trends-combos-table td.col-count {
      text-align: right;
      font-variant-numeric: tabular-nums;
      opacity: .8;
    }
    .trends-combos-table td.is-empty {
      opacity: .45;
      font-style: italic;
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
  ${trendsSection}
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

  // ---- Trendy: filtrowanie wykresów po command + flag_* ----
  // Stan filtra: w-pamięci + URL (?trend_<key>=<value>) + localStorage,
  // żeby udostępniony link / refresh zachowywał wybór. SVG re-rysuje się w JS:
  // wymieniamy tylko zawartość <g data-trend-series>, oś + label timestamps
  // aktualizujemy in-place. Brak danych → empty-state z hintem o resetcie.
  (function () {
    var root = document.querySelector("[data-trends-root]");
    var jsonNode = document.getElementById("trends-json");
    if (!root || !jsonNode) return;
    var data;
    try { data = JSON.parse(jsonNode.textContent || "{}"); }
    catch (e) { return; }
    var allPoints = (data && data.points) || [];
    var flagCols = (data && data.flagColumns) || [];
    var flagLabels = (data && data.flagLabels) || {};
    if (!allPoints.length) return;

    var STORAGE_KEY = "visual-report-trends-filter-v1";
    var URL_PREFIX = "trend_"; // np. ?trend_command=...&trend_flag_max_copy=200
    var selects = Array.prototype.slice.call(root.querySelectorAll("[data-trend-filter]"));
    var resetBtn = root.querySelector("[data-trend-reset]");
    var emptyEl = root.querySelector("[data-trends-empty]");
    var sparks = Array.prototype.slice.call(root.querySelectorAll("[data-spark]"));
    var countEl = root.querySelector("[data-trend-count]");
    var SVG_NS = "http://www.w3.org/2000/svg";

    // Etykieta "(brak)" dla pustych wartości — dystyngwuje "explicit empty"
    // od "wszystkie" w UI. Internal value pozostaje "" (URL-friendly).
    var EMPTY_LABEL = "(brak)";

    function valueOf(p, key) {
      if (key === "command") return p.command || "";
      return (p.flags && p.flags[key]) || "";
    }
    function uniqueValues(key) {
      var seen = Object.create(null);
      var out = [];
      for (var i = 0; i < allPoints.length; i++) {
        var v = valueOf(allPoints[i], key);
        if (!seen[v]) { seen[v] = true; out.push(v); }
      }
      // Sort: niepuste alfabetycznie, "" na końcu (jako "(brak)").
      out.sort(function (a, b) {
        if (a === "" && b !== "") return 1;
        if (b === "" && a !== "") return -1;
        return a < b ? -1 : a > b ? 1 : 0;
      });
      return out;
    }

    // Wypełnij selecty unikalnymi wartościami (zachowując "(wszystkie)" jako pierwszy).
    selects.forEach(function (sel) {
      var key = sel.getAttribute("data-trend-filter");
      var values = uniqueValues(key);
      values.forEach(function (v) {
        var opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v === "" ? EMPTY_LABEL : v;
        sel.appendChild(opt);
      });
    });

    // ---- Tabela unikalnych kombinacji command + flag_* ----
    // Grupujemy wszystkie wiersze historii po krotce (command, flag_*) — każdy
    // unikalny zestaw to jedno potencjalne "preset" filtra. Kliknięcie wiersza
    // ustawia selecty na DOKŁADNIE tę kombinację (single-select per kolumna),
    // dzięki czemu user nie musi ręcznie zgadywać, jakie wartości wystąpiły razem.
    var filterKeys = selects.map(function (sel) { return sel.getAttribute("data-trend-filter"); });
    var combosBody = root.querySelector("[data-trends-combos-body]");
    var combosHead = root.querySelector("[data-trends-combos-head]");
    var combosCount = root.querySelector("[data-trends-combos-count]");
    var combosRows = [];
    if (combosBody && combosHead) {
      // Header: count + każda kolumna filtrująca (z czytelną etykietą).
      var headHtml = '<th scope="col" class="col-count">runów</th>';
      filterKeys.forEach(function (key) {
        var label = key === "command" ? "command" : (flagLabels[key] || key);
        headHtml += '<th scope="col">' + label + '</th>';
      });
      combosHead.innerHTML = headHtml;

      // Grupowanie: klucz = JSON.stringify wartości w kolejności filterKeys.
      // JSON.stringify jest deterministyczny dla tablic stringów — bezpieczne.
      var groups = Object.create(null);
      allPoints.forEach(function (p) {
        var values = filterKeys.map(function (k) { return valueOf(p, k); });
        var key = JSON.stringify(values);
        if (!groups[key]) groups[key] = { values: values, count: 0 };
        groups[key].count++;
      });
      combosRows = Object.keys(groups).map(function (k) { return groups[k]; });
      // Sort: malejąco po count, potem alfabetycznie po command (stabilizator
      // dla deterministycznej kolejności w UI / testach wizualnych).
      combosRows.sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        var ai = filterKeys.indexOf("command");
        if (ai >= 0 && a.values[ai] !== b.values[ai]) {
          return a.values[ai] < b.values[ai] ? -1 : 1;
        }
        return 0;
      });

      // Render wierszy. Pusty string → "(brak)" + klasa is-empty (wizualne
      // odróżnienie od konkretnej wartości). Tytuł na <td> = pełna wartość
      // (na wypadek truncate'u przez ellipsis w wąskich kolumnach).
      var rowsHtml = combosRows.map(function (row, idx) {
        var cells = '<td class="col-count">' + row.count + '</td>';
        row.values.forEach(function (v) {
          var display = v === "" ? EMPTY_LABEL : v;
          var cls = v === "" ? "is-empty" : "";
          cells += '<td class="' + cls + '" title="' + display.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;") + '">' + display.replace(/&/g, "&amp;").replace(/</g, "&lt;") + '</td>';
        });
        return '<tr data-combo-idx="' + idx + '" tabindex="0" role="button" aria-label="Zastosuj kombinację (' + row.count + ' runów)">' + cells + '</tr>';
      }).join("");
      combosBody.innerHTML = rowsHtml;
      if (combosCount) combosCount.textContent = "(" + combosRows.length + ")";

      // Klik / Enter / Space na wierszu — ustaw selecty na wartości tej krotki
      // i zastosuj filtr. Po użyciu rozwijamy <details> (gdyby user kliknął
      // przez tab z klawiatury, gdy pasek był zwinięty).
      function applyCombo(row) {
        if (!row) return;
        filterKeys.forEach(function (key, i) {
          var sel = selects[i];
          if (!sel) return;
          var val = row.values[i] || "";
          // Tylko jeśli wartość istnieje w options (zawsze powinna, bo pochodzi
          // z tych samych danych); fallback do "" dla bezpieczeństwa.
          var found = Array.prototype.some.call(sel.options, function (o) { return o.value === val; });
          sel.value = found ? val : "";
        });
        apply();
      }
      combosBody.addEventListener("click", function (e) {
        var tr = e.target.closest("tr[data-combo-idx]");
        if (!tr) return;
        applyCombo(combosRows[parseInt(tr.getAttribute("data-combo-idx"), 10)]);
      });
      combosBody.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        var tr = e.target.closest("tr[data-combo-idx]");
        if (!tr) return;
        e.preventDefault();
        applyCombo(combosRows[parseInt(tr.getAttribute("data-combo-idx"), 10)]);
      });
    }
    function readUrl() {
      var p = new URLSearchParams(window.location.search);
      var s = {};
      selects.forEach(function (sel) {
        var key = sel.getAttribute("data-trend-filter");
        var v = p.get(URL_PREFIX + key);
        if (v !== null) s[key] = v;
      });
      return s;
    }
    function readStorage() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
      catch (e) { return {}; }
    }
    var initial = (function () {
      var u = readUrl();
      var s = readStorage();
      var out = {};
      selects.forEach(function (sel) {
        var key = sel.getAttribute("data-trend-filter");
        out[key] = (key in u) ? u[key] : (s[key] || "");
      });
      return out;
    })();
    selects.forEach(function (sel) {
      var key = sel.getAttribute("data-trend-filter");
      // Tylko jeśli wartość istnieje w options — inaczej fallback do "(wszystkie)".
      var val = initial[key] || "";
      var found = Array.prototype.some.call(sel.options, function (o) { return o.value === val; });
      sel.value = found ? val : "";
    });

    function persist(state) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
      var p = new URLSearchParams(window.location.search);
      Object.keys(state).forEach(function (key) {
        if (state[key]) p.set(URL_PREFIX + key, state[key]);
        else p.delete(URL_PREFIX + key);
      });
      var qs = p.toString();
      var url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
      window.history.replaceState(null, "", url);
    }

    function currentState() {
      var s = {};
      selects.forEach(function (sel) {
        s[sel.getAttribute("data-trend-filter")] = sel.value;
      });
      return s;
    }

    function filterPoints(state) {
      return allPoints.filter(function (p) {
        for (var i = 0; i < selects.length; i++) {
          var key = selects[i].getAttribute("data-trend-filter");
          var want = state[key];
          if (!want) continue;
          if (valueOf(p, key) !== want) return false;
        }
        return true;
      });
    }

    function clamp(n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; }

    function redrawSpark(figure, points) {
      var svg = figure.querySelector("[data-trend-svg]");
      var series = figure.querySelector("[data-trend-series]");
      var current = figure.querySelector("[data-trend-current]");
      var firstEl = figure.querySelector("[data-trend-first]");
      var lastEl = figure.querySelector("[data-trend-last]");
      if (!svg || !series) return;
      var key = figure.getAttribute("data-spark");
      var color = figure.getAttribute("data-color") || "#888";
      var W = parseFloat(svg.getAttribute("data-w"));
      var H = parseFloat(svg.getAttribute("data-h"));
      var PAD_L = parseFloat(svg.getAttribute("data-pad-l"));
      var PAD_R = parseFloat(svg.getAttribute("data-pad-r"));
      var PAD_T = parseFloat(svg.getAttribute("data-pad-t"));
      var PAD_B = parseFloat(svg.getAttribute("data-pad-b"));
      var innerW = W - PAD_L - PAD_R;
      var innerH = H - PAD_T - PAD_B;

      // Wyczyść stare kropki / polyline.
      while (series.firstChild) series.removeChild(series.firstChild);

      if (!points.length) {
        if (current) current.textContent = "—";
        if (firstEl) firstEl.textContent = "";
        if (lastEl) lastEl.textContent = "";
        return;
      }

      var n = points.length;
      function xFor(i) { return n === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (n - 1)) * innerW; }
      function yFor(pct) { return PAD_T + (1 - clamp(pct, 0, 100) / 100) * innerH; }

      if (n > 1) {
        var poly = document.createElementNS(SVG_NS, "polyline");
        poly.setAttribute("fill", "none");
        poly.setAttribute("stroke", color);
        poly.setAttribute("stroke-width", "1.5");
        var pts = points.map(function (p, i) {
          return xFor(i).toFixed(1) + "," + yFor(p[key]).toFixed(1);
        }).join(" ");
        poly.setAttribute("points", pts);
        series.appendChild(poly);
      }
      points.forEach(function (p, i) {
        var c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", xFor(i).toFixed(1));
        c.setAttribute("cy", yFor(p[key]).toFixed(1));
        c.setAttribute("r", p.isCurrent ? "4" : "2.2");
        c.setAttribute("class", p.isCurrent ? "trend-dot trend-dot-current" : "trend-dot");
        c.setAttribute("fill", color);
        var title = document.createElementNS(SVG_NS, "title");
        var ts = (p.generatedAt || "").replace("T", " ").replace(/\.\d+Z$/, "Z");
        title.textContent = ts + " — " + p[key].toFixed(1) + "%" + (p.isCurrent ? " (this run)" : "");
        c.appendChild(title);
        series.appendChild(c);
      });

      var last = points[n - 1][key];
      if (current) current.textContent = last.toFixed(1) + "%";
      if (firstEl) firstEl.textContent = (points[0].generatedAt || "").slice(0, 10);
      if (lastEl) lastEl.textContent = (points[n - 1].generatedAt || "now").slice(0, 10);
      svg.setAttribute("aria-label", (figure.querySelector("figcaption") || {}).textContent + " (" + n + " runów)");
    }

    function apply() {
      var state = currentState();
      persist(state);
      var pts = filterPoints(state);
      if (countEl) {
        countEl.textContent = pts.length + " z " + allPoints.length + " " + (allPoints.length === 1 ? "run" : "runów");
      }
      if (emptyEl) emptyEl.hidden = pts.length !== 0;
      sparks.forEach(function (fig) { redrawSpark(fig, pts); });
      // Highlight wiersza w tabeli kombinacji, który odpowiada AKTUALNEMU
      // stanowi selectów (wszystkie kolumny muszą się zgadzać). Brak highlightu
      // = stan nie pokrywa się z żadną pełną kombinacją (np. user wybrał tylko
      // command, a flag_max_copy zostawił "(wszystkie)").
      if (combosBody && combosRows.length) {
        var allSet = filterKeys.every(function (k) { return state[k]; });
        var activeIdx = -1;
        if (allSet) {
          for (var ci = 0; ci < combosRows.length; ci++) {
            var match = true;
            for (var fi = 0; fi < filterKeys.length; fi++) {
              if (combosRows[ci].values[fi] !== state[filterKeys[fi]]) { match = false; break; }
            }
            if (match) { activeIdx = ci; break; }
          }
        }
        var rows = combosBody.querySelectorAll("tr[data-combo-idx]");
        for (var ri = 0; ri < rows.length; ri++) {
          rows[ri].classList.toggle("is-active", parseInt(rows[ri].getAttribute("data-combo-idx"), 10) === activeIdx);
        }
      }
      if (typeof refreshZipHint === "function") refreshZipHint();
    }

    selects.forEach(function (sel) {
      sel.addEventListener("change", apply);
    });
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        selects.forEach(function (sel) { sel.value = ""; });
        apply();
      });
    }

    // ---- Eksport przefiltrowanych wierszy do CSV ----
    // Dwa tryby (kontrolowane selectem [data-trend-export-mode]):
    //
    //  • "subset" (domyślny) — kompaktowy wycinek: generatedAt + png_saved_pct +
    //    discovery_saved_pct + isCurrent + command + flag_*. Idealny do szybkiej
    //    analizy ad-hoc w arkuszu / DuckDB. Tylko kolumny faktycznie pokazywane
    //    w wykresach trendów.
    //
    //  • "full" — pełny schemat zgodny ze savings.csv / history.csv
    //    (SAVINGS_CSV_COLUMNS embedowane w trends-json jako fullSchemaColumns).
    //    Pola, których embedded payload NIE zawiera (trio_X, png_baseline,
    //    attribution_X, node_version, cwd_basename, isCurrent — bo nie ma
    //    odpowiednika w schemacie) są mapowane do pustego stringa, co zachowuje
    //    poprawną liczbę kolumn i ich kolejność. Dzięki temu można wkleić plik
    //    bezpośrednio jako append do history.csv lub załadować do narzędzia,
    //    które oczekuje stałego nagłówka (np. duckdb read_csv_auto z innymi
    //    plikami z tego samego runa).
    //
    // Nazwa pliku zawiera tryb + timestamp + skrócony hash filtrów, żeby kolejne
    // eksporty się nie nadpisywały. Zero deps — Blob + a[download].
    var exportBtn = root.querySelector("[data-trend-export]");
    var copyNameBtn = root.querySelector("[data-trend-copy-name]");
    var exportStatus = root.querySelector("[data-trend-export-status]");
    var exportModeSelect = root.querySelector("[data-trend-export-mode]");
    var exportFormatSelect = root.querySelector("[data-trend-export-format]");
    var zipThresholdInput = root.querySelector("[data-trend-zip-threshold]");
    var zipModeSelect = root.querySelector("[data-trend-zip-mode]");
    var zipHintEl = root.querySelector("[data-trend-zip-hint]");
    var historyWrap = root.querySelector("[data-trend-history-wrap]");
    var historyList = root.querySelector("[data-trend-history-list]");
    var historyCountEl = root.querySelector("[data-trend-history-count]");
    var historyClearBtn = root.querySelector("[data-trend-history-clear]");
    var ZIP_PREFS_KEY = "visual-report-zip-threshold-v1";
    var EXPORT_HISTORY_KEY = "visual-report-export-history-v1";
    var EXPORT_HISTORY_MAX = 10;
    // Persist progu i trybu w localStorage, żeby user nie ustawiał ich
    // przy każdym otwarciu raportu. Defensywnie: zły JSON / brak storage
    // → zostają wartości domyślne z atrybutów inputów (200 / "suggest").
    (function restoreZipPrefs() {
      try {
        var raw = localStorage.getItem(ZIP_PREFS_KEY);
        if (!raw) return;
        var saved = JSON.parse(raw);
        if (zipThresholdInput && typeof saved.threshold === "number" && saved.threshold >= 0) {
          zipThresholdInput.value = String(saved.threshold);
        }
        if (zipModeSelect && typeof saved.mode === "string"
            && /^(suggest|switch|off)$/.test(saved.mode)) {
          zipModeSelect.value = saved.mode;
        }
      } catch (_e) { /* noop */ }
    })();
    function persistZipPrefs() {
      try {
        localStorage.setItem(ZIP_PREFS_KEY, JSON.stringify({
          threshold: getZipThreshold(),
          mode: getZipMode(),
        }));
      } catch (_e) { /* noop */ }
    }
    function getZipThreshold() {
      if (!zipThresholdInput) return 0;
      var n = parseInt(zipThresholdInput.value, 10);
      if (!isFinite(n) || n < 0) return 0;
      return n;
    }
    function getZipMode() {
      return (zipModeSelect && zipModeSelect.value) || "suggest";
    }
    // Live hint pod paskiem eksportu — informuje, czy aktualnie wyfiltrowane
    // wiersze przekraczają próg i co się stanie po kliku „Pobierz".
    function refreshZipHint() {
      if (!zipHintEl) return;
      var th = getZipThreshold();
      var mode = getZipMode();
      var fmt = (exportFormatSelect && exportFormatSelect.value) || "csv";
      var count = filterPoints(currentState()).length;
      if (!th || mode === "off" || fmt !== "csv" || count < th) {
        zipHintEl.hidden = true;
        zipHintEl.textContent = "";
        return;
      }
      zipHintEl.hidden = false;
      zipHintEl.textContent = mode === "switch"
        ? "↪ " + count + " wierszy ≥ " + th + " — eksport automatycznie przejdzie na ZIP."
        : "ⓘ " + count + " wierszy ≥ " + th + " — rozważ format ZIP (mniejszy plik, manifest).";
    }

    // Live preview wyliczonej nazwy paczki — okienko pod przyciskiem
    // „⧉ Kopiuj nazwę". Aktualizuje się przy każdej zmianie filtra/trybu/
    // formatu/progu (jest dopinane w apply() pośrednio przez refreshZipHint
    // → refreshNamePreview, oraz przez listenery format/threshold/mode).
    // Klik w wartość kopiuje ją do schowka (równoważnik przycisku „Kopiuj
    // nazwę" — z animacją + wpisem do historii). Bez wierszy → schowane.
    var namePreviewWrap = root.querySelector("[data-trend-name-preview]");
    var namePreviewValue = root.querySelector("[data-trend-name-preview-value]");
    var namePreviewMeta = root.querySelector("[data-trend-name-preview-meta]");
    function refreshNamePreview() {
      if (!namePreviewWrap || !namePreviewValue) return;
      var name = null;
      try { name = computeExportBaseName(); } catch (_e) { name = null; }
      if (!name) {
        namePreviewWrap.hidden = true;
        namePreviewValue.textContent = "";
        if (namePreviewMeta) namePreviewMeta.textContent = "";
        return;
      }
      namePreviewWrap.hidden = false;
      // Aktualizujemy tylko gdy się zmieniła — minimalizuje screen-reader noise
      // i unika niepotrzebnych repaintów cursora przy długiej selekcji.
      if (namePreviewValue.textContent !== name) {
        namePreviewValue.textContent = name;
        namePreviewValue.classList.remove("is-copied");
      }
      if (namePreviewMeta) {
        var count = filterPoints(currentState()).length;
        var fmt = (exportFormatSelect && exportFormatSelect.value) || "csv";
        var th = getZipThreshold();
        var mode = getZipMode();
        var auto = th && mode === "switch" && fmt === "csv" && count >= th
          ? " · auto-ZIP"
          : "";
        namePreviewMeta.textContent = count + " w. · " + fmt + auto;
      }
    }
    if (namePreviewValue) {
      // Klik = jeden gest, kopia do schowka + dopisanie do historii.
      // Reuse logiki z `copyNameBtn.click()`, żeby był spójny status,
      // animacja na przycisku i wpis source=copy w historii.
      namePreviewValue.addEventListener("click", function () {
        var name = namePreviewValue.textContent || "";
        if (!name) return;
        copyTextToClipboard(name).then(function (ok) {
          if (ok) {
            namePreviewValue.classList.add("is-copied");
            if (exportStatus) exportStatus.textContent = "Skopiowano nazwę: " + name;
            try {
              var built = buildExportRows();
              pushExportHistory(name, { source: "copy", count: built && built.count });
            } catch (_e) { pushExportHistory(name, { source: "copy" }); }
            setTimeout(function () { namePreviewValue.classList.remove("is-copied"); }, 1500);
          } else if (exportStatus) {
            exportStatus.textContent = "Nie udało się skopiować — nazwa: " + name;
          }
        });
      });
      // Enter / Space na fokusie też kopiuje (dostępność klawiaturowa).
      namePreviewValue.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          namePreviewValue.click();
        }
      });
    }
    // Spinka do refreshZipHint: gdy ten się odświeża (zmiana progu/trybu/
    // formatu/filtra), name preview też jest świeże. Jedno źródło prawdy
    // dla cyklu „filter changed → UI re-sync".
    var _origRefreshZipHint = refreshZipHint;
    refreshZipHint = function () {
      _origRefreshZipHint();
      refreshNamePreview();
    };
    if (zipThresholdInput) {
      zipThresholdInput.addEventListener("input", function () {
        persistZipPrefs();
        refreshZipHint();
      });
    }
    if (zipModeSelect) {
      zipModeSelect.addEventListener("change", function () {
        persistZipPrefs();
        refreshZipHint();
      });
    }
    if (exportFormatSelect) {
      exportFormatSelect.addEventListener("change", refreshZipHint);
    }
    var fullSchemaCols = (data.fullSchemaColumns && data.fullSchemaColumns.length)
      ? data.fullSchemaColumns
      : null;
    function csvEscape(v) {
      var s = v == null ? "" : String(v);
      // RFC 4180: cudzysłów wymagany jeśli wartość zawiera ", przecinek lub newline.
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    /**
     * Mapa kolumna → wartość dla pojedynczego punktu (p) w trybie pełnym.
     * Zwraca string GOTOWY do CSV (po escape). Klucze nieobjęte mapą oznaczają
     * brak danych w embedded payloadzie → eksport wstawia pusty string,
     * zachowując kolumnę w wynikowym pliku.
     *
     * NOTE: świadomie obejmujemy tylko te pola, które realnie są w points:
     * generatedAt, png_saved_pct, discovery_saved_pct, command oraz wszystkie
     * flag_X. Reszta (trio_X, png_baseline, attr_X, node_version, cwd_basename)
     * istnieje wyłącznie w oryginalnym savings.csv tego runa, którego raport
     * nie embedduje, więc słusznie zostaje pusta. Konsument widzi ",," zamiast
     * fantomowego "0" i może odróżnić „brak danych" od „prawdziwe zero".
     */
    function fullSchemaValueFor(p, col) {
      if (col === "generatedAt") return csvEscape(p.generatedAt || "");
      if (col === "png_saved_pct") return csvEscape(typeof p.png === "number" ? p.png.toFixed(2) : "");
      if (col === "discovery_saved_pct") return csvEscape(typeof p.discovery === "number" ? p.discovery.toFixed(2) : "");
      if (col === "command") return csvEscape(p.command || "");
      if (col.indexOf("flag_") === 0) {
        return csvEscape((p.flags && p.flags[col]) || "");
      }
      return ""; // brak w embedded payload — pusta wartość
    }
    /**
     * Stabilna kolejność wierszy eksportu == kolejność wykresu trendów.
     *
     * Kontrakt:
     *   • allPoints przychodzi z serwera już posortowany rosnąco po
     *     generatedAt (history.csv) z bieżącym runem dopiętym na końcu.
     *   • filterPoints() jest .filter()-em → zachowuje porządek wejścia.
     *   • Eksport CSV i podgląd 20 wierszy MUSZĄ używać tej samej tablicy
     *     w tej samej kolejności, żeby user widział dokładnie to, co rysuje
     *     sparkline (najstarszy → najnowszy, isCurrent ostatni).
     *
     * Dla odporności na regresje robimy jeszcze jeden stabilny sort kopii:
     * Array.prototype.sort jest stabilny (ES2019), więc punkty z identycznym
     * generatedAt zachowują wzajemną kolejność z history.csv, a bieżący run
     * (isCurrent) idzie ZAWSZE na sam koniec swojej grupy timestampów —
     * dokładnie tak, jak rysowany jest ostatni punkt na sparkline.
     */
    function sortExportPointsLikeChart(pts) {
      var copy = pts.slice();
      copy.sort(function (a, b) {
        var ta = a.generatedAt || "";
        var tb = b.generatedAt || "";
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        // Tie-breaker: isCurrent zawsze na końcu (jak na wykresie).
        var ca = a.isCurrent ? 1 : 0;
        var cb = b.isCurrent ? 1 : 0;
        return ca - cb;
      });
      return copy;
    }
    function buildExportRows() {
      var state = currentState();
      var pts = sortExportPointsLikeChart(filterPoints(state));
      var mode = (exportModeSelect && exportModeSelect.value) || "subset";
      var cols;
      var rowsCells = [];
      var missingCount = 0;
      if (mode === "full" && fullSchemaCols) {
        cols = fullSchemaCols.slice();
        // Policz kolumny mapowane do pustego stringa — pokażemy w statusie
        // i w nagłówku podglądu, żeby user wiedział, że plik ma „dziury"
        // zamiast halucynowanych zer.
        cols.forEach(function (c) {
          if (c === "generatedAt" || c === "png_saved_pct" || c === "discovery_saved_pct" || c === "command") return;
          if (c.indexOf("flag_") === 0) return;
          missingCount++;
        });
        pts.forEach(function (p) {
          rowsCells.push(cols.map(function (c) { return fullSchemaValueFor(p, c); }));
        });
      } else {
        mode = "subset";
        cols = ["generatedAt", "png_saved_pct", "discovery_saved_pct", "isCurrent", "command"]
          .concat(flagCols.map(function (c) { return c; }));
        pts.forEach(function (p) {
          var row = [
            csvEscape(p.generatedAt || ""),
            csvEscape(typeof p.png === "number" ? p.png.toFixed(2) : ""),
            csvEscape(typeof p.discovery === "number" ? p.discovery.toFixed(2) : ""),
            csvEscape(p.isCurrent ? "1" : "0"),
            csvEscape(p.command || ""),
          ];
          flagCols.forEach(function (c) { row.push(csvEscape((p.flags && p.flags[c]) || "")); });
          rowsCells.push(row);
        });
      }
      var lines = [cols.join(",")].concat(rowsCells.map(function (r) { return r.join(","); }));
      var csvText = lines.join("\n") + "\n";

      // Split CSVs (na potrzeby trybu „zip-split"): osobny plik dla każdej
      // metryki, tylko 2 kolumny generatedAt + value — gotowy do importu do
      // narzędzi single-series (np. Grafana CSV plugin, Datawrapper) bez
      // potrzeby selektowania kolumn po stronie usera.
      function buildSingleSeriesCsv(metricKey) {
        var head = "generatedAt,value";
        var body = pts.map(function (p) {
          var v = p[metricKey];
          var cell = typeof v === "number" ? v.toFixed(2) : "";
          return csvEscape(p.generatedAt || "") + "," + cell;
        });
        return [head].concat(body).join("\n") + "\n";
      }
      var splitCsvs = {
        "png-saved.csv": buildSingleSeriesCsv("png"),
        "discovery-saved.csv": buildSingleSeriesCsv("discovery"),
      };

      return {
        csv: csvText,
        count: pts.length,
        total: allPoints.length,
        state: state,
        mode: mode,
        colCount: cols.length,
        missingCount: missingCount,
        headerCells: cols,
        rowsCells: rowsCells,
        splitCsvs: splitCsvs,
        points: pts, // potrzebne do manifest.rowRange (first/last generatedAt)
      };
    }
    function shortHash(s) {
      // Mały deterministyczny hash (djb2) → 6 znaków hex. Wystarczy do unikalnej
      // nazwy pliku per kombinacja filtra (kolizje OK — to tylko etykieta).
      var h = 5381;
      for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
      return ("00000000" + (h >>> 0).toString(16)).slice(-6);
    }

    // ---- Dialog podglądu przed pobraniem (max 20 wierszy) ----
    // Workflow:
    //  1. Klik „⬇ Podgląd i eksport…" → buildExportRows() z aktualnego filtra,
    //     renderujemy nagłówki + 20 pierwszych wierszy w <table>, otwieramy <dialog>.
    //  2. „Anuluj" / Esc / klik backdropa → zamykamy bez zapisu (built jest GC).
    //  3. „Pobierz CSV" → ten sam blob/anchor flow, co dotychczas, plus zamknięcie.
    //
    // Re-build per otwarcie zapewnia, że jeśli user zmieni filtr lub tryb po
    // otwarciu (gdyby kiedyś), to my pokazujemy zawsze fresh data w momencie
    // klikania „Podgląd". <dialog> jest natywny — zero deps, ESC działa za
    // darmo, focus trap i a11y standardowe.
    var previewDialog = root.querySelector("[data-export-preview-dialog]");
    var previewMeta = root.querySelector("[data-export-preview-meta]");
    var previewHead = root.querySelector("[data-export-preview-head]");
    var previewBody = root.querySelector("[data-export-preview-body]");
    var previewTrunc = root.querySelector("[data-export-preview-truncated]");
    var previewCancel = root.querySelector("[data-export-preview-cancel]");
    var previewConfirm = root.querySelector("[data-export-preview-confirm]");
    var previewTitle = root.querySelector("#export-preview-title");
    var previewFilenameWrap = root.querySelector("[data-export-preview-filename]");
    var previewFilenameValue = root.querySelector("[data-export-preview-filename-value]");
    var previewFilenameCopy = root.querySelector("[data-export-preview-filename-copy]");
    var previewFilenameMatch = root.querySelector("[data-export-preview-filename-match]");
    var PREVIEW_LIMIT = 20;
    var pendingExport = null; // {csv, filename, count, total, mode, colCount, missingCount}

    function renderPreview(built) {
      if (!previewHead || !previewBody) return;
      previewHead.innerHTML = built.headerCells
        .map(function (c) { return "<th>" + escapeText(c) + "</th>"; })
        .join("");
      var slice = built.rowsCells.slice(0, PREVIEW_LIMIT);
      previewBody.innerHTML = slice
        .map(function (r) {
          return "<tr>" + r.map(function (cell) {
            // CSV cells z RFC-4180 escape (cudzysłowy podwojone, całość owinięta
            // w cudzysłowy). Dla podglądu „odpakowujemy" by user widział wartość
            // jak w arkuszu, nie surowy CSV-string. Pusta komórka → klasa is-empty.
            var raw = unwrapCsvCell(cell);
            var cls = raw === "" ? ' class="is-empty"' : "";
            var display = raw === "" ? "(puste)" : raw;
            return "<td" + cls + " title=\"" + escapeAttr(raw) + "\">" + escapeText(display) + "</td>";
          }).join("") + "</tr>";
        })
        .join("");
      if (previewTrunc) {
        if (built.count > PREVIEW_LIMIT) {
          previewTrunc.hidden = false;
          previewTrunc.textContent = "Pokazuję " + PREVIEW_LIMIT + " z " + built.count
            + " wierszy. Pełny zbiór trafi do pobranego pliku.";
        } else {
          previewTrunc.hidden = true;
          previewTrunc.textContent = "";
        }
      }
      if (previewMeta) {
        var modeLabel = built.mode === "full"
          ? ("tryb pełny, " + built.colCount + " kolumn"
            + (built.missingCount ? " (" + built.missingCount + " pustych)" : ""))
          : ("tryb skrócony, " + built.colCount + " kolumn");
        previewMeta.textContent = built.count + "/" + built.total + " runów · " + modeLabel;
      }
      // Filename row + dynamic title — pokazuje nazwę paczki, którą za chwilę
      // pobierzemy. Sczytujemy z pendingExport.filename (single source of truth
      // — ta sama wartość trafia do anchor.download). Dodatkowo porównujemy
      // z computeExportBaseName() i wyświetlamy badge ✓ zgodne / ⚠ różni się
      // (sanity check, że flow Kopiuj-nazwę i Pobierz dają identyczny string).
      var pe = pendingExport;
      var pendingName = pe && pe.filename ? pe.filename : null;
      var pendingFmt = pe && pe.format ? pe.format : "csv";
      if (previewTitle) {
        var titleFmt = pendingFmt === "zip" || pendingFmt === "zip-split"
          ? "ZIP" : "CSV";
        previewTitle.textContent = "Podgląd eksportu " + titleFmt;
      }
      if (previewConfirm) {
        // Sync etykiety przycisku potwierdzenia z formatem (CSV/ZIP), żeby
        // user nie kliknął „Pobierz CSV" gdy auto-ZIP przełączył format.
        previewConfirm.textContent = "⬇ Pobierz " +
          (pendingFmt === "zip" || pendingFmt === "zip-split" ? "ZIP" : "CSV");
      if (previewFilenameWrap && previewFilenameValue) {
        if (pendingName) {
          previewFilenameWrap.hidden = false;
          previewFilenameValue.textContent = pendingName;
          previewFilenameValue.classList.remove("is-copied");
          if (previewFilenameCopy) {
            previewFilenameCopy.classList.remove("is-copied");
            previewFilenameCopy.textContent = "⧉";
          }
          // Match check vs live preview / „⧉ Kopiuj nazwę" — jeśli user
          // zmienił filtry między „Podgląd" a renderem, mismatch ostrzega.
          if (previewFilenameMatch) {
            var live = null;
            try { live = computeExportBaseName(); } catch (_e) { live = null; }
            previewFilenameMatch.classList.remove("is-match", "is-mismatch");
            if (!live) {
              previewFilenameMatch.hidden = true;
              previewFilenameMatch.textContent = "";
            } else if (live === pendingName) {
              previewFilenameMatch.hidden = false;
              previewFilenameMatch.classList.add("is-match");
              previewFilenameMatch.textContent = "✓ zgodne ze schowkiem";
              previewFilenameMatch.title = "Identyczna nazwa jak ta z przycisku „⧉ Kopiuj nazwę" / live preview.";
            } else {
              previewFilenameMatch.hidden = false;
              previewFilenameMatch.classList.add("is-mismatch");
              previewFilenameMatch.textContent = "⚠ różni się od live";
              previewFilenameMatch.title = "Filtry zmieniły się między klikiem „Podgląd" a teraz.\nLive: " + live + "\nW eksporcie: " + pendingName;
            }
          }
        } else {
          previewFilenameWrap.hidden = true;
          previewFilenameValue.textContent = "";
        }
      }
    }
    function escapeText(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function escapeAttr(s) {
      return escapeText(s).replace(/"/g, "&quot;");
    }
    function unwrapCsvCell(cell) {
      // Odwrotność csvEscape: jeśli wartość jest opakowana cudzysłowami,
      // ściągamy je i podwojone "" zamieniamy na pojedyncze. Wartości nie-
      // escapowane (numeryczne, ISO timestamp) wracają jak są.
      if (typeof cell !== "string") return cell == null ? "" : String(cell);
      if (cell.length >= 2 && cell.charCodeAt(0) === 34 && cell.charCodeAt(cell.length - 1) === 34) {
        return cell.slice(1, -1).replace(/""/g, '"');
      }
      return cell;
    }

    // ---- Minimalny ZIP writer (zero-deps, browser-only) ----
    // Używamy metody STORE (kompresja=0) — pliki CSV i tak dobrze się
    // kompresują przez transport HTTP, a brak DEFLATE pozwala uniknąć
    // ~3 KB kodu i zależności od CompressionStream (niedostępne w
    // starszych Safari / Firefox bez ESR). Format binarny: lokalne nagłówki
    // (PK\x03\x04) per plik, central directory (PK\x01\x02), end-of-central-
    // directory (PK\x05\x06). Patrz APPNOTE.TXT 4.3.6–4.3.16.
    //
    // Ograniczenia: brak ZIP64 (max 4 GiB total / per-file, max 65535 plików)
    // — nas absolutnie nie dotyczy (eksport CSV maks. ~10 MB, kilka plików).
    var CRC32_TABLE = (function () {
      var t = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
      }
      return t;
    })();
    function crc32(bytes) {
      var c = 0xffffffff;
      for (var i = 0; i < bytes.length; i++) c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    }
    function buildZip(files) {
      // files: [{ name: "foo.csv", text: "..." }] LUB
      //       [{ name: "foo.png", bytes: Uint8Array }] — wpisy mogą być binarne
      //       (np. PNG ze sparkline-a) lub tekstowe (CSV, JSON). Pole "bytes"
      //       ma pierwszenstwo nad "text".
      var enc = new TextEncoder();
      var localParts = [];
      var centralParts = [];
      var offset = 0;
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var nameBytes = enc.encode(f.name);
        var dataBytes = f.bytes ? f.bytes : enc.encode(f.text || "");
        var crc = crc32(dataBytes);
        var size = dataBytes.length;
        // Local file header (30 B + name + data)
        var lh = new Uint8Array(30 + nameBytes.length);
        var lhv = new DataView(lh.buffer);
        lhv.setUint32(0, 0x04034b50, true); // signature
        lhv.setUint16(4, 20, true);          // version needed
        lhv.setUint16(6, 0x0800, true);      // bit 11: UTF-8 filename
        lhv.setUint16(8, 0, true);           // method = STORE
        lhv.setUint16(10, 0, true);          // mod time (deterministyczne 0)
        lhv.setUint16(12, 0x0021, true);     // mod date (1980-01-01)
        lhv.setUint32(14, crc, true);
        lhv.setUint32(18, size, true);       // compressed size = uncompressed
        lhv.setUint32(22, size, true);
        lhv.setUint16(26, nameBytes.length, true);
        lhv.setUint16(28, 0, true);          // extra length
        lh.set(nameBytes, 30);
        localParts.push(lh, dataBytes);
        // Central directory header (46 B + name)
        var ch = new Uint8Array(46 + nameBytes.length);
        var chv = new DataView(ch.buffer);
        chv.setUint32(0, 0x02014b50, true);  // signature
        chv.setUint16(4, 20, true);          // version made by
        chv.setUint16(6, 20, true);          // version needed
        chv.setUint16(8, 0x0800, true);      // UTF-8
        chv.setUint16(10, 0, true);          // method
        chv.setUint16(12, 0, true);          // mod time
        chv.setUint16(14, 0x0021, true);     // mod date
        chv.setUint32(16, crc, true);
        chv.setUint32(20, size, true);
        chv.setUint32(24, size, true);
        chv.setUint16(28, nameBytes.length, true);
        chv.setUint16(30, 0, true);          // extra
        chv.setUint16(32, 0, true);          // comment
        chv.setUint16(34, 0, true);          // disk #
        chv.setUint16(36, 0, true);          // internal attrs
        chv.setUint32(38, 0, true);          // external attrs
        chv.setUint32(42, offset, true);     // relative offset of LFH
        ch.set(nameBytes, 46);
        centralParts.push(ch);
        offset += lh.length + dataBytes.length;
      }
      var centralSize = centralParts.reduce(function (s, p) { return s + p.length; }, 0);
      var centralOffset = offset;
      var eocd = new Uint8Array(22);
      var ev = new DataView(eocd.buffer);
      ev.setUint32(0, 0x06054b50, true);
      ev.setUint16(4, 0, true);              // disk #
      ev.setUint16(6, 0, true);              // disk where CD starts
      ev.setUint16(8, files.length, true);   // entries on this disk
      ev.setUint16(10, files.length, true);  // total entries
      ev.setUint32(12, centralSize, true);
      ev.setUint32(16, centralOffset, true);
      ev.setUint16(20, 0, true);             // comment length
      return new Blob(localParts.concat(centralParts).concat([eocd]), {
        type: "application/zip",
      });
    }

    // ---- Walidacja ZIP po stronie klienta (zero-deps) ----
    // Po zbudowaniu archiwum re-parsujemy je z surowych bajtów (Blob →
    // ArrayBuffer) i sprawdzamy:
    //   1. EOCD (End Of Central Directory) — sygnaturę 0x06054b50 i liczbę
    //      wpisów (musi się zgadzać z files.length).
    //   2. Każdy Central Directory Header (0x02014b50) — czytamy nazwę,
    //      offset Local File Headera, deklarowane CRC i rozmiar.
    //   3. Każdy Local File Header (0x04034b50) pod tym offsetem — czytamy
    //      surowe dane (METHOD=STORE, więc to jest „rozpakowanie") i
    //      przeliczamy CRC32 na świeżo. Mismatch ⇒ błąd integralności.
    // Funkcja jest defensywna: każdy mismatch dopisuje opis do listy
    // błędów, a wynik to {ok, fileCount, errors[]}. Nie rzuca wyjątkami.
    function verifyZip(blob, expectedFileCount) {
      return blob.arrayBuffer().then(function (buf) {
        var bytes = new Uint8Array(buf);
        var dv = new DataView(buf);
        var errors = [];
        // Szukamy EOCD od końca (max 22 B + comment, u nas comment=0).
        var eocdOffset = -1;
        for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
          if (dv.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
        }
        if (eocdOffset < 0) {
          return { ok: false, fileCount: 0, errors: ["Brak sygnatury EOCD — archiwum uszkodzone."] };
        }
        var totalEntries = dv.getUint16(eocdOffset + 10, true);
        var cdSize = dv.getUint32(eocdOffset + 12, true);
        var cdOffset = dv.getUint32(eocdOffset + 16, true);
        if (totalEntries !== expectedFileCount) {
          errors.push("Liczba wpisów w EOCD (" + totalEntries + ") ≠ oczekiwana ("
            + expectedFileCount + ").");
        }
        // Iteracja po Central Directory.
        var cur = cdOffset;
        var seen = 0;
        var dec = (typeof TextDecoder !== "undefined") ? new TextDecoder("utf-8") : null;
        while (cur < cdOffset + cdSize && seen < totalEntries) {
          if (dv.getUint32(cur, true) !== 0x02014b50) {
            errors.push("Brak sygnatury Central Directory @ offset " + cur + ".");
            break;
          }
          var declCrc = dv.getUint32(cur + 16, true);
          var declSize = dv.getUint32(cur + 24, true);
          var nameLen = dv.getUint16(cur + 28, true);
          var extraLen = dv.getUint16(cur + 30, true);
          var commentLen = dv.getUint16(cur + 32, true);
          var lfhOffset = dv.getUint32(cur + 42, true);
          var nameBytes = bytes.subarray(cur + 46, cur + 46 + nameLen);
          var name = dec ? dec.decode(nameBytes) : String.fromCharCode.apply(null, nameBytes);
          // Local File Header pod offsetem
          if (dv.getUint32(lfhOffset, true) !== 0x04034b50) {
            errors.push("[" + name + "] brak sygnatury Local File Header @ " + lfhOffset + ".");
          } else {
            var lfhNameLen = dv.getUint16(lfhOffset + 26, true);
            var lfhExtraLen = dv.getUint16(lfhOffset + 28, true);
            var dataStart = lfhOffset + 30 + lfhNameLen + lfhExtraLen;
            var dataEnd = dataStart + declSize;
            if (dataEnd > bytes.length) {
              errors.push("[" + name + "] dane wykraczają poza archiwum (size="
                + declSize + ").");
            } else {
              var data = bytes.subarray(dataStart, dataEnd);
              var actualCrc = crc32(data);
              if (actualCrc !== declCrc) {
                errors.push("[" + name + "] CRC mismatch (decl=0x"
                  + declCrc.toString(16) + ", actual=0x" + actualCrc.toString(16) + ").");
              }
            }
          }
          cur += 46 + nameLen + extraLen + commentLen;
          seen++;
        }
        if (seen !== expectedFileCount) {
          errors.push("Odczytano " + seen + " wpisów Central Directory, oczekiwano "
            + expectedFileCount + ".");
        }
        return { ok: errors.length === 0, fileCount: seen, errors: errors };
      }).catch(function (e) {
        return { ok: false, fileCount: 0, errors: ["Wyjątek walidacji: " + (e && e.message || e)] };
      });
    }

    // ---- Snapshot sparkline'ów do PNG (zero-deps, browser-only) ----
    // W trybie „zip-split" oprócz CSV pakujemy też obrazki PNG każdego
    // wykresu (po jednym pliku per [data-spark]). PNG jest renderowany
    // *po* aktualnej filtracji (apply() już przerysował SVG), więc plik
    // dokładnie odpowiada temu, co user widzi i co siedzi w CSV.
    //
    // Pipeline: SVG outerHTML (z dopisanym xmlns) → Blob → <img> → <canvas>
    // → toBlob("image/png") → arrayBuffer → Uint8Array. Natywna ścieżka
    // wspierana we wszystkich evergreen przeglądarkach. Każdy snapshot ma
    // hard-timeout 3s i jest opakowany try/catch — pojedyncza porażka nie
    // blokuje eksportu CSV-ów (PNG jest „nice-to-have"). Skala 2x dla
    // wyraźnych wykresów na ekranach HiDPI.
    function snapshotSparkPngs() {
      var jobs = sparks.map(function (figure) {
        var svg = figure.querySelector("[data-trend-svg]");
        if (!svg) return Promise.resolve(null);
        var key = figure.getAttribute("data-spark") || "spark";
        var W = parseFloat(svg.getAttribute("data-w")) || 320;
        var H = parseFloat(svg.getAttribute("data-h")) || 80;
        // Klon + xmlns — wymagane, żeby <img> zaakceptowało SVG-blob.
        var clone = svg.cloneNode(true);
        clone.setAttribute("xmlns", SVG_NS);
        clone.setAttribute("width", String(W));
        clone.setAttribute("height", String(H));
        var svgText = new XMLSerializer().serializeToString(clone);
        var blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        return new Promise(function (resolve) {
          var img = new Image();
          var done = false;
          var timer = setTimeout(function () {
            if (done) return; done = true;
            URL.revokeObjectURL(url);
            resolve(null);
          }, 3000);
          img.onload = function () {
            if (done) return; done = true;
            clearTimeout(timer);
            try {
              var scale = 2;
              var canvas = document.createElement("canvas");
              canvas.width = Math.round(W * scale);
              canvas.height = Math.round(H * scale);
              var ctx = canvas.getContext("2d");
              ctx.scale(scale, scale);
              ctx.drawImage(img, 0, 0);
              canvas.toBlob(function (pngBlob) {
                URL.revokeObjectURL(url);
                if (!pngBlob) { resolve(null); return; }
                pngBlob.arrayBuffer().then(function (ab) {
                  resolve({
                    name: "spark-" + key.replace(/[^a-z0-9._-]/gi, "_") + ".png",
                    bytes: new Uint8Array(ab),
                    width: canvas.width,
                    height: canvas.height,
                  });
                }, function () { resolve(null); });
              }, "image/png");
            } catch (_e) {
              URL.revokeObjectURL(url);
              resolve(null);
            }
          };
          img.onerror = function () {
            if (done) return; done = true;
            clearTimeout(timer);
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
        });
      });
      return Promise.all(jobs).then(function (results) {
        return results.filter(function (r) { return r != null; });
      });
    }

    function downloadPending() {
      if (!pendingExport) return;
      try {
        var blob = pendingExport.blob || new Blob([pendingExport.csv], {
          type: pendingExport.mime || "text/csv;charset=utf-8",
        });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = pendingExport.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        if (exportStatus) {
          var ml = pendingExport.mode === "full"
            ? ("pełny schemat, " + pendingExport.colCount + " kol."
              + (pendingExport.missingCount ? ", " + pendingExport.missingCount + " pustych" : ""))
            : ("skrócony, " + pendingExport.colCount + " kol.");
          var fmtLabel = pendingExport.format === "zip" ? " · ZIP"
            : pendingExport.format === "zip-split" ? " · ZIP split (" + pendingExport.fileCount + " plików)"
            : "";
          exportStatus.textContent = "Pobrano " + pendingExport.count + "/" + pendingExport.total
            + " (" + ml + fmtLabel + ") → " + pendingExport.filename
            + (pendingExport.thresholdNote || "");
          // Walidacja ZIP po pobraniu — czytamy bajty z blobu (te same,
          // które poszły do pliku użytkownika), parsujemy EOCD + central
          // directory + lokalne nagłówki i przeliczamy CRC32 każdego
          // entry. Wynik dopinamy do statusu po krótkim opóźnieniu, żeby
          // nie nadpisać komunikatu „Pobrano …" przed jego przeczytaniem.
          if ((pendingExport.format === "zip" || pendingExport.format === "zip-split")
              && pendingExport.blob && typeof pendingExport.blob.arrayBuffer === "function") {
            var expected = pendingExport.fileCount;
            var statusBase = exportStatus.textContent;
            verifyZip(pendingExport.blob, expected).then(function (res) {
              if (!exportStatus) return;
              if (res.ok) {
                exportStatus.textContent = statusBase + " · ✓ walidacja ZIP OK ("
                  + res.fileCount + " plików, CRC32 zgodne).";
              } else {
                exportStatus.textContent = statusBase + " · ⚠ walidacja ZIP: "
                  + res.errors.slice(0, 2).join(" ")
                  + (res.errors.length > 2 ? " (+" + (res.errors.length - 2) + " więcej)" : "");
                if (typeof console !== "undefined" && console.warn) {
                  console.warn("[visual-snapshot-report] ZIP validation errors:", res.errors);
                }
              }
            });
          }
        }
      } catch (e) {
        if (exportStatus) exportStatus.textContent = "Eksport nieudany: " + e.message;
      }
    }

    // ---- Nazwa paczki eksportu (single source of truth) ----
    // Generuje DOKŁADNIE tę samą nazwę co eksport — używa buildExportRows()
    // (skrót filtra liczy się ze świeżego stanu selectów po apply()),
    // bieżącego stempla czasowego i wybranego formatu (csv/zip/zip-split).
    // Rozszerzenie: csv→.csv, zip|zip-split→.zip. Brak wierszy ⇒ null.
    // Sanityzacja nazwy pliku do wspólnego mianownika Windows/macOS/Linux:
    // - normalizujemy diakrytyki (NFD) i zrzucamy znaki łączące → bez „ąćęłńóśźż".
    // - dozwolone tylko [A-Za-z0-9._-]; reszta (spacje, /, \, :, *, ?, ", <, >, |,
    //   znaki kontrolne, emoji) zamieniana na "-".
    // - kolapsujemy wielokrotne myślniki i ucinamy z brzegów ("." też, bo Windows
    //   nie lubi nazw kończących się kropką/spacją). Pusty wynik → "file".
    function sanitizeFilenamePart(s) {
      var str = String(s == null ? "" : s);
      try { str = str.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); } catch (_) {}
      // Polskie „ł/Ł" nie rozkłada się przez NFKD — mapujemy ręcznie.
      str = str.replace(/ł/g, "l").replace(/Ł/g, "L");
      str = str.replace(/[^A-Za-z0-9._-]+/g, "-");
      str = str.replace(/-{2,}/g, "-").replace(/^[-._]+|[-._]+$/g, "");
      return str || "file";
    }

    // Buduje pełną nazwę pliku z bezpiecznych segmentów + rozszerzenia.
    // Rozszerzenie sanityzujemy osobno, żeby nie uciąć kropki separatora.
    function buildSafeFilename(parts, ext) {
      var safeParts = parts.map(sanitizeFilenamePart).filter(Boolean);
      var safeExt = ext ? "." + sanitizeFilenamePart(ext.replace(/^\.+/, "")) : "";
      return safeParts.join("-") + safeExt;
    }

    function computeExportBaseName() {
      var built = buildExportRows();
      if (!built.count) return null;
      var format = (exportFormatSelect && exportFormatSelect.value) || "csv";
      var th = getZipThreshold();
      var zMode = getZipMode();
      // Parytet z handlerem eksportu: gdy próg „switch" przekroczony i
      // format = csv, podgląd nazwy pokazuje już .zip (to jest, co poleci).
      if (th && zMode === "switch" && format === "csv" && built.count >= th) {
        format = "zip";
      }
      var stamp = new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z");
      var filterHash = shortHash(JSON.stringify(built.state) + "|" + built.mode + "|" + format);
      var ext = (format === "zip" || format === "zip-split") ? "zip" : "csv";
      return buildSafeFilename(["savings-filtered", built.mode, stamp, filterHash], ext);
    }

    // ───────────────── Historia ostatnich nazw eksportu (LRU, top 10) ─────────────────
    // Cel: jeden klik = ponowne skopiowanie nazwy bez konieczności
    // ustawiania tych samych filtrów ponownie. Persist w localStorage,
    // żeby przeżyła reload. Dedup po `name` (re-eksport z tym samym
    // hashem przesuwa wpis na top, nie duplikuje). Defensywnie: brak
    // storage / zły JSON ⇒ pusta historia, brak crasha.
    function loadExportHistory() {
      try {
        var raw = localStorage.getItem(EXPORT_HISTORY_KEY);
        if (!raw) return [];
        var arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr.filter(function (e) {
          return e && typeof e.name === "string" && e.name.length > 0;
        }).slice(0, EXPORT_HISTORY_MAX);
      } catch (_e) { return []; }
    }
    function saveExportHistory(list) {
      try { localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(list)); }
      catch (_e) { /* quota / disabled storage → ignorujemy */ }
    }
    function pushExportHistory(name, meta) {
      if (!name) return;
      var list = loadExportHistory();
      // Dedup po nazwie → LRU (re-kopia tej samej wskakuje na top).
      list = list.filter(function (e) { return e.name !== name; });
      list.unshift({
        name: name,
        ts: Date.now(),
        source: (meta && meta.source) || "copy",
        count: meta && typeof meta.count === "number" ? meta.count : null,
      });
      if (list.length > EXPORT_HISTORY_MAX) list.length = EXPORT_HISTORY_MAX;
      saveExportHistory(list);
      renderExportHistory();
    }
    function clearExportHistory() {
      saveExportHistory([]);
      renderExportHistory();
    }
    var rtf = (function () {
      try { return new Intl.RelativeTimeFormat("pl", { numeric: "auto" }); }
      catch (_) { return null; }
    })();
    function formatHistoryTime(ts) {
      if (!ts) return "";
      var diffSec = Math.round((ts - Date.now()) / 1000);
      var abs = Math.abs(diffSec);
      if (!rtf) return new Date(ts).toLocaleString();
      if (abs < 60) return rtf.format(diffSec, "second");
      if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
      if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
      return new Date(ts).toLocaleDateString();
    }
    function renderExportHistory() {
      if (!historyWrap || !historyList) return;
      var list = loadExportHistory();
      if (!list.length) {
        historyWrap.hidden = true;
        if (historyCountEl) historyCountEl.textContent = "";
        historyList.innerHTML = "";
        return;
      }
      historyWrap.hidden = false;
      if (historyCountEl) historyCountEl.textContent = "(" + list.length + "/" + EXPORT_HISTORY_MAX + ")";
      // Budowa DOM zamiast innerHTML — defensywa XSS, niezależnie od
      // tego, że sanitizeFilenamePart whitelistuje [A-Za-z0-9._-].
      historyList.innerHTML = "";
      list.forEach(function (entry) {
        var li = document.createElement("li");
        li.className = "trends-filter-history-item";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "trends-filter-history-btn";
        btn.textContent = entry.name;
        var srcLabel = entry.source === "download" ? "pobrane" : "skopiowane";
        var countLabel = entry.count != null ? ", " + entry.count + " w." : "";
        btn.title = "Kliknij, żeby ponownie skopiować nazwę.\nŹródło: " + srcLabel + countLabel + "\nCzas: " + new Date(entry.ts).toLocaleString();
        btn.addEventListener("click", function () {
          copyTextToClipboard(entry.name).then(function (ok) {
            if (ok) {
              btn.classList.add("is-copied");
              if (exportStatus) exportStatus.textContent = "Skopiowano nazwę z historii: " + entry.name;
              setTimeout(function () { btn.classList.remove("is-copied"); }, 1500);
            } else if (exportStatus) {
              exportStatus.textContent = "Nie udało się skopiować — nazwa: " + entry.name;
            }
          });
        });
        var meta = document.createElement("span");
        meta.className = "trends-filter-history-meta";
        meta.textContent = formatHistoryTime(entry.ts);
        li.appendChild(btn);
        li.appendChild(meta);
        historyList.appendChild(li);
      });
    }
    if (historyClearBtn) {
      historyClearBtn.addEventListener("click", function (ev) {
        // stopPropagation → klik „Wyczyść" nie togglje <details>.
        ev.preventDefault();
        ev.stopPropagation();
        clearExportHistory();
        if (exportStatus) exportStatus.textContent = "Historia nazw eksportu wyczyszczona.";
      });
    }
    renderExportHistory();

    // ───────────────── Skrót klawiszowy: Ctrl/Cmd+Shift+C → kopiuj nazwę ─────────────────
    // Aktywny gdy kursor jest nad panelem `.trends-filter` LUB fokus
    // znajduje się wewnątrz panelu (klawiatura). Używamy Shift, żeby NIE
    // kolidować ze standardowym Ctrl/Cmd+C (kopiowanie zaznaczenia).
    // Dodatkowy fallback: zwykły Ctrl/Cmd+C działa tylko jeśli nie ma
    // żadnego zaznaczenia tekstu — wtedy gest „nic nie zaznaczam, chcę
    // nazwę paczki" jest jednoznaczny i nie odbiera natywnego copy.
    var filterBarEl = root.querySelector(".trends-filter");
    var isHovering = false;
    if (filterBarEl) {
      filterBarEl.addEventListener("mouseenter", function () { isHovering = true; });
      filterBarEl.addEventListener("mouseleave", function () { isHovering = false; });
      // Tooltip na panelu informujący o skrócie — discoverability.
      var existingLabel = filterBarEl.getAttribute("aria-label") || "Filtry trendów";
      filterBarEl.setAttribute(
        "title",
        existingLabel + " — skrót: Ctrl/Cmd+Shift+C kopiuje nazwę paczki eksportu."
      );
    }
    document.addEventListener("keydown", function (ev) {
      if (!copyNameBtn || !filterBarEl) return;
      var isCopyKey = (ev.key === "c" || ev.key === "C");
      if (!isCopyKey) return;
      var modPressed = ev.ctrlKey || ev.metaKey;
      if (!modPressed) return;
      // Ignoruj gdy fokus w polu edycyjnym (input/textarea/contenteditable),
      // żeby nie zjadać natywnego copy/paste w innych miejscach raportu.
      var ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) {
        // wyjątek: gdy fokus jest w naszym panelu i userwcisnął Shift,
        // i tak chcemy obsłużyć skrót (świadoma akcja).
        if (!(ev.shiftKey && filterBarEl.contains(ae))) return;
      }
      // Wymagamy ALBO Shift (jednoznaczny gest), ALBO hover/focus w panelu
      // bez aktywnego zaznaczenia (wtedy zwykły Ctrl/Cmd+C też działa).
      var focusInPanel = ae && filterBarEl.contains(ae);
      var hasSelection = (function () {
        try {
          var sel = window.getSelection && window.getSelection();
          return !!(sel && String(sel.toString()).length > 0);
        } catch (_) { return false; }
      })();
      var qualifies =
        ev.shiftKey ||
        ((isHovering || focusInPanel) && !hasSelection);
      if (!qualifies) return;
      // preventDefault tylko gdy faktycznie obsługujemy — żeby nie blokować
      // natywnego copy poza naszym scope.
      ev.preventDefault();
      copyNameBtn.click();
    });

    // Kopiowanie do schowka z fallbackiem (Clipboard API → execCommand).
    function copyTextToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(function () { return true; })
          .catch(function () { return legacyCopy(text); });
      }
      return Promise.resolve(legacyCopy(text));
    }
    function legacyCopy(text) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand && document.execCommand("copy");
        document.body.removeChild(ta);
        return !!ok;
      } catch (e) { return false; }
    }

    if (copyNameBtn) {
      var copyResetTimer = null;
      var copyOriginalLabel = copyNameBtn.textContent;
      copyNameBtn.addEventListener("click", function () {
        var name = computeExportBaseName();
        if (!name) {
          if (exportStatus) exportStatus.textContent = "Brak wierszy — zmień filtr, żeby wygenerować nazwę.";
          return;
        }
        copyTextToClipboard(name).then(function (ok) {
          if (ok) {
            copyNameBtn.classList.add("is-copied");
            copyNameBtn.textContent = "✓ Skopiowano";
            if (exportStatus) exportStatus.textContent = "Skopiowano nazwę: " + name;
            // Wpis do historii: source=copy, count z aktualnego buildExportRows
            // (drugie wywołanie — tanio, bez parsowania CSV; computeExportBaseName
            // i tak już raz to zrobił, ale brak globalnego cache nie boli przy ~ms).
            try {
              var built = buildExportRows();
              pushExportHistory(name, { source: "copy", count: built && built.count });
            } catch (_e) { pushExportHistory(name, { source: "copy" }); }
            if (copyResetTimer) clearTimeout(copyResetTimer);
            copyResetTimer = setTimeout(function () {
              copyNameBtn.classList.remove("is-copied");
              copyNameBtn.textContent = copyOriginalLabel;
            }, 2000);
          } else if (exportStatus) {
            exportStatus.textContent = "Nie udało się skopiować — nazwa: " + name;
          }
        });
      });
    }

    if (exportBtn) {
      // Disable trybu „full" gdy serwer nie embedował SAVINGS_CSV_COLUMNS
      // (np. starszy raport / regresja w buildzie). User widzi czemu.
      if (exportModeSelect && !fullSchemaCols) {
        var fullOpt = exportModeSelect.querySelector('option[value="full"]');
        if (fullOpt) {
          fullOpt.disabled = true;
          fullOpt.textContent = "Pełny schemat (niedostępny)";
        }
      }
      exportBtn.addEventListener("click", function () {
        var built = buildExportRows();
        if (!built.count) {
          if (exportStatus) exportStatus.textContent = "Brak wierszy do eksportu (zmień filtr).";
          return;
        }
        var format = (exportFormatSelect && exportFormatSelect.value) || "csv";
        // Auto-przełącznik na ZIP po przekroczeniu progu (tylko gdy user
        // nadal jest na CSV — szanujemy świadomy wybór ZIP/ZIP-split).
        // Tryb „switch" nadpisuje select w UI (visible feedback), tryb
        // „suggest" tylko dopisuje notkę do statusu — plik leci jako CSV.
        var th = getZipThreshold();
        var zMode = getZipMode();
        var thresholdNote = "";
        if (th && zMode !== "off" && format === "csv" && built.count >= th) {
          if (zMode === "switch") {
            format = "zip";
            if (exportFormatSelect) {
              exportFormatSelect.value = "zip";
              persistZipPrefs(); // nie zmienia, ale aktualizuje hint
            }
            thresholdNote = " (auto-ZIP: " + built.count + " ≥ " + th + ")";
          } else {
            thresholdNote = " (powyżej progu " + th + " — rozważ ZIP)";
          }
        }
        var stamp = new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z");
        var filterHash = shortHash(JSON.stringify(built.state) + "|" + built.mode + "|" + format);
        // Bez rozszerzenia — dopisywane niżej (.csv/.zip). Sanityzacja gwarantuje
        // brak spacji/diakrytyków/znaków zarezerwowanych przez Windows.
        var baseName = buildSafeFilename(["savings-filtered", built.mode, stamp, filterHash], "");
        // Wpis do historii nazw przy faktycznym pobraniu (source=download).
        // Pełna nazwa zawiera rozszerzenie aktualnego formatu (csv/zip).
        var ext = (format === "zip" || format === "zip-split") ? ".zip" : ".csv";
        pushExportHistory(baseName + ext, { source: "download", count: built.count });

        if (format === "zip" || format === "zip-split") {
          // Manifest z metadanymi, żeby konsument ZIPa wiedział JAK powstał
          // plik bez czytania nazwy: filtr, tryb, kontrakt sortowania,
          // liczba runów, kolumny. Pretty-printed dla diff-friendly.
          // Zakres wierszy: pierwszy/ostatni generatedAt z wyeksportowanego
          // zbioru (po stabilnym sortowaniu jak na wykresie). Pozwala
          // konsumentowi manifest.json zweryfikować bez parsowania CSV,
          // jaki przedział czasu pokrywa eksport oraz czy bieżący run
          // jest zawarty (lastIsCurrent).
          var firstRow = built.points && built.points[0];
          var lastRow = built.points && built.points[built.points.length - 1];
          var rowRange = built.count
            ? {
                firstGeneratedAt: (firstRow && firstRow.generatedAt) || null,
                lastGeneratedAt: (lastRow && lastRow.generatedAt) || null,
                firstIndex: 0,
                lastIndex: built.count - 1,
                lastIsCurrent: !!(lastRow && lastRow.isCurrent),
                includesCurrentRun: built.points.some(function (p) { return p.isCurrent; }),
              }
            : null;
          // Etykieta wariantu pliku w archiwum — wprost wyjaśnia, co siedzi
          // w środku (single CSV vs CSV+split single-series).
          var formatVariantLabel = format === "zip-split"
            ? "zip-split (full CSV + per-metric single-series CSVs)"
            : "zip (full CSV only)";
          var manifest = {
            generatedAt: new Date().toISOString(),
            source: "visual-snapshot-report (savings trends)",
            schemaMode: built.mode, // "subset" | "full"
            format: format,         // "zip" | "zip-split"
            formatVariant: formatVariantLabel,
            filter: built.state,    // dokładny snapshot wartości selectów
            rowRange: rowRange,
            rowsExported: built.count,
            rowsTotal: built.total,
            columns: built.headerCells,
            columnCount: built.colCount,
            missingColumnsAsEmpty: built.missingCount,
            sortContract: "generatedAt ASC, isCurrent last (matches sparkline order)",
            files: null, // wypełniamy poniżej, gdy znamy listę
          };
          var files = [
            { name: baseName + ".csv", text: built.csv },
          ];
          if (format === "zip-split" && built.splitCsvs) {
            Object.keys(built.splitCsvs).forEach(function (k) {
              files.push({ name: k, text: built.splitCsvs[k] });
            });
          }

          // Finalizator ZIPa: składa manifest (po dopisaniu opcjonalnych
          // PNG-ów ze sparkline'ów), buduje archiwum, ustawia pendingExport.
          // Wydzielony jako fn, żeby działać sync (zip) i async (zip-split).
          function finalizeZip(extraFiles) {
            if (extraFiles && extraFiles.length) {
              extraFiles.forEach(function (ef) { files.push(ef); });
            }
            // Lista plików (oprócz samego manifest.json) — pomaga w audycie
            // archiwum bez konieczności rozpakowywania ZIPa. Dla wpisów
            // binarnych (PNG) używamy bytes.length, dla tekstowych text.length.
            manifest.files = files.map(function (f) {
              var size = f.bytes ? f.bytes.length : (f.text ? f.text.length : 0);
              var entry = { name: f.name, sizeBytes: size };
              if (f.bytes) entry.kind = "binary";
              if (f.width && f.height) {
                entry.width = f.width;
                entry.height = f.height;
              }
              return entry;
            });
            files.push({ name: "metadata.json", text: JSON.stringify(manifest, null, 2) + "\n" });
            var zipBlob = buildZip(files);
            pendingExport = {
              blob: zipBlob,
              mime: "application/zip",
              filename: baseName + ".zip",
              count: built.count,
              total: built.total,
              mode: built.mode,
              colCount: built.colCount,
              missingCount: built.missingCount,
              format: format,
              fileCount: files.length,
            };
          }

          if (format === "zip-split") {
            // PNG-i sparkline'ów dorzucamy TYLKO w trybie split — bo to ten
            // wariant jest pomyślany pod „pełną paczkę do dalszej analizy"
            // (CSV-e per metryka + obrazki gotowe do wklejenia w raport).
            // Zwykly "zip" celowo zostaje minimalne (tylko CSV + metadata).
            if (exportStatus) exportStatus.textContent = "Renderuję PNG sparkline'ów…";
            snapshotSparkPngs().then(function (pngs) {
              finalizeZip(pngs);
              if (pendingExport) pendingExport.thresholdNote = thresholdNote;
              openPreviewOrDownload();
            }).catch(function () {
              // Nawet jeśli wszystkie PNG-i padną, eksport CSV-ów leci dalej.
              finalizeZip([]);
              if (pendingExport) pendingExport.thresholdNote = thresholdNote;
              openPreviewOrDownload();
            });
            return; // dialog otworzy się w callbacku
          }
          finalizeZip([]);
        } else {
          format = "csv";
          pendingExport = {
            csv: built.csv,
            filename: baseName + ".csv",
            count: built.count,
            total: built.total,
            mode: built.mode,
            colCount: built.colCount,
            missingCount: built.missingCount,
            format: "csv",
          };
        }

        // Otwarcie dialogu podglądu lub fallback do natychmiastowego download
        // (Safari < 15.4 bez <dialog>). Wydzielone, żeby async branch
        // (zip-split z PNG-ami) mógł zawołać dokładnie ten sam flow.
        function openPreviewOrDownload() {
          if (!previewDialog || typeof previewDialog.showModal !== "function") {
            downloadPending();
            if (exportStatus && exportStatus.textContent) {
              exportStatus.textContent += " (podgląd niedostępny w tej przeglądarce)";
            }
            pendingExport = null;
            return;
          }
          renderPreview(built);
          previewDialog.showModal();
          if (previewConfirm) previewConfirm.focus();
        }
        // Doklej notkę progową (suggest/switch) do pendingExport — pojawi się
        // w finalnym statusie „Pobrano …" obok nazwy pliku.
        if (pendingExport) pendingExport.thresholdNote = thresholdNote;
        if (typeof refreshZipHint === "function") refreshZipHint();
        // Async (zip-split z PNG-ami) sam zawoła openPreviewOrDownload —
        // wtedy pendingExport.thresholdNote jest podpinane w finalizeZip-callback.
        if (pendingExport) openPreviewOrDownload();
      });
    }
    if (previewCancel) {
      previewCancel.addEventListener("click", function () {
        if (previewDialog && previewDialog.open) previewDialog.close("cancel");
      });
    }
    if (previewConfirm) {
      previewConfirm.addEventListener("click", function () {
        downloadPending();
        if (previewDialog && previewDialog.open) previewDialog.close("confirm");
      });
    }
    // Kopia nazwy pliku z modala — równoważnik „⧉ Kopiuj nazwę" z paska
    // filtra, ale działa na nazwie zamrożonej w pendingExport (gwarancja
    // parytetu z faktycznym anchor.download). Dwa entry pointy: klik w
    // <code> i klik w przycisk obok — oba kopiują tę samą wartość i
    // dopisują wpis do historii (source=copy).
    function copyPreviewFilename(targetEl) {
      var name = previewFilenameValue && previewFilenameValue.textContent;
      if (!name) return;
      copyTextToClipboard(name).then(function (ok) {
        if (!ok) {
          if (exportStatus) exportStatus.textContent = "Nie udało się skopiować — nazwa: " + name;
          return;
        }
        if (targetEl) {
          targetEl.classList.add("is-copied");
          if (targetEl === previewFilenameCopy) targetEl.textContent = "✓";
          setTimeout(function () {
            targetEl.classList.remove("is-copied");
            if (targetEl === previewFilenameCopy) targetEl.textContent = "⧉";
          }, 1500);
        }
        if (exportStatus) exportStatus.textContent = "Skopiowano nazwę: " + name;
        try {
          var built = buildExportRows();
          pushExportHistory(name, { source: "copy", count: built && built.count });
        } catch (_e) { pushExportHistory(name, { source: "copy" }); }
      });
    }
    if (previewFilenameValue) {
      previewFilenameValue.addEventListener("click", function () { copyPreviewFilename(previewFilenameValue); });
      previewFilenameValue.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          copyPreviewFilename(previewFilenameValue);
        }
      });
    }
    if (previewFilenameCopy) {
      previewFilenameCopy.addEventListener("click", function () { copyPreviewFilename(previewFilenameCopy); });
    }
    if (previewDialog) {
      // Klik w backdrop (poza zawartością) → zamknij. <dialog> sam tego nie
      // robi — sprawdzamy czy target == sam dialog (nie potomek).
      previewDialog.addEventListener("click", function (e) {
        if (e.target === previewDialog) previewDialog.close("backdrop");
      });
      previewDialog.addEventListener("close", function () {
        // Po zamknięciu (z dowolnego powodu) zwolnij payload, żeby kolejny
        // klik „Podgląd" zawsze miał fresh build.
        pendingExport = null;
      });
    }

    apply();
  })();
  </script>

</body>
</html>`;
};

const main = async () => {
  const {
    maxFailures,
    maxCopy,
    maxDiscovery,
    maxPerViewport,
    maxPerState,
    sort: sortRaw,
    history: historyRaw,
    noHistory,
  } = parseCliArgs(process.argv);

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

  // Fail-fast (poziom 0): kapowanie per-grupę PRZED globalnym --max-failures.
  // Cel: gdy mamy 400 regresji w mobile + 5 w tablet, samo --max-failures=50
  // mogłoby całkowicie zjeść tablet (utrata małej, ale ważnej grupy).
  // Algorytm: dla każdej grupy (viewport / state) zostawiamy pierwsze N
  // (zgodnie z aktualnym sortowaniem). Reszta wpada do `omittedByGroup`,
  // żeby renderHtml mógł pokazać dokładnie co i z jakiego powodu wypadło.
  // Sortowanie WEWNĄTRZ grupy jest zachowane bo iterujemy po `allFailed`
  // które już jest posortowane przez `buildComparator`.
  const omittedByGroup = []; // [{ trio, reason: "viewport"|"state", group: "mobile"|... }]
  let perGroupFiltered = allFailed;

  const applyPerGroupCap = (input, getKey, limit, reasonLabel) => {
    if (limit === null) return input;
    const counts = new Map();
    const kept = [];
    for (const t of input) {
      const k = getKey(t);
      const cur = counts.get(k) || 0;
      if (cur < limit) {
        counts.set(k, cur + 1);
        kept.push(t);
      } else {
        omittedByGroup.push({ trio: t, reason: reasonLabel, group: k, limit });
      }
    }
    return kept;
  };

  perGroupFiltered = applyPerGroupCap(
    perGroupFiltered,
    (t) => t._viewport,
    maxPerViewport,
    "viewport",
  );
  perGroupFiltered = applyPerGroupCap(
    perGroupFiltered,
    (t) => t._state,
    maxPerState,
    "state",
  );

  if (maxPerViewport !== null && perGroupFiltered.length < allFailed.length) {
    const dropped = allFailed.length - perGroupFiltered.length;
    console.log(
      `[visual-snapshot-report] ⚠ Per-grupa: po --max-failures-per-viewport=${maxPerViewport} ` +
        `i --max-failures-per-state=${maxPerState ?? "∞"} zostało ${perGroupFiltered.length} ` +
        `z ${allFailed.length} trio (odrzucono ${dropped}).`,
    );
  } else if (maxPerState !== null && perGroupFiltered.length < allFailed.length) {
    const dropped = allFailed.length - perGroupFiltered.length;
    console.log(
      `[visual-snapshot-report] ⚠ Per-grupa: po --max-failures-per-state=${maxPerState} ` +
        `zostało ${perGroupFiltered.length} z ${allFailed.length} trio (odrzucono ${dropped}).`,
    );
  }

  // Fail-fast (poziom 1): obetnij globalnie PRZED dalszą obróbką.
  // Wszystko poza tym slice'em w ogóle nie wchodzi do raportu.
  // UWAGA: pracujemy na `perGroupFiltered`, więc --max-failures działa NA WIERZCHU
  // per-group cap (najpierw balansujemy, potem ograniczamy globalnie).
  const truncatedBy = maxFailures !== null && perGroupFiltered.length > maxFailures;
  const failed = truncatedBy ? perGroupFiltered.slice(0, maxFailures) : perGroupFiltered;

  if (truncatedBy) {
    console.log(
      `[visual-snapshot-report] ⚠ Fail-fast: ${perGroupFiltered.length} trio po per-grupa cap, ` +
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
  // Liczniki realnie wykonanej pracy (do raportu w konsoli).
  // - pngCopied  → faktyczne fs.copyFile (max 3 per trio, ale skipowane gdy
  //   plik nie istnieje, więc nie używamy `copyLimit*3`).
  // - discoveryRuns → faktyczne wywołania discoverPlaywrightArtifacts.
  // Baseline (co zrobilibyśmy bez ŻADNYCH limitów) liczymy osobno na
  // `allFailed`, żeby pokazać "ile zaoszczędziłeś" niezależnie który limit
  // (per-grupa, --max-failures, --max-copy, --max-discovery) to spowodował.
  let pngCopied = 0;
  let discoveryRuns = 0;

  for (let i = 0; i < failed.length; i++) {
    const t = failed[i];
    const prefix = `${i.toString().padStart(3, "0")}-${t.stem}`;

    if (i < copyLimit) {
      if (t.expected) { t.expectedAsset = await copyAsset(t.expected, prefix, "expected"); pngCopied++; }
      if (t.actual) { t.actualAsset = await copyAsset(t.actual, prefix, "actual"); pngCopied++; }
      if (t.diff) { t.diffAsset = await copyAsset(t.diff, prefix, "diff"); pngCopied++; }
    } else {
      // Placeholder mode: nie kopiujemy obrazków, ale flagujemy żeby cell()
      // pokazał czytelny komunikat zamiast "brak baseline'u".
      t.copySkipped = true;
    }

    if (i < discoveryLimit) {
      const artifacts = await discoverPlaywrightArtifacts(t.dir);
      discoveryRuns++;
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

  // Baseline — co byśmy zrobili bez żadnych limitów (czyli bez per-grupa,
  // bez --max-failures, bez --max-copy, bez --max-discovery).
  // Liczymy realnie istniejące pliki w trio, żeby porównanie było uczciwe
  // (nie wszystkie trio mają komplet 3 PNG — incomplete też wpada do allFailed).
  let pngBaseline = 0;
  for (const t of allFailed) {
    if (t.expected) pngBaseline++;
    if (t.actual) pngBaseline++;
    if (t.diff) pngBaseline++;
  }
  const discoveryBaseline = allFailed.length;
  const pngSaved = pngBaseline - pngCopied;
  const discoverySaved = discoveryBaseline - discoveryRuns;

  const playwrightReportRel = await discoverPlaywrightReport();

  // Trendy: wczytujemy istniejący history.csv (jeśli jest) PRZED renderem
  // index.html. Append nowego wiersza zachodzi POŹNIEJ — w tym renderze widać
  // historyczne runy + bieżący jako ostatnia kropka (oznaczona "now").
  // Resolver ścieżki history.csv MUSI być zgodny z logiką append na końcu skryptu.
  const pctLocal = (saved, baseline) =>
    baseline > 0 ? Math.round((saved / baseline) * 1000) / 10 : 0;
  // Komenda + flagi bieżącego runu — IDENTYCZNA logika jak przy zapisie do
  // savings.csv/history.csv (patrz `csvRow` niżej), żeby UI filtra trendów
  // pokazywał tę samą wartość, która zostanie zapisana w historii.
  const flagToStr = (v) => (v === null || v === undefined ? "" : String(v));
  const trendsCommandStr = [
    path.basename(process.argv[0] ?? "node"),
    ...process.argv.slice(1).map((a) => path.basename(a) === a ? a : path.relative(PROJECT_ROOT, a) || a),
  ].join(" ");
  const trendsCurrentFlags = {
    flag_max_failures: flagToStr(maxFailures),
    flag_max_per_viewport: flagToStr(maxPerViewport),
    flag_max_per_state: flagToStr(maxPerState),
    flag_max_copy: flagToStr(maxCopy),
    flag_max_discovery: flagToStr(maxDiscovery),
    flag_no_history: noHistory ? "true" : "false",
    flag_history_path: flagToStr(historyRaw ?? ""),
  };
  const trendsData = await loadTrendsHistory({
    historyRaw,
    noHistory,
    currentRun: {
      generatedAt: new Date().toISOString(),
      png: pctLocal(pngSaved, pngBaseline),
      discovery: pctLocal(discoverySaved, discoveryBaseline),
      command: trendsCommandStr,
      flags: trendsCurrentFlags,
    },
  });


  const html = renderHtml({
    trios: failed,
    generatedAt: new Date().toISOString(),
    totalFailures: failed.length,
    playwrightReportRel,
    // truncation: agregat WSZYSTKICH powodów obcięcia (per-grupa + globalny).
    // Pokazujemy w raporcie jedną sekcję "omitted", w której każdy wiersz
    // ma `reason` ("viewport"/"state"/"max-failures") + dodatkowe info
    // (limit + ew. nazwa grupy), żeby user wiedział DLACZEGO to wypadło.
    truncation: (() => {
      const omitted = [];
      // Per-grupa: trio odrzucone w applyPerGroupCap (ma już .reason/.group/.limit).
      for (const o of omittedByGroup) {
        omitted.push({
          stem: o.trio.stem,
          viewport: o.trio._viewport,
          state: o.trio._state,
          testName: o.trio.testName,
          reason: o.reason, // "viewport" | "state"
          group: o.group,
          limit: o.limit,
        });
      }
      // Globalny --max-failures: trio z `perGroupFiltered` po pozycji maxFailures.
      if (truncatedBy) {
        for (const t of perGroupFiltered.slice(maxFailures)) {
          omitted.push({
            stem: t.stem,
            viewport: t._viewport,
            state: t._state,
            testName: t.testName,
            reason: "max-failures",
            group: null,
            limit: maxFailures,
          });
        }
      }
      if (omitted.length === 0) return null;
      return {
        shown: failed.length,
        total: allFailed.length,
        limit: maxFailures, // może być null gdy obcinanie szło tylko per-grupą
        perViewportLimit: maxPerViewport,
        perStateLimit: maxPerState,
        omitted,
      };
    })(),
    copyTruncation:
      maxCopy !== null && failed.length > maxCopy
        ? { processed: copyLimit, total: failed.length, limit: maxCopy }
        : null,
    discoveryTruncation:
      maxDiscovery !== null && failed.length > maxDiscovery
        ? { processed: discoveryLimit, total: failed.length, limit: maxDiscovery }
        : null,
    trends: trendsData, // null gdy brak history lub --no-history
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

  // Raport oszczędności pracy. Pokazujemy TYLKO gdy faktycznie coś zostało
  // pominięte — bez limitów (saved == 0) nie spamujemy konsoli zerami.
  // % liczymy względem baseline (co byłoby zrobione bez limitów), żeby user
  // od razu widział "60% mniej IO" zamiast surowych liczb. Dla bardzo małych
  // baselinów (np. 3 PNG) % byłby mylący, więc poniżej 10 pokazujemy tylko liczby.
  if (pngSaved > 0 || discoverySaved > 0) {
    const formatSaved = (saved, baseline, label) => {
      if (saved === 0) return null;
      const pct = baseline >= 10 ? ` (${Math.round((saved / baseline) * 100)}%)` : "";
      return `${saved} mniej ${label}${pct}`;
    };
    const savings = [
      formatSaved(pngSaved, pngBaseline, `PNG copy: ${pngCopied}/${pngBaseline}`),
      formatSaved(discoverySaved, discoveryBaseline, `discovery readdir: ${discoveryRuns}/${discoveryBaseline}`),
    ].filter(Boolean);
    console.log(`[visual-snapshot-report] 💾 Oszczędność: ${savings.join(", ")}.`);

    // Szczegółowy breakdown — dokładne liczby baseline / limitów / processed,
    // żeby w logach CI dało się policzyć "ile IO zostało zaoszczędzone względem
    // pełnego scenariusza bez limitów". Bez tego user widzi tylko delty,
    // a nie wie, jakie limity je wywołały i jakie były punkty odniesienia.
    const fmtLimit = (v) => (v === null || v === undefined ? "∞" : String(v));
    const trioBaseline = allFailed.length;
    const trioRendered = failed.length;
    const trioSaved = trioBaseline - trioRendered;

    console.log(
      `[visual-snapshot-report]   ├─ trio: baseline=${trioBaseline} (allFailed.length), ` +
        `rendered=${trioRendered}, saved=${trioSaved} | limity: ` +
        `--max-failures=${fmtLimit(maxFailures)}, ` +
        `--max-failures-per-viewport=${fmtLimit(maxPerViewport)}, ` +
        `--max-failures-per-state=${fmtLimit(maxPerState)}`,
    );
    console.log(
      `[visual-snapshot-report]   ├─ PNG copy: baseline=${pngBaseline} (suma expected+actual+diff z allFailed), ` +
        `processed=${pngCopied}, saved=${pngSaved} | limit: --max-copy=${fmtLimit(maxCopy)} ` +
        `(copyLimit=${copyLimit}/${trioRendered} trio)`,
    );
    console.log(
      `[visual-snapshot-report]   └─ discovery readdir: baseline=${discoveryBaseline} (allFailed.length), ` +
        `processed=${discoveryRuns}, saved=${discoverySaved} | limit: --max-discovery=${fmtLimit(maxDiscovery)} ` +
        `(discoveryLimit=${discoveryLimit}/${trioRendered} trio)`,
    );

    // Atrybucja per-flaga — rozbicie ŁĄCZNYCH oszczędności (pngSaved/discoverySaved)
    // na etapy pipeline'u, w kolejności w jakiej działają:
    //   1a. --max-failures-per-viewport / --max-failures-per-state — proporcjonalne
    //       kapowanie per grupa. Drop = `allFailed - perGroupFiltered`.
    //   1b. --max-failures — globalny limit na wynik z 1a. Drop = `perGroupFiltered - failed`.
    //   2.  --max-copy — wśród `failed` (trio które przeżyły) skipuje PNG copy
    //       dla trio[i] gdy i >= copyLimit. Oszczędza TYLKO PNG.
    //   3.  --max-discovery — wśród `failed` skipuje readdir dla trio[i] gdy
    //       i >= discoveryLimit. Oszczędza TYLKO readdir.
    // Suma sekcji = pngSaved + discoverySaved (sanity check w logach).
    const renderedSet = new Set(failed.map((t) => t.stem + "::" + t.dir));
    const skipped = allFailed.filter((t) => !renderedSet.has(t.stem + "::" + t.dir));

    const countPngs = (trios) => {
      let n = 0;
      for (const t of trios) {
        if (t.expected) n++;
        if (t.actual) n++;
        if (t.diff) n++;
      }
      return n;
    };

    // 1a. Per-grupa: trio z `omittedByGroup` (struktura { trio, reason, group, limit }).
    //     Te trio NIGDY nie weszły do `perGroupFiltered`, więc oszczędziły zarówno
    //     PNG copy jak i readdir. Reason mówi DOKŁADNIE która flaga (viewport vs state).
    const perGroupTrios = omittedByGroup.map((o) => o.trio);
    const pngSavedByPerGroup = countPngs(perGroupTrios);
    const discoverySavedByPerGroup = perGroupTrios.length;

    // 1b. --max-failures: trio z `perGroupFiltered.slice(maxFailures)`. Czyli
    //     przeżyły per-grupa ale wyleciały na globalnym limicie.
    const maxFailuresTrios =
      maxFailures !== null && perGroupFiltered.length > maxFailures
        ? perGroupFiltered.slice(maxFailures)
        : [];
    const pngSavedByMaxFailures = countPngs(maxFailuresTrios);
    const discoverySavedByMaxFailures = maxFailuresTrios.length;

    // 2. --max-copy
    const pngSavedByMaxCopy = countPngs(failed.slice(copyLimit));

    // 3. --max-discovery
    const discoverySavedByMaxDiscovery = Math.max(0, failed.length - discoveryLimit);

    const fmtSection = (label, flag, png, discovery) => {
      const parts = [];
      if (png > 0) parts.push(`PNG: ${png}`);
      if (discovery > 0) parts.push(`readdir: ${discovery}`);
      const summary = parts.length > 0 ? parts.join(", ") : "0 (flaga nieaktywna lub bez efektu)";
      return `${label} (${flag}): ${summary}`;
    };

    // Per-group breakdown — rozbicie 1a na viewport vs state, żeby user widział
    // który konkretnie limit per-grupa wyrzucił trio (a nie ogólnie "per-grupa").
    const perGroupByReason = { viewport: 0, state: 0 };
    for (const o of omittedByGroup) {
      perGroupByReason[o.reason] = (perGroupByReason[o.reason] ?? 0) + 1;
    }
    const perGroupReasonParts = [];
    if (perGroupByReason.viewport > 0)
      perGroupReasonParts.push(`viewport=${perGroupByReason.viewport}`);
    if (perGroupByReason.state > 0)
      perGroupReasonParts.push(`state=${perGroupByReason.state}`);
    const perGroupFlag =
      `--max-failures-per-viewport=${fmtLimit(maxPerViewport)}, ` +
      `--max-failures-per-state=${fmtLimit(maxPerState)}` +
      (perGroupReasonParts.length > 0 ? ` → ${perGroupReasonParts.join(", ")}` : "");

    console.log(`[visual-snapshot-report] 📊 Atrybucja oszczędności per-flaga:`);
    console.log(
      `[visual-snapshot-report]   ├─ ${fmtSection(
        "[1a] Per-grupa truncation",
        perGroupFlag,
        pngSavedByPerGroup,
        discoverySavedByPerGroup,
      )}`,
    );
    console.log(
      `[visual-snapshot-report]   ├─ ${fmtSection(
        "[1b] Global truncation",
        `--max-failures=${fmtLimit(maxFailures)}`,
        pngSavedByMaxFailures,
        discoverySavedByMaxFailures,
      )}`,
    );
    console.log(
      `[visual-snapshot-report]   ├─ ${fmtSection(
        "[2] PNG cap",
        `--max-copy=${fmtLimit(maxCopy)}`,
        pngSavedByMaxCopy,
        0,
      )}`,
    );
    console.log(
      `[visual-snapshot-report]   └─ ${fmtSection(
        "[3] Discovery cap",
        `--max-discovery=${fmtLimit(maxDiscovery)}`,
        0,
        discoverySavedByMaxDiscovery,
      )}`,
    );

    // Dominujący mechanizm — najszybszy sygnał "co tu obcięło robotę". Liczymy
    // łączny zysk IO (PNG + readdir) per sekcja i wskazujemy lidera. Często user
    // chce wiedzieć: "to per-grupa zaoszczędziła czy globalny --max-failures?".
    const sections = [
      { name: "[1a] Per-grupa", io: pngSavedByPerGroup + discoverySavedByPerGroup },
      { name: "[1b] --max-failures", io: pngSavedByMaxFailures + discoverySavedByMaxFailures },
      { name: "[2] --max-copy", io: pngSavedByMaxCopy },
      { name: "[3] --max-discovery", io: discoverySavedByMaxDiscovery },
    ].filter((s) => s.io > 0);
    if (sections.length > 0) {
      sections.sort((a, b) => b.io - a.io);
      const totalIo = sections.reduce((sum, s) => sum + s.io, 0);
      const top = sections[0];
      const pct = totalIo >= 10 ? ` (${Math.round((top.io / totalIo) * 100)}%)` : "";
      console.log(
        `[visual-snapshot-report]   ▶ Dominujący mechanizm: ${top.name} → ${top.io} ops zaoszczędzonych${pct}.`,
      );
    }

    // Sanity check — suma sekcji MUSI się zgadzać z totalami. Jeśli się
    // rozjedzie, znaczy że logika atrybucji złapała regresję (nowy limit?).
    const pngSumCheck = pngSavedByPerGroup + pngSavedByMaxFailures + pngSavedByMaxCopy;
    const discoverySumCheck =
      discoverySavedByPerGroup + discoverySavedByMaxFailures + discoverySavedByMaxDiscovery;
    if (pngSumCheck !== pngSaved || discoverySumCheck !== discoverySaved) {
      console.warn(
        `[visual-snapshot-report] ⚠ Atrybucja niespójna: ` +
          `suma sekcji PNG=${pngSumCheck} vs total=${pngSaved}, ` +
          `readdir=${discoverySumCheck} vs total=${discoverySaved}.`,
      );
    }

    // Top 3 najwięcej oszczędzonych trio — czyli te, które wpadły do allFailed,
    // ale NIE do `failed` (zostały obcięte przez per-grupa lub --max-failures).
    // Ranking po liczbie PNG (expected+actual+diff) — to one ważą najwięcej w IO.
    // Tie-break: stem alfabetycznie (deterministyczny output dla CI snapshotów).
    if (skipped.length > 0) {
      const ranked = skipped
        .map((t) => ({
          trio: t,
          pngCount: (t.expected ? 1 : 0) + (t.actual ? 1 : 0) + (t.diff ? 1 : 0),
        }))
        .sort((a, b) => b.pngCount - a.pngCount || a.trio.stem.localeCompare(b.trio.stem))
        .slice(0, 3);

      console.log(
        `[visual-snapshot-report] 🏆 Top ${ranked.length} oszczędzonych trio (z ${skipped.length} pominiętych):`,
      );
      ranked.forEach((r, i) => {
        const prefix = i === ranked.length - 1 ? "└─" : "├─";
        const folder = path.relative(PROJECT_ROOT, r.trio.dir) || ".";
        console.log(
          `[visual-snapshot-report]   ${prefix} #${i + 1} ${r.trio.stem} ` +
            `(${r.pngCount} PNG + 1 readdir) — ${folder}`,
        );
      });
    }
  }

  // Persystencja podsumowania oszczędności do JSON+CSV — niezależnie od tego,
  // czy coś zostało zaoszczędzone (zera też się liczą dla trend analysis między
  // runami w CI). JSON = pełny strukturalny dump (per-flaga atrybucja, top trios),
  // CSV = jeden wiersz z agregatami (łatwe do append'owania do historii w CI:
  // `cat new-savings.csv | tail -n +2 >> history.csv`).
  // Liczone PONOWNIE tutaj, żeby działało nawet gdy `if (pngSaved > 0)` powyżej
  // się nie wykonał (zero savings → JSON nadal opisuje stan "no truncation").
  const trioBaselineJson = allFailed.length;
  const trioRenderedJson = failed.length;
  const renderedSetJson = new Set(failed.map((t) => t.stem + "::" + t.dir));
  const skippedJson = allFailed.filter((t) => !renderedSetJson.has(t.stem + "::" + t.dir));
  const countPngsJson = (trios) => {
    let n = 0;
    for (const t of trios) {
      if (t.expected) n++;
      if (t.actual) n++;
      if (t.diff) n++;
    }
    return n;
  };
  const perGroupTriosJson = omittedByGroup.map((o) => o.trio);
  const maxFailuresTriosJson =
    maxFailures !== null && perGroupFiltered.length > maxFailures
      ? perGroupFiltered.slice(maxFailures)
      : [];
  const perGroupByReasonJson = { viewport: 0, state: 0 };
  for (const o of omittedByGroup) {
    perGroupByReasonJson[o.reason] = (perGroupByReasonJson[o.reason] ?? 0) + 1;
  }
  const pct = (saved, baseline) =>
    baseline > 0 ? Math.round((saved / baseline) * 1000) / 10 : 0; // 1 miejsce po przecinku

  // Per-grupa metryki (viewport + state). Każda grupa dostaje pełny shape:
  // { trio, png, discovery } z baseline/processed/saved/savedPct.
  // Wyniki używamy w 3 miejscach:
  //   1. savingsSummary.byGroup → savings.json (sekcja do programatycznej analizy)
  //   2. savings-by-viewport.csv / savings-by-state.csv (1 wiersz per grupa, append-friendly)
  //   3. history-by-viewport.csv / history-by-state.csv (auto-append per run)
  const byViewport = aggregateSavingsByGroup({
    allFailed, rendered: failed, copyLimit, discoveryLimit,
    keyFn: (t) => t._viewport,
  });
  const byState = aggregateSavingsByGroup({
    allFailed, rendered: failed, copyLimit, discoveryLimit,
    keyFn: (t) => t._state,
  });

  const savingsSummary = {
    schemaVersion: 2, // bump: dodano `byGroup`
    generatedAt: new Date().toISOString(),
    limits: {
      maxFailures: maxFailures,
      maxFailuresPerViewport: maxPerViewport,
      maxFailuresPerState: maxPerState,
      maxCopy: maxCopy,
      maxDiscovery: maxDiscovery,
    },
    trio: {
      baseline: trioBaselineJson,
      rendered: trioRenderedJson,
      saved: trioBaselineJson - trioRenderedJson,
      savedPct: pct(trioBaselineJson - trioRenderedJson, trioBaselineJson),
    },
    pngCopy: {
      baseline: pngBaseline,
      processed: pngCopied,
      saved: pngSaved,
      savedPct: pct(pngSaved, pngBaseline),
    },
    discoveryReaddir: {
      baseline: discoveryBaseline,
      processed: discoveryRuns,
      saved: discoverySaved,
      savedPct: pct(discoverySaved, discoveryBaseline),
    },
    attribution: {
      perGroup: {
        flag: { maxPerViewport, maxPerState },
        byReason: perGroupByReasonJson,
        pngSaved: countPngsJson(perGroupTriosJson),
        discoverySaved: perGroupTriosJson.length,
      },
      maxFailures: {
        flag: { maxFailures },
        pngSaved: countPngsJson(maxFailuresTriosJson),
        discoverySaved: maxFailuresTriosJson.length,
      },
      maxCopy: {
        flag: { maxCopy },
        pngSaved: countPngsJson(failed.slice(copyLimit)),
        discoverySaved: 0,
      },
      maxDiscovery: {
        flag: { maxDiscovery },
        pngSaved: 0,
        discoverySaved: Math.max(0, failed.length - discoveryLimit),
      },
    },
    topSkippedTrios: skippedJson
      .map((t) => ({
        stem: t.stem,
        folder: path.relative(PROJECT_ROOT, t.dir) || ".",
        viewport: t._viewport,
        state: t._state,
        pngCount: (t.expected ? 1 : 0) + (t.actual ? 1 : 0) + (t.diff ? 1 : 0),
      }))
      .sort((a, b) => b.pngCount - a.pngCount || a.stem.localeCompare(b.stem))
      .slice(0, 10), // 10 (nie 3) — w JSON więcej kontekstu się przyda do analizy
    byGroup: {
      // Agregaty per-grupa do analizy "która grupa najwięcej oszczędza".
      // Klucz mapy = wartość zwracana przez parseSnapshotName (slugi).
      viewport: byViewport,
      state: byState,
    },
  };

  const savingsJsonPath = path.join(REPORT_DIR, "savings.json");
  await fs.writeFile(savingsJsonPath, JSON.stringify(savingsSummary, null, 2), "utf8");

  // CSV: header + jeden wiersz. Schema flat (bez nestingu) żeby spreadsheet/duckdb
  // mogły to czytać bez gimnastyki. Kolejność kolumn STABILNA — append do history
  // wymaga tej samej kolejności między runami.
  // Schema kolumn — patrz module-level SAVINGS_CSV_COLUMNS. Trzymamy alias
  // `csvCols` lokalnie żeby zminimalizować zmiany w istniejącym kodzie zapisu.
  const csvCols = SAVINGS_CSV_COLUMNS;
  const limitCsv = (v) => (v === null || v === undefined ? "" : String(v));
  /**
   * RFC 4180 CSV escape: jeśli wartość zawiera `,`, `"`, `\n` lub `\r`,
   * zawijamy w cudzysłowy i podwajamy wewnętrzne `"`. Wszystkie pozostałe
   * kolumny (numeryczne, ISO timestamp) są bezpieczne bez escape.
   */
  const csvEscape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Komenda: argv[0]=node binary path → tylko basename, reszta as-is.
  // Daje czytelne "node visual-snapshot-report.mjs --max-copy=200" zamiast
  // pełnej ścieżki /usr/local/bin/node.
  const commandStr = [
    path.basename(process.argv[0] ?? "node"),
    ...process.argv.slice(1).map((a) => path.basename(a) === a ? a : path.relative(PROJECT_ROOT, a) || a),
  ].join(" ");
  const csvRow = [
    savingsSummary.generatedAt,
    savingsSummary.trio.baseline,
    savingsSummary.trio.rendered,
    savingsSummary.trio.saved,
    savingsSummary.trio.savedPct,
    savingsSummary.pngCopy.baseline,
    savingsSummary.pngCopy.processed,
    savingsSummary.pngCopy.saved,
    savingsSummary.pngCopy.savedPct,
    savingsSummary.discoveryReaddir.baseline,
    savingsSummary.discoveryReaddir.processed,
    savingsSummary.discoveryReaddir.saved,
    savingsSummary.discoveryReaddir.savedPct,
    limitCsv(maxFailures),
    limitCsv(maxPerViewport),
    limitCsv(maxPerState),
    limitCsv(maxCopy),
    limitCsv(maxDiscovery),
    savingsSummary.attribution.perGroup.pngSaved,
    savingsSummary.attribution.perGroup.discoverySaved,
    savingsSummary.attribution.maxFailures.pngSaved,
    savingsSummary.attribution.maxFailures.discoverySaved,
    savingsSummary.attribution.maxCopy.pngSaved,
    savingsSummary.attribution.maxDiscovery.discoverySaved,
    // Run context — duplikujemy limit_* w nowych kolumnach `flag_*` żeby
    // semantycznie oddzielić "metric" od "input parameter" (limit_* zostają
    // dla kompatybilności wstecz z istniejącymi history.csv).
    limitCsv(maxFailures),
    limitCsv(maxPerViewport),
    limitCsv(maxPerState),
    limitCsv(maxCopy),
    limitCsv(maxDiscovery),
    noHistory ? "true" : "false",
    csvEscape(historyRaw ?? ""),
    csvEscape(commandStr),
    csvEscape(process.version),
    csvEscape(path.basename(PROJECT_ROOT)),
  ];
  const savingsCsvPath = path.join(REPORT_DIR, "savings.csv");
  const headerLine = csvCols.join(",");
  const dataLine = csvRow.join(",");
  await fs.writeFile(
    savingsCsvPath,
    `${headerLine}\n${dataLine}\n`,
    "utf8",
  );

  /**
   * Walidacja schematu CSV: porównuje pierwszą linię świeżo zapisanego pliku
   * z oczekiwanymi kolumnami (count + kolejność). Wykrywa:
   *  - mismatch liczby kolumn (np. dodano/usunięto kolumnę bez bumpa schemaVersion)
   *  - zmianę kolejności (breaking change dla append do history.csv)
   *  - mismatch szerokości wiersza danych (header vs row column count)
   * Zwraca `true` gdy OK; loguje warn i zwraca `false` gdy schema się rozjechał.
   */
  const validateCsvSchema = async (filePath, expectedCols, { dataRowCount } = {}) => {
    const rel = path.relative(PROJECT_ROOT, filePath);
    let contents;
    try {
      contents = await fs.readFile(filePath, "utf8");
    } catch (err) {
      console.warn(`[visual-snapshot-report] ⚠ Schema check ${rel}: nie mogę odczytać (${err.message}).`);
      return false;
    }
    const lines = contents.split("\n").filter((l) => l.length > 0);
    const headerCells = splitCsvRow(lines[0] ?? "");
    const issues = [];
    if (headerCells.length !== expectedCols.length) {
      issues.push(
        `liczba kolumn ${headerCells.length} ≠ oczekiwane ${expectedCols.length}`,
      );
    }
    // Set-based diff: które kolumny brakują (są w schemacie, ale nie ma ich
    // w pliku) i które są nadmiarowe (są w pliku, ale schemat ich nie zna).
    // Pomaga wskazać dokładnie nową kolumnę dodaną w nowej wersji skryptu,
    // której brakuje w starszym pliku, oraz odwrotnie.
    const expectedSet = new Set(expectedCols);
    const actualSet = new Set(headerCells);
    const missingCols = expectedCols.filter((c) => !actualSet.has(c));
    const unexpectedCols = headerCells.filter((c) => !expectedSet.has(c));
    if (missingCols.length > 0) {
      issues.push(
        `brakujące kolumny (${missingCols.length}): ${missingCols.slice(0, 8).join(", ")}${missingCols.length > 8 ? ` (+${missingCols.length - 8})` : ""}`,
      );
    }
    if (unexpectedCols.length > 0) {
      issues.push(
        `nadmiarowe kolumny (${unexpectedCols.length}): ${unexpectedCols.slice(0, 8).join(", ")}${unexpectedCols.length > 8 ? ` (+${unexpectedCols.length - 8})` : ""}`,
      );
    }
    // Pozycyjna diff (ważna dla append do history.csv — kolejność musi się zgadzać).
    const orderMismatches = [];
    const maxLen = Math.max(headerCells.length, expectedCols.length);
    for (let i = 0; i < maxLen; i++) {
      if (headerCells[i] !== expectedCols[i]) {
        orderMismatches.push(`#${i}: "${headerCells[i] ?? "<brak>"}" ≠ "${expectedCols[i] ?? "<brak>"}"`);
      }
    }
    // Jeśli zestawy są równe, ale kolejność inna → to jest reorder (najczęstszy
    // breaking change dla append-friendly CSV). Komunikat wyróżniamy osobno.
    const sameSet =
      missingCols.length === 0 &&
      unexpectedCols.length === 0 &&
      headerCells.length === expectedCols.length;
    if (orderMismatches.length > 0) {
      const label = sameSet ? "REORDER nagłówków" : "kolejność nagłówków";
      issues.push(
        `${label}: ${orderMismatches.slice(0, 5).join("; ")}${orderMismatches.length > 5 ? ` (+${orderMismatches.length - 5})` : ""}`,
      );
    }
    if (typeof dataRowCount === "number") {
      const actualData = lines.length - 1;
      if (actualData !== dataRowCount) {
        issues.push(`liczba wierszy danych ${actualData} ≠ oczekiwane ${dataRowCount}`);
      }
      // Sprawdź szerokość każdego wiersza — pomaga wykryć przecinki w polach
      // albo desync między csvCols a csvRow w kodzie. Używamy module-level
      // `splitCsvRow` (RFC 4180-aware), współdzielonego z trendsem historii.

      for (let i = 1; i < lines.length; i++) {
        const cells = splitCsvRow(lines[i]);
        if (cells.length !== expectedCols.length) {
          issues.push(`wiersz #${i}: ${cells.length} kolumn ≠ ${expectedCols.length}`);
          break;
        }
      }
    }
    if (issues.length > 0) {
      // Side-by-side diff nagłówków: indeks | actual | expected | mark.
      // Pomaga od razu zlokalizować kolumnę, która "rozjechała" schemat.
      const diffMaxLen = Math.max(headerCells.length, expectedCols.length);
      const diffRows = [];
      const colWidth = (arr) => Math.max(8, ...arr.map((s) => (s ?? "").length));
      const wActual = colWidth(headerCells);
      const wExpected = colWidth(expectedCols);
      for (let i = 0; i < diffMaxLen; i++) {
        const a = headerCells[i] ?? "<brak>";
        const e = expectedCols[i] ?? "<brak>";
        const mark = a === e ? "  " : "≠ ";
        diffRows.push(
          `   ${String(i).padStart(3)} | ${a.padEnd(wActual)} | ${e.padEnd(wExpected)} ${mark}`,
        );
      }
      const headerLineForDiff =
        `   ${"idx".padStart(3)} | ${"actual".padEnd(wActual)} | ${"expected".padEnd(wExpected)}`;
      const sepLine =
        `   ${"---".padStart(3)} | ${"-".repeat(wActual)} | ${"-".repeat(wExpected)}`;
      // Limit diffu do 40 wierszy, żeby nie zaśmiecać konsoli przy dużych schemach.
      const diffPreview = diffRows.slice(0, 40);
      const diffSuffix =
        diffRows.length > 40 ? `\n   … (+${diffRows.length - 40} więcej)` : "";
      console.warn(
        `[visual-snapshot-report] ⚠ Schema mismatch w ${rel} — format zmienił się między wersjami:\n` +
          issues.map((i) => `   • ${i}`).join("\n") +
          `\n   diff nagłówków:\n${headerLineForDiff}\n${sepLine}\n${diffPreview.join("\n")}${diffSuffix}` +
          `\n   → bump schemaVersion w savings.json i zarchiwizuj stare CSV przed kolejnym runem.`,
      );
      return false;
    }
    return true;
  };

  await validateCsvSchema(savingsCsvPath, csvCols, { dataRowCount: 1 });

  // Per-grupa CSV (1 wiersz per grupa). Schema flat — analog savings.csv,
  // ale dla pojedynczej grupy (viewport albo state). Ułatwia DuckDB query
  // typu "która grupa najmocniej oszczędziła w ostatnim tygodniu".
  const groupCsvCols = [
    "generatedAt",
    "group_kind",   // "viewport" | "state"
    "group",        // np. "mobile", "tablet", "state-a"
    "trio_baseline",
    "trio_rendered",
    "trio_saved",
    "trio_saved_pct",
    "png_baseline",
    "png_processed",
    "png_saved",
    "png_saved_pct",
    "discovery_baseline",
    "discovery_processed",
    "discovery_saved",
    "discovery_saved_pct",
  ];
  const groupHeaderLine = groupCsvCols.join(",");
  const buildGroupRows = (kind, byMap) =>
    Object.entries(byMap)
      .sort((a, b) => a[0].localeCompare(b[0])) // stabilna kolejność grup
      .map(([k, m]) =>
        [
          savingsSummary.generatedAt,
          kind,
          k,
          m.trio.baseline, m.trio.rendered, m.trio.saved, m.trio.savedPct,
          m.png.baseline, m.png.processed, m.png.saved, m.png.savedPct,
          m.discovery.baseline, m.discovery.processed, m.discovery.saved, m.discovery.savedPct,
        ].join(","),
      );

  const viewportRows = buildGroupRows("viewport", byViewport);
  const stateRows = buildGroupRows("state", byState);
  const savingsByViewportPath = path.join(REPORT_DIR, "savings-by-viewport.csv");
  const savingsByStatePath = path.join(REPORT_DIR, "savings-by-state.csv");
  await fs.writeFile(
    savingsByViewportPath,
    `${groupHeaderLine}\n${viewportRows.join("\n")}${viewportRows.length ? "\n" : ""}`,
    "utf8",
  );
  await fs.writeFile(
    savingsByStatePath,
    `${groupHeaderLine}\n${stateRows.join("\n")}${stateRows.length ? "\n" : ""}`,
    "utf8",
  );
  await validateCsvSchema(savingsByViewportPath, groupCsvCols, { dataRowCount: viewportRows.length });
  await validateCsvSchema(savingsByStatePath, groupCsvCols, { dataRowCount: stateRows.length });

  // Auto-append do history.csv (trend między uruchomieniami).
  // Reguły:
  // - default: <REPORT_DIR>/history.csv
  // - --no-history (lub NO_HISTORY=1) → skip
  // - --history=path → custom path tylko dla głównego history; per-grupa
  //   pliki dostają ścieżkę pochodną (suffix `-by-viewport`/`-by-state`),
  //   bo CSV mają inny schema i nie mogą żyć w tym samym pliku.
  // - guard: jeśli istniejący plik ma INNY nagłówek (np. dodano kolumny w nowej
  //   wersji skryptu) → log warn + skip append (nie korumpujemy starej historii).
  const historySentinelOff = ["off", "false", "none", "no", "0"];
  const historyDisabled =
    noHistory ||
    (historyRaw && historySentinelOff.includes(String(historyRaw).toLowerCase()));

  /**
   * Wspólna logika append: lazy-create header gdy brak pliku, schema-guard
   * gdy istnieje. Zwraca true gdy faktycznie dopisano.
   */
  const appendHistory = async (label, targetPath, header, dataLines) => {
    if (dataLines.length === 0) {
      // Brak grup (np. allFailed.length === 0) — nie tworzymy pustego pliku.
      return;
    }
    let appendOk = true;
    let existed = false;
    try {
      const existing = await fs.readFile(targetPath, "utf8");
      existed = true;
      const firstLine = existing.split("\n", 1)[0] ?? "";
      if (firstLine !== header) {
        console.warn(
          `[visual-snapshot-report] ⚠ Pomijam append do ${path.relative(PROJECT_ROOT, targetPath)} ` +
            `— istniejący nagłówek różni się od bieżącego (schema mismatch). ` +
            `Zarchiwizuj stary plik, kolejny run wygeneruje świeży.`,
        );
        appendOk = false;
      }
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.warn(
          `[visual-snapshot-report] ⚠ Nie mogę odczytać ${path.relative(PROJECT_ROOT, targetPath)}: ${err.message}`,
        );
        appendOk = false;
      }
    }
    if (!appendOk) return;
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const body = `${dataLines.join("\n")}\n`;
    const payload = existed ? body : `${header}\n${body}`;
    await fs.appendFile(targetPath, payload, "utf8");
    const contents = await fs.readFile(targetPath, "utf8");
    const dataRows = contents.split("\n").filter((l) => l.length > 0).length - 1;
    console.log(
      `[visual-snapshot-report] 📈 ${label}: ${path.relative(PROJECT_ROOT, targetPath)} ` +
        `(+${dataLines.length}, ${dataRows} ${dataRows === 1 ? "wiersz" : "wierszy"} łącznie${existed ? "" : ", utworzono nowy plik"}).`,
    );
  };

  if (!historyDisabled) {
    const historyPath = historyRaw
      ? path.isAbsolute(historyRaw)
        ? historyRaw
        : path.resolve(PROJECT_ROOT, historyRaw)
      : path.join(REPORT_DIR, "history.csv");

    // Per-grupa history: pochodna od głównej ścieżki (suffix przed .csv).
    // To pozwala custom --history=metrics/visual.csv → metrics/visual-by-viewport.csv.
    const deriveGroupHistoryPath = (suffix) => {
      const ext = path.extname(historyPath);
      const base = ext ? historyPath.slice(0, -ext.length) : historyPath;
      return `${base}-${suffix}${ext || ".csv"}`;
    };

    await appendHistory("History append", historyPath, headerLine, [dataLine]);
    await appendHistory(
      "History append (by viewport)",
      deriveGroupHistoryPath("by-viewport"),
      groupHeaderLine,
      viewportRows,
    );
    await appendHistory(
      "History append (by state)",
      deriveGroupHistoryPath("by-state"),
      groupHeaderLine,
      stateRows,
    );
  } else {
    console.log(
      `[visual-snapshot-report] ⏭  History append wyłączony (--no-history / HISTORY_CSV=off).`,
    );
  }

  // ---- savings-index.json ----
  // Precomputed index po kolumnach `command` + `flag_*`, żeby konsumenci
  // (dashboard, JS w index.html, queries ad-hoc) mogli filtrować trendy
  // BEZ ponownego parsowania całego history.csv. Indeks zawiera per krotka:
  //   - count, firstAt, lastAt
  //   - aggregaty min/max/avg/last dla png_saved_pct + discovery_saved_pct
  //   - rowOffsets (1-based pozycje wierszy danych w history.csv) — pozwala
  //     `awk 'NR==offset+1'` lub `tail/sed` skoczyć do konkretnych runów.
  // Ścieżka: SIEDZI OBOK history.csv (`<dir>/savings-index.json`), więc
  // custom --history=metrics/visual.csv → metrics/savings-index.json.
  // Gdy history wyłączone — indeks jest mini-snapshotem bieżącego runu
  // w REPORT_DIR (1 entry), ciągle przydatny do programatycznych workflow.
  const buildSavingsIndex = async ({ historyCsvPath, fallback }) => {
    let rows = [];
    let sourceLabel = null;
    if (historyCsvPath) {
      try {
        const raw = await fs.readFile(historyCsvPath, "utf8");
        const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
        if (lines.length >= 2) {
          const header = splitCsvRow(lines[0]);
          const idx = (name) => header.indexOf(name);
          const idxTime = idx("generatedAt");
          const idxPng = idx("png_saved_pct");
          const idxDisc = idx("discovery_saved_pct");
          const idxCommand = idx("command");
          const flagIdx = Object.fromEntries(
            TREND_FLAG_COLUMNS.map((n) => [n, idx(n)]),
          );
          for (let i = 1; i < lines.length; i++) {
            const cols = splitCsvRow(lines[i]);
            const t = cols[idxTime];
            const png = Number.parseFloat(cols[idxPng]);
            const disc = Number.parseFloat(cols[idxDisc]);
            if (!t || !Number.isFinite(png) || !Number.isFinite(disc)) continue;
            const flags = {};
            for (const name of TREND_FLAG_COLUMNS) {
              const j = flagIdx[name];
              flags[name] = j >= 0 ? (cols[j] ?? "") : "";
            }
            rows.push({
              rowOffset: i, // 1-based: wiersz danych #i (header = NR 1, data #1 = NR 2)
              generatedAt: t,
              png_saved_pct: png,
              discovery_saved_pct: disc,
              command: idxCommand >= 0 ? (cols[idxCommand] ?? "") : "",
              flags,
            });
          }
          sourceLabel = path.relative(PROJECT_ROOT, historyCsvPath);
        }
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.warn(
            `[visual-snapshot-report] ⚠ savings-index: nie mogę odczytać ${path.relative(PROJECT_ROOT, historyCsvPath)}: ${err.message}`,
          );
        }
      }
    }
    if (rows.length === 0) {
      // Fallback: bieżący run (single entry). Daje konsumentom ZAWSZE
      // walidny shape — łatwiej testować, niezależnie od stanu history.
      rows = [{
        rowOffset: 1,
        generatedAt: savingsSummary.generatedAt,
        png_saved_pct: savingsSummary.pngCopy.savedPct,
        discovery_saved_pct: savingsSummary.discoveryReaddir.savedPct,
        command: trendsCommandStr,
        flags: trendsCurrentFlags,
      }];
      sourceLabel = "current-run-only";
    }

    // Grupowanie: klucz = JSON.stringify([command, ...flagValues]) wg kolejności
    // TREND_FLAG_COLUMNS — deterministyczny i serializowalny.
    const groups = new Map();
    for (const row of rows) {
      const tupleValues = [row.command, ...TREND_FLAG_COLUMNS.map((n) => row.flags[n] ?? "")];
      const key = JSON.stringify(tupleValues);
      let g = groups.get(key);
      if (!g) {
        g = {
          key,
          command: row.command,
          flags: { ...row.flags },
          count: 0,
          firstAt: row.generatedAt,
          lastAt: row.generatedAt,
          rowOffsets: [],
          png: { min: row.png_saved_pct, max: row.png_saved_pct, sum: 0, last: row.png_saved_pct },
          discovery: { min: row.discovery_saved_pct, max: row.discovery_saved_pct, sum: 0, last: row.discovery_saved_pct },
        };
        groups.set(key, g);
      }
      g.count += 1;
      g.rowOffsets.push(row.rowOffset);
      if (row.generatedAt < g.firstAt) g.firstAt = row.generatedAt;
      if (row.generatedAt > g.lastAt) {
        g.lastAt = row.generatedAt;
        g.png.last = row.png_saved_pct;
        g.discovery.last = row.discovery_saved_pct;
      }
      if (row.png_saved_pct < g.png.min) g.png.min = row.png_saved_pct;
      if (row.png_saved_pct > g.png.max) g.png.max = row.png_saved_pct;
      if (row.discovery_saved_pct < g.discovery.min) g.discovery.min = row.discovery_saved_pct;
      if (row.discovery_saved_pct > g.discovery.max) g.discovery.max = row.discovery_saved_pct;
      g.png.sum += row.png_saved_pct;
      g.discovery.sum += row.discovery_saved_pct;
    }

    const entries = Array.from(groups.values()).map((g) => ({
      command: g.command,
      flags: g.flags,
      count: g.count,
      firstAt: g.firstAt,
      lastAt: g.lastAt,
      rowOffsets: g.rowOffsets,
      png_saved_pct: {
        min: Math.round(g.png.min * 10) / 10,
        max: Math.round(g.png.max * 10) / 10,
        avg: Math.round((g.png.sum / g.count) * 10) / 10,
        last: Math.round(g.png.last * 10) / 10,
      },
      discovery_saved_pct: {
        min: Math.round(g.discovery.min * 10) / 10,
        max: Math.round(g.discovery.max * 10) / 10,
        avg: Math.round((g.discovery.sum / g.count) * 10) / 10,
        last: Math.round(g.discovery.last * 10) / 10,
      },
    }));
    // Sort: malejąco po count (najczęstsze kombinacje na górze), potem po command.
    entries.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.command < b.command ? -1 : a.command > b.command ? 1 : 0;
    });

    // Ścieżka: obok history.csv jeśli istnieje, inaczej w REPORT_DIR.
    const indexPath = historyCsvPath
      ? path.join(path.dirname(historyCsvPath), "savings-index.json")
      : fallback;
    const payload = {
      // Bumpować przy zmianie shape (np. nowa kolumna flag_*) — konsumenci
      // mogą `if (schemaVersion !== 1) refuse` zamiast crashować.
      schemaVersion: 1,
      generatedAt: savingsSummary.generatedAt,
      source: sourceLabel,
      flagColumns: TREND_FLAG_COLUMNS,
      totals: {
        rows: rows.length,
        uniqueCombinations: entries.length,
      },
      entries,
    };
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
    await fs.writeFile(indexPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return indexPath;
  };

  const savingsIndexPath = await buildSavingsIndex({
    historyCsvPath: historyDisabled
      ? null
      : (historyRaw
        ? (path.isAbsolute(historyRaw) ? historyRaw : path.resolve(PROJECT_ROOT, historyRaw))
        : path.join(REPORT_DIR, "history.csv")),
    fallback: path.join(REPORT_DIR, "savings-index.json"),
  });

  console.log(
    `[visual-snapshot-report] 📁 Zapisano podsumowanie: ` +
      `${path.relative(PROJECT_ROOT, savingsJsonPath)}, ` +
      `${path.relative(PROJECT_ROOT, savingsCsvPath)}, ` +
      `${path.relative(PROJECT_ROOT, savingsByViewportPath)}, ` +
      `${path.relative(PROJECT_ROOT, savingsByStatePath)}, ` +
      `${path.relative(PROJECT_ROOT, savingsIndexPath)}`,
  );
};

main().catch((err) => {
  console.error("[visual-snapshot-report] Błąd:", err);
  process.exit(1);
});
