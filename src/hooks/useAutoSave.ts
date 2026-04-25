import { useCallback, useEffect, useState } from "react";

/**
 * Globalny przełącznik auto-zapisu odpowiedzi quizu w dzienniku hemoroidów.
 * Przechowywany w localStorage pod kluczem `cml.hemoroidy.autosave.v1` ("on" | "off").
 * Domyślnie WŁĄCZONY (back-compat z dotychczasowym zachowaniem).
 *
 * Sync między tabami: `storage` event + custom `cml:autosave-updated`.
 */

const STORAGE_KEY = "cml.hemoroidy.autosave.v1";
const EVENT_NAME = "cml:autosave-updated";

const isBrowser = () => typeof window !== "undefined";

const readStored = (): boolean => {
  if (!isBrowser()) return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "off") return false;
    return true; // domyślnie ON (też gdy brak wartości)
  } catch {
    return true;
  }
};

const writeStored = (enabled: boolean) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // brak miejsca / tryb prywatny — tolerujemy, stan i tak żyje w pamięci komponentu
  }
};

export const useAutoSave = () => {
  const [enabled, setEnabled] = useState<boolean>(() => readStored());

  useEffect(() => {
    if (!isBrowser()) return;
    const sync = () => setEnabled(readStored());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT_NAME, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT_NAME, sync);
    };
  }, []);

  const toggle = useCallback((next: boolean) => {
    setEnabled(next);
    writeStored(next);
  }, []);

  return { enabled, setEnabled: toggle };
};
