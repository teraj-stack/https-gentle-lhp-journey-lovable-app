import { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  History,
  TrendingDown,
  TrendingUp,
  Minus,
  Trash2,
  Download,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuizHistory, type QuizHistoryEntry } from "@/hooks/useQuizHistory";
import ConfirmExportDialog from "@/components/shared/ConfirmExportDialog";
import { useExportConfirmation } from "@/hooks/useExportConfirmation";

const easeOut = [0.16, 1, 0.3, 1] as const;

const levelMeta = {
  low: {
    label: "Niskie",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    Icon: ShieldCheck,
    chartColor: "hsl(var(--primary))",
  },
  medium: {
    label: "Średnie",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    Icon: AlertTriangle,
    chartColor: "hsl(var(--primary))",
  },
  high: {
    label: "Wysokie",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/40",
    Icon: AlertOctagon,
    chartColor: "hsl(var(--destructive))",
  },
} as const;

type ChartPoint = {
  index: number;
  date: string;
  shortDate: string;
  score: number;
  level: QuizHistoryEntry["level"];
};

const exportJson = (history: QuizHistoryEntry[]) => {
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cml-historia-quizu-hemoroidy-${format(new Date(), "yyyy-MM-dd")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const QuizHistorySection = () => {
  const { history, clearHistory } = useQuizHistory();
  const exportConfirm = useExportConfirmation();

  // Wrapper na export — otwiera dialog potwierdzenia zamiast bezpośrednio pobierać.
  const handleExportRequest = () => {
    if (history.length === 0) return;
    const stamp = format(new Date(), "yyyy-MM-dd");
    exportConfirm.request({
      filename: `cml-historia-quizu-hemoroidy-${stamp}.json`,
      format: "json",
      recordsLabel: `${history.length} ${history.length === 1 ? "wynik" : "wyniki/wyników"} quizu`,
      description:
        "Plik JSON z historią Twoich wyników. Trafia tylko na Twoje urządzenie — nie wysyłamy go nigdzie.",
      run: () => exportJson(history),
    });
  };

  const chartData: ChartPoint[] = useMemo(
    () =>
      history.map((e, idx) => ({
        index: idx + 1,
        date: e.date,
        shortDate: format(new Date(e.date), "d MMM", { locale: pl }),
        score: e.score,
        level: e.level,
      })),
    [history]
  );

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const maxScore = latest?.maxScore ?? 28;

  // Threshold lines should mirror getTier in HemoroidyRiskQuiz
  const lowThreshold = 8;
  const mediumThreshold = 17;

  const delta = latest && previous ? latest.score - previous.score : null;

  const handleClear = () => {
    if (window.confirm("Wyczyścić całą historię wyników? Tej operacji nie można cofnąć.")) {
      clearHistory();
    }
  };

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-background/40 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-xl text-foreground mb-1.5">Twoja historia wyników</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Po wypełnieniu testu Twój wynik zostanie tutaj zapisany — wracaj co kilka tygodni,
              aby porównać, jak zmienia się Twój poziom ryzyka po wprowadzeniu nawyków.
              <span className="block mt-2 text-xs italic">
                Dane przechowywane wyłącznie w Twojej przeglądarce. Nie wysyłamy ich na serwer.
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const latestMeta = levelMeta[latest.level];
  const LatestIcon = latestMeta.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6 md:p-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.18em] text-primary mb-1">
              Twój postęp · {history.length} {history.length === 1 ? "wynik" : history.length < 5 ? "wyniki" : "wyników"}
            </p>
            <h3 className="font-heading text-xl md:text-2xl text-foreground leading-tight">
              Historia wyników quizu
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportRequest}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Download className="w-3.5 h-3.5" />
            Eksport JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="gap-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Wyczyść
          </Button>
        </div>
      </div>

      {/* Latest result + delta */}
      <div className={`rounded-xl border ${latestMeta.border} ${latestMeta.bg} p-4 sm:p-5 mb-6`}>
        <div className="flex items-center gap-3 flex-wrap">
          <LatestIcon className={`w-6 h-6 ${latestMeta.color} shrink-0`} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.18em] text-muted-foreground">
              Ostatni wynik · {format(new Date(latest.date), "d MMM yyyy, HH:mm", { locale: pl })}
            </p>
            <p className="font-heading text-lg sm:text-xl text-foreground">
              {latest.label} · {latest.score} / {latest.maxScore} pkt
            </p>
          </div>
          {delta !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border ${
                delta < 0
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
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
                {delta > 0 ? "+" : ""}
                {delta} pkt vs poprzedni
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart — risk zones, baseline, level-colored dots */}
      {history.length >= 2 && (() => {
        const baseline = history[0];
        const levelDotFill: Record<QuizHistoryEntry["level"], string> = {
          low: "hsl(var(--primary))",
          medium: "hsl(var(--primary))",
          high: "hsl(var(--destructive))",
        };
        const levelLabel: Record<QuizHistoryEntry["level"], string> = {
          low: "Niskie",
          medium: "Średnie",
          high: "Wysokie",
        };
        return (
          <div className="mb-6">
            <p className="text-xs font-sans uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Trend punktów i ryzyka · niżej = mniejsze ryzyko
            </p>
            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  {/* Risk zones — colored bands behind the line */}
                  <ReferenceArea
                    y1={0}
                    y2={lowThreshold}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.04}
                    stroke="none"
                  />
                  <ReferenceArea
                    y1={lowThreshold}
                    y2={mediumThreshold}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.08}
                    stroke="none"
                  />
                  <ReferenceArea
                    y1={mediumThreshold}
                    y2={maxScore}
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.08}
                    stroke="none"
                  />

                  <XAxis
                    dataKey="shortDate"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, maxScore]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, _name, item) => {
                      const lvl = (item?.payload as ChartPoint | undefined)?.level;
                      return [
                        `${value} pkt${lvl ? ` · ${levelLabel[lvl]}` : ""}`,
                        "Wynik",
                      ];
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />

                  {/* Threshold lines (Low/Medium/High boundaries) */}
                  <ReferenceLine
                    y={lowThreshold}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                    label={{
                      value: `Low ≤ ${lowThreshold}`,
                      position: "insideTopRight",
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    y={mediumThreshold}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                    label={{
                      value: `Medium ≤ ${mediumThreshold}`,
                      position: "insideTopRight",
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                  />

                  {/* Baseline — first ever quiz score */}
                  {baseline && (
                    <ReferenceLine
                      y={baseline.score}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="6 4"
                      strokeOpacity={0.7}
                      label={{
                        value: `Start: ${baseline.score} pkt`,
                        position: "insideBottomLeft",
                        fill: "hsl(var(--primary))",
                        fontSize: 10,
                      }}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={(props: {
                      cx?: number;
                      cy?: number;
                      payload?: ChartPoint;
                      index?: number;
                    }) => {
                      const { cx, cy, payload, index } = props;
                      if (cx == null || cy == null || !payload) {
                        return <g key={`dot-${index ?? "x"}`} />;
                      }
                      const fill = levelDotFill[payload.level];
                      const isBaseline = index === 0;
                      return (
                        <g key={`dot-${index ?? payload.date}`}>
                          {isBaseline && (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={8}
                              fill="none"
                              stroke="hsl(var(--primary))"
                              strokeOpacity={0.5}
                              strokeWidth={1.5}
                            />
                          )}
                          <circle cx={cx} cy={cy} r={4} fill={fill} />
                        </g>
                      );
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary/10 border border-primary/20" />
                Strefa Low / Medium
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-destructive/10 border border-destructive/30" />
                Strefa High
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-px bg-primary" style={{ borderTop: "1px dashed hsl(var(--primary))" }} />
                Wynik początkowy ({baseline?.score ?? 0} pkt)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                Punkt w strefie wysokiego ryzyka
              </span>
            </div>
          </div>
        );
      })()}

      {/* Recent entries list */}
      <div>
        <p className="text-xs font-sans uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Ostatnie wpisy
        </p>
        <ul className="space-y-2">
          {[...history]
            .reverse()
            .slice(0, 5)
            .map((entry) => {
              const meta = levelMeta[entry.level];
              const Icon = meta.Icon;
              return (
                <li
                  key={entry.date}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/30"
                >
                  <Icon className={`w-4 h-4 ${meta.color} shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      {format(new Date(entry.date), "d MMM yyyy, HH:mm", { locale: pl })}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-sans px-2.5 py-1 rounded-full border ${meta.border} ${meta.bg} ${meta.color} shrink-0`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground shrink-0">
                    {entry.score} pkt
                  </span>
                </li>
              );
            })}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground italic mt-5">
        Dane zapisywane wyłącznie w Twojej przeglądarce (localStorage). Nie wysyłamy ich na serwer.
      </p>

      {/* Dialog potwierdzenia eksportu (JSON historii quizu). */}
      <ConfirmExportDialog
        {...exportConfirm.dialogProps}
        title="Eksport historii quizu"
        confirmLabel="Pobierz JSON"
      />
    </motion.div>
  );
};

export default QuizHistorySection;
