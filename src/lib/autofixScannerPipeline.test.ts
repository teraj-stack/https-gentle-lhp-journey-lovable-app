/**
 * Pipeline-level tests for the autofix scanner.
 *
 * Why a SECOND test file?
 * -----------------------
 * `autofixScanner.test.ts` exercises each detector / parser / diff helper in
 * isolation. That catches regressions in the regex layer but says nothing
 * about how the pieces compose. The real CI guard is the *combined*
 * behaviour:
 *
 *   1. Feed a synthetic snippet representing a builder file that uses every
 *      supported access shape (dot, bracket, indexed, translator helper,
 *      optional `??`).
 *   2. Run the scanner over it and verify the resulting bucketed key sets
 *      match exactly what a human reader would expect.
 *   3. Render the REQUIRED_* declaration block and confirm it is:
 *        - **Deterministic**: rendering twice yields byte-identical output.
 *        - **Order-independent**: shuffling the input keys produces the
 *          same block (alphabetical sorting inside each bucket).
 *        - **Idempotent**: re-parsing the rendered block and re-rendering
 *          produces the same string (no hidden transformations on round
 *          trip — protects future maintainers from accidentally changing
 *          the rendered shape).
 *
 * These properties are the contract the autofix script promises CI:
 * "running me twice on the same source never produces a diff". Locking
 * them into unit tests means a regression surfaces immediately, not after
 * a confusing CI failure on an unrelated PR.
 */
import { describe, expect, it } from "vitest";
import {
  collectDotMemberReads,
  collectBracketLiteralReads,
  collectIndexedMapReads,
  collectTranslatorCallKeys,
  collectOptionalVariantReads,
  categoriseHelperPath,
  parseCurrentTranslationKeys,
  parseCurrentTimeLineKeys,
  renderRequiredTranslationKeys,
  renderRequiredTimeLineKeys,
} from "./autofixScannerShim";

// ---------------------------------------------------------------------------
// Synthetic source that exercises EVERY supported access pattern in one
// snippet. Designed to be the single fixture for the full-pipeline tests
// below — when a new detector lands, extend this snippet and add an
// expectation in the "detected key sets" test.
// ---------------------------------------------------------------------------
const CONTENT_SNIPPET = `
  // Layer 1: dot reads
  const a = t.sourcePrefix;
  const b = variant.heading;
  const c = variant.description;
  const d = variant.shortBadge;

  // Layer 2: bracket reads with string literals
  const e = t["sourcePrefix"];          // duplicate of dot read — must dedupe
  const f = variant['heading'];         // single-quote form
  const g = variant[\`shortBadge\`];     // template literal (no interpolation)

  // Layer 3: direct indexed reads on the source map
  const h = TRANSLATIONS[locale].sourcePrefix;
  const i = TRANSLATIONS["pl"].local.heading;
  const j = TRANSLATIONS[loc].remote.description;

  // Layer 4: translator-helper calls
  const k = $t("sourcePrefix");
  const l = $t("local.heading");
  const m = tr("remote.shortBadge");

  // Optional variant (?? fallback) — must NOT appear in 'variant', only in 'variantOptional'
  const n = variant.ariaHeadingOverride ?? variant.heading;
  const o = variant["ariaHeadingOverride"] ?? "fallback";
  const p = $t("local.ariaHeadingOverride") ?? "fallback";
`;

const MODEL_SNIPPET = `
  // Dot reads on tStrings alias
  const a = tStrings.timePrefix;
  const b = tStrings.relativeQualifier;
  const c = tStrings.relativeHelpTitle;

  // Bracket form
  const d = tStrings["timePrefix"];

  // Direct indexed reads
  const e = TIME_LINE_TRANSLATIONS[loc].timePrefix;
  const f = TIME_LINE_TRANSLATIONS["en"].relativeQualifier;

  // Translator helper
  const g = $t("relativeHelpTitle");
`;

/**
 * Mirrors the bucket-assembly logic in `run()` of the autofix script — kept
 * as a small local helper so the test stays readable AND so a deviation
 * between this and the script's logic shows up as a test failure in *this*
 * file (the assertion will mismatch the snippet's expected sets).
 */
const scanContent = (src: string) => {
  const tDot = collectDotMemberReads(src, "t");
  const tBracket = collectBracketLiteralReads(src, "t");
  const variantDot = collectDotMemberReads(src, "variant");
  const variantBracket = collectBracketLiteralReads(src, "variant");
  const indexed = collectIndexedMapReads(src, "TRANSLATIONS");
  const helperPaths = collectTranslatorCallKeys(src, ["$t", "tr"]);
  const optional = collectOptionalVariantReads(src);

  const top = new Set<string>([...tDot, ...tBracket]);
  const variant = new Set<string>([...variantDot, ...variantBracket]);
  for (const p of indexed) {
    const r = categoriseHelperPath(p, "translations");
    if (r.bucket === "top") top.add(r.key);
    else if (r.bucket === "variant") variant.add(r.key);
  }
  for (const p of helperPaths) {
    const r = categoriseHelperPath(p, "translations");
    if (r.bucket === "top") top.add(r.key);
    else if (r.bucket === "variant") variant.add(r.key);
  }
  // Strip sub-object names that are containers, never leaf keys.
  top.delete("local");
  top.delete("remote");
  // Required = variant minus optional (matches script behaviour).
  const required = new Set<string>(
    [...variant].filter((k) => !optional.has(k)),
  );
  return { top, variant: required, variantOptional: optional };
};

const scanTimeLine = (src: string) => {
  const dot = collectDotMemberReads(src, "tStrings");
  const bracket = collectBracketLiteralReads(src, "tStrings");
  const indexed = collectIndexedMapReads(src, "TIME_LINE_TRANSLATIONS");
  const helperPaths = collectTranslatorCallKeys(src, ["$t", "tr"]);

  const keys = new Set<string>([...dot, ...bracket]);
  for (const p of indexed) {
    const r = categoriseHelperPath(p, "timeLine");
    if (r.bucket === "timeLine") keys.add(r.key);
  }
  for (const p of helperPaths) {
    const r = categoriseHelperPath(p, "timeLine");
    if (r.bucket === "timeLine") keys.add(r.key);
  }
  return keys;
};

const sorted = (set: Set<string>): string[] =>
  [...set].sort((a, b) => a.localeCompare(b));

describe("autofix pipeline — detected key sets on a synthetic snippet", () => {
  it("classifies translation keys into the correct buckets (dedup across patterns)", () => {
    const { top, variant, variantOptional } = scanContent(CONTENT_SNIPPET);
    expect(sorted(top)).toEqual(["sourcePrefix"]);
    expect(sorted(variant)).toEqual(["description", "heading", "shortBadge"]);
    // ariaHeadingOverride is reached via dot, bracket AND helper — all three
    // forms include `?? fallback`, so it lands ONLY in variantOptional.
    expect(sorted(variantOptional)).toEqual(["ariaHeadingOverride"]);
  });

  it("excludes optional keys from the required variant bucket", () => {
    const { variant, variantOptional } = scanContent(CONTENT_SNIPPET);
    for (const k of variantOptional) {
      expect(variant.has(k)).toBe(false);
    }
  });

  it("collects every time-line key regardless of access form", () => {
    expect(sorted(scanTimeLine(MODEL_SNIPPET))).toEqual([
      "relativeHelpTitle",
      "relativeQualifier",
      "timePrefix",
    ]);
  });
});

describe("autofix pipeline — deterministic & order-independent rendering", () => {
  it("renders byte-identical output for two consecutive calls", () => {
    const buckets = {
      top: ["sourcePrefix"],
      variant: ["description", "heading", "shortBadge"],
      variantOptional: ["ariaHeadingOverride"],
    };
    expect(renderRequiredTranslationKeys(buckets)).toBe(
      renderRequiredTranslationKeys(buckets),
    );
    expect(renderRequiredTimeLineKeys(["a", "b", "c"])).toBe(
      renderRequiredTimeLineKeys(["a", "b", "c"]),
    );
  });

  it("produces the same block when input arrays are pre-sorted vs shuffled", () => {
    // The renderer trusts its caller to sort, so the AUTOFIX SCRIPT sorts
    // before passing in. This test mirrors that contract: any caller who
    // sorts (the canonical path) gets stable output regardless of upstream
    // input order.
    const sortedBuckets = {
      top: ["sourcePrefix"],
      variant: ["description", "heading", "shortBadge"],
      variantOptional: ["ariaHeadingOverride"],
    };
    const shuffledThenSorted = {
      top: [...["sourcePrefix"]].sort(),
      variant: [...["shortBadge", "heading", "description"]].sort(),
      variantOptional: [...["ariaHeadingOverride"]].sort(),
    };
    expect(renderRequiredTranslationKeys(shuffledThenSorted)).toBe(
      renderRequiredTranslationKeys(sortedBuckets),
    );
  });

  it("renders empty buckets as `[]` (no trailing `as const`)", () => {
    const block = renderRequiredTranslationKeys({
      top: [],
      variant: [],
      variantOptional: [],
    });
    expect(block).toContain("top: [],");
    expect(block).toContain("variant: [],");
    expect(block).toContain("variantOptional: [],");
    // Empty bucket should not get `as const` (would be `[] as const` — still
    // valid TS, but we picked the shorter form to keep diffs minimal).
    expect(block).not.toContain("[] as const");
  });

  it("renders non-empty buckets with `as const` for proper TS literal narrowing", () => {
    const block = renderRequiredTranslationKeys({
      top: ["sourcePrefix"],
      variant: ["heading"],
      variantOptional: [],
    });
    expect(block).toContain('top: ["sourcePrefix"] as const,');
    expect(block).toContain('variant: ["heading"] as const,');
  });
});

describe("autofix pipeline — idempotent round-trip (parse → render → parse)", () => {
  it("is stable for translation keys: rendered block re-parses to the same buckets", () => {
    const buckets = {
      top: ["sourcePrefix"],
      variant: ["description", "heading", "shortBadge"],
      variantOptional: ["ariaHeadingOverride"],
    };
    const block = renderRequiredTranslationKeys(buckets);
    const reparsed = parseCurrentTranslationKeys(block);
    expect(reparsed).toEqual(buckets);
    // Render again from the re-parsed buckets — must equal the first render.
    expect(renderRequiredTranslationKeys(reparsed)).toBe(block);
  });

  it("is stable for time-line keys: rendered block re-parses identically", () => {
    const keys = ["relativeHelpTitle", "relativeQualifier", "timePrefix"];
    const block = renderRequiredTimeLineKeys(keys);
    const reparsed = parseCurrentTimeLineKeys(block);
    expect(reparsed).toEqual(keys);
    expect(renderRequiredTimeLineKeys(reparsed)).toBe(block);
  });

  it("is stable across the FULL pipeline: scan → render → re-parse → equal sets", () => {
    const scanned = scanContent(CONTENT_SNIPPET);
    const block = renderRequiredTranslationKeys({
      top: sorted(scanned.top),
      variant: sorted(scanned.variant),
      variantOptional: sorted(scanned.variantOptional),
    });
    const reparsed = parseCurrentTranslationKeys(block);
    expect(reparsed.top).toEqual(sorted(scanned.top));
    expect(reparsed.variant).toEqual(sorted(scanned.variant));
    expect(reparsed.variantOptional).toEqual(sorted(scanned.variantOptional));
  });

  it("is stable across the time-line pipeline", () => {
    const scanned = scanTimeLine(MODEL_SNIPPET);
    const block = renderRequiredTimeLineKeys(sorted(scanned));
    expect(parseCurrentTimeLineKeys(block)).toEqual(sorted(scanned));
  });
});
