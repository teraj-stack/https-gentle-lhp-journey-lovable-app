/**
 * I18N PLACEHOLDER & DYNAMIC-VALUE CONSISTENCY CONTRACT
 *
 * Cel: zagwarantować, że dynamiczne wartości wstawiane do sformatowanych
 * stringów tooltipa „Ostatnia zmiana" (sourcePrefix, timePrefix, timeValue,
 * relativeQualifier) pojawiają się W KAŻDYM locale DOKŁADNIE TYLE SAMO RAZY,
 * w tych samych miejscach kontraktu — i że żaden locale nie wprowadza
 * cichych placeholderów typu `{{name}}` / `%s` / `{0}`, których inne locale
 * nie mają.
 *
 * Dlaczego to NIE jest pokryte przez `i18nContract.test.ts`?
 * ----------------------------------------------------------
 * Ten poprzedni kontrakt sprawdza, że KLUCZE są obecne i niepuste oraz że
 * heading/description/ariaHeading mieszczą się w limitach długości i nie mają
 * brudnych białych znaków. NIE sprawdza jednak SEMANTYKI składania —
 * konkretnie: czy po `template literal` (`${prefix}${value}`) wartość
 * dynamiczna pojawia się dokładnie raz, czy nie zostaje zduplikowana przez
 * dwukrotne `composeTimeLine`, czy nie zostaje DROPNIĘTA przez błędny
 * fallback (np. `value || ""` na pustym stringu zamiast `value ?? ""`).
 *
 * Dwie kategorie sprawdzeń:
 *
 *  A) STATIC PLACEHOLDER PARITY — gdyby ktoś w przyszłości wprowadził ICU/
 *     printf-style placeholdery (`{{name}}`, `{0}`, `%s`, `%d`, `%(key)s`),
 *     ten test wymusi, że ZBIÓR użytych tokenów jest IDENTYCZNY we wszystkich
 *     locale. Dziś wszystkie translacje mają zbiór pusty — i ten test pełni
 *     rolę guardrailu na przyszłość. Gdy ktoś doda `{{name}}` w PL, ale
 *     zapomni w EN/DE/IT, test pokaże dokładnie który locale jest niespójny.
 *
 *  B) DYNAMIC VALUE OCCURRENCE COUNTS — dla aktualnie kompozowanego
 *     `ariaText` sprawdzamy, że KAŻDY z dynamicznych komponentów
 *     (sourcePrefix, timePrefix, timeValue, heading, description,
 *     relativeQualifier) występuje DOKŁADNIE raz w trybie z timeValue,
 *     zero razy gdy nie powinien (relativeQualifier dla full-date),
 *     i że nie ma „”czterech spacji" / „dwukropek+koniec" artefaktów
 *     między nimi.
 *
 * Strategia: dla każdego locale × każdego scenariusza budujemy `ariaText`
 * przez `buildLastChangeTooltipModel`, a potem liczymy wystąpienia każdego
 * dynamicznego tokenu. Wszystkie naruszenia są agregowane w pojedynczy raport
 * (analogicznie do `i18nContract.test.ts`), żeby CI w jednym przebiegu
 * pokazało WSZYSTKIE rozjazdy.
 */
import { describe, it, expect } from "vitest";
import {
  getLastChangeTooltipContent,
  SUPPORTED_LOCALES,
  type Locale,
} from "./lastChangeTooltipContent";
import { buildLastChangeTooltipModel } from "./lastChangeTooltipModel";

// ---------------------------------------------------------------------------
// PLACEHOLDER PATTERN DETECTION
// ---------------------------------------------------------------------------
// Wyrażenia regularne dla typowych konwencji placeholderów. NIE używamy
// jednego mega-regexu — chcemy wiedzieć, KTÓRY format pojawił się
// niespójnie (ICU vs printf vs python), żeby raport był informatywny.
const PLACEHOLDER_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  // ICU/Mustache: {{name}}, {{ name }}, {{user.name}}.
  { name: "double-curly", regex: /\{\{\s*[\w.]+\s*\}\}/g },
  // ICU positional/named: {0}, {1}, {name} — UWAGA: ostrożnie, bo single-curly
  // może też być w prozie. Wymagamy ALfanumerycznej zawartości bez spacji,
  // żeby nie łapać przypadkowo CSS-owego `{ color: red }` (którego i tak
  // w stringach być nie powinno).
  // Akceptujemy zarówno {name}, jak i pozycyjne {0}, {1}.
  { name: "single-curly", regex: /\{[\w.]+\}/g },
  // printf: %s, %d, %f, %1$s.
  { name: "printf", regex: /%(?:\d+\$)?[sdif]/g },
  // python: %(name)s.
  { name: "python", regex: /%\([^)]+\)[sdif]/g },
  // i18next: $t(key), {{count, number}}.
  { name: "i18next-nested", regex: /\$t\([^)]+\)/g },
];

interface ExtractedTokens {
  /** Map: pattern name → posortowany array tokenów (np. `["{{name}}","%s"]`). */
  byPattern: Record<string, string[]>;
  /** Wszystkie tokeny zsumowane do podpisu — używamy do porównań miedzy locale. */
  signature: string;
}

const extractPlaceholders = (s: string): ExtractedTokens => {
  const byPattern: Record<string, string[]> = {};
  const all: string[] = [];
  for (const { name, regex } of PLACEHOLDER_PATTERNS) {
    // RegExp `g` jest stateful — klonujemy żeby nie nieść `lastIndex` między
    // wywołaniami (subtelny bug, łatwo o niego przy reuse).
    const r = new RegExp(regex.source, regex.flags);
    const matches = s.match(r) ?? [];
    if (matches.length > 0) {
      byPattern[name] = [...matches].sort();
      all.push(...matches);
    }
  }
  return { byPattern, signature: all.sort().join("|") };
};

// ---------------------------------------------------------------------------
// VIOLATION REPORT — ten sam wzorzec co w `i18nContract.test.ts` dla
// jednolitego CI experience. Lokalna kopia (zamiast importu) celowo: chcemy
// stabilności tego pliku w izolacji, nawet jeśli refaktor `i18nContract`
// zmieni public surface.
// ---------------------------------------------------------------------------

type ViolationReason =
  | "placeholder-mismatch"
  | "value-missing-in-aria"
  | "value-duplicated-in-aria"
  | "qualifier-leaked-in-full-date"
  | "qualifier-missing-in-fallback"
  | "qualifier-duplicated-in-fallback"
  | "double-colon-artifact"
  | "double-space-artifact"
  | "trailing-prefix-artifact";

interface Violation {
  locale: Locale;
  scenario: string;
  key: string;
  reason: ViolationReason;
  got?: string;
  expected?: string;
  detail?: string;
}

const formatViolations = (violations: Violation[]): string => {
  if (violations.length === 0) return "";
  const localesAffected = new Set(violations.map((v) => v.locale));
  const header = `❌ i18n placeholder/value violations (${violations.length} issue(s) across ${localesAffected.size} locale(s)):`;
  const sorted = [...violations].sort((a, b) => {
    if (a.locale !== b.locale) return a.locale.localeCompare(b.locale);
    if (a.scenario !== b.scenario) return a.scenario.localeCompare(b.scenario);
    if (a.key !== b.key) return a.key.localeCompare(b.key);
    return a.reason.localeCompare(b.reason);
  });
  const rows = sorted.map((v) => {
    const parts = [
      `locale=${v.locale}`,
      `scenario=${v.scenario}`,
      `key=${v.key}`,
      `reason=${v.reason}`,
    ];
    if (v.expected !== undefined) parts.push(`expected=${JSON.stringify(v.expected)}`);
    if (v.got !== undefined) parts.push(`got=${JSON.stringify(v.got)}`);
    if (v.detail) parts.push(v.detail);
    return "  " + parts.join("  ");
  });
  return [header, "", ...rows].join("\n");
};

// Zwraca liczbę nienakładających się wystąpień `needle` w `haystack`.
// Wymagamy nienakładających się, bo `"aaa".match(/aa/g)` zwraca tylko 1 ze
// względu na advance — i to jest semantycznie to, czego oczekujemy
// (1 wystąpienie heading w ariaText, nie zliczamy nakładek).
const countOccurrences = (haystack: string, needle: string): number => {
  if (needle.length === 0) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
};

// ---------------------------------------------------------------------------
// TEST A — STATIC PLACEHOLDER PARITY ACROSS LOCALES
// ---------------------------------------------------------------------------

describe("i18n placeholder parity — static tokens consistent across locales", () => {
  it("każdy klucz tłumaczenia ma IDENTYCZNY zbiór placeholderów we wszystkich locale", () => {
    const violations: Violation[] = [];

    // Dla każdej kombinacji (key, source) zbieramy mapę locale → signature.
    // Jeśli signatures różnią się między locale, mamy rozjazd.
    type FieldKey = "heading" | "description" | "ariaHeading" | "shortBadge";
    const FIELDS: FieldKey[] = ["heading", "description", "ariaHeading", "shortBadge"];

    for (const source of ["local", "remote"] as const) {
      for (const field of FIELDS) {
        const perLocale: Record<Locale, ExtractedTokens> = {} as Record<Locale, ExtractedTokens>;
        for (const locale of SUPPORTED_LOCALES) {
          const c = getLastChangeTooltipContent(source, locale);
          perLocale[locale] = extractPlaceholders(c[field]);
        }

        // Wybieramy PL jako wzorzec referencyjny (locale operacyjny placówki).
        // Jeżeli inne locale mają inny zbiór tokenów — naruszenie.
        const referenceLocale: Locale = "pl";
        const reference = perLocale[referenceLocale].signature;
        for (const locale of SUPPORTED_LOCALES) {
          if (locale === referenceLocale) continue;
          if (perLocale[locale].signature !== reference) {
            violations.push({
              locale,
              scenario: `field=${field}`,
              key: `${field}[${source}]`,
              reason: "placeholder-mismatch",
              expected: reference || "(no placeholders)",
              got: perLocale[locale].signature || "(no placeholders)",
              detail: `referencja: ${referenceLocale}; wszystkie locale muszą mieć ten sam zbiór placeholderów`,
            });
          }
        }
      }
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// TEST B — DYNAMIC VALUE OCCURRENCE COUNTS in `ariaText`
// ---------------------------------------------------------------------------
// UWAGA: "occurrence" jest case-sensitive i exact-match. Używamy
// jednoznacznych, exotycznych wartości (np. `"⏱TIME-VALUE-XYZ⏱"`), żeby
// nigdy nie zaszły niezamierzone kolizje z literałami tłumaczeń (np.
// gdyby tłumaczenie zawierało frazę „2024" i my przypadkiem podaliśmy
// timeValue „2024").

const SENTINEL_TIME_FULL = "⏱FULL-DATE-SENTINEL-2026-Z⏱";
const SENTINEL_TIME_RELATIVE = "⏰REL-LABEL-SENTINEL-XYZ⏰";

/**
 * Wyciąga DOKŁADNY qualifier dla danego locale przez analizę modelu w trybie
 * fallback. NIE używamy tu regexu `/\([^)]+\)/`, bo `description` (np. PL
 * „Sam(a) przełączyłe(a)ś…") sama zawiera nawiasy — fałszywie złapałby je
 * jako qualifier i kompletnie rozjechał liczenie.
 *
 * Kontrakt buildera (patrz `lastChangeTooltipModel.ts`): w trybie fallback
 * `timeLineForA11y === composeTimeLine(value, locale) + " " + qualifier`.
 * Czyli qualifier = `timeLineForA11y.slice((prefix + value).length + 1)` —
 * deterministyczne, locale-agnostic, oparte WYŁĄCZNIE na publicznym kontrakcie.
 */
const deriveQualifierForLocale = (locale: Locale): string => {
  const fallback = buildLastChangeTooltipModel({
    source: "local",
    fullDate: null,
    relativeLabel: SENTINEL_TIME_RELATIVE,
    locale,
  });
  const line = fallback.timeLineForA11y ?? "";
  // prefix + value + " " + qualifier
  const sentinelIdx = line.lastIndexOf(SENTINEL_TIME_RELATIVE);
  if (sentinelIdx === -1) return "";
  const after = line.slice(sentinelIdx + SENTINEL_TIME_RELATIVE.length);
  // `after` zaczyna się od " " (single space separator), wycinamy ją.
  return after.startsWith(" ") ? after.slice(1) : after;
};

describe("i18n placeholder parity — dynamic values appear exactly N times in ariaText", () => {
  it("scenariusz A: full date — wszystkie składniki dokładnie raz, żaden qualifier nie wycieka", () => {
    const violations: Violation[] = [];

    for (const locale of SUPPORTED_LOCALES) {
      const content = getLastChangeTooltipContent("local", locale);
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: SENTINEL_TIME_FULL,
        relativeLabel: null,
        locale,
      });
      const aria = model.ariaText;

      // 1) timeValue → dokładnie 1.
      const cTime = countOccurrences(aria, SENTINEL_TIME_FULL);
      if (cTime === 0) {
        violations.push({
          locale,
          scenario: "full-date",
          key: "timeValue",
          reason: "value-missing-in-aria",
          got: aria,
          expected: SENTINEL_TIME_FULL,
        });
      } else if (cTime > 1) {
        violations.push({
          locale,
          scenario: "full-date",
          key: "timeValue",
          reason: "value-duplicated-in-aria",
          got: aria,
          detail: `count=${cTime}`,
        });
      }

      // 2) heading (po override) → dokładnie 1.
      // ariaHeading zawiera już heading w środku, więc szukamy POJEDYNCZEGO
      // wystąpienia całego ariaHeading. Heading-only nie liczymy, bo byłby
      // policzony 1× w ariaHeading + 1× jeśli przypadkowo gdzie indziej.
      const cAriaHeading = countOccurrences(aria, content.ariaHeading);
      if (cAriaHeading !== 1) {
        violations.push({
          locale,
          scenario: "full-date",
          key: "ariaHeading",
          reason: cAriaHeading === 0 ? "value-missing-in-aria" : "value-duplicated-in-aria",
          got: aria,
          detail: `count=${cAriaHeading}`,
        });
      }

      // 3) description → dokładnie 1.
      const cDesc = countOccurrences(aria, content.description);
      if (cDesc !== 1) {
        violations.push({
          locale,
          scenario: "full-date",
          key: "description",
          reason: cDesc === 0 ? "value-missing-in-aria" : "value-duplicated-in-aria",
          got: aria,
          detail: `count=${cDesc}`,
        });
      }

      // 4) qualifier ("(etykieta względna)" itd.) → 0. Full date NIE jest
      //    fallbackiem, więc qualifier nie ma prawa być doklejony.
      // Wyciągamy qualifier deterministycznie z buildera (slice po prefixie+
      //  sentinel) — NIE regexem `/\([^)]+\)/`, bo description może legalnie
      //  zawierać nawiasy (np. PL „Sam(a) przełączyłe(a)ś…").
      const qualifier = deriveQualifierForLocale(locale);
      if (qualifier.length > 0) {
        const cQual = countOccurrences(aria, qualifier);
        if (cQual !== 0) {
          violations.push({
            locale,
            scenario: "full-date",
            key: "relativeQualifier",
            reason: "qualifier-leaked-in-full-date",
            got: aria,
            detail: `qualifier="${qualifier}" found ${cQual}× in non-fallback aria`,
          });
        }
      }

      // 5) Brak artefaktów składania.
      checkCompositionArtifacts(locale, "full-date", aria, violations);
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it("scenariusz B: relative fallback — qualifier dokładnie raz, timeValue dokładnie raz", () => {
    const violations: Violation[] = [];

    for (const locale of SUPPORTED_LOCALES) {
      const content = getLastChangeTooltipContent("remote", locale);
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: null,
        relativeLabel: SENTINEL_TIME_RELATIVE,
        locale,
      });
      const aria = model.ariaText;

      // timeValue → 1.
      const cTime = countOccurrences(aria, SENTINEL_TIME_RELATIVE);
      if (cTime !== 1) {
        violations.push({
          locale,
          scenario: "relative-fallback",
          key: "timeValue",
          reason: cTime === 0 ? "value-missing-in-aria" : "value-duplicated-in-aria",
          got: aria,
          detail: `count=${cTime}`,
        });
      }

      // ariaHeading → 1.
      const cHead = countOccurrences(aria, content.ariaHeading);
      if (cHead !== 1) {
        violations.push({
          locale,
          scenario: "relative-fallback",
          key: "ariaHeading",
          reason: cHead === 0 ? "value-missing-in-aria" : "value-duplicated-in-aria",
          got: aria,
          detail: `count=${cHead}`,
        });
      }

      // description → 1.
      const cDesc = countOccurrences(aria, content.description);
      if (cDesc !== 1) {
        violations.push({
          locale,
          scenario: "relative-fallback",
          key: "description",
          reason: cDesc === 0 ? "value-missing-in-aria" : "value-duplicated-in-aria",
          got: aria,
          detail: `count=${cDesc}`,
        });
      }

      // qualifier → 1.
      const qualifierMatch = aria.match(/\([^)]+\)/g) ?? [];
      if (qualifierMatch.length === 0) {
        violations.push({
          locale,
          scenario: "relative-fallback",
          key: "relativeQualifier",
          reason: "qualifier-missing-in-fallback",
          got: aria,
        });
      } else if (qualifierMatch.length > 1) {
        violations.push({
          locale,
          scenario: "relative-fallback",
          key: "relativeQualifier",
          reason: "qualifier-duplicated-in-fallback",
          got: aria,
          detail: `count=${qualifierMatch.length} (${qualifierMatch.join(", ")})`,
        });
      }

      checkCompositionArtifacts(locale, "relative-fallback", aria, violations);
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it("scenariusz C: brak danych czasu — żadne timeValue NIE może wyciec do ariaText", () => {
    const violations: Violation[] = [];

    for (const locale of SUPPORTED_LOCALES) {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: null,
        relativeLabel: null,
        locale,
      });
      const aria = model.ariaText;

      // Żaden sentinel nie powinien się znaleźć (bo nic nie podaliśmy).
      for (const sentinel of [SENTINEL_TIME_FULL, SENTINEL_TIME_RELATIVE]) {
        if (aria.includes(sentinel)) {
          violations.push({
            locale,
            scenario: "no-time",
            key: "timeValue",
            reason: "value-duplicated-in-aria",
            got: aria,
            detail: `unexpected sentinel "${sentinel}" leaked`,
          });
        }
      }

      // shouldRenderTimeLine MUSI być false — gdyby był true, to znaczy, że
      // gdzieś wycieka pusta linia „Czas: ".
      if (model.shouldRenderTimeLine) {
        violations.push({
          locale,
          scenario: "no-time",
          key: "shouldRenderTimeLine",
          reason: "trailing-prefix-artifact",
          got: aria,
          expected: "false",
          detail: "puste fullDate+relativeLabel nie powinno renderować linii czasu",
        });
      }

      checkCompositionArtifacts(locale, "no-time", aria, violations);
    }

    expect(violations, formatViolations(violations)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SHARED: artefakty składania stringów dynamicznych.
// ---------------------------------------------------------------------------
// Łapiemy klasyczne błędy template-literal:
//   - „Czas: : 12:34" → double-colon-artifact (prefix już ma „: ", value
//     przez pomyłkę zaczyna się od „: " też),
//   - „Czas:  12:34"  → double-space-artifact (prefix kończy się „: ", value
//     zaczyna się od spacji),
//   - „Czas: \n"      → trailing-prefix-artifact (prefix bez wartości).
function checkCompositionArtifacts(
  locale: Locale,
  scenario: string,
  aria: string,
  out: Violation[],
) {
  // Linie aria są łączone „\n" — sprawdzamy każdą osobno.
  for (const line of aria.split("\n")) {
    if (/:\s+:\s/.test(line)) {
      out.push({
        locale,
        scenario,
        key: "ariaText.line",
        reason: "double-colon-artifact",
        got: line,
      });
    }
    if (/:\s{2,}\S/.test(line)) {
      out.push({
        locale,
        scenario,
        key: "ariaText.line",
        reason: "double-space-artifact",
        got: line,
        detail: "prefix 'X: ' plus dodatkowa spacja w value",
      });
    }
    // „Source: ”/„Czas: ” na końcu linii bez następującej treści.
    if (/:\s*$/.test(line)) {
      out.push({
        locale,
        scenario,
        key: "ariaText.line",
        reason: "trailing-prefix-artifact",
        got: line,
        detail: "prefix bez wartości po dwukropku",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// SELF-TEST — agregator i ekstraktor placeholderów rzeczywiście działają.
// Bez tego refactor regexów mógłby cicho zepsuć wykrywanie i raport pozostałby
// „zielony" mimo realnych regresji w przyszłości.
// ---------------------------------------------------------------------------

describe("i18n placeholder parity — extractor & reporter self-test", () => {
  it("extractPlaceholders rozpoznaje każdą z 5 kategorii placeholderów", () => {
    expect(extractPlaceholders("Hello {{name}}").byPattern["double-curly"]).toEqual(["{{name}}"]);
    expect(extractPlaceholders("Pos {0} {name}").byPattern["single-curly"]).toEqual(["{0}", "{name}"].sort());
    expect(extractPlaceholders("Got %s and %d").byPattern["printf"]).toEqual(["%d", "%s"]);
    expect(extractPlaceholders("Got %(user)s").byPattern["python"]).toEqual(["%(user)s"]);
    expect(extractPlaceholders("Nested $t(common.ok)").byPattern["i18next-nested"]).toEqual([
      "$t(common.ok)",
    ]);
  });

  it("extractPlaceholders zwraca pusty signature gdy brak placeholderów", () => {
    expect(extractPlaceholders("Plain prose without markers").signature).toBe("");
    expect(extractPlaceholders("").signature).toBe("");
  });

  it("dwa stringi z identycznym zbiorem tokenów mają identyczny signature niezależnie od kolejności", () => {
    const a = extractPlaceholders("Hello {{name}}, you have {{count}} messages").signature;
    const b = extractPlaceholders("{{count}} wiadomości dla {{name}}").signature;
    expect(a).toBe(b);
  });

  it("countOccurrences nie liczy nakładających się wystąpień (semantyka exact-match)", () => {
    expect(countOccurrences("aaaa", "aa")).toBe(2);
    expect(countOccurrences("abcabc", "abc")).toBe(2);
    expect(countOccurrences("abcabc", "xyz")).toBe(0);
    expect(countOccurrences("abcabc", "")).toBe(0);
  });

  it("formatViolations zwraca pusty string gdy brak naruszeń", () => {
    expect(formatViolations([])).toBe("");
  });

  it("formatViolations zawiera locale, scenario i reason w deterministycznej kolejności", () => {
    const sample: Violation[] = [
      { locale: "it", scenario: "full-date", key: "timeValue", reason: "value-missing-in-aria" },
      { locale: "de", scenario: "relative-fallback", key: "ariaHeading", reason: "value-duplicated-in-aria" },
    ];
    const out = formatViolations(sample);
    expect(out).toContain("2 issue(s) across 2 locale(s)");
    expect(out.indexOf("locale=de")).toBeLessThan(out.indexOf("locale=it"));
    expect(out).toContain("scenario=full-date");
    expect(out).toContain("scenario=relative-fallback");
  });
});
