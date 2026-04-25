import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Globalny przełącznik auto-zapisu odpowiedzi quizu w dzienniku hemoroidów.
 * Przechowywany w localStorage pod kluczem `cml.hemoroidy.autosave.v1` ("on" | "off").
 * Domyślnie WŁĄCZONY (back-compat z dotychczasowym zachowaniem).
 *
 * Sync między kartami (tej samej origin):
 *  1. **BroadcastChannel** (`cml-autosave`) — instant push z payloadem nowej wartości,
 *     dwukierunkowy. Główny kanał — działa we wszystkich nowoczesnych przeglądarkach.
 *  2. **storage event** — fallback dla starszych przeglądarek bez BroadcastChannel.
 *  3. **CustomEvent** (`cml:autosave-updated`) — sync w obrębie tej samej karty,
 *     na wypadek gdyby kilka komponentów hooka żyło równolegle (np. settings + module).
 *
 * Każdy emit niesie pełną wartość boolean — odbiorcy nie muszą czytać localStorage,
 * dzięki czemu unikamy race conditions i niepotrzebnych re-readów.
 */

const STORAGE_KEY = "cml.hemoroidy.autosave.v1";
const EVENT_NAME = "cml:autosave-updated";
const CHANNEL_NAME = "cml-autosave";

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
  } catch {
    // brak miejsca / tryb prywatny — tolerujemy, stan żyje w pamięci
  }
};

interface BroadcastPayload {
  enabled: boolean;
  /** Identyfikator nadawcy — odbiorca pomija własne wiadomości w within-tab CustomEvent. */
  origin: string;
}

/** Identyfikator instancji karty — generowany raz przy ładowaniu modułu. */
const TAB_ID =
  isBrowser() && "crypto" in window && "randomUUID" in window.crypto
    ? window.crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export const useAutoSave = () => {
  const [enabled, setEnabled] = useState<boolean>(() => readStored());
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Inicjalizacja BroadcastChannel (jedna na życie hooka).
  useEffect(() => {
    if (!isBrowser() || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    const onMessage = (e: MessageEvent<BroadcastPayload>) => {
      const data = e.data;
      if (!data || typeof data.enabled !== "boolean") return;
      if (data.origin === TAB_ID) return; // ignorujemy echo własnego nadania
      setEnabled(data.enabled);
    };
    channel.addEventListener("message", onMessage);

    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Fallback: storage event (gdy inna karta nadpisała localStorage)
  // + CustomEvent w tej samej karcie (dla wielu instancji hooka).
  useEffect(() => {
    if (!isBrowser()) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      // e.key === null oznacza localStorage.clear() z innej karty — re-read i tak da default.
      setEnabled(readStored());
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<BroadcastPayload | undefined>).detail;
      if (detail && typeof detail.enabled === "boolean") {
        if (detail.origin === TAB_ID) return; // własne emit — już mamy stan w setEnabled
        setEnabled(detail.enabled);
        return;
      }
      // brak payloadu (back-compat) — fallback na re-read
      setEnabled(readStored());
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, []);

  const toggle = useCallback((next: boolean) => {
    setEnabled(next);
    writeStored(next);

    const payload: BroadcastPayload = { enabled: next, origin: TAB_ID };

    // Push do innych kart (instant, bez retry localStorage).
    try {
      channelRef.current?.postMessage(payload);
    } catch {
      // BroadcastChannel zamknięty / niedostępny — storage event i tak zadziała
    }

    // Push do innych instancji hooka w tej samej karcie.
    if (isBrowser()) {
      try {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
      } catch {
        // bardzo stare przeglądarki bez CustomEvent — pomijamy
      }
    }
  }, []);

  return { enabled, setEnabled: toggle };
};
