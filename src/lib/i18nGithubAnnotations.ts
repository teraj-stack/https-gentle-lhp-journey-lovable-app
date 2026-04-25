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
}

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
 * Strategy:
 *  1. Find the line that starts the locale block — looks for `  pl: {`
 *     (with leading whitespace + colon + opening brace, the canonical
 *     object-literal-key declaration).
 *  2. From there, scan forward until brace depth returns to its starting
 *     value (= end of block) and look for `<key>:` along the way.
 *  3. If `key` contains a dot (e.g. `local.heading`), recurse: first
 *     locate the `local: {` sub-block within the locale, then the key.
 *
 * Returns 1-based line number, or null if not found.
 */
const findKeyLine = (
  lines: string[],
  locale: string,
  dottedKey: string,
): number | null => {
  // Find locale block start. Anchor: leading whitespace + locale + ": {"
  const localeRe = new RegExp(`^\\s*${locale}\\s*:\\s*{`);
  let blockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (localeRe.test(lines[i])) {
      blockStart = i;
      break;
    }
  }
  if (blockStart === -1) return null;

  // Walk segments of the dotted key, descending into sub-blocks.
  const segments = dottedKey.split(".");
  let cursor = blockStart;
  let depthAtCursor = 0; // brace depth relative to start of current block

  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s];
    const isLast = s === segments.length - 1;
    const segRe = new RegExp(`^\\s*"?${seg}"?\\s*:`);

    // Scan forward from cursor for the segment, tracking brace depth so we
    // don't step out of the current scope.
    let found = -1;
    let depth = depthAtCursor;
    // Count opening brace on the cursor line itself (first iteration: locale
    // block's `{` opens depth 1; subsequent iterations: sub-block start).
    for (let i = cursor; i < lines.length; i++) {
      const line = lines[i];
      if (i > cursor) {
        // Adjust depth based on braces in this line BEFORE matching, so a
        // closing `}` at start of line takes us out of scope cleanly.
        const opens = (line.match(/{/g) || []).length;
        const closes = (line.match(/}/g) || []).length;
        if (closes > opens && depth + opens - closes < depthAtCursor) {
          // Exited the block we were searching in.
          break;
        }
        depth += opens - closes;
      } else {
        // On the cursor line, count its braces to set initial depth.
        const opens = (line.match(/{/g) || []).length;
        const closes = (line.match(/}/g) || []).length;
        depth = depthAtCursor + opens - closes;
      }

      // Match key at the current depth (relative to block start).
      // We want keys directly inside the current block, not nested deeper.
      if (segRe.test(line) && depth === depthAtCursor + 1) {
        found = i;
        break;
      }
    }
    if (found === -1) return null;
    if (isLast) return found + 1; // 1-based

    // Descend into sub-block: cursor moves to the line that opens the
    // sub-block (which is the matched line itself, since shape is `seg: {`).
    cursor = found;
    depthAtCursor += 1;
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
 * Emit a single `::error file=...,line=...,title=...::message` command.
 * Writes to stdout (process.stdout.write) — vitest captures stdout from
 * test workers and forwards it, where the GH Actions runner parses it.
 */
const writeAnnotation = (params: {
  file: string;
  line?: number;
  title: string;
  message: string;
}) => {
  const props = [`file=${escapeProperty(params.file)}`];
  if (params.line && params.line > 0) props.push(`line=${params.line}`);
  props.push(`title=${escapeProperty(params.title)}`);
  // Use console.log instead of process.stdout.write so that vitest's
  // worker→main forwarding picks it up reliably across all runners.
  // eslint-disable-next-line no-console
  console.log(`::error ${props.join(",")}::${escapeData(params.message)}`);
};

/**
 * Public entry point. Called from each test's `formatViolations` AFTER the
 * formatted error message has been built (so the developer-facing assertion
 * message stays human-readable AND CI also gets inline annotations).
 *
 * The `groupTitle` is used to prefix annotation titles so the GH UI shows
 * which contract test produced each error (e.g. "i18n required keys").
 */
export const emitGithubAnnotations = (
  violations: ReadonlyArray<AnnotatableViolation>,
  groupTitle: string,
): void => {
  if (violations.length === 0) return;
  if (process.env.GITHUB_ACTIONS !== "true") return;

  for (const v of violations) {
    const file = pickSourceFile(v.path);
    const lines = readSourceLines(file);
    let lineNumber: number | undefined;

    if (lines) {
      const dottedKey = stripTopPrefix(v.path);
      if (dottedKey) {
        lineNumber = findKeyLine(lines, v.locale, dottedKey) ?? undefined;
      }
      // If the entire locale block is missing/whole-path is just "TRANSLATIONS"
      // or "TIME_LINE", point at the locale line itself.
      if (!lineNumber) {
        const localeBlockRe = new RegExp(`^\\s*${v.locale}\\s*:\\s*{`);
        const idx = lines.findIndex((l) => localeBlockRe.test(l));
        if (idx >= 0) lineNumber = idx + 1;
      }
    }

    const title = `${groupTitle}: ${v.locale} · ${v.reason}`;
    const messageBits = [`${v.path} (locale=${v.locale}, reason=${v.reason})`];
    if (v.detail) messageBits.push(v.detail);
    messageBits.push(
      "Fix: update the locale entry in the indicated file, or run `npm run i18n:autofix` if REQUIRED_* keys drifted.",
    );

    writeAnnotation({
      file,
      line: lineNumber,
      title,
      message: messageBits.join(" — "),
    });
  }
};

/** Internal helper exposed only for unit testing the line resolver. */
export const __findKeyLineForTesting = findKeyLine;
export const __stripTopPrefixForTesting = stripTopPrefix;
