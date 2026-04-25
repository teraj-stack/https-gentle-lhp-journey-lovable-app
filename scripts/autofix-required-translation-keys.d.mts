/**
 * Ambient type declarations for the autofix scanner script.
 *
 * The script itself is plain JS (.mjs) so it can be invoked from `npm` /
 * the shell without a build step, but the unit test in
 * `src/lib/autofixScanner.test.ts` imports its detector functions to
 * exercise them on synthetic source snippets. This file gives TypeScript
 * the shape it needs to resolve the import — the runtime behaviour is
 * defined in the .mjs (single source of truth).
 *
 * Keep this file in lockstep with the script's `export` list. If you add
 * a new detector, add its signature here too.
 */

/**
 * Result of categorising a translator-call dotted path. `bucket: "ignored"`
 * carries a `reason` string for diagnostic logging; the other buckets
 * always carry a `key`.
 */
export type CategorisedPath =
  | { bucket: "top"; key: string }
  | { bucket: "variant"; key: string }
  | { bucket: "timeLine"; key: string }
  | { bucket: "ignored"; reason: string };

export const collectDotMemberReads: (source: string, alias: string) => Set<string>;
export const collectBracketLiteralReads: (source: string, alias: string) => Set<string>;
export const collectIndexedMapReads: (source: string, mapName: string) => Set<string>;
export const collectTranslatorCallKeys: (
  source: string,
  helperNames: ReadonlyArray<string>,
) => Set<string>;
export const collectOptionalVariantReads: (source: string) => Set<string>;
export const categoriseHelperPath: (
  path: string,
  scope: "translations" | "timeLine",
) => CategorisedPath;
