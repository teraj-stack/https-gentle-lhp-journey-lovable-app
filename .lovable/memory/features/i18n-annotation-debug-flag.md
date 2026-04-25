---
name: i18n annotation debug flag
description: I18N_ANNOTATION_DEBUG=1 prints resolved file/line/snippet/severity/locale/reason/path to stderr per emitted annotation in src/lib/i18nGithubAnnotations.ts
type: feature
---

`emitGithubAnnotations` (src/lib/i18nGithubAnnotations.ts) supports a debug stream:

- **Activation**: `I18N_ANNOTATION_DEBUG=1` (also `true` / `yes`, case-insensitive). Read fresh per annotation via `isAnnotationDebugEnabled()` — no module-load caching, can be toggled mid-run.
- **Output channel**: `console.error` (stderr). Keeps the Quickstart `grep '^::'` on stdout clean.
- **Format**: `[i18n-annotation-debug] file=… line=…|<unresolved> severity=… locale=… reason=… path=… snippet=<JSON>` — one line per emitted annotation, after dedup.
- **Snippet content**: the `lineHint` joined into the annotation message body (`current: …`, `expected (from \`pl\`): …`, or `expected: "<key>": "<TODO>"` fallback). `<no-snippet>` when resolver and fallback both returned nothing.

**Why both flags required**: emitter only fires when `GITHUB_ACTIONS=true`. Setting only `I18N_ANNOTATION_DEBUG=1` produces no output because the early-return in `emitGithubAnnotations` short-circuits before the debug branch.

README documentation: section "Debug flag: `I18N_ANNOTATION_DEBUG=1`" under Troubleshooting, with field-by-field interpretation table mapping each debug field to the relevant troubleshooting checklist item.

Tests: 49 existing tests in `i18nGithubAnnotations.test.ts` continue to pass — debug branch is behind a flag so no test changes needed. Smoke-tested via `bun /tmp/debug-smoke.ts` (annotation→stdout, debug→stderr, both populated correctly).
