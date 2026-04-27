# Visual Snapshot Report — pakowanie i CI

Raport wizualny live preview (`scripts/visual-snapshot-report.mjs`) generuje
samowystarczalny katalog `test-results/visual-report/` (`index.html` + `assets/`).
Ten dokument opisuje, jak go spakować i wrzucić jako artifact w CI.

## Lokalnie

```bash
# 1. Wygeneruj raport (potrzebuje wcześniejszego runa Playwrighta)
bun run test:visual:report

# 2. Spakuj do test-results/visual-report.zip
bun run test:visual:report:pack

# Albo jednym poleceniem (raport + ZIP):
bun run test:visual:report:ci
```

Domyślne wyjście: `test-results/visual-report.zip`. Custom ścieżka:

```bash
node scripts/visual-snapshot-report-pack.mjs --output=raport-2026-04-27.zip
```

Po `unzip` dostajesz `index.html` w bieżącym folderze (bez wrappera) — można od
razu otworzyć w przeglądarce, hostować na GitHub Pages albo drag-and-dropować
w Netlify Drop.

## GitHub Actions

Gotowy snippet — wkleić do `.github/workflows/<twój-workflow>.yml`. Kluczowe:

- `if: always()` na krokach raportu → uruchamiają się **nawet gdy testy failnęły**
  (a właśnie wtedy są najbardziej potrzebne).
- `actions/upload-artifact@v4` z `if-no-files-found: warn` → brak ZIP nie wywala
  builda, tylko ostrzeżenie.
- `retention-days` ustawione na 14 → balans między dostępnością i kosztami
  storage. Dla regresji to wystarczy do sprintu.

```yaml
name: Visual regression

on:
  pull_request:
    paths:
      - "src/**"
      - "tests/visual/**"
      - "scripts/visual-snapshot-report*.mjs"
  push:
    branches: [main]

jobs:
  visual:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps chromium

      - name: Run visual regression tests
        # `|| true` na purpose: nie chcemy stopować workflow przed wygenerowaniem
        # raportu. Status testów weryfikuje osobny krok niżej (`Fail if regression`).
        run: bunx playwright test tests/visual/admin-vein-images-live-preview || true

      - name: Generate + pack visual report
        if: always()
        run: bun run test:visual:report:ci

      - name: Upload visual report artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: visual-report-${{ github.run_id }}
          path: test-results/visual-report.zip
          if-no-files-found: warn
          retention-days: 14

      - name: Upload raw Playwright artifacts (trace, video)
        # Osobny artifact, bo są duże i rzadziej potrzebne. User pobiera
        # tylko gdy chce otworzyć trace.zip w Trace Viewerze.
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-raw-${{ github.run_id }}
          path: |
            test-results/**/trace.zip
            test-results/**/*.webm
            test-results/**/error-context.md
          if-no-files-found: ignore
          retention-days: 7

      - name: Fail if visual regression
        # Re-run testów żeby workflow zwrócił właściwy exit code.
        # Cache artefaktów już jest zassany, więc to szybkie.
        run: bunx playwright test tests/visual/admin-vein-images-live-preview
```

### Warianty

**Fail-fast w CI** (gdy zestaw urośnie do setek failures) — pięć niezależnych flag:

| Flaga | Env | Co tnie | Kiedy używać |
|---|---|---|---|
| `--max-failures=N` (`-m N`) | `MAX_FAILURES` | Globalna liczba kart (najmocniejsze) | Chcesz zobaczyć tylko top N regresji |
| `--max-failures-per-viewport=N` | `MAX_FAILURES_PER_VIEWPORT` | Max N trio na viewport | Mobile/desktop nie zjada tabletu/small-mobile |
| `--max-failures-per-state=N` | `MAX_FAILURES_PER_STATE` | Max N trio na stan | Każdy scenariusz reprezentowany w raporcie |
| `--max-copy=N` | `MAX_COPY` | Kopiowanie PNG do `assets/` (drogie IO) | Wszystkie karty potrzebne, ale podgląd pikseli tylko dla N |
| `--max-discovery=N` | `MAX_DISCOVERY` | Discovery `trace.zip`/`video`/`error-context` per katalog | Karty + obrazy OK, ale chcesz oszczędzić `readdir` |

```yaml
- name: Generate + pack visual report (balanced fail-fast)
  if: always()
  run: |
    # Maks 5 trio per viewport (żeby tablet/small-mobile nie zniknął),
    # globalnie 100 kart, podgląd pikseli dla 30, deep-linki dla 50.
    node scripts/visual-snapshot-report.mjs \
      --max-failures-per-viewport=5 \
      --max-failures=100 --max-copy=30 --max-discovery=50
    bun run test:visual:report:pack
```

Hierarchia kapowania (kolejność w pipeline):
1. **`--max-failures-per-viewport` / `--max-failures-per-state`** — proporcjonalne kapowanie per grupa (zachowuje małe ważne grupy).
2. **`--max-failures`** — globalny limit na wynik z punktu 1.
3. **`--max-copy` / `--max-discovery`** — limit drogich operacji IO na wynik z punktu 2.

Wszystkie limity są niezależne — można podać dowolną kombinację. Sekcja
"Pominięte" w raporcie ma kolumnę **Powód** z badge'm (`viewport > N`,
`state > N`, `--max-failures`), więc widać dokładnie który limit wyrzucił dane trio.

**Sterowanie KOLEJNOŚCIĄ obcinania (`--sort`, env `SORT`)**:

`--max-failures` zostawia *pierwsze N* po sortowaniu, więc to `--sort` decyduje,
co przeżyje. Klucze (CSV, `-` = malejąco): `viewport`, `state`, `path`, `stem`,
`status` (failed < incomplete). Domyślnie `path,stem`.

| Cel | Komenda |
|---|---|
| Top 50 realnych regresji (incomplete na koniec) | `--sort=status,viewport --max-failures=50` |
| Najpierw mobile + tablet (krytyczne dla UX) | `--sort=viewport --max-failures=80` |
| Sprawdź najnowsze stany w obrębie viewport | `--sort=viewport,-state` |
| Tylko incomplete (po dodaniu nowego specu) | `--sort=-status` |

Nieznane klucze → warning, pomijane (CI nie wybucha za literówkę).

**Podsumowanie oszczędności w konsoli** (tylko gdy faktycznie obcięto):

```
[visual-snapshot-report] 💾 Oszczędność: 60 mniej PNG copy: 90/150 (60%), 50 mniej discovery readdir: 30/80 (62%).
[visual-snapshot-report]   ├─ trio: baseline=80 (allFailed.length), rendered=30, saved=50 | limity: --max-failures=30, --max-failures-per-viewport=∞, --max-failures-per-state=∞
[visual-snapshot-report]   ├─ PNG copy: baseline=150 (suma expected+actual+diff z allFailed), processed=90, saved=60 | limit: --max-copy=∞ (copyLimit=30/30 trio)
[visual-snapshot-report]   └─ discovery readdir: baseline=80 (allFailed.length), processed=30, saved=50 | limit: --max-discovery=∞ (discoveryLimit=30/30 trio)
[visual-snapshot-report] 📊 Atrybucja oszczędności per-flaga:
[visual-snapshot-report]   ├─ [1a] Per-grupa truncation (--max-failures-per-viewport=5, --max-failures-per-state=∞ → viewport=20): PNG: 20, readdir: 20
[visual-snapshot-report]   ├─ [1b] Global truncation (--max-failures=30): PNG: 30, readdir: 30
[visual-snapshot-report]   ├─ [2] PNG cap (--max-copy=∞): 0 (flaga nieaktywna lub bez efektu)
[visual-snapshot-report]   └─ [3] Discovery cap (--max-discovery=∞): 0 (flaga nieaktywna lub bez efektu)
[visual-snapshot-report]   ▶ Dominujący mechanizm: [1b] --max-failures → 60 ops zaoszczędzonych (60%).
[visual-snapshot-report] 🏆 Top 3 oszczędzonych trio (z 50 pominiętych):
[visual-snapshot-report]   ├─ #1 admin-dark-desktop-state-c (3 PNG + 1 readdir) — tests/visual/admin-vein-images-live-preview-dark.spec.ts-snapshots
[visual-snapshot-report]   ├─ #2 tooltip-mobile-state-b (3 PNG + 1 readdir) — tests/visual/tooltip-last-change.spec.ts-snapshots
[visual-snapshot-report]   └─ #3 admin-tablet-state-a (2 PNG + 1 readdir) — tests/visual/admin-vein-images.spec.ts-snapshots
```

Breakdown pozwala policzyć dokładny zysk IO względem pełnego scenariusza
bez limitów: `baseline` = co zrobiłby skrypt bez `--max-*`, `processed` =
co faktycznie wykonał, `saved` = `baseline - processed`. Limity (`∞` = brak)
pokazują, który flag ile zaoszczędził.

**Atrybucja per-flaga** rozbija totale na 4 sekcje pipeline'u (suma = totale):
1. **`[1a]` Per-grupa** (`--max-failures-per-viewport`/`-per-state`) — proporcjonalne kapowanie ZANIM zadziała globalny limit. Sufix `→ viewport=N, state=M` pokazuje konkretnie który flag ile trio wyrzucił.
2. **`[1b]` Global** (`--max-failures`) — globalny limit na to co zostało po `[1a]`. Oszczędza i PNG i readdir.
3. **`[2]` PNG cap** (`--max-copy`) — skipuje PNG copy w trio które przeżyły truncation; oszczędza TYLKO PNG.
4. **`[3]` Discovery cap** (`--max-discovery`) — skipuje readdir w trio które przeżyły truncation; oszczędza TYLKO readdir.

Linia **`▶ Dominujący mechanizm`** wskazuje sekcję z największym sumarycznym
zyskiem IO (PNG + readdir) — najszybszy sygnał "co tu obcięło robotę". Dzięki
temu od razu widać czy warto dokręcić per-grupa (`[1a]` dominuje) czy raczej
globalny limit (`[1b]`), albo czy IO siedzi w kopiowaniu PNG (`[2]`) vs
discovery readdir (`[3]`). Top 3 ranking sortowany po liczbie PNG
(tie-break: stem alfabetycznie) — najszybszy sygnał, które trio najbardziej
ciążyły w IO i warto je rozwiązać/przenieść do osobnego runa.

**Komentarz w PR z linkiem do artifactu** (opcjonalnie):

```yaml
- name: Comment PR with artifact link
  if: always() && github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      const url = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}#artifacts`;
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `📊 [Visual snapshot report](${url}) (artifact: \`visual-report-${context.runId}.zip\`)`,
      });
```

**GitLab CI** (analog, jednym job):

```yaml
visual-regression:
  image: mcr.microsoft.com/playwright:v1.49.0
  script:
    - bun install --frozen-lockfile
    - bunx playwright test tests/visual/admin-vein-images-live-preview || EXIT=$?
    - bun run test:visual:report:ci
    - exit ${EXIT:-0}
  artifacts:
    when: always
    paths:
      - test-results/visual-report.zip
    expire_in: 14 days
```

## Co siedzi w ZIPie

```
visual-report.zip
├── index.html                 # samowystarczalny raport (CSS + JS inline) — zawiera też sekcję "Trendy oszczędności IO" (sparkline'y png/discovery z history.csv)
├── savings.json               # strukturalny dump podsumowania (atrybucja per-flaga + top10 skipped trios + byGroup)
├── savings.csv                # 1-wierszowy CSV z agregatami całego runa (snapshot bieżącego runa)
├── savings-by-viewport.csv    # N wierszy (1 per viewport) — baseline/processed/saved/savedPct per grupa
├── savings-by-state.csv       # N wierszy (1 per state) — analog jak wyżej
├── history.csv                # auto-append: header + N wierszy (po jednym per run); --no-history żeby wyłączyć
├── history-by-viewport.csv    # auto-append: header + M wierszy (M = #viewports × #runów)
├── history-by-state.csv       # auto-append: header + M wierszy (analog dla state)
└── assets/
    ├── 000-<stem>-expected.png
    ├── 000-<stem>-actual.png
    ├── 000-<stem>-diff.png
    └── ...                    # 3 obrazy per failed snapshot
```

### Trend analysis (savings.json / savings.csv)

Pliki `savings.json` i `savings.csv` w `REPORT_DIR` zawierają to samo, co
sekcja `📊 Atrybucja oszczędności` w konsoli, w postaci do dalszej analizy:

- **`savings.json`** (schemaVersion: 1) — pełny dump: `limits`, `trio`, `pngCopy`,
  `discoveryReaddir` (każdy z `baseline`/`processed`/`saved`/`savedPct`),
  `attribution` per-flaga (`perGroup`, `maxFailures`, `maxCopy`, `maxDiscovery`)
  oraz `topSkippedTrios` (top 10 z folderem/viewport/state/pngCount).
- **`savings.csv`** — 1 wiersz + header, kolumny w **stabilnej kolejności**
  (`generatedAt`, `trio_*`, `png_*`, `discovery_*`, `limit_*`, `attr_*`).
  Zaprojektowane do append'owania.
- **`history.csv`** — automatycznie aktualizowany przez skrypt po każdym
  runie (default: `<REPORT_DIR>/history.csv`). Pierwszy run tworzy plik z
  nagłówkiem, kolejne dopisują wyłącznie wiersz danych. Zwykle wystarczy
  trzymać go poza ZIP-em (np. w cache CI lub osobnym artefakcie), żeby
  porównywać runy w czasie.

```bash
# Custom path:
node scripts/visual-snapshot-report.mjs --history=metrics/visual-history.csv

# Wyłączenie auto-appendu (np. w PR-ach, gdzie history nie ma sensu):
node scripts/visual-snapshot-report.mjs --no-history
# albo: HISTORY_CSV=off node scripts/visual-snapshot-report.mjs

# Analiza trendów (DuckDB):
duckdb -c "SELECT generatedAt, png_saved_pct, discovery_saved_pct \
           FROM read_csv_auto('test-results/visual-report/history.csv') \
           ORDER BY generatedAt DESC LIMIT 20;"
```

| Flaga | Env | Default | Co robi |
|---|---|---|---|
| `--history=PATH` | `HISTORY_CSV` | `<REPORT_DIR>/history.csv` | Custom ścieżka do persistent CSV. Wartości `off`/`false`/`none`/`no`/`0` wyłączają zapis. |
| `--no-history` | `NO_HISTORY=1` | — | Skrót na wyłączenie auto-appendu. |

**Schema guard**: jeśli istniejący `history.csv` ma inny nagłówek niż bieżący
(np. nowa wersja skryptu dodała kolumny), append jest pomijany z warningiem
— stara historia nie zostaje skorumpowana. Zarchiwizuj wtedy stary plik
(`mv history.csv history-v1.csv`), kolejny run wygeneruje świeży.

**Sparkline'y w `index.html`**: jeśli `history.csv` istnieje (i ma kolumny
`generatedAt` / `png_saved_pct` / `discovery_saved_pct`), raport renderuje
sekcję **„Trendy oszczędności IO"** z dwoma inline SVG (PNG copy saved % +
Discovery readdir saved %). Skala Y: 0–100%, oś X: kolejność runów (max 50
ostatnich punktów). Ostatnia kropka = bieżący run (większa, oznaczona
„(this run)" w `<title>`-tooltipie). Pierwszy run pokazuje tylko jeden punkt
+ notkę „historia zacznie się zbierać od następnego uruchomienia". Brak JS,
zero deps — działa z `file://`. `--no-history` wyłącza także sekcję trends.

`savings.json`/`savings.csv` zapisywane są ZAWSZE (nawet gdy `saved == 0`),
żeby trendy w czasie miały ciągłość punktów (zera są informacją, że danego
dnia nic nie obcięto).

Wszystkie ścieżki w `index.html` są **relatywne** od katalogu, w którym leży
`index.html` — czyli ZIP można rozpakować gdziekolwiek i otworzyć bezpośrednio
w przeglądarce (`file://`). To samo dotyczy hostingu (GitHub Pages,
Netlify Drop, Cloudflare Pages drop-zone) — nie wymaga build stepu.

## Troubleshooting

| Symptom | Przyczyna | Fix |
|---|---|---|
| `Nie znaleziono raportu` | `test:visual:report` nie był uruchomiony | Najpierw `bun run test:visual:report` |
| `'zip' niedostępny` | Brak CLI w PATH | `apt-get install zip` (Linux), preinstall na ubuntu-latest |
| Pusty ZIP / brak failed snapshotów | Wszystkie testy przeszły ✓ | Działa zgodnie z planem |
| Artifact >100MB | Dużo failures × duże PNG | Użyj `--max-failures=N` lub `--max-copy=N` (kopiuj tylko top N obrazków) |
