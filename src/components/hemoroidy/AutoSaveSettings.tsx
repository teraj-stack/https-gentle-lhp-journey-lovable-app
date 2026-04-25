import { useCallback, useEffect, useRef, useState } from "react";
import {
  Save,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Radio,
  X,
  Loader2,
  WifiOff,
  History,
  Wifi,
  HardDrive,
  Layers,
  Activity,
  Lightbulb,
  MousePointerClick,
  CalendarOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/useAutoSave";
import { toast } from "@/hooks/use-toast";
import SyncDiagnosticPanel from "@/components/hemoroidy/SyncDiagnosticPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatTimestamp,
  formatFullTimestamp,
  isValidTimestamp,
  useTimeFormatPreference,
  type TimeFormatMode,
} from "@/hooks/useTimeFormatPreference";
import {
  isLastChangeVisible,
  useLastChangeVisibility,
  type LastChangeVisibility,
} from "@/hooks/useLastChangeVisibility";
import { getLastChangeLabelStyle } from "@/lib/lastChangeLabelStyle";
import { type Locale } from "@/lib/lastChangeTooltipContent";
import {
  buildLastChangeTooltipModel,
  type TimeValueFormat,
} from "@/lib/lastChangeTooltipModel";
import { useLocalePreference } from "@/hooks/useLocalePreference";

/**
 * Etykiety segmented control dla wyboru widoczności „Ostatniej zmiany".
 * Cztery warianty: Obie / Zdalne / Lokalne / Wyłączone — pozwalają pacjentowi
 * dopasować, kiedy ma się pojawiać pasek pod Switch'em.
 */
const VISIBILITY_OPTIONS: Array<{
  value: LastChangeVisibility;
  short: string;
  label: string;
  hint: string;
}> = [
  {
    value: "both",
    short: "Obie",
    label: "Pokazuj wszystkie zmiany",
    hint: "Etykieta pojawia się przy każdej zmianie — lokalnej i zdalnej.",
  },
  {
    value: "remote",
    short: "Zdalne",
    label: "Tylko synchronizacje z innych kart",
    hint: "Pokazuj etykietę tylko gdy zmiana przyszła z innej karty.",
  },
  {
    value: "local",
    short: "Lokalne",
    label: "Tylko moje kliknięcia w tej karcie",
    hint: "Pokazuj etykietę tylko gdy to ja przełączyłem Switch.",
  },
  {
    value: "off",
    short: "Ukryj",
    label: "Ukryj etykietę",
    hint: 'Etykieta „Ostatnia zmiana" nie pojawia się wcale.',
  },
];

/**
 * Etykiety segmented control dla wyboru formatu „Ostatniej zmiany".
 * Trzymamy w jednym miejscu, żeby UI i aria-label były spójne.
 */
const TIME_FORMAT_OPTIONS: Array<{
  value: TimeFormatMode;
  short: string;
  label: string;
  hint: string;
}> = [
  {
    value: "relative",
    short: "Względny",
    label: "Format względny",
    hint: "np. 2 min temu — odświeżany automatycznie co 15 s.",
  },
  {
    value: "clock",
    short: "Godzina",
    label: "Sama godzina",
    hint: "HH:MM:SS — kompaktowo, bez daty.",
  },
  {
    value: "full",
    short: "Pełna",
    label: "Pełna data i godzina",
    hint: "Dzień, miesiąc, rok i godzina — do długo otwartych kart.",
  },
];

interface AutoSaveSettingsProps {
  /**
   * Ile niezapisanych zmian czeka w drafcie (do pokazania ostrzeżenia gdy auto-zapis OFF).
   * Liczone w komponencie nadrzędnym (DiaryFullModule) — tu tylko prezentujemy.
   */
  pendingDraftCount?: number;
  /**
   * Callback wywoływany po kliknięciu „Zapisz dzień" w panelu (gdy auto-zapis OFF).
   * Powinien zapisać draft aktywnej daty do storage'u — logika walidacji
   * (np. wymóg kompletu odpowiedzi) leży po stronie nadrzędnego komponentu.
   */
  onSaveDay?: () => void;
  /**
   * Czytelna etykieta aktywnej daty (np. „środa, 23 kwietnia 2026") —
   * wyświetlana w opisie przycisku, żeby pacjent wiedział, którego dnia dotyczy zapis.
   */
  activeDateLabel?: string;
}

/**
 * Panel ustawień auto-zapisu odpowiedzi quizu (lokalnie, w przeglądarce).
 *
 * Stan trzymany w `useAutoSave` (localStorage). Domyślnie ON — back-compat.
 * Po wyłączeniu, kliknięcia w odpowiedzi i edycja notatek w dzienniku trafiają tylko
 * do tymczasowego draftu w pamięci komponentu — pacjent musi kliknąć „Zapisz dzień",
 * żeby przepisać je do storage'u (tę logikę implementuje DiaryFullModule).
 */
const AutoSaveSettings = ({ pendingDraftCount = 0, onSaveDay, activeDateLabel }: AutoSaveSettingsProps) => {
  const {
    enabled,
    setEnabled,
    isRemoteSyncing,
    lastRemoteSyncAt,
    tabLabel,
    pingState,
    sendPing,
    clearPing,
    isBroadcastSupported,
    syncHistory,
    transport,
    degradationInfo,
    degradationHistory,
    clearDegradationHistory,
    simulateFallback,
    setSimulateFallback,
    clearSyncHistory,
    lastChangeSource,
    lastChangeAt,
  } = useAutoSave();

  /**
   * Preferencja formatu czasu dla etykiet typu „Ostatnia zmiana".
   * Przechowywana w localStorage i synchronizowana między instancjami panelu
   * przez CustomEvent — patrz `useTimeFormatPreference`.
   */
  const { mode: timeFormatMode, setMode: setTimeFormatMode } = useTimeFormatPreference();

  /**
   * Preferencja widoczności etykiety „Ostatnia zmiana:" — pacjent może filtrować
   * wyświetlanie zależnie od źródła zmiany (lokalna / zdalna / obie / ukryj).
   * Stan persystowany w localStorage i synchronizowany cross-tab.
   */
  const { visibility: lastChangeVisibility, setVisibility: setLastChangeVisibility } =
    useLastChangeVisibility();
  const showLastChangeLabel = isLastChangeVisible(lastChangeVisibility, lastChangeSource);

  /**
   * Preferencja języka tooltipa „Ostatnia zmiana" (PL/EN). Persystowana w
   * localStorage przez `useLocalePreference` — przeżywa F5/zamknięcie karty
   * i synchronizuje się cross-tab. Zastępuje wcześniejszą auto-detekcję
   * `navigator.language` (która nadal jest fallbackiem przy pierwszym wejściu,
   * gdy localStorage jest pusty).
   */
  const [tooltipLocale, setTooltipLocale] = useLocalePreference();

  /**
   * Symulacja braku BC + sanity check: po włączeniu robimy tymczasowy toggle
   * przełącznika (na bieżącą wartość) i sprawdzamy w historii, czy zmiana
   * wróciła kanałem fallbackowym. To potwierdza, że storage+CustomEvent wciąż
   * dostarczają zmiany do innych kart.
   */
  const handleSimulateFallback = () => {
    const next = !simulateFallback;
    setSimulateFallback(next);
    toast({
      title: next ? "Symulacja: BroadcastChannel wyłączony" : "Symulacja zakończona",
      description: next
        ? "Transport wymuszony na storage-fallback. Przełącz auto-zapis w innej karcie — synchronizacja powinna działać dalej przez storage event."
        : "Przywrócono normalny transport BroadcastChannel (jeśli był aktywny).",
      duration: 4500,
    });
  };
  /**
   * Tick używany do auto-odświeżania etykiet czasu. Częstotliwość zależy od trybu:
   *  - `relative` — co 15 s (granulacja minutowa wystarcza),
   *  - `clock`    — co 1 s (chcemy widzieć aktualizację sekund),
   *  - `full`     — brak ticka (data nie zmienia się szybko, wystarczy render na zmianę).
   */
  const [, setNowTick] = useState(0);

  /**
   * Stan podglądu dla sekcji „Co oznacza synchronizacja między kartami vs lokalna akcja".
   * Trzymany WYŁĄCZNIE lokalnie w komponencie — nie modyfikuje realnego `useAutoSave`,
   * nie wywołuje toast'ów ani nie wpływa na storage. To czysty edukacyjny preview, który
   * pokazuje, jak wygląda etykieta + tooltip + badge dla każdego ze źródeł zmiany.
   *  - `null`   — sekcja schowana, żaden przycisk nie był jeszcze klikany,
   *  - `remote` — symulacja przyjścia zmiany z innej karty (BroadcastChannel/storage),
   *  - `local`  — symulacja ręcznego kliknięcia Switch / skrótu Alt+Shift+A w tej karcie.
   * Razem z `demoAt` (timestamp wyboru) pozwala wygenerować realistyczne etykiety
   * używając tych samych helperów co reszta panelu — dzięki temu user widzi 1:1,
   * co go czeka, a nie schematyczny mock.
   */
  const [demoSource, setDemoSource] = useState<"remote" | "local" | null>(null);
  const [demoAt, setDemoAt] = useState<number | null>(null);
  /**
   * Toggle podglądu „brak pełnej daty" — symuluje sytuację, w której formatter
   * `formatFullTimestamp` nie zwrócił czytelnej wartości (np. invalid timestamp,
   * pusty string, „—"). Komponent w tym trybie spada na etykietę względną
   * (`lastSyncLabel`) i dokleja kwalifikator „(etykieta względna)" do aria-label
   * + title — pacjent/audytor a11y widzi 1:1, jak wygląda fallback w obu kanałach
   * (wizualny tooltip + dane dla screen readera) bez czekania na realny edge case.
   */
  const [demoHideFullDate, setDemoHideFullDate] = useState(false);
  /**
   * Live preview tooltipa — dodatkowe kontrolki, które pacjent/audytor a11y
   * może przełączać na żywo, żeby zobaczyć WSZYSTKIE warianty wynikowego
   * `buildLastChangeTooltipModel` w jednym miejscu, bez potrzeby zmuszania
   * realnych zdarzeń auto-zapisu.
   *
   *  - `previewFormat` — `TimeValueFormat` przekazywany do helpera.
   *    Pozwala porównać wpływ trybu „single-space"/„compact"/„preserve-newlines"
   *    na widoczny tooltip i ariaText (parytet view↔a11y jest wymuszony
   *    w samym helperze).
   *  - `previewLocale` — PL/EN. Pokazuje na żywo, jak zmienia się prefiks
   *    linii czasu (Czas:/Time:), kwalifikator fallbacku, helpTitle i
   *    nagłówek/opis źródła.
   *  - `previewRelativeOverride` — opcjonalny tekst zastępujący domyślne
   *    `formatTimestamp(demoAt, …)` w roli `relativeLabel`. Ułatwia testowanie
   *    edge case'ów (np. wartość z newline'em, multiple spaces, pusty string)
   *    bez czekania na konkretny upływ czasu.
   *
   * Wszystkie kontrolki działają niezależnie od `demoSource`/`demoHideFullDate`
   * — zmiana którejkolwiek z nich natychmiast przeliczy podgląd, więc pacjent
   * widzi efekt 1:1.
   */
  const [previewFormat, setPreviewFormat] = useState<TimeValueFormat>("single-space");
  const [previewLocale, setPreviewLocale] = useState<Locale>("pl");
  const [previewRelativeOverride, setPreviewRelativeOverride] = useState<string>("");

  const handleDemoSelect = (source: "remote" | "local") => {
    setDemoSource(source);
    setDemoAt(Date.now());
  };
  const handleToggleHideFullDate = () => {
    setDemoHideFullDate((prev) => !prev);
    // Aktywuj demo jeśli pacjent jeszcze nie wybrał źródła — domyślnie remote,
    // żeby kontrast „przed/po" był od razu widoczny bez dodatkowego kliknięcia.
    if (demoSource === null) {
      setDemoSource("remote");
      setDemoAt(Date.now());
    }
  };

  useEffect(() => {
    if (lastRemoteSyncAt === null) return;
    if (timeFormatMode === "full") return;
    const intervalMs = timeFormatMode === "clock" ? 1_000 : 15_000;
    const interval = setInterval(() => setNowTick((n) => n + 1), intervalMs);
    return () => clearInterval(interval);
  }, [lastRemoteSyncAt, timeFormatMode]);

  /**
   * Toast informujący o zdalnej synchronizacji — odpala się gdy `lastRemoteSyncAt`
   * zmieni się NA NOWĄ wartość (czyli realnie przyszła zmiana z innej karty
   * lub fallbackowego storage event'u). Pomijamy mount initial: jeśli komponent
   * zamontuje się z już istniejącym `lastRemoteSyncAt` (np. user właśnie wszedł
   * na podstronę po wcześniejszej synchronizacji), nie pokazujemy starego eventu.
   */
  const lastToastedSyncAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (lastRemoteSyncAt === null) return;
    // Pierwszy render po mount: ustaw baseline i nie pokazuj toasta dla starego eventu.
    if (lastToastedSyncAtRef.current === null) {
      lastToastedSyncAtRef.current = lastRemoteSyncAt;
      return;
    }
    if (lastRemoteSyncAt === lastToastedSyncAtRef.current) return;
    lastToastedSyncAtRef.current = lastRemoteSyncAt;
    toast({
      title: "Zsynchronizowano z inną kartą",
      description: `Auto-zapis: ${enabled ? "ON" : "OFF"} — zmiana zastosowana lokalnie.`,
      duration: 2200,
    });
    // Świadomie zależność tylko od `lastRemoteSyncAt` — `enabled` czytamy aktualne
    // przez closure tej samej tury renderu (i tak w toście jest snapshot, nie subskrypcja).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRemoteSyncAt]);

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    toast({
      title: next ? "Auto-zapis włączony" : "Auto-zapis wyłączony",
      description: next
        ? "Każda zmiana odpowiedzi i notatek będzie od razu zapisywana lokalnie."
        : 'Zmiany trafiają tylko do tymczasowego draftu — pamiętaj o kliknięciu „Zapisz dzień".',
      duration: 2400,
    });
  };

  /**
   * Globalny skrót klawiaturowy do przełączenia auto-zapisu — przyspiesza testowanie
   * synchronizacji między kartami: jedno naciśnięcie w karcie A natychmiast trzaska
   * przełącznikiem i propaguje zmianę przez BroadcastChannel/storage do karty B.
   *
   * Wybrany kombo: **Alt+Shift+A** (A jak Auto-save).
   *  - Nie koliduje z natywnymi skrótami przeglądarek (Ctrl/Cmd zarezerwowane dla
   *    operacji systemowych, samo Alt+litera otwiera menu w niektórych desktopach).
   *  - Działa cross-platform: na macOS odpowiada to ⌥⇧A.
   *
   * Skrót jest **wyłączony**, gdy fokus znajduje się w polu edycji tekstu
   * (input/textarea/contenteditable/select), żeby nie przeszkadzać w pisaniu
   * notatek diariusza ani w wyszukiwarce.
   */
  // Trzymamy aktualny `enabled` w refie, żeby handler odpalany przez window event
  // widział świeżą wartość bez re-bindowania nasłuchu przy każdej zmianie state'u.
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const isEditableTarget = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (target.isContentEditable) return true;
    return false;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Sprawdzamy modyfikatory PRZED `key`, żeby nie alokować nic na zwykłych literach.
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
      // `e.code` używamy zamiast `e.key`, bo z Shift+Alt litera może mieć inny mapping
      // (np. niektóre układy klawiatury produkują znak specjalny zamiast „A").
      if (e.code !== "KeyA") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      const next = !enabledRef.current;
      setEnabled(next);
      toast({
        title: `Skrót: auto-zapis ${next ? "ON" : "OFF"}`,
        description: "Zmiana zostanie rozpropagowana do innych otwartych kart.",
        duration: 2000,
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditableTarget, setEnabled]);

  const handleSendPing = async () => {
    // Test działa zawsze — w trybie storage-fallback używamy round-tripu przez localStorage
    // (odpowiedzi liczone tak samo jak BC pong, tylko etykietowane jako „storage").
    const usingStorage = !isBroadcastSupported;
    const responses = await sendPing();
    const transportLabel = usingStorage ? " (storage round-trip)" : "";
    toast({
      title:
        responses.length === 0
          ? `Brak odpowiedzi z innych kart${transportLabel}`
          : `Odpowiedziało ${responses.length} kart${transportLabel}`,
      description:
        responses.length === 0
          ? usingStorage
            ? "Otwórz tę stronę w drugiej karcie — odpowiedź dotrze przez storage event (zwykle 50–300 ms wolniej niż BroadcastChannel)."
            : "Otwórz tę stronę w drugiej karcie i spróbuj ponownie."
          : responses.map((r) => `${r.label} (${r.latencyMs} ms)`).join(", "),
      duration: 4000,
    });
  };

  // Etykieta „Ostatnia zmiana" honoruje wybrany przez użytkownika tryb formatu
  // (relative / clock / full). Pokazujemy ją dla KAŻDEJ zmiany (lokalnej i zdalnej),
  // ale kolor zielony rezerwujemy WYŁĄCZNIE dla zdalnej synchronizacji
  // (`lastChangeSource === "remote"`) — lokalne kliknięcia używają neutralnego koloru,
  // żeby nie sugerować, że właśnie coś przyszło z innej karty.
  //
  // Walidacja `lastChangeAt` przez `isValidTimestamp` chroni przed degradacją
  // do „Invalid Date" / NaN, gdyby kiedyś hook zwrócił 0 / niepoprawny payload —
  // wtedy nie pokazujemy etykiety wcale (zamiast paska ze śmieciem).
  const hasValidChangeAt = isValidTimestamp(lastChangeAt);
  const lastSyncLabel = hasValidChangeAt
    ? formatTimestamp(lastChangeAt as number, timeFormatMode)
    : null;
  // Pełna data + godzina jako tooltip — pomocna gdy karta wisi długo otwarta.
  // Korzystamy ze wspólnego helpera `formatFullTimestamp`, żeby format był
  // identyczny we wszystkich miejscach (tooltip, mini-historia, diagnostyka).
  const lastSyncFullDate = hasValidChangeAt
    ? formatFullTimestamp(lastChangeAt as number)
    : undefined;
  const isRemoteChange = lastChangeSource === "remote";
  // Pure helper sterujący kolorami etykiety — pokryty testami w lastChangeLabelStyle.test.ts.
  const labelStyle = getLastChangeLabelStyle(lastChangeSource, isRemoteSyncing);

  return (
    <div
      className={`glass-card rounded-2xl p-4 sm:p-5 mb-6 transition-shadow duration-500 ${
        isRemoteSyncing
          ? "ring-2 ring-emerald-400/50 shadow-[0_0_24px_hsl(152_70%_50%/0.25)]"
          : "ring-0 shadow-none"
      }`}
    >
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`shrink-0 mt-0.5 sm:mt-0 inline-flex items-center justify-center w-9 h-9 rounded-lg ${
              enabled
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-primary/15 text-primary"
            }`}
            aria-hidden="true"
          >
            <Save className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="autosave-toggle"
              className="font-sans text-sm sm:text-base font-medium text-foreground inline-flex items-center gap-2 cursor-pointer"
            >
              Auto-zapis odpowiedzi
              <span
                role="status"
                aria-live="polite"
                aria-label={`Auto-zapis ${enabled ? "włączony" : "wyłączony"}${
                  isRemoteSyncing ? " — właśnie zsynchronizowano z inną kartą" : ""
                }`}
                className={`text-[11px] px-1.5 py-0.5 rounded-md font-sans border transition-shadow duration-200 ${
                  enabled
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : "bg-primary/15 text-primary border-primary/40"
                } ${
                  isRemoteSyncing
                    ? enabled
                      ? "animate-pulse ring-2 ring-emerald-400/60 shadow-[0_0_12px_hsl(var(--primary)/0.0)]"
                      : "animate-pulse ring-2 ring-primary/60"
                    : ""
                }`}
              >
                Auto-zapis: {enabled ? "ON" : "OFF"}
              </span>
              {isRemoteSyncing && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-sans text-muted-foreground animate-pulse"
                  aria-hidden="true"
                >
                  <RefreshCw className="w-3 h-3" />
                  Zsynchronizowano
                </span>
              )}
            </label>
            {/* Etykieta „Ostatnia zmiana" przeniesiona pod Switch — patrz blok poniżej. */}
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              {enabled ? (
                <span className="inline-flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                  Każda zmiana zapisywana natychmiast w pamięci przeglądarki —
                  nawet po przypadkowym zamknięciu karty nic nie zniknie.
                </span>
              ) : (
                <span className="inline-flex items-start gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                  Zmiany trafiają tylko do tymczasowego draftu. Aby zapisać dzień,
                  kliknij „Zapisz dzień" — inaczej dane znikną po odświeżeniu strony.
                  {pendingDraftCount > 0 && (
                    <strong className="text-foreground">
                      {" "}({pendingDraftCount} niezapisan{pendingDraftCount === 1 ? "a zmiana" : "ych zmian"})
                    </strong>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Switch
            id="autosave-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            aria-label="Przełącz auto-zapis odpowiedzi quizu"
            aria-keyshortcuts="Alt+Shift+A"
          />
          <p
            className="text-[10px] font-sans text-muted-foreground/80 inline-flex items-center gap-1"
            title="Naciśnij Alt+Shift+A, aby przełączyć auto-zapis (działa też do testowania synchronizacji między kartami)."
          >
            Skrót:{" "}
            <kbd className="px-1 py-0.5 rounded border border-border/60 bg-muted text-foreground/90 font-mono text-[10px] leading-none">
              Alt
            </kbd>
            <span aria-hidden="true">+</span>
            <kbd className="px-1 py-0.5 rounded border border-border/60 bg-muted text-foreground/90 font-mono text-[10px] leading-none">
              Shift
            </kbd>
            <span aria-hidden="true">+</span>
            <kbd className="px-1 py-0.5 rounded border border-border/60 bg-muted text-foreground/90 font-mono text-[10px] leading-none">
              A
            </kbd>
          </p>
          {lastSyncLabel && showLastChangeLabel && (() => {
            // SINGLE SOURCE OF TRUTH dla treści tooltipa „Ostatnia zmiana".
            //
            // Helper `buildLastChangeTooltipModel` zbiera wszystkie warunki
            // renderowania w jednym miejscu — komponent tylko czyta pola modelu
            // i przekazuje je do JSX. Dzięki temu widoczny `<TooltipContent>`,
            // `aria-label` triggera oraz natywny `title` (touch fallback) NIE
            // mogą się rozjechać: wszystkie kanały biorą dane z tego samego
            // obiektu, a logika fallbacków (full date → relative label →
            // brak linii czasu) jest w 100% pokryta testami jednostkowymi
            // helpera bez konieczności renderu komponentu w jsdom.
            //
            // Każdy nowy kanał (eksport PDF, narrator screen-reader-only,
            // alternatywny tooltip) MUSI również czytać z tego helpera —
            // inline składanie stringów `Czas: ${…}` w JSX jest zakazane.
            const tooltipModel = buildLastChangeTooltipModel({
              source: lastChangeSource,
              fullDate: lastSyncFullDate,
              relativeLabel: lastSyncLabel,
              // Locale czytany z PERSYSTOWANEJ preferencji użytkownika
              // (`useLocalePreference`). Default = `navigator.language` przy
              // pierwszym wejściu, dalej kontrolowany przez segmented selector
              // poniżej (synchronizacja cross-tab przez `storage` event).
              locale: tooltipLocale,
            });
            const { content: tooltipContent, ariaText: tooltipText } = tooltipModel;
            return (
            <div
              key={lastChangeAt ?? "none"}
              className={`text-[11px] font-sans inline-flex items-center gap-1.5 transition-colors animate-fade-in ${labelStyle.containerClass}`}
              aria-label={tooltipText}
              aria-live="polite"
            >
              {/* Radix Tooltip opisuje źródło zmiany (lokalna vs sync między kartami).
                  Trigger to span ikoną + tekstem — opakowuje TYLKO informacyjną
                  część etykiety, żeby przycisk „X" obok miał własny title bez kolizji.
                  Native `title` zostaje na trigger jako fallback dla touch (Radix
                  Tooltip nie pokazuje się na hover dotykowym). */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex items-center gap-1.5 cursor-help"
                    title={tooltipText}
                    tabIndex={0}
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${labelStyle.iconClass}`}
                      aria-hidden="true"
                    />
                    <span>
                      Ostatnia zmiana:{" "}
                      <strong className={labelStyle.strongClass}>
                        {lastSyncLabel}
                      </strong>
                      {labelStyle.showLocalSuffix && (
                        // Wyraźny badge „(lokalnie)" — border + tło + uppercase + font-mono,
                        // żeby pacjent natychmiast widział, że to JEGO zmiana w tej karcie,
                        // a nie sync z innej karty (dla którego cała etykieta świeci na zielono).
                        // Celowo neutralna paleta (muted), bo zielony rezerwujemy dla remote.
                        // aria-label współdzieli string z `tooltipContent.ariaHeading`,
                        // żeby brzmienie „karta" było identyczne w tooltip + badge + a11y.
                        <span
                          className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded-md border border-border/60 bg-muted/40 text-foreground/80 align-middle"
                          aria-label={tooltipContent.ariaHeading}
                        >
                          {tooltipContent.shortBadge}
                        </span>
                      )}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {/* Struktura tooltipa: nagłówek koloryzowany per źródło + opis
                      mechanizmu + linia czasu. Symetryczne kolory: zielony dla remote,
                      neutralny dla local — zgodnie z całym systemem etykiet.
                      Linia czasu: gdy mamy pełną datę → renderujemy ją w font-mono;
                      gdy mamy tylko względną etykietę (np. „2 min temu") → też ją
                      pokazujemy, żeby tooltip nigdy nie urywał się po opisie bez
                      kontekstu czasowego. Pusta linia w ogóle nie jest renderowana
                      (warunek `tooltipTimeValue && …`), więc layout się nie rwie. */}
                  <div className="space-y-1">
                    <p
                      className={`text-xs font-semibold ${
                        isRemoteChange ? "text-emerald-400" : "text-foreground"
                      }`}
                    >
                      {tooltipContent.heading}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {tooltipContent.description}
                    </p>
                    {tooltipModel.shouldRenderTimeLine && (
                      <p
                        className="text-[10px] text-muted-foreground/80 font-mono"
                        title={tooltipModel.timeLineHelpTitle}
                      >
                        {tooltipModel.timeValue}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              <button
                type="button"
                onClick={() => {
                  clearSyncHistory();
                  toast({
                    title: "Historia synchronizacji wyczyszczona",
                    description:
                      'Etykieta „Ostatnia zmiana" zniknie do następnej zmiany.',
                    duration: 2000,
                  });
                }}
                className={`ml-0.5 p-0.5 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors focus:outline-none focus:ring-1 ${
                  isRemoteChange ? "focus:ring-emerald-400/60" : "focus:ring-primary/60"
                }`}
                aria-label='Wyczyść historię synchronizacji „Ostatnia zmiana"'
                title="Wyczyść historię synchronizacji"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
            );
          })()}
          {/* Segmented control: wybór formatu czasu dla etykiety „Ostatnia zmiana".
              Renderowany TYLKO gdy mamy co etykietować — nowa karta bez synchronizacji
              nie potrzebuje przełącznika, który nic by nie zmieniał wizualnie. */}
          {lastSyncLabel && (
            <div
              role="radiogroup"
              aria-label="Format wyświetlanego czasu Ostatniej zmiany"
              className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5"
            >
              {TIME_FORMAT_OPTIONS.map((opt) => {
                const active = timeFormatMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={opt.label}
                    title={opt.hint}
                    onClick={() => {
                      if (active) return;
                      setTimeFormatMode(opt.value);
                      toast({
                        title: `Format czasu: ${opt.short}`,
                        description: opt.hint,
                        duration: 1800,
                      });
                    }}
                    className={`text-[10px] font-sans px-1.5 py-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-primary/60 ${
                      active
                        ? "bg-emerald-500/20 text-emerald-400 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {opt.short}
                  </button>
                );
              })}
            </div>
          )}
          {/* Segmented control: kiedy pokazywać etykietę „Ostatnia zmiana".
              Renderujemy gdy mamy jakąkolwiek historię (lastChangeAt) — także
              wtedy, gdy aktualna preferencja ukrywa etykietę, żeby user mógł
              ją z powrotem włączyć bez nurkowania w ustawienia. */}
          {lastChangeAt !== null && (
            <div
              role="radiogroup"
              aria-label="Widoczność etykiety Ostatnia zmiana"
              className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5"
            >
              {VISIBILITY_OPTIONS.map((opt) => {
                const active = lastChangeVisibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={opt.label}
                    title={opt.hint}
                    onClick={() => {
                      if (active) return;
                      setLastChangeVisibility(opt.value);
                      toast({
                        title: `Etykieta: ${opt.short}`,
                        description: opt.hint,
                        duration: 1800,
                      });
                    }}
                    className={`text-[10px] font-sans px-1.5 py-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-primary/60 ${
                      active
                        ? "bg-primary/20 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {opt.short}
                  </button>
                );
              })}
            </div>
          )}
          {/* Segmented control: język tooltipa „Ostatnia zmiana" (PL/EN).
              Persystowany w localStorage przez `useLocalePreference` —
              przeżywa F5 i synchronizuje się z innymi kartami. Renderowany
              gdy istnieje cokolwiek do wyświetlenia (lastSyncLabel), bo bez
              treści tooltipa selektor nie miałby co przełączać. */}
          {lastSyncLabel && (
            <div
              role="radiogroup"
              aria-label="Język tooltipa Ostatnia zmiana"
              className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5"
            >
              {(
                [
                  { value: "pl", short: "PL", label: "Polski", hint: "Tooltip i etykiety po polsku (Czas:, Źródło:)." },
                  { value: "en", short: "EN", label: "English", hint: "Tooltip and labels in English (Time:, Source:)." },
                ] as Array<{ value: Locale; short: string; label: string; hint: string }>
              ).map((opt) => {
                const active = tooltipLocale === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`Język tooltipa: ${opt.label}`}
                    title={opt.hint}
                    onClick={() => {
                      if (active) return;
                      setTooltipLocale(opt.value);
                      toast({
                        title: `Język: ${opt.short}`,
                        description: opt.hint,
                        duration: 1800,
                      });
                    }}
                    className={`text-[10px] font-sans font-medium px-1.5 py-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-primary/60 ${
                      active
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {opt.short}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sekcja edukacyjna: „Co oznacza synchronizacja między kartami vs lokalna akcja".
          Schowana w `<details>`, otwierana na życzenie pacjenta. Zawiera dwa przyciski
          symulujące każde ze źródeł zmiany — po kliknięciu pokazujemy realistyczny
          podgląd etykiety + tooltipa + badge dokładnie takich, jakie wygenerowałby
          realny event z `useAutoSave`. Stan jest LOKALNY (nie modyfikuje storage,
          nie wywołuje toast'ów, nie wpływa na auto-zapis), dzięki czemu pacjent może
          bezpiecznie eksperymentować bez efektów ubocznych. Helpery (`getLastChangeTooltipContent`,
          `getLastChangeLabelStyle`, `formatTimestamp`, `formatFullTimestamp`) są
          identyczne jak w głównej etykiecie — zero rozjazdu między „demo" a realem. */}
      <details className="mt-4 pt-4 border-t border-border/60 group">
        <summary className="cursor-pointer list-none inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground hover:text-primary transition-colors">
          <Lightbulb className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          <span>
            Co oznacza synchronizacja między kartami vs lokalna akcja?
          </span>
          <span className="ml-auto text-muted-foreground/60 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            Etykieta „Ostatnia zmiana" pokazuje, skąd przyszło ostatnie przełączenie auto-zapisu.
            Kliknij jeden z przycisków poniżej, żeby zobaczyć dokładny podgląd etykiety, tooltipa
            i kolorystyki — bez wpływu na realny stan auto-zapisu.
          </p>

          <div
            className="grid sm:grid-cols-2 gap-2"
            role="group"
            aria-label="Symulacja źródła zmiany dla podglądu etykiety Ostatnia zmiana"
          >
            <Button
              type="button"
              size="sm"
              variant={demoSource === "remote" ? "default" : "outline"}
              onClick={() => handleDemoSelect("remote")}
              aria-pressed={demoSource === "remote"}
              aria-label="Symuluj synchronizację między kartami (BroadcastChannel/storage)"
              className="justify-start"
            >
              <Wifi className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Symuluj: zmiana z innej karty
            </Button>
            <Button
              type="button"
              size="sm"
              variant={demoSource === "local" ? "default" : "outline"}
              onClick={() => handleDemoSelect("local")}
              aria-pressed={demoSource === "local"}
              aria-label="Symuluj lokalną akcję w tej karcie (Switch lub skrót Alt+Shift+A)"
              className="justify-start"
            >
              <MousePointerClick className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Symuluj: moja lokalna akcja
            </Button>
          </div>

          {/*
           * Trzeci przycisk demo: toggle „brak pełnej daty" (mostek pełnej szerokości
           * pod gridem 2-kol). Świadomie wyciągnięty na osobny wiersz, bo NIE jest
           * alternatywą wyboru źródła (remote/local), tylko ortogonalnym modyfikatorem
           * wpływającym na linię czasu w tooltipie i aria-label.
           */}
          <Button
            type="button"
            variant={demoHideFullDate ? "default" : "outline"}
            size="sm"
            onClick={handleToggleHideFullDate}
            aria-pressed={demoHideFullDate}
            aria-label={
              demoHideFullDate
                ? "Wyłącz symulację braku pełnej daty (pokaż realny stempel czasowy w podglądzie)"
                : "Symuluj brak pełnej daty (formatter zwraca pusty/invalid timestamp)"
            }
            className="justify-start text-xs"
          >
            <CalendarOff className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {demoHideFullDate
              ? "Symulacja: brak pełnej daty (włączona)"
              : "Symuluj: brak pełnej daty"}
          </Button>

          {/*
           * LIVE PREVIEW — kontrolki przełączające warianty wejścia helpera
           * `buildLastChangeTooltipModel`. Pacjent/audytor a11y może na żywo
           * zobaczyć, jak każda kombinacja (source × format × locale × pełna
           * data × custom relative) wpływa na:
           *  - widoczny tooltip (heading, description, linia czasu),
           *  - `ariaText` trafiający do screen readera,
           *  - `timeLineHelpTitle` jako native `title` linii czasu.
           *
           * Wszystkie panele poniżej czytają z TEGO SAMEGO modelu, więc każda
           * niespójność = bug w helperze, nie w demo.
           */}
          {demoSource !== null && (
            <div
              className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-3 space-y-3"
              role="group"
              aria-label="Kontrolki podglądu tooltipa Ostatnia zmiana"
            >
              <p className="text-[10px] uppercase tracking-wider font-sans text-primary/80">
                Live preview — przełącz parametry helpera
              </p>

              {/* Format wartości czasu (TimeValueFormat). */}
              <div>
                <p className="text-[10px] font-sans text-muted-foreground mb-1">
                  Format wartości czasu (smoothTimeValue)
                </p>
                <div
                  role="radiogroup"
                  aria-label="Tryb formatowania wartości czasu w podglądzie"
                  className="inline-flex flex-wrap items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5"
                >
                  {(
                    [
                      { value: "single-space", label: "single-space (default)", short: "single" },
                      { value: "compact", label: "compact (zwarte separatory)", short: "compact" },
                      { value: "preserve-newlines", label: "preserve-newlines (PDF)", short: "newlines" },
                    ] as Array<{ value: TimeValueFormat; label: string; short: string }>
                  ).map((opt) => {
                    const active = previewFormat === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`Format: ${opt.label}`}
                        onClick={() => setPreviewFormat(opt.value)}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-primary/60 ${
                          active
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {opt.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locale (PL/EN). */}
              <div>
                <p className="text-[10px] font-sans text-muted-foreground mb-1">
                  Język tooltipa (locale)
                </p>
                <div
                  role="radiogroup"
                  aria-label="Język tooltipa w podglądzie"
                  className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5"
                >
                  {(["pl", "en"] as const).map((loc) => {
                    const active = previewLocale === loc;
                    return (
                      <button
                        key={loc}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`Locale: ${loc.toUpperCase()}`}
                        onClick={() => setPreviewLocale(loc)}
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-primary/60 ${
                          active
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom relative label (opcjonalny override). */}
              <div>
                <label
                  htmlFor="preview-relative-override"
                  className="text-[10px] font-sans text-muted-foreground mb-1 block"
                >
                  Custom relativeLabel (override) — pusty = używaj formatTimestamp
                </label>
                <input
                  id="preview-relative-override"
                  type="text"
                  value={previewRelativeOverride}
                  onChange={(e) => setPreviewRelativeOverride(e.target.value)}
                  placeholder="np. 2 minuty temu / 2 minutes ago / wieloliniowa\nwartość"
                  className="w-full text-[10px] font-mono px-2 py-1 rounded-md border border-border/60 bg-background/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
                />
              </div>
            </div>
          )}

          {demoSource !== null && demoAt !== null && (() => {
            // SINGLE SOURCE OF TRUTH dla podglądu = `buildLastChangeTooltipModel`.
            // Komponent TYLKO czyta pola modelu — nie składa „Czas: ${…}" inline.
            // Zgodne z `mem://features/tooltip-last-change-model`.
            const demoStyle = getLastChangeLabelStyle(demoSource, /* isRemoteSyncing */ false);
            const demoRelativeFromTimestamp = formatTimestamp(demoAt, timeFormatMode);
            // Custom relative override ma pierwszeństwo — pacjent może wpisać
            // wartość z newline'em/multiple spaces, żeby zobaczyć efekt
            // smoothTimeValue dla każdego z trzech trybów format.
            const effectiveRelative =
              previewRelativeOverride.trim().length > 0
                ? previewRelativeOverride
                : demoRelativeFromTimestamp;
            const demoFull = demoHideFullDate ? "" : formatFullTimestamp(demoAt);

            const previewModel = buildLastChangeTooltipModel({
              source: demoSource,
              fullDate: demoFull,
              relativeLabel: effectiveRelative,
              format: previewFormat,
              locale: previewLocale,
            });
            const {
              content: previewContent,
              ariaText: previewAriaText,
              timeValue: previewTimeValue,
              shouldRenderTimeLine: previewShouldRenderTimeLine,
              timeLineForView: previewTimeLineForView,
              timeLineForA11y: previewTimeLineForA11y,
              timeLineHelpTitle: previewTimeLineHelpTitle,
              isRelativeFallback: previewIsRelativeFallback,
            } = previewModel;
            const isDemoRemote = demoSource === "remote";

            return (
              <div
                className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 space-y-2"
                role="status"
                aria-live="polite"
              >
                <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70">
                  Podgląd etykiety
                  {demoHideFullDate && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 align-middle normal-case">
                      tryb: brak pełnej daty
                    </span>
                  )}
                  {previewIsRelativeFallback && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 align-middle normal-case">
                      fallback: relative
                    </span>
                  )}
                </p>
                <div
                  className={`text-[11px] font-sans inline-flex items-center gap-1.5 ${demoStyle.containerClass}`}
                >
                  <RefreshCw className={`w-3 h-3 ${demoStyle.iconClass}`} aria-hidden="true" />
                  <span>
                    Ostatnia zmiana:{" "}
                    <strong className={demoStyle.strongClass}>{demoRelativeFromTimestamp}</strong>
                    {demoStyle.showLocalSuffix && (
                      <span
                        className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded-md border border-border/60 bg-muted/40 text-foreground/80 align-middle"
                        aria-label={previewContent.ariaHeading}
                      >
                        {previewContent.shortBadge}
                      </span>
                    )}
                  </span>
                </div>

                <div className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70">
                    Tooltip i opis źródła
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      isDemoRemote ? "text-emerald-400" : "text-foreground"
                    }`}
                  >
                    {previewContent.heading}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {previewContent.description}
                  </p>
                  {/*
                   * Linia czasu w podglądzie tooltipa — RENDEROWANA TYLKO gdy
                   * helper tak zdecyduje (`shouldRenderTimeLine`). Tekst pochodzi
                   * z `timeLineForView` (pełen, łącznie z prefiksem „Czas:" /
                   * „Time:") — komponent NIE dokleja prefiksu samodzielnie.
                   */}
                  {previewShouldRenderTimeLine && (
                    <p
                      className={`text-[10px] font-mono whitespace-pre-line ${
                        previewIsRelativeFallback
                          ? "text-amber-300 rounded border border-amber-500/30 bg-amber-500/5 px-1.5 py-1"
                          : "text-muted-foreground/80"
                      }`}
                      title={previewTimeLineHelpTitle}
                    >
                      {previewTimeLineForView}
                    </p>
                  )}
                </div>

                {/*
                 * Live raw-data panel — surowe pola modelu trafiające do JSX.
                 * Pozwala pacjentowi/audytorowi zobaczyć BYTEWISE, co dostaje
                 * widoczny kanał vs aria-label/title. Każde pole ma ten sam
                 * fundament (`timeValue`), więc parytet jest gwarantowany.
                 */}
                <div className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70">
                    Surowe pola modelu (live)
                  </p>
                  <dl className="text-[10px] font-mono leading-snug grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                    <dt className="text-muted-foreground/70">timeValue</dt>
                    <dd className="text-foreground/90 break-all whitespace-pre-line">
                      {previewTimeValue || <span className="text-muted-foreground/50 italic">(empty)</span>}
                    </dd>
                    <dt className="text-muted-foreground/70">timeLineForView</dt>
                    <dd className="text-foreground/90 break-all whitespace-pre-line">
                      {previewTimeLineForView ?? (
                        <span className="text-muted-foreground/50 italic">null</span>
                      )}
                    </dd>
                    <dt className="text-muted-foreground/70">timeLineForA11y</dt>
                    <dd className="text-foreground/90 break-all whitespace-pre-line">
                      {previewTimeLineForA11y ?? (
                        <span className="text-muted-foreground/50 italic">null</span>
                      )}
                    </dd>
                    <dt className="text-muted-foreground/70">timeLineHelpTitle</dt>
                    <dd className="text-foreground/90 break-all whitespace-pre-line">
                      {previewTimeLineHelpTitle ?? (
                        <span className="text-muted-foreground/50 italic">undefined</span>
                      )}
                    </dd>
                  </dl>
                </div>

                {/*
                 * ariaText — DOKŁADNY string trafiający do `aria-label` triggera
                 * tooltipa i `title` (fallback dla touch). `whitespace-pre-line`
                 * pokazuje formatowanie 1:1, w tym kwalifikator „(etykieta
                 * względna)" / „(relative label)" w trybie fallback.
                 */}
                <div className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70">
                    ariaText (aria-label / title triggera)
                  </p>
                  <pre
                    className={`text-[10px] font-mono whitespace-pre-line leading-snug ${
                      previewIsRelativeFallback ? "text-amber-200" : "text-muted-foreground"
                    }`}
                    aria-label="Podgląd stringu aria-label triggera tooltipa"
                  >
                    {previewAriaText}
                  </pre>
                </div>

                <p className="text-[10px] text-muted-foreground/70 italic leading-relaxed">
                  To jest tylko podgląd — realne zdarzenia auto-zapisu pojawią się w mini-historii i etykiecie powyżej.
                  Wszystkie panele czytają z `buildLastChangeTooltipModel` —
                  jeśli widzisz rozjazd między widocznym tooltipem a ariaText,
                  to bug w helperze, nie w demo.
                </p>
              </div>
            );
          })()}
        </div>
      </details>

      {/* Inline „Zapisz dzień" — widoczny TYLKO gdy auto-zapis OFF i jest co zapisać.
          Pozwala pacjentowi zatwierdzić draft bez przewijania do dołu modułu dziennika. */}
      {!enabled && onSaveDay && pendingDraftCount > 0 && (
        <div className="mt-4 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">
              {pendingDraftCount} niezapisan{pendingDraftCount === 1 ? "a zmiana" : "ych zmian"}
            </span>
            {activeDateLabel ? (
              <>
                {" "}dla dnia <span className="text-foreground font-medium">{activeDateLabel}</span>.
              </>
            ) : (
              "."
            )}{" "}
            Zatwierdź wpis, aby trafił do trendu i historii.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onSaveDay}
            className="self-start sm:self-auto shrink-0"
            aria-label={
              activeDateLabel
                ? `Zapisz draft dnia ${activeDateLabel}`
                : "Zapisz draft aktywnego dnia"
            }
          >
            <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
            Zapisz dzień
          </Button>
        </div>
      )}

      {/* Test synchronizacji — diagnostyczny ping/pong między kartami. */}
      <div className="mt-4 pt-4 border-t border-border/60">
        {/* Status transportu — pokazuje aktywny kanał (broadcast/storage-fallback)
            i ostatnią przyczynę degradacji, jeśli BC padł. */}
        <div
          className={`mb-3 rounded-xl border px-3 py-2 flex flex-col sm:flex-row sm:items-start gap-2.5 ${
            transport === "broadcast"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-primary/30 bg-primary/5"
          }`}
          role="status"
        >
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {transport === "broadcast" ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-sans text-muted-foreground inline-flex flex-wrap items-center gap-1.5">
              Transport synchronizacji:
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono border ${
                  transport === "broadcast"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : "bg-primary/15 text-primary border-primary/40"
                }`}
              >
                {transport}
              </span>
              {simulateFallback && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-sans bg-amber-500/15 text-amber-400 border border-amber-500/40">
                  symulacja
                </span>
              )}
            </p>
            {degradationInfo && (
              <div className="mt-1.5 space-y-1">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground/90 leading-relaxed inline-flex flex-wrap items-center gap-1.5">
                  <span className="font-sans uppercase tracking-wide text-muted-foreground/70">
                    Przyczyna:
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    title={degradationInfo.detail}
                  >
                    {degradationInfo.cause}
                  </span>
                  <span className="text-muted-foreground/60 text-[10px]">
                    · {formatTimestamp(degradationInfo.at, timeFormatMode)}
                  </span>
                </p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 leading-relaxed italic">
                  {degradationInfo.detail}
                  {degradationInfo.errorMessage && (
                    <>
                      {" — "}
                      <span className="font-mono not-italic text-muted-foreground/70">
                        {degradationInfo.errorMessage}
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant={simulateFallback ? "default" : "outline"}
            onClick={handleSimulateFallback}
            className="shrink-0 self-start"
            aria-pressed={simulateFallback}
            aria-label={
              simulateFallback
                ? "Wyłącz symulację braku BroadcastChannel"
                : "Symuluj brak BroadcastChannel i wymuś transport storage-fallback"
            }
          >
            {simulateFallback ? (
              <>
                <Wifi className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Przywróć BC
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Symuluj brak BC
              </>
            )}
          </Button>
        </div>

        {/* Mini-historia ostatnich zdarzeń: lokalne kliknięcia + zdalne synchronizacje
            z dokładnym timestampem. Pokazujemy do HISTORY_LIMIT wpisów (najnowsze pierwsze),
            żeby pacjent widział kontekst „kiedy co się działo" bez zaśmiecania panelu. */}
        {syncHistory.length > 0 && (
          <details className="mb-4 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 group">
            <summary className="cursor-pointer list-none inline-flex items-center gap-2 text-[11px] sm:text-xs font-sans text-muted-foreground hover:text-foreground transition-colors">
              <History className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>
                Mini-historia zdarzeń{" "}
                <strong className="text-foreground">({syncHistory.length})</strong>
              </span>
              <span className="text-muted-foreground/60 ml-auto group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <ul className="mt-2 space-y-1" aria-label="Lista ostatnich zdarzeń auto-zapisu (lokalnych i zdalnych)">
              {syncHistory.map((entry) => {
                const time = new Date(entry.at).toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                const sourceMeta =
                  entry.source === "broadcast"
                    ? {
                        Icon: Wifi,
                        label: "Zdalna synchronizacja przez BroadcastChannel",
                        short: "BC",
                        isLocal: false,
                      }
                    : entry.source === "storage"
                      ? {
                          Icon: HardDrive,
                          label: "Zdalna synchronizacja przez storage event (fallback)",
                          short: "Storage",
                          isLocal: false,
                        }
                      : entry.source === "custom-event"
                        ? {
                            Icon: Layers,
                            label: "Synchronizacja w obrębie tej karty (CustomEvent)",
                            // Ujednolicony język UI: zawsze „karta", nigdy „tab" —
                            // zgodnie z `lastChangeTooltipContent` i resztą interfejsu.
                            short: "Ta karta",
                            isLocal: false,
                          }
                        : {
                            Icon: Activity,
                            label: "Lokalna akcja w tej karcie (Switch lub skrót Alt+Shift+A)",
                            short: "Lokalnie",
                            isLocal: true,
                          };
                const SourceIcon = sourceMeta.Icon;
                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-2 text-[11px] font-sans text-muted-foreground"
                    title={`${time} — ${sourceMeta.label} — auto-zapis ${entry.enabled ? "ON" : "OFF"}`}
                  >
                    <span className="font-mono text-foreground/80 shrink-0 tabular-nums">{time}</span>
                    <span
                      className={`inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md border ${
                        sourceMeta.isLocal
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      <SourceIcon className="w-3 h-3" aria-hidden="true" />
                      {sourceMeta.short}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans border shrink-0 ${
                        entry.enabled
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                          : "bg-primary/15 text-primary border-primary/40"
                      }`}
                    >
                      {entry.enabled ? "ON" : "OFF"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground/70 italic leading-relaxed">
              Pokazujemy do 8 ostatnich zdarzeń: lokalnych kliknięć w tej karcie oraz zdalnych synchronizacji z innych kart / fallbacku storage.
            </p>
          </details>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-foreground inline-flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Test synchronizacji
              <span className="text-[10px] font-normal font-sans px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                {tabLabel}
              </span>
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
              Wyślij sygnał testowy i sprawdź, które inne karty otwarte na tej stronie odpowiedziały. Pomocne, gdy nie masz pewności, że auto-zapis działa we wszystkich oknach.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSendPing}
            disabled={pingState.isCollecting}
            className="self-start sm:self-auto shrink-0"
            aria-label={
              isBroadcastSupported
                ? "Wyślij sygnał testowy do innych kart przez BroadcastChannel"
                : "Wyślij sygnał testowy do innych kart przez localStorage (round-trip)"
            }
          >
            {pingState.isCollecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Nasłuchiwanie…
              </>
            ) : !isBroadcastSupported ? (
              <>
                <HardDrive className="w-4 h-4 mr-2" aria-hidden="true" />
                Test (storage)
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 mr-2" aria-hidden="true" />
                Test synchronizacji
              </>
            )}
          </Button>
        </div>

        {/* Wyniki testu — widoczne podczas zbierania i przez chwilę po zakończeniu (dopóki user nie zamknie). */}
        {pingState.pingId !== null && (
          <div
            className="mt-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[11px] font-sans text-muted-foreground inline-flex items-center gap-1.5">
                {pingState.isCollecting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" aria-hidden="true" />
                    Zbieranie odpowiedzi (do 5 s)…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                    Wynik testu — odpowiedziało{" "}
                    <strong className="text-foreground">{pingState.responses.length}</strong>{" "}
                    {pingState.responses.length === 1 ? "karta" : pingState.responses.length >= 2 && pingState.responses.length <= 4 ? "karty" : "kart"}
                    {pingState.strategy && (
                      <span
                        className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md font-mono border ${
                          pingState.strategy === "broadcast"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-primary/10 text-primary border-primary/30"
                        }`}
                        title={
                          pingState.strategy === "broadcast"
                            ? "Test wykonany przez BroadcastChannel ping/pong"
                            : "Test wykonany przez round-trip localStorage (BC niedostępny)"
                        }
                      >
                        {pingState.strategy === "broadcast" ? "BC ping/pong" : "Storage round-trip"}
                      </span>
                    )}
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={clearPing}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Zamknij wynik testu"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {pingState.responses.length === 0 ? (
              !pingState.isCollecting && (
                <p className="text-[11px] text-muted-foreground italic">
                  Żadna inna karta nie odpowiedziała. Otwórz tę stronę w drugim oknie i spróbuj ponownie.
                </p>
              )
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {pingState.responses.map((r) => (
                  <li
                    key={r.origin}
                    className="inline-flex items-center gap-1.5 text-[11px] font-sans px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                    title={`${r.label} — auto-zapis ${r.enabled ? "ON" : "OFF"} — opóźnienie ${r.latencyMs} ms`}
                  >
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    <span className="text-foreground font-medium">{r.label}</span>
                    <span className="text-muted-foreground">
                      ({r.latencyMs} ms · {r.enabled ? "ON" : "OFF"})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Ekran diagnostyczny — pełny obraz transportu i historii synchronizacji.
          Schowany w `<details>`, żeby nie dominował domyślnego widoku, a był jednym
          kliknięciem od pacjenta/admina przy debugowaniu „dlaczego się nie synchronizuje". */}
      <details className="mt-4 pt-4 border-t border-border/60 group">
        <summary className="cursor-pointer list-none inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground hover:text-primary transition-colors">
          <Activity className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          <span>
            Ekran diagnostyczny synchronizacji{" "}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono border ml-1 ${
                transport === "broadcast" && !simulateFallback
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/40"
              }`}
            >
              {transport === "broadcast" && !simulateFallback ? "OK" : "Fallback"}
            </span>
          </span>
          <span className="ml-auto text-muted-foreground/60 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="mt-3">
          <SyncDiagnosticPanel
            transport={transport}
            degradationInfo={degradationInfo}
            degradationHistory={degradationHistory}
            clearDegradationHistory={clearDegradationHistory}
            simulateFallback={simulateFallback}
            isBroadcastSupported={isBroadcastSupported}
            tabLabel={tabLabel}
            syncHistory={syncHistory}
            lastRemoteSyncAt={lastRemoteSyncAt}
            pingState={pingState}
          />
        </div>
      </details>
    </div>
  );
};

export default AutoSaveSettings;
