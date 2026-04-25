import { Save, ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/useAutoSave";
import { toast } from "@/hooks/use-toast";

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
  const { enabled, setEnabled } = useAutoSave();

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
                className={`text-[11px] px-1.5 py-0.5 rounded-md font-sans border ${
                  enabled
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : "bg-primary/15 text-primary border-primary/40"
                }`}
              >
                {enabled ? "Włączony" : "Wyłączony"}
              </span>
            </label>
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
        <Switch
          id="autosave-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          aria-label="Przełącz auto-zapis odpowiedzi quizu"
        />
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
    </div>
  );
};

export default AutoSaveSettings;
