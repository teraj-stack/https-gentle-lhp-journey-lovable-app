/**
 * Ambient module declaration for the autofix scanner script.
 *
 * The script is plain JavaScript (`.mjs`) so it stays runnable directly
 * via `node scripts/autofix-required-translation-keys.mjs` with no build
 * step. The unit test in `autofixScanner.test.ts` imports its detector
 * helpers and needs a TypeScript view of their signatures.
 *
 * This file lives under `src/` so it is picked up by `tsconfig.app.json`
 * (which only includes the `src` directory). Keep its declarations in
 * lockstep with the script's `export` list — if you add a new detector,
 * add the matching signature here as well.
 */

declare module "../scripts/autofix-required-translation-keys.mjs" {
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
}
