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
 *
 * Dodatkowo kanał obsługuje wiadomości diagnostyczne `ping`/`pong` (typowane przez `kind`),
 * używane przez przycisk „Test synchronizacji" w panelu ustawień. Nadawca wysyła `ping`
 * z unikalnym `pingId`, każda inna karta odpowiada `pong`-iem. Nadawca zbiera odpowiedzi
 * przez 5 s i prezentuje listę kart, które potwierdziły odbiór.
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

interface StateBroadcastPayload {
  kind?: "state"; // brak `kind` = legacy state (back-compat z poprzednią wersją hooka)
  enabled: boolean;
  /** Identyfikator nadawcy — odbiorca pomija własne wiadomości w within-tab CustomEvent. */
  origin: string;
  /**
   * Wersja payloadu w postaci [timestamp_ms, monotonic_counter].
   * Odbiorca porównuje leksykograficznie z ostatnio zaaplikowaną wersją:
   * — większy timestamp wygrywa (najnowsza zmiana jest źródłem prawdy);
   * — przy tie-breakerze (ten sam ms) wygrywa większy counter.
   * Counter chroni przed kolizją w obrębie tej samej milisekundy oraz
   * przed cofnięciem zegara systemowego (NTP correction, manual change).
   * Pole opcjonalne dla back-compat: payload bez `version` traktujemy jako [0, 0]
   * — wygra każdy nowszy payload z wersją.
   */
  version?: [number, number];
}

interface PingPayload {
  kind: "ping";
  pingId: string;
  origin: string;
  /** Krótka, czytelna etykieta karty (np. „Karta abc12") — do pokazania w UI. */
  label: string;
  sentAt: number;
}

interface PongPayload {
  kind: "pong";
  pingId: string;
  origin: string;
  label: string;
  /** Aktualny stan przełącznika u odbiorcy — żeby nadawca mógł zweryfikować spójność. */
  enabled: boolean;
  receivedAt: number;
}

type ChannelPayload = StateBroadcastPayload | PingPayload | PongPayload;

/** Identyfikator instancji karty — generowany raz przy ładowaniu modułu. */
const TAB_ID =
  isBrowser() && "crypto" in window && "randomUUID" in window.crypto
    ? window.crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`;

/** Krótka, ludzka etykieta karty (pierwsze 6 znaków UUID). */
const TAB_LABEL = `Karta ${TAB_ID.slice(0, 6)}`;

/** Czas trwania flagi „świeża zdalna synchronizacja" (ms) — używany do animacji pulsu w UI. */
const REMOTE_SYNC_FLASH_MS = 1500;

/** Czas zbierania odpowiedzi pong na pojedynczy ping (ms). */
const PING_COLLECTION_WINDOW_MS = 5000;

/**
 * Monotoniczny licznik wersji w obrębie życia modułu (per zakładka).
 * Każdy lokalny `toggle()` inkrementuje counter, więc para [Date.now(), counter]
 * jest unikalna nawet w obrębie tej samej milisekundy.
 */
let versionCounter = 0;
const nextVersion = (): [number, number] => {
  versionCounter += 1;
  return [Date.now(), versionCounter];
};

/**
 * Porównanie wersji: zwraca >0 gdy `a` jest nowsza, <0 gdy starsza, 0 gdy równa.
 * Najpierw porównuje timestamp, potem counter (tie-breaker).
 * Brak wersji (legacy payload) jest traktowany jako [0, 0] — przegrywa z każdą wersjonowaną wiadomością.
 */
const compareVersions = (a: [number, number] | undefined, b: [number, number] | undefined): number => {
  const [ta, ca] = a ?? [0, 0];
  const [tb, cb] = b ?? [0, 0];
  if (ta !== tb) return ta - tb;
  return ca - cb;
};

export interface PongResponse {
  origin: string;
  label: string;
  enabled: boolean;
  /** Latencja od wysłania ping do otrzymania pong (ms). */
  latencyMs: number;
}

export const useAutoSave = () => {
  const [enabled, setEnabled] = useState<boolean>(() => readStored());
  const [remoteSyncTick, setRemoteSyncTick] = useState(0);
  const [isRemoteSyncing, setIsRemoteSyncing] = useState(false);
  const [lastRemoteSyncAt, setLastRemoteSyncAt] = useState<number | null>(null);

  /**
   * Stan testu synchronizacji: aktywny pingId (lub null), znacznik wysłania,
   * lista odpowiedzi i flaga „w trakcie zbierania".
   */
  const [pingState, setPingState] = useState<{
    pingId: string | null;
    sentAt: number | null;
    responses: PongResponse[];
    isCollecting: boolean;
  }>({ pingId: null, sentAt: null, responses: [], isCollecting: false });

  const channelRef = useRef<BroadcastChannel | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingCollectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Trzymamy aktywny pingId w refie, żeby handler kanału nie musiał być re-bindowany. */
  const activePingIdRef = useRef<string | null>(null);
  const pingSentAtRef = useRef<number | null>(null);
  /**
   * Wersja ostatnio zaaplikowanego stanu (lokalna LUB zdalna). Wiadomości z wersją
   * mniejszą lub równą są ignorowane jako stale → najnowsza zmiana wygrywa, niezależnie
   * od kolejności dostarczenia (BroadcastChannel zwykle FIFO, ale storage event może się
   * przeplatać z CustomEvent w obrębie tej samej karty, a w przyszłości np. SharedWorker
   * może przyjść spoza kolejki). [0,0] = nic jeszcze nie zaaplikowano.
   */
  const lastAppliedVersionRef = useRef<[number, number]>([0, 0]);

  const markRemoteSync = useCallback(() => {
    setRemoteSyncTick((n) => n + 1);
    setIsRemoteSyncing(true);
    setLastRemoteSyncAt(Date.now());
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      setIsRemoteSyncing(false);
      flashTimeoutRef.current = null;
    }, REMOTE_SYNC_FLASH_MS);
  }, []);

  // Inicjalizacja BroadcastChannel (jedna na życie hooka).
  useEffect(() => {
    if (!isBrowser() || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    const onMessage = (e: MessageEvent<ChannelPayload>) => {
      const data = e.data;
      if (!data) return;

      // PING — odpowiedz pong-iem, jeśli to nie my pytamy.
      if ((data as PingPayload).kind === "ping") {
        const ping = data as PingPayload;
        if (ping.origin === TAB_ID) return; // własny ping
        const pong: PongPayload = {
          kind: "pong",
          pingId: ping.pingId,
          origin: TAB_ID,
          label: TAB_LABEL,
          enabled: readStored(),
          receivedAt: Date.now(),
        };
        try {
          channel.postMessage(pong);
        } catch {
          // kanał zamknięty — pomijamy
        }
        return;
      }

      // PONG — zbierz odpowiedź na nasz aktywny ping.
      if ((data as PongPayload).kind === "pong") {
        const pong = data as PongPayload;
        if (pong.origin === TAB_ID) return; // echo własnej odpowiedzi (nie powinno się zdarzyć, ale safety net)
        if (pong.pingId !== activePingIdRef.current) return; // pong do starego pinga — ignoruj
        const sentAt = pingSentAtRef.current ?? Date.now();
        const latencyMs = Math.max(0, Date.now() - sentAt);
        setPingState((prev) => {
          // dedupe po origin (jakby ta sama karta odpowiedziała 2x)
          if (prev.responses.some((r) => r.origin === pong.origin)) return prev;
          return {
            ...prev,
            responses: [
              ...prev.responses,
              { origin: pong.origin, label: pong.label, enabled: pong.enabled, latencyMs },
            ],
          };
        });
        return;
      }

      // STATE (legacy: brak `kind` lub kind === "state").
      const statePayload = data as StateBroadcastPayload;
      if (typeof statePayload.enabled !== "boolean") return;
      if (statePayload.origin === TAB_ID) return; // ignorujemy echo własnego nadania
      // Anti-race: ignoruj wiadomości starsze lub równe ostatnio zaaplikowanej wersji.
      if (compareVersions(statePayload.version, lastAppliedVersionRef.current) <= 0) return;
      lastAppliedVersionRef.current = statePayload.version ?? [Date.now(), 0];
      setEnabled(statePayload.enabled);
      markRemoteSync();
    };
    channel.addEventListener("message", onMessage);

    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [markRemoteSync]);

  // Fallback: storage event + within-tab CustomEvent.
  useEffect(() => {
    if (!isBrowser()) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      // storage event nie niesie payloadu z `version` — używamy ogólnej heurystyki:
      // nadaj nową wersję na podstawie aktualnego zegara, ale tylko jeśli wartość faktycznie się zmieniła.
      // To wystarczy bo storage event w tej samej karcie nigdy nie wystrzeli — to zawsze inny tab.
      const next = readStored();
      setEnabled((prev) => {
        if (prev === next) return prev;
        const synthetic: [number, number] = [Date.now(), 0];
        if (compareVersions(synthetic, lastAppliedVersionRef.current) <= 0) return prev;
        lastAppliedVersionRef.current = synthetic;
        markRemoteSync();
        return next;
      });
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<StateBroadcastPayload | undefined>).detail;
      if (detail && typeof detail.enabled === "boolean") {
        if (detail.origin === TAB_ID) return;
        // Anti-race: ten sam check co dla BroadcastChannel.
        if (compareVersions(detail.version, lastAppliedVersionRef.current) <= 0) return;
        lastAppliedVersionRef.current = detail.version ?? [Date.now(), 0];
        setEnabled(detail.enabled);
        markRemoteSync();
        return;
      }
      // Bez payloadu (back-compat) — fallback na re-read przez storage-style logikę.
      const next = readStored();
      setEnabled((prev) => {
        if (prev === next) return prev;
        const synthetic: [number, number] = [Date.now(), 0];
        if (compareVersions(synthetic, lastAppliedVersionRef.current) <= 0) return prev;
        lastAppliedVersionRef.current = synthetic;
        markRemoteSync();
        return next;
      });
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, [markRemoteSync]);

  // Cleanup timeoutów przy unmount.
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (pingCollectionTimeoutRef.current) clearTimeout(pingCollectionTimeoutRef.current);
    };
  }, []);

  const toggle = useCallback((next: boolean) => {
    setEnabled(next);
    writeStored(next);

    const payload: StateBroadcastPayload = { kind: "state", enabled: next, origin: TAB_ID };

    try {
      channelRef.current?.postMessage(payload);
    } catch {
      // BroadcastChannel niedostępny — storage event zadziała
    }

    if (isBrowser()) {
      try {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
      } catch {
        // pomijamy
      }
    }
  }, []);

  /**
   * Wyślij ping diagnostyczny i zacznij zbierać pongi przez PING_COLLECTION_WINDOW_MS.
   * Zwraca Promise rozwiązany listą odpowiedzi (po zamknięciu okna).
   */
  const sendPing = useCallback((): Promise<PongResponse[]> => {
    const pingId =
      isBrowser() && "crypto" in window && "randomUUID" in window.crypto
        ? window.crypto.randomUUID()
        : `ping-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const sentAt = Date.now();

    activePingIdRef.current = pingId;
    pingSentAtRef.current = sentAt;
    setPingState({ pingId, sentAt, responses: [], isCollecting: true });

    const ping: PingPayload = {
      kind: "ping",
      pingId,
      origin: TAB_ID,
      label: TAB_LABEL,
      sentAt,
    };

    try {
      channelRef.current?.postMessage(ping);
    } catch {
      // kanał niedostępny — Promise rozwiąże się pustą listą po timeout
    }

    return new Promise((resolve) => {
      if (pingCollectionTimeoutRef.current) clearTimeout(pingCollectionTimeoutRef.current);
      pingCollectionTimeoutRef.current = setTimeout(() => {
        setPingState((prev) => {
          // tylko zamknij okno zbierania — zachowaj odpowiedzi, żeby UI mogło je pokazać
          const finalResponses = prev.pingId === pingId ? prev.responses : prev.responses;
          resolve(finalResponses);
          return { ...prev, isCollecting: false };
        });
        pingCollectionTimeoutRef.current = null;
      }, PING_COLLECTION_WINDOW_MS);
    });
  }, []);

  /** Wyczyść wynik testu (np. po kliknięciu „X" lub przy nowym pingu). */
  const clearPing = useCallback(() => {
    if (pingCollectionTimeoutRef.current) {
      clearTimeout(pingCollectionTimeoutRef.current);
      pingCollectionTimeoutRef.current = null;
    }
    activePingIdRef.current = null;
    pingSentAtRef.current = null;
    setPingState({ pingId: null, sentAt: null, responses: [], isCollecting: false });
  }, []);

  return {
    enabled,
    setEnabled: toggle,
    isRemoteSyncing,
    remoteSyncTick,
    lastRemoteSyncAt,
    /** Etykieta tej karty — pokazywana w UI obok przycisku testu. */
    tabLabel: TAB_LABEL,
    /** Stan testu synchronizacji (ping/pong). */
    pingState,
    sendPing,
    clearPing,
    /** Czy BroadcastChannel jest dostępny (niektóre tryby prywatne go nie mają). */
    isBroadcastSupported: isBrowser() && typeof BroadcastChannel !== "undefined",
  };
};
