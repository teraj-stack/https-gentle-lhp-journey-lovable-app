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
  __findKeyLineForTesting,
  __stripTopPrefixForTesting,
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
