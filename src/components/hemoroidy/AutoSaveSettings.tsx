import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/useAutoSave";
import { toast } from "@/hooks/use-toast";

/**
 * Format „przed chwilą" / „X s temu" / „X min temu" / „X h temu" / pełna data.
 * Trzymamy lokalnie, bez date-fns — proste i bez kosztu bundle'u.
 */
const formatRelativeTime = (timestamp: number): string => {
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
  } = useAutoSave();
  /**
   * Tick używany do auto-odświeżania względnego czasu („X s temu" → „X min temu").
   * Inkrementowany co 15 s tylko gdy mamy zarejestrowaną zdalną synchronizację.
   */
  const [, setNowTick] = useState(0);

  useEffect(() => {
    if (lastRemoteSyncAt === null) return;
    const interval = setInterval(() => setNowTick((n) => n + 1), 15_000);
    return () => clearInterval(interval);
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

  const handleSendPing = async () => {
    if (!isBroadcastSupported) {
      toast({
        title: "Test niedostępny",
        description:
          "Twoja przeglądarka nie wspiera BroadcastChannel — synchronizacja działa wtedy przez storage event (bez potwierdzenia odbioru).",
        duration: 4000,
      });
      return;
    }
    const responses = await sendPing();
    toast({
      title: responses.length === 0 ? "Brak odpowiedzi z innych kart" : `Odpowiedziało ${responses.length} kart`,
      description:
        responses.length === 0
          ? "Otwórz tę stronę w drugiej karcie i spróbuj ponownie."
          : responses.map((r) => `${r.label} (${r.latencyMs} ms)`).join(", "),
      duration: 4000,
    });
  };

  // Format „2 min temu (14:32)" — relatywny czas + godzina dnia w nawiasie.
  const lastSyncLabel = (() => {
    if (lastRemoteSyncAt === null) return null;
    const relative = formatRelativeTime(lastRemoteSyncAt);
    const clock = new Date(lastRemoteSyncAt).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${relative} (${clock})`;
  })();
  // Pełna data + godzina jako tooltip — pomocna gdy karta wisi długo otwarta.
  const lastSyncFullDate =
    lastRemoteSyncAt !== null
      ? new Date(lastRemoteSyncAt).toLocaleString("pl-PL", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : undefined;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 mb-6">
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
          />
          {lastSyncLabel && (
            <p
              className={`text-[10px] sm:text-[11px] font-sans text-muted-foreground inline-flex items-center gap-1 transition-colors ${
                isRemoteSyncing ? "text-primary" : ""
              }`}
              title={lastSyncFullDate}
              aria-live="polite"
            >
              <RefreshCw
                className={`w-3 h-3 ${isRemoteSyncing ? "animate-spin text-primary" : ""}`}
                aria-hidden="true"
              />
              <span>
                Ostatnia zmiana: <strong className="text-foreground">{lastSyncLabel}</strong>
              </span>
            </p>
          )}
        </div>
      </div>

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
            disabled={pingState.isCollecting || !isBroadcastSupported}
            className="self-start sm:self-auto shrink-0"
            aria-label="Wyślij sygnał testowy do innych kart"
          >
            {pingState.isCollecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Nasłuchiwanie…
              </>
            ) : !isBroadcastSupported ? (
              <>
                <WifiOff className="w-4 h-4 mr-2" aria-hidden="true" />
                Niedostępne
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
    </div>
  );
};

export default AutoSaveSettings;
