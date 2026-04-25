/**
 * GitHub Actions inline annotations for i18n contract failures.
 *
 * Why this exists
 * ---------------
 * Our three i18n contract tests (i18nRequiredKeys, i18nContract,
 * i18nPlaceholders) already produce a column-aligned violation report — but
 * that report only shows up in the test runner's stderr. On a PR review,
 * developers get a generic "test failed" red X and have to dig into raw
 * vitest output to find which locale and which key are broken.
 *
 * GitHub Actions supports a tiny stdout protocol — workflow commands —
 * for emitting inline annotations on the PR diff:
 *
 *   ::error file=path/to/source.ts,line=42,title=Title::Message
 *
 * When emitted from a step, the annotation appears as a red marker on the
 * exact line in the GitHub PR "Files changed" view, AND in the checks
 * summary. That converts an opaque test failure into a clickable jump to
 * the offending key.
 *
 * What this module does
 * ---------------------
 * - Resolves each violation's logical path (e.g. `TRANSLATIONS.local.heading`
 *   for locale `de`) to a (file, line) pair by grep-locating the locale
 *   block and then the specific key in the source file.
 * - Emits one `::error` workflow command per violation, with the locale +
 *   reason in the title and a short detail in the message.
 * - No-ops outside CI (`process.env.GITHUB_ACTIONS !== "true"`) so local
 *   `npm test` output stays clean.
 * - Falls back gracefully when a path can't be resolved: emits a
 *   non-located annotation pointing at the source file's line 1 rather than
 *   silently dropping the signal.
 *
 * Why best-effort line resolution (and not exact AST parsing)?
 * ------------------------------------------------------------
 * The translation maps are object literals with a stable shape — every
 * locale has its own block (`pl: { ... }`, `en: { ... }`) and every key is
 * declared on its own line. A two-pass regex (locate locale block start,
 * then scan forward for the key) is pragmatically perfect for our shape and
 * has zero parser dependencies — keeping the helper a pure-stdlib module
 * that runs equally in Node and Vitest workers.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Source files where REQUIRED_* keys live. Centralized so individual tests
 * never hardcode paths and one rename here updates all annotations. */
const SOURCE_FILES = {
  TRANSLATIONS: "src/lib/lastChangeTooltipContent.ts",
  TIME_LINE: "src/lib/lastChangeTooltipModel.ts",
} as const;

/** Project root — vitest runs from repo root so cwd is reliable. */
const ROOT = process.cwd();

/** Annotation severity level. `error` fails the GitHub check (red X);
 * `warning` surfaces a yellow marker but does NOT fail the build. */
export type AnnotationSeverity = "error" | "warning";

/** A single annotation-ready violation. The shape is intentionally narrow
 * so each test file can adapt its richer Violation type without coupling. */
export interface AnnotatableViolation {
  /** Locale code, e.g. "pl", "en", "de", "it". */
  locale: string;
  /** Logical dotted path, e.g. "TRANSLATIONS.local.heading", "TIME_LINE.timePrefix". */
  path: string;
  /** Short machine-readable reason, e.g. "missing-required-key". */
  reason: string;
  /** Optional human-readable detail (will be appended to message). */
  detail?: string;
  /** Optional explicit severity override. When omitted, severity is
   * derived from `reason` via {@link classifyReasonSeverity}. */
  severity?: AnnotationSeverity;
}

/**
 * Reasons that should NOT fail the build — purely advisory drift signals.
 * Empty OPTIONAL keys are the canonical example: the schema permits the
 * key to be absent entirely, so an empty string is a soft-issue (probably
 * a translator forgot to fill it) rather than a contract breach.
 *
 * Anything not listed here is treated as `error` (build-failing). Keep
 * this set conservative — promoting a real bug to a warning silently is
 * worse than over-failing.
 */
const WARNING_REASONS: ReadonlySet<string> = new Set([
  "empty-optional-value",
]);

/**
 * Map a violation `reason` to its default severity. Pure helper — no I/O,
 * trivially testable. Callers may override per-violation by setting
 * `severity` explicitly on the violation object (e.g. to escalate a
 * normally-warning reason for a critical key).
 */
export const classifyReasonSeverity = (reason: string): AnnotationSeverity =>
  WARNING_REASONS.has(reason) ? "warning" : "error";

/** Cache file reads — vitest fans out tests and we don't want to re-read
 * the same source file 50× per run. */
const fileCache = new Map<string, string[] | null>();

const readSourceLines = (relPath: string): string[] | null => {
  if (fileCache.has(relPath)) return fileCache.get(relPath) ?? null;
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) {
    fileCache.set(relPath, null);
    return null;
  }
  try {
    const lines = readFileSync(abs, "utf8").split("\n");
    fileCache.set(relPath, lines);
    return lines;
  } catch {
    fileCache.set(relPath, null);
    return null;
  }
};

/**
 * Pick which source file contains the offending key, based on the path's
 * top-level prefix. Anything starting with `TIME_LINE` lives in the model
 * file; everything else (TRANSLATIONS.*, top-level keys) lives in content.
 */
const pickSourceFile = (path: string): string => {
  if (path.startsWith("TIME_LINE")) return SOURCE_FILES.TIME_LINE;
  return SOURCE_FILES.TRANSLATIONS;
};

/**
 * Best-effort: locate the line number where `key` is declared inside the
 * `locale` block of the given source file.
 *
 * Strategy (indentation-based — robust for prettier-formatted object literals)
 * ----------------------------------------------------------------------------
 *  1. Find the line declaring the locale block (e.g. `  pl: {`). Capture
 *     its leading-indent width.
 *  2. For each segment in the dotted key, scan forward from the previous
 *     match looking for a line whose leading-indent is EXACTLY one level
 *     deeper than the parent (parent indent + 2 spaces — codebase
 *     convention) AND whose first non-whitespace token is `<segment>:`.
 *     Stop the scan if we hit a line dedented back to the parent's indent
 *     (= we left the parent block).
 *  3. The last segment's match line is the result.
 *
 * Returns 1-based line number, or null if not found.
 */
const findKeyLine = (
  lines: string[],
  locale: string,
  dottedKey: string,
): number | null => {
  const indentOf = (line: string): number => {
    const m = line.match(/^( *)/);
    return m ? m[1].length : 0;
  };
  const isKeyDecl = (line: string, key: string): boolean => {
    const re = new RegExp(`^\\s*"?${key}"?\\s*:`);
    return re.test(line);
  };

  // Step 1: find locale block start.
  let parentLine = -1;
  let parentIndent = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isKeyDecl(lines[i], locale)) {
      parentLine = i;
      parentIndent = indentOf(lines[i]);
      break;
    }
  }
  if (parentLine === -1) return null;

  // Step 2: descend through each segment.
  const segments = dottedKey.split(".");
  let cursor = parentLine;
  let curParentIndent = parentIndent;

  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s];
    const isLast = s === segments.length - 1;
    let found = -1;

    for (let i = cursor + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.length === 0) continue; // blank
      const indent = indentOf(line);
      // Left the parent block (line is dedented to parent or shallower).
      if (indent <= curParentIndent) break;
      // Match only at the immediate child level — anything deeper is a
      // grandchild (e.g. inside `local: { … }`) and should be skipped.
      // Codebase convention: 2-space indent step.
      if (indent !== curParentIndent + 2) continue;
      if (isKeyDecl(line, seg)) {
        found = i;
        break;
      }
    }
    if (found === -1) return null;
    if (isLast) return found + 1; // 1-based

    // Descend: this matched line opens the next sub-block.
    cursor = found;
    curParentIndent = indentOf(lines[found]);
  }
  return null;
};

/**
 * Strip the leading top-level prefix from a path so we get the dotted key
 * relative to the locale block.
 *
 *   "TRANSLATIONS.local.heading" → "local.heading"
 *   "TRANSLATIONS.sourcePrefix"  → "sourcePrefix"
 *   "TIME_LINE.timePrefix"       → "timePrefix"
 *   "TRANSLATIONS"               → ""        (whole locale missing)
 *   "TIME_LINE"                  → ""
 */
const stripTopPrefix = (path: string): string => {
  const idx = path.indexOf(".");
  if (idx === -1) return "";
  return path.slice(idx + 1);
};

/**
 * Escape a string for safe inclusion in a workflow command value.
 * GitHub Actions requires `%`, `\r`, `\n` to be percent-encoded inside
 * the data section of a `::command::data` line, otherwise the parser
 * truncates at the first newline.
 */
const escapeData = (s: string): string =>
  s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

const escapeProperty = (s: string): string =>
  s
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");

/**
 * Emit a single `::<level> file=...,line=...,title=...::message` command,
 * where `<level>` is `error` or `warning`. Writes to stdout via
 * console.log so vitest's worker→main forwarding picks it up reliably
 * across all runners; the GH Actions runner parses it from there.
 *
 * Why both levels? Empty optional keys, soft drift signals, and other
 * advisory issues should NOT block merges — yellow `::warning` markers
 * surface them in the PR diff without failing the check.
 */
const writeAnnotation = (params: {
  file: string;
  line?: number;
  title: string;
  message: string;
  severity: AnnotationSeverity;
}) => {
  const props = [`file=${escapeProperty(params.file)}`];
  if (params.line && params.line > 0) props.push(`line=${params.line}`);
  props.push(`title=${escapeProperty(params.title)}`);
  // eslint-disable-next-line no-console
  console.log(`::${params.severity} ${props.join(",")}::${escapeData(params.message)}`);
};

/**
 * Public entry point. Called from each test's `formatViolations` AFTER the
 * formatted error message has been built (so the developer-facing assertion
 * message stays human-readable AND CI also gets inline annotations).
 *
 * The `groupTitle` is used to prefix annotation titles so the GH UI shows
 * which contract test produced each error (e.g. "i18n required keys").
 */
/**
 * Reference locale used to suggest an "expected" value when the offending
 * locale's key is missing entirely. PL is the project's source-of-truth
 * locale (every other language is translated from it), so its line is the
 * most useful template for a reviewer to copy-paste-translate.
 *
 * If the reference locale is also missing the key (genuinely new key,
 * not yet authored anywhere), the helper degrades to a plain
 * `"<key>": "<TODO>"` hint instead of failing.
 */
const REFERENCE_LOCALE = "pl";

/**
 * Pull the EXACT source line for `(locale, dottedKey)` from the file. This
 * is what gets embedded in the annotation so reviewers see the offending
 * declaration verbatim — no need to open the file to spot a missing comma,
 * empty string, or wrong-typed value.
 *
 * Returns the trimmed line (no leading indent) so the annotation message
 * stays one logical row in the GitHub UI. The returned `lineNumber` is the
 * key's declaration line (1-based) — i.e. where the annotation marker
 * should land — even when the value spans multiple lines.
 *
 * Multi-line values
 * -----------------
 * When the value is broken across multiple lines (template literal with
 * embedded `\n`, multi-line array `[ … ]`, multi-line object `{ … }`,
 * concatenated strings via `+`), we walk forward from the key line until
 * the value's opening delimiter is balanced (or until a sibling key /
 * dedent is hit, as a safety stop). The collected text is collapsed to
 * a single line — runs of whitespace become one space and a horizontal
 * ellipsis (`…`) is inserted when we truncate, keeping the annotation
 * compact while still showing reviewers what was declared.
 *
 * Returns `null` only when the key isn't found at all; an existing key
 * with an empty/whitespace-only single line still returns the trimmed
 * declaration so reviewers see e.g. `heading: "",` directly.
 */
const getSourceLineSnippet = (
  lines: string[],
  locale: string,
  dottedKey: string,
): { snippet: string; lineNumber: number } | null => {
  const ln = findKeyLine(lines, locale, dottedKey);
  if (!ln) return null;
  const raw = lines[ln - 1] ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Single-line value (the common case): the line already contains the
  // full declaration (`heading: "Last change",`). No assembly needed.
  if (!isMultiLineValueOpener(trimmed)) {
    return { snippet: trimmed, lineNumber: ln };
  }
  // Multi-line value: walk forward and collapse to a one-line snippet.
  const assembled = assembleMultiLineSnippet(lines, ln - 1);
  return { snippet: assembled, lineNumber: ln };
};

/**
 * Heuristic: does the trimmed line END with an unclosed value opener that
 * almost certainly continues on the next line? We look at the last
 * non-comment, non-comma token. The set is intentionally narrow to avoid
 * false positives on perfectly well-formed single-line values.
 *
 * Triggers (in order of frequency in this codebase):
 *  - Backtick template literal whose closing `\`` isn't on the same line.
 *  - Open bracket `[` or `{` not closed before line end (multi-line array /
 *    object value, e.g. structured strings).
 *  - Trailing string-concatenation `+` (rare, but legal).
 *  - Open parenthesis `(` (e.g. wrapped function call — also rare).
 */
const isMultiLineValueOpener = (trimmedLine: string): boolean => {
  // Strip a trailing line comment so it doesn't fool the closer counter.
  const codePart = stripTrailingLineComment(trimmedLine);
  // Quick reject: line ends with a complete string + optional comma.
  if (/(["'])(?:\\.|(?!\1).)*\1\s*,?\s*$/.test(codePart)) return false;
  // Backtick template not closed on the same line.
  if (countUnescaped(codePart, "`") % 2 === 1) return true;
  // Bracket / brace / paren imbalance suggests a continued literal.
  const open = (codePart.match(/[\[{(]/g) ?? []).length;
  const close = (codePart.match(/[\]})]/g) ?? []).length;
  if (open > close) return true;
  // Trailing `+` (string concat) or trailing colon-then-nothing
  // (`heading:` with the value on the next line).
  if (/[+]\s*$/.test(codePart)) return true;
  if (/:\s*$/.test(codePart)) return true;
  return false;
};

/**
 * Strip a trailing `// …` line comment without breaking on `//` that
 * appears inside a string. Cheap state machine — good enough for the
 * shape of strings we have in the locale maps.
 */
const stripTrailingLineComment = (line: string): string => {
  let inStr: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const prev = i > 0 ? line[i - 1] : "";
    if (inStr) {
      if (c === inStr && prev !== "\\") inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      continue;
    }
    if (c === "/" && line[i + 1] === "/") return line.slice(0, i).trimEnd();
  }
  return line;
};

/** Count occurrences of `ch` in `s` ignoring `\ch` escapes. */
const countUnescaped = (s: string, ch: string): number => {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== ch) continue;
    if (i > 0 && s[i - 1] === "\\") continue;
    n += 1;
  }
  return n;
};

/**
 * Walk forward from `startIdx` (0-based index of the key line) and
 * concatenate everything that belongs to the value, stopping when the
 * opener is balanced or when we hit a safety boundary (sibling key on the
 * same indent, or a dedent below the key's indent).
 *
 * The result is whitespace-collapsed and capped at MAX_SNIPPET_LEN with
 * a trailing `…` so multi-paragraph translations don't blow up the
 * GitHub UI. Reviewers can still click through to the line for the full
 * value.
 */
const MAX_SNIPPET_LEN = 200;

const assembleMultiLineSnippet = (
  lines: string[],
  startIdx: number,
): string => {
  const startLine = lines[startIdx] ?? "";
  const startIndent = (startLine.match(/^( *)/)?.[1].length) ?? 0;
  // Track delimiter balance starting from the key line. The key declaration
  // itself (`heading:`) has no opener — the opener begins after the colon.
  let backtickOpen = (countUnescaped(stripTrailingLineComment(startLine), "`") % 2) === 1;
  let bracketDepth = 0;
  let braceDepth = 0;
  let parenDepth = 0;
  const updateDepths = (line: string) => {
    const code = stripTrailingLineComment(line);
    for (let i = 0; i < code.length; i++) {
      const c = code[i];
      const prev = i > 0 ? code[i - 1] : "";
      if (c === "`" && prev !== "\\") backtickOpen = !backtickOpen;
      if (backtickOpen) continue; // inside template — brackets don't count
      if (c === "[") bracketDepth += 1;
      else if (c === "]") bracketDepth -= 1;
      else if (c === "{") braceDepth += 1;
      else if (c === "}") braceDepth -= 1;
      else if (c === "(") parenDepth += 1;
      else if (c === ")") parenDepth -= 1;
    }
  };
  updateDepths(startLine);

  const collected: string[] = [startLine.trim()];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = (line.match(/^( *)/)?.[1].length) ?? 0;
    // Safety: if we've returned to the key's indent (or shallower) AND we
    // are NOT inside any open delimiter / template, the previous line was
    // really the end of the value. Bail out before we eat a sibling key.
    const inside =
      backtickOpen || bracketDepth > 0 || braceDepth > 0 || parenDepth > 0;
    if (!inside && indent <= startIndent && trimmed.length > 0) break;

    if (trimmed.length > 0) collected.push(trimmed);
    updateDepths(line);

    // Stop as soon as the value is balanced AND the line ends with a
    // value-terminator (`,`, `;`, or just the closing delimiter at end).
    const balanced =
      !backtickOpen && bracketDepth === 0 && braceDepth === 0 && parenDepth === 0;
    if (balanced && /[`"'\])},;]\s*,?\s*$/.test(stripTrailingLineComment(line))) {
      break;
    }
  }

  // Collapse whitespace runs and cap length so the GitHub annotation
  // popover doesn't get a wall of text.
  let merged = collected.join(" ").replace(/\s+/g, " ").trim();
  if (merged.length > MAX_SNIPPET_LEN) {
    merged = merged.slice(0, MAX_SNIPPET_LEN - 1).trimEnd() + "…";
  }
  return merged;
};


/**
 * Build the human-readable "expected line" hint for a MISSING key, by
 * looking up the same key in the reference locale block. Output shape:
 *
 *   expected (from `pl`): "heading": "Ostatnia zmiana"
 *
 * If the reference also lacks the key, returns a TODO template instead so
 * the annotation still shows what shape to add.
 */
const buildExpectedLineHint = (
  lines: string[],
  dottedKey: string,
): string => {
  const ref = getSourceLineSnippet(lines, REFERENCE_LOCALE, dottedKey);
  if (ref) return `expected (from \`${REFERENCE_LOCALE}\`): ${ref.snippet}`;
  // Final segment is the key name shown to the developer.
  const leaf = dottedKey.split(".").pop() ?? dottedKey;
  return `expected: "${leaf}": "<TODO: translate>"`;
};

/**
 * Public entry point. Called from each test's `formatViolations` AFTER the
 * formatted error message has been built (so the developer-facing assertion
 * message stays human-readable AND CI also gets inline annotations).
 *
 * The `groupTitle` is used to prefix annotation titles so the GH UI shows
 * which contract test produced each error (e.g. "i18n required keys").
 */
/**
 * Module-level dedup index keyed by `${locale}::${path}::${reason}`.
 *
 * Why module-level (cross-call)?
 * ------------------------------
 * The three i18n contract tests (i18nRequiredKeys, i18nContract,
 * i18nPlaceholders) overlap on shape — e.g. an entirely-missing key may
 * be flagged by BOTH the required-keys test and the contract test. Without
 * dedup, the same line in the GitHub PR would receive 2-3 identical
 * annotations, drowning the reviewer in noise and making it look like
 * there are 3× more bugs than there actually are.
 *
 * Strategy: first-emitter-wins. The first call that emits a violation
 * also records the originating `groupTitle` so subsequent calls that hit
 * the same `(locale, path, reason)` triple are silent. This is correct
 * even when later calls carry a different `detail` string — the
 * underlying bug is the same line in the same file; one annotation per
 * line is the goal.
 *
 * Vitest workers: each worker process has its own module instance, so
 * the seen-set scope is per-worker. In CI we run the contract tests
 * serially in one worker (vitest's default for small suites), which is
 * exactly the scope where dedup matters most. If a project later
 * fans out to multiple workers, the worst case is one duplicate per
 * worker — still a meaningful reduction over the un-deduped baseline.
 */
const seenAnnotations = new Map<string, string>();

const dedupKeyOf = (v: AnnotatableViolation): string =>
  `${v.locale}::${v.path}::${v.reason}`;

/**
 * Test-only: clear the cross-call dedup index. Production code never
 * needs to call this — the index lives for the lifetime of the worker
 * process, which is the lifetime of one CI run. Tests need it to keep
 * each `it(...)` block independent.
 */
export const __resetAnnotationDedupForTesting = (): void => {
  seenAnnotations.clear();
};

export const emitGithubAnnotations = (
  violations: ReadonlyArray<AnnotatableViolation>,
  groupTitle: string,
): void => {
  if (violations.length === 0) return;
  if (process.env.GITHUB_ACTIONS !== "true") return;

  // Step 1: in-call dedup — collapse identical entries within this single
  // batch first (cheaper than going through file resolution N times for
  // the same key, and keeps the cross-call index pristine).
  const inCallSeen = new Set<string>();
  const uniqueViolations: AnnotatableViolation[] = [];
  for (const v of violations) {
    const key = dedupKeyOf(v);
    if (inCallSeen.has(key)) continue;
    inCallSeen.add(key);
    uniqueViolations.push(v);
  }

  for (const v of uniqueViolations) {
    // Step 2: cross-call dedup — skip if a previous group already
    // emitted this exact violation. Reviewers see a single annotation
    // per problem regardless of how many tests detect it.
    const key = dedupKeyOf(v);
    if (seenAnnotations.has(key)) continue;
    seenAnnotations.set(key, groupTitle);

    const file = pickSourceFile(v.path);
    const lines = readSourceLines(file);
    let lineNumber: number | undefined;
    let lineHint: string | undefined;

    if (lines) {
      const dottedKey = stripTopPrefix(v.path);
      if (dottedKey) {
        // Try to locate the offending key's line in the failing locale.
        const located = getSourceLineSnippet(lines, v.locale, dottedKey);
        if (located) {
          lineNumber = located.lineNumber;
          // Show the actual on-disk line so reviewers see e.g. an empty
          // string `"heading": ""` or wrong-typed `"heading": 42` directly.
          lineHint = `current: ${located.snippet}`;
        } else {
          // Key is absent in this locale → render the reference-locale
          // line as the "expected" template the reviewer should add.
          lineHint = buildExpectedLineHint(lines, dottedKey);
        }
      }
      // If the entire locale block is missing/whole-path is just "TRANSLATIONS"
      // or "TIME_LINE", point at the locale line itself.
      if (!lineNumber) {
        const localeBlockRe = new RegExp(`^\\s*${v.locale}\\s*:\\s*{`);
        const idx = lines.findIndex((l) => localeBlockRe.test(l));
        if (idx >= 0) lineNumber = idx + 1;
      }
    }

    const severity: AnnotationSeverity = v.severity ?? classifyReasonSeverity(v.reason);
    const sevTag = severity === "warning" ? "warning" : "error";
    const title = `${groupTitle} [${sevTag}]: ${v.locale} · ${v.reason}`;
    const messageBits = [`${v.path} (locale=${v.locale}, reason=${v.reason}, severity=${severity})`];
    if (v.detail) messageBits.push(v.detail);
    if (lineHint) messageBits.push(lineHint);
    messageBits.push(
      "Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.",
    );

    writeAnnotation({
      file,
      line: lineNumber,
      title,
      message: messageBits.join(" — "),
      severity,
    });
  }
};

/** Internal helper exposed only for unit testing the line resolver. */
export const __findKeyLineForTesting = findKeyLine;
export const __stripTopPrefixForTesting = stripTopPrefix;
export const __getSourceLineSnippetForTesting = getSourceLineSnippet;
export const __buildExpectedLineHintForTesting = buildExpectedLineHint;
