import { useCallback, useEffect, useState } from "react";

/**
 * Preferencja widoczności etykiety „Ostatnia zmiana:" w panelu auto-zapisu.
 *
 * Pacjent może chcieć zobaczyć:
 *  - `both` — każdą zmianę (zdalną z innej karty I lokalną w tej karcie). Domyślnie.
 *  - `remote` — TYLKO synchronizacje z innych kart (gdy testuje sync, własne kliknięcia są szumem).
 *  - `local` — TYLKO własne kliknięcia (gdy ktoś nie chce wizualnego potwierdzenia
 *     zmian zrobionych w innej karcie, np. żeby panel się nie „odświeżał" w tle).
 *  - `off` — etykieta ukryta na stałe (minimalistyczny tryb).
 *
 * Persystujemy w localStorage pod kluczem `cml.hemoroidy.last-change-visibility.v1`
 * i synchronizujemy między kartami (storage event) oraz w obrębie jednej karty
 * (CustomEvent), spójnie ze wzorcem z `useTimeFormatPreference` i `useAutoSave`.
 */
export type LastChangeVisibility = "both" | "remote" | "local" | "off";

const STORAGE_KEY = "cml.hemoroidy.last-change-visibility.v1";
const EVENT_NAME = "cml:last-change-visibility-updated";
const VALID = new Set<LastChangeVisibility>(["both", "remote", "local", "off"]);
const DEFAULT: LastChangeVisibility = "both";

const isBrowser = () => typeof window !== "undefined";

const readStored = (): LastChangeVisibility => {
  if (!isBrowser()) return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && VALID.has(raw as LastChangeVisibility)) {
      return raw as LastChangeVisibility;
    }
  } catch {
    /* tryb prywatny / brak miejsca — wracamy do defaulta */
  }
  return DEFAULT;
};

export const useLastChangeVisibility = () => {
  const [visibility, setVisibilityState] = useState<LastChangeVisibility>(() =>
    readStored(),
  );

  // Cross-tab sync: storage event (inne karty)
  useEffect(() => {
    if (!isBrowser()) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue;
      if (next && VALID.has(next as LastChangeVisibility)) {
        setVisibilityState(next as LastChangeVisibility);
      } else if (next === null) {
        // ktoś usunął klucz (np. wyczyścił dane) → wróć do defaulta
        setVisibilityState(DEFAULT);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Within-tab sync: CustomEvent (kilka instancji hooka w jednej karcie)
  useEffect(() => {
    if (!isBrowser()) return;
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<LastChangeVisibility>).detail;
      if (detail && VALID.has(detail)) setVisibilityState(detail);
    };
    window.addEventListener(EVENT_NAME, onCustom as EventListener);
    return () => window.removeEventListener(EVENT_NAME, onCustom as EventListener);
  }, []);

  const setVisibility = useCallback((next: LastChangeVisibility) => {
    setVisibilityState(next);
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* tolerujemy — stan żyje w pamięci */
    }
    // CustomEvent leci tylko w obrębie tej karty, storage event — do innych.
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  }, []);

  return { visibility, setVisibility };
};

/**
 * Pure helper: czy etykieta powinna być widoczna dla danego źródła zmiany?
 * Wyciągnięty osobno, żeby logika była jednoznaczna i testowalna z UI.
 */
export const isLastChangeVisible = (
  visibility: LastChangeVisibility,
  source: "remote" | "local" | null,
): boolean => {
  if (visibility === "off") return false;
  if (source === null) return false;
  if (visibility === "both") return true;
  return visibility === source;
};
