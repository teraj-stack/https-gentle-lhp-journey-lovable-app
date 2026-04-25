---
name: i18n validator actual module exports
description: Real exports the i18n contract tests import — REQUIRED_TRANSLATION_KEYS is bucketed object (top/variant/variantOptional), locale data via __getRawTranslationsForTesting/__getRawTimeLineTranslationsForTesting, active locales env-driven via getActiveLocalesForTests
type: feature
---

The README's earlier "TRANSLATIONS = { pl: {...}, en: {...} } / REQUIRED_TRANSLATION_KEYS = string[]" snippets are pedagogical simplifications — the production code differs.

## Real exports

**`src/lib/lastChangeTooltipContent.ts`**:
- `Locale` type: `"pl" | "en" | "de" | "it"`
- `SUPPORTED_LOCALES`: `readonly Locale[]` = `["pl", "en", "de", "it"]`
- `TranslationEntry` interface (nested `local.*` / `remote.*` variants + `sourcePrefix`)
- `REQUIRED_TRANSLATION_KEYS`: **bucketed object** `{ top: readonly string[], variant: readonly string[], variantOptional: readonly string[] }` (NOT a flat array)
- `__getRawTranslationsForTesting()`: `() => Record<Locale, TranslationEntry>` — test-only API to bypass the runtime fallback chain

**`src/lib/lastChangeTooltipModel.ts`**:
- `TimeLineStrings` interface (`relative.*`, `qualifier.*`, `timePrefix`)
- `REQUIRED_TIME_LINE_KEYS`: flat `readonly string[]` (this one IS flat — different shape from REQUIRED_TRANSLATION_KEYS)
- `__getRawTimeLineTranslationsForTesting()`: `() => Record<Locale, TimeLineStrings>`

**`src/lib/i18nActiveLocales.ts`** (test-scope narrowing):
- `getActiveLocalesForTests()`: env-driven (`I18N_ACTIVE_LOCALES=pl,en,de,it`) → falls back to `DEFAULT_ACTIVE_LOCALES = ["pl", "en"]` → falls back to `SUPPORTED_LOCALES`
- Implication: fixtures targeting `de`/`it` MUST set `I18N_ACTIVE_LOCALES=pl,en,de,it` or they're silently skipped

**`src/lib/i18nGithubAnnotations.ts`** (the validator):
- `SOURCE_FILES = { TRANSLATIONS: "src/lib/lastChangeTooltipContent.ts", TIME_LINE: "src/lib/lastChangeTooltipModel.ts" }`
- `REFERENCE_LOCALE = "pl"` (single constant)
- `MAX_SNIPPET_LEN = 200` (char cap on multi-line value snippets)
- `WARNING_REASONS` set (currently only `empty-optional-value` → `::warning`, everything else → `::error`)

## Bucket semantics for REQUIRED_TRANSLATION_KEYS

- `.top` — top-level keys (e.g. `sourcePrefix`). Missing → `missing-required-key`
- `.variant` — keys inside `local.*` AND `remote.*` (must exist in BOTH variants for every locale). Missing → `missing-required-key`
- `.variantOptional` — may be empty `""` in non-reference locales (yields `empty-optional-value` warning). Absent entirely → still `missing-required-key`

## README documentation

Section "Actual module exports (ground truth)" inside "Locale module structure & placeholder conventions" — includes per-file export tables and a "Path-to-failure-reason cheat-sheet" mapping each `reason` code to the file + export to mutate.

## Important caveat for fixture work

When writing fixtures or new tests, import from the real exports above — NOT from a fictional `TRANSLATIONS` symbol. The simplified snippets in the README's "Canonical TS contract" / "Reproducible source fixtures" subsections are conceptual; the real source uses `__getRaw…ForTesting()` returning a Record keyed by `Locale`.
