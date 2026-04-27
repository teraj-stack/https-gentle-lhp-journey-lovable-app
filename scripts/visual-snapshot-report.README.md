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

**Fail-fast w CI** (gdy zestaw urośnie do setek failures) — trzy niezależne flagi:

| Flaga | Env | Co tnie | Kiedy używać |
|---|---|---|---|
| `--max-failures=N` (`-m N`) | `MAX_FAILURES` | Globalna liczba kart (najmocniejsze) | Chcesz zobaczyć tylko top N regresji |
| `--max-copy=N` | `MAX_COPY` | Kopiowanie PNG do `assets/` (drogie IO) | Wszystkie karty potrzebne, ale podgląd pikseli tylko dla N |
| `--max-discovery=N` | `MAX_DISCOVERY` | Discovery `trace.zip`/`video`/`error-context` per katalog | Karty + obrazy OK, ale chcesz oszczędzić `readdir` |

```yaml
- name: Generate + pack visual report (aggressive fail-fast)
  if: always()
  run: |
    # Top 100 kart, podgląd pikseli dla 30, deep-linki dla 50.
    node scripts/visual-snapshot-report.mjs \
      --max-failures=100 --max-copy=30 --max-discovery=50
    bun run test:visual:report:pack
```

Hierarchia: `--max-failures` tnie pierwsze, więc `--max-copy` / `--max-discovery`
działają już na obcięty zbiór. Kombinacje są niezależne — można podać jedną,
dwie albo wszystkie trzy.

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
├── index.html                 # samowystarczalny raport (CSS + JS inline)
└── assets/
    ├── 000-<stem>-expected.png
    ├── 000-<stem>-actual.png
    ├── 000-<stem>-diff.png
    └── ...                    # 3 obrazy per failed snapshot
```

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
