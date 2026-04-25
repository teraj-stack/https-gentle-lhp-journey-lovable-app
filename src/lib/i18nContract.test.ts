/**
 * I18N CONTRACT TEST — fail-fast guard against missing translation keys.
 *
 * Cel: NIE pozwolić scalić (merge / build / CI) kodu, w którym dodano nowy
 * język do `Locale` / `SUPPORTED_LOCALES`, ale nie dopisano kompletu kluczy
 * w `TRANSLATIONS` (`lastChangeTooltipContent.ts`) lub `TIME_LINE_TRANSLATIONS`
 * (`lastChangeTooltipModel.ts`). TypeScript wymusza shape `Record<Locale, …>`,
 * ale NIE łapie literałów pustych ("") ani białych znaków — a to one rozwalają
 * UI (osierocony prefiks „Czas: " bez wartości, badge bez tekstu, ariaText
 * z pustą linią). Ten test runtime'owo sprawdza każdy klucz dla każdego
 * locale i blokuje regresje.
 *
 * CI-FRIENDLY REPORTING (od kontraktu v2)
 * ---------------------------------------
 * Zamiast wywalać się na PIERWSZYM brakującym kluczu (co maskowało resztę
 * problemów i wymuszało wielokrotne iteracje przez CI), test AGREGUJE
 * wszystkie naruszenia per locale × klucz × powód i raportuje je jako
 * jedną, deterministyczną tabelę w komunikacie błędu. Format:
 *
 *   ❌ i18n contract violations (3 issue(s) across 2 locale(s)):
 *
 *     locale=de  key=remote.shortBadge        reason=empty-string
 *     locale=de  key=ariaHeading[local]       reason=missing-source-prefix  expected="Quelle: "
 *     locale=it  key=timeLine.relativeHelp    reason=too-short  got="X" (1 chars, min 10)
 *
 *   FIX: dopisz brakujące wartości w TRANSLATIONS / TIME_LINE_TRANSLATIONS
 *   dla wymienionych locale i uruchom `bunx vitest run i18nContract` ponownie.
 *
 * Dzięki temu jednym uruchomieniem CI dev wie DOKŁADNIE które locale × klucze
 * trzeba uzupełnić — bez gry w „fix one, find next".
 *
 * Kontrakt walidacji (per locale ∈ SUPPORTED_LOCALES):
 *
 *  CONTENT (`getLastChangeTooltipContent`):
 *   - `heading`, `description`, `ariaHeading`, `shortBadge` — string,
 *     niepusty po `trim()`, nie zawiera „undefined"/„null"/„[object" (artefakty
 *     po przypadkowym `${value}` na undefined).
 *   - `ariaHeading` zaczyna się od `sourcePrefix` (prefiks zawsze obecny w a11y).
 *   - `shortBadge` jest pojedynczym tokenem (≤16 znaków, bez spacji wewnętrznych
 *     poza myślnikiem/kropką — chip w UI musi się zmieścić obok timestampu).
 *   - local.shortBadge ≠ remote.shortBadge (badge musi rozróżniać źródła).
 *
 *  TIME LINE (przez `getTimeLinePrefix` + `composeTimeLine` + builder):
 *   - `getTimeLinePrefix(locale)` — niepusty, kończy się znakiem ": " (kontrakt
 *     formatowania, którego oczekują testy a11y i wszystkie konsumenty UI).
 *   - `relativeQualifier` (sprawdzany pośrednio przez builder w trybie fallback) —
 *     niepusty, otoczony nawiasami `( … )` lub innym czytelnym znacznikiem.
 *   - `relativeHelpTitle` (native `title` na linii czasu w fallbacku) — niepusty,
 *     dłuższy niż 10 znaków (musi być zdaniem, nie skrótem).
 *
 * Strategia: iterujemy po `SUPPORTED_LOCALES` (single source of truth) i dla
 * każdego locale wywołujemy publiczne helpery z OBOMA wariantami `source`
 * (local + remote). Jeśli w przyszłości dojdzie nowy język:
 *   1. TS zmusi do dopisania wpisów w `TRANSLATIONS` / `TIME_LINE_TRANSLATIONS`.
 *   2. Ten test automatycznie obejmie nowy locale (bo iteruje po `SUPPORTED_LOCALES`).
 *   3. Jeśli ktoś doda klucz pusty / placeholder typu "TODO" — ten test padnie
 *      z pełną listą wszystkich naruszeń.
 *
 * Test jest dodatkowo użyty jako BUILD-TIME guard: vitest run jest częścią
 * standardowego CI, więc niekompletne tłumaczenie zatrzymuje deploy.
 */
import { describe, it, expect } from "vitest";
import {
  getLastChangeTooltipContent,
  resolveLocale,
  SUPPORTED_LOCALES,
  type Locale,
} from "./lastChangeTooltipContent";
import {
  getTimeLinePrefix,
  composeTimeLine,
  buildLastChangeTooltipModel,
} from "./lastChangeTooltipModel";

// Mapa oczekiwanych prefiksów źródła per locale — sanity-check, że
// `ariaHeading` faktycznie zaczyna się znanym prefiksem (nie domyślnym PL
// fallbackiem). Jeżeli ktoś doda nowy język i zapomni dopisać tu wpisu,
// poniższy test (`expectedSourcePrefixes coverage`) złapie to.
const EXPECTED_SOURCE_PREFIXES: Record<Locale, string> = {
  pl: "Źródło: ",
  en: "Source: ",
  de: "Quelle: ",
  it: "Origine: ",
};

const EXPECTED_TIME_PREFIXES: Record<Locale, string> = {
  pl: "Czas: ",
  en: "Time: ",
  de: "Zeit: ",
  it: "Ora: ",
};

const FORBIDDEN_PLACEHOLDERS = [
  "undefined",
  "null",
  "[object",
  "NaN",
  "TODO",
  "FIXME",
  "{{",
  "}}",
];

const SHORT_BADGE_MAX_LEN = 16;
const HELP_TITLE_MIN_LEN = 10;

// ---------------------------------------------------------------------------
// REPORT INFRASTRUCTURE
// ---------------------------------------------------------------------------
// Zbieramy wszystkie naruszenia jako struktury, żeby na końcu sformatować je
// w jeden czytelny komunikat. Każde naruszenie ma stabilną kolejność pól
// (locale → key → reason → kontekst), żeby diff w CI był deterministyczny.

type ViolationReason =
  | "missing"
  | "wrong-type"
  | "empty-string"
  | "forbidden-placeholder"
  | "missing-source-prefix"
  | "too-long"
  | "contains-whitespace"
  | "duplicate-across-variants"
  | "wrong-suffix"
  | "missing-qualifier-parens"
  | "too-short"
  | "orphan-prefix";

interface Violation {
  locale: Locale;
  /** Logiczna ścieżka klucza, np. "remote.shortBadge", "timeLine.prefix". */
  key: string;
  reason: ViolationReason;
  /** Co znaleziono (dla debugowania). */
  got?: string;
  /** Co było oczekiwane (jeśli ma sens). */
  expected?: string;
  /** Dodatkowy kontekst (np. „1 chars, min 10"). */
  detail?: string;
}

const formatViolations = (violations: Violation[]): string => {
  if (violations.length === 0) return "";
  const localesAffected = new Set(violations.map((v) => v.locale));
  const header = `❌ i18n contract violations (${violations.length} issue(s) across ${localesAffected.size} locale(s)):`;

  // Sort: locale (alfabetycznie) → key → reason. Stabilny output dla CI diff.
  const sorted = [...violations].sort((a, b) => {
    if (a.locale !== b.locale) return a.locale.localeCompare(b.locale);
    if (a.key !== b.key) return a.key.localeCompare(b.key);
    return a.reason.localeCompare(b.reason);
  });

  // Wyrównanie kolumn dla czytelności w terminalu CI.
  const localeW = Math.max(...sorted.map((v) => `locale=${v.locale}`.length));
  const keyW = Math.max(...sorted.map((v) => `key=${v.key}`.length));
  const reasonW = Math.max(...sorted.map((v) => `reason=${v.reason}`.length));

  const rows = sorted.map((v) => {
    const parts = [
      `locale=${v.locale}`.padEnd(localeW),
      `key=${v.key}`.padEnd(keyW),
      `reason=${v.reason}`.padEnd(reasonW),
    ];
    if (v.expected !== undefined) parts.push(`expected=${JSON.stringify(v.expected)}`);
    if (v.got !== undefined) parts.push(`got=${JSON.stringify(v.got)}`);
    if (v.detail) parts.push(v.detail);
    return "  " + parts.join("  ");
  });

  const fix =
    "\n  FIX: dopisz brakujące wartości w TRANSLATIONS / TIME_LINE_TRANSLATIONS\n" +
    "  dla wymienionych locale i uruchom `bunx vitest run i18nContract` ponownie.";

  return [header, "", ...rows, fix].join("\n");
};

// Małe helpery — NIE wywołują expect, tylko zwracają listę naruszeń. Dzięki
// temu wszystkie locale × klucze są sprawdzane w JEDNYM przebiegu i raport
// agreguje WSZYSTKIE problemy.

const checkNonEmptyString = (
  locale: Locale,
  key: string,
  value: unknown,
  out: Violation[],
): value is string => {
  if (typeof value !== "string") {
    out.push({ locale, key, reason: "wrong-type", got: String(value) });
    return false;
  }
  if (value.trim().length === 0) {
    out.push({ locale, key, reason: "empty-string", got: JSON.stringify(value) });
    return false;
  }
  return true;
};

const checkNoPlaceholders = (
  locale: Locale,
  key: string,
  value: string,
  out: Violation[],
) => {
  for (const bad of FORBIDDEN_PLACEHOLDERS) {
    if (value.toLowerCase().includes(bad.toLowerCase())) {
      out.push({
        locale,
        key,
        reason: "forbidden-placeholder",
        got: value,
        detail: `contains "${bad}"`,
      });
      return;
    }
  }
};

// ---------------------------------------------------------------------------
// COVERAGE TESTS — meta-check, że mapy w TEŚCIE pokrywają SUPPORTED_LOCALES.
// (Te trzy testy zostawiamy jako one-shot expecty — są tanie i pomagają
// wskazać konkretną mapę do uzupełnienia w teście.)
// ---------------------------------------------------------------------------

describe("i18n contract — SUPPORTED_LOCALES coverage", () => {
  it("EXPECTED_SOURCE_PREFIXES pokrywa każdy locale z SUPPORTED_LOCALES", () => {
    const missing = SUPPORTED_LOCALES.filter((l) => !EXPECTED_SOURCE_PREFIXES[l]);
    expect(
      missing,
      `Brakuje EXPECTED_SOURCE_PREFIXES dla: ${missing.join(", ")} — dopisz w teście razem z dodaniem locale.`,
    ).toEqual([]);
  });

  it("EXPECTED_TIME_PREFIXES pokrywa każdy locale z SUPPORTED_LOCALES", () => {
    const missing = SUPPORTED_LOCALES.filter((l) => !EXPECTED_TIME_PREFIXES[l]);
    expect(
      missing,
      `Brakuje EXPECTED_TIME_PREFIXES dla: ${missing.join(", ")} — dopisz w teście razem z dodaniem locale.`,
    ).toEqual([]);
  });

  it("resolveLocale zwraca dokładnie ten locale dla każdego wpisu z SUPPORTED_LOCALES", () => {
    const broken = SUPPORTED_LOCALES.filter((l) => resolveLocale(l) !== l);
    expect(
      broken,
      `resolveLocale nie zwraca poprawnego locale dla: ${broken.join(", ")}`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// CONTENT KEYS — agregat wszystkich naruszeń dla TRANSLATIONS.
// ---------------------------------------------------------------------------

describe("i18n contract — content keys per locale (aggregated report)", () => {
  it("wszystkie content keys są kompletne dla każdego locale × source", () => {
    const violations: Violation[] = [];

    for (const locale of SUPPORTED_LOCALES) {
      const expectedPrefix = EXPECTED_SOURCE_PREFIXES[locale];
      const badges: Record<"local" | "remote", string | null> = { local: null, remote: null };

      for (const source of ["local", "remote"] as const) {
        const c = getLastChangeTooltipContent(source, locale);
        const tag = `[${source}]`;

        // Wymagane klucze — niepuste, poprawnego typu, bez placeholderów.
        for (const k of ["heading", "description", "ariaHeading", "shortBadge"] as const) {
          const fullKey = `${k}${tag}`;
          if (checkNonEmptyString(locale, fullKey, c[k], violations)) {
            checkNoPlaceholders(locale, fullKey, c[k] as string, violations);
          }
        }

        // ariaHeading zaczyna się znanym source prefix.
        if (typeof c.ariaHeading === "string" && !c.ariaHeading.startsWith(expectedPrefix)) {
          violations.push({
            locale,
            key: `ariaHeading${tag}`,
            reason: "missing-source-prefix",
            expected: expectedPrefix,
            got: c.ariaHeading,
          });
        }

        // shortBadge: krótki, bez wewnętrznych spacji.
        if (typeof c.shortBadge === "string") {
          if (c.shortBadge.length > SHORT_BADGE_MAX_LEN) {
            violations.push({
              locale,
              key: `shortBadge${tag}`,
              reason: "too-long",
              got: c.shortBadge,
              detail: `${c.shortBadge.length} chars, max ${SHORT_BADGE_MAX_LEN}`,
            });
          }
          if (/\s/.test(c.shortBadge)) {
            violations.push({
              locale,
              key: `shortBadge${tag}`,
              reason: "contains-whitespace",
              got: c.shortBadge,
            });
          }
          badges[source] = c.shortBadge;
        }

        // Sanity: locale wynikowy = locale wejściowy (jeśli różny, treść
        // została podmieniona przez fallback — błąd kontraktu).
        if (c.locale !== locale) {
          violations.push({
            locale,
            key: `locale${tag}`,
            reason: "wrong-type",
            expected: locale,
            got: c.locale,
          });
        }
      }

      // local.shortBadge ≠ remote.shortBadge — badge musi rozróżniać źródła.
      if (badges.local && badges.remote && badges.local === badges.remote) {
        violations.push({
          locale,
          key: "shortBadge[local↔remote]",
          reason: "duplicate-across-variants",
          got: badges.local,
          detail: "local i remote mają identyczny badge — nie da się odróżnić źródła",
        });
      }
    }

    // Jedna zbiorcza asercja z pełnym raportem.
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// TIME LINE KEYS — agregat wszystkich naruszeń dla TIME_LINE_TRANSLATIONS.
// ---------------------------------------------------------------------------

describe("i18n contract — time line keys per locale (aggregated report)", () => {
  it("wszystkie time-line keys są kompletne i dobrze sformatowane dla każdego locale", () => {
    const violations: Violation[] = [];

    for (const locale of SUPPORTED_LOCALES) {
      const expectedPrefix = EXPECTED_TIME_PREFIXES[locale];

      // 1) getTimeLinePrefix
      const prefix = getTimeLinePrefix(locale);
      if (checkNonEmptyString(locale, "timeLine.prefix", prefix, violations)) {
        checkNoPlaceholders(locale, "timeLine.prefix", prefix, violations);
        if (!prefix.endsWith(": ")) {
          violations.push({
            locale,
            key: "timeLine.prefix",
            reason: "wrong-suffix",
            got: prefix,
            expected: '<text>: (kończy się ": ")',
          });
        }
        if (prefix !== expectedPrefix) {
          violations.push({
            locale,
            key: "timeLine.prefix",
            reason: "missing-source-prefix",
            got: prefix,
            expected: expectedPrefix,
          });
        }
      }

      // 2) composeTimeLine — sanity-check, że łączy prefix + value.
      const composed = composeTimeLine("12:34:56", locale);
      const expectedComposed = `${expectedPrefix}12:34:56`;
      if (composed !== expectedComposed) {
        violations.push({
          locale,
          key: "timeLine.composed",
          reason: "wrong-suffix",
          got: composed,
          expected: expectedComposed,
        });
      }

      // 3) builder w trybie fallback — sprawdzamy relativeQualifier i helpTitle.
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: null,
        relativeLabel: "2 min temu",
        locale,
      });

      if (!model.shouldRenderTimeLine) {
        violations.push({
          locale,
          key: "timeLine.shouldRenderTimeLine",
          reason: "wrong-type",
          got: "false",
          expected: "true (fallback z relativeLabel powinien renderować linię)",
        });
      }
      if (!model.isRelativeFallback) {
        violations.push({
          locale,
          key: "timeLine.isRelativeFallback",
          reason: "wrong-type",
          got: "false",
          expected: "true",
        });
      }

      // relativeHelpTitle: niepusty, ≥ HELP_TITLE_MIN_LEN znaków, bez placeholderów.
      const helpTitle = model.timeLineHelpTitle ?? "";
      if (checkNonEmptyString(locale, "timeLine.relativeHelpTitle", helpTitle, violations)) {
        checkNoPlaceholders(locale, "timeLine.relativeHelpTitle", helpTitle, violations);
        if (helpTitle.length < HELP_TITLE_MIN_LEN) {
          violations.push({
            locale,
            key: "timeLine.relativeHelpTitle",
            reason: "too-short",
            got: helpTitle,
            detail: `${helpTitle.length} chars, min ${HELP_TITLE_MIN_LEN}`,
          });
        }
      }

      // ariaText zawiera relativeQualifier — wymagamy nawiasów „(…)".
      if (typeof model.ariaText === "string") {
        if (!/\([^)]+\)/.test(model.ariaText)) {
          violations.push({
            locale,
            key: "timeLine.relativeQualifier",
            reason: "missing-qualifier-parens",
            got: model.ariaText,
            expected: 'ariaText powinien zawierać qualifier w nawiasach "(...)"',
          });
        }

        // ariaText nie ma osieroconego prefiksu „<TimePrefix>" bez treści.
        const orphanPattern = new RegExp(
          `${expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
          "m",
        );
        if (orphanPattern.test(model.ariaText)) {
          violations.push({
            locale,
            key: "timeLine.ariaText",
            reason: "orphan-prefix",
            got: model.ariaText,
            detail: `prefix "${expectedPrefix}" bez wartości po nim`,
          });
        }
      } else {
        violations.push({
          locale,
          key: "timeLine.ariaText",
          reason: "wrong-type",
          got: String(model.ariaText),
        });
      }
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// META — symetria map EXPECTED_*.
// ---------------------------------------------------------------------------

describe("i18n contract — meta: dodanie nowego locale wymaga aktualizacji obu map", () => {
  it("każdy locale ma wpisy w obu lokalnych mapach EXPECTED i nie ma martwych wpisów", () => {
    const violations: Violation[] = [];
    const sourceKeys = Object.keys(EXPECTED_SOURCE_PREFIXES) as Locale[];
    const timeKeys = Object.keys(EXPECTED_TIME_PREFIXES) as Locale[];

    for (const locale of SUPPORTED_LOCALES) {
      if (!sourceKeys.includes(locale)) {
        violations.push({
          locale,
          key: "EXPECTED_SOURCE_PREFIXES",
          reason: "missing",
          detail: "dopisz wpis w teście",
        });
      }
      if (!timeKeys.includes(locale)) {
        violations.push({
          locale,
          key: "EXPECTED_TIME_PREFIXES",
          reason: "missing",
          detail: "dopisz wpis w teście",
        });
      }
    }
    for (const k of sourceKeys) {
      if (!SUPPORTED_LOCALES.includes(k)) {
        violations.push({
          locale: k,
          key: "EXPECTED_SOURCE_PREFIXES",
          reason: "wrong-type",
          detail: "martwy wpis — usuń z mapy w teście",
        });
      }
    }
    for (const k of timeKeys) {
      if (!SUPPORTED_LOCALES.includes(k)) {
        violations.push({
          locale: k,
          key: "EXPECTED_TIME_PREFIXES",
          reason: "wrong-type",
          detail: "martwy wpis — usuń z mapy w teście",
        });
      }
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SELF-TEST — dowodzimy, że agregator faktycznie potrafi wykryć i sformatować
// brakujące klucze. Bez tego refaktor formatowania mógłby po cichu zepsuć
// raport (puste violations[] = zielono, mimo że logika rotuje się w błąd).
// ---------------------------------------------------------------------------

describe("i18n contract — formatViolations self-test", () => {
  it("sformatowany raport zawiera locale, klucz i powód dla każdego naruszenia", () => {
    const sample: Violation[] = [
      { locale: "de", key: "remote.shortBadge", reason: "empty-string" },
      {
        locale: "it",
        key: "timeLine.relativeHelpTitle",
        reason: "too-short",
        got: "X",
        detail: "1 chars, min 10",
      },
    ];
    const out = formatViolations(sample);
    expect(out).toContain("2 issue(s) across 2 locale(s)");
    expect(out).toContain("locale=de");
    expect(out).toContain("key=remote.shortBadge");
    expect(out).toContain("reason=empty-string");
    expect(out).toContain("locale=it");
    expect(out).toContain("reason=too-short");
    expect(out).toContain("1 chars, min 10");
    // Deterministyczna kolejność: de przed it.
    expect(out.indexOf("locale=de")).toBeLessThan(out.indexOf("locale=it"));
  });

  it("pusta lista naruszeń zwraca pusty string (nic nie raportujemy gdy zielono)", () => {
    expect(formatViolations([])).toBe("");
  });
});
