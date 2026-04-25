---
name: i18n multi-line value resolver
description: getSourceLineSnippet + assembleMultiLineSnippet collapse multi-line translation values (template literals, arrays, objects) into a single annotation snippet
type: feature
---

`src/lib/i18nGithubAnnotations.ts` resolves multi-line locale values for CI annotations:

- **`isMultiLineValueOpener(trimmedLine)`** — heuristic detecting unterminated backtick template, `[`/`{`/`(` open without close, trailing `+`, or colon-only line. Strips trailing `// …` comments without breaking on `//` inside strings.
- **`assembleMultiLineSnippet(lines, startIdx)`** — walks forward tracking backtick/bracket/brace/paren balance (state inside template suppresses bracket counting). Stops on balanced+terminator regex `/[\`"'\])},;]\s*,?\s*$/` OR on dedent below `startIndent` while NOT inside any opener. Collapses whitespace, caps at `MAX_SNIPPET_LEN=200` with trailing `…`.
- **`getSourceLineSnippet`** uses the assembler when opener detected; returns `{ snippet, lineNumber }` where `lineNumber` is always the key declaration line (1-based) — annotation marker stays on the right row even for multi-line values.

**Important invariant**: `updateDepths` is a mutating accumulator — call it ONCE per line. Initial state is all zeros / false; the start line's RHS is processed by the first `updateDepths(startLine)`.

Test exposures: `__isMultiLineValueOpenerForTesting`, `__assembleMultiLineSnippetForTesting`. Suite covers heuristic edge cases (string with `//`, complete backtick, unclosed template), assembly (backtick/array/object/colon-only), safety stop at sibling, length truncation, and end-to-end via synthetic fixtures (49 tests total in `i18nGithubAnnotations.test.ts`).

README troubleshooting checklist item #4 reflects the new behavior — annotation should land on key line with the full value collapsed; if partial value appears, extend opener heuristic or assembler safety stop.
