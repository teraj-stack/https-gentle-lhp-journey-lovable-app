/**
 * Unit tests for the autofix scanner's individual detectors.
 *
 * Why test the script (not just the autofix outcome)?
 * ---------------------------------------------------
 * The end-to-end CHECK in CI only confirms that "the scanner agrees with
 * the current builder code". It cannot tell us:
 *   - "the bracket-literal detector handles single quotes too"
 *   - "the translator-call detector ignores empty-string arguments"
 *   - "the categorizer correctly routes `local.heading` to the variant
 *     bucket but reports `local.foo.bar` as ignored"
 *
 * Those are exactly the cases that decide whether a future refactor (e.g.
 * "let's switch to a `$t()` helper") still produces a correct REQUIRED_*
 * list. Lock them in here so a regression in the scanner is caught
 * independently of the live source files.
 *
 * Strategy
 * --------
 * The autofix script is a Node ESM module — we import it directly and
 * exercise the pure helper functions on synthetic source snippets. No I/O,
 * no temp files. Each test focuses on ONE detector and asserts the exact
 * detected set so additions/regressions are visible in the diff.
 */
import { describe, expect, it } from "vitest";
import {
  collectDotMemberReads,
  collectBracketLiteralReads,
  collectIndexedMapReads,
  collectTranslatorCallKeys,
  collectOptionalVariantReads,
  categoriseHelperPath,
} from "./autofixScannerShim";

describe("autofix scanner — collectDotMemberReads", () => {
  it("captures simple <alias>.<key> reads", () => {
    const src = `const x = t.heading; const y = t.shortBadge;`;
    expect([...collectDotMemberReads(src, "t")].sort()).toEqual([
      "heading",
      "shortBadge",
    ]);
  });

  it("ignores chains where the alias is preceded by a dot", () => {
    const src = `obj.t.heading; foo.t.shortBadge;`;
    expect([...collectDotMemberReads(src, "t")]).toEqual([]);
  });

  it("ignores aliases embedded in longer identifiers", () => {
    const src = `notT.heading; tea.heading; tab.heading;`;
    expect([...collectDotMemberReads(src, "t")]).toEqual([]);
  });
});

describe("autofix scanner — collectBracketLiteralReads", () => {
  it("captures double, single, and template-literal bracket access", () => {
    const src = `t["heading"]; t['shortBadge']; t[\`description\`];`;
    expect([...collectBracketLiteralReads(src, "t")].sort()).toEqual([
      "description",
      "heading",
      "shortBadge",
    ]);
  });

  it("rejects template literals that contain interpolation", () => {
    const src = "t[`heading_${x}`]; t[`shortBadge`];";
    expect([...collectBracketLiteralReads(src, "t")]).toEqual(["shortBadge"]);
  });

  it("rejects non-identifier keys (whitespace, punctuation)", () => {
    const src = `t["foo bar"]; t["foo.bar"]; t["123"];`;
    expect([...collectBracketLiteralReads(src, "t")]).toEqual([]);
  });

  it("rejects variable subscripts (we only handle static literals)", () => {
    const src = `t[someKey]; t[k];`;
    expect([...collectBracketLiteralReads(src, "t")]).toEqual([]);
  });
});

describe("autofix scanner — collectIndexedMapReads", () => {
  it("captures dotted tail after a map subscript", () => {
    const src = `TRANSLATIONS[locale].sourcePrefix; TRANSLATIONS["pl"].local.heading;`;
    const got = [...collectIndexedMapReads(src, "TRANSLATIONS")].sort();
    expect(got).toEqual(["local.heading", "sourcePrefix"]);
  });

  it("captures bracket-literal tail segments", () => {
    const src = `TRANSLATIONS[locale]["sourcePrefix"]; TRANSLATIONS[loc]["local"]["heading"];`;
    const got = [...collectIndexedMapReads(src, "TRANSLATIONS")].sort();
    expect(got).toEqual(["local.heading", "sourcePrefix"]);
  });

  it("ignores bare subscript with no tail segment", () => {
    const src = `const variant = TRANSLATIONS[locale];`;
    expect([...collectIndexedMapReads(src, "TRANSLATIONS")]).toEqual([]);
  });

  it("scopes correctly to the requested map name", () => {
    const src = `TRANSLATIONS[loc].x; TIME_LINE_TRANSLATIONS[loc].y;`;
    expect([...collectIndexedMapReads(src, "TRANSLATIONS")]).toEqual(["x"]);
    expect([...collectIndexedMapReads(src, "TIME_LINE_TRANSLATIONS")]).toEqual(["y"]);
  });
});

describe("autofix scanner — collectTranslatorCallKeys", () => {
  it("captures $t and tr helper calls with literal args", () => {
    const src = `$t("heading"); tr('local.heading'); $t(\`sourcePrefix\`);`;
    const got = [...collectTranslatorCallKeys(src, ["$t", "tr"])].sort();
    expect(got).toEqual(["heading", "local.heading", "sourcePrefix"]);
  });

  it("ignores helpers not in the allow-list", () => {
    const src = `t("heading"); foo("heading");`;
    expect([...collectTranslatorCallKeys(src, ["$t", "tr"])]).toEqual([]);
  });

  it("rejects empty / whitespace / multi-word arguments", () => {
    const src = `$t(""); $t("   "); $t("two words"); $t(".leadingDot"); $t("trailing.");`;
    expect([...collectTranslatorCallKeys(src, ["$t"])]).toEqual([]);
  });

  it("rejects non-identifier path segments", () => {
    const src = `$t("foo-bar"); $t("123"); $t("foo.123");`;
    expect([...collectTranslatorCallKeys(src, ["$t"])]).toEqual([]);
  });

  it("returns empty when helperNames list is empty (defensive)", () => {
    expect([...collectTranslatorCallKeys(`$t("x")`, [])]).toEqual([]);
  });
});

describe("autofix scanner — collectOptionalVariantReads", () => {
  it("captures dot, bracket and helper-call forms with ?? fallback", () => {
    const src = `
      variant.ariaHeadingOverride ?? variant.heading;
      variant["ariaHeadingOverride"] ?? "x";
      $t("local.ariaHeadingOverride") ?? "y";
    `;
    expect([...collectOptionalVariantReads(src)].sort()).toEqual([
      "ariaHeadingOverride",
    ]);
  });

  it("does not flag reads without ?? as optional", () => {
    const src = `variant.heading; variant["shortBadge"];`;
    expect([...collectOptionalVariantReads(src)]).toEqual([]);
  });
});

describe("autofix scanner — categoriseHelperPath", () => {
  it("routes single-segment paths to top in translations scope", () => {
    expect(categoriseHelperPath("sourcePrefix", "translations")).toEqual({
      bucket: "top",
      key: "sourcePrefix",
    });
  });

  it("routes <local|remote>.<x> to variant", () => {
    expect(categoriseHelperPath("local.heading", "translations")).toEqual({
      bucket: "variant",
      key: "heading",
    });
    expect(categoriseHelperPath("remote.shortBadge", "translations")).toEqual({
      bucket: "variant",
      key: "shortBadge",
    });
  });

  it("rejects deeper or unrecognised translation paths", () => {
    const r = categoriseHelperPath("local.foo.bar", "translations");
    expect(r.bucket).toBe("ignored");
    if (r.bucket !== "ignored") throw new Error("narrowing failed");
    expect(r.reason).toMatch(/unrecognised/);
  });

  it("routes single-segment paths to timeLine in timeLine scope", () => {
    expect(categoriseHelperPath("timePrefix", "timeLine")).toEqual({
      bucket: "timeLine",
      key: "timePrefix",
    });
  });

  it("rejects multi-segment paths in timeLine scope", () => {
    const r = categoriseHelperPath("foo.bar", "timeLine");
    expect(r.bucket).toBe("ignored");
  });
});
