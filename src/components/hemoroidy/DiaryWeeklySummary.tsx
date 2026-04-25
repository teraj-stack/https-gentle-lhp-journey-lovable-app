import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  Info,
} from "lucide-react";
import type { TrendPoint } from "@/lib/diaryExport";
import type { DiaryEntry } from "@/hooks/useDailyDiary";
import { RiskLevel, getRiskLabel } from "@/lib/hemoroidyQuizData";

const easeOut = [0.16, 1, 0.3, 1] as const;

const formatRange = (from: string, to: string): string => {
  if (!from || !to) return "—";
  const [, mF, dF] = from.split("-");
  const [, mT, dT] = to.split("-");
  return `${dF}.${mF} – ${dT}.${mT}`;
};

const avgRound1 = (xs: number[]): number | null =>
  xs.length === 0 ? null : Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10;

const dominantLevel = (levels: RiskLevel[]): RiskLevel | null => {
  if (levels.length === 0) return null;
  const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  levels.forEach((l) => counts[l]++);
  const sorted = (Object.entries(counts) as Array<[RiskLevel, number]>).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : null;
};

interface WeekStats {
  label: string;
  range: string;
  filled: number;
  totalDays: number;
  avgScore: number | null;
  notesCount: number;
  dominant: RiskLevel | null;
  levelCounts: Record<RiskLevel, number>;
}

const buildWeekStats = (
  label: string,
  slice: TrendPoint[],
  entries: Record<string, DiaryEntry>,
): WeekStats => {
  const filled = slice.filter((d) => d.score !== null) as Array<
    TrendPoint & { score: number; level: RiskLevel }
  >;
  const levels = filled.map((d) => d.level);
  const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  levels.forEach((l) => counts[l]++);

  const notesCount = slice.filter((d) => {
    const e = entries[d.date];
    return !!e?.notes && e.notes.trim().length > 0;
  }).length;

  return {
    label,
    range: slice.length ? formatRange(slice[0].date, slice[slice.length - 1].date) : "—",
    filled: filled.length,
    totalDays: slice.length,
    avgScore: avgRound1(filled.map((d) => d.score)),
    notesCount,
    dominant: dominantLevel(levels),
    levelCounts: counts,
  };
};

const LEVEL_COLOR: Record<RiskLevel, string> = {
  low: "text-emerald-400",
  medium: "text-primary",
  high: "text-destructive",
};

const LEVEL_BORDER: Record<RiskLevel, string> = {
  low: "border-emerald-500/30",
  medium: "border-primary/30",
  high: "border-destructive/30",
};

const LEVEL_BG: Record<RiskLevel, string> = {
  low: "bg-emerald-500/5",
  medium: "bg-primary/5",
  high: "bg-destructive/5",
};

const buildCommentary = (w1: WeekStats, w2: WeekStats): string => {
  // Brak danych
  if (w1.filled === 0 && w2.filled === 0) {
    return "Zacznij wypełniać dziennik codziennie — po pierwszym tygodniu pojawi się tu Twoje podsumowanie i porównanie.";
  }
  if (w1.filled === 0 && w2.filled > 0) {
    const lvl = w2.dominant ? getRiskLabel(w2.dominant).toLowerCase() : "—";
    return `Świeży start: w tym tygodniu masz średnio ${w2.avgScore} pkt (przeważnie ryzyko ${lvl}). Wypełnij kolejne dni, aby zobaczyć trend tydzień-do-tygodnia.`;
  }
  if (w2.filled === 0 && w1.filled > 0) {
    return `W zeszłym tygodniu średnia wynosiła ${w1.avgScore} pkt — uzupełnij wpisy z bieżącego tygodnia, aby porównać postęp.`;
  }

  const delta = (w2.avgScore ?? 0) - (w1.avgScore ?? 0);
  const deltaRounded = Math.round(delta * 10) / 10;
  const absDelta = Math.abs(deltaRounded);

  if (absDelta < 0.5) {
    return `Trend stabilny: średnia obu tygodni jest zbliżona (${w1.avgScore} → ${w2.avgScore} pkt). Utrzymujesz nawyki — kontynuuj rutynę i zwracaj uwagę na dni odstające.`;
  }

  if (delta < 0) {
    // poprawa
    const lowGain = w2.levelCounts.low - w1.levelCounts.low;
    const lowMsg =
      lowGain > 0
        ? ` Liczba dni z niskim ryzykiem wzrosła o ${lowGain}.`
        : "";
    return `Świetna poprawa: średnia spadła z ${w1.avgScore} do ${w2.avgScore} pkt (–${absDelta}).${lowMsg} To efekt konsekwentnych nawyków — błonnika, nawodnienia i krótszych wizyt w toalecie.`;
  }

  // pogorszenie
  const highGain = w2.levelCounts.high - w1.levelCounts.high;
  const highMsg =
    highGain > 0
      ? ` Pojawiło się ${highGain} ${highGain === 1 ? "dzień" : "dni"} więcej z wysokim ryzykiem.`
      : "";
  return `Trend rosnący: średnia wzrosła z ${w1.avgScore} do ${w2.avgScore} pkt (+${absDelta}).${highMsg} Wróć do podstaw EBM: 25–35 g błonnika, 1.5–2 l wody, ruch i max 3 min na toalecie.`;
};

interface DiaryWeeklySummaryProps {
  trend: TrendPoint[];
  entries: Record<string, DiaryEntry>;
}

const DiaryWeeklySummary = ({ trend, entries }: DiaryWeeklySummaryProps) => {
  const { week1, week2, delta, direction } = useMemo(() => {
    // trend ma 14 elementów (od najstarszego do dziś); week1 = pierwsze 7, week2 = ostatnie 7
    const w1Slice = trend.slice(0, 7);
    const w2Slice = trend.slice(7, 14);
    const w1 = buildWeekStats("Tydzień 1", w1Slice, entries);
    const w2 = buildWeekStats("Tydzień 2", w2Slice, entries);
    const d =
      w1.avgScore !== null && w2.avgScore !== null
        ? Math.round((w2.avgScore - w1.avgScore) * 10) / 10
        : null;
    const dir: "down" | "up" | "flat" | "n/a" =
      d === null ? "n/a" : Math.abs(d) < 0.5 ? "flat" : d < 0 ? "down" : "up";
    return { week1: w1, week2: w2, delta: d, direction: dir };
  }, [trend, entries]);

  const commentary = useMemo(() => buildCommentary(week1, week2), [week1, week2]);

  const DeltaIcon =
    direction === "down" ? TrendingDown : direction === "up" ? TrendingUp : Minus;

  const deltaColor =
    direction === "down"
      ? "text-emerald-400"
      : direction === "up"
        ? "text-destructive"
        : "text-muted-foreground";

  const deltaBorder =
    direction === "down"
      ? "border-emerald-500/40"
      : direction === "up"
        ? "border-destructive/40"
        : "border-border";

  const deltaBg =
    direction === "down"
      ? "bg-emerald-500/10"
      : direction === "up"
        ? "bg-destructive/10"
        : "bg-muted/20";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className="glass-card rounded-2xl p-5 sm:p-6 md:p-8 mb-8"
      aria-label="Automatyczne podsumowanie tygodniowe"
    >
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <p className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-sans uppercase tracking-[0.16em] text-primary mb-2">
            <Sparkles className="w-3 h-3" />
            Auto-podsumowanie · 2 tygodnie
          </p>
          <h3 className="font-heading text-xl md:text-2xl text-foreground inline-flex items-center gap-2 leading-tight">
            <CalendarDays className="w-5 h-5 text-primary" />
            Tydzień do tygodnia
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Dziennik dzieli się na dwa siedmiodniowe okna — porównaj postęp i przeczytaj krótki
            komentarz wygenerowany na podstawie Twoich danych.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        {/* Tydzień 1 */}
        <div
          className={`rounded-xl border ${
            week1.dominant ? LEVEL_BORDER[week1.dominant] : "border-border"
          } ${week1.dominant ? LEVEL_BG[week1.dominant] : "bg-background/40"} p-4`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans">
                {week1.label}
              </p>
              <p className="font-heading text-lg text-foreground mt-0.5">{week1.range}</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-sans">
              {week1.filled}/{week1.totalDays} dni
            </span>
          </div>
          <p className="font-heading text-3xl text-foreground leading-none">
            {week1.avgScore !== null ? `${week1.avgScore}` : "—"}
            <span className="text-sm text-muted-foreground font-sans ml-1.5">pkt śr.</span>
          </p>
          {week1.dominant && (
            <p className={`text-xs mt-2 font-sans uppercase tracking-[0.12em] ${LEVEL_COLOR[week1.dominant]}`}>
              Przeważa: {getRiskLabel(week1.dominant).toLowerCase()}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              N: {week1.levelCounts.low}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Ś: {week1.levelCounts.medium}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-destructive/30 bg-destructive/5">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              W: {week1.levelCounts.high}
            </span>
            {week1.notesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-background/60">
                Notatki: {week1.notesCount}
              </span>
            )}
          </div>
        </div>

        {/* Tydzień 2 */}
        <div
          className={`rounded-xl border ${
            week2.dominant ? LEVEL_BORDER[week2.dominant] : "border-border"
          } ${week2.dominant ? LEVEL_BG[week2.dominant] : "bg-background/40"} p-4`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans">
                {week2.label} <span className="text-primary">· bieżący</span>
              </p>
              <p className="font-heading text-lg text-foreground mt-0.5">{week2.range}</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-sans">
              {week2.filled}/{week2.totalDays} dni
            </span>
          </div>
          <p className="font-heading text-3xl text-foreground leading-none">
            {week2.avgScore !== null ? `${week2.avgScore}` : "—"}
            <span className="text-sm text-muted-foreground font-sans ml-1.5">pkt śr.</span>
          </p>
          {week2.dominant && (
            <p className={`text-xs mt-2 font-sans uppercase tracking-[0.12em] ${LEVEL_COLOR[week2.dominant]}`}>
              Przeważa: {getRiskLabel(week2.dominant).toLowerCase()}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              N: {week2.levelCounts.low}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Ś: {week2.levelCounts.medium}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-destructive/30 bg-destructive/5">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              W: {week2.levelCounts.high}
            </span>
            {week2.notesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-background/60">
                Notatki: {week2.notesCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delta i komentarz */}
      <div className={`rounded-xl border ${deltaBorder} ${deltaBg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg bg-background/60 border border-border flex items-center justify-center shrink-0 ${deltaColor}`}>
            <DeltaIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            {delta !== null && (
              <p className={`text-xs uppercase tracking-[0.16em] font-sans mb-1 ${deltaColor}`}>
                Zmiana W1 → W2:{" "}
                <strong className="font-semibold">
                  {delta > 0 ? "+" : ""}
                  {delta} pkt
                </strong>{" "}
                ·{" "}
                {direction === "down"
                  ? "poprawa"
                  : direction === "up"
                    ? "regres"
                    : direction === "flat"
                      ? "stabilnie"
                      : "brak porównania"}
              </p>
            )}
            <p className="text-sm text-foreground leading-relaxed">{commentary}</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground italic mt-3 inline-flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        Komentarz powstaje automatycznie z Twoich wpisów — nie zastępuje konsultacji lekarskiej.
      </p>
    </motion.section>
  );
};

export default DiaryWeeklySummary;
