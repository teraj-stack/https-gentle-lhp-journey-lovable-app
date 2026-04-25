/**
 * Unit tests for the GitHub Actions annotation emitter.
 *
 * What we cover here
 * ------------------
 * - Path normalization (`stripTopPrefix`).
 * - Best-effort line resolution against the REAL source files
 *   (lastChangeTooltipContent.ts / lastChangeTooltipModel.ts) so that if
 *   either file changes shape (e.g. someone reformats the locale block) we
 *   notice immediately.
 * - The emitter is silent outside CI and writes correctly-escaped
 *   `::error` workflow commands when GITHUB_ACTIONS=true.
 *
 * Why test against real source files?
 * -----------------------------------
 * The whole point of the annotation system is to point at REAL keys in
 * REAL source files. Mocking the file system would invalidate the most
 * important guarantee — that the line resolver still works after
 * reformatting / new locales / new keys.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  emitGithubAnnotations,
  classifyReasonSeverity,
  __findKeyLineForTesting,
  __stripTopPrefixForTesting,
  __getSourceLineSnippetForTesting,
  __buildExpectedLineHintForTesting,
  __resetAnnotationDedupForTesting,
} from "./i18nGithubAnnotations";

const ROOT = process.cwd();

describe("i18nGithubAnnotations — stripTopPrefix", () => {
  it("strips TRANSLATIONS prefix", () => {
    expect(__stripTopPrefixForTesting("TRANSLATIONS.local.heading")).toBe("local.heading");
    expect(__stripTopPrefixForTesting("TRANSLATIONS.sourcePrefix")).toBe("sourcePrefix");
  });
  it("strips TIME_LINE prefix", () => {
    expect(__stripTopPrefixForTesting("TIME_LINE.timePrefix")).toBe("timePrefix");
  });
  it("returns empty when whole locale block referenced", () => {
    expect(__stripTopPrefixForTesting("TRANSLATIONS")).toBe("");
    expect(__stripTopPrefixForTesting("TIME_LINE")).toBe("");
  });
});

describe("i18nGithubAnnotations — findKeyLine resolves real keys in source", () => {
  const contentLines = readFileSync(
    resolve(ROOT, "src/lib/lastChangeTooltipContent.ts"),
    "utf8",
  ).split("\n");
  const modelLines = readFileSync(
    resolve(ROOT, "src/lib/lastChangeTooltipModel.ts"),
    "utf8",
  ).split("\n");

  it("locates a top-level key inside a locale block (TRANSLATIONS.pl.sourcePrefix-equivalent)", () => {
    // sourcePrefix is a top-level key on each locale entry — search via
    // dotted form just `sourcePrefix`.
    const line = __findKeyLineForTesting(contentLines, "pl", "sourcePrefix");
    expect(line).not.toBeNull();
    expect(line).toBeGreaterThan(0);
    // Sanity: the resolved line should mention sourcePrefix.
    expect(contentLines[line! - 1]).toContain("sourcePrefix");
  });

  it("locates a nested variant key (local.heading) in TRANSLATIONS", () => {
    const line = __findKeyLineForTesting(contentLines, "en", "local.heading");
    expect(line).not.toBeNull();
    expect(contentLines[line! - 1]).toContain("heading");
  });

  it("locates a TIME_LINE key (timePrefix) in the model file", () => {
    const line = __findKeyLineForTesting(modelLines, "de", "timePrefix");
    expect(line).not.toBeNull();
    expect(modelLines[line! - 1]).toContain("timePrefix");
  });

  it("returns null for a key that does not exist", () => {
    expect(__findKeyLineForTesting(contentLines, "pl", "definitelyNotARealKey")).toBeNull();
  });

  it("returns null for an unsupported locale", () => {
    expect(__findKeyLineForTesting(contentLines, "fr", "sourcePrefix")).toBeNull();
  });
});

describe("i18nGithubAnnotations — emitGithubAnnotations", () => {
  const originalEnv = process.env.GITHUB_ACTIONS;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    if (originalEnv === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = originalEnv;
  });

  it("is a no-op when GITHUB_ACTIONS is unset", () => {
    delete process.env.GITHUB_ACTIONS;
    emitGithubAnnotations(
      [{ locale: "pl", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" }],
      "test group",
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("is a no-op when violations array is empty (even in CI)", () => {
    process.env.GITHUB_ACTIONS = "true";
    emitGithubAnnotations([], "test group");
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("emits one ::error workflow command per violation when in CI", () => {
    process.env.GITHUB_ACTIONS = "true";
    emitGithubAnnotations(
      [
        {
          locale: "pl",
          path: "TRANSLATIONS.local.heading",
          reason: "missing-required-key",
          detail: "value=undefined",
        },
        {
          locale: "en",
          path: "TIME_LINE.timePrefix",
          reason: "empty-required-value",
        },
      ],
      "i18n required keys",
    );
    expect(logSpy).toHaveBeenCalledTimes(2);
    const calls = logSpy.mock.calls.map((c) => String(c[0]));
    // Each line must start with ::error and include file=.
    for (const line of calls) {
      expect(line.startsWith("::error ")).toBe(true);
      expect(line).toMatch(/file=src\/lib\/(lastChangeTooltipContent|lastChangeTooltipModel)\.ts/);
      expect(line).toMatch(/title=/);
    }
    // Routing: TRANSLATIONS.* → content file; TIME_LINE.* → model file.
    expect(calls[0]).toContain("lastChangeTooltipContent.ts");
    expect(calls[1]).toContain("lastChangeTooltipModel.ts");
  });

  it("escapes special characters (%, newline) in the message body", () => {
    process.env.GITHUB_ACTIONS = "true";
    emitGithubAnnotations(
      [
        {
          locale: "pl",
          path: "TRANSLATIONS.local.heading",
          reason: "empty-required-value",
          detail: "got=\"line1\nline2\" 100% bad",
        },
      ],
      "test",
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = String(logSpy.mock.calls[0][0]);
    // % must be escaped as %25 BEFORE other escapes (else %0A becomes %2525..)
    expect(line).toContain("%0A"); // newline encoded
    expect(line).toContain("100%25 bad"); // % encoded, "bad" still readable
    // Title must NOT contain raw colons (those would break the `::cmd::data`
    // boundary and split the annotation). Extract just the title property
    // value (between `title=` and the next `,` or `::` boundary).
    const titleMatch = line.match(/title=([^,:]+)(?:,|::)/);
    expect(titleMatch).not.toBeNull();
    expect(titleMatch![1]).not.toContain(":");
  });
});

describe("i18nGithubAnnotations — line snippet enrichment", () => {
  const CONTENT_PATH = resolve(process.cwd(), "src/lib/lastChangeTooltipContent.ts");
  const contentLines = readFileSync(CONTENT_PATH, "utf8").split("\n");

  it("returns the trimmed source line + 1-based line number for a present key", () => {
    const got = __getSourceLineSnippetForTesting(contentLines, "pl", "local.heading");
    expect(got).not.toBeNull();
    expect(got!.snippet).toMatch(/^heading:/);
    expect(got!.lineNumber).toBeGreaterThan(0);
    expect(contentLines[got!.lineNumber - 1].trim()).toBe(got!.snippet);
  });

  it("returns null for an absent key", () => {
    expect(
      __getSourceLineSnippetForTesting(contentLines, "pl", "local.thisDoesNotExist"),
    ).toBeNull();
  });

  it("buildExpectedLineHint surfaces the reference-locale (pl) line for a missing key", () => {
    const hint = __buildExpectedLineHintForTesting(contentLines, "local.heading");
    expect(hint).toContain("expected (from `pl`):");
    expect(hint).toContain("heading:");
  });

  it("buildExpectedLineHint falls back to a TODO template when reference locale also lacks the key", () => {
    const hint = __buildExpectedLineHintForTesting(contentLines, "local.brandNewKey");
    expect(hint).toContain('"brandNewKey": "<TODO: translate>"');
  });
});

describe("i18nGithubAnnotations — line hint embedded in CI annotations", () => {
  const originalEnv = process.env.GITHUB_ACTIONS;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.GITHUB_ACTIONS = "true";
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    if (originalEnv === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = originalEnv;
  });

  it("includes `current: <line>` for a key that EXISTS in the failing locale (e.g. empty value)", () => {
    // PL.local.heading is a present key — even though the test reason is
    // synthetic, the emitter's job is to surface the actual on-disk line.
    emitGithubAnnotations(
      [
        {
          locale: "pl",
          path: "TRANSLATIONS.local.heading",
          reason: "empty-required-value",
          detail: "value=\"\"",
        },
      ],
      "i18n required keys",
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
    const out = String(logSpy.mock.calls[0][0]);
    // The "current: <line>" hint must appear verbatim in the data section
    // (`:` is NOT in the percent-encoded set for data values, only for the
    // property segment that holds title/file).
    expect(out).toContain("current: heading:");
  });

  it("includes `expected (from \\`pl\\`): <line>` for a key MISSING in the failing locale", () => {
    // Use a genuinely-likely-missing locale variation: the de/it locales
    // may lack `ariaHeadingOverride` (it's an OPTIONAL key). For a pure
    // unit test we simulate "missing" by picking a locale that doesn't
    // declare it — `en` actually does declare it, so we fabricate a
    // missing scenario by querying for a key that PL has but the test
    // pretends some other locale lacks. The annotation only consults the
    // FAILING locale's lines via findKeyLine; if not found, it falls back
    // to PL's reference line. We trigger that path with a non-existent
    // locale name:
    emitGithubAnnotations(
      [
        {
          locale: "xx", // bogus locale → no match → fall back to PL ref line
          path: "TRANSLATIONS.local.heading",
          reason: "missing-required-key",
        },
      ],
      "i18n required keys",
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
    const out = String(logSpy.mock.calls[0][0]);
    // Hint shape: `expected (from \`pl\`): heading: "..."`
    expect(out).toContain("expected (from `pl`):");
    expect(out).toContain("heading:");
  });

  it("falls back to a TODO template when PL also lacks the key", () => {
    emitGithubAnnotations(
      [
        {
          locale: "xx",
          path: "TRANSLATIONS.local.notInAnyLocale",
          reason: "missing-required-key",
        },
      ],
      "test",
    );
    const out = String(logSpy.mock.calls[0][0]);
    expect(out).toContain("notInAnyLocale");
    expect(out).toContain("TODO");
  });
});

describe("i18nGithubAnnotations — severity classification", () => {
  it("classifies empty-optional-value as warning", () => {
    expect(classifyReasonSeverity("empty-optional-value")).toBe("warning");
  });

  it("classifies all other known reasons as error (build-failing)", () => {
    for (const reason of [
      "missing-required-key",
      "empty-required-value",
      "wrong-type",
      "undeclared-key",
      "placeholder-mismatch",
      "value-missing-in-aria",
      "duplicate-across-variants",
      "completely-novel-reason",
    ]) {
      expect(classifyReasonSeverity(reason)).toBe("error");
    }
  });
});

describe("i18nGithubAnnotations — severity emission in CI", () => {
  const originalEnv = process.env.GITHUB_ACTIONS;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.GITHUB_ACTIONS = "true";
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    if (originalEnv === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = originalEnv;
  });

  it("emits ::warning (not ::error) for empty-optional-value", () => {
    emitGithubAnnotations(
      [
        {
          locale: "en",
          path: "TRANSLATIONS.local.heading",
          reason: "empty-optional-value",
        },
      ],
      "i18n required keys",
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
    const out = String(logSpy.mock.calls[0][0]);
    expect(out.startsWith("::warning ")).toBe(true);
    expect(out.startsWith("::error ")).toBe(false);
    // Title and message must surface the severity for human reviewers.
    expect(out).toContain("[warning]");
    expect(out).toContain("severity=warning");
  });

  it("emits ::error for required-key violations", () => {
    emitGithubAnnotations(
      [
        {
          locale: "en",
          path: "TRANSLATIONS.local.heading",
          reason: "missing-required-key",
        },
      ],
      "i18n required keys",
    );
    const out = String(logSpy.mock.calls[0][0]);
    expect(out.startsWith("::error ")).toBe(true);
    expect(out).toContain("[error]");
    expect(out).toContain("severity=error");
  });

  it("respects an explicit per-violation severity override (escalate to error)", () => {
    emitGithubAnnotations(
      [
        {
          locale: "en",
          path: "TRANSLATIONS.local.heading",
          reason: "empty-optional-value", // would default to warning
          severity: "error", // explicit escalation
        },
      ],
      "i18n required keys",
    );
    const out = String(logSpy.mock.calls[0][0]);
    expect(out.startsWith("::error ")).toBe(true);
    expect(out).toContain("severity=error");
  });

  it("respects an explicit per-violation severity override (de-escalate to warning)", () => {
    emitGithubAnnotations(
      [
        {
          locale: "en",
          path: "TRANSLATIONS.local.heading",
          reason: "missing-required-key", // would default to error
          severity: "warning", // explicit de-escalation
        },
      ],
      "i18n required keys",
    );
    const out = String(logSpy.mock.calls[0][0]);
    expect(out.startsWith("::warning ")).toBe(true);
  });

  it("emits mixed batch — one ::error and one ::warning — in the same run", () => {
    emitGithubAnnotations(
      [
        { locale: "pl", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" },
        { locale: "en", path: "TRANSLATIONS.local.heading", reason: "empty-optional-value" },
      ],
      "i18n required keys",
    );
    expect(logSpy).toHaveBeenCalledTimes(2);
    const lines = logSpy.mock.calls.map((c) => String(c[0]));
    expect(lines[0].startsWith("::error ")).toBe(true);
    expect(lines[1].startsWith("::warning ")).toBe(true);
  });
});
