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
      </div>`;

    // Embed pełnych danych (z command/flags) jako JSON. Klient czyta ten blok
    // przez document.getElementById, NIE eval — zero ryzyka XSS (escapujemy </).
    const jsonPayload = JSON.stringify({
      points,
      flagColumns: flagCols,
      flagLabels,
    }).replace(/</g, "\\u003c");

    return `
    <section class="trends" aria-label="Trendy oszczędności IO między runami" data-trends-root>
      <h2 class="trends-title">Trendy oszczędności IO</h2>
      ${note}
      ${filterBar}
      <p class="trends-empty" data-trends-empty hidden>Żaden run nie pasuje do filtra. Wyczyść, żeby zobaczyć wszystkie.</p>
      <div class="trends-grid">
        ${buildSpark("png", "#c9a84c", "PNG copy saved %")}
        ${buildSpark("discovery", "#8ab4f8", "Discovery readdir saved %")}
      </div>
      <script type="application/json" id="trends-json">${jsonPayload}</script>
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
  const csvCols = [
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
    // Run context — pełne wartości flag + komenda. Pozwala filtrować trendy
    // typu "tylko runy z --max-copy=200" albo "tylko CI (npm run …)".
    // CSV-escape (cudzysłowy) bo command/history-path mogą zawierać spacje
    // i przecinki — patrz `csvEscape` poniżej.
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
    const headerCells = (lines[0] ?? "").split(",");
    const issues = [];
    if (headerCells.length !== expectedCols.length) {
      issues.push(
        `liczba kolumn ${headerCells.length} ≠ oczekiwane ${expectedCols.length}`,
      );
    }
    const orderMismatches = [];
    const maxLen = Math.max(headerCells.length, expectedCols.length);
    for (let i = 0; i < maxLen; i++) {
      if (headerCells[i] !== expectedCols[i]) {
        orderMismatches.push(`#${i}: "${headerCells[i] ?? "<brak>"}" ≠ "${expectedCols[i] ?? "<brak>"}"`);
      }
    }
    if (orderMismatches.length > 0) {
      issues.push(`kolejność nagłówków: ${orderMismatches.slice(0, 3).join("; ")}${orderMismatches.length > 3 ? ` (+${orderMismatches.length - 3})` : ""}`);
    }
    if (typeof dataRowCount === "number") {
      const actualData = lines.length - 1;
      if (actualData !== dataRowCount) {
        issues.push(`liczba wierszy danych ${actualData} ≠ oczekiwane ${dataRowCount}`);
      }
      // Sprawdź szerokość każdego wiersza — pomaga wykryć przecinki w polach
      // albo desync między csvCols a csvRow w kodzie. Parser RFC 4180-aware
      // (cudzysłowy zawijają pola z `,` / `"` / newline).
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
      for (let i = 1; i < lines.length; i++) {
        const cells = splitCsvRow(lines[i]);
        if (cells.length !== expectedCols.length) {
          issues.push(`wiersz #${i}: ${cells.length} kolumn ≠ ${expectedCols.length}`);
          break;
        }
      }
    }
    if (issues.length > 0) {
      console.warn(
        `[visual-snapshot-report] ⚠ Schema mismatch w ${rel} — format zmienił się między wersjami:\n` +
          issues.map((i) => `   • ${i}`).join("\n") +
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

  console.log(
    `[visual-snapshot-report] 📁 Zapisano podsumowanie: ` +
      `${path.relative(PROJECT_ROOT, savingsJsonPath)}, ` +
      `${path.relative(PROJECT_ROOT, savingsCsvPath)}, ` +
      `${path.relative(PROJECT_ROOT, savingsByViewportPath)}, ` +
      `${path.relative(PROJECT_ROOT, savingsByStatePath)}`,
  );
};

main().catch((err) => {
  console.error("[visual-snapshot-report] Błąd:", err);
  process.exit(1);
});
