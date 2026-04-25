/**
 * Unit tests for the active-locales resolver.
 *
 * Covers the precedence chain (env list > test-mode flag > full set), the
 * defensive fallbacks (malformed list does NOT silently validate nothing),
 * and the canonical-ordering guarantee (snapshots stay stable regardless
 * of how the env var is written).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "./lastChangeTooltipContent";
import {
  DEFAULT_ACTIVE_LOCALES,
  ENV_ACTIVE_LIST,
  ENV_TEST_MODE,
  TEST_MODE_ACTIVE,
  getActiveLocalesForTests,
  getInactiveLocales,
  isActiveLocalesMode,
} from "./i18nActiveLocales";

describe("i18nActiveLocales — getActiveLocalesForTests", () => {
  // Snapshot env vars so we can restore exact state between cases — vi.stubEnv
  // would also work, but `process.env` mutation is what the production code
  // reads, so we mirror that exactly.
  const snapshot: Record<string, string | undefined> = {};
  beforeEach(() => {
    snapshot[ENV_ACTIVE_LIST] = process.env[ENV_ACTIVE_LIST];
    snapshot[ENV_TEST_MODE] = process.env[ENV_TEST_MODE];
    delete process.env[ENV_ACTIVE_LIST];
    delete process.env[ENV_TEST_MODE];
  });
  afterEach(() => {
    for (const k of Object.keys(snapshot)) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it("defaults to SUPPORTED_LOCALES when no env vars are set", () => {
    expect(getActiveLocalesForTests()).toEqual(SUPPORTED_LOCALES);
    expect(isActiveLocalesMode()).toBe(false);
  });

  it("uses DEFAULT_ACTIVE_LOCALES when I18N_TEST_MODE=active", () => {
    process.env[ENV_TEST_MODE] = TEST_MODE_ACTIVE;
    expect(getActiveLocalesForTests()).toEqual(DEFAULT_ACTIVE_LOCALES);
    expect(isActiveLocalesMode()).toBe(true);
  });

  it("explicit list wins over test-mode flag", () => {
    process.env[ENV_TEST_MODE] = TEST_MODE_ACTIVE;
    process.env[ENV_ACTIVE_LIST] = "pl";
    expect(getActiveLocalesForTests()).toEqual(["pl"]);
  });

  it("parses comma-separated list and drops unknown tokens", () => {
    process.env[ENV_ACTIVE_LIST] = "pl,fr,en,xx";
    // fr/xx are not in SUPPORTED_LOCALES — silently dropped; pl & en kept.
    expect(getActiveLocalesForTests()).toEqual(["pl", "en"]);
  });

  it("re-orders to canonical SUPPORTED_LOCALES order regardless of input", () => {
    process.env[ENV_ACTIVE_LIST] = "it, de, en, pl";
    expect(getActiveLocalesForTests()).toEqual(SUPPORTED_LOCALES);
  });

  it("de-duplicates repeated locales", () => {
    process.env[ENV_ACTIVE_LIST] = "pl,pl,EN,en,Pl";
    expect(getActiveLocalesForTests()).toEqual(["pl", "en"]);
  });

  it("falls back when list parses to empty (does NOT validate nothing)", () => {
    // Malformed list with only unknown locales would otherwise silently
    // make every contract test pass — the fallback prevents that.
    process.env[ENV_ACTIVE_LIST] = "fr,xx,zz";
    expect(getActiveLocalesForTests()).toEqual(SUPPORTED_LOCALES);
  });

  it("falls back from empty list to test-mode flag when both set", () => {
    process.env[ENV_ACTIVE_LIST] = "   ";
    process.env[ENV_TEST_MODE] = TEST_MODE_ACTIVE;
    expect(getActiveLocalesForTests()).toEqual(DEFAULT_ACTIVE_LOCALES);
  });

  it("ignores unrecognised I18N_TEST_MODE values", () => {
    process.env[ENV_TEST_MODE] = "yolo";
    expect(getActiveLocalesForTests()).toEqual(SUPPORTED_LOCALES);
  });
});

describe("i18nActiveLocales — getInactiveLocales", () => {
  const prevList = process.env[ENV_ACTIVE_LIST];
  const prevMode = process.env[ENV_TEST_MODE];
  beforeEach(() => {
    delete process.env[ENV_ACTIVE_LIST];
    delete process.env[ENV_TEST_MODE];
  });
  afterEach(() => {
    if (prevList === undefined) delete process.env[ENV_ACTIVE_LIST];
    else process.env[ENV_ACTIVE_LIST] = prevList;
    if (prevMode === undefined) delete process.env[ENV_TEST_MODE];
    else process.env[ENV_TEST_MODE] = prevMode;
  });

  it("returns empty set in full-strict mode", () => {
    expect(getInactiveLocales()).toEqual([]);
  });

  it("returns the SUPPORTED \\ ACTIVE difference in active mode", () => {
    process.env[ENV_TEST_MODE] = TEST_MODE_ACTIVE;
    // DEFAULT_ACTIVE_LOCALES = ["pl","en"] → inactive = ["de","it"]
    expect(getInactiveLocales()).toEqual(["de", "it"]);
  });
});
