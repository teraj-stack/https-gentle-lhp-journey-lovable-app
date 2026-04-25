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
/**
 * Klucze storage używane do testu synchronizacji w trybie storage-fallback.
 * Mechanizm: inicjator zapisuje JSON-payload w `PROBE_KEY` (nie wystrzeli to
 * `storage` eventu w jego własnej karcie — to z założenia, bo nas nie interesuje
 * własne echo). Inne karty widzą event, deserializują payload i odpowiadają
 * wpisem w `PROBE_ECHO_KEY` z tym samym `pingId`. Inicjator zbiera echa
 * przez okno PING_COLLECTION_WINDOW_MS — identycznie jak BC pong, tylko
 * przez storage. To pozwala mierzyć latencję storage round-trip i policzyć
 * aktywne karty nawet bez BroadcastChannel.
 *
 * Wartości są krótkotrwałe (czyszczone po użyciu/timeout) — nie rośnie storage.
 */
const PROBE_KEY = "cml.autosave.probe.v1";
const PROBE_ECHO_KEY = "cml.autosave.probe-echo.v1";

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

/**
 * Payload zapisywany w `PROBE_KEY` przez inicjatora storage-pinga
 * oraz w `PROBE_ECHO_KEY` przez każdą kartę odpowiadającą.
 * Schemat jest celowo płaski (string→prymityw), żeby JSON.parse w handlerze
 * storage event był taniem i bezpiecznie failował na przypadkowych wartościach.
 */
interface StorageProbePayload {
  pingId: string;
  origin: string;
  label: string;
  enabled: boolean;
  /** Kiedy inicjator wysłał probe (ms epoch) — używane do liczenia latencji round-trip. */
  sentAt: number;
  /** Kiedy responder odebrał probe (ms epoch) — wypełniane tylko w echu. */
  receivedAt?: number;
}

const safeParseProbe = (raw: string | null): StorageProbePayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StorageProbePayload;
    if (
      typeof parsed?.pingId !== "string" ||
      typeof parsed?.origin !== "string" ||
      typeof parsed?.label !== "string" ||
      typeof parsed?.enabled !== "boolean" ||
      typeof parsed?.sentAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

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
  /**
   * Kanał, którym przyszła odpowiedź. „broadcast" = klasyczny BC pong,
   * „storage" = round-trip przez localStorage probe (używany gdy BC niedostępny).
   * Pole jest opcjonalne dla back-compat — UI traktuje brak jako „broadcast".
   */
  via?: "broadcast" | "storage";
}

/**
 * Pojedynczy wpis w historii synchronizacji — pokazywany w panelu ustawień jako
 * lista ostatnich N zmian. Źródło wskazuje, którym kanałem przyszła wiadomość:
 * BroadcastChannel (główny), storage event (cross-tab fallback) lub CustomEvent
 * (within-tab, gdy jest wiele instancji hooka w jednej karcie).
 */
export interface SyncHistoryEntry {
  /** Unikalny id wpisu — używany jako React key (timestamp + counter wystarczy, brak kolizji w obrębie jednej sesji). */
  id: string;
  /** Kiedy aplikowano zmianę (ms epoch). */
  at: number;
  /** Wartość, którą ustawiono po synchronizacji. */
  enabled: boolean;
  /** Źródło sygnału. */
  source: "broadcast" | "storage" | "custom-event";
}

const HISTORY_LIMIT = 5;
let historyCounter = 0;

/**
 * Kategoria przyczyny degradacji BroadcastChannel → storage-fallback.
 * Każda wartość mapuje 1:1 na konkretne miejsce w kodzie, w którym wykrywamy
 * problem — dzięki temu UI może pokazać krótki tag, a logi konsoli pozwalają
 * jednoznacznie zlokalizować źródło.
 *
 *  - `api-missing`           — `typeof BroadcastChannel === "undefined"` (stare przeglądarki, niektóre sandboxy).
 *  - `constructor-exception` — `new BroadcastChannel(...)` rzucił wyjątek (cross-origin iframe bez allow-same-origin, polifille).
 *  - `messageerror`          — kanał wyemitował `messageerror` (niedeserializowalny payload).
 *  - `postmessage-failure`   — `postMessage` rzucił w runtime (kanał zamknięty np. po wybudzeniu z BFCache).
 *  - `simulation`            — diagnostyczne wymuszenie fallbacku przez UI (przycisk „Symuluj brak BC").
 */
export type DegradationCause =
  | "api-missing"
  | "constructor-exception"
  | "messageerror"
  | "postmessage-failure"
  | "simulation";

/**
 * Szczegóły ostatniej degradacji BC. Trzymamy zarówno kategorię (do badge'a w UI),
 * czytelny opis (do tooltipa/podpisu) oraz znacznik czasu. `errorMessage` zawiera
 * surową treść wyjątku/eventu — przydatne przy debugowaniu wieloprzyczynowych awarii.
 */
export interface DegradationInfo {
  cause: DegradationCause;
  /** Krótkie zdanie po polsku — bez stack trace, bez surowych nazw klas. */
  detail: string;
  /** Surowy komunikat błędu (gdy mamy obiekt Error). */
  errorMessage?: string;
  /** Kiedy wystąpiła degradacja (ms epoch). */
  at: number;
}

const DEGRADATION_DETAILS: Record<DegradationCause, string> = {
  "api-missing": "BroadcastChannel API nie jest dostępne w tej przeglądarce",
  "constructor-exception":
    "Konstruktor BroadcastChannel rzucił wyjątek (możliwy sandbox iframe lub tryb prywatny)",
  messageerror:
    "Kanał BroadcastChannel zwrócił błąd deserializacji wiadomości (messageerror)",
  "postmessage-failure":
    "postMessage rzucił wyjątek w runtime (kanał zamknięty, możliwe wybudzenie z BFCache)",
  simulation: "Symulacja diagnostyczna: BroadcastChannel wyłączony ręcznie",
};

/**
 * Ujednolicony helper — buduje obiekt `DegradationInfo` i loguje go do konsoli
 * (`console.warn` z prefiksem), żeby wystąpienia były łatwe do wyłapania w DevTools
 * niezależnie od stanu UI. Komunikaty są stabilne (te same kategorie/teksty),
 * dzięki czemu można je grepować w logach produkcyjnych.
 */
const buildDegradationInfo = (
  cause: DegradationCause,
  error?: unknown,
): DegradationInfo => {
  const info: DegradationInfo = {
    cause,
    detail: DEGRADATION_DETAILS[cause],
    at: Date.now(),
    errorMessage:
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : undefined,
  };
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.warn("[useAutoSave] BroadcastChannel degradation:", info, error ?? "");
  }
  return info;
};

export const useAutoSave = () => {
  const [enabled, setEnabled] = useState<boolean>(() => readStored());
  const [remoteSyncTick, setRemoteSyncTick] = useState(0);
  const [isRemoteSyncing, setIsRemoteSyncing] = useState(false);
  const [lastRemoteSyncAt, setLastRemoteSyncAt] = useState<number | null>(null);
  /**
   * Historia ostatnich N zdalnych synchronizacji (najnowsza pierwsza).
   * Trzymamy w state, żeby UI mogło reagować, ale ograniczamy do HISTORY_LIMIT,
   * by nie rosła w nieskończoność na karcie otwartej godzinami.
   */
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  /**
   * Aktywny transport synchronizacji. „broadcast" = BroadcastChannel działa,
   * „storage-fallback" = używamy tylko storage event + CustomEvent (np. tryb
   * prywatny Firefox/Safari, sandbox iframe, lub konstruktor BC rzucił wyjątek).
   * Stan jest dynamiczny — degradujemy do `storage-fallback`, gdy `postMessage`
   * zacznie rzucać (kanał padł np. po wybudzeniu tabu z BFCache).
   */
  const [transport, setTransport] = useState<"broadcast" | "storage-fallback">(() =>
    isBrowser() && typeof BroadcastChannel !== "undefined" ? "broadcast" : "storage-fallback",
  );
  /**
   * Ostatnia przyczyna zejścia na storage-fallback (lub `null`, gdy BC działa od początku).
   * Pole jest informacyjne — wyświetlane w panelu ustawień obok statusu transportu,
   * pomaga zdiagnozować, dlaczego kanał padł (tryb prywatny? sandbox? wybudzenie z BFCache?).
   * Zawiera kategorię (`cause`), czytelny opis (`detail`), surowy komunikat błędu
   * (`errorMessage` jeśli był) i znacznik czasu — wszystkie pola są również wpisywane
   * do `console.warn`, żeby debugowanie produkcji było możliwe bez UI.
   */
  const [degradationInfo, setDegradationInfo] = useState<DegradationInfo | null>(() =>
    isBrowser() && typeof BroadcastChannel === "undefined"
      ? buildDegradationInfo("api-missing")
      : null,
  );
  /**
   * Symulacja braku BroadcastChannel — używana do diagnostyki.
   * Gdy `true`, hook zachowuje się tak, jakby BC nie działał: pomija
   * `postMessage` przy lokalnym toggle i ignoruje przychodzące wiadomości BC,
   * zostawiając tylko storage event + CustomEvent jako transport.
   * Reset do `false` natychmiast przywraca BC bez przeładowania strony
   * (kanał nie jest fizycznie zamykany, więc historia subskrypcji zostaje).
   */
  const [simulateFallback, setSimulateFallback] = useState(false);

  /**
   * Stan testu synchronizacji: aktywny pingId (lub null), znacznik wysłania,
   * lista odpowiedzi i flaga „w trakcie zbierania".
   */
  const [pingState, setPingState] = useState<{
    pingId: string | null;
    sentAt: number | null;
    responses: PongResponse[];
    isCollecting: boolean;
    /**
     * Strategia użyta przy bieżącym/ostatnim teście — `broadcast` korzysta z BC ping/pong,
     * `storage` z round-tripu przez localStorage. UI pokazuje to jako podpis pod wynikiem,
     * żeby pacjent wiedział, czym dokładnie zmierzono spójność kart.
     */
    strategy: "broadcast" | "storage" | null;
  }>({ pingId: null, sentAt: null, responses: [], isCollecting: false, strategy: null });

  const channelRef = useRef<BroadcastChannel | null>(null);
  /**
   * Czy BC został świadomie zdegradowany w runtime — używane, by nie próbować
   * ponownie `postMessage` w tej sesji (jedna nieudana próba = trwała degradacja
   * do końca życia hooka; restart strony spróbuje ponownie).
   */
  const broadcastDegradedRef = useRef(false);
  /**
   * Lustro `simulateFallback` w refie — handler kanału BC żyje w useEffect bez
   * dependency na flagę (żeby nie re-bindować nasłuchu przy każdej zmianie),
   * więc czytamy aktualną wartość przez ref.
   */
  const simulateFallbackRef = useRef(false);
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
  /**
   * Lustro `transport` w refie — `sendPing` jest stabilnym callbackiem (deps: []),
   * a chcemy w nim odczytać AKTUALNY transport bez wymuszania re-bindu nasłuchów.
   */
  const transportRef = useRef<"broadcast" | "storage-fallback">(
    isBrowser() && typeof BroadcastChannel !== "undefined" ? "broadcast" : "storage-fallback",
  );

  const markRemoteSync = useCallback(
    (source: SyncHistoryEntry["source"], enabledValue: boolean) => {
      const at = Date.now();
      historyCounter += 1;
      const entry: SyncHistoryEntry = {
        id: `${at}-${historyCounter}`,
        at,
        enabled: enabledValue,
        source,
      };
      setSyncHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
      setRemoteSyncTick((n) => n + 1);
      setIsRemoteSyncing(true);
      setLastRemoteSyncAt(at);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => {
        setIsRemoteSyncing(false);
        flashTimeoutRef.current = null;
      }, REMOTE_SYNC_FLASH_MS);
    },
    [],
  );

  // Inicjalizacja BroadcastChannel (jedna na życie hooka).
  useEffect(() => {
    if (!isBrowser() || typeof BroadcastChannel === "undefined") {
      // API nieobecne — jedyna ścieżka to storage+CustomEvent fallback (już zarejestrowany w drugim effekcie).
      setTransport("storage-fallback");
      setDegradationInfo(buildDegradationInfo("api-missing"));
      return;
    }
    let channel: BroadcastChannel;
    try {
      // Konstruktor może rzucić w niektórych sandboxach (cross-origin iframe bez allow-same-origin)
      // oraz w starych wersjach Safari z polifillem. Łapiemy i schodzimy na fallback.
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch (err) {
      broadcastDegradedRef.current = true;
      setTransport("storage-fallback");
      setDegradationInfo(buildDegradationInfo("constructor-exception", err));
      return;
    }
    channelRef.current = channel;
    setTransport("broadcast");
    setDegradationInfo(null);

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
      // Symulacja braku BC — udajemy, że wiadomość nie dotarła kanałem broadcast.
      // Storage event/CustomEvent (z innej karty) i tak zaktualizują stan, więc test
      // realnie weryfikuje, czy fallback działa.
      if (simulateFallbackRef.current) return;
      // Anti-race: ignoruj wiadomości starsze lub równe ostatnio zaaplikowanej wersji.
      if (compareVersions(statePayload.version, lastAppliedVersionRef.current) <= 0) return;
      lastAppliedVersionRef.current = statePayload.version ?? [Date.now(), 0];
      setEnabled((prev) => {
        if (prev !== statePayload.enabled) markRemoteSync("broadcast", statePayload.enabled);
        return statePayload.enabled;
      });
    };
    channel.addEventListener("message", onMessage);
    // Niektóre implementacje (głównie polifille) emitują `messageerror` gdy payload
    // nie da się zdeserializować — degradujemy zachowawczo, bo nie wiemy, czy następne
    // wiadomości też nie padną.
    const onMessageError = (event: Event) => {
      broadcastDegradedRef.current = true;
      setTransport("storage-fallback");
      // Surowy event nie ma czytelnego `.message`, ale logujemy go dla pełnego kontekstu.
      setDegradationInfo(buildDegradationInfo("messageerror", event));
      try {
        channel.close();
      } catch {
        // pomijamy
      }
      channelRef.current = null;
    };
    channel.addEventListener("messageerror", onMessageError);

    return () => {
      channel.removeEventListener("message", onMessage);
      channel.removeEventListener("messageerror", onMessageError);
      channel.close();
      channelRef.current = null;
    };
  }, [markRemoteSync]);

  // Fallback: storage event + within-tab CustomEvent.
  useEffect(() => {
    if (!isBrowser()) return;

    const onStorage = (e: StorageEvent) => {
      // Storage-probe: inna karta wysłała probe — odpowiedz echem (zapis w PROBE_ECHO_KEY).
      if (e.key === PROBE_KEY) {
        const probe = safeParseProbe(e.newValue);
        if (!probe || probe.origin === TAB_ID) return; // własne probe albo śmieciowy payload
        const echo: StorageProbePayload = {
          pingId: probe.pingId,
          origin: TAB_ID,
          label: TAB_LABEL,
          enabled: readStored(),
          sentAt: probe.sentAt,
          receivedAt: Date.now(),
        };
        try {
          // Dodajemy nonce do wartości, żeby kolejne echa do tego samego pingId
          // od różnych kart NA PEWNO triggerowały storage event (zmiana wartości).
          // Bez nonce dwie karty z identycznym TAB_LABEL/enabled mogłyby nadpisać
          // wartością binarnie identyczną — wtedy storage event nie wystrzeli
          // u inicjatora i odpowiedź by zniknęła.
          window.localStorage.setItem(
            PROBE_ECHO_KEY,
            JSON.stringify({ ...echo, _nonce: Math.random().toString(36).slice(2) }),
          );
        } catch {
          // brak miejsca / tryb prywatny — pomijamy, inicjator i tak dostanie timeout
        }
        return;
      }

      // Storage-probe echo: dotarła odpowiedź na nasz aktywny ping.
      if (e.key === PROBE_ECHO_KEY) {
        const echo = safeParseProbe(e.newValue);
        if (!echo) return;
        if (echo.origin === TAB_ID) return; // własne echo (nie powinno wystrzelić, ale safety net)
        if (echo.pingId !== activePingIdRef.current) return; // echo na stary ping — ignoruj
        const sentAt = pingSentAtRef.current ?? echo.sentAt;
        const latencyMs = Math.max(0, Date.now() - sentAt);
        setPingState((prev) => {
          if (prev.responses.some((r) => r.origin === echo.origin)) return prev;
          return {
            ...prev,
            responses: [
              ...prev.responses,
              {
                origin: echo.origin,
                label: echo.label,
                enabled: echo.enabled,
                latencyMs,
                via: "storage",
              },
            ],
          };
        });
        return;
      }

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
        markRemoteSync("storage", next);
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
        setEnabled((prev) => {
          if (prev !== detail.enabled) markRemoteSync("custom-event", detail.enabled);
          return detail.enabled;
        });
        return;
      }
      // Bez payloadu (back-compat) — fallback na re-read przez storage-style logikę.
      const next = readStored();
      setEnabled((prev) => {
        if (prev === next) return prev;
        const synthetic: [number, number] = [Date.now(), 0];
        if (compareVersions(synthetic, lastAppliedVersionRef.current) <= 0) return prev;
        lastAppliedVersionRef.current = synthetic;
        markRemoteSync("custom-event", next);
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

  // Lustrzane odbicie state→ref dla simulateFallback (handler BC w useEffect).
  useEffect(() => {
    simulateFallbackRef.current = simulateFallback;
  }, [simulateFallback]);

  // Lustro `transport` w refie — używane przez `sendPing` do wyboru strategii bez re-bindu.
  useEffect(() => {
    transportRef.current = transport;
  }, [transport]);

  const toggle = useCallback((next: boolean) => {
    // Generujemy nową wersję dla TEJ lokalnej zmiany. Każdy odbiorca (inna instancja
    // tego samego hooka, inna karta, fallback przez storage) zignoruje ją, jeśli
    // w międzyczasie zaaplikował coś nowszego — najnowsza zmiana zawsze wygrywa.
    const version = nextVersion();
    lastAppliedVersionRef.current = version;

    setEnabled(next);
    // Storage write to nasz uniwersalny fallback transport — robimy go ZAWSZE,
    // niezależnie czy BC działa. Inne karty bez BC dostaną storage event, a karty
    // z BC zignorują storage (bo dostaną świeższy payload przez kanał z wersją).
    writeStored(next);

    const payload: StateBroadcastPayload = {
      kind: "state",
      enabled: next,
      origin: TAB_ID,
      version,
    };

    // Próbujemy BC tylko jeśli kanał istnieje i nie został zdegradowany.
    // Symulacja braku BC pomija postMessage — storage write powyżej i CustomEvent
    // poniżej zostają, więc inne karty i komponenty nadal odbiorą zmianę.
    if (channelRef.current && !broadcastDegradedRef.current && !simulateFallbackRef.current) {
      try {
        channelRef.current.postMessage(payload);
      } catch (err) {
        // Kanał padł w runtime (np. po wybudzeniu z BFCache) — degradujemy trwale,
        // żeby kolejne toggle nie traciły czasu na próbę. Storage write powyżej
        // i CustomEvent poniżej gwarantują, że zmiana i tak doleci do innych kart i komponentów.
        broadcastDegradedRef.current = true;
        setTransport("storage-fallback");
        setDegradationInfo(buildDegradationInfo("postmessage-failure", err));
        try {
          channelRef.current.close();
        } catch {
          // pomijamy
        }
        channelRef.current = null;
      }
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
   *
   * Strategia jest wybierana automatycznie wg aktywnego transportu:
   *  - `broadcast` (BC działa) — klasyczny ping/pong przez BroadcastChannel.
   *  - `storage-fallback` (BC niedostępny lub symulacja) — round-trip przez
   *    localStorage: zapisujemy probe w PROBE_KEY, inne karty odpisują w PROBE_ECHO_KEY.
   *    Mierzona metryka pozostaje ta sama (latencja round-trip + lista origins),
   *    więc UI nie musi rozróżniać przypadków poza zwykłą etykietą strategii.
   */
  const sendPing = useCallback((): Promise<PongResponse[]> => {
    const pingId =
      isBrowser() && "crypto" in window && "randomUUID" in window.crypto
        ? window.crypto.randomUUID()
        : `ping-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const sentAt = Date.now();
    // Wybór strategii — czytamy z refa, żeby nie wymuszać re-bindu callbacka przy zmianie transportu.
    // Symulacja braku BC zmienia `transport` na storage-fallback, więc trafi tu naturalnie.
    const strategy: "broadcast" | "storage" =
      transportRef.current === "broadcast" ? "broadcast" : "storage";

    activePingIdRef.current = pingId;
    pingSentAtRef.current = sentAt;
    setPingState({ pingId, sentAt, responses: [], isCollecting: true, strategy });

    if (strategy === "broadcast") {
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
    } else {
      // Storage probe — zapis w PROBE_KEY wystrzeli `storage` event TYLKO w innych kartach
      // (W3C: storage event nie wraca do nadawcy), więc nie ma ryzyka echa we własnej karcie.
      const probe: StorageProbePayload = {
        pingId,
        origin: TAB_ID,
        label: TAB_LABEL,
        enabled: readStored(),
        sentAt,
      };
      try {
        // Nonce gwarantuje, że dwa kolejne pingi (z tym samym wynikiem) wciąż triggerują storage event.
        window.localStorage.setItem(
          PROBE_KEY,
          JSON.stringify({ ...probe, _nonce: Math.random().toString(36).slice(2) }),
        );
      } catch {
        // brak miejsca / tryb prywatny — Promise rozwiąże się pustą listą po timeout
      }
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
        // Sprzątanie kluczy storage probe — żeby nie zostawiać śmieci w localStorage.
        // Robimy to TYLKO gdy używaliśmy strategii storage; dla BC nie ma czego sprzątać.
        if (strategy === "storage" && isBrowser()) {
          try {
            window.localStorage.removeItem(PROBE_KEY);
            window.localStorage.removeItem(PROBE_ECHO_KEY);
          } catch {
            // pomijamy
          }
        }
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
    setPingState({ pingId: null, sentAt: null, responses: [], isCollecting: false, strategy: null });
    // Posprzątaj storage probe keys także przy ręcznym zamknięciu wyniku.
    if (isBrowser()) {
      try {
        window.localStorage.removeItem(PROBE_KEY);
        window.localStorage.removeItem(PROBE_ECHO_KEY);
      } catch {
        // pomijamy
      }
    }
  }, []);

  /**
   * Włącza/wyłącza symulację braku BroadcastChannel. Aktualizuje też pochodne pola
   * (transport, degradationInfo), żeby UI od razu pokazało nowy stan.
   * Wyłączenie symulacji przywraca poprzedni transport — `broadcast` jeśli kanał
   * nie był wcześniej zdegradowany trwale, inaczej zostaje `storage-fallback`.
   */
  const setSimulateFallbackMode = useCallback((next: boolean) => {
    setSimulateFallback(next);
    if (next) {
      setTransport("storage-fallback");
      setDegradationInfo(buildDegradationInfo("simulation"));
    } else if (channelRef.current && !broadcastDegradedRef.current) {
      // Przywróć BC tylko jeśli kanał nadal istnieje i nie padł w międzyczasie.
      setTransport("broadcast");
      setDegradationInfo(null);
    }
    // Jeśli kanał był trwale zdegradowany, transport i info zostają — to nie symulacja, tylko realny fallback.
  }, []);

  /**
   * Czyści wyświetlaną w UI historię „Ostatnia zmiana": resetuje znacznik
   * `lastRemoteSyncAt`, listę `syncHistory` oraz natychmiast wygasza flagę
   * podświetlenia (`isRemoteSyncing`), żeby UI nie pulsowało resztkową animacją.
   *
   * UWAGA: nie dotyka stanu samego przełącznika (`enabled`) ani transportu —
   * to wyłącznie reset prezentacyjny. Kolejna zdalna synchronizacja zaczyna
   * historię od nowa, więc operacja jest bezpieczna i odwracalna w sposób naturalny.
   */
  const clearSyncHistory = useCallback(() => {
    setLastRemoteSyncAt(null);
    setSyncHistory([]);
    setIsRemoteSyncing(false);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
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
    /**
     * Czy BroadcastChannel jest aktywnie używany. False, gdy:
     *  - API nieobecne (np. tryb prywatny Safari w starszych wersjach),
     *  - konstruktor rzucił wyjątek (np. sandbox iframe),
     *  - `postMessage` padł w runtime i zdegradowaliśmy do storage fallback.
     * UI używa tego do pokazania komunikatu „Test synchronizacji niedostępny".
     */
    isBroadcastSupported: transport === "broadcast",
    /** Aktywny transport — przydatne do diagnostyki w UI ustawień. */
    transport,
    /**
     * Szczegóły ostatniej degradacji do storage-fallback (lub `null` gdy BC działa).
     * Zawiera kategorię (`cause`), czytelny opis (`detail`), surowy komunikat błędu
     * i znacznik czasu — UI prezentuje kategorię jako badge, a opis jako podpis.
     */
    degradationInfo,
    /** Czy obecnie symulujemy brak BC (diagnostycznie wymuszony fallback). */
    simulateFallback,
    /** Włącza/wyłącza symulację braku BC bez przeładowania strony. */
    setSimulateFallback: setSimulateFallbackMode,
    /** Historia ostatnich {HISTORY_LIMIT} zdalnych synchronizacji (najnowsza pierwsza). */
    syncHistory,
    /**
     * Czyści wyświetlaną historię synchronizacji (lastRemoteSyncAt + syncHistory + flash).
     * Nie wpływa na stan przełącznika ani transport — jest czysto prezentacyjne.
     */
    clearSyncHistory,
  };
};
