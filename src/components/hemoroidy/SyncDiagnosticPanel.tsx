import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Wifi,
  HardDrive,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Radio,
  Copy,
  ClipboardCheck,
  History,
  Trash2,
  Zap,
} from "lucide-react";
import type {
  DegradationCause,
  DegradationHistoryEntry,
  DegradationInfo,
  PongResponse,
  SyncHistoryEntry,
} from "@/hooks/useAutoSave";
import { toast } from "@/hooks/use-toast";

/**
 * Dedykowany ekran diagnostyczny synchronizacji auto-zapisu między kartami.
 *
 * Pokazuje pełny obraz transportu używanego przez `useAutoSave`:
 *  - aktywny kanał (BroadcastChannel vs storage-fallback) z wyraźnym statusem OK/DEGRADED,
 *  - szczegóły degradacji (kategoria, opis, surowy komunikat błędu, znacznik czasu),
 *  - flagi środowiska runtime (BC dostępny, localStorage, CustomEvent, tryb prywatny),
 *  - ostatnią synchronizację (czas + źródło),
 *  - wynik ostatniego testu ping/pong z podziałem na strategie (broadcast vs storage round-trip),
 *  - przycisk „Skopiuj raport" eksportujący snapshot stanu jako JSON do schowka
 *    (przydatne, gdy pacjent zgłasza problem — może wkleić raport w mail/ticket).
 *
 * Komponent jest **prezentacyjny** — całą logikę i stan dostarcza nadrzędny
 * `AutoSaveSettings` przez propsy, dzięki czemu nie ma drugiej instancji hooka
 * i widzimy DOKŁADNIE ten sam stan, który napędza UI ustawień.
 */
export interface SyncDiagnosticPanelProps {
  transport: "broadcast" | "storage-fallback";
  degradationInfo: DegradationInfo | null;
  /**
   * Akumulowana historia degradacji BC (najnowsza pierwsza).
   * Panel renderuje licznik per typ + filtr + listę z datownikami.
   */
  degradationHistory: DegradationHistoryEntry[];
  /** Czyści historię degradacji (nie kasuje aktualnego degradationInfo). */
  clearDegradationHistory: () => void;
  simulateFallback: boolean;
  isBroadcastSupported: boolean;
  tabLabel: string;
  syncHistory: SyncHistoryEntry[];
  lastRemoteSyncAt: number | null;
  pingState: {
    pingId: string | null;
    sentAt: number | null;
    responses: PongResponse[];
    isCollecting: boolean;
    strategy: "broadcast" | "storage" | null;
  };
}

/**
 * Etykiety krótkich nazw kategorii degradacji — używane w badge'ach licznika
 * i w filtrach. Trzymane razem z opisami z hooka, ale skrócone do 1-2 słów,
 * żeby zmieściły się w zwartym UI panelu diagnostycznego.
 */
const DEGRADATION_LABELS: Record<DegradationCause, string> = {
  "api-missing": "Brak API",
  "constructor-exception": "Konstruktor",
  messageerror: "Deserializacja",
  "postmessage-failure": "postMessage",
  simulation: "Symulacja",
};

/** Wszystkie kategorie pokazywane w pasku filtrów (kolejność = częstotliwość w praktyce). */
const FILTER_CAUSES: readonly DegradationCause[] = [
  "api-missing",
  "constructor-exception",
  "messageerror",
  "postmessage-failure",
];

/**
 * Wykrywanie środowiska runtime — używamy do checklisty "co jest dostępne".
 * Lazy: wykonywane raz po mount, bo te API nie zmieniają się w trakcie sesji.
 */
const detectEnvironment = () => {
  if (typeof window === "undefined") {
    return {
      broadcastChannel: false,
      localStorage: false,
      customEvent: false,
      crypto: false,
    };
  }
  let localStorageAvailable = false;
  try {
    const probeKey = "__cml_diag_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    localStorageAvailable = true;
  } catch {
    // tryb prywatny w niektórych przeglądarkach blokuje localStorage
    localStorageAvailable = false;
  }
  return {
    broadcastChannel: typeof BroadcastChannel !== "undefined",
    localStorage: localStorageAvailable,
    customEvent: typeof CustomEvent !== "undefined",
    crypto: typeof crypto !== "undefined" && "randomUUID" in crypto,
  };
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const formatRelative = (timestamp: number): string => {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 5) return "przed chwilą";
  if (diffSec < 60) return `${diffSec} s temu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min temu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h temu`;
  return new Date(timestamp).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const SyncDiagnosticPanel = ({
  transport,
  degradationInfo,
  degradationHistory,
  clearDegradationHistory,
  simulateFallback,
  isBroadcastSupported,
  tabLabel,
  syncHistory,
  lastRemoteSyncAt,
  pingState,
}: SyncDiagnosticPanelProps) => {
  const [env] = useState(() => detectEnvironment());
  const [copied, setCopied] = useState(false);
  /**
   * Aktywne filtry typów degradacji. `null` = pokaż wszystkie. Set zamiast
   * tablicy, żeby toggle był O(1) i porównania w mapie były czytelne.
   * `simulation` celowo nie jest w UI filtrów (to akcja diagnostyczna usera,
   * nie awaria) — ale jeśli pojawi się w historii, dalej jest liczona w „Razem".
   */
  const [activeFilters, setActiveFilters] = useState<Set<DegradationCause>>(new Set());
  /**
   * Osobny flag „Skopiowano" dla przycisku ostatniej degradacji — niezależny od
   * `copied` przy raporcie głównym, żeby oba przyciski mogły mieć własny stan
   * potwierdzenia bez kolizji wizualnej.
   */
  const [degradationCopied, setDegradationCopied] = useState(false);
  /**
   * Wynik ostatniego ręcznego testu BroadcastChannel uruchomionego z UI panelu.
   * Test jest **niezależny** od głównego kanału hooka — tworzy ad-hoc instancję
   * `BroadcastChannel`, próbuje raz wysłać `postMessage`, mierzy outcome i od razu
   * zamyka kanał. Dzięki temu można sprawdzić aktualną dostępność BC bez wpływu
   * na stan auto-zapisu czy historię degradacji hooka.
   *
   * `cause` używa tej samej taksonomii co `DegradationInfo`, żeby UI mógł reusować
   * te same etykiety (`DEGRADATION_LABELS`).
   */
  const [bcTestResult, setBcTestResult] = useState<
    | null
    | {
        ok: boolean;
        at: number;
        cause?: DegradationCause;
        detail: string;
        errorMessage?: string;
      }
  >(null);
  const [bcTestRunning, setBcTestRunning] = useState(false);

  /** Liczniki per kategoria — zliczamy z pełnej historii, niezależnie od filtra. */
  const counts = useMemo(() => {
    const acc: Record<DegradationCause, number> = {
      "api-missing": 0,
      "constructor-exception": 0,
      messageerror: 0,
      "postmessage-failure": 0,
      simulation: 0,
    };
    for (const entry of degradationHistory) acc[entry.cause] += 1;
    return acc;
  }, [degradationHistory]);

  /** Lista po zastosowaniu filtra (jeśli pusty filter set → pokaż wszystkie). */
  const visibleHistory = useMemo(() => {
    if (activeFilters.size === 0) return degradationHistory;
    return degradationHistory.filter((entry) => activeFilters.has(entry.cause));
  }, [degradationHistory, activeFilters]);

  const toggleFilter = (cause: DegradationCause) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cause)) next.delete(cause);
      else next.add(cause);
      return next;
    });
  };

  // Auto-refresh względnych etykiet czasu co 15 s, ale tylko gdy mamy co odświeżać.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (lastRemoteSyncAt === null && degradationInfo === null) return;
    const interval = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(interval);
  }, [lastRemoteSyncAt, degradationInfo]);

  const isHealthy = transport === "broadcast" && !simulateFallback;

  const handleCopyReport = async () => {
    const report = {
      generatedAt: new Date().toISOString(),
      tabLabel,
      transport,
      isBroadcastSupported,
      simulateFallback,
      degradationInfo,
      environment: env,
      lastRemoteSyncAt: lastRemoteSyncAt
        ? new Date(lastRemoteSyncAt).toISOString()
        : null,
      syncHistory: syncHistory.map((entry) => ({
        at: new Date(entry.at).toISOString(),
        source: entry.source,
        enabled: entry.enabled,
      })),
      lastPingTest: pingState.pingId
        ? {
            strategy: pingState.strategy,
            isCollecting: pingState.isCollecting,
            responses: pingState.responses.map((r) => ({
              label: r.label,
              latencyMs: r.latencyMs,
              enabled: r.enabled,
              via: r.via ?? "broadcast",
            })),
          }
        : null,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "n/a",
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      toast({
        title: "Raport diagnostyczny skopiowany",
        description:
          "Wklej go w zgłoszeniu — zawiera transport, środowisko i ostatnie synchronizacje.",
        duration: 2400,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Nie udało się skopiować raportu",
        description:
          "Sprawdź uprawnienia do schowka. Możesz zrobić zrzut ekranu sekcji diagnostycznej.",
        duration: 3500,
      });
    }
  };

  /**
   * Kopiuje OSTATNIĄ degradację BC w czytelnym, „human-readable" formacie
   * (nie JSON — chcemy żeby pacjent/support mógł od razu odczytać treść w mailu).
   * Zawiera: kategorię, opis, surowy errorMessage (jeśli był), pełny timestamp ISO
   * + lokalny czas, oraz transport aktywny w momencie incydentu.
   */
  const handleCopyDegradation = async () => {
    if (!degradationInfo) return;
    const isoAt = new Date(degradationInfo.at).toISOString();
    const localAt = new Date(degradationInfo.at).toLocaleString("pl-PL");
    const lines = [
      "=== Degradacja BroadcastChannel ===",
      `Cause:        ${degradationInfo.cause} (${DEGRADATION_LABELS[degradationInfo.cause] ?? "—"})`,
      `Detail:       ${degradationInfo.detail}`,
      `Error msg:    ${degradationInfo.errorMessage ?? "(brak)"}`,
      `Timestamp:    ${isoAt}`,
      `Lokalnie:     ${localAt}`,
      `Transport:    ${transport}${simulateFallback ? " (symulacja)" : ""}`,
      `Karta:        ${tabLabel}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setDegradationCopied(true);
      toast({
        title: "Skopiowano ostatnią degradację",
        description: "Wklej w zgłoszeniu — format tekstowy, czytelny od razu.",
        duration: 2400,
      });
      setTimeout(() => setDegradationCopied(false), 2000);
    } catch {
      toast({
        title: "Nie udało się skopiować",
        description: "Brak uprawnień do schowka. Zrób zrzut ekranu sekcji.",
        duration: 3500,
      });
    }
  };

  /**
   * Ręczny test BroadcastChannel uruchamiany z UI.
   *
   * Sekwencja:
   *  1. Sprawdza dostępność API (`api-missing` jeśli brak).
   *  2. Próbuje skonstruować ad-hoc kanał `cml-bc-probe` (`constructor-exception` przy wyjątku).
   *  3. Próbuje raz wykonać `postMessage` (`postmessage-failure` przy wyjątku).
   *  4. Zamyka kanał i zapisuje wynik w `bcTestResult`.
   *
   * Test jest read-only względem hooka — nie modyfikuje degradationInfo ani historii.
   */
  const handleRunBcTest = async () => {
    setBcTestRunning(true);
    const at = Date.now();
    if (typeof BroadcastChannel === "undefined") {
      setBcTestResult({
        ok: false,
        at,
        cause: "api-missing",
        detail: "BroadcastChannel API nie jest dostępne w tej przeglądarce.",
      });
      setBcTestRunning(false);
      toast({
        title: "Test BC: API niedostępne",
        description: "Ta przeglądarka nie wspiera BroadcastChannel — używamy fallbacku.",
        duration: 2800,
      });
      return;
    }
    let probe: BroadcastChannel | null = null;
    try {
      probe = new BroadcastChannel("cml-bc-probe");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setBcTestResult({
        ok: false,
        at,
        cause: "constructor-exception",
        detail: "Konstruktor BroadcastChannel rzucił wyjątek (możliwy sandbox iframe).",
        errorMessage,
      });
      setBcTestRunning(false);
      toast({
        title: "Test BC: błąd konstruktora",
        description: errorMessage.slice(0, 120),
        duration: 3200,
      });
      return;
    }
    try {
      probe.postMessage({ kind: "cml-diagnostic-ping", at });
      setBcTestResult({
        ok: true,
        at,
        detail: "Kanał działa — pojedyncza wiadomość została wysłana bez błędu.",
      });
      toast({
        title: "Test BC: OK",
        description: "BroadcastChannel jest dostępny i przyjął wiadomość.",
        duration: 2200,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setBcTestResult({
        ok: false,
        at,
        cause: "postmessage-failure",
        detail: "postMessage rzucił wyjątek — kanał istnieje, ale nie przyjmuje wiadomości.",
        errorMessage,
      });
      toast({
        title: "Test BC: postMessage padł",
        description: errorMessage.slice(0, 120),
        duration: 3200,
      });
    } finally {
      try {
        probe.close();
      } catch {
        // close() niemal nigdy nie rzuca; ignorujemy żeby nie maskować błędu testu
      }
      setBcTestRunning(false);
    }
  };


  return (
    <div
      className="rounded-2xl border border-border/60 bg-background/40 px-4 py-4 sm:px-5 sm:py-5"
      role="region"
      aria-label="Ekran diagnostyczny synchronizacji między kartami"
    >
      {/* Nagłówek + status główny */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg ${
              isHealthy
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-amber-500/15 text-amber-400"
            }`}
            aria-hidden="true"
          >
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-sans text-sm sm:text-base font-medium text-foreground inline-flex items-center gap-2 flex-wrap">
              Diagnostyka synchronizacji
              <span
                role="status"
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono border uppercase ${
                  isHealthy
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/40"
                }`}
              >
                {isHealthy ? "OK" : "Fallback"}
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
              Pokazuje, czy zmiana auto-zapisu w innej karcie dotrze tu przez{" "}
              <span className="font-mono text-foreground/90">BroadcastChannel</span>{" "}
              czy przez fallback{" "}
              <span className="font-mono text-foreground/90">storage + CustomEvent</span>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopyReport}
          className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-sans px-2.5 py-1.5 rounded-md border border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-primary/60"
          aria-label="Skopiuj raport diagnostyczny do schowka jako JSON"
        >
          {copied ? (
            <>
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              Skopiowano
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              Kopiuj raport
            </>
          )}
        </button>
      </div>

      {/* Główny status transportu — duży, czytelny blok z kanałem aktywnym i czasem ostatniej zmiany. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div
          className={`rounded-xl border px-3 py-3 ${
            transport === "broadcast"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-primary/30 bg-primary/5"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70 mb-1.5">
            Aktywny transport
          </p>
          <div className="flex items-center gap-2">
            {transport === "broadcast" ? (
              <Wifi className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            ) : (
              <HardDrive className="w-5 h-5 text-primary" aria-hidden="true" />
            )}
            <p className="font-mono text-sm sm:text-base text-foreground">
              {transport}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
            {transport === "broadcast"
              ? "Wiadomości lecą natychmiast kanałem BroadcastChannel (typowo <10 ms)."
              : "Wiadomości lecą przez storage event + CustomEvent (typowo 50–300 ms)."}
          </p>
          {simulateFallback && (
            <p className="mt-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/40">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              Tryb symulacji aktywny — BC celowo wyłączony
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70 mb-1.5">
            Ostatnia synchronizacja
          </p>
          {lastRemoteSyncAt !== null ? (
            <>
              <p className="font-mono text-sm text-foreground">
                {formatTime(lastRemoteSyncAt)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatRelative(lastRemoteSyncAt)}
                {syncHistory[0] && (
                  <>
                    {" · źródło: "}
                    <span className="font-mono text-foreground/80">
                      {syncHistory[0].source}
                    </span>
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground italic mt-1">
              Jeszcze nic nie przyszło z innej karty. Otwórz tę stronę w drugim
              oknie i przełącz auto-zapis.
            </p>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            Ta karta:{" "}
            <span className="font-mono text-foreground/80">{tabLabel}</span>
          </p>
        </div>
      </div>

      {/* Szczegóły degradacji — widoczne TYLKO gdy BC padł, żeby nie wprowadzać szumu wizualnego. */}
      {degradationInfo && (
        <div
          className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
          role="alert"
        >
          <p className="text-[11px] sm:text-xs font-sans text-amber-400 inline-flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <strong>Degradacja BroadcastChannel</strong>
            <span
              className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30"
              title={degradationInfo.detail}
            >
              {degradationInfo.cause}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {degradationInfo.detail}
          </p>
          {degradationInfo.errorMessage && (
            <p className="mt-1.5 text-[10px] font-mono text-muted-foreground/80 break-all">
              {degradationInfo.errorMessage}
            </p>
          )}
          <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[10px] text-muted-foreground/60">
              Wykryto: {formatRelative(degradationInfo.at)}
            </p>
            <button
              type="button"
              onClick={handleCopyDegradation}
              className="inline-flex items-center gap-1 text-[10px] font-sans px-1.5 py-0.5 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400/60"
              aria-label="Skopiuj szczegóły ostatniej degradacji BroadcastChannel do schowka"
              title="Kopiuje cause, detail, errorMessage i timestamp w czytelnym formacie tekstowym"
            >
              {degradationCopied ? (
                <>
                  <ClipboardCheck className="w-3 h-3" aria-hidden="true" />
                  Skopiowano
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" aria-hidden="true" />
                  Kopiuj degradację
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Historia degradacji — licznik per typ + filtr + lista z datownikami.
          Renderujemy zawsze gdy mamy >0 wpisów, niezależnie od aktualnego
          `degradationInfo` (incydenty mogły wystąpić, a kanał potem wstał). */}
      {degradationHistory.length > 0 && (
        <div className="mb-4 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70 inline-flex items-center gap-1.5">
              <History className="w-3 h-3" aria-hidden="true" />
              Historia degradacji ({degradationHistory.length})
            </p>
            <button
              type="button"
              onClick={() => {
                clearDegradationHistory();
                setActiveFilters(new Set());
                toast({
                  title: "Historia degradacji wyczyszczona",
                  description: "Liczniki resetują się do zera. Aktualny status BC zostaje.",
                  duration: 1800,
                });
              }}
              className="text-[10px] font-sans text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/60 transition-colors"
              aria-label="Wyczyść historię degradacji"
              title="Wyczyść historię degradacji"
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" />
              Wyczyść
            </button>
          </div>

          {/* Pasek filtrów: badge per kategoria z licznikiem. Klik = toggle.
              Aktywny filtr = pierścień + tło, brak filtrów = neutralny outline. */}
          <div
            role="group"
            aria-label="Filtry typów degradacji"
            className="flex flex-wrap gap-1.5 mb-2.5"
          >
            {FILTER_CAUSES.map((cause) => {
              const count = counts[cause];
              const active = activeFilters.has(cause);
              const disabled = count === 0;
              return (
                <button
                  key={cause}
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    toggleFilter(cause);
                  }}
                  disabled={disabled}
                  aria-pressed={active}
                  title={
                    disabled
                      ? `${DEGRADATION_LABELS[cause]} — brak incydentów`
                      : `Filtruj: ${DEGRADATION_LABELS[cause]} (${count})`
                  }
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/60 ${
                    disabled
                      ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
                      : active
                        ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {DEGRADATION_LABELS[cause]}
                  <span className="ml-1 opacity-80">({count})</span>
                </button>
              );
            })}
            {activeFilters.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilters(new Set())}
                className="text-[10px] font-sans text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded-md hover:bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary/60 transition-colors"
                aria-label="Wyczyść filtry"
              >
                Pokaż wszystkie
              </button>
            )}
          </div>

          {/* Lista wpisów (najnowsza pierwsza). Każdy wpis ma datownik, kategorię i opis. */}
          {visibleHistory.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              Brak incydentów pasujących do wybranych filtrów.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {visibleHistory.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 text-[11px] leading-snug"
                >
                  <span
                    className="font-mono text-muted-foreground/70 shrink-0 tabular-nums"
                    title={new Date(entry.at).toLocaleString("pl-PL")}
                  >
                    {formatTime(entry.at)}
                  </span>
                  <span className="font-mono text-amber-400/90 shrink-0 px-1 rounded bg-amber-500/10">
                    {DEGRADATION_LABELS[entry.cause]}
                  </span>
                  <span className="text-muted-foreground/90 break-words">
                    {entry.detail}
                    {entry.errorMessage && (
                      <span className="block text-[10px] font-mono text-muted-foreground/60 mt-0.5 break-all">
                        {entry.errorMessage}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Checklista środowiska — co jest dostępne w tej przeglądarce. */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70 mb-2">
          Środowisko runtime
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {[
            {
              key: "broadcastChannel",
              label: "BroadcastChannel API",
              ok: env.broadcastChannel,
              hint: "Główny kanał — instant push między kartami",
            },
            {
              key: "localStorage",
              label: "localStorage",
              ok: env.localStorage,
              hint: "Trwałe przechowywanie + storage event",
            },
            {
              key: "customEvent",
              label: "CustomEvent",
              ok: env.customEvent,
              hint: "Sync w obrębie tej samej karty",
            },
            {
              key: "crypto",
              label: "crypto.randomUUID",
              ok: env.crypto,
              hint: "Stabilne ID kart i pingów",
            },
          ].map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2 text-[11px] font-sans text-muted-foreground"
              title={item.hint}
            >
              {item.ok ? (
                <CheckCircle2
                  className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <XCircle
                  className="w-3.5 h-3.5 text-destructive shrink-0"
                  aria-hidden="true"
                />
              )}
              <span className="font-mono text-foreground/90">{item.label}</span>
              <span className="text-muted-foreground/60 truncate">
                — {item.hint}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Wynik ostatniego testu ping — widoczny TYLKO gdy był uruchomiony. */}
      {pingState.pingId !== null && pingState.responses.length > 0 && (
        <div className="mb-4 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70 mb-2 inline-flex items-center gap-1.5">
            <Radio className="w-3 h-3" aria-hidden="true" />
            Ostatni test ping/pong
            {pingState.strategy && (
              <span
                className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-mono border ${
                  pingState.strategy === "broadcast"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-primary/10 text-primary border-primary/30"
                }`}
              >
                {pingState.strategy === "broadcast"
                  ? "BC ping/pong"
                  : "Storage round-trip"}
              </span>
            )}
          </p>
          <ul className="space-y-1">
            {pingState.responses.map((r) => (
              <li
                key={r.origin}
                className="flex items-center gap-2 text-[11px] font-sans text-muted-foreground"
              >
                <CheckCircle2
                  className="w-3 h-3 text-emerald-400 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-foreground font-medium">{r.label}</span>
                <span className="text-muted-foreground/70 tabular-nums">
                  {r.latencyMs} ms
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans border shrink-0 ${
                    r.enabled
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                      : "bg-primary/15 text-primary border-primary/40"
                  }`}
                >
                  {r.enabled ? "ON" : "OFF"}
                </span>
                {r.via && (
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">
                    via {r.via}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pełna historia synchronizacji — tabela źródeł, przydatne do zauważenia mieszania kanałów. */}
      {syncHistory.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-sans text-muted-foreground/70 mb-2">
            Historia źródeł synchronizacji ({syncHistory.length})
          </p>
          <ul className="space-y-1">
            {syncHistory.map((entry) => {
              const meta =
                entry.source === "broadcast"
                  ? { Icon: Wifi, color: "text-emerald-400" }
                  : entry.source === "storage"
                    ? { Icon: HardDrive, color: "text-primary" }
                    : { Icon: Layers, color: "text-muted-foreground" };
              const Icon = meta.Icon;
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 text-[11px] font-sans text-muted-foreground"
                >
                  <span className="font-mono text-foreground/80 tabular-nums shrink-0">
                    {formatTime(entry.at)}
                  </span>
                  <Icon
                    className={`w-3 h-3 shrink-0 ${meta.color}`}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-foreground/80 shrink-0">
                    {entry.source}
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
        </div>
      )}
    </div>
  );
};

export default SyncDiagnosticPanel;
