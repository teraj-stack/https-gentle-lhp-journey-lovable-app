import { motion } from "framer-motion";
import { Sparkles, Layers, Activity } from "lucide-react";
import type { ChecklistSummary } from "@/lib/checklistSummary";

type Props = {
  summary: ChecklistSummary;
};

const easeOut = [0.16, 1, 0.3, 1] as const;

const ChecklistAutoSummary = ({ summary }: Props) => {
  if (summary.total === 0) return null;

  const topCategories = summary.categories.slice(0, 3);
  const topMechanisms = summary.mechanisms.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mt-6 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] via-background/40 to-background/40 p-4 sm:p-5"
      aria-labelledby="checklist-auto-summary-heading"
    >
      <div className="flex items-start gap-2.5 mb-4">
        <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h4
            id="checklist-auto-summary-heading"
            className="font-heading text-base sm:text-lg text-foreground leading-tight"
          >
            Automatyczne podsumowanie Twojej checklisty
          </h4>
          <p className="text-[11.5px] sm:text-xs text-muted-foreground mt-0.5">
            Wygenerowane na podstawie {summary.total}{" "}
            {summary.total === 1 ? "zaznaczonego czynnika" : "zaznaczonych czynników"}.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Kategorie */}
        <div>
          <p className="text-[11px] sm:text-xs font-sans uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1.5 mb-2.5">
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" aria-hidden="true" />
            Dominujące kategorie
          </p>
          <ul className="space-y-2">
            {topCategories.map((c) => (
              <li key={c.label}>
                <div className="flex items-center justify-between gap-2 text-[13px] sm:text-sm mb-1">
                  <span className="text-foreground font-medium truncate">{c.label}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {c.count} · {c.share}%
                  </span>
                </div>
                <div
                  className="h-1.5 bg-muted/40 rounded-full overflow-hidden"
                  role="presentation"
                >
                  <div
                    className="h-full bg-primary/70 rounded-full"
                    style={{ width: `${Math.max(c.share, 6)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Mechanizmy */}
        <div>
          <p className="text-[11px] sm:text-xs font-sans uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1.5 mb-2.5">
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" aria-hidden="true" />
            Dominujące mechanizmy
          </p>
          <ul className="space-y-2">
            {topMechanisms.map((m) => (
              <li key={m.label}>
                <div className="flex items-center justify-between gap-2 text-[13px] sm:text-sm mb-1">
                  <span className="text-foreground font-medium truncate" title={m.label}>
                    {m.label}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {m.count} · {m.share}%
                  </span>
                </div>
                <div
                  className="h-1.5 bg-muted/40 rounded-full overflow-hidden"
                  role="presentation"
                >
                  <div
                    className="h-full bg-primary/70 rounded-full"
                    style={{ width: `${Math.max(m.share, 6)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-[12.5px] sm:text-[13px] text-foreground/85 leading-relaxed border-t border-border/40 pt-3 italic">
        {summary.comment}
      </p>
      <p className="mt-2 text-[10.5px] sm:text-[11px] text-muted-foreground">
        Heurystyczne podsumowanie edukacyjne — nie zastępuje konsultacji proktologicznej.
      </p>
    </motion.div>
  );
};

export default ChecklistAutoSummary;
