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

- **`savings.json`** (schemaVersion: 2) — pełny dump: `limits`, `trio`, `pngCopy`,
  `discoveryReaddir` (każdy z `baseline`/`processed`/`saved`/`savedPct`),
  `attribution` per-flaga (`perGroup`, `maxFailures`, `maxCopy`, `maxDiscovery`),
  `topSkippedTrios` (top 10) oraz **`byGroup`** = `{ viewport: {...}, state: {...} }`,
  gdzie każda grupa (np. `mobile`, `tablet`) ma pełen shape `{ trio, png, discovery }`
  z `baseline/processed/saved/savedPct`. Pozwala odpowiedzieć: "która grupa
  najwięcej oszczędza w tym runie".
- **`savings.csv`** — 1 wiersz + header (agregat całego runa), kolumny w
  **stabilnej kolejności** (`generatedAt`, `trio_*`, `png_*`, `discovery_*`,
  `limit_*`, `attr_*`, `flag_*`, `command`, `node_version`, `cwd_basename`).
  Zaprojektowane do append'owania. Sekcja **`flag_*` + `command`** umożliwia
  filtrowanie trendów po parametrach uruchomienia, np. w DuckDB:
  ```sql
  SELECT generatedAt, png_saved_pct, flag_max_copy
  FROM read_csv_auto('test-results/visual-report/history.csv')
  WHERE flag_max_copy = '200' AND flag_no_history = 'false'
  ORDER BY generatedAt;
  ```
  Pola tekstowe (`command`, `flag_history_path`) są CSV-escape'owane wg
  RFC 4180 (zawijane w `"` gdy zawierają `,`/`"`/newline). `flag_*` duplikują
  wartości z `limit_*` semantycznie jako "input parameter" vs "metric" — stare
  `limit_*` zostają dla kompatybilności wstecz z istniejącymi history.csv.
- **`savings-by-viewport.csv` / `savings-by-state.csv`** — N wierszy + header,
  jeden wiersz na grupę. Kolumny: `generatedAt, group_kind, group, trio_*,
  png_*, discovery_*` (15 stable). Idealne do query typu "top oszczędzające
  grupy w czasie" bez konieczności rozpakowywania JSON.
- **`history.csv` / `history-by-viewport.csv` / `history-by-state.csv`** —
  automatycznie aktualizowane przez skrypt po każdym runie (default:
  `<REPORT_DIR>/`). Pierwszy run tworzy plik z nagłówkiem, kolejne dopisują
  wyłącznie wiersze danych. Per-grupa history dostają sufix względem ścieżki
  podanej w `--history` (np. `--history=metrics/visual.csv` →
  `metrics/visual-by-viewport.csv` + `metrics/visual-by-state.csv`).
- **`savings-index.json`** — precomputed index po `(command, flag_*)`,
  zapisywany OBOK `history.csv` (np. `metrics/savings-index.json` przy
  custom `--history=metrics/visual.csv`). Pozwala filtrować trendy bez
  ponownego parsowania całego CSV. Shape:
  ```jsonc
  {
    "schemaVersion": 1,
    "generatedAt": "2026-04-27T...",
    "source": "test-results/visual-report/history.csv",
    "flagColumns": ["flag_max_failures", /* ... */],
    "totals": { "rows": 142, "uniqueCombinations": 7 },
    "entries": [
      {
        "command": "node visual-snapshot-report.mjs --max-copy=200",
        "flags": { "flag_max_copy": "200", /* ... */ },
        "count": 38,
        "firstAt": "2026-03-01T...",
        "lastAt":  "2026-04-27T...",
        "rowOffsets": [12, 18, 25, /* ... 1-based: data row #N w history.csv */],
        "png_saved_pct":       { "min": 50.0, "max": 78.2, "avg": 64.1, "last": 67.0 },
        "discovery_saved_pct": { "min": 40.0, "max": 70.5, "avg": 55.3, "last": 60.0 }
      }
    ]
  }
  ```
  - `entries` posortowane malejąco po `count` (najczęstsze kombinacje na górze).
  - `rowOffsets` to 1-based pozycje wierszy DANYCH w `history.csv` (wiersz #1
    = pierwsza linia po nagłówku, czyli `awk 'NR==offset+1'` lub `sed -n "$((offset+1))p"`).
  - Gdy `--no-history` aktywny, indeks zawiera tylko 1 entry z bieżącego runu
    (zapisany w `<REPORT_DIR>/savings-index.json`) — konsumenci dostają zawsze
    walidny shape.
  - Bumpować `schemaVersion` przy zmianie struktury (nowa kolumna `flag_*`,
    nowa metryka), żeby konsumenci mogli odmówić starego formatu zamiast
    crashować.

### Filtr trendów w `index.html`

Sekcja **„Trendy oszczędności IO"** w wygenerowanym `index.html` zawiera
interaktywny filtr (selecty) dla kolumn **`command`** + każdej `flag_*`.
Wybór ogranicza wykresy `png_saved_pct` / `discovery_saved_pct` do runów
pasujących do wszystkich aktywnych selectów (AND), bez re-runu skryptu.

- Wartości selectów są budowane na bazie `history.csv` (unikalne wartości w
  danej kolumnie). Brakująca wartość (np. starsze wiersze bez `flag_*`)
  jest etykietowana jako **„(brak)"** i pozostaje filtrowalna.
- Stan filtra jest zapisywany w `localStorage` oraz w URL jako
  `?trend_command=...&trend_flag_max_copy=200`, dzięki czemu można udostępnić
  link do konkretnego widoku trendu (np. „CI z `--max-copy=200`").
- Przycisk **Resetuj** czyści wszystkie selecty i pokazuje pełną historię.
- Przycisk **⬇ Podgląd i eksport…** otwiera modal z **podglądem 20 pierwszych
  wierszy** (natywny `<dialog>`, zero deps) zanim cokolwiek trafi na dysk.
  Modal zawiera:
  - nagłówek z metadanymi: `N/M runów · tryb {skrócony|pełny}, K kolumn
    (L pustych)`,
  - przewijalną tabelę z headerem CSV (sticky) i pierwszymi 20 wierszami;
    wartości są od-escapowane (RFC 4180 unwrap) by user widział je „jak w
    arkuszu", a komórki puste są oznaczone kursywą `(puste)` i wygaszone,
  - notkę „Pokazuję 20 z N wierszy. Pełny zbiór trafi do pobranego pliku."
    gdy zbiór jest większy niż próg podglądu,
  - przyciski **Anuluj** (Esc / klik backdropa działa identycznie) i
    **⬇ Pobierz CSV**, który dopiero teraz tworzy `savings-filtered-<mode>-<timestamp>-<hash>.csv`
    (Blob + `a[download]`, działa też z `file://`).

  Fallback: jeśli przeglądarka nie wspiera `<dialog>.showModal()` (Safari < 15.4),
  pobranie startuje od razu, a w statusie pojawia się dopisek
  „(podgląd niedostępny w tej przeglądarce)".

  Tryb wybiera select **„tryb eksportu"** obok przycisku (jego wartość jest
  zamrożona w momencie kliku „Podgląd" — modal pokazuje to, co realnie
  trafi do pliku):
  - **Skrócony** (domyślny) — schemat: `generatedAt, png_saved_pct,
    discovery_saved_pct, isCurrent, command, flag_*` (podzbiór kolumn obecny
    w embedded `trends-json`). Idealny do szybkiej analizy ad-hoc.
  - **Pełny schemat** — wszystkie kolumny `savings.csv` / `history.csv` w
    kanonicznej kolejności (`SAVINGS_CSV_COLUMNS`). Pola, których raport nie
    embedduje (`trio_*`, `png_baseline`, `png_processed`, `attr_*`,
    `limit_*`, `node_version`, `cwd_basename`) są zapisane jako **pusty
    string** (`,,`), nie jako `0` — konsument odróżnia „brak danych" od
    „prawdziwe zero". Plik ma identyczny nagłówek co `history.csv`, więc
    można go wkleić jako append lub wczytać razem z innymi snapshotami przez
    `duckdb read_csv_auto`. Jeśli serwer nie embeduje listy kolumn (starszy
    raport / regresja w buildzie), opcja jest oznaczona „(niedostępny)" i
    select wymusza tryb skrócony.

  Wartości są RFC 4180-escaped (cudzysłowy w polach z przecinkami/newline'ami).
  Hash w nazwie = deterministyczny djb2 stanu filtra + trybu (kolejne eksporty
  tej samej kombinacji nie nadpisują siebie z różnych timestampów). Status
  („Pobrano N/M (tryb, K kol., L pustych) → nazwa") wyświetla się obok
  przycisku; jeśli filtr nie zwrócił żadnego wiersza, otwarcie podglądu jest
  blokowane z komunikatem „Brak wierszy do eksportu".

  **Kolejność wierszy (kontrakt):** zarówno podgląd 20 wierszy, jak i
  pobrany CSV zachowują **dokładnie tę samą kolejność, w jakiej rysowany
  jest sparkline trendów** — chronologicznie po `generatedAt` ASC, z
  bieżącym runem (`isCurrent=1`) zawsze na końcu. Implementacyjnie:
  `allPoints` przychodzi z serwera już posortowany (`history.csv` ASC +
  bieżący run dopięty na końcu), `filterPoints()` jest czystym `.filter()`
  (zachowuje porządek), a `sortExportPointsLikeChart()` robi dodatkowy
  **stabilny** re-sort kopii (ES2019 stable sort) z tie-breakerem
  `isCurrent` na końcu — więc nawet gdyby przyszła zmiana w buildzie
  podała punkty w innej kolejności, eksport nadal odda układ wykresu
  jeden-do-jednego. Jeśli potrzebujesz odwrotnej kolejności (najnowsze
  pierwsze) — odwróć kolumnę `generatedAt` w arkuszu po imporcie; eksport
  celowo nie udostępnia toggla, żeby zachować jedno źródło prawdy.
- Pod selectami znajduje się rozwijana sekcja **„Unikalne kombinacje
  `command` + `flag_*`"** — tabela wszystkich krotek wartości, które
  rzeczywiście wystąpiły w `history.csv`, posortowana malejąco po liczbie
  runów. Kliknięcie wiersza (lub Enter / Space na fokusie) ustawia selecty
  filtra na DOKŁADNIE tę kombinację, dzięki czemu nie trzeba zgadywać,
  które wartości wystąpiły razem. Aktywny preset jest podświetlony złotą
  ramką po lewej stronie wiersza.

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

# Top oszczędzające viewporty (średnia z ostatnich runów):
duckdb -c "SELECT \"group\", AVG(png_saved_pct) AS avg_png_pct, \
                  AVG(discovery_saved_pct) AS avg_disc_pct, COUNT(*) AS runs \
           FROM read_csv_auto('test-results/visual-report/history-by-viewport.csv') \
           GROUP BY \"group\" ORDER BY avg_png_pct DESC;"
```

| Flaga | Env | Default | Co robi |
|---|---|---|---|
| `--history=PATH` | `HISTORY_CSV` | `<REPORT_DIR>/history.csv` | Custom ścieżka do persistent CSV. Wartości `off`/`false`/`none`/`no`/`0` wyłączają zapis. |
| `--no-history` | `NO_HISTORY=1` | — | Skrót na wyłączenie auto-appendu. |

**Schema guard (history.csv)**: jeśli istniejący `history.csv` ma inny nagłówek
niż bieżący (np. nowa wersja skryptu dodała kolumny), append jest pomijany z
warningiem — stara historia nie zostaje skorumpowana. Zarchiwizuj wtedy stary
plik (`mv history.csv history-v1.csv`), kolejny run wygeneruje świeży.

**Schema validation (savings*.csv)**: po zapisie `savings.csv`,
`savings-by-viewport.csv` i `savings-by-state.csv` skrypt weryfikuje **liczbę
kolumn**, **kolejność nagłówków** oraz **szerokość każdego wiersza danych**
względem schematu in-memory. Diff jest rozbity na trzy kategorie:
**brakujące kolumny** (są w schemacie, ale nie ma ich w pliku — typowo nowa
kolumna dodana w nowszej wersji skryptu, np. `command` / `flag_*`),
**nadmiarowe kolumny** (są w pliku, ale schemat ich nie zna) oraz
**REORDER nagłówków** (te same nazwy, inna kolejność — breaking change dla
append do `history.csv`). Warning zawiera tabelaryczny **side-by-side diff**
`idx | actual | expected` z markerem `≠` przy każdej rozbieżnej pozycji
(skrócony do 40 wierszy). Każde odchylenie loguje warning typu
`⚠ Schema mismatch w … — format zmienił się między wersjami` z sugestią
`bump schemaVersion w savings.json`. Walidacja jest diagnostyczna (nie kończy
procesu non-zero), żeby nie blokować CI z powodu samej zmiany formatu.

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
