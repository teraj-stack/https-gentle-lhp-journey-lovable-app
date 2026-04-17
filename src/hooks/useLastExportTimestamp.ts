import { useEffect, useState } from "react";

const STORAGE_KEY = "cml-workout-last-export-iso";

/**
 * Zwraca ISO datę ostatniego eksportu postępu zapisaną w localStorage,
 * albo `null` jeśli pacjent nigdy nie eksportował (lub wyczyścił dane).
 *
 * Hook nasłuchuje:
 *  - eventu `storage` (synchronizacja między kartami przeglądarki),
 *  - własnego eventu `cml:last-export-updated` (synchronizacja w obrębie tej samej karty
 *    — `storage` NIE odpala się dla zapisów w tym samym oknie).
 */
export const useLastExportTimestamp = () => {
  const [iso, setIso] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => {
      try {
        setIso(window.localStorage.getItem(STORAGE_KEY));
      } catch {
        setIso(null);
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("cml:last-export-updated", sync as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cml:last-export-updated", sync as EventListener);
    };
  }, []);

  return iso;
};

/** Zapis daty ostatniego eksportu + powiadomienie hooka w tej samej karcie. */
export const markWorkoutProgressExported = (date = new Date()) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, date.toISOString());
    window.dispatchEvent(new CustomEvent("cml:last-export-updated"));
  } catch {
    // Brak dostępu do localStorage (np. tryb prywatny w starszej Safari) — silent.
  }
};

/** Wyłącznie dla potencjalnego resetu w testach / debug. Nieużywane w UI. */
export const clearLastExportTimestamp = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("cml:last-export-updated"));
  } catch {
    /* noop */
  }
};
