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
 * Wygładza wartość czasu do single-line stringu albo pustego "".
 * Eksportujemy, żeby testy jednostkowe mogły zweryfikować edge case'y
 * (newline'y, tabulatory, whitespace) niezależnie od reszty modelu.
 */
export const smoothTimeValue = (raw: unknown): string => {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
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
export const buildLastChangeTooltipModel = (
  input: LastChangeTooltipModelInput,
): LastChangeTooltipModel => {
  const content = getLastChangeTooltipContent(input.source);

  const smoothFull = smoothTimeValue(input.fullDate);
  const smoothRelative = smoothTimeValue(input.relativeLabel);

  // Wybór wartości czasu: full preferowane, relative jako fallback.
  // Gdy oba są puste — `timeValue` zostaje "" i blokuje renderowanie linii.
  const timeValue = smoothFull.length > 0 ? smoothFull : smoothRelative;
  const isRelativeFallback = smoothFull.length === 0 && smoothRelative.length > 0;
  const shouldRenderTimeLine = timeValue.length > 0;

  const timeLineForView = shouldRenderTimeLine ? `Czas: ${timeValue}` : null;
  const timeLineForA11y = !timeLineForView
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
