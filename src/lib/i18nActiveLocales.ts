/**
 * Active-locales configuration for i18n contract tests.
 *
 * Why this exists
 * ---------------
 * `SUPPORTED_LOCALES` lists every locale the helper *can* render. But during
 * a rollout (e.g. `de` translations are stubbed in but the German market
 * isn't live yet), we want CI to:
 *   - keep validating the locales currently shipped to users (PL/EN), and
 *   - NOT block merges on incomplete in-progress locales (DE/IT).
 *
 * Hard-deleting a locale from `SUPPORTED_LOCALES` would also work but it's
 * destructive — the wording, snapshots and runtime resolver would all
 * regress. This module gives us a non-destructive **active set**: the
 * runtime keeps treating all SUPPORTED_LOCALES as valid, but contract
 * tests can opt into validating only the active subset.
 *
 * How active locales are resolved (precedence, highest first)
 * -----------------------------------------------------------
 *  1. Env var `I18N_ACTIVE_LOCALES` — comma-separated list, e.g.
 *     `I18N_ACTIVE_LOCALES=pl,en npm test`. Wins over everything so CI
 *     matrices and developer overrides are explicit.
 *  2. Env var `I18N_TEST_MODE=active` — opt into the configured default
 *     active set (DEFAULT_ACTIVE_LOCALES) without listing locales inline.
 *     This is the convenient "just validate what we ship" mode.
 *  3. Otherwise — return `SUPPORTED_LOCALES` (full strict mode, the
 *     historical behaviour). This keeps every existing test passing
 *     unchanged when no env vars are set.
 *
 * Test mode is OPT-IN
 * -------------------
 * The default behaviour stays: validate ALL supported locales. Tests that
 * want the new behaviour call `getActiveLocalesForTests()` instead of
 * iterating `SUPPORTED_LOCALES` directly. That makes the migration safe
 * (one test at a time) and preserves the strong "everything is checked"
 * default for local developer runs.
 *
 * Determinism
 * -----------
 * The resolver is pure (only reads env at call time) and returns locales
 * in the order they appear in `SUPPORTED_LOCALES`, regardless of the
 * order they were specified in the env var — so snapshots and reports
 * stay stable regardless of how the env list is written.
 */
import {
  SUPPORTED_LOCALES,
  type Locale,
} from "./lastChangeTooltipContent";

/**
 * Locales we currently SHIP to users. Update this list when launching a
 * new market. The set is intentionally a subset of `SUPPORTED_LOCALES`
 * (or equal to it) — never a superset, since a locale that isn't
 * `SUPPORTED_LOCALES` has no translations to validate against.
 *
 * Today: PL is the operational language of the clinic, EN is the only
 * other shipped UI locale. DE and IT exist as scaffolding for future
 * markets but are not yet user-visible.
 */
export const DEFAULT_ACTIVE_LOCALES: readonly Locale[] = ["pl", "en"] as const;

/** Env-var names — exported so tests can mutate them via `vi.stubEnv`. */
export const ENV_ACTIVE_LIST = "I18N_ACTIVE_LOCALES";
export const ENV_TEST_MODE = "I18N_TEST_MODE";
/** Marker value for `I18N_TEST_MODE` that selects DEFAULT_ACTIVE_LOCALES. */
export const TEST_MODE_ACTIVE = "active";

/**
 * Parse a comma/whitespace-separated locale list, dropping unknown/empty
 * entries and de-duplicating. Returns null when the input would resolve
 * to an empty set so callers can fall back rather than silently testing
 * nothing (which would render the whole gate useless).
 */
const parseLocaleList = (raw: string): readonly Locale[] | null => {
  const allowed = new Set<Locale>(SUPPORTED_LOCALES);
  const seen = new Set<Locale>();
  for (const tokenRaw of raw.split(/[,\s]+/)) {
    const token = tokenRaw.trim().toLowerCase();
    if (!token) continue;
    if (allowed.has(token as Locale)) seen.add(token as Locale);
  }
  if (seen.size === 0) return null;
  // Preserve canonical SUPPORTED_LOCALES ordering for snapshot stability.
  return SUPPORTED_LOCALES.filter((l) => seen.has(l));
};

/**
 * Which locales should the current test run validate?
 *
 * See module doc for precedence rules. Pure read of `process.env` at call
 * time — never cached — so tests that flip env vars between cases get
 * fresh results without module-reload gymnastics.
 */
export const getActiveLocalesForTests = (): readonly Locale[] => {
  const list = process.env[ENV_ACTIVE_LIST];
  if (list && list.trim().length > 0) {
    const parsed = parseLocaleList(list);
    if (parsed) return parsed;
    // Malformed/empty list → fall through to mode/default rather than
    // silently validating nothing.
  }
  if (process.env[ENV_TEST_MODE] === TEST_MODE_ACTIVE) {
    return DEFAULT_ACTIVE_LOCALES;
  }
  return SUPPORTED_LOCALES;
};

/**
 * True when the current test run is operating on a STRICT subset of
 * `SUPPORTED_LOCALES`. Useful for tests that want to log a one-line
 * notice ("active-locales mode: pl, en") so a CI failure is not
 * misread as "all locales validated".
 */
export const isActiveLocalesMode = (): boolean => {
  const active = getActiveLocalesForTests();
  return active.length !== SUPPORTED_LOCALES.length;
};

/**
 * Locales that are SUPPORTED but currently INACTIVE. Tests can use this
 * to skip-with-notice rather than silently drop the row, preserving
 * visibility into what's been deferred.
 */
export const getInactiveLocales = (): readonly Locale[] => {
  const active = new Set(getActiveLocalesForTests());
  return SUPPORTED_LOCALES.filter((l) => !active.has(l));
};
