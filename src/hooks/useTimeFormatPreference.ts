import { useCallback, useEffect, useState } from "react";

/**
 * Preferencja formatu czasu dla etykiet typu „Ostatnia zmiana" w panelu auto-zapisu.
 *
 *  - `relative` — „przed chwilą", „2 min temu", „3 h temu" (domyślnie).
 *  - `clock`    — sama godzina HH:MM:SS (kompaktowo, gdy pacjent chce dokładną minutę).
 *  - `full`     — pełna data + godzina (do długo otwartych kart, audytu).
 *
 * Persystowane w localStorage pod kluczem `cml.hemoroidy.time-format.v1`.
 * Synchronizowane między komponentami w tej samej karcie przez CustomEvent
 * (`cml:time-format-updated`), żeby kilka instancji panelu nie rozjechało się.
 */
export type TimeFormatMode = "relative" | "clock" | "full";

const STORAGE_KEY = "cml.hemoroidy.time-format.v1";
const EVENT_NAME = "cml:time-format-updated";
const DEFAULT_MODE: TimeFormatMode = "relative";

const isBrowser = () => typeof window !== "undefined";

const isValidMode = (value: unknown): value is TimeFormatMode =>
  value === "relative" || value === "clock" || value === "full";

const readStored = (): TimeFormatMode => {
  if (!isBrowser()) return DEFAULT_MODE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isValidMode(raw) ? raw : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
};

/**
 * Renderuje timestamp wg wybranego trybu. Funkcja jest pure (bez side-effectów),
 * więc można ją wołać z dowolnego komponentu — UI sam decyduje, czy chce
 * auto-odświeżać przez tick (relevantne tylko dla `relative`).
 */
export const formatTimestamp = (
  timestamp: number,
  mode: TimeFormatMode,
): string => {
  if (mode === "clock") {
    return new Date(timestamp).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  if (mode === "full") {
    return new Date(timestamp).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  // mode === "relative"
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 5) return "przed chwilą";
  if (diffSec < 60) return `${diffSec} s temu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min temu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h temu`;
  // >24h — pełna data + godzina (rzadki edge-case dla długo otwartej karty)
  return new Date(timestamp).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Hook zwracający bieżący tryb formatu czasu i setter.
 * Słucha CustomEvent (within-tab) oraz storage event (cross-tab),
 * żeby zmiana w jednym miejscu rozchodziła się natychmiast.
 */
export const useTimeFormatPreference = () => {
  const [mode, setModeState] = useState<TimeFormatMode>(() => readStored());

  useEffect(() => {
    if (!isBrowser()) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      const next = readStored();
      setModeState((prev) => (prev === next ? prev : next));
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<TimeFormatMode | undefined>).detail;
      if (isValidMode(detail)) {
        setModeState((prev) => (prev === detail ? prev : detail));
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, []);

  const setMode = useCallback((next: TimeFormatMode) => {
    setModeState(next);
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // tryb prywatny / brak miejsca — tolerujemy, zmiana żyje w pamięci
    }
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
    } catch {
      // pomijamy
    }
  }, []);

  return { mode, setMode };
};
