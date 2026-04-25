import { useEffect, useState } from "react";
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
} from "lucide-react";
import type {
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
  simulateFallback,
  isBroadcastSupported,
  tabLabel,
  syncHistory,
  lastRemoteSyncAt,
  pingState,
}: SyncDiagnosticPanelProps) => {
  const [env] = useState(() => detectEnvironment());
  const [copied, setCopied] = useState(false);

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
          <p className="mt-1.5 text-[10px] text-muted-foreground/60">
            Wykryto: {formatRelative(degradationInfo.at)}
          </p>
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
