/**
 * I18N REQUIRED-KEYS CONTRACT — single source of truth.
 *
 * Cel: pojedyncze, autoritatywne miejsce, w którym deklarujemy KTÓRE klucze
 * `buildLastChangeTooltipModel` (i pośrednio cały tooltip „Ostatnia zmiana")
 * RZECZYWIŚCIE czyta z map tłumaczeń. Test ten weryfikuje, że dla KAŻDEGO
 * locale ∈ `SUPPORTED_LOCALES`:
 *
 *   1) `TRANSLATIONS[locale]` zawiera wszystkie klucze z
 *      `REQUIRED_TRANSLATION_KEYS.top` (np. `sourcePrefix`),
 *   2) `TRANSLATIONS[locale].local` i `TRANSLATIONS[locale].remote` zawierają
 *      wszystkie klucze z `REQUIRED_TRANSLATION_KEYS.variant`
 *      (`heading` / `description` / `shortBadge`),
 *   3) `TIME_LINE_TRANSLATIONS[locale]` zawiera wszystkie klucze z
 *      `REQUIRED_TIME_LINE_KEYS` (`timePrefix` / `relativeQualifier` /
 *      `relativeHelpTitle`),
 *   4) klucze opcjonalne (`REQUIRED_TRANSLATION_KEYS.variantOptional`, np.
 *      `ariaHeadingOverride`) — gdy są obecne, MUSZĄ być niepuste; gdy ich
 *      nie ma, NIE jest to błąd (build-time).
 *
 * Czym TEN test różni się od `i18nContract.test.ts`?
 * --------------------------------------------------
 * `i18nContract.test.ts` waliduje SEMANTYKĘ stringów (długości, prefiksy
 * źródła, brak whitespace, brak placeholderów). Tutaj walidujemy SAM SHAPE
 * mapy: czy klucz fizycznie istnieje, czy nie ma `undefined`/`null`. To jest
 * NAJTAŃSZA bramka — wykrywa typowy błąd „dodałem nowy klucz w PL, zapomniałem
 * w DE/IT" zanim dojdzie do droższych testów semantycznych.
 *
 * Czym TEN test różni się od TypeScriptu?
 * ---------------------------------------
 * TS gwarantuje shape `Record<Locale, TranslationEntry>`, ale:
 *   - opcjonalne pola (`ariaHeadingOverride?`) mogą zostać CICHO pominięte,
 *   - literał `""` lub `"   "` przechodzi sygnaturę typu, mimo że jest
 *     semantycznie pusty,
 *   - dodanie nowego klucza w `TranslationEntry` bez aktualizacji
 *     `REQUIRED_TRANSLATION_KEYS` powoduje, że klucz jest dostępny w
 *     builderze, ale NIE jest pokryty kontraktem testowym (martwy klucz).
 *
 * Test rozwiązuje wszystkie trzy problemy: porównuje listę kluczy z
 * `REQUIRED_*` z runtime'owym `Object.keys(...)` na każdej mapie i flaguje
 * różnice w obie strony (brak wymaganego klucza ↔ obecność klucza
 * niezadeklarowanego).
 *
 * Naruszenia są agregowane w jeden CI-friendly raport (analogicznie do
 * `i18nContract.test.ts` / `i18nPlaceholders.test.ts`), żeby jeden przebieg
 * pokazał WSZYSTKIE braki dla wszystkich locale × kluczy na raz.
 */
import { describe, it, expect } from "vitest";
import {
  REQUIRED_TRANSLATION_KEYS,
  SUPPORTED_LOCALES,
  __getRawTranslationsForTesting,
  type Locale,
  type TranslationEntry,
  type VariantEntry,
} from "./lastChangeTooltipContent";
import {
  REQUIRED_TIME_LINE_KEYS,
  __getRawTimeLineTranslationsForTesting,
} from "./lastChangeTooltipModel";

// ---------------------------------------------------------------------------
// VIOLATION REPORT — ten sam wzorzec co w sąsiednich kontraktach i18n.
// ---------------------------------------------------------------------------

type ViolationReason =
  | "missing-required-key"
  | "empty-required-value"
  | "wrong-type"
  | "empty-optional-value"
  | "undeclared-key";

interface Violation {
  locale: Locale;
  /** Logiczna ścieżka, np. "TRANSLATIONS.local.heading" / "TIME_LINE.timePrefix". */
  path: string;
  reason: ViolationReason;
  detail?: string;
}

const formatViolations = (violations: Violation[]): string => {
  if (violations.length === 0) return "";
  const localesAffected = new Set(violations.map((v) => v.locale));
  const header = `❌ i18n required-keys violations (${violations.length} issue(s) across ${localesAffected.size} locale(s)):`;
  const sorted = [...violations].sort((a, b) => {
    if (a.locale !== b.locale) return a.locale.localeCompare(b.locale);
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.reason.localeCompare(b.reason);
  });
  const localeW = Math.max(...sorted.map((v) => `locale=${v.locale}`.length));
  const pathW = Math.max(...sorted.map((v) => `path=${v.path}`.length));
  const reasonW = Math.max(...sorted.map((v) => `reason=${v.reason}`.length));
  const rows = sorted.map((v) => {
    const parts = [
      `locale=${v.locale}`.padEnd(localeW),
      `path=${v.path}`.padEnd(pathW),
      `reason=${v.reason}`.padEnd(reasonW),
    ];
    if (v.detail) parts.push(v.detail);
    return "  " + parts.join("  ");
  });
  const fix =
    "\n  FIX: dopisz brakujące pola w TRANSLATIONS / TIME_LINE_TRANSLATIONS\n" +
    "  dla wymienionych locale, lub zaktualizuj REQUIRED_*_KEYS jeśli klucz\n" +
    "  nie jest już używany przez buildera.";
  return [header, "", ...rows, fix].join("\n");
};

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

// ---------------------------------------------------------------------------
// PER-MAP CHECKERS
// ---------------------------------------------------------------------------

const checkVariantEntry = (
  locale: Locale,
  variantName: "local" | "remote",
  variant: VariantEntry | undefined,
  out: Violation[],
) => {
  if (!variant || typeof variant !== "object") {
    out.push({
      locale,
      path: `TRANSLATIONS.${variantName}`,
      reason: "missing-required-key",
      detail: `cały wariant "${variantName}" jest pusty/undefined`,
    });
    return;
  }

  // Wymagane klucze.
  for (const k of REQUIRED_TRANSLATION_KEYS.variant) {
    const path = `TRANSLATIONS.${variantName}.${k}`;
    const value = (variant as unknown as Record<string, unknown>)[k];
    if (value === undefined || value === null) {
      out.push({ locale, path, reason: "missing-required-key" });
      continue;
    }
    if (typeof value !== "string") {
      out.push({
        locale,
        path,
        reason: "wrong-type",
        detail: `oczekiwano string, otrzymano ${typeof value}`,
      });
      continue;
    }
    if (!isNonEmptyString(value)) {
      out.push({
        locale,
        path,
        reason: "empty-required-value",
        detail: `value=${JSON.stringify(value)}`,
      });
    }
  }

  // Opcjonalne klucze — dozwolone że ich nie ma, ale jeśli są, muszą być niepuste.
  for (const k of REQUIRED_TRANSLATION_KEYS.variantOptional) {
    const path = `TRANSLATIONS.${variantName}.${k}`;
    const value = (variant as unknown as Record<string, unknown>)[k];
    if (value === undefined) continue; // opcjonalny — OK.
    if (typeof value !== "string") {
      out.push({
        locale,
        path,
        reason: "wrong-type",
        detail: `klucz opcjonalny obecny ale typu ${typeof value} (oczekiwano string)`,
      });
      continue;
    }
    if (!isNonEmptyString(value)) {
      out.push({
        locale,
        path,
        reason: "empty-optional-value",
        detail: `obecny ale pusty: ${JSON.stringify(value)}`,
      });
    }
  }

  // Wykryj klucze, które są w wariancie, ale NIE są zadeklarowane jako
  // używane przez buildera. To martwa zawartość — albo ktoś dodał klucz
  // bez aktualizacji REQUIRED_TRANSLATION_KEYS, albo zapomniał usunąć po
  // refaktorze. W obu przypadkach chcemy o tym wiedzieć.
  const declared = new Set<string>([
    ...REQUIRED_TRANSLATION_KEYS.variant,
    ...REQUIRED_TRANSLATION_KEYS.variantOptional,
  ]);
  for (const k of Object.keys(variant)) {
    if (!declared.has(k)) {
      out.push({
        locale,
        path: `TRANSLATIONS.${variantName}.${k}`,
        reason: "undeclared-key",
        detail:
          "klucz istnieje w mapie ale nie jest w REQUIRED_TRANSLATION_KEYS — dopisz lub usuń",
      });
    }
  }
};

const checkTopLevelTranslation = (
  locale: Locale,
  entry: TranslationEntry | undefined,
  out: Violation[],
) => {
  if (!entry || typeof entry !== "object") {
    out.push({
      locale,
      path: "TRANSLATIONS",
      reason: "missing-required-key",
      detail: "cały wpis locale jest pusty/undefined",
    });
    return;
  }

  for (const k of REQUIRED_TRANSLATION_KEYS.top) {
    const path = `TRANSLATIONS.${k}`;
    const value = (entry as unknown as Record<string, unknown>)[k];
    if (value === undefined || value === null) {
      out.push({ locale, path, reason: "missing-required-key" });
      continue;
    }
    if (typeof value !== "string") {
      out.push({
        locale,
        path,
        reason: "wrong-type",
        detail: `oczekiwano string, otrzymano ${typeof value}`,
      });
      continue;
    }
    if (!isNonEmptyString(value)) {
      out.push({ locale, path, reason: "empty-required-value", detail: JSON.stringify(value) });
    }
  }

  // Wykryj nieoczekiwane top-level keys (poza znanymi: top + local + remote).
  const knownTop = new Set<string>([...REQUIRED_TRANSLATION_KEYS.top, "local", "remote"]);
  for (const k of Object.keys(entry)) {
    if (!knownTop.has(k)) {
      out.push({
        locale,
        path: `TRANSLATIONS.${k}`,
        reason: "undeclared-key",
        detail: "top-level klucz nie jest w REQUIRED_TRANSLATION_KEYS.top",
      });
    }
  }
};

const checkTimeLineEntry = (
  locale: Locale,
  entry: Record<string, unknown> | undefined,
  out: Violation[],
) => {
  if (!entry || typeof entry !== "object") {
    out.push({
      locale,
      path: "TIME_LINE",
      reason: "missing-required-key",
      detail: "cały wpis locale jest pusty/undefined",
    });
    return;
  }

  for (const k of REQUIRED_TIME_LINE_KEYS) {
    const path = `TIME_LINE.${k}`;
    const value = entry[k];
    if (value === undefined || value === null) {
      out.push({ locale, path, reason: "missing-required-key" });
      continue;
    }
    if (typeof value !== "string") {
      out.push({
        locale,
        path,
        reason: "wrong-type",
        detail: `oczekiwano string, otrzymano ${typeof value}`,
      });
      continue;
    }
    if (!isNonEmptyString(value)) {
      out.push({ locale, path, reason: "empty-required-value", detail: JSON.stringify(value) });
    }
  }

  // Undeclared keys — analogicznie do TRANSLATIONS.
  const declared = new Set<string>(REQUIRED_TIME_LINE_KEYS);
  for (const k of Object.keys(entry)) {
    if (!declared.has(k)) {
      out.push({
        locale,
        path: `TIME_LINE.${k}`,
        reason: "undeclared-key",
        detail: "klucz nie jest w REQUIRED_TIME_LINE_KEYS",
      });
    }
  }
};

// ---------------------------------------------------------------------------
// AGGREGATED CONTRACT TESTS
// ---------------------------------------------------------------------------

describe("i18n required keys — TRANSLATIONS map covers REQUIRED_TRANSLATION_KEYS for every locale", () => {
  it("każdy locale ma kompletny shape (top + local + remote) bez pustych/nieoczekiwanych kluczy", () => {
    const violations: Violation[] = [];
    const raw = __getRawTranslationsForTesting();

    for (const locale of SUPPORTED_LOCALES) {
      const entry = raw[locale];
      checkTopLevelTranslation(locale, entry, violations);
      checkVariantEntry(locale, "local", entry?.local, violations);
      checkVariantEntry(locale, "remote", entry?.remote, violations);
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it("mapa TRANSLATIONS zawiera dokładnie locale z SUPPORTED_LOCALES (brak nadmiarowych)", () => {
    const violations: Violation[] = [];
    const raw = __getRawTranslationsForTesting();
    const supportedSet = new Set<string>(SUPPORTED_LOCALES);

    // Wszystkie supported obecne (powinno być wymuszone przez TS, ale dwa pasy
    // pasów ratunkowych nie zaszkodzą — TS satisfies można obejść).
    for (const locale of SUPPORTED_LOCALES) {
      if (!(locale in raw)) {
        violations.push({
          locale,
          path: "TRANSLATIONS",
          reason: "missing-required-key",
          detail: "locale obecny w SUPPORTED_LOCALES, ale brak go w TRANSLATIONS",
        });
      }
    }
    // Brak nadmiarowych locale w mapie.
    for (const k of Object.keys(raw)) {
      if (!supportedSet.has(k)) {
        violations.push({
          locale: k as Locale,
          path: "TRANSLATIONS",
          reason: "undeclared-key",
          detail: "locale jest w TRANSLATIONS ale nie w SUPPORTED_LOCALES",
        });
      }
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

describe("i18n required keys — TIME_LINE_TRANSLATIONS covers REQUIRED_TIME_LINE_KEYS for every locale", () => {
  it("każdy locale ma kompletny shape (timePrefix + relativeQualifier + relativeHelpTitle)", () => {
    const violations: Violation[] = [];
    const raw = __getRawTimeLineTranslationsForTesting();

    for (const locale of SUPPORTED_LOCALES) {
      checkTimeLineEntry(locale, raw[locale] as unknown as Record<string, unknown>, violations);
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it("mapa TIME_LINE_TRANSLATIONS zawiera dokładnie locale z SUPPORTED_LOCALES", () => {
    const violations: Violation[] = [];
    const raw = __getRawTimeLineTranslationsForTesting();
    const supportedSet = new Set<string>(SUPPORTED_LOCALES);

    for (const locale of SUPPORTED_LOCALES) {
      if (!(locale in raw)) {
        violations.push({
          locale,
          path: "TIME_LINE",
          reason: "missing-required-key",
          detail: "locale obecny w SUPPORTED_LOCALES, ale brak go w TIME_LINE_TRANSLATIONS",
        });
      }
    }
    for (const k of Object.keys(raw)) {
      if (!supportedSet.has(k)) {
        violations.push({
          locale: k as Locale,
          path: "TIME_LINE",
          reason: "undeclared-key",
          detail: "locale jest w TIME_LINE_TRANSLATIONS ale nie w SUPPORTED_LOCALES",
        });
      }
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// META — strażnik, że REQUIRED_*_KEYS są spójne z tym, co builder REALNIE
// czyta. Dodatkowy bezpiecznik na wypadek refaktoru, gdzie ktoś usuwa pole
// z buildera, ale zostawia je w REQUIRED_*_KEYS (i odwrotnie).
// ---------------------------------------------------------------------------

describe("i18n required keys — meta consistency", () => {
  it("REQUIRED_TRANSLATION_KEYS.variant nie jest puste (builder czyta co najmniej heading/description/shortBadge)", () => {
    expect(REQUIRED_TRANSLATION_KEYS.variant.length).toBeGreaterThanOrEqual(3);
    for (const k of ["heading", "description", "shortBadge"] as const) {
      expect(REQUIRED_TRANSLATION_KEYS.variant).toContain(k);
    }
  });

  it("REQUIRED_TRANSLATION_KEYS.top zawiera sourcePrefix (używany w ariaHeading)", () => {
    expect(REQUIRED_TRANSLATION_KEYS.top).toContain("sourcePrefix");
  });

  it("REQUIRED_TIME_LINE_KEYS zawiera wszystkie 3 pola czytane przez buildera", () => {
    for (const k of ["timePrefix", "relativeQualifier", "relativeHelpTitle"] as const) {
      expect(REQUIRED_TIME_LINE_KEYS).toContain(k);
    }
  });

  it("brak duplikatów w REQUIRED_*_KEYS (sanity)", () => {
    expect(new Set(REQUIRED_TRANSLATION_KEYS.top).size).toBe(REQUIRED_TRANSLATION_KEYS.top.length);
    expect(new Set(REQUIRED_TRANSLATION_KEYS.variant).size).toBe(
      REQUIRED_TRANSLATION_KEYS.variant.length,
    );
    expect(new Set(REQUIRED_TRANSLATION_KEYS.variantOptional).size).toBe(
      REQUIRED_TRANSLATION_KEYS.variantOptional.length,
    );
    expect(new Set(REQUIRED_TIME_LINE_KEYS).size).toBe(REQUIRED_TIME_LINE_KEYS.length);
  });
});

// ---------------------------------------------------------------------------
// SELF-TEST — checkery rzeczywiście wykrywają braki/empty/wrong-type oraz
// generują czytelny raport. Bez tego refaktor logiki mógłby cicho zepsuć
// wykrywanie i całość pozostałaby zielona mimo realnych regresji.
// ---------------------------------------------------------------------------

describe("i18n required keys — checker self-test", () => {
  it("checkVariantEntry wykrywa brakujący wymagany klucz", () => {
    const out: Violation[] = [];
    // shortBadge jest wymagane.
    checkVariantEntry(
      "pl",
      "local",
      { heading: "H", description: "D" } as unknown as VariantEntry,
      out,
    );
    expect(out.some((v) => v.path === "TRANSLATIONS.local.shortBadge" && v.reason === "missing-required-key")).toBe(
      true,
    );
  });

  it("checkVariantEntry wykrywa pusty wymagany string", () => {
    const out: Violation[] = [];
    checkVariantEntry(
      "pl",
      "remote",
      { heading: "   ", description: "D", shortBadge: "B" } as VariantEntry,
      out,
    );
    expect(
      out.some((v) => v.path === "TRANSLATIONS.remote.heading" && v.reason === "empty-required-value"),
    ).toBe(true);
  });

  it("checkVariantEntry akceptuje brakujący ariaHeadingOverride (opcjonalny)", () => {
    const out: Violation[] = [];
    checkVariantEntry(
      "en",
      "local",
      { heading: "H", description: "D", shortBadge: "B" } as VariantEntry,
      out,
    );
    // Żadne naruszenie nie powinno wskazywać na opcjonalny klucz.
    expect(out.some((v) => v.path.endsWith("ariaHeadingOverride"))).toBe(false);
  });

  it("checkVariantEntry flaguje obecny ariaHeadingOverride jako pusty string", () => {
    const out: Violation[] = [];
    checkVariantEntry(
      "en",
      "local",
      {
        heading: "H",
        description: "D",
        shortBadge: "B",
        ariaHeadingOverride: "",
      } as VariantEntry,
      out,
    );
    expect(
      out.some(
        (v) =>
          v.path === "TRANSLATIONS.local.ariaHeadingOverride" && v.reason === "empty-optional-value",
      ),
    ).toBe(true);
  });

  it("checkVariantEntry flaguje undeclared-key dla nieznanego pola", () => {
    const out: Violation[] = [];
    checkVariantEntry(
      "pl",
      "local",
      {
        heading: "H",
        description: "D",
        shortBadge: "B",
        // celowo niezadeklarowane pole:
        legacyAlias: "X",
      } as unknown as VariantEntry,
      out,
    );
    expect(out.some((v) => v.path.endsWith(".legacyAlias") && v.reason === "undeclared-key")).toBe(
      true,
    );
  });

  it("checkTimeLineEntry wykrywa wszystkie 3 brakujące klucze osobno", () => {
    const out: Violation[] = [];
    checkTimeLineEntry("pl", {}, out);
    const missing = out.filter((v) => v.reason === "missing-required-key").map((v) => v.path);
    expect(missing).toContain("TIME_LINE.timePrefix");
    expect(missing).toContain("TIME_LINE.relativeQualifier");
    expect(missing).toContain("TIME_LINE.relativeHelpTitle");
  });

  it("checkTimeLineEntry wykrywa wrong-type (np. number zamiast string)", () => {
    const out: Violation[] = [];
    checkTimeLineEntry(
      "pl",
      { timePrefix: 42, relativeQualifier: "(x)", relativeHelpTitle: "y".repeat(15) },
      out,
    );
    expect(out.some((v) => v.path === "TIME_LINE.timePrefix" && v.reason === "wrong-type")).toBe(
      true,
    );
  });

  it("formatViolations agreguje, sortuje i opisuje naruszenia", () => {
    const sample: Violation[] = [
      { locale: "it", path: "TRANSLATIONS.local.shortBadge", reason: "missing-required-key" },
      { locale: "de", path: "TIME_LINE.relativeHelpTitle", reason: "empty-required-value" },
    ];
    const out = formatViolations(sample);
    expect(out).toContain("2 issue(s) across 2 locale(s)");
    expect(out).toContain("locale=de");
    expect(out).toContain("locale=it");
    expect(out).toContain("path=TIME_LINE.relativeHelpTitle");
    expect(out).toContain("path=TRANSLATIONS.local.shortBadge");
    // Deterministyczne sortowanie: de przed it.
    expect(out.indexOf("locale=de")).toBeLessThan(out.indexOf("locale=it"));
  });

  it("formatViolations zwraca pusty string dla pustej listy (zielony przebieg)", () => {
    expect(formatViolations([])).toBe("");
  });
});
