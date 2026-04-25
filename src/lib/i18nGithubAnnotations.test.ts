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
  __isMultiLineValueOpenerForTesting,
  __assembleMultiLineSnippetForTesting,
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
    __resetAnnotationDedupForTesting();
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
    __resetAnnotationDedupForTesting();
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
    __resetAnnotationDedupForTesting();
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

describe("i18nGithubAnnotations — dedup of identical violations", () => {
  const originalEnv = process.env.GITHUB_ACTIONS;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetAnnotationDedupForTesting();
    process.env.GITHUB_ACTIONS = "true";
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    if (originalEnv === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = originalEnv;
  });

  it("collapses identical (locale, path, reason) entries within a single call", () => {
    emitGithubAnnotations(
      [
        { locale: "pl", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" },
        { locale: "pl", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" },
        { locale: "pl", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" },
      ],
      "i18n required keys",
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps distinct entries when locale/path/reason differ", () => {
    emitGithubAnnotations(
      [
        { locale: "pl", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" },
        { locale: "en", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" }, // diff locale
        { locale: "pl", path: "TRANSLATIONS.local.subhead", reason: "missing-required-key" }, // diff path
        { locale: "pl", path: "TRANSLATIONS.local.heading", reason: "wrong-type" }, // diff reason
      ],
      "i18n required keys",
    );
    expect(logSpy).toHaveBeenCalledTimes(4);
  });

  it("treats differing `detail` strings as the SAME violation (first-wins)", () => {
    // Two test groups may flag the same key with slightly different detail
    // text — the underlying bug is identical so only one annotation surfaces.
    emitGithubAnnotations(
      [
        {
          locale: "pl",
          path: "TRANSLATIONS.local.heading",
          reason: "empty-required-value",
          detail: "value=\"\"",
        },
        {
          locale: "pl",
          path: "TRANSLATIONS.local.heading",
          reason: "empty-required-value",
          detail: "value is the empty string",
        },
      ],
      "i18n required keys",
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
    // First detail wins, surviving in the emitted line.
    expect(String(logSpy.mock.calls[0][0])).toContain("value=\"\"");
  });

  it("dedupes across multiple emitGithubAnnotations calls (different test groups)", () => {
    // Simulates the real scenario: i18nRequiredKeys flags a missing key,
    // then i18nContract independently flags the SAME key. The reviewer
    // should see only one annotation, not two stacked on the same line.
    emitGithubAnnotations(
      [{ locale: "de", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" }],
      "i18n required keys",
    );
    emitGithubAnnotations(
      [{ locale: "de", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" }],
      "i18n contract",
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
    // The first group "wins" the title slot.
    expect(String(logSpy.mock.calls[0][0])).toContain("i18n required keys");
  });

  it("preserves NON-overlapping violations from a second call", () => {
    emitGithubAnnotations(
      [{ locale: "de", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" }],
      "i18n required keys",
    );
    emitGithubAnnotations(
      [
        { locale: "de", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" }, // dup → skip
        { locale: "de", path: "TRANSLATIONS.local.subhead", reason: "missing-required-key" }, // new → emit
      ],
      "i18n contract",
    );
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it("__resetAnnotationDedupForTesting clears the cross-call index", () => {
    emitGithubAnnotations(
      [{ locale: "pl", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" }],
      "g1",
    );
    __resetAnnotationDedupForTesting();
    emitGithubAnnotations(
      [{ locale: "pl", path: "TRANSLATIONS.local.heading", reason: "missing-required-key" }],
      "g2",
    );
    expect(logSpy).toHaveBeenCalledTimes(2);
  });
});

/**
 * Multi-line value handling
 * -------------------------
 * The locale maps in lastChangeTooltipContent.ts / lastChangeTooltipModel.ts
 * are mostly single-line key/value pairs, but nothing prevents a future
 * translator (or a copy-pasted long string) from spanning multiple lines.
 * When that happens, the previous resolver returned only the key line —
 * losing the actual value text and making the annotation harder to read.
 *
 * The new resolver walks forward through the value, tracking template
 * literal / bracket / brace / paren balance, and collapses everything
 * into a single compact snippet (with `…` truncation past 200 chars and
 * a safety stop at sibling keys / dedents).
 *
 * Tests below use SYNTHETIC line arrays so we exercise edge cases
 * (template literals, multi-line arrays, multi-line objects, value-on-
 * next-line) that the real source files don't currently contain.
 */
describe("i18nGithubAnnotations — isMultiLineValueOpener heuristic", () => {
  it("returns false for a complete single-line string value", () => {
    expect(__isMultiLineValueOpenerForTesting('heading: "Last change",')).toBe(false);
    expect(__isMultiLineValueOpenerForTesting("heading: 'foo'")).toBe(false);
  });
  it("returns false for a complete single-line backtick value", () => {
    expect(__isMultiLineValueOpenerForTesting("heading: `Last change`,")).toBe(false);
  });
  it("returns true for an unterminated template literal", () => {
    expect(__isMultiLineValueOpenerForTesting("heading: `Last")).toBe(true);
  });
  it("returns true for a multi-line array opener", () => {
    expect(__isMultiLineValueOpenerForTesting("variants: [")).toBe(true);
  });
  it("returns true for a multi-line object opener", () => {
    expect(__isMultiLineValueOpenerForTesting("local: {")).toBe(true);
  });
  it("returns true for a colon-only line (value on next line)", () => {
    expect(__isMultiLineValueOpenerForTesting("heading:")).toBe(true);
  });
  it("returns true for trailing string concatenation `+`", () => {
    expect(__isMultiLineValueOpenerForTesting('heading: "foo" +')).toBe(true);
  });
  it("ignores `//` that appears inside a string literal", () => {
    // Trailing comment after a complete string — still single-line.
    expect(__isMultiLineValueOpenerForTesting('url: "http://x", // ok')).toBe(false);
  });
});

describe("i18nGithubAnnotations — assembleMultiLineSnippet", () => {
  it("collapses a multi-line backtick value into one line", () => {
    const lines = [
      "  pl: {",
      "    heading: `Line one",
      "Line two",
      "Line three`,",
      "  },",
    ];
    const snippet = __assembleMultiLineSnippetForTesting(lines, 1);
    expect(snippet).toBe("heading: `Line one Line two Line three`,");
  });
  it("collapses a multi-line array value into one line", () => {
    const lines = [
      "  pl: {",
      "    variants: [",
      '      "a",',
      '      "b",',
      "    ],",
      "  },",
    ];
    const snippet = __assembleMultiLineSnippetForTesting(lines, 1);
    expect(snippet).toBe('variants: [ "a", "b", ],');
  });
  it("collapses a multi-line object value into one line", () => {
    const lines = [
      "  pl: {",
      "    local: {",
      '      heading: "H",',
      '      description: "D",',
      "    },",
      "  },",
    ];
    const snippet = __assembleMultiLineSnippetForTesting(lines, 1);
    expect(snippet).toContain('local: {');
    expect(snippet).toContain('heading: "H"');
    expect(snippet).toContain('description: "D"');
  });
  it("handles colon-then-value-on-next-line", () => {
    const lines = [
      "  pl: {",
      "    heading:",
      '      "Last change",',
      "  },",
    ];
    const snippet = __assembleMultiLineSnippetForTesting(lines, 1);
    expect(snippet).toBe('heading: "Last change",');
  });
  it("stops at a sibling key on the same indent", () => {
    const lines = [
      "  pl: {",
      "    heading: `unclosed",
      "    sibling: 'x',", // template still open — should be eaten
      "    `,",
      "  },",
    ];
    // Backtick is unterminated until line 3, so we collect lines 1–3.
    const snippet = __assembleMultiLineSnippetForTesting(lines, 1);
    expect(snippet).toContain("heading: `unclosed");
    expect(snippet).toMatch(/`,$/);
  });
  it("truncates extremely long values with a trailing ellipsis", () => {
    const long = "x".repeat(500);
    const lines = [
      "  pl: {",
      "    heading: `" + long,
      "`,",
      "  },",
    ];
    const snippet = __assembleMultiLineSnippetForTesting(lines, 1);
    expect(snippet.length).toBeLessThanOrEqual(200);
    expect(snippet.endsWith("…")).toBe(true);
  });
});

describe("i18nGithubAnnotations — getSourceLineSnippet on multi-line values", () => {
  /**
   * Pretend a locale block holds a multi-line backtick value. We can't
   * mutate the real source file, but `getSourceLineSnippet` accepts a
   * `lines: string[]` arg directly — perfect for synthetic fixtures.
   */
  const fixture = [
    "export const TRANSLATIONS = {",
    "  pl: {",
    "    heading: `Linia jeden",
    "      Linia dwa`,",
    '    description: "krótki",',
    "  },",
    "  en: {",
    '    heading: "Last change",',
    '    description: "short",',
    "  },",
    "};",
  ];

  it("returns the assembled one-line snippet AND the key declaration line number", () => {
    const result = __getSourceLineSnippetForTesting(fixture, "pl", "heading");
    expect(result).not.toBeNull();
    expect(result!.lineNumber).toBe(3); // 1-based: `heading: \`Linia jeden`
    expect(result!.snippet).toBe("heading: `Linia jeden Linia dwa`,");
  });

  it("still returns the trimmed line for normal single-line values", () => {
    const result = __getSourceLineSnippetForTesting(fixture, "en", "heading");
    expect(result).not.toBeNull();
    expect(result!.lineNumber).toBe(8);
    expect(result!.snippet).toBe('heading: "Last change",');
  });

  it("does not bleed into a sibling key when the value is single-line", () => {
    const result = __getSourceLineSnippetForTesting(fixture, "pl", "description");
    expect(result).not.toBeNull();
    expect(result!.snippet).toBe('description: "krótki",');
    expect(result!.snippet).not.toContain("heading");
  });
});
