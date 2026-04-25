import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Flame,
  Award,
  AlertOctagon,
  CalendarRange,
  NotebookPen,
  Activity,
} from "lucide-react";
import type { TrendPoint } from "@/lib/diaryExport";
import type { DiaryEntry } from "@/hooks/useDailyDiary";
import { RiskLevel } from "@/lib/hemoroidyQuizData";

const easeOut = [0.16, 1, 0.3, 1] as const;

const formatShortDate = (key: string): string => {
  if (!key) return "—";
  const [, m, d] = key.split("-");
  return `${d}.${m}`;
};

const avg = (xs: number[]): number | null =>
  xs.length === 0 ? null : Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10;

interface DiaryTrendStatsProps {
  trend: TrendPoint[];
  entries: Record<string, DiaryEntry>;
}

const DiaryTrendStats = ({ trend, entries }: DiaryTrendStatsProps) => {
  const stats = useMemo(() => {
    const filled = trend.filter((d) => d.score !== null) as Array<
      TrendPoint & { score: number; level: RiskLevel }
    >;

    // Tygodnie: ostatnie 7 dni vs poprzednie 7 dni (z 14-dniowego okna trend)
    const last7 = trend.slice(-7).filter((d) => d.score !== null) as Array<
      TrendPoint & { score: number }
    >;
    const prev7 = trend.slice(0, Math.max(0, trend.length - 7)).filter(
      (d) => d.score !== null,
    ) as Array<TrendPoint & { score: number }>;

    const last7Avg = avg(last7.map((d) => d.score));
    const prev7Avg = avg(prev7.map((d) => d.score));
    const weekDelta =
      last7Avg !== null && prev7Avg !== null
        ? Math.round((last7Avg - prev7Avg) * 10) / 10
        : null;

    // Najlepszy / najgorszy dzień
    const sorted = [...filled].sort((a, b) => a.score - b.score);
    const bestDay = sorted[0] ?? null;
    const worstDay = sorted[sorted.length - 1] ?? null;

    // Najdłuższa seria niskiego ryzyka (consecutive low) w obrębie wpisanych dni — w kolejności kalendarzowej
    let currentLowStreak = 0;
    let bestLowStreak = 0;
    let activeLowStreak = 0;
    for (let i = 0; i < trend.length; i++) {
      const d = trend[i];
      if (d.level === "low") {
        currentLowStreak++;
        if (currentLowStreak > bestLowStreak) bestLowStreak = currentLowStreak;
      } else if (d.score !== null) {
        // wypełniony dzień, ale nie low → przerywa
        currentLowStreak = 0;
      }
      // brak wpisu → nie przerywamy serii (pozwala na wybaczenie luk)
    }
    // aktualna seria liczona od końca — tylko z bezpośredniej końcówki
    for (let i = trend.length - 1; i >= 0; i--) {
      const d = trend[i];
      if (d.level === "low") activeLowStreak++;
      else if (d.score !== null) break;
      // luki (brak wpisu) nie przerywają, ale też nie liczymy
    }

    // Notatki
    const notesCount = Object.values(entries).filter((e) => e.notes && e.notes.trim().length > 0).length;

    // Spójność (wypełnienie)
    const consistencyPct =
      trend.length > 0 ? Math.round((filled.length / trend.length) * 100) : 0;

    return {
      filled: filled.length,
      totalDays: trend.length,
      consistencyPct,
      last7Avg,
      prev7Avg,
      weekDelta,
      bestDay,
      worstDay,
      bestLowStreak,
      activeLowStreak,
      notesCount,
    };
  }, [trend, entries]);

  if (stats.filled === 0) {
    return (
      <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
        Statystyki trendu pojawią się tu po pierwszym wypełnionym dniu.
      </div>
    );
  }

  const WeekTrendIcon =
    stats.weekDelta === null
      ? Minus
      : stats.weekDelta < 0
        ? TrendingDown
        : stats.weekDelta > 0
          ? TrendingUp
          : Minus;

  const weekTrendColor =
    stats.weekDelta === null
      ? "text-muted-foreground"
      : stats.weekDelta < 0
        ? "text-emerald-400"
        : stats.weekDelta > 0
          ? "text-destructive"
          : "text-muted-foreground";

  const weekTrendBorder =
    stats.weekDelta === null
      ? "border-border"
      : stats.weekDelta < 0
        ? "border-emerald-500/30"
        : stats.weekDelta > 0
          ? "border-destructive/30"
          : "border-border";

  const weekTrendBg =
    stats.weekDelta === null
      ? "bg-background/40"
      : stats.weekDelta < 0
        ? "bg-emerald-500/5"
        : stats.weekDelta > 0
          ? "bg-destructive/5"
          : "bg-background/40";

  const weekTrendLabel =
    stats.weekDelta === null
      ? "Za mało danych do porównania"
      : stats.weekDelta < 0
        ? "Lepiej niż poprzedni tydzień"
        : stats.weekDelta > 0
          ? "Gorzej niż poprzedni tydzień"
          : "Bez zmian względem poprzedniego tygodnia";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-3"
      aria-label="Statystyki trendu"
    >
      {/* Tydzień vs poprzedni — featured card spans 2 cols on lg */}
      <div
        className={`col-span-2 lg:col-span-3 rounded-xl border ${weekTrendBorder} ${weekTrendBg} p-4`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg bg-background/60 border border-border flex items-center justify-center shrink-0 ${weekTrendColor}`}>
            <WeekTrendIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans mb-0.5">
              Ten tydzień vs poprzedni
            </p>
            <p className="font-heading text-lg text-foreground leading-tight">
              {stats.last7Avg !== null ? `${stats.last7Avg} pkt` : "—"}
              {stats.prev7Avg !== null && (
                <span className="text-sm text-muted-foreground font-sans ml-2">
                  poprzednio {stats.prev7Avg} pkt
                </span>
              )}
            </p>
            <p className={`text-xs mt-1 font-sans ${weekTrendColor}`}>
              {stats.weekDelta !== null && stats.weekDelta !== 0 && (
                <>
                  {stats.weekDelta > 0 ? "+" : ""}
                  {stats.weekDelta} pkt ·{" "}
                </>
              )}
              {weekTrendLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Najlepszy dzień */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans">
            Najlepszy dzień
          </p>
        </div>
        <p className="font-heading text-2xl text-emerald-400 leading-none">
          {stats.bestDay ? `${stats.bestDay.score} pkt` : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          {stats.bestDay ? formatShortDate(stats.bestDay.date) : "brak danych"}
        </p>
      </div>

      {/* Najgorszy dzień */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertOctagon className="w-4 h-4 text-destructive" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans">
            Najtrudniejszy dzień
          </p>
        </div>
        <p className="font-heading text-2xl text-destructive leading-none">
          {stats.worstDay ? `${stats.worstDay.score} pkt` : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          {stats.worstDay ? formatShortDate(stats.worstDay.date) : "brak danych"}
        </p>
      </div>

      {/* Seria niskiego ryzyka */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-primary" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans">
            Seria niskiego ryzyka
          </p>
        </div>
        <p className="font-heading text-2xl text-primary leading-none">
          {stats.activeLowStreak} {stats.activeLowStreak === 1 ? "dzień" : "dni"}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          rekord: {stats.bestLowStreak} {stats.bestLowStreak === 1 ? "dzień" : "dni"}
        </p>
      </div>

      {/* Spójność wypełnienia */}
      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarRange className="w-4 h-4 text-primary" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans">
            Spójność wypełnienia
          </p>
        </div>
        <p className="font-heading text-2xl text-foreground leading-none">{stats.consistencyPct}%</p>
        <p className="text-xs text-muted-foreground mt-1.5">
          {stats.filled}/{stats.totalDays} dni
        </p>
      </div>

      {/* Notatki */}
      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <NotebookPen className="w-4 h-4 text-primary" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans">
            Dni z notatką
          </p>
        </div>
        <p className="font-heading text-2xl text-foreground leading-none">{stats.notesCount}</p>
        <p className="text-xs text-muted-foreground mt-1.5">
          {stats.notesCount === 0 ? "dodaj kontekst do dnia" : "świetnie — kontekst pomaga"}
        </p>
      </div>

      {/* Średnia dnia */}
      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans">
            Średnia z 7 dni
          </p>
        </div>
        <p className="font-heading text-2xl text-foreground leading-none">
          {stats.last7Avg !== null ? `${stats.last7Avg} pkt` : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">na podstawie ostatniego tygodnia</p>
      </div>
    </motion.div>
  );
};

export default DiaryTrendStats;
