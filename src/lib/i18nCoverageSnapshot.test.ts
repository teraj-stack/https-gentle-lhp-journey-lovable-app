/**
 * Runtime translation coverage snapshot.
 *
 * Why this test exists
 * --------------------
 * We already have:
 *   - `i18nRequiredKeys.test.ts` — fails LOUDLY on any missing/empty key.
 *   - `ariaTextSnapshots.test.ts` — freezes the COMPOSED user-facing strings.
 *   - A dev page `/dev/i18n-contract` that renders the same matrix for humans.
 *
 * What's still missing is a single **machine-readable snapshot of the entire
 * coverage matrix** (every required key × every supported locale → status).
 * Without it, a translation drift that happens to keep all keys non-empty
 * (e.g. someone deletes the German `shortBadge` AND adds a stub `"TODO"` —
 * both required-keys and aria-snapshot tests would still pass; the dev
 * page would only catch it if a human visited it before the release).
 *
 * This test snapshots the FULL coverage table as a stable, ordered string.
 * Any drift in:
 *   - which locales are supported,
 *   - which keys are required,
 *   - which keys are present vs. missing vs. empty vs. optional-absent,
 * produces a clear unified diff in vitest output. Reviewers can immediately
 * see what changed in the contract — separate from "the value of key X
 * changed", which is what the aria-snapshot test guards.
 *
 * Determinism
 * -----------
 *  - Locales emitted in `SUPPORTED_LOCALES` order (the canonical order the
 *    rest of the test suite uses), NOT alphabetical, so reviewers see the
 *    same row order as in production lookup paths.
 *  - Keys sorted lexicographically WITHIN each section so that adding a new
 *    key produces a single-line insertion diff (not a reordering avalanche).
 *  - Status values are a fixed enum: ok / empty / missing / optional-absent.
 *    We deliberately do NOT snapshot the actual translated values — that's
 *    `ariaTextSnapshots`' job. Mixing the two would make every wording tweak
 *    also churn the coverage snapshot, defeating the point.
 *
 * Updating
 * --------
 *   npx vitest run src/lib/i18nCoverageSnapshot.test.ts -u
 *
 * Before running `-u`, double-check the diff:
 *   - status `ok` → `missing` for an existing locale is a REGRESSION; fix
 *     the translation, don't accept the snapshot.
 *   - new locale row OR new required key column is expected when expanding
 *     the contract; accepting the snapshot is correct.
 */
import { describe, expect, it } from "vitest";
import {
  REQUIRED_TRANSLATION_KEYS,
  SUPPORTED_LOCALES,
  __getRawTranslationsForTesting,
  type Locale,
} from "./lastChangeTooltipContent";
import {
  REQUIRED_TIME_LINE_KEYS,
  __getRawTimeLineTranslationsForTesting,
} from "./lastChangeTooltipModel";

type CellStatus = "ok" | "empty" | "missing" | "optional-absent";

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const classify = (
  container: Record<string, unknown> | undefined,
  key: string,
  optional: boolean,
): CellStatus => {
  if (!container || !(key in container)) {
    return optional ? "optional-absent" : "missing";
  }
  return isNonEmptyString(container[key]) ? "ok" : "empty";
};

/**
 * Build one section of the coverage report:
 *   ## TRANSLATIONS — top
 *   key                | pl | en | de | it
 *   sourcePrefix       | ok | ok | ok | ok
 */
const buildSection = (
  title: string,
  keys: ReadonlyArray<{ name: string; optional?: boolean }>,
  resolveCell: (locale: Locale, key: string, optional: boolean) => CellStatus,
): string => {
  // Sort keys lexicographically for stable diffs on insertion.
  const sortedKeys = [...keys].sort((a, b) => a.name.localeCompare(b.name));
  const localeHeader = SUPPORTED_LOCALES.join(" | ");
  const keyColWidth = Math.max(
    "key".length,
    ...sortedKeys.map((k) => k.name.length + (k.optional ? 4 : 0)), // " (?)"
  );
  const pad = (s: string) => s.padEnd(keyColWidth);
  const lines: string[] = [`## ${title}`];
  lines.push(`${pad("key")} | ${localeHeader}`);
  lines.push(`${"-".repeat(keyColWidth)}-+-${SUPPORTED_LOCALES.map(() => "--").join("-+-")}`);
  for (const k of sortedKeys) {
    const label = k.optional ? `${k.name} (?)` : k.name;
    const cells = SUPPORTED_LOCALES.map((loc) =>
      resolveCell(loc, k.name, k.optional ?? false).padEnd(2),
    ).join(" | ");
    lines.push(`${pad(label)} | ${cells}`);
  }
  return lines.join("\n");
};

const buildCoverageReport = (): string => {
  const translations = __getRawTranslationsForTesting() as unknown as Record<
    Locale,
    Record<string, unknown>
  >;
  const timeLine = __getRawTimeLineTranslationsForTesting() as unknown as Record<
    Locale,
    Record<string, unknown>
  >;

  const sections: string[] = [];

  // Header — pin the supported-locale order so a reorder is visible.
  sections.push(`# i18n runtime coverage matrix`);
  sections.push(`locales: ${SUPPORTED_LOCALES.join(", ")}`);
  sections.push("");

  // TRANSLATIONS — top-level keys (e.g. sourcePrefix).
  sections.push(
    buildSection(
      "TRANSLATIONS — top-level",
      REQUIRED_TRANSLATION_KEYS.top.map((name) => ({ name })),
      (loc, key) => classify(translations[loc], key, false),
    ),
  );
  sections.push("");

  // TRANSLATIONS — variant keys, per `remote` and `local` sub-blocks.
  for (const variant of ["remote", "local"] as const) {
    const required = REQUIRED_TRANSLATION_KEYS.variant.map((name) => ({
      name,
      optional: false,
    }));
    const optional = REQUIRED_TRANSLATION_KEYS.variantOptional.map((name) => ({
      name,
      optional: true,
    }));
    sections.push(
      buildSection(
        `TRANSLATIONS — variant.${variant}`,
        [...required, ...optional],
        (loc, key, opt) =>
          classify(
            translations[loc]?.[variant] as Record<string, unknown> | undefined,
            key,
            opt,
          ),
      ),
    );
    sections.push("");
  }

  // TIME_LINE — the secondary translation map.
  sections.push(
    buildSection(
      "TIME_LINE_TRANSLATIONS",
      REQUIRED_TIME_LINE_KEYS.map((name) => ({ name })),
      (loc, key) => classify(timeLine[loc], key, false),
    ),
  );

  return sections.join("\n");
};

describe("i18n runtime coverage matrix — snapshot", () => {
  it("renders the full required-key × locale coverage table", () => {
    const report = buildCoverageReport();
    // The snapshot freezes the SHAPE of the contract (which locales,
    // which keys, what status) — NOT the wording (covered separately by
    // ariaTextSnapshots). A diff here means the contract itself drifted.
    expect(report).toMatchSnapshot();
  });

  it("contract is currently fully satisfied (no missing/empty cells)", () => {
    // Belt-and-suspenders complement to the snapshot: even if a reviewer
    // accidentally accepts a regression with `-u`, this assertion still
    // fails on the next run because it does not depend on any stored
    // snapshot — it asserts the live state.
    const report = buildCoverageReport();
    expect(report).not.toMatch(/\bmissing\b/);
    expect(report).not.toMatch(/\bempty\b/);
  });
});
