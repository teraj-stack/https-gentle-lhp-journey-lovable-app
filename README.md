# Welcome to your Lovable project

## Zastrzeżenie właściciela — brak zgody dla Vercel

Właściciel projektu nie wyraża zgody na pobieranie, klonowanie, importowanie ani kopiowanie kodu strony, jej treści lub zasobów przez Vercel ani na przekazywanie ich do usług Vercel. Zakaz obejmuje także wdrażanie i hosting strony w Vercel oraz automatyczne pobieranie repozytorium przez integracje Vercel, bez odrębnej, uprzedniej zgody właściciela.

Umieszczenie projektu w GitHub nie stanowi zgody na powyższe działania. Repozytorium powinno pozostać prywatne i nie należy udzielać integracjom Vercel dostępu do niego.

**Ograniczenie:** ten zapis dokumentuje brak zgody, ale sam nie blokuje technicznie dostępu. Dostęp aplikacji i integracji należy kontrolować w ustawieniach GitHub.

### Eksport strony do GitHub

W Lovable otwórz **Ustawienia projektu → Git → GitHub**, wybierz połączenie z kontem i połącz projekt. Lovable utworzy nowe prywatne repozytorium i będzie synchronizować kod projektu, w tym tę dokumentację. Połączenie wymaga działania uprawnionego użytkownika w ustawieniach Lovable; agent czatu nie może go wykonać ani potwierdzić jego statusu.

Synchronizacja obejmuje kod i pliki zapisane w projekcie, ale nie rekordy bazy danych, pliki przechowywane w Lovable Cloud ani dokumenty udostępnione wyłącznie w czacie. Te materiały wymagają osobnego eksportu. Sekrety i dane pacjentów nie powinny być umieszczane w repozytorium.

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## i18n CI annotations

The three i18n contract tests (`src/lib/i18nRequiredKeys.test.ts`, `i18nContract.test.ts`, `i18nPlaceholders.test.ts`) emit **inline GitHub Actions annotations** on every PR so a failed locale key shows up as a clickable red marker on the exact line in the “Files changed” view — no need to dig through vitest output.

### Quickstart

Run the full i18n validation locally **and** see the exact `::error` / `::warning` annotation lines that CI would post on a PR:

```sh
GITHUB_ACTIONS=true bunx vitest run \
  src/lib/i18nRequiredKeys.test.ts \
  src/lib/i18nContract.test.ts \
  src/lib/i18nPlaceholders.test.ts \
  src/lib/i18nGithubAnnotations.test.ts 2>&1 | grep -E '^(::|FAIL|PASS|Tests )'
```

What you should see:

- **Green path** (no drift): only `Tests  N passed` lines — no `::error`/`::warning`, exit code `0`.
- **Drift path**: one `::error file=…,line=N,title=…::…` (or `::warning`) per unique violation. Click any printed `file=` path + `line=` pair to jump to the offending key — that's exactly what reviewers see in the GitHub PR diff.

Sanity-check the annotations:

1. Each `line=N` should land on the actual key declaration in `src/lib/lastChangeTooltipContent.ts` or `src/lib/lastChangeTooltipModel.ts` — open the file at that line and confirm.
2. Identical `(locale, path, reason)` triples should appear **exactly once** (cross-test dedup). If you see duplicates, the dedup cache wasn't reset between groups — file a bug.
3. `empty-optional-value` should be `::warning` (yellow); everything else `::error` (red, build-failing).

Without `GITHUB_ACTIONS=true` the emitter is a no-op, so plain `bunx vitest run` stays clean for normal local development.

### Running the validator on your fixtures — and where to find the output

This section is the **single answer** to "I just pasted a fixture into the locale source — what do I run, and where does the `::error` / `::warning` line actually appear?". Everything below is just locating signal in different surfaces (local terminal, GitHub PR, Actions log, capturable file). The validator itself is always the same vitest invocation.

#### TL;DR — one command, three surfaces

```sh
GITHUB_ACTIONS=true bunx vitest run \
  src/lib/i18nRequiredKeys.test.ts \
  src/lib/i18nContract.test.ts \
  src/lib/i18nPlaceholders.test.ts 2>&1 | tee /tmp/i18n.log | grep '^::'
```

After this command, your `::error` / `::warning` lines are findable in **all three** of these places:

| Surface | Where to look | Best for |
| --- | --- | --- |
| **Terminal stdout (filtered)** | The `grep '^::'` tail of the pipe above prints only the workflow-command lines | Quick "does my fixture trip the right reason?" check |
| **Full vitest log** | `/tmp/i18n.log` (saved by `tee`) — open and search for `::error` or your fixture's key path | Reading message body + surrounding test context (stack, `expect` diff) |
| **GitHub PR diff** (after push) | Inline red ❌ marker on the offending source line in the **Files changed** tab | What reviewers see; clickable jump-to-line |

Without `GITHUB_ACTIONS=true` no `::` lines are emitted at all (the emitter no-ops), so `grep '^::'` will be empty even on a failing test — that's by design, to keep local dev quiet.

#### Step-by-step — local fixture verification

1. **Paste your fixture** into the locale source (`src/lib/lastChangeTooltipContent.ts` or `src/lib/lastChangeTooltipModel.ts`). See the [End-to-end walkthrough](#end-to-end-walkthrough--one-fixture-per-error-type-start-to-finish) for one concrete mutation per reason code.

2. **Pick the narrowest test** that owns the reason you expect (faster, less log noise):

   | Reason | Test file to run |
   | --- | --- |
   | `missing-required-key` | `src/lib/i18nRequiredKeys.test.ts` |
   | `placeholder-mismatch` | `src/lib/i18nPlaceholders.test.ts` |
   | `undeclared-key`, `wrong-type`, `empty-optional-value` | `src/lib/i18nContract.test.ts` |

   When in doubt or when stacking multiple fixtures, run **all three** (the TL;DR command above).

3. **Run with the annotation emitter on**, capturing the full log and filtering the workflow lines:

   ```sh
   GITHUB_ACTIONS=true bunx vitest run <test-file> 2>&1 \
     | tee /tmp/i18n.log \
     | grep '^::'
   ```

   - **`GITHUB_ACTIONS=true`** — required, otherwise no `::` lines are ever emitted.
   - **`2>&1`** — vitest writes annotations to stdout but its own progress to stderr; merge them so `tee` captures both.
   - **`tee /tmp/i18n.log`** — saves the full log for later inspection (the `grep` discards everything except the workflow lines).
   - **`grep '^::'`** — keeps only `::error file=…` and `::warning file=…` rows. Anchor on `^::` (start of line) — substrings like `::after` won't match.

4. **Locate output in the captured log**:

   ```sh
   # Just the annotation lines:
   grep '^::' /tmp/i18n.log

   # Annotations plus the surrounding 3 lines of vitest context (useful when a
   # `::error` looks suspicious — the assertion diff is right above it):
   grep -B 3 '^::' /tmp/i18n.log

   # Filter to a specific reason / locale / file:
   grep '^::' /tmp/i18n.log | grep 'placeholder-mismatch'
   grep '^::' /tmp/i18n.log | grep '· en ·'
   grep '^::' /tmp/i18n.log | grep 'file=src/lib/lastChangeTooltipModel.ts'

   # Count violations grouped by reason (one-liner audit):
   grep -oE 'reason=[a-z-]+' /tmp/i18n.log | sort | uniq -c | sort -rn
   ```

5. **Scope locales explicitly** when the fixture targets `de` or `it` (default scope is `pl,en` — fixtures outside that scope are silently skipped):

   ```sh
   I18N_ACTIVE_LOCALES=pl,en,de,it GITHUB_ACTIONS=true \
     bunx vitest run src/lib/i18nContract.test.ts 2>&1 | grep '^::'
   ```

#### Anatomy of one annotation line — what each field means

```
::error file=src/lib/lastChangeTooltipModel.ts,line=87,title=TIME_LINE [error]%3A en · placeholder-mismatch::TIME_LINE.en.relative.minutesAgo (locale=en, reason=placeholder-mismatch, severity=error) — Locale "en" value "Changed %d minutes ago" is missing placeholder {count}, expected by base locale "pl" ("Zmieniono {count} minut temu") — current: minutesAgo: "Changed %d minutes ago", — Fix: …
```

| Segment | Meaning | Where to use it |
| --- | --- | --- |
| `::error` / `::warning` | Severity prefix; GitHub Actions parses this verbatim | Filter with `grep '^::error'` to fail-only |
| `file=<path>` | Resolved by `findKeyLine` in `i18nGithubAnnotations.ts` | Click in PR diff to jump; `sed -n "${line}p" <file>` locally |
| `line=<n>` | 1-based line number of the offending key declaration | The only field that varies between paste positions |
| `title=…` | Short header shown in the GitHub PR marker bubble | Visible at-a-glance in the **Files changed** view |
| `locale=<L>` | Which locale tripped the rule | Filter: `grep '· en ·'` or `grep 'locale=en,'` |
| `reason=<code>` | Stable enum from the validator | Filter: `grep 'reason=placeholder-mismatch'` |
| `severity=<level>` | `error` (red, fails build) or `warning` (yellow, build green) | Branch protection keys on this |
| Message body after `—` | Human-readable diff: `expected … current: …` | What reviewers actually read |
| `current: <line>` | The offending source row, **collapsed if multi-line** | Lets reviewers see the bug without opening the file |
| `Fix: …` | Hint with the most likely repair command | Usually `npm run i18n:autofix` |

#### Where the output appears in CI (GitHub Actions)

When the same command runs inside the [`i18n-check.yml` workflow](#copy-paste-github-actions-workflow), the **identical** `::error` / `::warning` lines you saw locally surface in three additional places:

| CI surface | What you see | URL pattern |
| --- | --- | --- |
| **PR diff — Files changed tab** | Inline red ❌ / yellow ⚠️ marker on the exact `line=N` of `file=…`. Click to expand the message body. | `https://github.com/<org>/<repo>/pull/<n>/files` |
| **PR Checks tab — Annotations panel** | Grouped list of every annotation, sortable by file/severity. Same marker, easier to scan in bulk. | `https://github.com/<org>/<repo>/pull/<n>/checks` |
| **Actions run log** | Raw stdout of the vitest job. `::error` / `::warning` lines appear verbatim alongside vitest's own output. Use the search box (top-right of the log viewer) to grep. | `https://github.com/<org>/<repo>/actions/runs/<id>` |

If a marker shows up in the Actions log but **not** in the PR diff, the most common cause is `line=0` (the resolver couldn't find the key) — see [Troubleshooting: `line=` lands on the wrong line](#troubleshooting-line-lands-on-the-wrong-line).

#### Capturing output for paste-into-issue / regression baselines

When you want to attach the validator's verdict to a bug report or freeze it as a baseline:

```sh
# Just the annotations, sorted + deduped — safe to paste into a GitHub issue:
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nContract.test.ts 2>&1 \
  | grep '^::' | sort -u > /tmp/i18n-annotations.txt
cat /tmp/i18n-annotations.txt

# Full log including vitest assertions — for deep debugging:
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nContract.test.ts > /tmp/i18n-full.log 2>&1
less /tmp/i18n-full.log

# Diff your current annotations against a stored baseline (regression check):
diff -u /tmp/i18n-baseline.txt /tmp/i18n-annotations.txt
```

#### One-shot PASS/FAIL summary by error type

Copy-paste this into your terminal (or save as `scripts/i18n-summary.sh` and `chmod +x`). It runs the i18n contract tests, captures `::error` / `::warning` annotations, and prints a per-reason PASS/FAIL count plus an overall verdict. Exit code is `0` only when **every** selected error-severity reason has zero hits.

**Filter mode (`--only <reason>[,<reason>…]`):** pass `--only <reason>` (or `-o <reason>`) to narrow execution to one or more fixture error types. Multiple reasons can be combined with commas (e.g. `--only placeholder-mismatch,wrong-type`) — the script de-duplicates them, runs the **union** of their owning test files (skipping the rest), filters annotations to the chosen set, and prints one row per selected reason. The script then:

1. Runs **only** the test files that own the selected reasons (skipping the others — saves ~3-6s when narrowing).
2. Filters the annotations file to just the selected reasons.
3. Prints a multi-row summary table for the selected reasons.
4. Returns exit code `0`/`1` based on the selected reasons (warnings never fail).

Accepted values for `--only`: `missing-required-key`, `placeholder-mismatch`, `undeclared-key`, `wrong-type`, `empty-optional-value` — singly or comma-joined. Use `--only all` (the default) to run the full suite.

**Locale scope (`--locales <locale>[,<locale>…]`):** pass `--locales` (alias `-L`) to override the locale scope **just for this run** without exporting `I18N_ACTIVE_LOCALES` in your shell. Accepted values: `pl`, `en`, `de`, `it` (mirrors `SUPPORTED_LOCALES` in `src/lib/i18nActiveLocales.ts`); commas are tolerated with stray whitespace and duplicates are de-duplicated. Precedence: `--locales` flag > `$I18N_ACTIVE_LOCALES` env > built-in default `pl,en,de,it`. The resolved scope and its source (`--locales flag` / `$I18N_ACTIVE_LOCALES env` / `default`) are printed on the `Locales:` echo line so PR reviewers can see exactly what the run was scoped to. Combine freely with `--only`, e.g. `bash i18n-summary.sh --only wrong-type --locales pl` to verify a single Polish fixture in ~3s.

**Output dir (`--out <dir>`):** by default the script writes its full vitest log to `/tmp/i18n-summary.log` and the de-duplicated annotations to `/tmp/i18n-summary-annotations.txt` — fine locally, but ephemeral on CI runners. Pass `--out <dir>` (alias `-O`, `--out=<dir>` form supported) to redirect both files into a directory of your choice; the script `mkdir -p`s it, aborts with exit `2` if creation/writing fails, and echoes the resolved path + source on a new `Output dir:` line. Filenames stay constant (`i18n-summary.log`, `i18n-summary-annotations.txt`) so CI artifact-upload steps can hard-code them. Precedence: `--out` flag > `$I18N_SUMMARY_OUT` env > default `/tmp`. Common patterns: `--out ./artifacts` for a local run you want to keep across `git clean`, `--out "$RUNNER_TEMP/i18n"` paired with `actions/upload-artifact` to ship the logs as a downloadable PR artifact.

```sh
#!/usr/bin/env bash
# i18n-summary.sh — run i18n contract tests and print a per-reason PASS/FAIL summary.
# Usage:
#   bash i18n-summary.sh                                          # run all reasons (default)
#   bash i18n-summary.sh --only placeholder-mismatch              # one reason
#   bash i18n-summary.sh -o wrong-type
#   bash i18n-summary.sh --only placeholder-mismatch,wrong-type   # multiple reasons (comma-joined)
#   bash i18n-summary.sh --only all                               # explicit equivalent of default
#   bash i18n-summary.sh --locales en,de                          # override I18N_ACTIVE_LOCALES for this run
#   bash i18n-summary.sh --only wrong-type --locales pl           # narrow reason + locale together
#   bash i18n-summary.sh --out ./artifacts                        # write log + annotations under ./artifacts/
#   bash i18n-summary.sh --only wrong-type --out "$RUNNER_TEMP/i18n"   # CI-friendly artifact path
#   bash i18n-summary.sh --list                                   # print reason → test-file table and exit
set -euo pipefail

# Defaults — overridden by --out below. The two filenames stay constant so downstream
# tooling (CI artifact upload, grep recipes in this README) can hard-code them.
DEFAULT_OUT_DIR="/tmp"
LOG_NAME="i18n-summary.log"
ANN_NAME="i18n-summary-annotations.txt"

# All five reasons the validator can emit. Severity in parentheses is informational
# only — the actual classification comes from WARNING_REASONS in i18nGithubAnnotations.ts.
ALL_ERROR_REASONS=(missing-required-key placeholder-mismatch undeclared-key wrong-type)
ALL_WARNING_REASONS=(empty-optional-value)

# reason → owning test file (mirrors the "owned by" lines in the End-to-end walkthrough).
declare -A REASON_TEST=(
  [missing-required-key]="src/lib/i18nRequiredKeys.test.ts"
  [placeholder-mismatch]="src/lib/i18nPlaceholders.test.ts"
  [undeclared-key]="src/lib/i18nContract.test.ts"
  [wrong-type]="src/lib/i18nContract.test.ts"
  [empty-optional-value]="src/lib/i18nContract.test.ts"
)

# Locales the validator currently supports (mirrors SUPPORTED_LOCALES in
# src/lib/i18nActiveLocales.ts). Used to validate --locales values early.
ALL_LOCALES=(pl en de it)

ONLY="all"
LOCALES=""  # empty → use $I18N_ACTIVE_LOCALES if set, else fall back to pl,en,de,it
OUT_DIR=""  # empty → falls back to $DEFAULT_OUT_DIR (/tmp)
while [ $# -gt 0 ]; do
  case "$1" in
    --only|-o)    ONLY="${2:-}"; shift 2 ;;
    --only=*)     ONLY="${1#*=}"; shift ;;
    --locales|-L) LOCALES="${2:-}"; shift 2 ;;
    --locales=*)  LOCALES="${1#*=}"; shift ;;
    --out|-O)     OUT_DIR="${2:-}"; shift 2 ;;
    --out=*)      OUT_DIR="${1#*=}"; shift ;;
    --list|-l)
      printf '%-24s  %-10s  %s\n' "REASON" "SEVERITY" "TEST FILE (--only value)"
      printf '%-24s  %-10s  %s\n' "------" "--------" "------------------------"
      for r in "${ALL_ERROR_REASONS[@]}"; do
        printf '%-24s  %-10s  %s\n' "$r" "error" "${REASON_TEST[$r]}"
      done
      for r in "${ALL_WARNING_REASONS[@]}"; do
        printf '%-24s  %-10s  %s\n' "$r" "warning" "${REASON_TEST[$r]}"
      done
      printf '\nKnown locales (for --locales): %s\n' "${ALL_LOCALES[*]}"
      printf 'Default output dir (for --out): %s\n' "$DEFAULT_OUT_DIR"
      printf 'Output filenames: %s, %s\n' "$LOG_NAME" "$ANN_NAME"
      printf 'Example: bash i18n-summary.sh --only %s --locales en,de --out ./artifacts\n' "${ALL_ERROR_REASONS[0]}"
      exit 0 ;;
    -h|--help)
      echo "Usage: $0 [--only <reason>[,<reason>…]|all] [--locales <locale>[,<locale>…]] [--out <dir>] [--list]"
      echo "Reasons: ${ALL_ERROR_REASONS[*]} ${ALL_WARNING_REASONS[*]} | all"
      echo "Locales: ${ALL_LOCALES[*]} (defaults to \$I18N_ACTIVE_LOCALES, else pl,en,de,it)"
      echo "Output:  defaults to $DEFAULT_OUT_DIR; --out <dir> writes $LOG_NAME and $ANN_NAME under <dir> (created if missing)"
      echo "Run '$0 --list' for a reason → test-file table."
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Resolve effective output directory. Precedence: --out flag > $I18N_SUMMARY_OUT env > default.
# We mkdir -p so callers can pass a fresh CI artifact path without pre-creating it.
if [ -n "$OUT_DIR" ]; then
  EFFECTIVE_OUT_DIR="$OUT_DIR"
  OUT_SOURCE="--out flag"
elif [ -n "${I18N_SUMMARY_OUT:-}" ]; then
  EFFECTIVE_OUT_DIR="$I18N_SUMMARY_OUT"
  OUT_SOURCE="\$I18N_SUMMARY_OUT env"
else
  EFFECTIVE_OUT_DIR="$DEFAULT_OUT_DIR"
  OUT_SOURCE="default"
fi
mkdir -p "$EFFECTIVE_OUT_DIR" || {
  echo "❌ Cannot create output dir: '$EFFECTIVE_OUT_DIR'" >&2
  exit 2
}
if [ ! -w "$EFFECTIVE_OUT_DIR" ]; then
  echo "❌ Output dir is not writable: '$EFFECTIVE_OUT_DIR'" >&2
  exit 2
fi
LOG="$EFFECTIVE_OUT_DIR/$LOG_NAME"
ANN="$EFFECTIVE_OUT_DIR/$ANN_NAME"

# Resolve which reasons + which test files to run.
# `ONLY` may be "all" or a comma-separated list of reasons (e.g. "placeholder-mismatch,wrong-type").
SELECTED_REASONS=()
if [ "$ONLY" = "all" ]; then
  SELECTED_REASONS=("${ALL_ERROR_REASONS[@]}" "${ALL_WARNING_REASONS[@]}")
else
  IFS=',' read -ra RAW_REASONS <<< "$ONLY"
  declare -A SEEN=()
  for raw in "${RAW_REASONS[@]}"; do
    r="${raw// /}"  # strip stray spaces around commas
    [ -z "$r" ] && continue
    if [ -z "${REASON_TEST[$r]:-}" ]; then
      echo "❌ Unknown --only reason: '$r'" >&2
      echo "   Valid: ${ALL_ERROR_REASONS[*]} ${ALL_WARNING_REASONS[*]} all" >&2
      exit 2
    fi
    if [ -z "${SEEN[$r]:-}" ]; then
      SELECTED_REASONS+=("$r")
      SEEN[$r]=1
    fi
  done
  if [ ${#SELECTED_REASONS[@]} -eq 0 ]; then
    echo "❌ --only requires at least one reason" >&2
    exit 2
  fi
fi

# Classify selected reasons → error vs warning rows for the summary table.
ERROR_REASONS=()
WARNING_REASONS=()
for r in "${SELECTED_REASONS[@]}"; do
  is_warn=0
  for w in "${ALL_WARNING_REASONS[@]}"; do
    [ "$r" = "$w" ] && is_warn=1
  done
  if [ "$is_warn" -eq 1 ]; then
    WARNING_REASONS+=("$r")
  else
    ERROR_REASONS+=("$r")
  fi
done

# Union of owning test files (de-duplicated, preserves first-seen order).
TEST_FILES=()
declare -A SEEN_FILE=()
for r in "${SELECTED_REASONS[@]}"; do
  f="${REASON_TEST[$r]}"
  if [ -z "${SEEN_FILE[$f]:-}" ]; then
    TEST_FILES+=("$f")
    SEEN_FILE[$f]=1
  fi
done

# Resolve effective locale scope. Precedence: --locales flag > $I18N_ACTIVE_LOCALES env > default.
# When --locales is passed we validate every entry against ALL_LOCALES and rebuild a clean,
# de-duplicated, comma-joined string so typos like `--locales en, fr` fail fast instead of
# silently dropping `fr` inside the test runner.
if [ -n "$LOCALES" ]; then
  IFS=',' read -ra RAW_LOCALES <<< "$LOCALES"
  declare -A SEEN_LOC=()
  CLEAN_LOCALES=()
  for raw in "${RAW_LOCALES[@]}"; do
    l="${raw// /}"
    [ -z "$l" ] && continue
    is_known=0
    for k in "${ALL_LOCALES[@]}"; do
      [ "$l" = "$k" ] && is_known=1
    done
    if [ "$is_known" -eq 0 ]; then
      echo "❌ Unknown --locales value: '$l'" >&2
      echo "   Valid: ${ALL_LOCALES[*]}" >&2
      exit 2
    fi
    if [ -z "${SEEN_LOC[$l]:-}" ]; then
      CLEAN_LOCALES+=("$l")
      SEEN_LOC[$l]=1
    fi
  done
  if [ ${#CLEAN_LOCALES[@]} -eq 0 ]; then
    echo "❌ --locales requires at least one locale" >&2
    exit 2
  fi
  EFFECTIVE_LOCALES=$(IFS=','; echo "${CLEAN_LOCALES[*]}")
  LOCALE_SOURCE="--locales flag"
elif [ -n "${I18N_ACTIVE_LOCALES:-}" ]; then
  EFFECTIVE_LOCALES="$I18N_ACTIVE_LOCALES"
  LOCALE_SOURCE="\$I18N_ACTIVE_LOCALES env"
else
  EFFECTIVE_LOCALES="pl,en,de,it"
  LOCALE_SOURCE="default"
fi

echo "▶ Running i18n contract tests (filter: $ONLY)…"
echo "  Reasons:    ${SELECTED_REASONS[*]}"
echo "  Locales:    $EFFECTIVE_LOCALES   ($LOCALE_SOURCE)"
echo "  Test files: ${TEST_FILES[*]}"
echo "  Output dir: $EFFECTIVE_OUT_DIR   ($OUT_SOURCE)"
# `|| true` — vitest exits non-zero on any failing test; we want to inspect annotations
# regardless. The final exit code is recomputed from the per-reason counts below.
GITHUB_ACTIONS=true I18N_ACTIVE_LOCALES="$EFFECTIVE_LOCALES" \
  bunx vitest run "${TEST_FILES[@]}" > "$LOG" 2>&1 || true

# When filtering, keep only annotations for the selected reasons so $ANN and TOTAL match
# what the table reports. In `all` mode, keep every annotation.
if [ "$ONLY" = "all" ]; then
  grep '^::' "$LOG" | sort -u > "$ANN" || true
else
  # Build an alternation pattern: reason=(a|b|c)
  REASON_RE=$(IFS='|'; echo "${SELECTED_REASONS[*]}")
  grep '^::' "$LOG" | grep -E "reason=($REASON_RE)" | sort -u > "$ANN" || true
fi
TOTAL=$(wc -l < "$ANN" | tr -d ' ')

echo
echo "═══════════════════════════════════════════════════════"
if [ "$ONLY" = "all" ]; then
  echo "  i18n contract — PASS/FAIL summary by reason"
else
  echo "  i18n contract — PASS/FAIL summary (filter: $ONLY)"
fi
echo "═══════════════════════════════════════════════════════"
printf "  %-26s %-10s %s\n" "REASON" "SEVERITY" "VERDICT"
echo "  ---------------------------------------------------"

FAIL_COUNT=0
for reason in "${ERROR_REASONS[@]}"; do
  hits=$(grep -c "reason=$reason" "$ANN" || true)
  if [ "$hits" -eq 0 ]; then
    printf "  %-26s %-10s ✅ PASS\n" "$reason" "error"
  else
    printf "  %-26s %-10s ❌ FAIL (%d)\n" "$reason" "error" "$hits"
    FAIL_COUNT=$((FAIL_COUNT + hits))
  fi
done

for reason in "${WARNING_REASONS[@]}"; do
  hits=$(grep -c "reason=$reason" "$ANN" || true)
  if [ "$hits" -eq 0 ]; then
    printf "  %-26s %-10s ✅ PASS\n" "$reason" "warning"
  else
    printf "  %-26s %-10s ⚠️  WARN (%d)\n" "$reason" "warning" "$hits"
  fi
done

echo "  ---------------------------------------------------"
printf "  %-26s %-10s %s\n" "TOTAL ANNOTATIONS" "—" "$TOTAL"
echo "═══════════════════════════════════════════════════════"
echo
echo "  Full log:        $LOG"
echo "  Annotations:     $ANN"
echo

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "✅ Overall: PASS — no error-severity violations for filter '$ONLY'."
  exit 0
else
  echo "❌ Overall: FAIL — $FAIL_COUNT error-severity violation(s) for '$ONLY'. See $ANN."
  exit 1
fi
```

Sample output for `bash i18n-summary.sh --only placeholder-mismatch` after pasting fixture #2:

```
▶ Running i18n contract tests (filter: placeholder-mismatch)…
  Reasons:    placeholder-mismatch
  Locales:    pl,en,de,it   (default)
  Test files: src/lib/i18nPlaceholders.test.ts
  Output dir: /tmp   (default)

═══════════════════════════════════════════════════════
  i18n contract — PASS/FAIL summary (filter: placeholder-mismatch)
═══════════════════════════════════════════════════════
  REASON                     SEVERITY   VERDICT
  ---------------------------------------------------
  placeholder-mismatch       error      ❌ FAIL (1)
  ---------------------------------------------------
  TOTAL ANNOTATIONS          —          1
═══════════════════════════════════════════════════════

❌ Overall: FAIL — 1 error-severity violation(s) for 'placeholder-mismatch'. See /tmp/i18n-summary-annotations.txt.
```

Sample output for `bash i18n-summary.sh --only placeholder-mismatch,wrong-type` after pasting fixtures #2 + #5 (multi-reason filter — note how the script runs **both** owning test files and prints **both** rows in one summary):

```
▶ Running i18n contract tests (filter: placeholder-mismatch,wrong-type)…
  Reasons:    placeholder-mismatch wrong-type
  Locales:    pl,en,de,it   (default)
  Test files: src/lib/i18nPlaceholders.test.ts src/lib/i18nContract.test.ts
  Output dir: /tmp   (default)

═══════════════════════════════════════════════════════
  i18n contract — PASS/FAIL summary (filter: placeholder-mismatch,wrong-type)
═══════════════════════════════════════════════════════
  REASON                     SEVERITY   VERDICT
  ---------------------------------------------------
  placeholder-mismatch       error      ❌ FAIL (1)
  wrong-type                 error      ❌ FAIL (1)
  ---------------------------------------------------
  TOTAL ANNOTATIONS          —          2
═══════════════════════════════════════════════════════

❌ Overall: FAIL — 2 error-severity violation(s) for 'placeholder-mismatch,wrong-type'. See /tmp/i18n-summary-annotations.txt.
```

Whitespace around commas is tolerated (`--only "placeholder-mismatch, wrong-type"` works), duplicate reasons are de-duplicated (`--only wrong-type,wrong-type` is treated as one), and the `TOTAL` count reflects only the selected reasons — annotations from other reasons that happened to surface in the same test run are filtered out before counting.

Sample output for `bash i18n-summary.sh --only wrong-type --locales pl` (single reason + single locale — fastest possible run, ~3s, useful for tight edit-test loops on one Polish fixture):

```
▶ Running i18n contract tests (filter: wrong-type)…
  Reasons:    wrong-type
  Locales:    pl   (--locales flag)
  Test files: src/lib/i18nContract.test.ts
  Output dir: /tmp   (default)

═══════════════════════════════════════════════════════
  i18n contract — PASS/FAIL summary (filter: wrong-type)
═══════════════════════════════════════════════════════
  REASON                     SEVERITY   VERDICT
  ---------------------------------------------------
  wrong-type                 error      ✅ PASS
  ---------------------------------------------------
  TOTAL ANNOTATIONS          —          0
═══════════════════════════════════════════════════════

✅ Overall: PASS — no error-severity violations for filter 'wrong-type'.
```

Sample output for `bash i18n-summary.sh --only placeholder-mismatch --out ./artifacts` (custom output dir — useful in CI so the log + annotations end up under your job's artifact path and survive the runner teardown):

```
▶ Running i18n contract tests (filter: placeholder-mismatch)…
  Reasons:    placeholder-mismatch
  Locales:    pl,en,de,it   (default)
  Test files: src/lib/i18nPlaceholders.test.ts
  Output dir: ./artifacts   (--out flag)

═══════════════════════════════════════════════════════
  i18n contract — PASS/FAIL summary (filter: placeholder-mismatch)
═══════════════════════════════════════════════════════
  REASON                     SEVERITY   VERDICT
  ---------------------------------------------------
  placeholder-mismatch       error      ❌ FAIL (1)
  ---------------------------------------------------
  TOTAL ANNOTATIONS          —          1
═══════════════════════════════════════════════════════

  Full log:        ./artifacts/i18n-summary.log
  Annotations:     ./artifacts/i18n-summary-annotations.txt

❌ Overall: FAIL — 1 error-severity violation(s) for 'placeholder-mismatch'. See ./artifacts/i18n-summary-annotations.txt.
```

The directory is created with `mkdir -p` (relative or absolute paths both work), and the script aborts with exit code `2` if creation fails or the directory isn't writable. Filenames inside the dir are fixed (`i18n-summary.log` and `i18n-summary-annotations.txt`) so CI artifact-upload steps and the grep recipes elsewhere in this README can hard-code them — only the parent dir changes.

Sample output (clean repo — no drift):

```
▶ Running i18n contract tests (this takes ~10s)…

═══════════════════════════════════════════════════════
  i18n contract — PASS/FAIL summary by reason
═══════════════════════════════════════════════════════
  REASON                     SEVERITY   VERDICT
  ---------------------------------------------------
  missing-required-key       error      ✅ PASS
  placeholder-mismatch       error      ✅ PASS
  undeclared-key             error      ✅ PASS
  wrong-type                 error      ✅ PASS
  empty-optional-value       warning    ✅ PASS
  ---------------------------------------------------
  TOTAL ANNOTATIONS          —          0
═══════════════════════════════════════════════════════

  Full log:        /tmp/i18n-summary.log
  Annotations:     /tmp/i18n-summary-annotations.txt

✅ Overall: PASS — no error-severity violations.
```

Sample output (after pasting fixtures #2 + #4 + #5 from the [End-to-end walkthrough](#end-to-end-walkthrough--one-fixture-per-error-type-start-to-finish)):

```
═══════════════════════════════════════════════════════
  i18n contract — PASS/FAIL summary by reason
═══════════════════════════════════════════════════════
  REASON                     SEVERITY   VERDICT
  ---------------------------------------------------
  missing-required-key       error      ✅ PASS
  placeholder-mismatch       error      ❌ FAIL (1)
  undeclared-key             error      ✅ PASS
  wrong-type                 error      ❌ FAIL (1)
  empty-optional-value       warning    ⚠️  WARN (1)
  ---------------------------------------------------
  TOTAL ANNOTATIONS          —          3
═══════════════════════════════════════════════════════

❌ Overall: FAIL — 2 error-severity violation(s). See /tmp/i18n-summary-annotations.txt for details.
```

**Notes on behaviour**

- **Locale scope** — defaults to `pl,en,de,it` so all five fixture types are in scope. Override per-run with `--locales en,de` (validated against `SUPPORTED_LOCALES`) or per-shell with `I18N_ACTIVE_LOCALES=pl,en bash i18n-summary.sh`. Precedence is `--locales` > env > default; the chosen source is printed on the `Locales:` echo line for traceability.
- **Exit code** — `0` iff every error-severity reason is `PASS`. `empty-optional-value` (the only warning reason) **never** flips the verdict, matching the in-CI behaviour where warnings stay green.
- **Dedup** — `sort -u` collapses duplicate annotations (a stacked fixture can trip the same key in multiple tests). Counts are post-dedup, so the table mirrors what reviewers actually see in the PR diff.
- **Multi-reason filter** — `--only a,b,c` runs the **union** of owning test files (so `--only placeholder-mismatch,wrong-type` runs both `i18nPlaceholders.test.ts` and `i18nContract.test.ts`), then narrows the annotations file to `reason=(a|b|c)` before counting. Each selected reason gets its own row, and the overall verdict fails iff any selected **error-severity** reason has hits — adding `empty-optional-value` to the list never flips the verdict.
- **Output dir** — defaults to `/tmp` (`i18n-summary.log` + `i18n-summary-annotations.txt`). Override per-run with `--out ./artifacts` or per-shell with `I18N_SUMMARY_OUT=./artifacts bash i18n-summary.sh`. Precedence is `--out` > env > default; the resolved path + source is echoed on the `Output dir:` line. The script `mkdir -p`s the target and refuses to run if it can't create or write to it (exit `2`). Filenames are intentionally fixed so downstream tooling — CI artifact upload, the [grep recipes](#grep-recipes--find-a-specific-reason--locale-in-tmpi18n-summarylog) below — can hard-code them; only the parent dir varies.
- **Wire into CI** — drop the script into `scripts/`, add a `"i18n:summary": "bash scripts/i18n-summary.sh"` entry to `package.json`, and call it from `.github/workflows/i18n-check.yml` for a compact summary line in the Actions log alongside the existing inline annotations. For artifact preservation across runs, pair it with `--out "$RUNNER_TEMP/i18n"` followed by `- uses: actions/upload-artifact@v4` pointing at the same path.

#### Listing all available fixture error types

Run the script with `--list` (alias `-l`) to print every reason the validator can emit, its severity, and the owning test file — which is exactly the value you pass to `--only`. No tests are executed; the command is safe to run on any branch.

```sh
bash i18n-summary.sh --list
```

Expected output (stable across runs — the lists are sourced from `ALL_ERROR_REASONS` / `ALL_WARNING_REASONS` / `REASON_TEST` at the top of the script):

```text
REASON                    SEVERITY    TEST FILE (--only value)
------                    --------    ------------------------
missing-required-key      error       src/lib/i18nRequiredKeys.test.ts
placeholder-mismatch      error       src/lib/i18nPlaceholders.test.ts
undeclared-key            error       src/lib/i18nContract.test.ts
wrong-type                error       src/lib/i18nContract.test.ts
empty-optional-value      warning     src/lib/i18nContract.test.ts

Example: bash i18n-summary.sh --only missing-required-key
```

Quick reference (same data, for readers who don't want to run the script):

| `--only` value | Severity | Owning test file | Build-fail? |
| --- | --- | --- | --- |
| `missing-required-key` | `::error` | `src/lib/i18nRequiredKeys.test.ts` | yes |
| `placeholder-mismatch` | `::error` | `src/lib/i18nPlaceholders.test.ts` | yes |
| `undeclared-key` | `::error` | `src/lib/i18nContract.test.ts` | yes |
| `wrong-type` | `::error` | `src/lib/i18nContract.test.ts` | yes |
| `empty-optional-value` | `::warning` | `src/lib/i18nContract.test.ts` | no (advisory) |
| `all` (default) | mixed | all three above | yes if any error reason hits |

Severity is decided by `classifyReasonSeverity` in `src/lib/i18nGithubAnnotations.ts` (the `WARNING_REASONS` set currently contains only `empty-optional-value`); see [i18n CI annotation severity](mem://features/i18n-ci-annotation-severity.md). When you add a new reason to the validator, update `ALL_ERROR_REASONS` / `ALL_WARNING_REASONS` and `REASON_TEST` at the top of `i18n-summary.sh` so `--list` stays in sync.

#### "I ran the command and got nothing" — quick triage

| Symptom | Most likely cause | Fix |
| --- | --- | --- |
| Empty output, exit code `0` | Forgot `GITHUB_ACTIONS=true`, or fixture didn't actually trip a rule | Re-run with the env var; `git diff` to confirm the mutation is in place |
| Empty output, exit code non-zero | Test failed but emitter was off | Add `GITHUB_ACTIONS=true` |
| Output for a different locale than expected | Default scope is `pl,en`; your fixture targets `de` / `it` and was skipped | Add `I18N_ACTIVE_LOCALES=pl,en,de` (or `…,it`) |
| `line=0` in the annotation | Resolver couldn't locate the key (indent style differs from 2-space, or the key is truly absent for `missing-required-key`) | For `missing-required-key`, `line=N` of the locale-block opener is expected; otherwise see [resolver troubleshooting](#troubleshooting-line-lands-on-the-wrong-line) |
| Multiple annotations for one fixture | Stacked fixtures or one mutation tripped two rules (e.g. missing key + placeholder mismatch on a sibling) | `git checkout src/lib/lastChange*.ts` to reset, then re-paste only one fixture |

For deeper diagnostics, set `I18N_ANNOTATION_DEBUG=1` alongside `GITHUB_ACTIONS=true` to print the resolver's per-annotation decisions to stderr — see [Debug flag](#debug-flag-i18n_annotation_debug1).

### Copy-paste GitHub Actions workflow

Drop this into `.github/workflows/i18n-check.yml` and it will run on every PR against `main`, post `::error` / `::warning` annotations inline on the diff, and **fail the build** the moment any `::error` is emitted (vitest exits non-zero on test failure, which is what triggers the `::error` lines in the first place — so a non-zero exit and a red ❌ check are equivalent).

```yaml
name: i18n contract

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  i18n-check:
    name: i18n contract + annotations
    runs-on: ubuntu-latest
    timeout-minutes: 5
    # GITHUB_ACTIONS=true is set automatically on GitHub-hosted runners, so the
    # emitter in src/lib/i18nGithubAnnotations.ts activates without extra env.
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Verify REQUIRED_* lists are in sync
        run: npm run i18n:check

      - name: Run i18n contract tests (emits PR annotations)
        # vitest forwards stdout from workers; the `::error` / `::warning`
        # lines are picked up by the runner and rendered inline on the diff.
        # Any `::error` ⇒ failing test ⇒ non-zero exit ⇒ red ❌ check on the PR.
        run: npx vitest run
          src/lib/i18nRequiredKeys.test.ts
          src/lib/i18nContract.test.ts
          src/lib/i18nPlaceholders.test.ts
          src/lib/i18nGithubAnnotations.test.ts
```

**How the failure gate works** — there is no extra `grep '::error'` step needed, because:

1. The emitter is only called from inside failing test assertions (`expect(violations).toHaveLength(0)`). No `::error` line can appear unless a test failed.
2. A failing vitest test ⇒ non-zero process exit ⇒ the `Run i18n contract tests` step is marked failed ⇒ the `i18n-check` job is failed ⇒ the PR check is red and merge is blocked (if branch protection requires this check).
3. `::warning` lines (currently only `empty-optional-value`) do **not** fail tests — they're informational and the build stays green.

If you ever want to fail the build on `::warning` too, flip the reason in `WARNING_REASONS` (in `src/lib/i18nGithubAnnotations.ts`) — the assertion will then trip and the same chain above takes over. Don't add a `grep`-based gate to the workflow; keep the truth source in the test code.

> **Branch protection**: to actually block merges, go to **Settings → Branches → Branch protection rules → main** and add `i18n contract / i18n contract + annotations` to the list of required status checks.

This repo's actual workflow lives at [`.github/workflows/i18n-check.yml`](.github/workflows/i18n-check.yml) and additionally restricts `paths:` to the i18n-relevant files so unrelated PRs skip the job.

### Workflow command format

The emitter (`src/lib/i18nGithubAnnotations.ts`) writes one line to stdout per violation, using GitHub Actions’ [workflow command](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message) protocol:

```text
::error file=<path>,line=<n>,title=<short>::<message>
::warning file=<path>,line=<n>,title=<short>::<message>
```

Rules to remember when changing the emitter:

- **Severity**: `::error` fails the check (red X); `::warning` is yellow only and does **not** fail the build. Severity is decided by `classifyReasonSeverity(reason)`. Add new advisory reasons to `WARNING_REASONS` — keep that set conservative.
- **Properties** (`file=`, `line=`, `title=`): commas and colons must be escaped (`%2C`, `%3A`) — handled by `escapeProperty`. Title is part of the property segment, so it must never contain a raw `:`.
- **Message body**: percent-encode `%`, `\r`, `\n` (`escapeData`). Order matters: encode `%` first, otherwise `%0A` becomes `%2525…`.
- **Dedup**: identical `(locale, path, reason)` triples are collapsed within a single call **and** across calls (first-emitter-wins, module-level cache). Tests reset state via `__resetAnnotationDedupForTesting()`.
- **CI-only**: the emitter is a no-op unless `process.env.GITHUB_ACTIONS === "true"`, so local `npm test` stays clean.

#### Escape edge cases

Property values (`file=`, `line=`, `title=`) and the message body have **different** escape rules. Get them wrong and GitHub silently truncates the annotation at the first stray `,` or `:`. Quick reference:

| Char | In properties (`file`, `title`, …) | In message body | Why |
| --- | --- | --- | --- |
| `,` (comma) | `%2C` | *(literal)* | Commas separate properties — a raw `,` in `title` ends the title early. |
| `:` (colon) | `%3A` | *(literal)* | `::` ends the property segment and starts the message — a raw `:` in `title` truncates everything after. |
| `%` (percent) | `%25` | `%25` | Must be encoded **first** in both, otherwise a later `%0A` becomes `%2525…`. |
| `\r` (CR) | `%0D` | `%0D` | Newlines end the workflow command line — would split one annotation into two. |
| `\n` (LF) | `%0A` | `%0A` | Same as CR. Use `%0A` to render multi-line messages in the PR popover. |
| `]` (right bracket) | *(literal)* | *(literal)* | No escape needed — included here because some docs claim otherwise. |

Before / after example for a title containing all four hot chars (`Missing key: foo, bar (50%)\n`):

| Field | Raw | Encoded |
| --- | --- | --- |
| `title=` | `Missing key: foo, bar (50%)\n` | `Missing key%3A foo%2C bar (50%25)%0A` |
| message | `Missing key: foo, bar (50%)\n` | `Missing key: foo, bar (50%25)%0A` |

The helpers `escapeProperty` and `escapeData` in `src/lib/i18nGithubAnnotations.ts` implement exactly this table — reach for them instead of hand-rolling escapes.

#### Supported locale value formats

Locale values in `src/lib/lastChangeTooltipContent.ts` and `lastChangeTooltipModel.ts` may be written in any of the formats below. The annotation resolver normalizes them to a **single-line snippet** in the message body, while `line=` always points at the **key declaration line** (the row where `keyName:` appears) — never at a continuation line.

| Format | Example source | How the message is encoded |
| --- | --- | --- |
| **Single-line string** | `heading: "Last change",` | Value copied verbatim into the message; only `%`, `\r`, `\n` get percent-encoded (`escapeData`). |
| **Single-line with literal escapes** | `hint: "Line 1\nLine 2",` | The string `\n` you wrote is a real newline in the JS value → emitted as `%0A` so the PR popover renders two lines. `\t` → tab (literal in body). `\\` → single backslash. |
| **Single-line with quotes** | `label: "He said \"hi\"",` | Quotes are unescaped to literal `"` in the message body; no extra encoding needed. |
| **Multi-line template literal** | <code>body: \`Line 1<br>Line 2\`,</code> | `assembleMultiLineSnippet` walks forward tracking backtick balance, collapses internal whitespace runs to a single space, and emits one line. Embedded literal newlines become a single space — they do **not** become `%0A`. Use `\n` inside a double-quoted string if you want a rendered line break. |
| **Multi-line array** | `tags: [\n  "a",\n  "b",\n],` | Bracket/brace/paren balance is tracked; the assembler stops on the matching `]` + terminator. The collapsed form (e.g. `[ "a", "b", ]`) appears in the message. |
| **Multi-line object** | `meta: {\n  k: "v",\n},` | Same as array — brace balance terminates the walk. |
| **Concatenated strings** | `text: "part 1 " +\n  "part 2",` | Trailing `+` marks the line as a continuation; the assembler keeps walking until a balanced terminator on a non-continuation line. |
| **Colon-only opener** | `nested:\n  { … }` | Treated as a multi-line opener; walk continues into the next line's `{`. |

Caps and safety:

- **Length cap**: assembled snippets are truncated at `MAX_SNIPPET_LEN = 200` chars with a trailing `…`. Long template literals won't blow up the workflow log.
- **Safety stop**: if balance never closes (malformed source), the walk stops at the next dedent below the key's indentation — the snippet is whatever was collected so far.
- **Final encoding**: whatever the assembler produces is fed through `escapeData`, so any real `\n` / `\r` / `%` that survived the collapse step is percent-encoded before hitting stdout.

Worked example — multi-line template literal:

```ts
// source (lastChangeTooltipContent.ts, line 87)
hint: `Open the diary,
       then tap "Last change"
       to review history.`,
```

Produces (note: line=87 points at the `hint:` row, embedded newlines collapsed to spaces, no `%0A`):

```text
::error file=src/lib/lastChangeTooltipContent.ts,line=87,title=TRANSLATIONS [error]%3A en · placeholder-mismatch::Locale "en" value "Open the diary, then tap \"Last change\" to review history." is missing placeholder {count}.
```

Worked example — escaped `\n` inside a single-line string:

```ts
hint: "Open the diary.\nThen tap \"Last change\".",
```

Produces (note: `\n` → `%0A` → renders as a real line break in the PR popover):

```text
::error file=src/lib/lastChangeTooltipContent.ts,line=87,title=…::Locale "en" value "Open the diary.%0AThen tap \"Last change\"." …
```

**Rule of thumb**: if you want a rendered line break in the PR annotation, write `\n` in a double-quoted string. If you write a literal newline (template literal or multi-line array/object), the assembler will collapse it to a space.

#### Concrete examples

Copy-paste-ready stdout lines as the emitter would print them in CI. Useful when writing new tests or eyeballing a workflow log.

**1. Missing required key** (`missing-required-key`, severity `error`):

```text
::error file=src/lib/lastChangeTooltipContent.ts,line=42,title=TRANSLATIONS [error]%3A en · missing-required-key::Locale "en" is missing required key "local.heading". Expected value: "Last change".
```

**2. Placeholder mismatch** (`placeholder-mismatch`, severity `error`) — note the escaped `{count}` payload and the `,` inside the message that stays literal:

```text
::error file=src/lib/lastChangeTooltipContent.ts,line=87,title=TRANSLATIONS [error]%3A pl · placeholder-mismatch::Locale "pl" value "Zmieniono %d razy" is missing placeholder {count}, expected by base locale "en" ("Changed {count} times").
```

**3. Empty optional value with escaped chars in the message** (`empty-optional-value`, severity `warning`, message contains `%`, `\n`, `:` and `,`):

```text
::warning file=src/lib/lastChangeTooltipModel.ts,line=120,title=TIME_LINE [warning]%3A de · empty-optional-value::Locale "de" key "relative.minutesAgo" is empty (50%25 coverage).%0AHint: copy from "en", then translate — commas, colons stay literal here.
```

Things to notice:

- Inside `title=` the `:` after the group name is encoded as `%3A` (otherwise GitHub would cut the title at `TRANSLATIONS [error]` and treat the rest as the message).
- Inside the **message body**, `:` and `,` stay literal — only `%`, `\r`, `\n` need encoding (`%25`, `%0D`, `%0A`).
- Newlines in the message render as line breaks in the PR popover, so `%0A` is the safe way to write multi-line hints.

#### Locale module structure & placeholder conventions

The validator reads two TypeScript modules — **not** `locales/*.json` files — but the contract it enforces maps 1:1 to a conventional flat-JSON locale layout. Both shapes are documented here so fixtures stay reproducible regardless of which mental model you bring.

##### Actual module exports (ground truth)

This subsection documents the **real** symbols the validator imports — file paths, export names, and exact shapes. The simplified `TRANSLATIONS` / `TIME_LINE` literals shown in later subsections are pedagogical; the production code has a richer shape, and reproducing failures requires hitting the real exports.

###### File 1 — `src/lib/lastChangeTooltipContent.ts`

| Export | Type / shape | Used by |
| --- | --- | --- |
| `Locale` | `"pl" \| "en" \| "de" \| "it"` (type alias) | All test files for type-safe locale iteration |
| `SUPPORTED_LOCALES` | `readonly Locale[]` = `["pl", "en", "de", "it"]` | `i18nRequiredKeys.test.ts` (the unconditional locale list — every locale here MUST satisfy the contract) |
| `TranslationEntry` | Interface defining one locale's payload (nested objects with `local`, `remote`, `sourcePrefix`, etc.) | Type guard for `__getRawTranslationsForTesting` |
| `REQUIRED_TRANSLATION_KEYS` | **Object** with three buckets (NOT a flat array): `{ top: readonly string[], variant: readonly string[], variantOptional: readonly string[] }` | `i18nRequiredKeys.test.ts`, `scripts/autofix-required-translation-keys.mjs` |
| `__getRawTranslationsForTesting` | `() => Record<Locale, TranslationEntry>` — exposes the in-memory map without going through `getLastChangeTooltipContent`'s fallback chain | All three contract tests; the leading `__` marks it as test-only API |

The three required-key buckets carry distinct semantics:

- **`REQUIRED_TRANSLATION_KEYS.top`** — top-level keys (e.g. `"sourcePrefix"`). Missing → `missing-required-key`.
- **`REQUIRED_TRANSLATION_KEYS.variant`** — keys inside `local.*` / `remote.*` variant blocks (e.g. `"heading"`, `"description"`). Missing in any locale → `missing-required-key`. Each variant key must exist in **both** `local` and `remote` for every locale.
- **`REQUIRED_TRANSLATION_KEYS.variantOptional`** — keys that may be empty string `""` in non-reference locales. Empty → `empty-optional-value` (`::warning`). Absent → still `missing-required-key`.

###### File 2 — `src/lib/lastChangeTooltipModel.ts`

| Export | Type / shape | Used by |
| --- | --- | --- |
| `TimeLineStrings` | Interface defining one locale's time-line payload (`relative.*`, `qualifier.*`, `timePrefix`) | Type guard for `__getRawTimeLineTranslationsForTesting` |
| `REQUIRED_TIME_LINE_KEYS` | `readonly string[]` — flat dotted-path list (e.g. `"relative.minutesAgo"`, `"timePrefix"`) | `i18nRequiredKeys.test.ts` |
| `__getRawTimeLineTranslationsForTesting` | `() => Record<Locale, TimeLineStrings>` | All three contract tests |
| `validateLastChangeTooltipInput`, `smoothTimeValue`, etc. | Runtime helpers — **not** read by the contract validator, but they consume the same locale map, which is why the contract matters | App code only |

###### File 3 — `src/lib/i18nActiveLocales.ts` (env-driven test scope)

The contract tests don't always validate **every** locale in `SUPPORTED_LOCALES`. They consult `getActiveLocalesForTests()` to support faster local iteration on a subset.

| Export | Purpose |
| --- | --- |
| `getActiveLocalesForTests()` | Returns the locale list the tests should iterate. Reads `I18N_ACTIVE_LOCALES` env var (comma-separated) → falls back to `DEFAULT_ACTIVE_LOCALES` → falls back to `SUPPORTED_LOCALES` |
| `DEFAULT_ACTIVE_LOCALES` | `["pl", "en"]` — the minimum set CI always validates |
| `ENV_ACTIVE_LIST` | String constant `"I18N_ACTIVE_LOCALES"` — the env var name |
| `isActiveLocalesMode()` | Returns `true` when the env or test-mode flag narrowed the active set below `SUPPORTED_LOCALES` |

**Implication for fixtures**: when a fixture targets `de` or `it`, run with the locale included in scope:

```sh
I18N_ACTIVE_LOCALES=pl,en,de,it GITHUB_ACTIVE_LOCALES=true \
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nRequiredKeys.test.ts
```

Without this, `de`/`it` violations may be silently skipped because `DEFAULT_ACTIVE_LOCALES` is `["pl", "en"]` only.

###### File 4 — `src/lib/i18nGithubAnnotations.ts` (the validator itself)

The annotation emitter wires everything together. Constants you'll touch when extending the contract:

| Constant / function | Value / purpose |
| --- | --- |
| `SOURCE_FILES` | `{ TRANSLATIONS: "src/lib/lastChangeTooltipContent.ts", TIME_LINE: "src/lib/lastChangeTooltipModel.ts" }` — the prefix → file map written into `file=` of every annotation |
| `pickSourceFile(path)` | Routes a dotted violation path to the right source file based on its top-level prefix |
| `REFERENCE_LOCALE` | `"pl"` — used for the `expected (from \`pl\`): …` snippet when the failing locale's key is absent |
| `MAX_SNIPPET_LEN` | `200` — char cap on the assembled multi-line value snippet in the message body |
| `WARNING_REASONS` | Set of reasons that emit `::warning` instead of `::error` (currently just `empty-optional-value`) |
| `emitGithubAnnotations(violations, groupTitle)` | Public entry — called from each contract test's `formatViolations` |
| `__resetAnnotationDedupForTesting()` | Test-only — clears the cross-call dedup index between `it()` blocks |

###### Path-to-failure-reason cheat-sheet

Use this when you want to know which file + export to mutate to reproduce a specific `reason` code:

| `reason` | Mutate in this file | Touch this export |
| --- | --- | --- |
| `missing-required-key` | `lastChangeTooltipContent.ts` (variant/top) **or** `lastChangeTooltipModel.ts` (time-line) | The locale map returned by `__getRawTranslationsForTesting` / `__getRawTimeLineTranslationsForTesting` — delete a key declared in the corresponding `REQUIRED_*` |
| `placeholder-mismatch` | Either source file | The locale map — change the `{name}` set on a leaf in a non-reference locale |
| `undeclared-key` | `lastChangeTooltipContent.ts` (most natural) | The locale map — add a key that isn't in `REQUIRED_TRANSLATION_KEYS.top/.variant/.variantOptional` |
| `empty-optional-value` | Either source file | The locale map — set a `REQUIRED_*` leaf to `""` in a non-reference locale |
| `wrong-type` | Either source file | The locale map — set a leaf to `42` / `null` / object where `string` is expected (TS will complain; cast through `unknown` to bypass) |

The pedagogical `TRANSLATIONS = { pl: { local: {...} }, en: {...} }` snippets in the next subsections are **simplifications** — they show the conceptual shape so fixtures stay readable. When a fixture says "edit `TRANSLATIONS.en.local.heading`", read it as "edit the locale map exposed by `__getRawTranslationsForTesting`, in the `en.local.heading` slot".

##### Canonical TS contract (what this repo actually uses)

```ts
// src/lib/lastChangeTooltipContent.ts
export const TRANSLATIONS = {
  pl: { /* reference locale — every key MUST exist here */
    local: {
      heading: "Ostatnia zmiana",                 // string leaf
      summary: "Zmieniono {count} razy",          // {placeholder} convention
    },
    sourcePrefix: "Źródło: ",
  },
  en: { local: { heading: "Last change", summary: "Changed {count} times" }, sourcePrefix: "Source: " },
  de: { /* … */ },
  it: { /* … */ },
} as const;

// Authoritative key list — generated by `npm run i18n:autofix`
export const REQUIRED_TRANSLATION_KEYS = [
  "local.heading",
  "local.summary",
  "sourcePrefix",
] as const;
```

A second module, `src/lib/lastChangeTooltipModel.ts`, follows the same shape but exports `TIME_LINE` + `REQUIRED_TIME_LINE_KEYS`. The validator picks the right file via the top-level prefix in the dotted path (`TRANSLATIONS.*` → `lastChangeTooltipContent.ts`, `TIME_LINE.*` → `lastChangeTooltipModel.ts`).

**Hard rules** (each maps to a `::error` reason):

| Rule | Violation | Annotation `reason` |
| --- | --- | --- |
| Every key in `REQUIRED_*` must exist in every active locale | Missing leaf in any locale | `missing-required-key` |
| Non-reference locales must use the same `{placeholder}` set as `pl` for the same key | Extra / missing / renamed `{…}` | `placeholder-mismatch` |
| Every leaf shipped in a locale must appear in `REQUIRED_*` | Locale ships an extra key | `undeclared-key` |
| Leaf type must match the contract (string here) | `42`, `null`, object, array where `string` is expected | `wrong-type` |
| Leaves that *are* declared but ship `""` for a non-reference locale | Empty string | `empty-optional-value` (`::warning`, does NOT fail build) |

##### Equivalent `locales/*.json` shape (for cross-framework readers)

If you're porting fixtures from an i18next / react-intl / FormatJS project, this is the JSON layout the same contract maps to. The validator does **not** read these files in this repo — they're shown only as a translation aid.

```json
// locales/pl.json (reference locale)
{
  "local": {
    "heading": "Ostatnia zmiana",
    "summary": "Zmieniono {count} razy"
  },
  "sourcePrefix": "Źródło: "
}
```

```json
// locales/en.json
{
  "local": {
    "heading": "Last change",
    "summary": "Changed {count} times"
  },
  "sourcePrefix": "Source: "
}
```

```json
// locales/required-keys.json — equivalent of REQUIRED_TRANSLATION_KEYS
[
  "local.heading",
  "local.summary",
  "sourcePrefix"
]
```

**Mapping rules** (TS ↔ JSON):

| TS module | JSON equivalent |
| --- | --- |
| `TRANSLATIONS.pl.local.heading = "Ostatnia zmiana"` | `pl.json` → `local.heading` |
| `REQUIRED_TRANSLATION_KEYS = ["local.heading", …]` | `required-keys.json` (or i18next `keySeparator: "."` namespaces) |
| Top-level prefix (`TRANSLATIONS` vs `TIME_LINE`) | Bucket / namespace in your i18n loader (e.g. i18next namespaces `tooltip` / `timeLine`) |
| Reference locale `pl` | `defaultNS` / source language for fallback chains |

##### Placeholder matching rules (precise spec)

The validator's placeholder check is **set-equality on identifier names**, computed per `(leaf-path, locale)` against the reference locale (`pl`). All other dimensions — order, repetition count, surrounding literal text — are intentionally **not** checked, because translators legitimately reorder placeholders and adjust prose between languages. The five rules below are the complete contract; anything not listed here is **not** enforced.

| # | Dimension | Rule | Enforced? | Failure mode |
| --- | --- | --- | --- | --- |
| 1 | **Names** | Each placeholder is `{<identifier>}` where `<identifier>` matches `[A-Za-z_][A-Za-z0-9_]*` (ASCII only, no dots, no spaces). The validator builds a `Set<string>` of identifiers per leaf. | ✅ | `placeholder-mismatch` if the set differs from the reference set for the same key |
| 2 | **Order** | Placeholders may appear in **any order** across locales. `"Hi {name}, you have {count}"` and `"Masz {count} wiadomości, {name}"` are equivalent. | ❌ (intentional) | None — order is a translator's prerogative |
| 3 | **Repetition** | Each identifier may appear **0..N times** per leaf without changing its set membership. `"{name}, {name}!"` and `"{name}!"` are treated identically. | ❌ (intentional) | None — only presence/absence of the identifier matters |
| 4 | **Optional placeholders** | **Not supported.** Every identifier in the reference locale's set is **required** in every other locale; every identifier in a non-reference locale must also exist in the reference. There is no `{name?}` syntax and no per-key opt-out. If you need a placeholder only in some locales, split the key into variants and add the variant to `REQUIRED_TRANSLATION_KEYS.variantOptional` (which downgrades **missing-key** to `::warning`, but **placeholder set parity is still `::error` once the key exists**). | ✅ (strict) | `placeholder-mismatch` for any asymmetry |
| 5 | **Escaping** | There is **no escape sequence**. To render a literal `{` or `}` in user-facing copy, use a Unicode equivalent (`｛` U+FF5B, `｝` U+FF5D) or rephrase. Sequences that look like placeholders but fail the identifier regex (e.g. `{ count }` with spaces, `{user.name}` with a dot, `{0}` starting with a digit) are silently treated as **literal text** — they will neither match nor count as placeholders, which usually produces a `placeholder-mismatch` because the reference's real `{name}` won't have a counterpart. | ✅ | `placeholder-mismatch` (degraded — looks like "missing placeholder" because the malformed token isn't recognized) |

###### What the validator does NOT check

| Non-rule | Example that passes | Why it's allowed |
| --- | --- | --- |
| Order across locales | `pl: "{name} ma {count} wiadomości"` vs `en: "{name} has {count} messages"` — same order coincidentally, but `de: "{count} Nachrichten für {name}"` would also pass | Word order is grammar; placeholders carry semantic identity, not position |
| Repetition count | `pl: "{name}!"` vs `en: "{name}, {name}!"` | Set membership is the contract; counting would block legitimate stylistic choices |
| Surrounding literal text | Adding/removing punctuation, articles, or full clauses around the placeholder | The tooltip renderer interpolates by name, not by position |
| Identifier casing convention | `{userName}` vs `{username}` | These are **different** identifiers — they will mismatch as rule #1 violations, not as casing warnings |

###### Mismatch scenario → expected error type (cheat sheet)

Use this table when writing a fixture: pick a row, mutate the locale string accordingly, and `grep '^::'` should show exactly the listed reason+severity.

| Scenario | Reference (`pl`) | Mutated (e.g. `en`) | Validator output | Severity |
| --- | --- | --- | --- | --- |
| **Names match exactly** | `"Zmieniono {count} razy"` | `"Changed {count} times"` | (no annotation) | — |
| **Names match, order differs** | `"{name}: {count} nowych"` | `"{count} new for {name}"` | (no annotation) | — |
| **Names match, repetition differs** | `"{name}!"` | `"{name}, hi {name}!"` | (no annotation) | — |
| **Missing placeholder** | `"Zmieniono {count} minut temu"` | `"Changed a few minutes ago"` | `::error … placeholder-mismatch::… is missing placeholder {count}` | `error` |
| **Renamed placeholder** | `"Zmieniono {count} razy"` | `"Changed {n} times"` | `::error … placeholder-mismatch::… is missing placeholder {count} and has unexpected placeholder {n}` | `error` |
| **Extra placeholder** | `"Zmieniono {count} razy"` | `"Changed {count} times ({locale})"` | `::error … placeholder-mismatch::… has unexpected placeholder {locale}` | `error` |
| **Forbidden alternate** (`%d`, `%s`, `${name}`, `{{name}}`, `<name/>`) | `"Zmieniono {count} razy"` | `"Changed %d times"` | `::error … placeholder-mismatch::… is missing placeholder {count}` (alternate is invisible to the extractor) | `error` |
| **Whitespace-padded identifier** | `"Zmieniono {count} razy"` | `"Changed { count } times"` | `::error … placeholder-mismatch::… is missing placeholder {count}` (the padded form is parsed as literal text) | `error` |
| **Dotted / digit-leading identifier** | `"Zmieniono {count} razy"` | `"Changed {0} times"` or `"Changed {user.count} times"` | `::error … placeholder-mismatch::… is missing placeholder {count}` (regex rejects digit-leading and dotted forms) | `error` |
| **Literal brace via Unicode** | `"Wybierz opcję {name}"` | `"Choose option ｛X｝ for {name}"` | (no annotation — `｛` U+FF5B is not a placeholder delimiter) | — |
| **Optional placeholder syntax** | `"Zmieniono {count} razy"` | `"Changed {count?} times"` | `::error … placeholder-mismatch::… is missing placeholder {count}` (the `?` violates the identifier regex, so `{count?}` is parsed as literal text — degrades to a "missing" diagnosis) | `error` |

> **Reading note**: every row above resolves to the **same** `reason=placeholder-mismatch` code with **same** `severity=error`. The differentiation is only in the message body — branch protection rules can therefore key on the single reason code without enumerating sub-types.

##### Placeholder convention (legacy summary)

The table below is the older one-liner version of the rules above, kept as a quick reference. Prefer the precise spec when authoring fixtures or onboarding contributors.

| Aspect | Rule |
| --- | --- |
| Syntax | `{name}` — single curly braces, ASCII identifier inside (`[A-Za-z_][A-Za-z0-9_]*`) |
| Whitespace inside | Not allowed: `{ count }` is parsed as literal text, not a placeholder |
| Comparison | The validator extracts the **set** of placeholder names per leaf, ignoring order and repetitions, then compares each non-reference locale's set to the reference (`pl`) set for the same key |
| Reference locale | `pl` is the source of truth — it sets the expected placeholder set; placeholder mismatches in `pl` itself are flagged against the consuming code, not other locales |
| Forbidden alternates | `%d` / `%s` / `${name}` / `{{name}}` / `<name/>` — using any of these where the reference uses `{name}` trips `placeholder-mismatch` (extra placeholders missing + literal text added) |
| Repetition | `"Hi {name}, welcome {name}!"` is fine — repetition doesn't change the set |

**Why `{name}` and not `{{name}}` or `%s`**: the runtime renderer in `buildLastChangeTooltipModel` interpolates with a single-brace regex, and the contract test mirrors that exact regex so what you write is what the user sees. Changing the syntax requires updating both the renderer and the placeholder extractor in `i18nGithubAnnotations.ts` together.

##### Placeholder mismatch sub-types

`placeholder-mismatch` is a single `::error` reason that covers **four** distinct shapes. The annotation message body is what tells them apart — the validator computes `expected = {placeholders in pl}` and `actual = {placeholders in target locale}` for the same key, then phrases the diff in plain English. Each sub-type below is a paste-into-source fixture for `src/lib/lastChangeTooltipModel.ts` (assume `en.relative.minutesAgo: "Changed {count} minutes ago"` is the reference declaration in `pl`'s position — adapt to your real reference locale).

| # | Sub-type | Trigger | Annotation message phrasing | Reason code |
| --- | --- | --- | --- | --- |
| 1 | **Missing placeholder** | Target locale drops a `{name}` that the reference declares | `is missing placeholder {count}` | `placeholder-mismatch` |
| 2 | **Renamed placeholder** | Target locale uses `{n}` where reference uses `{count}` (different identifier, same intent) | `is missing placeholder {count}` **and** `has unexpected placeholder {n}` (one annotation, both clauses) | `placeholder-mismatch` |
| 3 | **Extra placeholder** | Target locale adds a `{name}` the reference doesn't declare | `has unexpected placeholder {extra}` | `placeholder-mismatch` |
| 4 | **Type / syntax difference** | Target locale uses a forbidden alternate (`%d`, `%s`, `${name}`, `{{name}}`, `<name/>`) where the reference uses `{name}` | `is missing placeholder {count}` (the alternate isn't recognized as a placeholder, so the set diff degrades to "missing the canonical one") + the literal alternate becomes part of the visible string in the `current: …` snippet | `placeholder-mismatch` |

###### 1. Missing placeholder

```ts
// src/lib/lastChangeTooltipModel.ts
export const TIME_LINE = {
  pl: { relative: { minutesAgo: "Zmieniono {count} minut temu" } },
  en: {
    relative: {
      // ⛔ Drops {count} entirely — string still reads, but loses the number.
      minutesAgo: "Changed a few minutes ago",
    },
  },
} as const;
```

Expected `::error` body fragment:

```text
Locale "en" value "Changed a few minutes ago" is missing placeholder {count}, expected by base locale "pl" ("Zmieniono {count} minut temu")
```

###### 2. Renamed placeholder

```ts
// src/lib/lastChangeTooltipModel.ts
export const TIME_LINE = {
  pl: { relative: { minutesAgo: "Zmieniono {count} minut temu" } },
  en: {
    relative: {
      // ⛔ Renames {count} → {n}. Set diff: expected has {count}, actual has {n}.
      minutesAgo: "Changed {n} minutes ago",
    },
  },
} as const;
```

Expected `::error` body fragment (both clauses in one annotation):

```text
Locale "en" value "Changed {n} minutes ago" is missing placeholder {count} and has unexpected placeholder {n}, expected by base locale "pl" ("Zmieniono {count} minut temu")
```

The renderer would substitute the runtime `count` argument into the **canonical** name; the unrecognized `{n}` would render as literal text, so the bug is user-visible — exactly why this is `::error`, not `::warning`.

###### 3. Extra placeholder

```ts
// src/lib/lastChangeTooltipModel.ts
export const TIME_LINE = {
  pl: { relative: { minutesAgo: "Zmieniono {count} minut temu" } },
  en: {
    relative: {
      // ⛔ Adds {locale} that the reference doesn't declare. The runtime
      //    has no value to bind, so {locale} renders as literal text.
      minutesAgo: "Changed {count} minutes ago ({locale})",
    },
  },
} as const;
```

Expected `::error` body fragment:

```text
Locale "en" value "Changed {count} minutes ago ({locale})" has unexpected placeholder {locale}, not declared by base locale "pl" ("Zmieniono {count} minut temu")
```

###### 4. Type / syntax difference (forbidden alternate)

```ts
// src/lib/lastChangeTooltipModel.ts
export const TIME_LINE = {
  pl: { relative: { minutesAgo: "Zmieniono {count} minut temu" } },
  en: {
    relative: {
      // ⛔ %d is a printf-style placeholder — NOT recognized by the
      //    single-brace extractor. The set degrades to {} (empty),
      //    so the diff says "missing {count}" + leaves "%d" literal.
      minutesAgo: "Changed %d minutes ago",
    },
  },
} as const;
```

Expected `::error` body fragment:

```text
Locale "en" value "Changed %d minutes ago" is missing placeholder {count}, expected by base locale "pl" ("Zmieniono {count} minut temu")
```

The same shape applies to `${count}`, `{{count}}`, `<count/>` — all four trigger the **identical** annotation phrasing, because from the validator's perspective they're equivalent: "no `{name}` placeholders found, but the reference requires `{count}`". The give-away in PR review is the `current: …` snippet — it quotes the offending line verbatim, so reviewers see `%d` / `${count}` / `{{count}}` directly and immediately recognize the wrong syntax.

###### Mapping summary

All four sub-types resolve to the **same** `::error … placeholder-mismatch` reason code — which means they are caught by the **same** test (`i18nPlaceholders.test.ts`) and the **same** narrowed Quickstart command:

```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nPlaceholders.test.ts 2>&1 | grep '^::'
```

The differentiation lives **only** in the message body (`is missing` / `has unexpected` / both / forbidden-alternate degradation). If you need to programmatically classify them downstream (e.g. for a custom dashboard), parse the message body — the `reason=` field intentionally collapses them to a single code so that branch protection rules stay simple ("any `placeholder-mismatch` blocks merge").

##### Validator expectations — formal schema

The prose tables above are the friendly version. This subsection is the **normative** spec — what the resolver actually checks at runtime, expressed in machine-grade form so you can drop it into a JSON Schema validator, a TypeScript type guard, or a regex test.

###### TypeScript shape (canonical, what the repo uses)

```ts
// Recursive: a locale value is either a string leaf or a nested object of leaves.
type LocaleLeaf = string;
type LocaleTree = { readonly [key: string]: LocaleLeaf | LocaleTree };

// One root per top-level prefix. The validator picks the file via this prefix
// (TRANSLATIONS.* → lastChangeTooltipContent.ts, TIME_LINE.* → lastChangeTooltipModel.ts).
type LocaleRoot = {
  readonly pl: LocaleTree;                 // reference locale — REQUIRED, every key must exist here
  readonly en: LocaleTree;
  readonly de: LocaleTree;
  readonly it: LocaleTree;
  // Adding a new locale: extend ACTIVE_LOCALES in src/lib/i18nActiveLocales.ts
  // — the contract test reads from there, not from the union literal.
};

// Authoritative key list. Generated by `npm run i18n:autofix`.
// Each entry is a dot-path from the locale root to a string leaf (no top-level prefix).
type RequiredKeys = ReadonlyArray<string>;  // e.g. ["local.heading", "sourcePrefix"]
```

Constraints **not expressible in the type system** but enforced by the validator:

| Invariant | Enforced in | Violation |
| --- | --- | --- |
| Every entry in `REQUIRED_*` resolves to a `string` leaf in every active locale | `i18nRequiredKeys.test.ts` + `i18nContract.test.ts` | `missing-required-key` / `wrong-type` |
| Every `string` leaf in any locale must appear in `REQUIRED_*` | `i18nContract.test.ts` | `undeclared-key` |
| Placeholder set per leaf identical to reference (`pl`) | `i18nPlaceholders.test.ts` | `placeholder-mismatch` |
| Non-reference leaf is non-empty (`!== ""`) | `i18nContract.test.ts` | `empty-optional-value` (`::warning`) |

###### JSON Schema (draft-07) — equivalent for cross-framework projects

For projects that ship `locales/*.json` instead of TS modules. Drop into your CI as `npx ajv validate -s locale.schema.json -d "locales/*.json"` if you want pre-merge validation independent of the TS-aware validator in this repo.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://example.com/locale.schema.json",
  "title": "Locale file",
  "description": "Recursive nested-object map of dotted keys to non-empty strings. Mirrors the TS LocaleTree contract.",
  "type": "object",
  "additionalProperties": { "$ref": "#/definitions/leafOrTree" },
  "definitions": {
    "leafOrTree": {
      "oneOf": [
        {
          "type": "string",
          "minLength": 1,
          "description": "Leaf value. Empty strings are reserved for the reference locale only — non-reference locales emit `empty-optional-value` warnings."
        },
        {
          "type": "object",
          "additionalProperties": { "$ref": "#/definitions/leafOrTree" },
          "minProperties": 1
        }
      ]
    }
  }
}
```

Companion schema for the required-keys list:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://example.com/required-keys.schema.json",
  "title": "Required-keys list",
  "type": "array",
  "uniqueItems": true,
  "items": {
    "type": "string",
    "pattern": "^[A-Za-z_][A-Za-z0-9_]*(\\.[A-Za-z_][A-Za-z0-9_]*)*$",
    "description": "Dot-path from locale root to a string leaf. Each segment is an ASCII identifier; no array indexing, no quoted segments."
  }
}
```

###### Placeholder identifier regex (normative)

The placeholder extractor in `src/lib/i18nGithubAnnotations.ts` uses **exactly** this regex against every leaf string. It is the single source of truth for what counts as a placeholder vs. literal text.

```ts
const PLACEHOLDER_RE = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
```

Equivalent in PCRE (for `grep -P` / `ripgrep`): `\{([A-Za-z_][A-Za-z0-9_]*)\}`.

| Input fragment | Captured? | Why |
| --- | --- | --- |
| `{count}` | ✅ `count` | Standard form |
| `{userName}` | ✅ `userName` | camelCase identifier |
| `{user_id}` | ✅ `user_id` | Underscore allowed mid-identifier |
| `{_internal}` | ✅ `_internal` | Leading underscore allowed |
| `{1count}` | ❌ | Identifier may not start with a digit |
| `{ count }` | ❌ | Whitespace inside braces invalidates the match |
| `{{count}}` | ❌ (outer braces) | Greedy `\{…\}` matches `{count}` only when the immediate surroundings are single braces — the outer pair degrades to literal text and the inner is consumed, but the surrounding `{`/`}` chars remain literal in the rendered output, which is almost certainly not what you want |
| `${count}` | ❌ | `$` is literal text; the `{count}` after it **does** match — the validator will report this as **extra placeholder** because the reference locale doesn't include the literal `$` prefix in its identifier set |
| `%d`, `%s` | ❌ | printf-style placeholders aren't recognized at all → reference locale's `{name}` becomes "missing", visible as the forbidden-alternate degradation |
| `<count/>` | ❌ | Angle-bracket placeholders aren't recognized → same degradation as `%d` |

The validator builds a **`Set<string>`** of captures per leaf (so `"Hi {name}, welcome {name}!"` produces `{"name"}`, not `{"name", "name"}`), then compares the set per `(leaf-path, locale)` against the reference locale's set for the same path. Set equality (no missing, no extra) → pass; otherwise → `placeholder-mismatch` with a message body that lists the symmetric difference.

###### Key-resolution algorithm (file & line numbers in annotations)

How the resolver maps a dotted-path violation back to `(file, line)` for the `::error file=…,line=N::` annotation. Implemented in `findKeyLine` (`src/lib/i18nGithubAnnotations.ts`) — pseudocode:

```text
input:  lines = source file split on \n
        locale = "en" | "pl" | "de" | "it"
        dottedKey = "local.heading"     # no top-level prefix
output: 1-based line number where the leaf is declared, or null

1. Find the first line matching /^\s*<locale>\s*:\s*\{/  → parentLine, parentIndent
2. for each segment in dottedKey.split("."):
     scan lines[parentLine+1 .. EOF] for the first line where
       indent === parentIndent + 2  AND  trimmed line matches /^"?<segment>"?\s*:/
     if line dedents to ≤ parentIndent before match → return null (left the block)
     parentLine, parentIndent ← matched line, matched indent
3. return parentLine (1-based)

Multi-line value handling (after step 3):
  if matched line trips isMultiLineValueOpener(trimmedLine):
    walk forward, tracking ` / [ / { / ( balance, until balanced + terminator
    OR until a dedent below startIndent (safety stop)
    collapse whitespace, cap at MAX_SNIPPET_LEN = 200, append "…" if truncated
  else:
    snippet = trimmed match line as-is
```

**Hardcoded assumptions** (change these in `i18nGithubAnnotations.ts` if your project diverges):

| Assumption | Constant / function | Where to change |
| --- | --- | --- |
| Indent step is **2 spaces** | `+ 2` literal in `findKeyLine` | Function body — search `+ 2` |
| Locale keys are **bare or double-quoted** (`pl:` or `"pl":`) | `isKeyDecl` regex | Single regex; extend for single-quoted or computed keys |
| File picked by **top-level prefix** (`TRANSLATIONS` / `TIME_LINE`) | `pickSourceFile` + `SOURCE_FILES` map | Add prefix → file mapping |
| Reference locale is **`pl`** | `REFERENCE_LOCALE` constant | Single constant |
| Active locales are **`pl, en, de, it`** | `ACTIVE_LOCALES` in `i18nActiveLocales.ts` | Single array — adding a locale here is enough; no other code change |
| Snippet cap is **200 chars** with trailing `…` | `MAX_SNIPPET_LEN` constant | Single constant; UI legibility tradeoff |

The resolver tests in `src/lib/i18nGithubAnnotations.test.ts` deliberately read the **real** source files (not mocks), so any divergence between this normative spec and the actual code surfaces as a failing test on the next CI run.

#### Fixture → source-file mapping (placement cheat sheet)

Use this table as the **first reference** when pasting any fixture from this README into the codebase. Each row tells you exactly which file to open, which top-level constant to mutate, which locale branch to target, and which dotted key path the annotation will report — so you can navigate to the paste site in seconds without reading the surrounding prose.

| # | Fixture / reason | Source file (open this) | Top-level constant | Locale branch (paste here) | Key path (mutated) | Reference locale (do **not** edit) | Required scope env |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **`missing-required-key`** (delete a required key) | `src/lib/lastChangeTooltipContent.ts` | `TRANSLATIONS` | `en: { local: { … } }` | `local.description` | `pl.local.description` | default (`pl,en`) — none needed |
| 2 | **`placeholder-mismatch`** (forbidden alternate `%d`) | `src/lib/lastChangeTooltipModel.ts` | `TIME_LINE` | `en: { relative: { … } }` | `relative.minutesAgo` | `pl.relative.minutesAgo` (`"Zmieniono {count} minut temu"`) | default (`pl,en`) — none needed |
| 3 | **`undeclared-key`** (add key not in `REQUIRED_TRANSLATION_KEYS`) | `src/lib/lastChangeTooltipContent.ts` | `TRANSLATIONS` | `en: { local: { … } }` | `local.subheading` (new) | `pl.local.*` (no sibling needed) | default (`pl,en`) — none needed |
| 4 | **`empty-optional-value`** (`""` for an optional key) | `src/lib/lastChangeTooltipModel.ts` | `TIME_LINE` | `de: { relative: { … } }` (add branch) | `relative.relativeHelpTitle` | `pl.relative.relativeHelpTitle` | `I18N_ACTIVE_LOCALES=pl,en,de` |
| 5 | **`wrong-type`** (number cast to string) | `src/lib/lastChangeTooltipContent.ts` | `TRANSLATIONS` | `it: { local: { … } }` | `local.heading` | `pl.local.heading` (`"Ostatnia zmiana"`) | `I18N_ACTIVE_LOCALES=pl,en,it` |

**How to read this table**

- **Source file** — the only two files the validator reads. Open it in your editor; everything else stays untouched.
- **Top-level constant** — the test-only export name (`TRANSLATIONS` is exposed via `__getRawTranslationsForTesting`; `TIME_LINE` via `__getRawTimeLineTranslationsForTesting`). The fixture pastes into the corresponding `const = { … } as const` literal.
- **Locale branch** — the `<locale>: { … }` sub-object you mutate. For `de` / `it` fixtures the branch may not exist yet — add it (and remember the scope env var below).
- **Key path** — dotted form of where inside the locale branch the mutation lives. This is what appears as `TRANSLATIONS.<locale>.<path>` (or `TIME_LINE.<locale>.<path>`) in the `::error` / `::warning` body.
- **Reference locale** — `pl` is the source of truth; the validator compares non-reference locales against it. Editing `pl` shifts the baseline and may silently make a fixture pass. Always leave `pl` alone.
- **Required scope env** — `I18N_ACTIVE_LOCALES` defaults to `pl,en`. Fixtures targeting `de` / `it` are silently skipped without the env var. Prepend it to the run command exactly as shown.

**Quick visual map of both files**

```
src/lib/lastChangeTooltipContent.ts          src/lib/lastChangeTooltipModel.ts
└── const TRANSLATIONS = {                    └── const TIME_LINE = {
    pl: {                                          pl: {
      local: {                                       relative: {
        heading,         ← #5 (it)                     relativeHelpTitle, ← #4 (de)
        description,     ← #1 (en)                     minutesAgo,        ← #2 (en)
        subheading,      ← #3 (en, NEW)               …
      },                                             },
      sourcePrefix,                                 },
    },                                            en: { … },
    en: { … },                                    de: { … },  ← add for #4
    it: { … },                                  } as const;
  } as const;
```

After picking a row, jump to the matching numbered fixture in [Reproducible source fixtures](#reproducible-source-fixtures) below for the literal paste-in code, and to [End-to-end walkthrough](#end-to-end-walkthrough--one-fixture-per-error-type-start-to-finish) for the run command + verbatim expected output.

#### Reproducible source fixtures

<!-- BEGIN: AUTO-GENERATED FIXTURE SNIPPETS -->

> ⚙️ This block is **auto-generated** by `scripts/generate-fixture-snippets.mjs` from the validator's real input sources (`SUPPORTED_LOCALES`, `REQUIRED_TRANSLATION_KEYS`, `REQUIRED_TIME_LINE_KEYS`, `SOURCE_FILES`). Hand-edits inside the sentinel comments are overwritten on the next run. To change a fixture, edit the templates in the script and re-run `node scripts/generate-fixture-snippets.mjs`. CI guard: `npm run i18n:fixtures:check`.

These TypeScript snippets are paste-into-source ready against `src/lib/lastChangeTooltipContent.ts` and `src/lib/lastChangeTooltipModel.ts`. Each one trips a specific `::error` / `::warning` reason — copy a snippet in, run the [Quickstart](#quickstart) command, and the matching annotation appears in stdout. (Note: this repo stores translations in TypeScript modules, not `locales/*.json` files — the validator reads the `.ts` source directly so it can resolve `(file, line)` for inline annotations.)

**1. Reproduces `::error … missing-required-key`** — `en` is missing `local.description`, which is listed in `REQUIRED_TRANSLATION_KEYS.variant`:

```ts
// src/lib/lastChangeTooltipContent.ts
// (Pedagogical shape — the real export is __getRawTranslationsForTesting().)
const TRANSLATIONS = {
  pl: {
    local: { description: "<reference value>", heading: "…" },
    sourcePrefix: "Źródło: ",
  },
  en: {
    // ⛔ `local.description` is required but absent — emitter points at the
    //    `en: {` line because the key isn't there to point at.
    local: { heading: "…" },
    sourcePrefix: "Source: ",
  },
} as const;
```

**2. Reproduces `::error … placeholder-mismatch`** — `en` uses `%d` while the reference locale uses `{count}`:

```ts
// src/lib/lastChangeTooltipModel.ts
const TIME_LINE = {
  pl: {
    relative: {
      relativeHelpTitle: "Zmieniono {count} minut temu", // ✅ canonical placeholder
    },
  },
  en: {
    relative: {
      relativeHelpTitle: "Changed %d minutes ago",       // ⛔ placeholder set differs
    },
  },
} as const;
```

**3. Reproduces `::error … undeclared-key`** — `en` ships a key (`__demo_undeclared`) that isn't in `REQUIRED_TRANSLATION_KEYS` (so other locales aren't required to translate it — usually a typo or a forgotten autofix run):

```ts
// src/lib/lastChangeTooltipContent.ts
const TRANSLATIONS = {
  pl: { local: { description: "<reference value>" } },
  en: {
    local: {
      description: "<translated value>",
      // ⛔ `__demo_undeclared` is not in REQUIRED_TRANSLATION_KEYS — drift signal.
      //    Fix: `npm run i18n:autofix` to register it, or delete it.
      __demo_undeclared: "(uncategorised)",
    },
  },
} as const;
```

**4. Reproduces `::warning … empty-optional-value`** — `it` declares an optional key but leaves the value empty (yellow marker, does NOT fail the build):

```ts
// src/lib/lastChangeTooltipModel.ts
const TIME_LINE = {
  pl: { relative: { relativeHelpTitle: "Zmieniono {count} minut temu" } },
  it: {
    relative: {
      relativeHelpTitle: "", // ⚠️ empty string for an optional key → `::warning`
    },
  },
} as const;
```

**5. Reproduces `::error … wrong-type`** — `en` provides a non-string value for a key that the contract declares as a `string`:

```ts
// src/lib/lastChangeTooltipContent.ts
const TRANSLATIONS = {
  pl: { local: { description: "<reference value>" } },
  en: {
    // ⛔ Number where a string is expected — annotation message embeds the
    //    actual line so reviewers see `description: 42,` directly.
    local: { description: 42 as unknown as string },
  },
} as const;
```

<!-- END: AUTO-GENERATED FIXTURE SNIPPETS -->

#### Run + expected output (per fixture)

After pasting **one** fixture into the indicated source file, run the matching command. The expected stdout is shown verbatim — `line=` numbers depend on where you pasted, but the rest (file path, title, reason, severity, message body) should match exactly. Revert with `git checkout src/lib/lastChangeTooltipContent.ts src/lib/lastChangeTooltipModel.ts` when done.

The single command that runs **all three** contract tests at once (use this if you don't care which test catches the fixture):

```sh
GITHUB_ACTIONS=true bunx vitest run \
  src/lib/i18nRequiredKeys.test.ts \
  src/lib/i18nContract.test.ts \
  src/lib/i18nPlaceholders.test.ts 2>&1 | grep '^::'
```

If you want to narrow it down to the **single test** that owns a given reason (faster, less noise), use the per-fixture commands below.

**Fixture 1 — `missing-required-key`** (owned by `i18nRequiredKeys.test.ts`):

```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nRequiredKeys.test.ts 2>&1 | grep '^::'
```

Expected stdout (one line):

```text
::error file=src/lib/lastChangeTooltipContent.ts,line=<en-block-line>,title=TRANSLATIONS [error]%3A en · missing-required-key::TRANSLATIONS.en.local.heading (locale=en, reason=missing-required-key, severity=error) — Locale "en" is missing required key "local.heading" — expected (from `pl`): heading: "Ostatnia zmiana", — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

`line=` lands on the `en: {` line because the key isn't there to point at. The `expected (from \`pl\`): …` segment shows the reference declaration verbatim so you can copy-paste-translate.

**Fixture 2 — `placeholder-mismatch`** (owned by `i18nPlaceholders.test.ts`):

```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nPlaceholders.test.ts 2>&1 | grep '^::'
```

Expected stdout (one line):

```text
::error file=src/lib/lastChangeTooltipModel.ts,line=<pl-minutesAgo-line>,title=TIME_LINE [error]%3A pl · placeholder-mismatch::TIME_LINE.pl.relative.minutesAgo (locale=pl, reason=placeholder-mismatch, severity=error) — Locale "pl" value "Zmieniono %d minut temu" is missing placeholder {count}, expected by base locale "en" ("Changed {count} minutes ago") — current: minutesAgo: "Zmieniono %d minut temu", — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

Note the `current: …` segment quotes the offending line **verbatim** (with the trailing comma), so reviewers see the broken `%d` directly without opening the file.

**Fixture 3 — `undeclared-key`** (owned by `i18nContract.test.ts`):

```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nContract.test.ts 2>&1 | grep '^::'
```

Expected stdout (one line):

```text
::error file=src/lib/lastChangeTooltipContent.ts,line=<en-subheading-line>,title=TRANSLATIONS [error]%3A en · undeclared-key::TRANSLATIONS.en.local.subheading (locale=en, reason=undeclared-key, severity=error) — Locale "en" ships key "local.subheading" not present in REQUIRED_TRANSLATION_KEYS — current: subheading: "(uncategorised)", — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

The `Fix:` hint specifically calls out `npm run i18n:autofix` because the most common cause is a forgotten autofix run after adding a new key — the script will register `local.subheading` into `REQUIRED_TRANSLATION_KEYS` and the error disappears.

**Fixture 4 — `empty-optional-value`** (owned by `i18nContract.test.ts`, severity `warning`):

```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nContract.test.ts 2>&1 | grep '^::'
```

Expected stdout (one line — note `::warning` not `::error`, and the build stays green):

```text
::warning file=src/lib/lastChangeTooltipModel.ts,line=<de-minutesAgo-line>,title=TIME_LINE [warning]%3A de · empty-optional-value::TIME_LINE.de.relative.minutesAgo (locale=de, reason=empty-optional-value, severity=warning) — Locale "de" key "relative.minutesAgo" is empty — current: minutesAgo: "", — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

Verify the exit code is `0` (warnings don't fail the build):

```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nContract.test.ts; echo "exit=$?"
# → exit=0
```

**Fixture 5 — `wrong-type`** (owned by `i18nContract.test.ts`):

```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nContract.test.ts 2>&1 | grep '^::'
```

Expected stdout (one line):

```text
::error file=src/lib/lastChangeTooltipContent.ts,line=<it-heading-line>,title=TRANSLATIONS [error]%3A it · wrong-type::TRANSLATIONS.it.local.heading (locale=it, reason=wrong-type, severity=error) — Locale "it" key "local.heading" expected string, got number (42) — current: local: { heading: 42 as unknown as string }, — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

The `current: …` segment is the **collapsed multi-line** snippet (the assembler walks the inline `{ … }` and emits one row), proving the multi-line resolver works for type errors too.

##### Sanity-check checklist for all five

After running any fixture command, verify:

1. **Exactly one `::<level>` line** in the output (no duplicates from cross-test dedup leaking).
2. **`line=N` is non-zero** and points at a real row in the indicated file (`sed -n "${N}p" <file>` should match the highlighted line in the fixture snippet).
3. **`severity=` matches the table**: 1/2/3/5 → `error`, 4 → `warning`.
4. **Exit code**: `error` fixtures → vitest exits non-zero (the test failed); `warning` fixture → exit `0` (no test fails).
5. **Cleanup**: `git diff src/lib/lastChange*.ts` shows only your fixture, then `git checkout src/lib/lastChange*.ts` to restore.

If any of points 1–4 don't match, jump to [Troubleshooting: `line=` lands on the wrong line](#troubleshooting-line-lands-on-the-wrong-line) — that walks through the resolver edge cases.

#### End-to-end walkthrough — one fixture per error type, start to finish

This subsection is the **single self-contained transcript** of running the validator against every reason code the system can emit. It is intentionally redundant with the per-fixture sections above — the goal here is to give a reviewer or new contributor **one** scrollable block they can read top-to-bottom (or paste into a terminal step-by-step) without cross-referencing.

Layout per error type:
1. **Setup** — `git checkout` the source files to a clean baseline.
2. **Apply** — paste the exact mutation (literal source diff you can eyeball).
3. **Run** — the narrowest vitest invocation that owns the reason.
4. **Expected output** — verbatim `::error` / `::warning` line. Only `line=N` varies (depends on where you pasted) — every other byte is stable.
5. **Cleanup** — restore the file before moving on.

> Reference baseline: `pl` is the source of truth, all keys are listed in `REQUIRED_TRANSLATION_KEYS` (or `REQUIRED_TIME_LINE_KEYS`), and `en` is in the active scope by default (`I18N_ACTIVE_LOCALES` defaults to `pl,en`). For fixtures targeting `de` or `it`, prepend `I18N_ACTIVE_LOCALES=pl,en,de` (or `…,it`) to the run command.

---

##### E2E #1 — `missing-required-key` (`::error`)

A required key declared in `REQUIRED_TRANSLATION_KEYS` is **absent** from a non-reference locale.

**Setup** (clean baseline):
```sh
git checkout src/lib/lastChangeTooltipContent.ts
```

**Input mutation** — open `src/lib/lastChangeTooltipContent.ts`, find the `en:` branch of the translations export, and **delete** the `description` line so the `en.local` block looks like:

```ts
// src/lib/lastChangeTooltipContent.ts (en branch only — pl untouched)
en: {
  local: {
    heading: "Last change",
    // ⛔ description: "Open the diary…"  ← DELETE THIS LINE
  },
  sourcePrefix: "Source: ",
},
```

**Run**:
```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nRequiredKeys.test.ts 2>&1 | grep '^::'
```

**Expected output** (one line; `<L>` = the line number of `en: {`, since the missing key has no row to point at):
```text
::error file=src/lib/lastChangeTooltipContent.ts,line=<L>,title=TRANSLATIONS [error]%3A en · missing-required-key::TRANSLATIONS.en.local.description (locale=en, reason=missing-required-key, severity=error) — Locale "en" is missing required key "local.description" — expected (from `pl`): description: "Otwórz dziennik, dotknij „Ostatnia zmiana", aby zobaczyć historię.", — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

**Cleanup**:
```sh
git checkout src/lib/lastChangeTooltipContent.ts
```

---

##### E2E #2 — `placeholder-mismatch` (`::error`)

A non-reference locale's value uses a **different placeholder set** than the reference. Triggered by missing / renamed / extra / forbidden-alternate placeholders (see the [mismatch cheat sheet](#placeholder-matching-rules-precise-spec) above). This walkthrough uses the **forbidden-alternate** flavour (`%d` instead of `{count}`) because it's the most common real-world drift after copy-paste from a printf-style codebase.

**Setup**:
```sh
git checkout src/lib/lastChangeTooltipModel.ts
```

**Input mutation** — in `src/lib/lastChangeTooltipModel.ts`, change the `en.relative.minutesAgo` value:

```ts
// src/lib/lastChangeTooltipModel.ts (en branch only — pl: "Zmieniono {count} minut temu" untouched)
en: {
  relative: {
    minutesAgo: "Changed %d minutes ago", // ⛔ was: "Changed {count} minutes ago"
  },
},
```

**Run**:
```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nPlaceholders.test.ts 2>&1 | grep '^::'
```

**Expected output** (one line; `<L>` = the line of the mutated `minutesAgo:` row in `en`):
```text
::error file=src/lib/lastChangeTooltipModel.ts,line=<L>,title=TIME_LINE [error]%3A en · placeholder-mismatch::TIME_LINE.en.relative.minutesAgo (locale=en, reason=placeholder-mismatch, severity=error) — Locale "en" value "Changed %d minutes ago" is missing placeholder {count}, expected by base locale "pl" ("Zmieniono {count} minut temu") — current: minutesAgo: "Changed %d minutes ago", — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

The `current: …` segment quotes the offending row verbatim (with trailing comma) so reviewers see `%d` directly without opening the file.

**Cleanup**:
```sh
git checkout src/lib/lastChangeTooltipModel.ts
```

---

##### E2E #3 — `undeclared-key` (`::error`)

A locale **ships a key** that isn't in `REQUIRED_TRANSLATION_KEYS` (forgotten autofix run, typo, or stale key after a rename).

**Setup**:
```sh
git checkout src/lib/lastChangeTooltipContent.ts
```

**Input mutation** — add `subheading: "(uncategorised)",` to `en.local` (do **not** add it to `pl` and do **not** run `i18n:autofix`):

```ts
// src/lib/lastChangeTooltipContent.ts
en: {
  local: {
    heading: "Last change",
    description: "Open the diary…",
    subheading: "(uncategorised)", // ⛔ NEW — not in REQUIRED_TRANSLATION_KEYS
  },
  sourcePrefix: "Source: ",
},
```

**Run**:
```sh
GITHUB_ACTIONS=true bunx vitest run src/lib/i18nContract.test.ts 2>&1 | grep '^::'
```

**Expected output** (one line; `<L>` = the line of the new `subheading:` row):
```text
::error file=src/lib/lastChangeTooltipContent.ts,line=<L>,title=TRANSLATIONS [error]%3A en · undeclared-key::TRANSLATIONS.en.local.subheading (locale=en, reason=undeclared-key, severity=error) — Locale "en" ships key "local.subheading" not present in REQUIRED_TRANSLATION_KEYS — current: subheading: "(uncategorised)", — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

**Cleanup**:
```sh
git checkout src/lib/lastChangeTooltipContent.ts
```

---

##### E2E #4 — `empty-optional-value` (`::warning`, build stays green)

A key listed in `REQUIRED_TRANSLATION_KEYS.variantOptional` (or `REQUIRED_TIME_LINE_KEYS.variantOptional`) ships an **empty string** in a non-reference locale. This is the **only** reason currently in `WARNING_REASONS` — exit code stays `0`.

**Setup** (this fixture targets `de`, which is not in default scope — include it explicitly):
```sh
git checkout src/lib/lastChangeTooltipModel.ts
```

**Input mutation** — add a `de` branch with an empty `relativeHelpTitle`:

```ts
// src/lib/lastChangeTooltipModel.ts
de: {
  relative: {
    relativeHelpTitle: "", // ⚠️ empty optional → ::warning, not ::error
  },
},
```

**Run** (note `I18N_ACTIVE_LOCALES` includes `de`):
```sh
I18N_ACTIVE_LOCALES=pl,en,de GITHUB_ACTIONS=true \
  bunx vitest run src/lib/i18nContract.test.ts 2>&1 | grep '^::'
```

**Expected output** (one line — `::warning`, not `::error`):
```text
::warning file=src/lib/lastChangeTooltipModel.ts,line=<L>,title=TIME_LINE [warning]%3A de · empty-optional-value::TIME_LINE.de.relative.relativeHelpTitle (locale=de, reason=empty-optional-value, severity=warning) — Locale "de" key "relative.relativeHelpTitle" is empty — current: relativeHelpTitle: "", — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

**Verify build is green** (warnings don't fail the build):
```sh
I18N_ACTIVE_LOCALES=pl,en,de GITHUB_ACTIONS=true \
  bunx vitest run src/lib/i18nContract.test.ts; echo "exit=$?"
# → exit=0
```

**Cleanup**:
```sh
git checkout src/lib/lastChangeTooltipModel.ts
```

---

##### E2E #5 — `wrong-type` (`::error`)

A locale ships a value of the wrong **TypeScript type** (e.g. number where a string is required). Caught at runtime by the contract test (the `as unknown as string` cast bypasses TS but not the test).

**Setup**:
```sh
git checkout src/lib/lastChangeTooltipContent.ts
```

**Input mutation** — replace `it.local.heading`'s string with a number cast:

```ts
// src/lib/lastChangeTooltipContent.ts
it: {
  local: {
    heading: 42 as unknown as string, // ⛔ number where string expected
    description: "Apri il diario…",
  },
  sourcePrefix: "Origine: ",
},
```

**Run** (include `it` in scope):
```sh
I18N_ACTIVE_LOCALES=pl,en,it GITHUB_ACTIONS=true \
  bunx vitest run src/lib/i18nContract.test.ts 2>&1 | grep '^::'
```

**Expected output** (one line; `current: …` is the **collapsed multi-line snippet** — proves the assembler handles inline `{ … }` wrappers):
```text
::error file=src/lib/lastChangeTooltipContent.ts,line=<L>,title=TRANSLATIONS [error]%3A it · wrong-type::TRANSLATIONS.it.local.heading (locale=it, reason=wrong-type, severity=error) — Locale "it" key "local.heading" expected string, got number (42) — current: local: { heading: 42 as unknown as string, description: "Apri il diario…" }, — Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.
```

**Cleanup**:
```sh
git checkout src/lib/lastChangeTooltipContent.ts
```

---

##### Summary — all five reasons at a glance

| # | Reason | Severity | Owning test | Exit code | Sample fragment of message body |
| --- | --- | --- | --- | --- | --- |
| 1 | `missing-required-key` | `::error` | `i18nRequiredKeys.test.ts` | non-zero | `is missing required key "local.description"` |
| 2 | `placeholder-mismatch` | `::error` | `i18nPlaceholders.test.ts` | non-zero | `is missing placeholder {count}, expected by base locale "pl"` |
| 3 | `undeclared-key` | `::error` | `i18nContract.test.ts` | non-zero | `ships key "local.subheading" not present in REQUIRED_TRANSLATION_KEYS` |
| 4 | `empty-optional-value` | `::warning` | `i18nContract.test.ts` | **0** (green) | `key "relative.relativeHelpTitle" is empty` |
| 5 | `wrong-type` | `::error` | `i18nContract.test.ts` | non-zero | `expected string, got number (42)` |

To run **every** fixture's owning test in a single shot (e.g. when you've stacked multiple fixtures while exploring):

```sh
I18N_ACTIVE_LOCALES=pl,en,de,it GITHUB_ACTIONS=true bunx vitest run \
  src/lib/i18nRequiredKeys.test.ts \
  src/lib/i18nContract.test.ts \
  src/lib/i18nPlaceholders.test.ts 2>&1 | grep '^::' | sort -u
```

`sort -u` deduplicates if the same key trips multiple tests (rare but possible — e.g. a missing key plus a placeholder mismatch on a sibling).

#### Grep recipes — find a specific reason / locale in `/tmp/i18n-summary.log`

Once `i18n-summary.sh` has finished, the full vitest output (including every `::error` / `::warning` workflow command) lives at `/tmp/i18n-summary.log` (or wherever you pointed `--out`). Each annotation line follows the shape `::<severity> file=<path>,line=<n>::<group> [<severity>]: <locale> · <reason> | …`, so plain `grep` is enough — no `jq` or `awk` needed. Replace `/tmp/i18n-summary.log` with `$OUT/i18n-summary.log` if you used `--out $OUT`.

```sh
# 0. Sanity — show every annotation (error + warning), one per line, deduped.
grep '^::' /tmp/i18n-summary.log | sort -u

# 1. By severity — only failures, or only advisories.
grep '^::error '   /tmp/i18n-summary.log | sort -u
grep '^::warning ' /tmp/i18n-summary.log | sort -u

# 2. By reason — anchor on `reason=<name>` to avoid false positives in messages.
grep '^::' /tmp/i18n-summary.log | grep 'reason=missing-required-key'
grep '^::' /tmp/i18n-summary.log | grep 'reason=placeholder-mismatch'
grep '^::' /tmp/i18n-summary.log | grep 'reason=undeclared-key'
grep '^::' /tmp/i18n-summary.log | grep 'reason=wrong-type'
grep '^::' /tmp/i18n-summary.log | grep 'reason=empty-optional-value'

# 3. By locale — the locale shows up between the group and the reason as ` · <pl|en|de|it> · `.
grep '^::' /tmp/i18n-summary.log | grep ' · pl · '
grep '^::' /tmp/i18n-summary.log | grep ' · en · '
grep '^::' /tmp/i18n-summary.log | grep ' · de · '
grep '^::' /tmp/i18n-summary.log | grep ' · it · '

# 4. Combined — reason AND locale (chain greps; order doesn't matter).
grep '^::' /tmp/i18n-summary.log | grep 'reason=placeholder-mismatch' | grep ' · en · '
grep '^::' /tmp/i18n-summary.log | grep 'reason=wrong-type'           | grep ' · pl · '

# 5. By source file (which locale module the validator blamed).
grep '^::' /tmp/i18n-summary.log | grep 'file=src/lib/lastChangeTooltipContent.ts'
grep '^::' /tmp/i18n-summary.log | grep 'file=src/lib/lastChangeTooltipModel.ts'

# 6. By key — useful when triaging a single failing translation entry.
grep '^::' /tmp/i18n-summary.log | grep 'path=variant.warningSuffix'

# 7. Counts — quick "how bad is it?" summary, deduped.
grep '^::' /tmp/i18n-summary.log | sort -u | grep -c '^::error '   # error count
grep '^::' /tmp/i18n-summary.log | sort -u | grep -c '^::warning ' # warning count

# 8. Combined alternation (one grep, multiple reasons or locales).
grep '^::' /tmp/i18n-summary.log | grep -E 'reason=(placeholder-mismatch|wrong-type)'
grep '^::' /tmp/i18n-summary.log | grep -E ' · (en|de) · '
```

**Tips**

- The `^::` anchor matters — it skips body text that happens to contain `::after`, CSS pseudo-elements in test snapshots, etc. Always start a recipe with it.
- Spaces around `·` are non-breaking-looking but are regular ASCII spaces; `grep ' · en · '` (with the surrounding spaces) is the safest locale match because it won't collide with substrings like `· enabled ·`.
- Pipe through `sort -u` whenever you want a count or a clean diff — the same fixture can trip multiple test files and produce duplicate annotation lines.
- Set `I18N_ANNOTATION_DEBUG=1` alongside `GITHUB_ACTIONS=true` for a parallel stderr stream with `severity=… locale=… reason=… path=…` fields per annotation — easier to grep when the workflow-command line is too dense (see [Debug flag](#debug-flag-i18n_annotation_debug1)).

##### Verdict-only recipes — match on the final `severity=<error|warning>)` token

The `^::error` / `^::warning` prefix is just the GitHub annotation channel. The **authoritative classifier verdict** for each violation is the trailing `severity=<x>` field inside the parenthesized message body — i.e. the value `classifyReasonSeverity(reason)` produced (with any per-violation override applied). Anchoring on `severity=…)` makes recipes immune to noisy neighbours (raw `severity:` text in test snapshots, the word `severity` in unrelated CSS/markdown, or mid-line `severity=warning,` debug dumps).

```sh
# Final verdict = ERROR for one reason (any locale).
grep -E '^::.*reason=placeholder-mismatch.*severity=error\)' /tmp/i18n-summary.log

# Final verdict = WARNING for one reason (any locale).
grep -E '^::.*reason=empty-optional-value.*severity=warning\)' /tmp/i18n-summary.log

# Final verdict = ERROR for one (reason, locale) pair — exact tail match.
grep -E '^::.*\(locale=en, reason=placeholder-mismatch, severity=error\)' /tmp/i18n-summary.log

# Final verdict = WARNING for one locale, any reason.
grep -E '^::.*locale=de,.*severity=warning\)' /tmp/i18n-summary.log

# Multi-reason / multi-locale verdict — all classified as ERROR.
# (Field order in the verdict tuple is `locale=…, reason=…, severity=…`.)
grep -E '^::.*locale=(en|de), reason=(placeholder-mismatch|wrong-type|missing-required-key), severity=error\)' /tmp/i18n-summary.log

# Counts — how many distinct violations end up classified at each severity?
grep -Eo '^::.*severity=error\)'   /tmp/i18n-summary.log | sort -u | wc -l
grep -Eo '^::.*severity=warning\)' /tmp/i18n-summary.log | sort -u | wc -l

# Catch a per-violation override — channel says one thing, verdict says another.
# (Useful when WARNING_REASONS or an explicit `v.severity` flips the classification.)
grep -E '^::error .*severity=warning\)'   /tmp/i18n-summary.log
grep -E '^::warning .*severity=error\)'   /tmp/i18n-summary.log
```

Why anchor on `severity=…\)` (with the literal closing paren)?

- It pins the match to the **end of the verdict tuple** `(locale=…, reason=…, severity=<x>)`, so unrelated mentions of the word `severity` elsewhere on the line (or in surrounding test output) can't trip the recipe.
- Pair with `--pattern=ere` from `./scripts/grep-i18n`: `./scripts/grep-i18n --reason placeholder-mismatch --locale en --pattern` emits `^::.*\(locale=en, reason=placeholder-mismatch,` — the prefix half of the verdict tuple. Append `.*severity=error\)` (or `.*severity=warning\)`) to filter on the final classification, e.g.
  `grep -E "$(./scripts/grep-i18n --reason placeholder-mismatch --locale en --pattern).*severity=error\)" /tmp/i18n-summary.log`.

##### Fast iteration on huge logs (`grep -m`, `tail -n`, `head -n`)

A failing CI run can produce a `/tmp/i18n-summary.log` in the **tens of MB** range (every locale × every key × every test file, plus the surrounding vitest noise). When you're iterating on a single fix, scanning the whole file each time is wasteful — the recipes below trim the working set without losing fidelity.

```sh
# 1. First-N matches per recipe — `grep -m` stops scanning after N hits.
#    Perfect for "is this reason still firing at all?" checks.
grep -m 1 -E '^::.*reason=placeholder-mismatch'        /tmp/i18n-summary.log   # any 1
grep -m 5 -E '^::.*reason=placeholder-mismatch'        /tmp/i18n-summary.log   # first 5
grep -m 1 -E '^::.*\(locale=en, reason=wrong-type, '   /tmp/i18n-summary.log   # smoke test

# 2. Last-N matches — vitest writes annotations as tests run, so the *tail*
#    is the most recently-failing locale/key. Pipe through grep first to
#    avoid holding 50 MB in memory just to drop the last few lines.
grep '^::' /tmp/i18n-summary.log | tail -n 20                                  # last 20 annotations
grep '^::error ' /tmp/i18n-summary.log | tail -n 5                             # last 5 errors only
grep -E '^::.*severity=error\)' /tmp/i18n-summary.log | tail -n 1              # the very last verdict=error

# 3. Head-N — opposite end: the *first* failures usually surface the root
#    cause (later ones are often cascading dupes of the same key).
grep '^::' /tmp/i18n-summary.log | head -n 10                                  # first 10 annotations
grep -E '^::.*reason=missing-required-key' /tmp/i18n-summary.log | head -n 3   # first 3 of one reason

# 4. Combine `-m` with `./scripts/grep-i18n --pattern` for "is this fixed yet?"
#    one-liners that exit the moment they find (or fail to find) a match.
grep -m 1 -E "$(./scripts/grep-i18n --reason wrong-type --locale en --pattern)" \
  /tmp/i18n-summary.log && echo "STILL FAILING" || echo "FIXED"

# 5. Bounded window around a known line number (e.g. from a prior `--debug` run).
#    `sed -n '<start>,<end>p'` is faster than `awk` for plain ranges.
sed -n '12000,12050p' /tmp/i18n-summary.log | grep '^::'                       # ±25 lines

# 6. Strip everything BUT the annotations once, then iterate on the small file.
#    Cuts a 50 MB log down to a few hundred KB — every subsequent grep is instant.
grep '^::' /tmp/i18n-summary.log > /tmp/i18n-annotations.log
wc -l /tmp/i18n-annotations.log                                                # see the savings
./scripts/grep-i18n --reason placeholder-mismatch --log /tmp/i18n-annotations.log

# 7. Stream-grep a *running* test (no need to wait for completion).
#    `--line-buffered` flushes per-match instead of per-block — required when
#    piping `tail -F` into `grep` so matches appear in real time.
tail -F /tmp/i18n-summary.log | grep --line-buffered -E '^::.*severity=error\)'

# 8. Approximate counts without a full sort. `grep -c` is O(n) but never holds
#    the matched lines in memory, so it's safe even on multi-GB logs.
grep -c '^::error '   /tmp/i18n-summary.log                                    # raw error count
grep -c '^::warning ' /tmp/i18n-summary.log                                    # raw warning count
grep -cE '^::.*severity=error\)' /tmp/i18n-summary.log                         # verdict=error count
```

**Why each flag matters**

- **`grep -m N`** — short-circuits the scanner. On a 50 MB log, `grep -m 1 …` typically returns in <50 ms even when the match is near the top; the unbounded form has to walk every byte.
- **`tail -n N`** — only the last N lines are buffered. Combine with an upstream `grep '^::'` so `tail` doesn't have to read past noise.
- **`head -n N`** — symmetric to `tail`; pairs especially well with `grep` because the pipe closes as soon as `head` has its quota, signalling `grep` to stop scanning (SIGPIPE).
- **`tail -F` + `grep --line-buffered`** — the `-F` follows file rotation and `--line-buffered` disables grep's default block buffering; without it, matches don't appear until 4 KB has accumulated.
- **Pre-filter once, iterate cheap** (recipe 6) — the cheapest optimization is to `grep '^::' > smaller.log` once and point every subsequent recipe at `smaller.log` (or `./scripts/grep-i18n --log smaller.log`). On a 50 MB log this is usually a >100× speedup.

##### Case-insensitive matching (`grep -i`) — when log formatting drifts

The annotation emitter (`writeAnnotation` in `i18nGithubAnnotations.ts`) writes everything **lowercase**: `reason=placeholder-mismatch`, `locale=en`, `severity=error`. So in a clean local run the case-sensitive recipes above are the right default — they reject false-positive substring matches and are slightly faster.

But the log isn't always clean. Surrounding noise can mix cases:

- **vitest output** prints test names verbatim — so a `describe('Placeholder mismatch')` block leaks `Placeholder` (capital P) into the log alongside the lowercase annotation.
- **Stack traces** include type names (`PlaceholderMismatchError`, `LocaleEN`).
- **External tools** that re-emit the log (CI replayers, Slack notifiers, Sentry breadcrumbs) sometimes title-case headings or upper-case locale codes (`LOCALE=EN`).
- **Custom `v.detail` strings** passed by validators may use sentence case (`Reason: placeholder-mismatch`) before the canonical `(locale=…, reason=…, severity=…)` tuple appears later on the same line.

When you're triaging a noisy log and don't yet know which case form your matches use, swap `grep` → `grep -i` and the recipes still work. Pair `-i` with `-E` for ERE, or with `-w` to pin on whole words when the value happens to also be an English word (e.g. `--key local`).

```sh
# 1. Reason — case-insensitive. Matches `reason=placeholder-mismatch`,
#    `Reason: Placeholder-Mismatch`, `PlaceholderMismatchError`, etc.
grep -iE 'reason[=: ]+placeholder-mismatch|placeholdermismatch' /tmp/i18n-summary.log

# 2. Locale — case-insensitive on the whole tuple position. The `-w` keeps
#    `en` from matching inside `enabled` / `Length` / `Enum`.
grep -iwE '(locale=en|locale=EN| · en · )' /tmp/i18n-summary.log

# 3. Combined — reason AND locale, both case-insensitive, anchored on `^::`
#    so we still skip non-annotation noise.
grep -iE '^::.*reason=wrong-type' /tmp/i18n-summary.log | grep -iwE 'locale=en'

# 4. Severity verdict — case-insensitive `severity=error|warning)` tail match.
#    Useful when a downstream tool re-emits the tuple as `Severity=Error`.
grep -iE '^::.*severity=(error|warning)\)' /tmp/i18n-summary.log

# 5. Multi-reason alternation — case-insensitive, plus a tolerance for
#    surrounding `=`, `:`, or whitespace separators (`reason=`, `Reason: `).
grep -iE 'reason[=: ]+(placeholder-mismatch|wrong-type|missing-required-key)' /tmp/i18n-summary.log

# 6. Counts — same as the case-sensitive count recipes, just `-i` added.
#    The `sort -u` still dedups exact-byte duplicates; if you want to dedup
#    case-folded duplicates too, pipe through `tr A-Z a-z` first.
grep -iE '^::.*severity=error\)'   /tmp/i18n-summary.log | sort -u | wc -l
grep -iE '^::.*severity=error\)'   /tmp/i18n-summary.log | tr 'A-Z' 'a-z' | sort -u | wc -l   # case-folded dedup

# 7. ripgrep equivalent — `rg` is case-insensitive by default when the
#    pattern is all-lowercase ("smart case"). Pass `-i` to force it, or
#    `-s` to force case-sensitive when smart case guesses wrong.
rg -i 'reason=placeholder-mismatch' /tmp/i18n-summary.log
rg -s 'reason=placeholder-mismatch' /tmp/i18n-summary.log   # explicit sensitive

# 8. Find ALL case variants that appear in a noisy log — useful for spotting
#    a re-emitter that's mangling the format. `-o` prints just the match,
#    `sort -u` shows unique forms.
grep -ioE 'reason[=: ]*[a-z-]+' /tmp/i18n-summary.log | sort -u | head
grep -ioE 'locale[=: ]*[a-z]{2}' /tmp/i18n-summary.log | sort -u | head
```

**When NOT to use `-i`**

- **Path / key filtering** (`--key`, `path=…`) — translation keys are case-sensitive in the source files (`variant.warningSuffix` ≠ `Variant.WarningSuffix`), so `-i` here can hide real bugs by matching an unrelated key with the same letters.
- **Severity verdict counts in CI** — your CI gate should run case-sensitive against the canonical form so a re-emitter accidentally lowering the count goes noticed.
- **`./scripts/grep-i18n`** — the helper is intentionally case-sensitive. If you need `-i` behaviour with the helper, generate a pattern with `--pattern=pcre` and feed it to `rg -i` / `grep -iP`:
  `grep -iP "$(./scripts/grep-i18n --reason placeholder-mismatch --locale en --pattern=pcre)" /tmp/i18n-summary.log`.
- **When the `^::` anchor matters** (every recipe above) — `grep -i` doesn't change anchor semantics, so `^::` still requires a literal lowercase `::` at column 0. That's a feature: GitHub workflow commands are always lowercase `::error` / `::warning`, regardless of how the surrounding log was re-emitted.

#### Helper: `./scripts/grep-i18n`

If you find yourself re-typing the same `grep '^::' … | grep reason=… | grep locale=…` chain, use the bundled wrapper. It targets `/tmp/i18n-summary.log` by default and exposes the same filters as flags — no need to remember the exact field shape.

```sh
# Just the failures for one reason, in one locale:
./scripts/grep-i18n --reason placeholder-mismatch --locale en

# Only error-severity wrong-type rows, deduped count:
./scripts/grep-i18n --reason wrong-type --severity error -c

# Triage a single key across all locales:
./scripts/grep-i18n --key variant.warningSuffix

# Point at an artifact directory from CI (matches `./i18n-summary.sh --out ./artifacts`):
./scripts/grep-i18n --reason undeclared-key --log ./artifacts/i18n-summary.log -u
```

Available flags:

| Flag | Matches against | Notes |
| --- | --- | --- |
| `--reason <name>` | `reason=<name>` in the message body | e.g. `placeholder-mismatch`, `wrong-type`, `missing-required-key`, `undeclared-key`, `empty-optional-value`. |
| `--locale <pl\|en\|de\|it>` | `locale=<x>` and ` · <x> · ` (title) | Picks up both the title and message forms so it doesn't collide with substrings like `enabled`. |
| `--severity error\|warning` | Anchors the line on `^::error ` / `^::warning ` | Skips the other severity entirely. |
| `--file <path>` | `file=<path>` (substring) | E.g. `--file src/lib/lastChangeTooltipContent.ts`. |
| `--key <dotted.path>` | `path=<key>` (substring) | E.g. `--key variant.warningSuffix`. |
| `--log <path>` | Source file (default `/tmp/i18n-summary.log`) | Pair with `./i18n-summary.sh --out <dir>`. |
| `-u`, `--unique` | Pipes through `sort -u` | Same fixture can produce duplicates across test files. |
| `-c`, `--count` | Prints just the (deduped) row count | Implies `--unique`. |
| `--pattern[=ere\|pcre\|literal]` | Prints a regex-safe pattern instead of running the search | Use to paste into other tools (`rg`, VS Code, JetBrains, BBEdit, `grep -E/-P`). Default flavor is `ere`. |

Exits `0` on a successful run (even with zero matches), `2` if the log file is missing or a flag value is invalid. Combine flags freely — they AND together.

##### `--pattern` — emit a paste-ready regex

When you need the same filter in another tool (a workspace-wide search, a CI grep, a one-off `rg` invocation), pass `--pattern`. Instead of running the search, the script prints a single regex-safe expression to stdout — every value is escaped (`.`, `(`, `*`, `?`, `\`, `|`, `[`, `]`, `{`, `}`, `^`, `$`) so you can paste it verbatim. Three flavors:

| Flavor | When to use | What it produces |
| --- | --- | --- |
| `--pattern` (default `ere`) | `grep -E`, `egrep`, `awk`, most editors without PCRE | Order-aware ERE chained with `.*`. When `--reason` AND `--locale` are both set, it anchors on the stable trailing form `(locale=X, reason=Y, …)` so order doesn't matter. |
| `--pattern=pcre` | `rg` (default), `grep -P`, VS Code (regex on), JetBrains, Perl, Python `re` | Lookahead-based pattern (`^::(?=.*reason=…)(?=.*locale=…).*`). Order-independent across all filters. |
| `--pattern=literal` | Building your own grep chain, `grep -F -f -`, fzf | One fixed string per line (no escaping needed). For `--locale` and `--key` it emits both forms (title + message body). |

```sh
# Get an ERE for grep / awk:
./scripts/grep-i18n --reason placeholder-mismatch --locale en --pattern
# → ^::.*\(locale=en, reason=placeholder-mismatch,

# Get a PCRE for ripgrep / VS Code:
./scripts/grep-i18n --reason wrong-type --locale en --pattern=pcre
# → ^::(?=.*reason=wrong-type)(?=.*(locale=en[,)]| · en( · |$))).*

# Pipe directly into ripgrep against any file:
rg "$(./scripts/grep-i18n --reason undeclared-key --locale de --pattern=pcre)" /tmp/i18n-summary.log

# Or into a stricter grep against the live CI artifact:
grep -E "$(./scripts/grep-i18n --reason wrong-type --severity error --pattern)" ./artifacts/i18n-summary.log

# Literal mode — build your own chain (each line is a substring, no regex):
./scripts/grep-i18n --reason placeholder-mismatch --locale en --pattern=literal
# → reason=placeholder-mismatch
#   locale=en,
#    · en ·
#   (one fixed string per line; pipe into `grep -F -f -` or paste into fzf)
```

The emitter respects `--severity` (it tightens the `^::` anchor to `^::error ` / `^::warning `), `--file`, and `--key`. If you only pass `--pattern` with no filters, you get back the bare anchor (`^::`) — useful as a starting point. The script never reads the log when `--pattern` is set, so you can run it on a machine that hasn't produced an `i18n-summary.log` yet (e.g. to prepare a CI grep step).

### Source line resolution

Each annotation needs `(file, line)` to land on the offending key. The resolver (`findKeyLine` in `i18nGithubAnnotations.ts`) is **indentation-based** and assumes the codebase convention used in `src/lib/lastChangeTooltipContent.ts` and `src/lib/lastChangeTooltipModel.ts`:

1. Locate the locale block declaration (`pl: {`, `en: {`, …) and capture its leading-indent width.
2. For each segment of the dotted key (e.g. `local.heading`), scan forward for a child whose indent is **exactly parent + 2 spaces** (our 2-space step) and whose first non-whitespace token is `"<segment>:"` or `<segment>:`. Stop scanning if a line dedents back to the parent — that means we left the block.
3. The last segment’s match line is the result (1-based).

#### When to update the resolver

Touch `findKeyLine` (and re-run `bunx vitest run src/lib/i18nGithubAnnotations.test.ts`) whenever any of these change in `lastChangeTooltipContent.ts` / `lastChangeTooltipModel.ts`:

| Change in the source file | What to update |
| --- | --- |
| Indent step changes (e.g. tabs, or 4 spaces) | The hardcoded `+ 2` in `findKeyLine`’s child-indent check. |
| Locale block declared with a quoted key (`"pl": {`) or different syntax | `isKeyDecl` regex (currently allows optional `"` quotes around the key). |
| Keys split across multiple lines (multi-line object / array / template values) | `getSourceLineSnippet` + `assembleMultiLineSnippet` — the assembler tracks backtick / `[` / `{` / `(` balance and collapses the value to a single line (capped at 200 chars with `…`). Extend `isMultiLineValueOpener` if a new continuation pattern appears. |
| Key files moved/renamed | The `SOURCE_FILES` map at the top of `i18nGithubAnnotations.ts`. |
| New top-level prefix (sibling of `TRANSLATIONS` / `TIME_LINE`) | `pickSourceFile` and `stripTopPrefix` — both branch on the prefix. |

The resolver tests in `src/lib/i18nGithubAnnotations.test.ts` deliberately read the **real** source files (not mocks) so they break the moment a structural change makes line resolution inaccurate. If those tests start failing after a refactor of the tooltip files, that’s the signal — fix the resolver in `i18nGithubAnnotations.ts`, not the tests.

#### Troubleshooting: `line=` lands on the wrong line

When the PR annotation points at the wrong row (off by a few lines, or stuck on the locale block opener), walk this checklist top-to-bottom. The first match is almost always the cause.

1. **Did the indent step change?** Open the offending file and count spaces between a parent key and its child. If it's no longer 2, update the hardcoded `+ 2` in `findKeyLine`'s child-indent check.
   - Re-run: `bunx vitest run src/lib/i18nGithubAnnotations.test.ts`

2. **Are tabs mixed in?** `findKeyLine` measures indent in **spaces only**. A single tab will throw the count off and the resolver will skip past the real key.
   - Re-run: `bunx prettier --write src/lib/lastChangeTooltipContent.ts src/lib/lastChangeTooltipModel.ts && bunx vitest run src/lib/i18nGithubAnnotations.test.ts`

3. **Is the locale block declared with quoted keys?** (e.g. `"pl": {` instead of `pl: {`.) Check `isKeyDecl` — it currently accepts optional `"` quotes; anything else (single quotes, computed keys) needs the regex extended.
   - Re-run: `bunx vitest run src/lib/i18nGithubAnnotations.test.ts -t "isKeyDecl"`

4. **Is the value split across multiple lines?** (object literals, template strings broken on `` ` ``, multi-line arrays.) The annotation should still land on the **key declaration line** (where `heading:` appears) and the message snippet should be the full value collapsed to one line. If you see only the partial first line of a long value in the message, the assembler bailed early — extend `isMultiLineValueOpener` (to detect the new continuation pattern) or `assembleMultiLineSnippet`'s safety stop.
   - Re-run: `bunx vitest run src/lib/i18nGithubAnnotations.test.ts -t "assembleMultiLineSnippet"`

5. **Did the file move or get renamed?** Update the `SOURCE_FILES` map at the top of `i18nGithubAnnotations.ts`. Symptom: every annotation points at line 1 of an unrelated file.
   - Re-run: `bunx vitest run src/lib/i18nGithubAnnotations.test.ts`

6. **New top-level prefix added** (sibling of `TRANSLATIONS` / `TIME_LINE`)? Update both `pickSourceFile` and `stripTopPrefix` — they branch on the prefix and will silently route unknown prefixes to the wrong file.
   - Re-run: `bunx vitest run src/lib/i18nGithubAnnotations.test.ts`

7. **Still wrong after all of the above?** Reproduce locally with `GITHUB_ACTIONS` set so the emitter actually runs, and inspect the raw `::error` line:
   ```sh
   GITHUB_ACTIONS=true bunx vitest run src/lib/i18nRequiredKeys.test.ts src/lib/i18nContract.test.ts src/lib/i18nPlaceholders.test.ts 2>&1 | grep '^::'
   ```
   Compare the `line=` value against `wc -l` of the source file — if it's larger than total lines, the resolver bailed out and returned a fallback. That's a `findKeyLine` bug, not a translation bug.

#### Debug flag: `I18N_ANNOTATION_DEBUG=1`

When the checklist above isn't enough, flip on `I18N_ANNOTATION_DEBUG=1` and the emitter prints the **resolved inputs** for every annotation to **stderr** (one line per emitted `::error` / `::warning`):

```sh
GITHUB_ACTIONS=true I18N_ANNOTATION_DEBUG=1 bunx vitest run \
  src/lib/i18nRequiredKeys.test.ts \
  src/lib/i18nContract.test.ts \
  src/lib/i18nPlaceholders.test.ts 2>&1 \
  | grep -E '^(::|\[i18n-annotation-debug\])'
```

Each debug line has the shape:

```text
[i18n-annotation-debug] file=src/lib/lastChangeTooltipContent.ts line=87 severity=error locale=en reason=placeholder-mismatch path=TRANSLATIONS.en.local.heading snippet="current: heading: \"Last change\","
```

Fields:

| Field | Meaning | What to check |
| --- | --- | --- |
| `file=` | Source file the resolver picked via `pickSourceFile(v.path)` | If wrong, the top-level prefix → file mapping in `SOURCE_FILES` is stale (checklist #5/#6). |
| `line=` | 1-based row from `getSourceLineSnippet` (or `<unresolved>` if the resolver returned `null` and no locale-block fallback fired) | If wrong number → checklist #1–#4. If `<unresolved>` → key isn't found at all in either failing or reference locale; the source file probably moved or the key is genuinely orphaned. |
| `snippet=` | JSON-stringified `lineHint` that gets joined into the annotation message body — `current: …` for found keys, `expected (from \`pl\`): …` when the failing locale's key is missing entirely, or `expected: "<key>": "<TODO>"` when even PL is missing it | If truncated mid-value → `MAX_SNIPPET_LEN` (200) or the multi-line assembler bailed early (checklist #4). If `<no-snippet>` → resolver returned no line and no fallback — usually means `dottedKey` was empty after `stripTopPrefix`. |
| `severity=` | Final `error` / `warning` after `classifyReasonSeverity` | If unexpected, check `WARNING_REASONS` in `i18nGithubAnnotations.ts`. |
| `locale=`, `reason=`, `path=` | Original violation triple used for cross-call dedup | If you expected this triple to be deduped and it still appears, the previous emitter call ran in a different vitest worker — see the dedup comment in the source. |

**Why stderr?** The Quickstart pipeline uses `grep '^::'` on stdout to extract just the annotation lines. Routing debug output to stderr keeps that pipe clean — you can opt into the debug stream by combining `2>&1` with the broader regex shown above.

**Test runs**: the flag is read fresh on every annotation (no module-load caching), so you can `export I18N_ANNOTATION_DEBUG=1` for one shell, run a single failing test in isolation, and unset it without restarting anything. Accepts `1`, `true`, `yes` (case-insensitive); empty / unset / anything else → off.

**CI use**: add `I18N_ANNOTATION_DEBUG: "1"` under the failing job's `env:` block when re-running with debug logging via `workflow_dispatch`. Keep it off for normal PR runs to avoid doubling the log volume.


### Auto-fixing drifted REQUIRED_* keys

If the failure reason is `missing-required-key` or `undeclared-key`, run:

```sh
npm run i18n:autofix          # rewrite REQUIRED_TRANSLATION_KEYS / REQUIRED_TIME_LINE_KEYS
npm run i18n:autofix -- --preserve-order  # keep manual ordering, only append new keys
npm run i18n:check            # CI-style dry run + per-bucket diff
```

A scheduled GitHub Actions workflow ([`.github/workflows/i18n-autofix.yml`](.github/workflows/i18n-autofix.yml)) opens a PR automatically when daily drift is detected.

#### `npm run i18n:autofix` walkthrough — files touched & verification

This subsection is the **end-to-end transcript** of running autofix locally: what it scans, which two files it rewrites (and which lines inside them), and the exact commands to confirm the `::error` lines are gone afterwards. Use it whenever the validator reports `missing-required-key` or `undeclared-key` and you want to repair the contract list rather than the locale value.

##### What autofix scans (read-only)

| Source file | Pattern detected | Bucket assigned |
| --- | --- | --- |
| `src/lib/lastChangeTooltipModel.ts` | `t.<key>` (top-level access on `TRANSLATIONS[locale]`) | `REQUIRED_TRANSLATION_KEYS.top` |
| `src/lib/lastChangeTooltipModel.ts` | `variant.<key>` (read directly, no `??` fallback) | `REQUIRED_TRANSLATION_KEYS.variant` |
| `src/lib/lastChangeTooltipModel.ts` | `variant.<key> ?? <default>` (read with fallback) | `REQUIRED_TRANSLATION_KEYS.variantOptional` |
| `src/lib/lastChangeTooltipModel.ts` | `tStrings.<key>` (read on `TIME_LINE_TRANSLATIONS[locale]`) | `REQUIRED_TIME_LINE_KEYS` |

Autofix **never** opens the locale data itself (the `pl: { … }`, `en: { … }` branches) — it only updates the **contract lists** that say "these are the keys the builder reads". Locale value drift (`missing-required-key` because a locale forgot to translate a registered key, `wrong-type`, `placeholder-mismatch`, `empty-optional-value`) is **not** autofix's job — those need a human translator.

##### What autofix writes (exactly two locations)

| File | Constant rewritten | Lines affected |
| --- | --- | --- |
| `src/lib/lastChangeTooltipContent.ts` | `export const REQUIRED_TRANSLATION_KEYS = { top: [...], variant: [...], variantOptional: [...] } as const satisfies …` | The full `REQUIRED_TRANSLATION_KEYS` block (preserves the surrounding JSDoc + `satisfies` annotation) |
| `src/lib/lastChangeTooltipModel.ts` | `export const REQUIRED_TIME_LINE_KEYS = [...] as const satisfies …` | The full `REQUIRED_TIME_LINE_KEYS` block (same preservation rules) |

That's it. No other files, no JSX, no tests, no migrations. Each bucket is sorted alphabetically by default for stable diffs (use `-- --preserve-order` to keep manual ordering and only append new keys).

##### Step-by-step walkthrough

```sh
# 1. Snapshot the current state — useful for rollback and for diff inspection.
git status
git diff src/lib/lastChangeTooltipContent.ts src/lib/lastChangeTooltipModel.ts
# (should be empty if you haven't started yet)

# 2. Confirm the validator currently fails with `missing-required-key` or
#    `undeclared-key` (these are the two reasons autofix can repair).
GITHUB_ACTIONS=true bunx vitest run \
  src/lib/i18nRequiredKeys.test.ts \
  src/lib/i18nContract.test.ts 2>&1 | grep '^::error' | grep -E 'missing-required-key|undeclared-key'
# → should print at least one line; if empty, autofix has nothing to do

# 3. Dry-run first — see WHAT would change without writing anything.
npm run i18n:check
# → exits 0 when in sync, exits 1 with a per-bucket diff (`+ added`, `- removed`)
#   when drift is present. Read this output BEFORE letting autofix write.

# 4. Apply the fix.
npm run i18n:autofix
# → prints a summary like:
#   "REQUIRED_TRANSLATION_KEYS: +2 / -0  (added: local.subheading, local.footnote)"
#   "REQUIRED_TIME_LINE_KEYS:   +0 / -1  (removed: relative.legacyKey)"

# 5. Inspect the diff — should be limited to the two REQUIRED_* declarations.
git diff src/lib/lastChangeTooltipContent.ts src/lib/lastChangeTooltipModel.ts
```

Expected diff shape (illustrative):

```diff
--- a/src/lib/lastChangeTooltipContent.ts
+++ b/src/lib/lastChangeTooltipContent.ts
@@ — REQUIRED_TRANSLATION_KEYS block ——
   variant: [
     "local.description",
     "local.heading",
+    "local.subheading",
   ],
```

If the diff touches anything else (locale branches, JSDoc outside the constant, imports), **stop and revert** — the script's pattern detector probably matched something it shouldn't, and forcing the change will mask a real bug.

##### Verification — confirm the `::error` lines are gone

```sh
# 6. Re-run the same validator command from step 2.
GITHUB_ACTIONS=true bunx vitest run \
  src/lib/i18nRequiredKeys.test.ts \
  src/lib/i18nContract.test.ts 2>&1 | grep '^::'
# → should be EMPTY for `missing-required-key` and `undeclared-key`.
#   Other reasons (placeholder-mismatch, wrong-type, empty-optional-value)
#   may still appear — those are NOT autofix's responsibility.

# 7. Run the full suite to confirm nothing else regressed.
GITHUB_ACTIONS=true bunx vitest run \
  src/lib/i18nRequiredKeys.test.ts \
  src/lib/i18nContract.test.ts \
  src/lib/i18nPlaceholders.test.ts; echo "exit=$?"
# → exit=0 means the contract is clean.

# 8. Commit only the two files autofix touched.
git add src/lib/lastChangeTooltipContent.ts src/lib/lastChangeTooltipModel.ts
git commit -m "chore(i18n): autofix REQUIRED_* keys after drift"

# 9. CI-mirror check — the same gate the GitHub workflow uses.
npm run i18n:check
# → exit=0 means future PRs won't regress on this drift.
```

##### Verification cheat sheet — reason × autofix outcome

| Reason | Autofix can repair? | Post-autofix `grep '^::error'` should be… | If still present → root cause |
| --- | --- | --- | --- |
| `missing-required-key` | ✅ Yes (when the key is **read by the builder** but missing from `REQUIRED_*`) | Empty for this reason | The locale genuinely doesn't translate a registered key — translator action needed |
| `undeclared-key` | ✅ Yes (registers the key into `REQUIRED_*`) | Empty for this reason | The key is shipped by a locale but **not** read by the builder — likely a typo in the locale; delete the key instead |
| `placeholder-mismatch` | ❌ No | Unchanged | Edit the locale value to match the reference's `{name}` set |
| `wrong-type` | ❌ No | Unchanged | Replace the bad value with the correct TS type in the locale branch |
| `empty-optional-value` | ❌ No (and it's `::warning` anyway, not `::error`) | Unchanged warning | Translator fills in the empty string, or accept the warning |

##### Rollback

If autofix produced a surprising diff (e.g. removed a key you intentionally kept, or added a name with a typo), revert and re-run with `--preserve-order` to limit churn:

```sh
git checkout src/lib/lastChangeTooltipContent.ts src/lib/lastChangeTooltipModel.ts
npm run i18n:autofix -- --preserve-order
```

If even `--preserve-order` produces wrong output, the bug is in the script's pattern detector — see [`scripts/autofix-required-translation-keys.mjs`](scripts/autofix-required-translation-keys.mjs) docstring (top of file) for the regex extraction rules and how to extend them.

### `i18n-autofix` workflow — schedule, scope, and PR review

**Workflow**: [`.github/workflows/i18n-autofix.yml`](.github/workflows/i18n-autofix.yml) — also visible in the GitHub **Actions** tab as **“i18n autofix”**.

#### When it runs

| Trigger | When | Mode |
| --- | --- | --- |
| `schedule` | Daily at **06:17 UTC** (off-peak; doesn't compete with PR-CI) | sorted (default) |
| `push` to `main` | Only when one of these files changes: `src/lib/lastChangeTooltipContent.ts`, `src/lib/lastChangeTooltipModel.ts`, `scripts/autofix-required-translation-keys.mjs` | sorted (default) |
| `workflow_dispatch` | Manually from the Actions tab → **Run workflow** | sorted, OR `--preserve-order` if you tick the `preserve_order` input |

The script is a **no-op when the lists are already in sync**, so it's safe to run unconditionally — empty PRs are filtered out by the `Detect changes` step (`git diff --quiet`). If there's no drift, the workflow exits `0` quietly without touching the repo.

#### What files it touches

Only the two `REQUIRED_*` constant arrays:

| File | Symbol rewritten |
| --- | --- |
| `src/lib/lastChangeTooltipContent.ts` | `REQUIRED_TRANSLATION_KEYS` |
| `src/lib/lastChangeTooltipModel.ts` | `REQUIRED_TIME_LINE_KEYS` |

The script never touches the surrounding `TRANSLATIONS` / `TIME_LINE` maps, JSX, or test files — that's intentional, so an autofix PR is purely a contract-list refresh and can be merged with low risk.

#### How the PR shows up

- **Branch**: always `chore/i18n-autofix` (stable). Successive drift detections **update** the same PR rather than spawning new ones; after merge the branch is auto-deleted (`delete-branch: true`) so the next drift opens a fresh PR.
- **Title**: `chore(i18n): sync REQUIRED_* keys`
- **Author / committer**: `github-actions[bot]` — never attributed to a human.
- **Labels**: `i18n`, `automation`.
- **Body**: includes the trigger that produced it (`schedule` / `push` / `workflow_dispatch`), the mode (sorted vs. preserve-order), and a deep link back to the workflow run.

#### How to review the generated PR

1. **Open the linked workflow run** (link is in the PR body) and expand the *Run i18n autofix (write mode)* step. The script prints a per-bucket diff (`+ added`, `- removed`) — that's the source of truth for what changed.
2. **Inspect the diff in the PR** itself: it should be limited to the two files above and only the `REQUIRED_*` arrays inside them. Anything else is a red flag — close the PR and investigate the script.
3. **Added keys** → confirm the new key is present in every active locale (`pl`, `en`, `de`, `it`). The `i18n check` PR-CI workflow will fail loudly if any locale is missing the key, but eyeballing `lastChangeTooltipContent.ts` first saves a CI cycle.
4. **Removed keys** → confirm the key is genuinely no longer read by the tooltip builder (a recent refactor that intentionally dropped a field). If you can still find a `t.<keyName>` reference in the codebase, the autofix is wrong — investigate the script's key-extraction logic before merging.
5. **Merge with squash** — keeps the main branch history clean (one `chore(i18n)` commit per drift event).

#### When NOT to merge

- If the diff also touches files outside the two listed above → don't merge; treat as a script bug.
- If a removal accidentally drops a key that's still consumed → the next CI run on `main` will fail `i18n contract`. Revert immediately and fix the script's extraction pass before retrying.
- If you've manually re-ordered keys and don't want them re-sorted → close the auto PR and re-run the workflow with `preserve_order: true` from the Actions tab.

