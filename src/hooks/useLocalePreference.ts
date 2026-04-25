/**
 * Persystowana preferencja języka tooltipa „Ostatnia zmiana" (i potencjalnie
 * innych miejsc, które używają `buildLastChangeTooltipModel`).
 *
 * Kontrakt:
 *  1. **Persystencja**: zapisujemy w `localStorage` pod kluczem
 *     `STORAGE_KEY` — przeżywa F5, zamknięcie karty, restart przeglądarki.
 *  2. **Auto-detekcja przy pierwszym wejściu**: jeśli localStorage jest pusty,
 *     czytamy `navigator.language` przez `resolveLocale` (znane → tag, nieznane
 *     → „pl" zgodnie z domyślnym zachowaniem helpera). NIE zapisujemy tej
 *     auto-detekcji do localStorage — dopiero świadomy wybór użytkownika
 *     w UI persystuje preferencję.
 *  3. **SSR-safe**: bez dostępu do `window`/`localStorage`/`navigator` zwracamy
 *     bezpieczny default „pl" — żaden render nie rzuci.
 *  4. **Cross-tab sync**: nasłuchujemy zdarzeń `storage` z innej karty oraz
 *     własnego eventu `cml-locale-changed` w tej samej karcie. Selektor w
 *     karcie A natychmiast odświeża tooltip w karcie B (parytet z UX
 *     auto-zapisu, gdzie zmiany propagują się przez BroadcastChannel/storage).
 *  5. **Walidacja zapisu**: do localStorage trafia WYŁĄCZNIE `"pl"` lub `"en"`
 *     (po `resolveLocale`). Zapis innej wartości jest defensywnie odrzucany —
 *     dzięki temu manualne pisanie po `localStorage` z DevTools nie zepsuje
 *     UI, a `setLocale("klingon")` po prostu spadnie na „pl".
 */
import { useCallback, useEffect, useState } from "react";
import {
  resolveLocale,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/lastChangeTooltipContent";

const STORAGE_KEY = "cml.tooltip-locale";
const CHANGE_EVENT = "cml-locale-changed";

/**
 * Bezpieczny odczyt zapisanej preferencji + auto-detekcja gdy brak.
 *
 * Eksportowany dla testów jednostkowych — pozwala zweryfikować priorytet
 * (localStorage > navigator.language > "pl") bez renderowania komponentu.
 */
export const readPersistedLocale = (): Locale => {
  // SSR / brak window — bezpieczny fallback.
  if (typeof window === "undefined") return "pl";

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Tylko wartości z whitelisty są honorowane. Nieznane wartości (np.
    // edytowane ręcznie z DevTools) są ignorowane na rzecz auto-detekcji.
    if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
      return raw as Locale;
    }
  } catch {
    // Tryb prywatny / quota exceeded — ignoruj, spadamy do auto-detekcji.
  }

  if (typeof navigator !== "undefined") {
    return resolveLocale(navigator.language);
  }
  return "pl";
};

/**
 * Hook React: zwraca aktualnie wybrane locale + setter, który persystuje
 * wybór i powiadamia inne karty oraz inne instancje hooka w tej karcie.
 *
 * @returns `[locale, setLocale]` — locale jest zawsze poprawnym `Locale`
 *          (po `resolveLocale`), setter akceptuje `Locale | string` i
 *          wewnętrznie przechodzi przez resolver.
 */
export const useLocalePreference = (): [Locale, (next: Locale | string) => void] => {
  const [locale, setLocaleState] = useState<Locale>(() => readPersistedLocale());

  // Synchronizacja z innymi kartami (`storage` event) oraz innymi instancjami
  // hooka w tej samej karcie (custom event `cml-locale-changed`, bo `storage`
  // event NIE odpala się w karcie, która zmodyfikowała localStorage).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setLocaleState(readPersistedLocale());
    };

    const handleSameTab = () => {
      setLocaleState(readPersistedLocale());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANGE_EVENT, handleSameTab);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHANGE_EVENT, handleSameTab);
    };
  }, []);

  const setLocale = useCallback((next: Locale | string) => {
    const resolved = resolveLocale(typeof next === "string" ? next : "pl");
    setLocaleState(resolved);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, resolved);
      // Powiadom inne instancje hooka w TEJ karcie — `storage` event nie
      // odpala się dla karty-źródła, więc bez tego inne komponenty nie
      // dowiedziałyby się o zmianie aż do następnego renderu/F5.
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Tryb prywatny / quota — UI i tak działa, tylko bez persystencji.
    }
  }, []);

  return [locale, setLocale];
};

/**
 * Eksport stałych dla testów / debug — żeby snapshoty i E2E mogły wstrzyknąć
 * znany klucz bez duplikowania literału.
 */
export const LOCALE_STORAGE_KEY = STORAGE_KEY;
export const LOCALE_CHANGE_EVENT = CHANGE_EVENT;
