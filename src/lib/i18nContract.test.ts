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
 *   3. Jeśli ktoś doda klucz pusty / placeholder typu "TODO" — ten test padnie.
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

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const containsNoPlaceholders = (s: string) => {
  for (const bad of FORBIDDEN_PLACEHOLDERS) {
    expect(
      s.toLowerCase().includes(bad.toLowerCase()),
      `Translation string "${s}" contains forbidden placeholder "${bad}"`,
    ).toBe(false);
  }
};

describe("i18n contract — SUPPORTED_LOCALES coverage", () => {
  it("EXPECTED_SOURCE_PREFIXES pokrywa każdy locale z SUPPORTED_LOCALES", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(
        EXPECTED_SOURCE_PREFIXES[locale],
        `Brakuje EXPECTED_SOURCE_PREFIXES dla "${locale}" — dopisz w teście razem z dodaniem locale.`,
      ).toBeDefined();
    }
  });

  it("EXPECTED_TIME_PREFIXES pokrywa każdy locale z SUPPORTED_LOCALES", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(
        EXPECTED_TIME_PREFIXES[locale],
        `Brakuje EXPECTED_TIME_PREFIXES dla "${locale}" — dopisz w teście razem z dodaniem locale.`,
      ).toBeDefined();
    }
  });

  it("resolveLocale zwraca dokładnie ten locale dla każdego wpisu z SUPPORTED_LOCALES", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(resolveLocale(locale)).toBe(locale);
    }
  });
});

describe("i18n contract — content keys per locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const source of ["local", "remote"] as const) {
      it(`[${locale}/${source}] heading/description/ariaHeading/shortBadge są niepuste i bez placeholderów`, () => {
        const c = getLastChangeTooltipContent(source, locale);

        // Wszystkie wymagane klucze obecne i niepuste.
        expect(isNonEmptyString(c.heading), `heading pusty dla ${locale}/${source}`).toBe(true);
        expect(isNonEmptyString(c.description), `description pusty dla ${locale}/${source}`).toBe(true);
        expect(isNonEmptyString(c.ariaHeading), `ariaHeading pusty dla ${locale}/${source}`).toBe(true);
        expect(isNonEmptyString(c.shortBadge), `shortBadge pusty dla ${locale}/${source}`).toBe(true);

        // Brak technicznych artefaktów.
        containsNoPlaceholders(c.heading);
        containsNoPlaceholders(c.description);
        containsNoPlaceholders(c.ariaHeading);
        containsNoPlaceholders(c.shortBadge);

        // ariaHeading musi zaczynać się znanym sourcePrefix (locale-aware).
        expect(
          c.ariaHeading.startsWith(EXPECTED_SOURCE_PREFIXES[locale]),
          `ariaHeading="${c.ariaHeading}" nie zaczyna się od "${EXPECTED_SOURCE_PREFIXES[locale]}" (locale=${locale})`,
        ).toBe(true);

        // shortBadge: krótki, bez wewnętrznych spacji (chip ma jeden token).
        expect(c.shortBadge.length, `shortBadge za długi: "${c.shortBadge}"`).toBeLessThanOrEqual(16);
        expect(
          /\s/.test(c.shortBadge),
          `shortBadge "${c.shortBadge}" zawiera whitespace — chip musi być pojedynczym tokenem`,
        ).toBe(false);

        // locale wynikowy = locale wejściowy (sanity).
        expect(c.locale).toBe(locale);
      });
    }

    it(`[${locale}] local.shortBadge ≠ remote.shortBadge`, () => {
      const local = getLastChangeTooltipContent("local", locale).shortBadge;
      const remote = getLastChangeTooltipContent("remote", locale).shortBadge;
      expect(local, `local i remote shortBadge są identyczne dla ${locale}`).not.toBe(remote);
    });
  }
});

describe("i18n contract — time line keys per locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    it(`[${locale}] getTimeLinePrefix → niepusty, kończy się ": "`, () => {
      const prefix = getTimeLinePrefix(locale);
      expect(isNonEmptyString(prefix)).toBe(true);
      expect(prefix.endsWith(": "), `prefix "${prefix}" musi kończyć się ": "`).toBe(true);
      expect(prefix).toBe(EXPECTED_TIME_PREFIXES[locale]);
      containsNoPlaceholders(prefix);
    });

    it(`[${locale}] composeTimeLine z wartością → "<prefix><value>"`, () => {
      const line = composeTimeLine("12:34:56", locale);
      expect(line).toBe(`${EXPECTED_TIME_PREFIXES[locale]}12:34:56`);
    });

    it(`[${locale}] builder w trybie fallback (relative) → niepusty relativeQualifier i helpTitle`, () => {
      // Ścieżka fallback: brak fullDate, jest relativeLabel — builder
      // dokleja relativeQualifier do a11y i ustawia relativeHelpTitle
      // jako native title linii czasu. Oba klucze MUSZĄ istnieć w
      // TIME_LINE_TRANSLATIONS dla tego locale.
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: null,
        relativeLabel: "2 min temu",
        locale,
      });

      expect(model.shouldRenderTimeLine, `shouldRenderTimeLine=false dla ${locale} fallback`).toBe(true);
      expect(model.isRelativeFallback).toBe(true);

      // Native title — niepusty, ≥10 znaków, bez placeholderów.
      expect(isNonEmptyString(model.timeLineHelpTitle), `timeLineHelpTitle pusty dla ${locale}`).toBe(true);
      expect(
        (model.timeLineHelpTitle ?? "").length,
        `timeLineHelpTitle za krótki dla ${locale}: "${model.timeLineHelpTitle}"`,
      ).toBeGreaterThanOrEqual(10);
      containsNoPlaceholders(model.timeLineHelpTitle ?? "");

      // ariaText zawiera relativeQualifier — sprawdzamy obecność nawiasu
      // otwierającego i zamykającego po prefiksie czasu (każdy locale
      // używa konwencji „(…)" dla qualifiera).
      expect(model.ariaText).toMatch(/\([^)]+\)/);

      // ariaText nie ma osieroconego prefiksu „<TimePrefix>" bez treści.
      const orphanPattern = new RegExp(
        `${EXPECTED_TIME_PREFIXES[locale].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        "m",
      );
      expect(
        orphanPattern.test(model.ariaText),
        `ariaText ma osierocony prefiks dla ${locale}: "${model.ariaText}"`,
      ).toBe(false);
    });
  }
});

describe("i18n contract — meta: dodanie nowego locale wymaga aktualizacji obu map", () => {
  // Liczność SUPPORTED_LOCALES jest świadomą decyzją — gdy ktoś rozszerza
  // listę, MUSI pamiętać o dopisaniu wpisów w obu mapach. Ten test nie
  // jest twardym progiem (nie blokujemy dodania nowego locale), ale służy
  // jako check-suma: wymusza aktualizację `EXPECTED_*_PREFIXES` w teście.
  it("każdy locale ma wpisy w obu lokalnych mapach EXPECTED", () => {
    const sourceKeys = Object.keys(EXPECTED_SOURCE_PREFIXES) as Locale[];
    const timeKeys = Object.keys(EXPECTED_TIME_PREFIXES) as Locale[];
    for (const locale of SUPPORTED_LOCALES) {
      expect(sourceKeys, `EXPECTED_SOURCE_PREFIXES nie zawiera "${locale}"`).toContain(locale);
      expect(timeKeys, `EXPECTED_TIME_PREFIXES nie zawiera "${locale}"`).toContain(locale);
    }
    // Symetrycznie: nie ma wpisów dla locale, którego nie ma w
    // SUPPORTED_LOCALES (zapobiega zostawieniu martwych wpisów po
    // usunięciu locale).
    for (const k of sourceKeys) {
      expect(SUPPORTED_LOCALES, `EXPECTED_SOURCE_PREFIXES ma martwy wpis "${k}"`).toContain(k);
    }
    for (const k of timeKeys) {
      expect(SUPPORTED_LOCALES, `EXPECTED_TIME_PREFIXES ma martwy wpis "${k}"`).toContain(k);
    }
  });
});
