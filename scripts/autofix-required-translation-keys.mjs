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
 *
 * Limitations
 * -----------
 * This is a pragmatic regex-based scanner — it intentionally does NOT spin up
 * a TS AST. It assumes the builder keeps using the local aliases `t`,
 * `variant`, and `tStrings`. If you rename them, update the patterns below
 * AND the detection comment in the relevant source file.
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

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/**
 * Find all <alias>.<identifier> reads in source for the given alias.
 * Returns a Set of identifier names (deduped). We intentionally exclude
 * shorthand/declaration sites by ignoring matches preceded by . (avoids
 * picking up something.t.x chains where t isn't our alias).
 */
const collectMemberReads = (source, alias) => {
  const re = new RegExp(`(?<![\\w$.])${alias}\\.([a-zA-Z_$][\\w$]*)`, "g");
  const found = new Set();
  for (const m of source.matchAll(re)) {
    found.add(m[1]);
  }
  return found;
};

/**
 * Find variant.<key> reads that appear with a ?? fallback (treated as
 * OPTIONAL keys — the builder tolerates them being undefined).
 */
const collectOptionalVariantReads = (source) => {
  const re = /(?<![\w$.])variant\.([a-zA-Z_$][\w$]*)\s*\?\?/g;
  const found = new Set();
  for (const m of source.matchAll(re)) {
    found.add(m[1]);
  }
  return found;
};

const sortedArr = (set) => [...set].sort((a, b) => a.localeCompare(b));

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

const run = () => {
  const contentSrc = readFileSync(CONTENT_PATH, "utf8");
  const modelSrc = readFileSync(MODEL_PATH, "utf8");

  // --- TRANSLATIONS (content file) ---
  const topReads = collectMemberReads(contentSrc, "t");
  // Filter t.<key> to only those that are NOT also variant-style sub-objects.
  // We know t.remote and t.local are sub-variants — exclude them.
  topReads.delete("remote");
  topReads.delete("local");

  const variantOptional = collectOptionalVariantReads(contentSrc);
  const variantAll = collectMemberReads(contentSrc, "variant");
  const variantRequired = new Set(
    [...variantAll].filter((k) => !variantOptional.has(k)),
  );

  const newTranslationBlock = renderRequiredTranslationKeys({
    top: sortedArr(topReads),
    variant: sortedArr(variantRequired),
    variantOptional: sortedArr(variantOptional),
  });

  // --- TIME_LINE_TRANSLATIONS (model file) ---
  const timeLineKeys = collectMemberReads(modelSrc, "tStrings");
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

try {
  run();
} catch (err) {
  console.error(
    `[autofix-required-translation-keys] ERROR: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(2);
}
