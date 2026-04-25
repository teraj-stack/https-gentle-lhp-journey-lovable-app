import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, formatDistanceToNowStrict } from "date-fns";
import { pl } from "date-fns/locale";
import {
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Minus,
  ArrowRight,
  Sparkles,
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuizHistory, type QuizHistoryEntry } from "@/hooks/useQuizHistory";

const easeOut = [0.16, 1, 0.3, 1] as const;

/** Scroll to the quiz card and dispatch the restart event so the quiz resets. */
const QUIZ_TARGET_ID = "hemoroidy-quiz";
const RESTART_EVENT = "cml:quiz-restart";

const levelMeta = {
  low: {
    label: "Niskie",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    Icon: ShieldCheck,
  },
  medium: {
    label: "Średnie",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    Icon: AlertTriangle,
  },
  high: {
    label: "Wysokie",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/40",
    Icon: AlertOctagon,
  },
} as const;

const levelOrder = { low: 0, medium: 1, high: 2 } as const;

const buildInsight = (
  latest: QuizHistoryEntry,
  previous: QuizHistoryEntry | undefined,
): { tone: "positive" | "warning" | "neutral"; text: string } => {
  if (!previous) {
    return {
      tone: "neutral",
      text: "To Twój pierwszy wynik — wypełnij quiz ponownie za 2–4 tygodnie, aby zobaczyć efekt zmian w stylu życia.",
    };
  }
  const delta = latest.score - previous.score;
  const levelChange = levelOrder[latest.level] - levelOrder[previous.level];

  if (levelChange < 0) {
    return {
      tone: "positive",
      text: `Świetnie! Twoje ryzyko spadło z poziomu „${previous.label}” do „${latest.label}”. Utrzymuj wprowadzone nawyki.`,
    };
  }
  if (levelChange > 0) {
    return {
      tone: "warning",
      text: `Twoje ryzyko wzrosło z „${previous.label}” do „${latest.label}”. Wróć do checklisty profilaktyki i rozważ konsultację.`,
    };
  }
  if (delta < 0) {
    return {
      tone: "positive",
      text: `Punktacja spadła o ${Math.abs(delta)} pkt — jesteś na dobrej drodze. Kontynuuj zmiany.`,
    };
  }
  if (delta > 0) {
    return {
      tone: "warning",
      text: `Punktacja wzrosła o ${delta} pkt. Sprawdź, które nawyki uległy pogorszeniu i wróć do checklisty.`,
    };
  }
  return {
    tone: "neutral",
    text: "Wynik bez zmian — porównaj odpowiedzi i sprawdź, które obszary możesz dalej poprawić.",
  };
};

const handleRetake = () => {
  if (typeof window === "undefined") return;
  // 1. Dispatch reset event for the quiz
  window.dispatchEvent(new CustomEvent(RESTART_EVENT));
  // 2. Scroll to the quiz card (next tick so the DOM updates first)
  requestAnimationFrame(() => {
    const target = document.getElementById(QUIZ_TARGET_ID);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // Move keyboard focus to the quiz container for a11y
      target.setAttribute("tabindex", "-1");
      (target as HTMLElement).focus({ preventScroll: true });
    }
  });
};

const QuizRetakeModule = () => {
  const { history } = useQuizHistory();

  const { latest, previous, best, insight } = useMemo(() => {
    const latestEntry = history[history.length - 1];
    const previousEntry = history[history.length - 2];
    const bestEntry =
      history.length > 0
        ? [...history].sort((a, b) => a.score - b.score)[0]
        : undefined;
    return {
      latest: latestEntry,
      previous: previousEntry,
      best: bestEntry,
      insight: latestEntry ? buildInsight(latestEntry, previousEntry) : null,
    };
  }, [history]);

  // Empty state — no history yet
  if (!latest) {
    return (
      <motion.aside
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6 md:p-8"
        aria-label="Powtórz quiz"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <RefreshCcw className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.18em] text-primary mb-1">
              Powtórz · porównaj
            </p>
            <h3 className="font-heading text-xl text-foreground mb-1.5">
              Wracaj do quizu, by śledzić postępy
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Po wypełnieniu testu zapiszemy Twój wynik anonimowo w przeglądarce.
              Możesz wracać co kilka tygodni — zobaczysz zmianę punktacji i poziomu ryzyka
              względem poprzedniego podejścia.
            </p>
          </div>
        </div>
      </motion.aside>
    );
  }

  const latestMeta = levelMeta[latest.level];
  const LatestIcon = latestMeta.Icon;
  const previousMeta = previous ? levelMeta[previous.level] : null;
  const PreviousIcon = previousMeta?.Icon;
  const delta = previous ? latest.score - previous.score : null;

  const sinceLast = formatDistanceToNowStrict(new Date(latest.date), {
    locale: pl,
    addSuffix: true,
  });

  const insightToneClasses =
    insight?.tone === "positive"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : insight?.tone === "warning"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-border bg-muted/20 text-muted-foreground";

  return (
    <motion.aside
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background/40 to-background/40 p-5 sm:p-6 md:p-8"
      aria-label="Powtórz quiz i porównaj wyniki"
    >
      <div
        className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <RefreshCcw className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.18em] text-primary mb-1 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Powtórz quiz · porównaj wyniki
            </p>
            <h3 className="font-heading text-xl md:text-2xl text-foreground leading-tight">
              Sprawdź, jak zmieniło się Twoje ryzyko
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 inline-flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Ostatnie podejście {sinceLast}
            </p>
          </div>
        </div>

        <Button
          size="lg"
          variant="hero"
          onClick={handleRetake}
          className="gap-2 h-auto min-h-11 py-2.5 px-5 whitespace-normal shrink-0"
        >
          <RefreshCcw className="w-4 h-4 shrink-0" />
          <span>Wypełnij quiz ponownie</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Button>
      </div>

      {/* Side-by-side comparison: previous vs latest */}
      <div className="relative grid sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
        {/* Previous */}
        <div
          className={`rounded-xl border p-4 sm:p-5 ${
            previousMeta
              ? `${previousMeta.border} ${previousMeta.bg}`
              : "border-dashed border-border bg-background/30"
          }`}
        >
          <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Poprzednio
          </p>
          {previous && previousMeta && PreviousIcon ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <PreviousIcon className={`w-5 h-5 ${previousMeta.color} shrink-0`} />
                <p className={`font-heading text-lg ${previousMeta.color}`}>
                  {previous.label}
                </p>
              </div>
              <p className="text-2xl font-heading text-foreground tabular-nums">
                {previous.score}
                <span className="text-sm text-muted-foreground"> / {previous.maxScore} pkt</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(previous.date), "d MMM yyyy, HH:mm", { locale: pl })}
              </p>
            </>
          ) : (
            <>
              <p className="font-heading text-base text-muted-foreground">Brak wcześniejszego wyniku</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Wypełnij quiz ponownie za kilka tygodni — porównanie pojawi się tutaj.
              </p>
            </>
          )}
        </div>

        {/* Latest */}
        <div className={`rounded-xl border p-4 sm:p-5 ${latestMeta.border} ${latestMeta.bg}`}>
          <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.18em] text-primary mb-2">
            Ostatnio
          </p>
          <div className="flex items-center gap-2 mb-1">
            <LatestIcon className={`w-5 h-5 ${latestMeta.color} shrink-0`} />
            <p className={`font-heading text-lg ${latestMeta.color}`}>{latest.label}</p>
          </div>
          <p className="text-2xl font-heading text-foreground tabular-nums">
            {latest.score}
            <span className="text-sm text-muted-foreground"> / {latest.maxScore} pkt</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(latest.date), "d MMM yyyy, HH:mm", { locale: pl })}
          </p>
        </div>
      </div>

      {/* Delta + best ever */}
      {(delta !== null || (best && best.date !== latest.date)) && (
        <div className="relative flex flex-wrap gap-2 mb-5">
          {delta !== null && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border ${
                delta < 0
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : delta > 0
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              {delta < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : delta > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              <span>
                Zmiana: {delta > 0 ? "+" : ""}
                {delta} pkt
              </span>
            </div>
          )}
          {best && best.date !== latest.date && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Najlepszy wynik: {best.score} pkt ·{" "}
                {format(new Date(best.date), "d MMM yyyy", { locale: pl })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Insight */}
      {insight && (
        <div className={`relative rounded-xl border p-4 ${insightToneClasses}`}>
          <p className="text-sm leading-relaxed text-foreground/90">{insight.text}</p>
        </div>
      )}

      <p className="relative text-xs text-muted-foreground italic mt-4">
        Sugerujemy powtarzać quiz co 2–4 tygodnie po zmianie nawyków lub po konsultacji z proktologiem.
      </p>
    </motion.aside>
  );
};

export default QuizRetakeModule;
