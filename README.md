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

