#!/usr/bin/env node
/**
 * Autofix script for REQUIRED_TRANSLATION_KEYS and REQUIRED_TIME_LINE_KEYS.
 *
 * Why this script exists
 * ----------------------
 * The contract test suite (`src/lib/i18nRequiredKeys.test.ts`) compares the
 * keys actually consumed by the tooltip builder against two manually
 * maintained lists:
 *
 *   - `REQUIRED_TRANSLATION_KEYS` in `src/lib/lastChangeTooltipContent.ts`
 *   - `REQUIRED_TIME_LINE_KEYS`   in `src/lib/lastChangeTooltipModel.ts`
 *
 * When the builder starts reading a NEW key (or stops reading an old one),
 * those lists drift and the test fails with "undeclared-key" or
 * "missing-required-key". Updating the lists by hand is mechanical and
 * error-prone — so this script does it automatically.
 *
 * What it does
 * ------------
 * 1. Statically scans the two source files for property-access patterns
 *    against the well-known objects:
 *      - `t.<key>` and `variant.<key>` in lastChangeTooltipContent.ts
 *      - `tStrings.<key>`              in lastChangeTooltipModel.ts
 *    (These are the local aliases the builder uses after indexing
 *    `TRANSLATIONS[locale]` / `TIME_LINE_TRANSLATIONS[locale]`.)
 *
 * 2. Categorizes the detected `variant.*` reads:
 *      - keys read directly (e.g. `variant.heading`)            → required
 *      - keys read with `??` fallback (e.g. `variant.X ?? Y`)   → optional
 *      - keys at the TRANSLATIONS top level (`t.<key>`)         → top
 *    Anything in `TIME_LINE_TRANSLATIONS` is required (no optional time-line
 *    keys exist today; if that ever changes, extend the optional detector).
 *
 * 3. Rewrites the two `REQUIRED_*` declarations IN PLACE, preserving the
 *    surrounding JSDoc and `as const satisfies …` annotation. Keys are
 *    sorted alphabetically inside each bucket for stable diffs.
 *
 * 4. Prints a summary of what changed and exits non-zero only on script
 *    error (so it's safe to wire into a `lint:fix` chain).
 *
 * Usage
 * -----
 *   node scripts/autofix-required-translation-keys.mjs           # writes
 *   node scripts/autofix-required-translation-keys.mjs --check   # dry-run,
 *     exits 1 if the file would change (CI guard against forgotten autofix)
 *   node scripts/autofix-required-translation-keys.mjs --debug   # print every
 *     detector's raw findings (great for diagnosing why a key was missed)
 *
 * Supported access patterns
 * -------------------------
 * The scanner intentionally covers a SUPERSET of the patterns the builder
 * uses today, so adding a refactor (e.g. wrapping reads in a `$t("foo")`
 * helper, or switching from dot to bracket access) does NOT silently drop
 * keys from the REQUIRED_* lists. Each pattern below is implemented as a
 * named detector so it's easy to extend / disable in isolation.
 *
 *   1. Dot member reads on local aliases
 *        t.heading            variant.shortBadge       tStrings.timePrefix
 *
 *   2. Bracket reads with STRING LITERALS on the same aliases
 *        t["heading"]         variant['shortBadge']    tStrings[`timePrefix`]
 *      Useful when a future refactor uses bracket access (e.g. for keys
 *      that collide with reserved words, or for dynamic-but-literal keys).
 *
 *   3. Direct indexed reads on the source maps (no local alias)
 *        TRANSLATIONS[locale].sourcePrefix
 *        TRANSLATIONS["pl"].local.heading
 *        TIME_LINE_TRANSLATIONS[loc].timePrefix
 *      The existing model-file scanner already did this for
 *      TIME_LINE_TRANSLATIONS — extended now to TRANSLATIONS too, and to
 *      bracket-access tail segments.
 *
 *   4. Translator-helper calls (optional alias):
 *        $t("heading")        $t('local.heading')
 *        t("sourcePrefix")    tStrings("timePrefix")
 *      The argument is parsed as a dotted path. Single-segment paths land
 *      in the `top`/`variant`/`tStrings` bucket (depending on which helper
 *      is called); two-segment paths starting with `local.`/`remote.` are
 *      classified as variant keys; deeper paths are reported under --debug
 *      so the maintainer can decide whether to extend the categorizer.
 *      Calls inside SOURCE_FILE comments / strings unrelated to the
 *      builder are filtered out by the call-site heuristic (see
 *      `isLikelyTranslatorCall`).
 *
 * Limitations
 * -----------
 * This is a pragmatic regex-based scanner — it intentionally does NOT spin up
 * a TS AST. The trade-off: false positives are possible for code that just
 * happens to use the same identifier names. We mitigate by:
 *   - anchoring patterns with a non-word lookbehind (`(?<![\\w$.])`),
 *   - only treating bracket access as a key when the index is a string
 *     literal (no variables — those would have to be resolved by the type
 *     checker and we explicitly opt out of that complexity),
 *   - filtering translator calls to require at least one of the recognised
 *     helper names AND a non-empty literal argument.
 * If the builder ever reads keys via genuinely dynamic access (e.g.
 * `t[someEnumKey]`), this scanner won't detect them — that case must be
 * caught by the runtime contract test, not the static autofix.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const CONTENT_PATH = resolve(ROOT, "src/lib/lastChangeTooltipContent.ts");
const MODEL_PATH = resolve(ROOT, "src/lib/lastChangeTooltipModel.ts");

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has("--check");
const DEBUG = args.has("--debug");

// ---------------------------------------------------------------------------
// Detection helpers
//
// Each detector below returns a Set<string> of identifier names. Detectors
// are intentionally narrow (one pattern each) so failures are easy to
// localize: turn on --debug, see which detector dropped the key.
// ---------------------------------------------------------------------------

/** Identifier-character regex bit, reused so we don't drift between detectors. */
const IDENT = "[a-zA-Z_$][\\w$]*";
/** Lookbehind ensuring the alias is not preceded by `.` or word chars (so
 * `obj.t.foo` is NOT counted as `t.foo`). */
const ALIAS_BOUNDARY = "(?<![\\w$.])";

/**
 * #1 — Dot member reads: `<alias>.<key>`.
 * Original detector, unchanged in semantics.
 */
export const collectDotMemberReads = (source, alias) => {
  const re = new RegExp(`${ALIAS_BOUNDARY}${alias}\\.(${IDENT})`, "g");
  const found = new Set();
  for (const m of source.matchAll(re)) found.add(m[1]);
  return found;
};

/**
 * #2 — Bracket reads with string literals: `<alias>["key"]` / `['key']` /
 * `` `key` `` (template literal, only when it has no `${}` interpolation).
 * Returns the un-quoted identifier.
 */
export const collectBracketLiteralReads = (source, alias) => {
  // Match either single, double, or backtick-quoted SIMPLE literal (no
  // interpolation, no escapes inside the key — those would imply non-static
  // keys and we explicitly skip them).
  const re = new RegExp(
    `${ALIAS_BOUNDARY}${alias}\\[\\s*(?:"([^"\\\\]+)"|'([^'\\\\]+)'|\`([^\`$\\\\]+)\`)\\s*\\]`,
    "g",
  );
  const found = new Set();
  for (const m of source.matchAll(re)) {
    const key = m[1] ?? m[2] ?? m[3];
    if (key && /^[a-zA-Z_$][\w$]*$/.test(key)) found.add(key);
  }
  return found;
};

/**
 * #3 — Direct indexed reads on a source MAP (e.g. `TRANSLATIONS[locale].key`,
 * `TIME_LINE_TRANSLATIONS["pl"].timePrefix`, plus chained
 * `TRANSLATIONS[locale].local.heading`).
 *
 * Returns an array of dotted-path strings (e.g. `"sourcePrefix"`,
 * `"local.heading"`) — the caller categorises them.
 */
export const collectIndexedMapReads = (source, mapName) => {
  // After the `[...]` we accept zero or more `.<ident>` or `["literal"]`
  // segments. Only the FIRST tail segment is required (otherwise a bare
  // `TRANSLATIONS[locale]` is a sub-object access we don't care about).
  const re = new RegExp(
    `${ALIAS_BOUNDARY}${mapName}\\[[^\\]]+\\]((?:\\.${IDENT}|\\[\\s*(?:"[^"\\\\]+"|'[^'\\\\]+'|\`[^\`$\\\\]+\`)\\s*\\])+)`,
    "g",
  );
  const paths = new Set();
  for (const m of source.matchAll(re)) {
    const tail = m[1];
    // Normalise tail into dotted path. Bracket["x"] → .x, .x → .x.
    const segments = [];
    const segRe = new RegExp(
      `\\.(${IDENT})|\\[\\s*(?:"([^"\\\\]+)"|'([^'\\\\]+)'|\`([^\`$\\\\]+)\`)\\s*\\]`,
      "g",
    );
    let s;
    while ((s = segRe.exec(tail)) !== null) {
      const seg = s[1] ?? s[2] ?? s[3] ?? s[4];
      if (seg && /^[a-zA-Z_$][\w$]*$/.test(seg)) segments.push(seg);
    }
    if (segments.length > 0) paths.add(segments.join("."));
  }
  return paths;
};

/**
 * #4 — Translator-helper call: `<helper>("key")`, `<helper>('local.heading')`.
 *
 * The argument must be a single string literal (concatenated/templated args
 * imply dynamic keys we can't resolve statically). Recognises any helper in
 * the `helperNames` list — pass `["$t","t","tStrings"]` for the broadest
 * coverage. The detector ignores call-sites where the literal is empty or
 * looks like a sentence (contains spaces) so test/debug strings don't leak in.
 */
export const collectTranslatorCallKeys = (source, helperNames) => {
  if (helperNames.length === 0) return new Set();
  const helpersAlt = helperNames
    .map((n) => n.replace(/[$]/g, "\\$"))
    .join("|");
  const re = new RegExp(
    `${ALIAS_BOUNDARY}(?:${helpersAlt})\\(\\s*(?:"([^"\\\\]+)"|'([^'\\\\]+)'|\`([^\`$\\\\]+)\`)\\s*[,)]`,
    "g",
  );
  const found = new Set();
  for (const m of source.matchAll(re)) {
    const arg = m[1] ?? m[2] ?? m[3];
    if (!arg) continue;
    // Reject obvious non-keys: whitespace, leading/trailing dot, all-digits.
    if (/\s/.test(arg)) continue;
    if (/^\.|\.$/.test(arg)) continue;
    if (/^\d+$/.test(arg)) continue;
    // Only accept dotted-path of valid identifiers.
    const parts = arg.split(".");
    if (!parts.every((p) => /^[a-zA-Z_$][\w$]*$/.test(p))) continue;
    found.add(arg);
  }
  return found;
};

/**
 * Find variant.<key> reads that appear with a `??` fallback (treated as
 * OPTIONAL keys — the builder tolerates them being undefined).
 *
 * Extended to also catch:
 *   - bracket form:   variant["key"] ?? …
 *   - translator call form: $t("local.key") ?? …  (when arg is `local.X` /
 *     `remote.X`, the `X` segment is the variant key)
 */
export const collectOptionalVariantReads = (source) => {
  const found = new Set();
  // a) variant.X ??
  for (const m of source.matchAll(
    new RegExp(`${ALIAS_BOUNDARY}variant\\.(${IDENT})\\s*\\?\\?`, "g"),
  )) {
    found.add(m[1]);
  }
  // b) variant["X"] ?? / variant['X'] ?? / variant[`X`] ??
  for (const m of source.matchAll(
    new RegExp(
      `${ALIAS_BOUNDARY}variant\\[\\s*(?:"([^"\\\\]+)"|'([^'\\\\]+)'|\`([^\`$\\\\]+)\`)\\s*\\]\\s*\\?\\?`,
      "g",
    ),
  )) {
    const key = m[1] ?? m[2] ?? m[3];
    if (key && /^[a-zA-Z_$][\w$]*$/.test(key)) found.add(key);
  }
  // c) $t("local.X") ?? …  (variant.X with fallback via translator helper)
  for (const m of source.matchAll(
    /(?<![\w$.])\$?t\(\s*(?:"(?:local|remote)\.([a-zA-Z_$][\w$]*)"|'(?:local|remote)\.([a-zA-Z_$][\w$]*)')\s*\)\s*\?\?/g,
  )) {
    const key = m[1] ?? m[2];
    if (key) found.add(key);
  }
  return found;
};

const sortedArr = (set) => [...set].sort((a, b) => a.localeCompare(b));

// ---------------------------------------------------------------------------
// Diff helpers — print a per-bucket added/removed report so a developer
// running `--check` immediately sees WHAT drifted, not just THAT it did.
// Without this, the only feedback was "files would change" + a dump of the
// new desired list — leaving the maintainer to eyeball the difference.
// ---------------------------------------------------------------------------

/**
 * Extract the comma-separated string-literal entries from a substring like
 *   `["foo", "bar"] as const`   or   `[]`.
 * Returns the keys in declaration order. Used to parse the EXISTING
 * REQUIRED_* declarations directly from source so the diff reflects what
 * is actually committed (not a re-imported module that might be cached).
 */
const parseLiteralArray = (raw) => {
  const out = [];
  const re = /["']([^"'\\]+)["']/g;
  let m;
  while ((m = re.exec(raw)) !== null) out.push(m[1]);
  return out;
};

/**
 * Parse the current REQUIRED_TRANSLATION_KEYS object from the content file.
 * Returns `{ top, variant, variantOptional }` as arrays of strings.
 * Missing buckets default to `[]` so a malformed file still diffs cleanly.
 */
export const parseCurrentTranslationKeys = (source) => {
  const blockMatch = source.match(
    /export const REQUIRED_TRANSLATION_KEYS\s*=\s*\{([\s\S]*?)\}\s*as const;/,
  );
  if (!blockMatch) return { top: [], variant: [], variantOptional: [] };
  const body = blockMatch[1];
  const pick = (name) => {
    const re = new RegExp(`${name}\\s*:\\s*(\\[[\\s\\S]*?\\])`);
    const m = body.match(re);
    return m ? parseLiteralArray(m[1]) : [];
  };
  return {
    top: pick("top"),
    variant: pick("variant"),
    variantOptional: pick("variantOptional"),
  };
};

/** Parse the current REQUIRED_TIME_LINE_KEYS array from the model file. */
export const parseCurrentTimeLineKeys = (source) => {
  const m = source.match(
    /export const REQUIRED_TIME_LINE_KEYS\s*=\s*(\[[\s\S]*?\])\s*as const satisfies/,
  );
  return m ? parseLiteralArray(m[1]) : [];
};

/**
 * Compute `{ added, removed }` between two key lists. Order-independent;
 * outputs are sorted for stable, scannable diffs. Exported for unit tests.
 */
export const diffKeys = (current, next) => {
  const cur = new Set(current);
  const nxt = new Set(next);
  const added = [...nxt].filter((k) => !cur.has(k)).sort((a, b) => a.localeCompare(b));
  const removed = [...cur].filter((k) => !nxt.has(k)).sort((a, b) => a.localeCompare(b));
  return { added, removed };
};

/**
 * Format a single bucket's diff as human-readable lines. Returns `null`
 * when there are no changes (caller filters those out so the summary only
 * lists buckets that actually moved).
 */
const formatBucketDiff = (label, diff) => {
  if (diff.added.length === 0 && diff.removed.length === 0) return null;
  const lines = [`  ${label}:`];
  for (const k of diff.added) lines.push(`    + ${k}`);
  for (const k of diff.removed) lines.push(`    - ${k}`);
  return lines.join("\n");
};

/**
 * Emit the per-bucket diff report. Always logs SOMETHING so the operator
 * has a clear signal even when nothing changed (vs. silently exiting and
 * leaving them to wonder whether the script ran).
 */
const printDiffReport = (translationDiffs, timeLineDiff) => {
  const blocks = [
    formatBucketDiff("top", translationDiffs.top),
    formatBucketDiff("variant", translationDiffs.variant),
    formatBucketDiff("variantOptional", translationDiffs.variantOptional),
    formatBucketDiff("timeLine", timeLineDiff),
  ].filter(Boolean);

  console.log("\n[autofix-required-translation-keys] per-bucket diff:");
  if (blocks.length === 0) {
    console.log("  (no changes — every bucket is already in sync)");
    return;
  }
  for (const b of blocks) console.log(b);
};

// ---------------------------------------------------------------------------
// Code generators
// ---------------------------------------------------------------------------

const renderRequiredTranslationKeys = ({ top, variant, variantOptional }) => {
  const fmt = (arr) =>
    arr.length === 0
      ? "[]"
      : `[${arr.map((k) => `"${k}"`).join(", ")}] as const`;
  return `export const REQUIRED_TRANSLATION_KEYS = {
  top: ${fmt(top)},
  variant: ${fmt(variant)},
  variantOptional: ${fmt(variantOptional)},
} as const;`;
};

const renderRequiredTimeLineKeys = (keys) => {
  const lines = keys.map((k) => `  "${k}",`).join("\n");
  return `export const REQUIRED_TIME_LINE_KEYS = [
${lines}
] as const satisfies ReadonlyArray<keyof TimeLineStrings>;`;
};

// ---------------------------------------------------------------------------
// File rewriters — find the existing declaration block and swap its body
// while keeping the JSDoc above untouched.
// ---------------------------------------------------------------------------

const replaceBlock = (source, startMarker, endMarker, replacement) => {
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`Cannot find start marker: ${startMarker}`);
  }
  const endIdx = source.indexOf(endMarker, startIdx);
  if (endIdx === -1) {
    throw new Error(`Cannot find end marker after start: ${endMarker}`);
  }
  const endLineEnd = source.indexOf("\n", endIdx);
  const after = endLineEnd === -1 ? source.length : endLineEnd;
  return source.slice(0, startIdx) + replacement + source.slice(after);
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Categorise a dotted translator-call path into one of:
 *   { bucket: "top",      key: "<id>" }       e.g. "sourcePrefix"
 *   { bucket: "variant",  key: "<id>" }       e.g. "local.heading" / "remote.X"
 *   { bucket: "timeLine", key: "<id>" }       e.g. "timePrefix" (model file only)
 *   { bucket: "ignored",  reason: "..." }     for paths the categorizer can't classify
 *
 * The `scope` argument selects which buckets are valid:
 *   - "translations" → top + variant
 *   - "timeLine"     → timeLine
 *
 * In --debug mode the caller logs ignored entries so a maintainer can see
 * why a translator call didn't end up in the REQUIRED_* lists (and decide
 * whether to extend the categorizer).
 */
export const categoriseHelperPath = (path, scope) => {
  const parts = path.split(".");
  if (scope === "timeLine") {
    if (parts.length === 1) return { bucket: "timeLine", key: parts[0] };
    return { bucket: "ignored", reason: `time-line helper expects single segment, got "${path}"` };
  }
  // scope === "translations"
  if (parts.length === 1) return { bucket: "top", key: parts[0] };
  if (parts.length === 2 && (parts[0] === "local" || parts[0] === "remote")) {
    return { bucket: "variant", key: parts[1] };
  }
  return { bucket: "ignored", reason: `unrecognised translation path "${path}"` };
};

const debugLog = (label, value) => {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.log(`[autofix:debug] ${label}:`, value);
};

const run = () => {
  const contentSrc = readFileSync(CONTENT_PATH, "utf8");
  const modelSrc = readFileSync(MODEL_PATH, "utf8");
  const ignoredPaths = []; // { file, path, reason }

  // ─── TRANSLATIONS (content file) ───────────────────────────────────────────
  // Layer 1 — dot member reads (existing detector).
  const tDot = collectDotMemberReads(contentSrc, "t");
  const variantDot = collectDotMemberReads(contentSrc, "variant");
  // Layer 2 — bracket-literal reads on the same aliases.
  const tBracket = collectBracketLiteralReads(contentSrc, "t");
  const variantBracket = collectBracketLiteralReads(contentSrc, "variant");
  // Layer 3 — direct indexed map reads `TRANSLATIONS[loc].…`. The tail can
  // be `sourcePrefix` (top), `local.heading` (variant), `remote.heading`
  // (variant), or sub-object access like just `local` (ignored — that's
  // taking the variant object, not a leaf key).
  const indexedTranslationPaths = collectIndexedMapReads(contentSrc, "TRANSLATIONS");
  // Layer 4 — translator-helper calls (`$t("…")` / `t("…")`). We accept
  // both helpers; if the codebase later renames `$t` → `tr`, just add it
  // to the list below.
  const helperCallPaths = collectTranslatorCallKeys(contentSrc, ["$t", "tr"]);
  // NOTE: we deliberately DO NOT include bare `t("…")` here — `t` is the
  // variant-object alias, not a function, so any `t(...)` would be a false
  // positive. If the codebase introduces a `t()` helper, add it explicitly.

  debugLog("content/t.dot", [...tDot]);
  debugLog("content/t.bracket", [...tBracket]);
  debugLog("content/variant.dot", [...variantDot]);
  debugLog("content/variant.bracket", [...variantBracket]);
  debugLog("content/TRANSLATIONS[…].path", [...indexedTranslationPaths]);
  debugLog("content/helperCall.path", [...helperCallPaths]);

  // Categorise indexed and helper-call paths into top/variant buckets.
  const topFromIndexed = new Set();
  const variantFromIndexed = new Set();
  for (const path of indexedTranslationPaths) {
    const r = categoriseHelperPath(path, "translations");
    if (r.bucket === "top") topFromIndexed.add(r.key);
    else if (r.bucket === "variant") variantFromIndexed.add(r.key);
    else ignoredPaths.push({ file: CONTENT_PATH, path, reason: r.reason });
  }
  const topFromHelper = new Set();
  const variantFromHelper = new Set();
  for (const path of helperCallPaths) {
    const r = categoriseHelperPath(path, "translations");
    if (r.bucket === "top") topFromHelper.add(r.key);
    else if (r.bucket === "variant") variantFromHelper.add(r.key);
    else ignoredPaths.push({ file: CONTENT_PATH, path, reason: r.reason });
  }

  // Top-level keys: union of all detectors. Strip known sub-objects
  // (`local` / `remote`) — accessing those returns the variant container,
  // not a leaf key, and they are NOT part of REQUIRED_TRANSLATION_KEYS.top.
  const topReads = new Set([
    ...tDot,
    ...tBracket,
    ...topFromIndexed,
    ...topFromHelper,
  ]);
  topReads.delete("remote");
  topReads.delete("local");

  // Variant keys: union of all detectors, then split required vs optional.
  const variantOptional = collectOptionalVariantReads(contentSrc);
  const variantAll = new Set([
    ...variantDot,
    ...variantBracket,
    ...variantFromIndexed,
    ...variantFromHelper,
  ]);
  const variantRequired = new Set(
    [...variantAll].filter((k) => !variantOptional.has(k)),
  );

  const newTranslationBlock = renderRequiredTranslationKeys({
    top: sortedArr(topReads),
    variant: sortedArr(variantRequired),
    variantOptional: sortedArr(variantOptional),
  });

  // ─── TIME_LINE_TRANSLATIONS (model file) ───────────────────────────────────
  // Layer 1 — dot reads on the local alias `tStrings`.
  const tStringsDot = collectDotMemberReads(modelSrc, "tStrings");
  // Layer 2 — bracket-literal reads on the same alias.
  const tStringsBracket = collectBracketLiteralReads(modelSrc, "tStrings");
  // Layer 3 — direct indexed reads on the source map (e.g. inside the
  // standalone `getTimeLinePrefix` helper that doesn't bind a local alias).
  const indexedTimeLinePaths = collectIndexedMapReads(modelSrc, "TIME_LINE_TRANSLATIONS");
  // Layer 4 — translator-helper calls. Use the same helper names as for
  // translations; categoriser scopes them to `timeLine`.
  const helperCallTimeLinePaths = collectTranslatorCallKeys(modelSrc, ["$t", "tr"]);

  debugLog("model/tStrings.dot", [...tStringsDot]);
  debugLog("model/tStrings.bracket", [...tStringsBracket]);
  debugLog("model/TIME_LINE_TRANSLATIONS[…].path", [...indexedTimeLinePaths]);
  debugLog("model/helperCall.path", [...helperCallTimeLinePaths]);

  const timeLineFromIndexed = new Set();
  for (const path of indexedTimeLinePaths) {
    const r = categoriseHelperPath(path, "timeLine");
    if (r.bucket === "timeLine") timeLineFromIndexed.add(r.key);
    else ignoredPaths.push({ file: MODEL_PATH, path, reason: r.reason });
  }
  const timeLineFromHelper = new Set();
  for (const path of helperCallTimeLinePaths) {
    const r = categoriseHelperPath(path, "timeLine");
    if (r.bucket === "timeLine") timeLineFromHelper.add(r.key);
    else ignoredPaths.push({ file: MODEL_PATH, path, reason: r.reason });
  }

  const timeLineKeys = new Set([
    ...tStringsDot,
    ...tStringsBracket,
    ...timeLineFromIndexed,
    ...timeLineFromHelper,
  ]);
  const newTimeLineBlock = renderRequiredTimeLineKeys(sortedArr(timeLineKeys));

  // --- Apply edits ---
  const updatedContent = replaceBlock(
    contentSrc,
    "export const REQUIRED_TRANSLATION_KEYS",
    "} as const;",
    newTranslationBlock,
  );
  const updatedModel = replaceBlock(
    modelSrc,
    "export const REQUIRED_TIME_LINE_KEYS",
    "] as const satisfies ReadonlyArray<keyof TimeLineStrings>;",
    newTimeLineBlock,
  );

  const contentChanged = updatedContent !== contentSrc;
  const modelChanged = updatedModel !== modelSrc;

  // Reporting
  const summary = {
    detected: {
      translations: {
        top: sortedArr(topReads),
        variant: sortedArr(variantRequired),
        variantOptional: sortedArr(variantOptional),
      },
      timeLine: sortedArr(timeLineKeys),
    },
    changes: {
      [CONTENT_PATH]: contentChanged ? "updated" : "unchanged",
      [MODEL_PATH]: modelChanged ? "updated" : "unchanged",
    },
  };

  console.log("[autofix-required-translation-keys] detected keys:");
  console.log(JSON.stringify(summary.detected, null, 2));

  // Surface ignored paths so a maintainer never silently loses a key to
  // an unrecognised access shape (e.g. a future `$t("local.foo.bar")` with
  // 3 segments). Always printed (not just under --debug) because it's a
  // signal that the categorizer needs extension.
  if (ignoredPaths.length > 0) {
    console.warn(
      `\n[autofix-required-translation-keys] WARNING: ${ignoredPaths.length} translator path(s) could not be categorised:`,
    );
    for (const { file, path, reason } of ignoredPaths) {
      console.warn(`  - ${path}  (in ${file}) — ${reason}`);
    }
    console.warn(
      "  These paths were NOT added to REQUIRED_* lists. Extend categoriseHelperPath() if they should be.",
    );
  }


  if (CHECK_ONLY) {
    if (contentChanged || modelChanged) {
      console.error(
        "\n[autofix-required-translation-keys] CHECK FAILED: REQUIRED_* lists are out of sync with builder usage.\n" +
          "  Run `node scripts/autofix-required-translation-keys.mjs` to update them.",
      );
      console.error("\nFiles that would change:");
      for (const [p, status] of Object.entries(summary.changes)) {
        if (status === "updated") console.error(`  - ${p}`);
      }
      process.exit(1);
    }
    console.log(
      "\n[autofix-required-translation-keys] CHECK OK: REQUIRED_* lists are in sync.",
    );
    return;
  }

  if (contentChanged) writeFileSync(CONTENT_PATH, updatedContent);
  if (modelChanged) writeFileSync(MODEL_PATH, updatedModel);

  console.log("\n[autofix-required-translation-keys] file changes:");
  for (const [p, status] of Object.entries(summary.changes)) {
    console.log(`  ${status === "updated" ? "✏️  updated" : "✅ unchanged"}  ${p}`);
  }
};

// Only execute when run as the entry-point script. When this module is
// imported (e.g. by unit tests that exercise the individual detectors),
// `run()` must NOT fire — it would attempt to write source files during
// vitest collection.
const isEntryPoint =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? "");
if (isEntryPoint) {
  try {
    run();
  } catch (err) {
    console.error(
      `[autofix-required-translation-keys] ERROR: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(2);
  }
}
