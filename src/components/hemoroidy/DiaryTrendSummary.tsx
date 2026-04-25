import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  CalendarClock,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import type { TrendPoint } from "@/lib/diaryExport";
import type { DiaryEntry } from "@/hooks/useDailyDiary";
import { RiskLevel } from "@/lib/hemoroidyQuizData";

const easeOut = [0.16, 1, 0.3, 1] as const;

const formatLongDate = (key: string): string => {
  if (!key) return "—";
  const [y, m, d] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

/**
 * Automatyczne podsumowanie trendu — werdykt jednym zdaniem + wskazanie
 * najważniejszego dnia zmiany (największy skok/spadek vs średnia poprzedzających).
 *
 * Heurystyka kierunku: nachylenie regresji liniowej (slope) po wypełnionych dniach,
 * indeksowane od 0 (chronologicznie). Próg klasyfikacji ±0.3 pkt/dzień:
 *   slope < -0.3  → spadek (poprawa)
 *   slope >  0.3  → wzrost (pogorszenie)
 *   inaczej       → utrzymanie
 *
 * "Najważniejszy dzień zmiany": dzień, dla którego |score − avg(poprzednich)|
 * jest największe (min. 2 wcześniejsze wypełnione dni do bazy + min. 3 pkt różnicy).
 */

interface DiaryTrendSummaryProps {
  trend: TrendPoint[];
  entries: Record<string, DiaryEntry>;
}

type Direction = "down" | "up" | "flat";

const DiaryTrendSummary = ({ trend, entries }: DiaryTrendSummaryProps) => {
  const summary = useMemo(() => {
    const filled = trend
      .map((d, idx) => ({ ...d, idx }))
      .filter(
        (d): d is TrendPoint & { idx: number; score: number; level: RiskLevel } =>
          d.score !== null,
      );

    if (filled.length < 2) {
      return null;
    }

    // Regresja liniowa (least squares) — slope = pkt/dzień
    const n = filled.length;
    const xs = filled.map((d) => d.idx);
    const ys = filled.map((d) => d.score);
    const meanX = xs.reduce((s, x) => s + x, 0) / n;
    const meanY = ys.reduce((s, y) => s + y, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const slopeRounded = Math.round(slope * 100) / 100;

    let direction: Direction = "flat";
    if (slope < -0.3) direction = "down";
    else if (slope > 0.3) direction = "up";

    // Łączna prognozowana zmiana w 14-dniowym oknie
    const projectedDelta = Math.round(slope * (trend.length - 1) * 10) / 10;

    // "Najważniejszy dzień zmiany" — vs średnia poprzednich wypełnionych
    let pivotDay: (typeof filled)[number] | null = null;
    let pivotDelta = 0; // wartość bezwzględna
    let pivotDeltaSigned = 0; // ze znakiem (− = lepiej, + = gorzej)
    for (let i = 1; i < filled.length; i++) {
      const prev = filled.slice(0, i);
      if (prev.length < 2) continue;
      const avgPrev = prev.reduce((s, d) => s + d.score, 0) / prev.length;
      const diff = filled[i].score - avgPrev;
      const absDiff = Math.abs(diff);
      if (absDiff >= 3 && absDiff > pivotDelta) {
        pivotDelta = absDiff;
        pivotDeltaSigned = Math.round(diff * 10) / 10;
        pivotDay = filled[i];
      }
    }

    return {
      direction,
      slopeRounded,
      projectedDelta,
      filledCount: n,
      pivotDay,
      pivotDeltaSigned,
    };
  }, [trend]);

  if (!summary) {
    return (
      <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
        Podsumowanie trendu pojawi się po wypełnieniu co najmniej 2 dni — to wystarczy, aby
        zobaczyć kierunek zmian.
      </div>
    );
  }

  const { direction, slopeRounded, projectedDelta, filledCount, pivotDay, pivotDeltaSigned } =
    summary;

  const TrendIcon =
    direction === "down" ? TrendingDown : direction === "up" ? TrendingUp : Minus;

  const headlineColor =
    direction === "down"
      ? "text-emerald-400"
      : direction === "up"
        ? "text-destructive"
        : "text-muted-foreground";

  const cardBorder =
    direction === "down"
      ? "border-emerald-500/40"
      : direction === "up"
        ? "border-destructive/40"
        : "border-border";

  const cardBg =
    direction === "down"
      ? "bg-emerald-500/5"
      : direction === "up"
        ? "bg-destructive/5"
        : "bg-background/40";

  const headline =
    direction === "down"
      ? "Trend spadkowy — Twoje ryzyko maleje"
      : direction === "up"
        ? "Trend wzrostowy — uważaj na czynniki ryzyka"
        : "Trend stabilny — utrzymujesz poziom";

  const explanation =
    direction === "down"
      ? `Średnio ${Math.abs(slopeRounded)} pkt mniej każdego dnia. To dobry kierunek — kontynuuj nawyki, które zaczynają działać.`
      : direction === "up"
        ? `Średnio +${slopeRounded} pkt każdego dnia. Sprawdź, co się zmieniło w diecie, aktywności lub stresie — i wróć do podstaw EBM.`
        : `Średnia zmiana to ${slopeRounded > 0 ? "+" : ""}${slopeRounded} pkt/dzień. Wynik jest stabilny — czas na konkretną zmianę nawyku, jeśli chcesz zobaczyć poprawę.`;

  // Pivot card visuals
  const pivotImproved = pivotDeltaSigned < 0;
  const PivotIcon = pivotImproved ? ArrowDownRight : ArrowUpRight;
  const pivotColor = pivotImproved ? "text-emerald-400" : "text-destructive";
  const pivotBorder = pivotImproved ? "border-emerald-500/30" : "border-destructive/30";
  const pivotBg = pivotImproved ? "bg-emerald-500/5" : "bg-destructive/5";
  const pivotEntry = pivotDay ? entries[pivotDay.date] : undefined;
  const pivotNote = pivotEntry?.notes?.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mt-5 grid md:grid-cols-2 gap-3"
      aria-label="Automatyczne podsumowanie trendu"
    >
      {/* Główny werdykt */}
      <div className={`rounded-xl border ${cardBorder} ${cardBg} p-4 sm:p-5`}>
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg bg-background/60 border border-border flex items-center justify-center shrink-0 ${headlineColor}`}
          >
            <TrendIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans mb-0.5 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" /> Automatyczne podsumowanie
            </p>
            <p className={`font-heading text-base sm:text-lg leading-tight ${headlineColor}`}>
              {headline}
            </p>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
              {explanation}
            </p>
            <p className="text-[11px] text-muted-foreground/80 mt-2 font-sans tabular-nums">
              Na podstawie {filledCount}{" "}
              {filledCount === 1 ? "wypełnionego dnia" : filledCount < 5 ? "wypełnionych dni" : "wypełnionych dni"}
              {projectedDelta !== 0 && (
                <>
                  {" "}
                  · prognoza w 14 dni: {projectedDelta > 0 ? "+" : ""}
                  {projectedDelta} pkt
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Najważniejszy dzień zmiany */}
      {pivotDay ? (
        <div className={`rounded-xl border ${pivotBorder} ${pivotBg} p-4 sm:p-5`}>
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg bg-background/60 border border-border flex items-center justify-center shrink-0 ${pivotColor}`}
            >
              <PivotIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans mb-0.5 inline-flex items-center gap-1.5">
                <CalendarClock className="w-3 h-3 text-primary" /> Najważniejszy dzień zmiany
              </p>
              <p className={`font-heading text-base sm:text-lg leading-tight ${pivotColor}`}>
                {formatLongDate(pivotDay.date)}
              </p>
              <p className="text-xs sm:text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                <span className={`font-semibold ${pivotColor} tabular-nums`}>
                  {pivotDeltaSigned > 0 ? "+" : ""}
                  {pivotDeltaSigned} pkt
                </span>{" "}
                {pivotImproved ? "vs średnia poprzednich" : "vs średnia poprzednich"} ·{" "}
                wynik dnia: <span className="tabular-nums">{pivotDay.score} pkt</span>
              </p>
              {pivotNote && (
                <p className="text-[11.5px] text-muted-foreground/90 mt-2 italic line-clamp-2 border-l-2 border-border pl-2">
                  „{pivotNote}"
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background/40 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-background/60 border border-border flex items-center justify-center shrink-0 text-muted-foreground">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-sans mb-0.5">
                Najważniejszy dzień zmiany
              </p>
              <p className="font-heading text-base text-foreground leading-tight">
                Brak wyraźnego punktu zwrotnego
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Twoje wyniki są wyrównane (różnice &lt; 3 pkt względem średniej). To dobry znak
                stabilności — kontynuuj obserwację.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DiaryTrendSummary;
