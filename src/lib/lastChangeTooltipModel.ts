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
  type LastChangeTooltipContent,
} from "./lastChangeTooltipContent";

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
export const TIME_LINE_PREFIX = "Czas: ";

/**
 * Składa linię czasu „Czas: <wartość>" albo zwraca `null`.
 *
 * Kontrakt:
 *  1. Pusty/whitespace-only `timeValue` → `null` (blokada renderowania
 *     osieroconego prefiksu „Czas: " bez treści).
 *  2. Prefiks `TIME_LINE_PREFIX` jest dodawany DOKŁADNIE RAZ — funkcja
 *     defensywnie strzela `String(timeValue).trim()`, więc nawet jeśli
 *     konsument przekaże już sklejony „Czas: 12:34", nie powstanie
 *     „Czas: Czas: 12:34" (helper bazuje na surowej wartości, a komponent
 *     NIE wywołuje composeTimeLine na własną rękę).
 *  3. Eksportujemy do testów jednostkowych — pozwala odpalić snapshoty
 *     na pojedynczej funkcji bez budowania pełnego modelu.
 */
export const composeTimeLine = (timeValue: string): string | null => {
  // Defensywnie ignorujemy whitespace-only wartości — `smoothTimeValue`
  // już je zeruje, ale jeżeli ktoś wywołałby composeTimeLine z surowym
  // stringiem, ten warunek jest drugą linią obrony przed osieroconym
  // prefiksem „Czas: " (bez treści) w widocznym tooltipie / aria-label.
  if (typeof timeValue !== "string" || timeValue.trim().length === 0) {
    return null;
  }
  return `${TIME_LINE_PREFIX}${timeValue}`;
};

export const buildLastChangeTooltipModel = (
  input: LastChangeTooltipModelInput,
): LastChangeTooltipModel => {
  const content = getLastChangeTooltipContent(input.source);

  // Tryb formatowania jest STOSOWANY RAZ — oba kanały (view + a11y) czytają
  // wynikowy `timeValue`, więc niemożliwe jest rozjechanie się formatu między
  // widocznym tooltipem a aria-label/title.
  const format: TimeValueFormat = input.format ?? "single-space";
  const smoothFull = smoothTimeValue(input.fullDate, format);
  const smoothRelative = smoothTimeValue(input.relativeLabel, format);

  // Wybór wartości czasu: full preferowane, relative jako fallback.
  // Gdy oba są puste — `timeValue` zostaje "" i blokuje renderowanie linii.
  const timeValue = smoothFull.length > 0 ? smoothFull : smoothRelative;
  const isRelativeFallback = smoothFull.length === 0 && smoothRelative.length > 0;

  // composeTimeLine jest JEDYNYM miejscem składania prefiksu „Czas: ".
  // Zwraca null gdy nie ma treści — dzięki temu shouldRenderTimeLine
  // jest pochodną tego samego warunku, a nie osobnym sprawdzeniem.
  const timeLineForView = composeTimeLine(timeValue);
  const shouldRenderTimeLine = timeLineForView !== null;
  const timeLineForA11y =
    timeLineForView === null
      ? null
      : isRelativeFallback
        ? `${timeLineForView} (etykieta względna)`
        : timeLineForView;

  // Sklejanie tekstu a11y — JEDNO miejsce filtrowania pustych linii.
  // `filter(Boolean && trim)` gwarantuje brak "\n\n" i trailing newline.
  const ariaText = [content.ariaHeading, content.description, timeLineForA11y]
    .filter((line): line is string => Boolean(line && line.trim()))
    .join("\n");

  const timeLineHelpTitle =
    shouldRenderTimeLine && isRelativeFallback
      ? "Pełna data niedostępna — pokazujemy etykietę względną."
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
