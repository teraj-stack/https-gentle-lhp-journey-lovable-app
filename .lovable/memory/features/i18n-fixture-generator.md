---
name: i18n fixture generator
description: scripts/generate-fixture-snippets.mjs regenerates README "Reproducible source fixtures" block from real validator inputs (SUPPORTED_LOCALES, REQUIRED_TRANSLATION_KEYS, REQUIRED_TIME_LINE_KEYS); CI guard via npm run i18n:fixtures:check
type: feature
---

`scripts/generate-fixture-snippets.mjs` reads the validator's REAL exports and rewrites the sentinel-bounded fixture block in README.md so the documented failure cases never drift from the live implementation.

**Sentinels** (in README.md): `<!-- BEGIN: AUTO-GENERATED FIXTURE SNIPPETS -->` … `<!-- END: AUTO-GENERATED FIXTURE SNIPPETS -->`. Hand-edits inside are overwritten on next run.

**Inputs read** (with lightweight TS→JSON normaliser handling `as const`, `satisfies <Type>`, bare-identifier keys, single-quoted strings, line comments):
- `SUPPORTED_LOCALES` from `src/lib/lastChangeTooltipContent.ts` → derives reference (`pl`), errorLocale (`en`), warningLocale (last non-pl)
- `REQUIRED_TRANSLATION_KEYS.variant[0]` → `sampleVariantKey`; `[1]` → `companionVariantKey` (guaranteed ≠ sample to avoid duplicate-key bug)
- Picks `noiseKey` from `["__demo_undeclared", "subheading", "tagline", "kicker"]` — first one NOT in any REQUIRED bucket → undeclared-key fixture is provably valid
- `REQUIRED_TIME_LINE_KEYS[0]` from `lastChangeTooltipModel.ts` → `sampleTimeLineKey`
- `SOURCE_FILES` map hardcoded (matches `pickSourceFile` in `i18nGithubAnnotations.ts`)

**Modes**: `node scripts/generate-fixture-snippets.mjs` (rewrite), `--check` (CI guard, exit 1 + first 5 diff lines on drift).

**npm scripts**: `i18n:fixtures` (generate), `i18n:fixtures:check` (CI guard).

**Failure modes**: throws loudly if any required export disappears (`Could not find export …`), if `pl` isn't in `SUPPORTED_LOCALES`, or if `REQUIRED_TRANSLATION_KEYS.variant`/`REQUIRED_TIME_LINE_KEYS` are empty — surfaces template assumption breakage instead of producing half-stale README.

**Caveat**: relies on prettier-formatted source (top-level `;\n` terminator regex). If the validator inputs ever switch to non-standard formatting, extend `readExport`.
