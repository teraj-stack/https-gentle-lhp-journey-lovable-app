# Welcome to your Lovable project

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

##### Placeholder convention

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

#### Reproducible source fixtures

These TypeScript snippets are paste-into-source ready against `src/lib/lastChangeTooltipContent.ts` and `lastChangeTooltipModel.ts`. Each one trips a specific `::error` / `::warning` reason — copy a snippet in, run the [Quickstart](#quickstart) command, and the matching annotation appears in stdout. (Note: this repo stores translations in TypeScript modules, not `locales/*.json` files — the validator reads the `.ts` source directly so it can resolve `(file, line)` for inline annotations.)


These TypeScript snippets are paste-into-source ready against `src/lib/lastChangeTooltipContent.ts` and `lastChangeTooltipModel.ts`. Each one trips a specific `::error` / `::warning` reason — copy a snippet in, run the [Quickstart](#quickstart) command, and the matching annotation appears in stdout. (Note: this repo stores translations in TypeScript modules, not `locales/*.json` files — the validator reads the `.ts` source directly so it can resolve `(file, line)` for inline annotations.)


**1. Reproduces `::error … missing-required-key`** — `en` is missing `local.heading`, which is listed in `REQUIRED_TRANSLATION_KEYS`:

```ts
// src/lib/lastChangeTooltipContent.ts
export const TRANSLATIONS = {
  pl: {
    local: { heading: "Ostatnia zmiana", description: "…" },
    sourcePrefix: "Źródło: ",
  },
  en: {
    // ⛔ `local.heading` is required but absent — emitter points at the
    //    `en: {` line because the key isn't there to point at.
    local: { description: "…" },
    sourcePrefix: "Source: ",
  },
} as const;
```

**2. Reproduces `::error … placeholder-mismatch`** — `pl` uses `%d` while the base locale uses `{count}`:

```ts
// src/lib/lastChangeTooltipModel.ts (TIME_LINE bucket)
export const TIME_LINE = {
  en: {
    relative: {
      minutesAgo: "Changed {count} minutes ago", // ✅ canonical placeholder
    },
  },
  pl: {
    relative: {
      minutesAgo: "Zmieniono %d minut temu",     // ⛔ placeholder set differs
    },
  },
} as const;
```

**3. Reproduces `::error … undeclared-key`** — `en` ships a key that isn't in `REQUIRED_TRANSLATION_KEYS` (so other locales aren't required to translate it — usually a typo or a forgotten autofix run):

```ts
// src/lib/lastChangeTooltipContent.ts
export const TRANSLATIONS = {
  pl: { local: { heading: "Ostatnia zmiana" } },
  en: {
    local: {
      heading: "Last change",
      // ⛔ `subheading` is not in REQUIRED_TRANSLATION_KEYS — drift signal.
      //    Fix: `npm run i18n:autofix` to register it, or delete it.
      subheading: "(uncategorised)",
    },
  },
} as const;
```

**4. Reproduces `::warning … empty-optional-value`** — `de` declares an optional key but leaves the value empty (yellow marker, does NOT fail the build):

```ts
// src/lib/lastChangeTooltipModel.ts
export const TIME_LINE = {
  en: { relative: { minutesAgo: "Changed {count} minutes ago" } },
  de: {
    relative: {
      minutesAgo: "", // ⚠️ empty string for an optional key → `::warning`
    },
  },
} as const;
```

**5. Reproduces `::error … wrong-type`** — `it` provides a non-string value for a key that the contract declares as a `string`:

```ts
// src/lib/lastChangeTooltipContent.ts
export const TRANSLATIONS = {
  pl: { local: { heading: "Ostatnia zmiana" } },
  it: {
    // ⛔ Number where a string is expected — annotation message embeds the
    //    actual line so reviewers see `heading: 42,` directly.
    local: { heading: 42 as unknown as string },
  },
} as const;
```

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

