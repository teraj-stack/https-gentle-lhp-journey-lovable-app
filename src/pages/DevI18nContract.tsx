/**
 * Dev-only page that visualizes the i18n key contract for the
 * "Ostatnia zmiana" tooltip.
 *
 * What it shows
 * -------------
 * For every supported locale we walk the same REQUIRED_* lists that the
 * vitest contract suite (`i18nRequiredKeys.test.ts`) consumes and render a
 * matrix of the actual resolved strings:
 *   - ✅ green  — non-empty string present
 *   - ⚠️ amber  — present but empty/whitespace-only
 *   - ❌ red    — key entirely missing
 *
 * Why a page (not just rely on the test suite)?
 * ---------------------------------------------
 * The vitest report is great for CI but mediocre for translators / PMs who
 * want to *see* the strings in context: this page surfaces the live values
 * side-by-side so wording drift, accidental nbsp, or trailing colons jump
 * out at a glance — without spinning up the full app or hunting through
 * source files.
 *
 * Lightweight on purpose — no Layout/Header/Footer, no auth gate, no
 * network. Mounted only at `/dev/i18n-contract` (mirrors the existing
 * `/dev/tooltip-preview` convention).
 */
import { useMemo } from "react";
import {
  REQUIRED_TRANSLATION_KEYS,
  SUPPORTED_LOCALES,
  __getRawTranslationsForTesting,
  type Locale,
} from "@/lib/lastChangeTooltipContent";
import {
  REQUIRED_TIME_LINE_KEYS,
  __getRawTimeLineTranslationsForTesting,
} from "@/lib/lastChangeTooltipModel";

type CellStatus = "ok" | "empty" | "missing" | "optional-missing";

interface Cell {
  status: CellStatus;
  value: string | null;
}

interface KeyRow {
  /** Display label, e.g. "remote.heading" or "shortBadge". */
  label: string;
  /** Whether the key is optional (missing is OK). */
  optional: boolean;
  /** Per-locale resolved value + status. */
  cells: Record<Locale, Cell>;
}

interface Section {
  title: string;
  description: string;
  rows: KeyRow[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const classify = (
  raw: Record<string, unknown> | undefined,
  key: string,
  optional: boolean,
): Cell => {
  if (!raw || !(key in raw)) {
    return { status: optional ? "optional-missing" : "missing", value: null };
  }
  const v = raw[key];
  if (!isNonEmptyString(v)) {
    return { status: "empty", value: typeof v === "string" ? v : null };
  }
  return { status: "ok", value: v };
};

const STATUS_STYLES: Record<CellStatus, { dot: string; text: string; label: string }> = {
  ok: {
    dot: "bg-emerald-500",
    text: "text-foreground",
    label: "OK",
  },
  empty: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    label: "EMPTY",
  },
  missing: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    label: "MISSING",
  },
  "optional-missing": {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    label: "—",
  },
};

const buildSections = (): Section[] => {
  const translations = __getRawTranslationsForTesting() as unknown as Record<
    Locale,
    Record<string, unknown> | undefined
  >;
  const timeLine = __getRawTimeLineTranslationsForTesting() as unknown as Record<
    Locale,
    Record<string, unknown> | undefined
  >;

  // --- Section 1: TRANSLATIONS top-level keys (e.g. sourcePrefix) ---
  const topRows: KeyRow[] = REQUIRED_TRANSLATION_KEYS.top.map((key) => ({
    label: key,
    optional: false,
    cells: Object.fromEntries(
      SUPPORTED_LOCALES.map((loc) => [loc, classify(translations[loc], key, false)]),
    ) as Record<Locale, Cell>,
  }));

  // --- Section 2 & 3: variant sub-trees (remote / local) ---
  const variantSections = (["remote", "local"] as const).map<Section>((subKey) => {
    const requiredRows: KeyRow[] = REQUIRED_TRANSLATION_KEYS.variant.map((key) => ({
      label: `${subKey}.${key}`,
      optional: false,
      cells: Object.fromEntries(
        SUPPORTED_LOCALES.map((loc) => {
          const variant = translations[loc]?.[subKey] as
            | Record<string, unknown>
            | undefined;
          return [loc, classify(variant, key, false)];
        }),
      ) as Record<Locale, Cell>,
    }));
    const optionalRows: KeyRow[] = REQUIRED_TRANSLATION_KEYS.variantOptional.map(
      (key) => ({
        label: `${subKey}.${key}`,
        optional: true,
        cells: Object.fromEntries(
          SUPPORTED_LOCALES.map((loc) => {
            const variant = translations[loc]?.[subKey] as
              | Record<string, unknown>
              | undefined;
            return [loc, classify(variant, key, true)];
          }),
        ) as Record<Locale, Cell>,
      }),
    );
    return {
      title: `TRANSLATIONS.${subKey}`,
      description:
        subKey === "remote"
          ? "Wariant: zmiana przyszła z innej karty (BroadcastChannel / Storage)."
          : "Wariant: zmiana dokonana lokalnie w bieżącej karcie.",
      rows: [...requiredRows, ...optionalRows],
    };
  });

  // --- Section 4: TIME_LINE_TRANSLATIONS ---
  const timeRows: KeyRow[] = REQUIRED_TIME_LINE_KEYS.map((key) => ({
    label: key,
    optional: false,
    cells: Object.fromEntries(
      SUPPORTED_LOCALES.map((loc) => [loc, classify(timeLine[loc], key, false)]),
    ) as Record<Locale, Cell>,
  }));

  return [
    {
      title: "TRANSLATIONS (top-level)",
      description: "Klucze wspólne dla wszystkich wariantów (np. prefiks „Źródło:”).",
      rows: topRows,
    },
    ...variantSections,
    {
      title: "TIME_LINE_TRANSLATIONS",
      description:
        "Literały linii czasu: prefiks („Czas:”), kwalifikator fallbacku oraz native title.",
      rows: timeRows,
    },
  ];
};

const Legend = () => (
  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
    {(["ok", "empty", "missing", "optional-missing"] as CellStatus[]).map((s) => (
      <span key={s} className="inline-flex items-center gap-2">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_STYLES[s].dot}`} />
        <span className={STATUS_STYLES[s].text}>{STATUS_STYLES[s].label}</span>
        <span className="opacity-60">
          {s === "ok"
            ? "klucz obecny i niepusty"
            : s === "empty"
              ? "klucz obecny ale pusty / whitespace"
              : s === "missing"
                ? "klucz wymagany — brak"
                : "klucz opcjonalny — brak (OK)"}
        </span>
      </span>
    ))}
  </div>
);

const StatusDot = ({ status }: { status: CellStatus }) => (
  <span
    className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${STATUS_STYLES[status].dot}`}
    aria-label={STATUS_STYLES[status].label}
  />
);

const SectionTable = ({ section }: { section: Section }) => {
  const totals = useMemo(() => {
    const t = { ok: 0, empty: 0, missing: 0, "optional-missing": 0 } as Record<
      CellStatus,
      number
    >;
    for (const row of section.rows) {
      for (const loc of SUPPORTED_LOCALES) {
        t[row.cells[loc].status] += 1;
      }
    }
    return t;
  }, [section]);

  const hasIssues = totals.missing > 0 || totals.empty > 0;

  return (
    <section className="border border-border rounded-lg bg-card overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-sm tracking-tight">{section.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0">
          <span className={hasIssues ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
            {hasIssues ? "⚠ issues" : "✓ all green"}
          </span>
          <span className="text-muted-foreground tabular-nums">
            ok {totals.ok} · empty {totals.empty} · missing {totals.missing}
          </span>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left font-medium px-3 py-2 border-b border-border w-[28%]">
                key
              </th>
              {SUPPORTED_LOCALES.map((loc) => (
                <th
                  key={loc}
                  className="text-left font-medium px-3 py-2 border-b border-border uppercase tracking-wide"
                >
                  {loc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.label} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 font-mono align-top">
                  {row.label}
                  {row.optional && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      optional
                    </span>
                  )}
                </td>
                {SUPPORTED_LOCALES.map((loc) => {
                  const cell = row.cells[loc];
                  const styles = STATUS_STYLES[cell.status];
                  return (
                    <td
                      key={loc}
                      className={`px-3 py-2 align-top ${styles.text}`}
                      data-testid={`i18n-cell-${row.label}-${loc}`}
                      data-status={cell.status}
                    >
                      <StatusDot status={cell.status} />
                      {cell.value !== null ? (
                        <span className="break-words">{cell.value}</span>
                      ) : (
                        <span className="opacity-60 italic">{styles.label}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const DevI18nContract = () => {
  const sections = useMemo(() => buildSections(), []);

  const grandTotals = useMemo(() => {
    const t = { ok: 0, empty: 0, missing: 0, "optional-missing": 0 } as Record<
      CellStatus,
      number
    >;
    for (const sec of sections) {
      for (const row of sec.rows) {
        for (const loc of SUPPORTED_LOCALES) {
          t[row.cells[loc].status] += 1;
        }
      }
    }
    return t;
  }, [sections]);

  const allGreen = grandTotals.missing === 0 && grandTotals.empty === 0;

  return (
    <main className="min-h-screen bg-background text-foreground p-6 max-w-7xl mx-auto space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          dev tools
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          i18n contract — „Ostatnia zmiana” tooltip
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Single source of truth: <code className="font-mono">REQUIRED_TRANSLATION_KEYS</code>{" "}
          + <code className="font-mono">REQUIRED_TIME_LINE_KEYS</code>. Każdy wymagany
          klucz musi mieć niepusty string we wszystkich obsługiwanych językach.
          Klucze opcjonalne mogą być pominięte. Te same dane czyta vitest{" "}
          <code className="font-mono">i18nRequiredKeys.test.ts</code> i CI{" "}
          <code className="font-mono">npm run i18n:check</code>.
        </p>
      </header>

      <div
        className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 ${
          allGreen
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-red-500/40 bg-red-500/5"
        }`}
        data-testid="i18n-contract-summary"
        data-all-green={allGreen}
      >
        <div className="text-sm">
          <strong className="font-semibold">
            {allGreen ? "Kontrakt OK" : "Kontrakt naruszony"}
          </strong>
          <span className="text-muted-foreground ml-2">
            {SUPPORTED_LOCALES.length} języków · {sections.reduce((n, s) => n + s.rows.length, 0)}{" "}
            kluczy ·{" "}
            {grandTotals.ok + grandTotals.empty + grandTotals.missing + grandTotals["optional-missing"]}{" "}
            komórek
          </span>
        </div>
        <div className="text-xs tabular-nums flex gap-3">
          <span className="text-emerald-700 dark:text-emerald-400">ok {grandTotals.ok}</span>
          <span className="text-amber-700 dark:text-amber-400">empty {grandTotals.empty}</span>
          <span className="text-red-700 dark:text-red-400">missing {grandTotals.missing}</span>
          <span className="text-muted-foreground">
            optional skipped {grandTotals["optional-missing"]}
          </span>
        </div>
      </div>

      <Legend />

      <div className="space-y-4">
        {sections.map((s) => (
          <SectionTable key={s.title} section={s} />
        ))}
      </div>

      <footer className="pt-4 text-xs text-muted-foreground border-t border-border">
        Lokalizacja:{" "}
        <code className="font-mono">src/lib/lastChangeTooltipContent.ts</code>{" "}
        (TRANSLATIONS) ·{" "}
        <code className="font-mono">src/lib/lastChangeTooltipModel.ts</code>{" "}
        (TIME_LINE_TRANSLATIONS). Autofix kluczy:{" "}
        <code className="font-mono">npm run i18n:autofix</code>.
      </footer>
    </main>
  );
};

export default DevI18nContract;
