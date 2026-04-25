/**
 * Typed re-export shim for the autofix scanner script.
 *
 * Why a shim?
 * -----------
 * The script `scripts/autofix-required-translation-keys.mjs` is plain
 * JavaScript so it stays runnable directly via `node …` with no build
 * step. Importing it from a `.test.ts` file works at runtime (vitest
 * resolves `.mjs`), but TypeScript needs declared types — and ambient
 * `declare module "../scripts/…"` lookups for relative specifiers are
 * unreliable across editor/tsserver versions.
 *
 * This shim solves it cleanly:
 *   - At RUNTIME, it just re-exports the script's named helpers. Vitest
 *     follows the real ESM dependency, so the test exercises the LIVE
 *     code in the script (no drift risk).
 *   - At BUILD/CHECK time, the explicit type annotations below give
 *     TypeScript strong types for each helper, so refactors that change
 *     a signature surface as a compile error in the test instead of a
 *     silent runtime failure.
 *
 * Keep the type signatures here in lockstep with the script's exports.
 */
// The .mjs is plain JS with no .d.ts; we cast its exports to a typed
// shape below. Node/vitest resolve the import at runtime; tsserver
// treats the namespace import as `any` (acceptable — narrowed by cast).
import * as raw from "../../scripts/autofix-required-translation-keys.mjs";

export type CategorisedPath =
  | { bucket: "top"; key: string }
  | { bucket: "variant"; key: string }
  | { bucket: "timeLine"; key: string }
  | { bucket: "ignored"; reason: string };

export interface KeyDiff {
  added: string[];
  removed: string[];
}

interface AutofixScannerExports {
  collectDotMemberReads: (source: string, alias: string) => Set<string>;
  collectBracketLiteralReads: (source: string, alias: string) => Set<string>;
  collectIndexedMapReads: (source: string, mapName: string) => Set<string>;
  collectTranslatorCallKeys: (
    source: string,
    helperNames: ReadonlyArray<string>,
  ) => Set<string>;
  collectOptionalVariantReads: (source: string) => Set<string>;
  categoriseHelperPath: (
    path: string,
    scope: "translations" | "timeLine",
  ) => CategorisedPath;
  parseCurrentTranslationKeys: (source: string) => {
    top: string[];
    variant: string[];
    variantOptional: string[];
  };
  parseCurrentTimeLineKeys: (source: string) => string[];
  diffKeys: (
    current: ReadonlyArray<string>,
    next: ReadonlyArray<string>,
  ) => KeyDiff;
}

const typed = raw as unknown as AutofixScannerExports;

export const {
  collectDotMemberReads,
  collectBracketLiteralReads,
  collectIndexedMapReads,
  collectTranslatorCallKeys,
  collectOptionalVariantReads,
  categoriseHelperPath,
  parseCurrentTranslationKeys,
  parseCurrentTimeLineKeys,
  diffKeys,
} = typed;
