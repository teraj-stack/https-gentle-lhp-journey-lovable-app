import { useState } from "react";
import { ChevronDown, RotateCcw, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useRiskThresholds } from "@/hooks/useRiskThresholds";
import { toast } from "@/hooks/use-toast";

/**
 * Panel ustawień progów kategorii ryzyka quizu hemoroidów.
 * Dwa slidery: lowMax (próg „Niskie/Średnie") i mediumMax (próg „Średnie/Wysokie").
 * Walidacja na poziomie hooka (`sanitizeRiskThresholds`) gwarantuje 3 niepuste strefy.
 *
 * Zmiana propaguje się natychmiast do wszystkich osadzonych komponentów (legendy chartu,
 * stripa, wynik quizu) przez custom event `cml:risk-thresholds-updated`.
 */
const RiskThresholdsSettings = () => {
  const { thresholds, update, reset, isCustom, maxScore, defaults } = useRiskThresholds();
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="font-sans text-sm sm:text-base font-medium text-foreground">
            Progi kategorii ryzyka
          </span>
          {isCustom && (
            <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/40 font-sans">
              dostosowane
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          ≤{thresholds.lowMax} / {thresholds.lowMax + 1}–{thresholds.mediumMax} / {thresholds.mediumMax + 1}+
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <p className="text-xs text-muted-foreground">
            Dostosuj progi, aby dopasować klasyfikację do zaleceń Twojego lekarza. Zmiana
            natychmiast aktualizuje legendę wykresu i wynik quizu — nie wpływa na zapisane
            odpowiedzi (przeliczamy w locie).
          </p>

          {/* Próg „Niskie ↔ Średnie" */}
          <div>
            <div className="flex items-center justify-between mb-2 text-xs">
              <label htmlFor="risk-low-max" className="text-foreground/85 font-medium">
                Próg „Niskie ↔ Średnie"
              </label>
              <span className="tabular-nums text-muted-foreground">
                ≤<strong className="text-foreground">{thresholds.lowMax}</strong> pkt
              </span>
            </div>
            <Slider
              id="risk-low-max"
              min={0}
              max={maxScore - 2}
              step={1}
              value={[thresholds.lowMax]}
              onValueChange={(v) => update({ lowMax: v[0] })}
              aria-label="Próg niskie/średnie"
            />
          </div>

          {/* Próg „Średnie ↔ Wysokie" */}
          <div>
            <div className="flex items-center justify-between mb-2 text-xs">
              <label htmlFor="risk-medium-max" className="text-foreground/85 font-medium">
                Próg „Średnie ↔ Wysokie"
              </label>
              <span className="tabular-nums text-muted-foreground">
                ≤<strong className="text-foreground">{thresholds.mediumMax}</strong> pkt
              </span>
            </div>
            <Slider
              id="risk-medium-max"
              min={thresholds.lowMax + 1}
              max={maxScore - 1}
              step={1}
              value={[thresholds.mediumMax]}
              onValueChange={(v) => update({ mediumMax: v[0] })}
              aria-label="Próg średnie/wysokie"
            />
          </div>

          {/* Podgląd 3 stref */}
          <div className="grid grid-cols-3 gap-2 text-[11px] text-center">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 py-1.5">
              Niskie<br /><strong className="tabular-nums">0–{thresholds.lowMax}</strong>
            </div>
            <div className="rounded-md border border-primary/40 bg-primary/10 text-primary py-1.5">
              Średnie<br /><strong className="tabular-nums">{thresholds.lowMax + 1}–{thresholds.mediumMax}</strong>
            </div>
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive py-1.5">
              Wysokie<br /><strong className="tabular-nums">{thresholds.mediumMax + 1}+</strong>
            </div>
          </div>

          {isCustom && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                toast({
                  title: "Przywrócono domyślne progi",
                  description: `≤${defaults.lowMax} / ${defaults.lowMax + 1}–${defaults.mediumMax} / ${defaults.mediumMax + 1}+`,
                });
              }}
              className="gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Przywróć domyślne
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default RiskThresholdsSettings;
