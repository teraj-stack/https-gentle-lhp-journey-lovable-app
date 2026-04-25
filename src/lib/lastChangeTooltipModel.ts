/**
 * Pure helper budujący KOMPLETNY model danych dla tooltipa „Ostatnia zmiana"
 * w panelu auto-zapisu (komponent `AutoSaveSettings`).
 *
 * Po co osobny helper, skoro mamy już `getLastChangeTooltipContent`?
 * --------------------------------------------------------------------
 * `getLastChangeTooltipContent` odpowiada wyłącznie za TEKST źródła
 * (nagłówek/opis/ariaHeading). Logika linii czasu — wygładzanie wartości
 * (`smoothTimeValue`), wybór między pełną datą a etykietą względną,
 * doklejanie kwalifikatora „(etykieta względna)" do a11y oraz decyzja czy
 * w ogóle renderować linię „Czas: …" — była wcześniej inline w JSX
 * `AutoSaveSettings.tsx`. To rodziło ryzyko **rozjazdu między kanałami**:
 * widoczny `<TooltipContent>` używał innych warunków niż `aria-label`/`title`,
 * a każda zmiana wymagała pamiętania o aktualizacji obu miejsc.
 *
 * Ten helper jest **single source of truth**: zwraca komplet pól, z których
 * korzysta zarówno widoczny tooltip (TooltipContent), jak i atrybuty a11y
 * (aria-label kontenera, title triggera) oraz badge „lokalnie". Dzięki temu
 * niemożliwe jest rozjechanie się treści między kanałami — bo wszystkie
 * czytają z tego samego obiektu.
 *
 * Reguły, które helper egzekwuje:
 *  1. **Wygładzanie wartości czasu**: usuwamy `\n`, `\r`, `\t` i kolapsujemy
 *     wielokrotne spacje. Bez tego inline newline w lokalizowanej dacie
 *     wstawiłby fałszywą linię w aria-label (i screen reader zrobiłby pauzę).
 *  2. **Fallback z pełnej daty na etykietę względną**: gdy `fullDate` jest
 *     puste/whitespace/null/undefined, używamy `relativeLabel` (np. „2 min temu").
 *     UWAGA: nie używamy `??`/`||`, bo nullish coalescing przepuściłby
 *     pusty string „" oraz „   " (truthy w JS) — robimy strict trim.
 *  3. **Ostatecznie pusta linia czasu nie istnieje**: gdy ani full ani relative
 *     nie ma, `timeLineForA11y === null` i `shouldRenderTimeLine === false`.
 *     To gwarantuje brak osieroconego „Czas: " w żadnym kanale.
 *  4. **Kwalifikator „(etykieta względna)" TYLKO w a11y**: widoczny tooltip
 *     ma natywny `title` z wyjaśnieniem dla touch/hover, a doklejony sufiks
 *     w aria-label/title triggera daje screen readerowi kontekst, że to
 *     przybliżenie a nie precyzyjny stempel.
 *  5. **Pojedyncza pętla composeAriaText**: aria-label i title triggera
 *     dostają DOKŁADNIE ten sam string (filter(Boolean).join("\n")), więc
 *     screen reader i touch tooltip nie mogą się rozjechać.
 *
 * Funkcja jest pure (bez side-effectów) — w pełni testowalna jednostkowo,
 * bez konieczności renderowania komponentu.
 */
import {
  getLastChangeTooltipContent,
  resolveLocale,
  type LastChangeTooltipContent,
  type Locale,
} from "./lastChangeTooltipContent";

/**
 * Tłumaczenia literałów linii czasu i kwalifikatora fallbacku w tooltipie
 * „Ostatnia zmiana". Trzymane LOKALNIE w pliku modelu (nie w
 * `lastChangeTooltipContent`), bo dotyczą wyłącznie linii czasu — pliki
 * pozostają sfokusowane: `Content` zna źródło zmiany, `Model` zna składanie
 * linii czasu.
 *
 * Klucze MUSZĄ pokrywać każdą wartość z `Locale`. Przy dodawaniu nowego języka
 * helper `getTimeLineStrings` rzuci błędem TypeScript, dopóki nie dopiszemy
 * kompletu — to gwarancja, że żaden język nie zostanie z połowicznym
 * tłumaczeniem (PL prefiks „Czas:" + EN qualifier itp.).
 */
export interface TimeLineStrings {
  /** Prefiks linii czasu (np. „Czas: " / „Time: "). */
  timePrefix: string;
  /** Sufiks doklejany do a11y dla fallbacku na etykietę względną. */
  relativeQualifier: string;
  /** Native `title` linii czasu, gdy używamy etykiety względnej. */
  relativeHelpTitle: string;
}

const TIME_LINE_TRANSLATIONS: Record<Locale, TimeLineStrings> = {
  pl: {
    timePrefix: "Czas: ",
    relativeQualifier: "(etykieta względna)",
    relativeHelpTitle: "Pełna data niedostępna — pokazujemy etykietę względną.",
  },
  en: {
    timePrefix: "Time: ",
    relativeQualifier: "(relative label)",
    relativeHelpTitle: "Full date unavailable — showing a relative label.",
  },
  de: {
    timePrefix: "Zeit: ",
    relativeQualifier: "(relative Angabe)",
    relativeHelpTitle: "Vollständiges Datum nicht verfügbar — relative Angabe wird angezeigt.",
  },
  it: {
    timePrefix: "Ora: ",
    relativeQualifier: "(etichetta relativa)",
    relativeHelpTitle: "Data completa non disponibile — viene mostrata un'etichetta relativa.",
  },
};

/**
 * SINGLE SOURCE OF TRUTH dla testów kontraktowych: lista kluczy, które
 * `buildLastChangeTooltipModel` RZECZYWIŚCIE czyta z `TIME_LINE_TRANSLATIONS`.
 * Każde dodanie nowego pola konsumowanego przez builder MUSI być dopisane
 * tutaj — wtedy `i18nRequiredKeys.test.ts` automatycznie obejmie nowy klucz
 * dla wszystkich locale.
 */
export const REQUIRED_TIME_LINE_KEYS = [
  "relativeHelpTitle",
  "relativeQualifier",
  "timePrefix",
] as const satisfies ReadonlyArray<keyof TimeLineStrings>;

/**
 * Runtime accessor do mapy `TIME_LINE_TRANSLATIONS` — tylko do testów
 * kontraktowych. Komponenty NIE powinny tego importować — używają
 * `getTimeLinePrefix` / `buildLastChangeTooltipModel`.
 */
export const __getRawTimeLineTranslationsForTesting = (): Record<Locale, TimeLineStrings> =>
  ({ ...TIME_LINE_TRANSLATIONS });

/**
 * Tryby formatowania wartości czasu dla tooltipa „Ostatnia zmiana".
 *
 *  - `"single-space"` (DOMYŚLNY, zachowanie historyczne): wszystkie znaki
 *    whitespace (`\n`, `\r`, `\t`, wielokrotne spacje) są zamieniane na
 *    POJEDYNCZĄ spację. To gwarantuje single-line wartość bezpieczną dla
 *    `aria-label` (screen reader nie zrobi pauzy na inline newline) i dla
 *    layoutu widocznego tooltipa (brak rwących linii w `font-mono`).
 *  - `"compact"`: jak `"single-space"`, ale dodatkowo zamienia spacje wokół
 *    separatorów strukturalnych (`,` i `:`) na minimalną postać — zostaje
 *    dokładnie jedna spacja PO separatorze i zero PRZED. Użyteczne dla
 *    zwartych zapisów typu `"24 kw 2026, 12:34"`.
 *  - `"preserve-newlines"`: zachowuje `\n` jako separator (normalizuje
 *    `\r\n` → `\n` i kolapsuje wielokrotne `\n` do jednego), ale wciąż
 *    kolapsuje spacje/`\t` w obrębie linii do pojedynczej spacji.
 *    UWAGA: tego trybu NIE wolno używać dla `aria-label`/`title` (screen
 *    reader zrobi pauzę na każdej linii) — przeznaczony wyłącznie dla
 *    wieloliniowych kanałów wizualnych (np. `<pre>` w eksporcie PDF).
 */
export type TimeValueFormat = "single-space" | "compact" | "preserve-newlines";

/**
 * Wygładza wartość czasu zgodnie z wybranym trybem formatu.
 *
 * Domyślny tryb `"single-space"` zachowuje historyczne zachowanie helpera
 * — istniejące wywołania bez parametru `format` działają identycznie jak
 * przed dodaniem opcji (parametr ma wartość domyślną).
 *
 * Eksportujemy, żeby testy jednostkowe mogły zweryfikować edge case'y
 * (newline'y, tabulatory, whitespace, non-string) niezależnie od reszty
 * modelu — w każdym z trzech trybów.
 */
export const smoothTimeValue = (
  raw: unknown,
  format: TimeValueFormat = "single-space",
): string => {
  if (typeof raw !== "string") return "";

  if (format === "preserve-newlines") {
    return raw
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[\t ]+/g, " ").trim())
      .filter((line) => line.length > 0)
      .join("\n");
  }

  const singleSpace = raw.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();

  if (format === "compact") {
    return singleSpace.replace(/\s*([,:])\s*/g, "$1 ").trim();
  }

  return singleSpace;
};

/**
 * Lista dozwolonych wartości pola `source` — używana zarówno w runtime
 * walidacji (`validateLastChangeTooltipInput`), jak i jako dokumentacja
 * dla konsumentów (TS i JSDoc). Zmiana tej listy wymusza aktualizację typu
 * `LastChangeTooltipModelInput["source"]` oraz `getLastChangeTooltipContent`.
 */
const VALID_SOURCES = ["remote", "local"] as const;
type ValidSource = (typeof VALID_SOURCES)[number];

const VALID_FORMATS: readonly TimeValueFormat[] = [
  "single-space",
  "compact",
  "preserve-newlines",
] as const;

/**
 * Powód, dla którego pole zostało odrzucone i zastąpione bezpiecznym
 * fallbackiem przez `validateLastChangeTooltipInput`. Eksportujemy, żeby
 * konsumenci (testy, dev-only debug overlay) mogli rozróżnić przyczynę.
 */
export type ValidationIssueCode =
  | "input-not-object"
  | "source-invalid-type"
  | "source-invalid-value"
  | "fullDate-invalid-type"
  | "relativeLabel-invalid-type"
  | "format-invalid-type"
  | "format-invalid-value"
  | "locale-invalid-type";

export interface ValidationIssue {
  field: "input" | "source" | "fullDate" | "relativeLabel" | "format" | "locale";
  code: ValidationIssueCode;
  /** Krótka, ludzka diagnoza — przydatna w dev console / testach. */
  message: string;
}

export interface ValidatedTooltipInput {
  source: ValidSource | null;
  fullDate: string | null;
  relativeLabel: string | null;
  format: TimeValueFormat;
  locale: Locale | string;
}

export interface ValidationResult {
  value: ValidatedTooltipInput;
  issues: ValidationIssue[];
}

/**
 * Bezpieczny, defensywny fallback używany gdy całe wejście jest niepoprawne
 * (np. `null`, `undefined`, prymityw, tablica). Renderuje tooltip „local"
 * BEZ linii czasu — model wciąż jest spójny i kompletny.
 */
const SAFE_FALLBACK_INPUT: ValidatedTooltipInput = {
  source: null,
  fullDate: null,
  relativeLabel: null,
  format: "single-space",
  locale: "pl",
};

/**
 * Sprawdza, czy `value` jest tzw. plain object (record) — odrzuca tablice,
 * funkcje, prymitywy. Tylko taki kształt może bezpiecznie nieść pola wejścia.
 */
const isPlainObjectLike = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  return true;
};

/**
 * Waliduje i koercuje wejście do `buildLastChangeTooltipModel`.
 *
 * KONTRAKT:
 *  - NIGDY nie rzuca wyjątku — UI pozostaje stabilny nawet dla wejścia z bug-a
 *    (np. nieoczekiwany kształt z hooka `useDailyDiary` po regresji).
 *  - Każde pole o niepoprawnym typie/wartości jest zastępowane bezpieczną
 *    domyślną wartością (`null` dla danych, „single-space" dla formatu,
 *    „pl" dla locale).
 *  - Wszystkie odrzucenia trafiają do `issues` — pozwala to dev-only overlay
 *    czy testom regresji wykryć, że konsument przesłał niepoprawne wejście.
 *
 * Eksport publiczny — używany wewnętrznie przez `buildLastChangeTooltipModel`,
 * ale również dostępny dla testów jednostkowych i ewentualnych konsumentów,
 * którzy chcą zwalidować wejście przed wywołaniem buildera (np. dev console
 * warning w trybie deweloperskim).
 */
export const validateLastChangeTooltipInput = (
  raw: unknown,
): ValidationResult => {
  const issues: ValidationIssue[] = [];

  if (!isPlainObjectLike(raw)) {
    issues.push({
      field: "input",
      code: "input-not-object",
      message: `Oczekiwano obiektu wejścia, otrzymano ${raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw}.`,
    });
    return { value: { ...SAFE_FALLBACK_INPUT }, issues };
  }

  // source: null/undefined → null (traktowane jak „local"), string z whitelisty → ok,
  // cokolwiek innego → null + issue.
  let source: ValidSource | null = null;
  if (raw.source === null || raw.source === undefined) {
    source = null;
  } else if (typeof raw.source !== "string") {
    issues.push({
      field: "source",
      code: "source-invalid-type",
      message: `Pole 'source' musi być stringiem 'remote'|'local' lub null, otrzymano ${typeof raw.source}.`,
    });
  } else if ((VALID_SOURCES as readonly string[]).includes(raw.source)) {
    source = raw.source as ValidSource;
  } else {
    issues.push({
      field: "source",
      code: "source-invalid-value",
      message: `Pole 'source' ma niedozwoloną wartość '${raw.source}' — dozwolone: ${VALID_SOURCES.join(", ")}.`,
    });
  }

  // fullDate / relativeLabel: dozwolone są string | null | undefined.
  // Wszystko inne (number, object, boolean, array) → null + issue.
  // Pusty string lub whitespace przepuszczamy — `smoothTimeValue` poradzi
  // sobie z tym jako „brak treści" (zwróci "").
  let fullDate: string | null = null;
  if (raw.fullDate === null || raw.fullDate === undefined) {
    fullDate = null;
  } else if (typeof raw.fullDate === "string") {
    fullDate = raw.fullDate;
  } else {
    issues.push({
      field: "fullDate",
      code: "fullDate-invalid-type",
      message: `Pole 'fullDate' musi być stringiem lub null, otrzymano ${typeof raw.fullDate}.`,
    });
  }

  let relativeLabel: string | null = null;
  if (raw.relativeLabel === null || raw.relativeLabel === undefined) {
    relativeLabel = null;
  } else if (typeof raw.relativeLabel === "string") {
    relativeLabel = raw.relativeLabel;
  } else {
    issues.push({
      field: "relativeLabel",
      code: "relativeLabel-invalid-type",
      message: `Pole 'relativeLabel' musi być stringiem lub null, otrzymano ${typeof raw.relativeLabel}.`,
    });
  }

  // format: undefined → default, string z whitelisty → ok, inne → default + issue.
  let format: TimeValueFormat = "single-space";
  if (raw.format === undefined) {
    format = "single-space";
  } else if (typeof raw.format !== "string") {
    issues.push({
      field: "format",
      code: "format-invalid-type",
      message: `Pole 'format' musi być stringiem TimeValueFormat lub undefined, otrzymano ${typeof raw.format}.`,
    });
  } else if ((VALID_FORMATS as readonly string[]).includes(raw.format)) {
    format = raw.format as TimeValueFormat;
  } else {
    issues.push({
      field: "format",
      code: "format-invalid-value",
      message: `Pole 'format' ma niedozwoloną wartość '${raw.format}' — dozwolone: ${VALID_FORMATS.join(", ")}.`,
    });
  }

  // locale: undefined/null → "pl", string → przekazujemy do resolveLocale
  // (nieznane języki i tak fallbackują do „pl"), inne typy → "pl" + issue.
  let locale: Locale | string = "pl";
  if (raw.locale === undefined || raw.locale === null) {
    locale = "pl";
  } else if (typeof raw.locale === "string") {
    locale = raw.locale;
  } else {
    issues.push({
      field: "locale",
      code: "locale-invalid-type",
      message: `Pole 'locale' musi być stringiem lub undefined, otrzymano ${typeof raw.locale}.`,
    });
  }

  return {
    value: { source, fullDate, relativeLabel, format, locale },
    issues,
  };
};

export interface LastChangeTooltipModelInput {
  /** Źródło zmiany — patrz `getLastChangeTooltipContent`. */
  source: "remote" | "local" | null;
  /**
   * Pełna data + godzina (np. „24 kwietnia 2026, 12:34:56") albo wartość
   * niepoprawna (null/undefined/""/whitespace/„—"). Helper zdecyduje,
   * czy użyć tej wartości, czy spaść na `relativeLabel`.
   */
  fullDate: string | null | undefined;
  /**
   * Etykieta względna (np. „2 minuty temu") — fallback gdy `fullDate`
   * jest niedostępne. Może być również niepoprawna (null/""), wtedy
   * helper w ogóle nie wyrenderuje linii czasu.
   */
  relativeLabel: string | null | undefined;
  /**
   * Tryb formatowania wartości czasu (patrz `TimeValueFormat`).
   * Domyślnie `"single-space"` — zachowanie historyczne.
   *
   * KRYTYCZNE: Tryb jest stosowany JEDNOLICIE do obu kanałów (widoczny
   * `<TooltipContent>` i `aria-label`/`title`), bo oba czytają to samo
   * pole `timeValue`. Dzięki temu niemożliwe jest, żeby wizual i a11y
   * pokazały inaczej sformatowaną wartość czasu — kontrakt egzekwowany
   * testami parytetu w `lastChangeTooltipModel.test.ts`.
   */
  format?: TimeValueFormat;
  /**
   * Język tooltipa (PL/EN). DOMYŚLNIE „pl" — zachowuje wsteczną
   * kompatybilność (wszystkie istniejące wywołania bez `locale` działają
   * jak dotąd po polsku).
   *
   * Akceptuje też pełne tagi BCP-47 (np. „pl-PL", „en-US") — zostaną
   * zresolwowane przez `resolveLocale`. Nieznane języki → fallback „pl".
   *
   * Locale steruje:
   *   - prefiksem linii czasu („Czas: " vs „Time: "),
   *   - sufiksem fallbacku w a11y („(etykieta względna)" vs „(relative label)"),
   *   - native `title` wyjaśniającym fallback,
   *   - nagłówkiem/opisem źródła z `getLastChangeTooltipContent`.
   */
  locale?: Locale | string;
}

export interface LastChangeTooltipModel {
  /** Treść źródła zmiany (heading/description/ariaHeading/isRemote). */
  content: LastChangeTooltipContent;
  /**
   * Wartość czasu po wygładzeniu, gotowa do wyświetlenia.
   * Pusty string = nie ma sensownej wartości, NIE renderuj linii czasu.
   */
  timeValue: string;
  /** Czy używamy fallbacku na `relativeLabel` (pełna data była niedostępna). */
  isRelativeFallback: boolean;
  /** Czy widoczny `<TooltipContent>` powinien renderować linię czasu. */
  shouldRenderTimeLine: boolean;
  /**
   * Linia czasu dla widocznego tooltipa: „Czas: <wartość>" albo `null`.
   * BEZ kwalifikatora „(etykieta względna)" — bo widoczny tooltip ma
   * osobny native `title` z wyjaśnieniem.
   */
  timeLineForView: string | null;
  /**
   * Linia czasu dla aria-label/title: „Czas: <wartość>" + opcjonalny
   * sufiks „(etykieta względna)" gdy to fallback. Albo `null`.
   */
  timeLineForA11y: string | null;
  /**
   * Sklejony tekst dla aria-label triggera i `title` (touch fallback).
   * Filter Boolean + join("\n") — gwarantowane brak pustych linii,
   * trailing newline ani osieroconego „Czas: ".
   */
  ariaText: string;
  /**
   * Tekst do native `title` na linii czasu w widocznym tooltipie:
   *  - `undefined` gdy mamy pełną datę (nie ma czego tłumaczyć),
   *  - krótkie wyjaśnienie dla fallbacku.
   * Zwracamy `undefined` zamiast `null`, żeby JSX mógł rozpiąć przez `{...}`
   * bez warunkowego ternary.
   */
  timeLineHelpTitle: string | undefined;
}

/**
 * Buduje kompletny model tooltipa „Ostatnia zmiana".
 *
 * Wszystkie warunki renderowania są zogniskowane TUTAJ — komponent powinien
 * tylko czytać pola modelu i przekazywać je do JSX. Każdy nowy kanał (np.
 * eksport do PDF, narrator screen-reader-only) powinien również czytać z tego
 * helpera, żeby uniknąć duplikacji logiki.
 */
/**
 * Prefiks linii czasu używany w tooltipie „Ostatnia zmiana".
 *
 * SINGLE SOURCE OF TRUTH dla literału „Czas: ". Wcześniej był wpisany
 * inline w dwóch miejscach helpera (`timeLineForView` i pośrednio
 * `timeLineForA11y`), co rodziło ryzyko literówki w jednym miejscu
 * przy refactorze (np. „Czas:  " z podwójną spacją w view i bez w a11y
 * → screen reader przeczytałby inny tekst niż widzi pacjent).
 *
 * Stała + helper `composeTimeLine` zapewniają, że prefiks jest dodawany
 * DOKŁADNIE RAZ i TYLKO gdy `timeValue` ma sensowną treść po wygładzeniu.
 */
/**
 * Polski prefiks linii czasu — eksport zachowany dla wstecznej
 * kompatybilności (testy, ewentualni zewnętrzni konsumenci).
 *
 * Po wprowadzeniu i18n wartości prefiksów żyją w `TIME_LINE_TRANSLATIONS`.
 * Dla innych języków używamy `getTimeLinePrefix(locale)`.
 */
export const TIME_LINE_PREFIX = TIME_LINE_TRANSLATIONS.pl.timePrefix;

/**
 * Zwraca prefiks linii czasu („Czas: " / „Time: ") dla wybranego locale.
 *
 * Eksport publiczny — pozwala konsumentom (np. testom snapshotów,
 * komponentom kontroli a11y) sprawdzić poprawny prefiks bez sięgania do
 * wewnętrznej mapy tłumaczeń.
 */
export const getTimeLinePrefix = (locale: Locale | string = "pl"): string =>
  TIME_LINE_TRANSLATIONS[resolveLocale(typeof locale === "string" ? locale : "pl")].timePrefix;

/**
 * Składa linię czasu „Czas: <wartość>" / „Time: <value>" albo zwraca `null`.
 *
 * Kontrakt:
 *  1. Pusty/whitespace-only `timeValue` → `null` (blokada renderowania
 *     osieroconego prefiksu bez treści).
 *  2. Prefiks jest dodawany DOKŁADNIE RAZ — funkcja defensywnie sprawdza
 *     `typeof string` + `trim()`, więc nie powstanie podwójny prefiks.
 *  3. Drugi parametr `locale` jest opcjonalny i DOMYŚLNIE „pl" — istniejące
 *     wywołania `composeTimeLine(value)` bez locale zwracają „Czas: …".
 *  4. Eksportujemy do testów jednostkowych — pozwala odpalić snapshoty
 *     na pojedynczej funkcji bez budowania pełnego modelu.
 */
export const composeTimeLine = (
  timeValue: string,
  locale: Locale | string = "pl",
): string | null => {
  if (typeof timeValue !== "string" || timeValue.trim().length === 0) {
    return null;
  }
  return `${getTimeLinePrefix(locale)}${timeValue}`;
};

export const buildLastChangeTooltipModel = (
  input: LastChangeTooltipModelInput,
): LastChangeTooltipModel => {
  // KROK 1: Walidacja defensywna. NIGDY nie ufamy konsumentowi — nawet jeśli
  // typy TS mówią inaczej, dane mogą przyjść z hooka po regresji, z localStorage,
  // z eventu BroadcastChannel z innej karty/zakładki w innej wersji aplikacji,
  // albo z testu E2E ze złym mockiem. Walidator gwarantuje, że dalej pracujemy
  // wyłącznie na bezpiecznych, zwalidowanych wartościach. Issues są tu
  // zignorowane (UI musi pozostać stabilny) — kto chce je zobaczyć, woła
  // `validateLastChangeTooltipInput` osobno.
  const { value: validated } = validateLastChangeTooltipInput(input);

  // Resolved locale jest STOSOWANY JEDNOLICIE: te same tłumaczenia trafiają
  // do `content` (heading/description/ariaHeading), prefiksu linii czasu,
  // sufiksu fallbacku i `timeLineHelpTitle`. Niemożliwe jest, żeby kanały
  // się rozjechały na warstwie języka (np. PL prefiks „Czas:" + EN nagłówek).
  const resolvedLocale = resolveLocale(
    typeof validated.locale === "string" ? validated.locale : "pl",
  );
  const content = getLastChangeTooltipContent(validated.source, resolvedLocale);
  const tStrings = TIME_LINE_TRANSLATIONS[resolvedLocale];

  // Tryb formatowania jest STOSOWANY RAZ do wartości WIDOCZNEJ — oba kanały
  // wizualne (TooltipContent i timeLineForView) czytają to samo `timeValue`.
  const format: TimeValueFormat = validated.format;
  const smoothFull = smoothTimeValue(validated.fullDate, format);
  const smoothRelative = smoothTimeValue(validated.relativeLabel, format);

  // Wybór wartości czasu: full preferowane, relative jako fallback.
  // Gdy oba są puste — `timeValue` zostaje "" i blokuje renderowanie linii.
  const timeValue = smoothFull.length > 0 ? smoothFull : smoothRelative;
  const isRelativeFallback = smoothFull.length === 0 && smoothRelative.length > 0;

  // KRYTYCZNE: dla kanałów A11Y (aria-label/title) ZAWSZE używamy
  // `single-space`, niezależnie od `input.format`. To gwarantuje, że
  // `ariaText` NIE może zawierać:
  //   - osieroconych pustych linii (newline w środku timeValue rozbiłby
  //     `join("\n")` na 4+ pola, z których jedno mogłoby być whitespace),
  //   - osieroconego prefiksu „Czas: \n…" (gdzie po prefiksie jest tylko
  //     newline),
  //   - pauz w mowie screen readera (każdy `\n` w aria-label wywołuje
  //     pauzę w NVDA/JAWS/VoiceOver).
  // Dzięki temu nawet gdy konsument świadomie wybierze `preserve-newlines`
  // dla widocznego tooltipa (np. PDF), aria-label dostanie single-line
  // wersję — i to BEZ zmiany kontraktu po stronie wywołującego.
  const a11ySmoothFull = smoothTimeValue(validated.fullDate, "single-space");
  const a11ySmoothRelative = smoothTimeValue(validated.relativeLabel, "single-space");
  const a11yTimeValue = a11ySmoothFull.length > 0 ? a11ySmoothFull : a11ySmoothRelative;

  // composeTimeLine jest JEDYNYM miejscem składania prefiksu „Czas:" / „Time:".
  // Zwraca null gdy nie ma treści — dzięki temu shouldRenderTimeLine
  // jest pochodną tego samego warunku, a nie osobnym sprawdzeniem.
  const timeLineForView = composeTimeLine(timeValue, resolvedLocale);
  const a11yTimeLineBase = composeTimeLine(a11yTimeValue, resolvedLocale);
  const shouldRenderTimeLine = timeLineForView !== null;
  const timeLineForA11y =
    a11yTimeLineBase === null
      ? null
      : isRelativeFallback
        ? `${a11yTimeLineBase} ${tStrings.relativeQualifier}`
        : a11yTimeLineBase;

  // Sklejanie tekstu a11y — JEDNO miejsce filtrowania pustych linii.
  // `filter(Boolean && trim)` gwarantuje brak "\n\n" i trailing newline.
  // Dodatkowo: bo `timeLineForA11y` jest budowany ze single-space wartości,
  // niemożliwe jest, by ta linia wniosła wewnętrzny `\n` do ariaText.
  const ariaText = [content.ariaHeading, content.description, timeLineForA11y]
    .filter((line): line is string => Boolean(line && line.trim()))
    .join("\n");

  const timeLineHelpTitle =
    shouldRenderTimeLine && isRelativeFallback
      ? tStrings.relativeHelpTitle
      : undefined;

  return {
    content,
    timeValue,
    isRelativeFallback,
    shouldRenderTimeLine,
    timeLineForView,
    timeLineForA11y,
    ariaText,
    timeLineHelpTitle,
  };
};
