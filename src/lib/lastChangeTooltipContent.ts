/**
 * Pure helper budujący treść tooltipa „Ostatnia zmiana" w panelu auto-zapisu.
 *
 * Wydzielony z `AutoSaveSettings.tsx`, żeby reguły rozpoznawania źródła zmiany
 * (synchronizacja między kartami vs lokalna akcja) były pokryte testami
 * jednostkowymi — bez konieczności renderowania całego komponentu z Radix
 * Tooltip w jsdom (gdzie portal + hover/focus są kruche).
 *
 * I18N
 * ----
 * Helper obsługuje DWA języki: polski (`"pl"`, DOMYŚLNY) i angielski (`"en"`).
 * Wszystkie literały (nagłówek źródła, opis mechanizmu, prefiks „Źródło: " /
 * „Source: ") pochodzą z mapy `TRANSLATIONS` — komponent NIE może składać
 * tych stringów inline. Pozwala to:
 *   - dodawać nowe języki w jednym miejscu (rozszerzenie typu `Locale` +
 *     dopisanie wpisu w mapie),
 *   - testować poprawność tłumaczeń niezależnie od JSX,
 *   - utrzymać kontrakt „aria-label = ariaHeading + description + timeLine"
 *     w każdym języku (te same pola, tylko inne wartości).
 *
 * Reguły fallback języka:
 *   - `locale === undefined` → `"pl"` (zachowanie historyczne, kompatybilność
 *     wsteczna ze wszystkimi istniejącymi wywołaniami helpera).
 *   - `locale` poza wspieraną listą → `"pl"` (defensywnie — np. user agent
 *     z egzotycznym tagiem nie wywróci tooltipa).
 */
export type Locale = "pl" | "en" | "de" | "it";

/**
 * Bezpieczny resolver locale — używamy w `buildLastChangeTooltipModel` oraz
 * w komponencie do auto-detekcji `navigator.language`.
 *
 * Reguły:
 *   - `undefined`/`null` → "pl" (default).
 *   - dokładny tag „pl" lub „en" → bez zmian.
 *   - tag z regionem (np. „pl-PL", „en-US", „en-GB") → wycinamy primary
 *     subtag i mapujemy.
 *   - inne języki → fallback do „pl" (w UI klinicznej uznajemy polski za
 *     bezpieczny default, bo to język operacyjny placówki).
 */
export const resolveLocale = (raw: string | null | undefined): Locale => {
  if (typeof raw !== "string") return "pl";
  const primary = raw.toLowerCase().split(/[-_]/)[0];
  if (primary === "en") return "en";
  if (primary === "de") return "de";
  if (primary === "it") return "it";
  return "pl";
};

interface VariantEntry {
  /** Nagłówek pokazywany w widocznym tooltipie (bez prefiksu). */
  heading: string;
  /**
   * Opcjonalny override nagłówka dla `aria-label`/`title` — używamy gdy
   * brzmienie naturalne dla screen readera różni się od widocznej etykiety.
   * Np. PL „local" → widoczne „Lokalna akcja w tej karcie",
   * a w aria-label wolimy „Moja lokalna akcja w tej karcie", żeby user
   * niewidomy słyszał pierwszoosobowo, że to JEGO zmiana, a nie czyjaś.
   * Gdy `undefined`, używamy `heading`.
   */
  ariaHeadingOverride?: string;
  description: string;
  /**
   * Krótka etykieta-chip (1 słowo) pokazywana w UI obok timestampu — np. PL
   * „lokalnie" / „synchron.", EN „local" / „cross-tab". Musi być spójna z
   * locale tooltipa, żeby badge i nagłówek tooltipa mówiły tym samym językiem.
   */
  shortBadge: string;
}

interface TranslationEntry {
  /** Prefiks doklejany do nagłówka w `aria-label`/`title` (np. „Źródło: "). */
  sourcePrefix: string;
  remote: VariantEntry;
  local: VariantEntry;
}

/**
 * Tablica tłumaczeń — single source of truth dla wszystkich literałów
 * tekstowych tooltipa źródła zmiany. Komponenty NIE wpisują tych stringów
 * inline; sięgają wyłącznie przez `getLastChangeTooltipContent(source, locale)`.
 *
 * Polskie warianty zachowują brzmienie sprzed wprowadzenia i18n (testy
 * regresyjne na frazy „Źródło:", „Synchronizacja między kartami", „karta"
 * przechodzą bez zmian). Angielskie warianty są dosłownym tłumaczeniem
 * mechanizmu — terminologia BroadcastChannel/storage/Switch/skrót pozostaje
 * po angielsku, bo to nazwy własne/techniczne.
 */
const TRANSLATIONS: Record<Locale, TranslationEntry> = {
  pl: {
    sourcePrefix: "Źródło: ",
    remote: {
      heading: "Synchronizacja między kartami",
      description:
        "Zmiana auto-zapisu przyszła z innej otwartej karty (BroadcastChannel lub storage).",
      shortBadge: "synchron.",
    },
    local: {
      heading: "Lokalna akcja w tej karcie",
      // Override pierwszoosobowy w aria-label/title (historyczne brzmienie).
      ariaHeadingOverride: "Moja lokalna akcja w tej karcie",
      description:
        "Sam(a) przełączyłe(a)ś auto-zapis w tej karcie (Switch lub skrót Alt+Shift+A).",
      shortBadge: "lokalnie",
    },
  },
  en: {
    sourcePrefix: "Source: ",
    remote: {
      heading: "Cross-tab synchronization",
      description:
        "The auto-save change came from another open tab (BroadcastChannel or storage).",
      shortBadge: "cross-tab",
    },
    local: {
      heading: "Local action in this tab",
      // Symetryczny override pierwszoosobowy dla EN.
      ariaHeadingOverride: "My local action in this tab",
      description:
        "You toggled auto-save in this tab (Switch or Alt+Shift+A shortcut).",
      shortBadge: "local",
    },
  },
  de: {
    sourcePrefix: "Quelle: ",
    remote: {
      heading: "Tab-übergreifende Synchronisation",
      description:
        "Die Auto-Speichern-Änderung kam aus einem anderen geöffneten Tab (BroadcastChannel oder Storage).",
      shortBadge: "tab-sync",
    },
    local: {
      heading: "Lokale Aktion in diesem Tab",
      // First-person override for SR (parytet z PL/EN).
      ariaHeadingOverride: "Meine lokale Aktion in diesem Tab",
      description:
        "Sie haben Auto-Speichern in diesem Tab umgeschaltet (Switch oder Tastenkürzel Alt+Umschalt+A).",
      shortBadge: "lokal",
    },
  },
  it: {
    sourcePrefix: "Origine: ",
    remote: {
      heading: "Sincronizzazione tra schede",
      description:
        "La modifica del salvataggio automatico è arrivata da un'altra scheda aperta (BroadcastChannel o storage).",
      shortBadge: "tra-schede",
    },
    local: {
      heading: "Azione locale in questa scheda",
      // First-person override per screen reader.
      ariaHeadingOverride: "La mia azione locale in questa scheda",
      description:
        "Hai attivato/disattivato il salvataggio automatico in questa scheda (Switch o scorciatoia Alt+Maiusc+A).",
      shortBadge: "locale",
    },
  },
};

/**
 * Dla testów i konsumentów helpera: kanoniczna lista wspieranych locale.
 * Pozwala iterować w testach po wszystkich wariantach bez duplikowania listy.
 */
export const SUPPORTED_LOCALES: readonly Locale[] = ["pl", "en", "de", "it"] as const;

export interface LastChangeTooltipContent {
  /** Nagłówek pokazywany w TooltipContent (bez prefiksu „Źródło:"). */
  heading: string;
  /** Pełniejszy opis mechanizmu zmiany. */
  description: string;
  /** Wersja heading z prefiksem „Źródło: " — do `aria-label` i `title`. */
  ariaHeading: string;
  /** Czy source jest traktowane jako „remote" (do warunkowego stylowania). */
  isRemote: boolean;
  /**
   * Krótka, jednowyrazowa etykieta-chip tłumaczona per locale (np. PL
   * „lokalnie"/„synchron.", EN „local"/„cross-tab"). Komponent powinien
   * wyświetlać JĄ zamiast hard-codowanego stringa, żeby badge i tooltip
   * mówiły tym samym językiem.
   */
  shortBadge: string;
  /** Locale, w którym zwrócono treść — przydatne dla konsumenta (debug, testy). */
  locale: Locale;
}

/**
 * Zwraca treść tooltipa źródła zmiany w wybranym języku.
 *
 * @param source „remote" / „local" / null (null traktowany jak „local").
 * @param locale Język (DOMYŚLNIE „pl" — zachowuje wsteczną kompatybilność).
 *               Można podać dowolny string (np. „pl-PL", „en-US") — zostanie
 *               zresolwowany przez `resolveLocale`. Nieznane języki → „pl".
 */
export const getLastChangeTooltipContent = (
  source: "remote" | "local" | null,
  locale: Locale | string | null | undefined = "pl",
): LastChangeTooltipContent => {
  const resolved = resolveLocale(typeof locale === "string" ? locale : "pl");
  const t = TRANSLATIONS[resolved];
  const isRemote = source === "remote";
  const variant = isRemote ? t.remote : t.local;
  return {
    isRemote,
    heading: variant.heading,
    ariaHeading: `${t.sourcePrefix}${variant.ariaHeadingOverride ?? variant.heading}`,
    description: variant.description,
    locale: resolved,
  };
};
