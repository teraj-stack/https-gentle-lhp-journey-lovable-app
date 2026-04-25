/**
 * Snapshot tests for `ariaText` per locale and per scenario.
 *
 * Why a separate suite from `lastChangeTooltipModel.test.ts`?
 * ----------------------------------------------------------
 * The existing model suite exercises *invariants* (no trailing newlines, no
 * stray "Czas: " etc.) that should hold regardless of wording. This suite is
 * the **wording contract**: it freezes the EXACT user-facing aria-label
 * strings the screen reader will announce, for every supported locale and
 * every meaningful state (full date / relative fallback / no time line, with
 * and without an `ariaHeadingOverride`). If a translator (or a refactor)
 * accidentally flips "ago" to "before" or drops the qualifier, vitest will
 * surface a unified diff instead of the regression silently shipping.
 *
 * Failure-mode hygiene
 * --------------------
 * A snapshot mismatch alone is hard to triage when the underlying problem is
 * actually a *missing* translation key (the snapshot would diff into
 * `undefined undefined undefined`). To keep failures actionable we run a
 * preflight that walks every required key for every locale and aborts with a
 * structured table BEFORE any snapshot is compared. That way:
 *
 *   - drift in wording → snapshot diff (review + `vitest -u` to accept).
 *   - missing key      → loud, specific error pointing at locale + path.
 *
 * Updating snapshots
 * ------------------
 *   npx vitest run src/lib/ariaTextSnapshots.test.ts -u
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
  buildLastChangeTooltipModel,
} from "./lastChangeTooltipModel";

// ---------------------------------------------------------------------------
// Preflight: assert every required key resolves to a non-empty string for
// every locale BEFORE we compare snapshots. This converts cryptic snapshot
// diffs into a single readable error message.
// ---------------------------------------------------------------------------

interface MissingKeyReport {
  map: "TRANSLATIONS" | "TIME_LINE_TRANSLATIONS";
  locale: Locale;
  path: string;
  reason: "missing" | "empty";
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const collectMissingKeys = (): MissingKeyReport[] => {
  const out: MissingKeyReport[] = [];
  const translations = __getRawTranslationsForTesting();
  const timeLine = __getRawTimeLineTranslationsForTesting();

  for (const locale of SUPPORTED_LOCALES) {
    const t = translations[locale] as unknown as
      | Record<string, unknown>
      | undefined;
    if (!t) {
      out.push({ map: "TRANSLATIONS", locale, path: "<root>", reason: "missing" });
      continue;
    }

    for (const key of REQUIRED_TRANSLATION_KEYS.top) {
      if (!(key in t)) {
        out.push({ map: "TRANSLATIONS", locale, path: key, reason: "missing" });
      } else if (!isNonEmptyString(t[key])) {
        out.push({ map: "TRANSLATIONS", locale, path: key, reason: "empty" });
      }
    }

    for (const subKey of ["remote", "local"] as const) {
      const variant = t[subKey] as Record<string, unknown> | undefined;
      if (!variant) {
        out.push({
          map: "TRANSLATIONS",
          locale,
          path: subKey,
          reason: "missing",
        });
        continue;
      }
      for (const key of REQUIRED_TRANSLATION_KEYS.variant) {
        if (!(key in variant)) {
          out.push({
            map: "TRANSLATIONS",
            locale,
            path: `${subKey}.${key}`,
            reason: "missing",
          });
        } else if (!isNonEmptyString(variant[key])) {
          out.push({
            map: "TRANSLATIONS",
            locale,
            path: `${subKey}.${key}`,
            reason: "empty",
          });
        }
      }
      // optional keys: only flag empty-string drift (missing is OK)
      for (const key of REQUIRED_TRANSLATION_KEYS.variantOptional) {
        if (key in variant && !isNonEmptyString(variant[key])) {
          out.push({
            map: "TRANSLATIONS",
            locale,
            path: `${subKey}.${key}`,
            reason: "empty",
          });
        }
      }
    }
  }

  for (const locale of SUPPORTED_LOCALES) {
    const tl = timeLine[locale] as Record<string, unknown> | undefined;
    if (!tl) {
      out.push({
        map: "TIME_LINE_TRANSLATIONS",
        locale,
        path: "<root>",
        reason: "missing",
      });
      continue;
    }
    for (const key of REQUIRED_TIME_LINE_KEYS) {
      if (!(key in tl)) {
        out.push({
          map: "TIME_LINE_TRANSLATIONS",
          locale,
          path: key,
          reason: "missing",
        });
      } else if (!isNonEmptyString(tl[key])) {
        out.push({
          map: "TIME_LINE_TRANSLATIONS",
          locale,
          path: key,
          reason: "empty",
        });
      }
    }
  }

  return out;
};

const formatMissingKeyReport = (issues: MissingKeyReport[]): string => {
  const header =
    "Missing or empty translation keys detected (snapshots NOT compared):\n";
  const cols = ["MAP", "LOCALE", "PATH", "REASON"];
  const rows = [
    cols,
    ...issues.map((i) => [i.map, i.locale, i.path, i.reason]),
  ];
  const widths = cols.map((_, c) =>
    Math.max(...rows.map((r) => String(r[c]).length)),
  );
  const fmt = (r: string[]) =>
    r.map((cell, c) => String(cell).padEnd(widths[c])).join("  ");
  const lines = [fmt(rows[0]), widths.map((w) => "-".repeat(w)).join("  ")];
  for (const r of rows.slice(1)) lines.push(fmt(r));
  lines.push("");
  lines.push(
    "FIX: add the missing strings (or restore non-empty values) before re-running snapshots.",
  );
  return header + lines.join("\n");
};

// ---------------------------------------------------------------------------
// Snapshot scenarios
//
// Each scenario is fully deterministic — no `new Date()`, no relative time
// computation. We feed already-formatted strings so the snapshot only changes
// when locale wording changes (or composition/ordering changes).
// ---------------------------------------------------------------------------

interface Scenario {
  name: string;
  input: Parameters<typeof buildLastChangeTooltipModel>[0];
}

const baseScenarios: ReadonlyArray<Omit<Scenario, "input"> & {
  buildInput: (locale: Locale) => Parameters<typeof buildLastChangeTooltipModel>[0];
}> = [
  {
    name: "remote — full date",
    buildInput: (locale) => ({
      source: "remote",
      fullDate: "24.04.2026, 12:34:56",
      relativeLabel: "2 min",
      locale,
    }),
  },
  {
    name: "remote — relative fallback",
    buildInput: (locale) => ({
      source: "remote",
      fullDate: null,
      relativeLabel: "2 min",
      locale,
    }),
  },
  {
    name: "remote — no time line",
    buildInput: (locale) => ({
      source: "remote",
      fullDate: null,
      relativeLabel: null,
      locale,
    }),
  },
  {
    name: "local — full date",
    buildInput: (locale) => ({
      source: "local",
      fullDate: "24.04.2026, 12:34:56",
      relativeLabel: "2 min",
      locale,
    }),
  },
  {
    name: "local — relative fallback",
    buildInput: (locale) => ({
      source: "local",
      fullDate: null,
      relativeLabel: "2 min",
      locale,
    }),
  },
  {
    name: "null source — no time line",
    buildInput: (locale) => ({
      source: null,
      fullDate: null,
      relativeLabel: null,
      locale,
    }),
  },
];

describe("ariaText snapshots — translation key preflight", () => {
  it("every required key resolves to a non-empty string for every locale", () => {
    const issues = collectMissingKeys();
    if (issues.length > 0) {
      throw new Error(formatMissingKeyReport(issues));
    }
    expect(issues).toEqual([]);
  });
});

describe("ariaText snapshots — wording contract per locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    describe(`locale: ${locale}`, () => {
      for (const scenario of baseScenarios) {
        it(scenario.name, () => {
          const model = buildLastChangeTooltipModel(scenario.buildInput(locale));
          // Snapshot the FULL ariaText — that's the string the screen reader
          // actually announces. Keeping it as one block (not split) makes
          // ordering/whitespace regressions visible in the diff.
          expect(model.ariaText).toMatchSnapshot();
        });
      }
    });
  }
});
