import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  NotebookPen,
  Trash2,
  Info,
  TrendingUp,
  FileDown,
  FileSpreadsheet,
  TrendingDown,
  Minus,
  Save,
  CheckCircle2,
  CircleDashed,
  Pencil,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDailyDiary, last14DaysKeys, todayKey } from "@/hooks/useDailyDiary";
import { HEMOROIDY_QUESTIONS, RiskLevel } from "@/lib/hemoroidyQuizData";
import { buildDiarySummary, exportDiaryCsv, exportDiaryPdf } from "@/lib/diaryExport";
import DiaryReminderBanner from "@/components/hemoroidy/DiaryReminderBanner";
import DiaryReminderSettings from "@/components/hemoroidy/DiaryReminderSettings";
import DiaryTrendStats from "@/components/hemoroidy/DiaryTrendStats";
import DiaryWeeklySummary from "@/components/hemoroidy/DiaryWeeklySummary";
import { toast } from "@/hooks/use-toast";

const easeOut = [0.16, 1, 0.3, 1] as const;

const formatDayLabel = (key: string): string => {
  const [, m, d] = key.split("-");
  return `${d}.${m}`;
};

const formatLongDate = (key: string): string => {
  const [y, m, d] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

/** "25.04.2026, 14:32" — pełna data i godzina ostatniej aktualizacji */
const formatUpdatedAt = (iso: string | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** "dziś 14:32" / "wczoraj 09:10" / "23.04 18:00" — kompaktowo do tooltipa */
const formatUpdatedAtCompact = (iso: string | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const dayKey = todayKey(d);
  const today = todayKey();
  if (dayKey === today) return `dziś ${time}`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey === todayKey(yesterday)) return `wczoraj ${time}`;
  return `${d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} ${time}`;
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "text-emerald-400",
  medium: "text-primary",
  high: "text-destructive",
};

const RISK_DOT_BG: Record<RiskLevel, string> = {
  low: "bg-emerald-500",
  medium: "bg-primary",
  high: "bg-destructive",
};

const RISK_BORDER: Record<RiskLevel, string> = {
  low: "border-emerald-500/40",
  medium: "border-primary/40",
  high: "border-destructive/40",
};

const RISK_BG: Record<RiskLevel, string> = {
  low: "bg-emerald-500/10",
  medium: "bg-primary/10",
  high: "bg-destructive/10",
};

const RiskIcon = ({ level }: { level: RiskLevel | null }) => {
  if (level === "low") return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
  if (level === "medium") return <AlertTriangle className="w-4 h-4 text-primary" />;
  if (level === "high") return <AlertOctagon className="w-4 h-4 text-destructive" />;
  return <Info className="w-4 h-4 text-muted-foreground" />;
};

interface DiaryFullModuleProps {
  /** Wariant banera przypomnień */
  reminderVariant?: "diary-page" | "quiz-page";
  /** Pokazać sekcję ustawień przypomnień + clear all (domyślnie true na stronie dziennika) */
  showReminderSettings?: boolean;
  /** Pokazać sekcję eksportu PDF/CSV (domyślnie true) */
  showExport?: boolean;
}

const DiaryFullModule = ({
  reminderVariant = "diary-page",
  showReminderSettings = true,
  showExport = true,
}: DiaryFullModuleProps) => {
  const { entries, getEntry, setAnswer, setNotes, removeEntry, clearAll, last14Trend, maxScore } =
    useDailyDiary();

  const days = useMemo(() => last14DaysKeys(), []);
  const [activeDate, setActiveDate] = useState<string>(todayKey());
  const entry = getEntry(activeDate);
  const trend = last14Trend();

  const completed = entry.answers.filter((a) => a !== null).length;
  const total = HEMOROIDY_QUESTIONS.length;
  const progressPct = Math.round((completed / total) * 100);

  const chartData = trend.map((d) => ({
    day: formatDayLabel(d.date),
    score: d.score,
    level: d.level,
  }));

  const completedDaysCount = trend.filter((d) => d.score !== null).length;
  // Dni "zaczęte ale niedokończone" — wpis w localStorage istnieje (notatka lub ≥1 odpowiedź),
  // ale nie wszystkie 9 pytań ma odpowiedź. Liczymy dla 14-dniowego okna trendu.
  const partialDaysCount = useMemo(() => {
    return trend.reduce((acc, d) => {
      if (d.score !== null) return acc; // complete — już policzony osobno
      const e = entries[d.date];
      if (!e) return acc;
      const hasAnyAnswer = e.answers.some((a) => a !== null);
      if (hasAnyAnswer || e.notes) return acc + 1;
      return acc;
    }, 0);
  }, [trend, entries]);
  const totalProgressDays = completedDaysCount + partialDaysCount;
  const completedPct = Math.round((completedDaysCount / 14) * 100);
  const summary = useMemo(() => buildDiarySummary(trend, entries), [trend, entries]);
  const hasAnyData = completedDaysCount > 0;

  const handleSaveDay = () => {
    if (completed === 0 && !entry.notes) {
      toast({
        title: "Brak danych do zapisania",
        description: "Odpowiedz na przynajmniej jedno pytanie lub dodaj notatkę.",
      });
      return;
    }
    // Auto-zapis już zadziałał (każda zmiana setAnswer/setNotes pisze do localStorage).
    // Ten przycisk daje pacjentowi pewność i jasne potwierdzenie.
    toast({
      title: entry.complete ? "Zapisano dzień ✓" : "Zapisano postęp",
      description: entry.complete
        ? `Dziennik zaktualizowany — ${entry.score}/${maxScore} pkt${entry.label ? ` (${entry.label.toLowerCase()})` : ""}.`
        : `Wypełniono ${completed}/${total} pytań. Wróć później, aby uzupełnić resztę.`,
    });
  };

  const handleExportCsv = () => {
    if (!hasAnyData) {
      toast({
        title: "Brak danych do eksportu",
        description: "Wypełnij przynajmniej jeden dzień, aby wyeksportować dziennik.",
      });
      return;
    }
    exportDiaryCsv(trend, entries, summary);
    toast({
      title: "Eksport CSV gotowy",
      description: "Plik został zapisany w folderze pobranych.",
    });
  };

  const handleExportPdf = () => {
    if (!hasAnyData) {
      toast({
        title: "Brak danych do eksportu",
        description: "Wypełnij przynajmniej jeden dzień, aby wyeksportować dziennik.",
      });
      return;
    }
    exportDiaryPdf(trend, entries, summary, maxScore);
    toast({
      title: "Eksport PDF gotowy",
      description: "Plik został zapisany w folderze pobranych.",
    });
  };

  const goPrev = () => {
    const i = days.indexOf(activeDate);
    if (i > 0) setActiveDate(days[i - 1]);
  };
  const goNext = () => {
    const i = days.indexOf(activeDate);
    if (i >= 0 && i < days.length - 1) setActiveDate(days[i + 1]);
  };

  return (
    <div>
      {/* Reminder banner — pokazuje przypomnienie o quizie jeśli zaległe */}
      <div className="mb-6">
        <DiaryReminderBanner variant={reminderVariant} />
      </div>

      {/* Trend chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="glass-card rounded-2xl p-5 sm:p-6 md:p-8 mb-8"
      >
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h3 className="font-heading text-xl md:text-2xl text-foreground mb-1 inline-flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trend ryzyka — 14 dni
            </h3>
            <p className="text-sm text-muted-foreground">
              {completedDaysCount === 0
                ? "Zacznij wpis na dziś, aby zobaczyć trend."
                : `Wypełniono ${completedDaysCount}/14 dni. Im niżej linia, tym lepsze nawyki.`}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Niskie ≤8
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" /> Średnie 9–17
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-destructive" /> Wysokie 18+
            </span>
          </div>
        </div>

        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                domain={[0, maxScore]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number | null) =>
                  value === null ? ["—", "Brak wpisu"] : [`${value} pkt`, "Wynik"]
                }
              />
              <ReferenceLine y={8.5} stroke="hsl(var(--primary))" strokeDasharray="3 3" opacity={0.4} />
              <ReferenceLine
                y={17.5}
                stroke="hsl(var(--destructive))"
                strokeDasharray="3 3"
                opacity={0.4}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Wzbogacone statystyki trendu */}
        <DiaryTrendStats trend={trend} entries={entries} />
      </motion.div>

      {/* Auto-podsumowanie tygodniowe (Tydzień 1 vs Tydzień 2) */}
      <DiaryWeeklySummary trend={trend} entries={entries} />

      {/* Day picker — 14-day strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 className="font-heading text-lg text-foreground">Wybierz dzień</h3>
            <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
              <Pencil className="w-3 h-3 text-primary" />
              Możesz edytować dowolny z 14 dni — kliknij datę, aby otworzyć i poprawić wpis.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Poprzedni dzień">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goNext} aria-label="Następny dzień">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {days.map((d) => {
            const stored = entries[d];
            const e = getEntry(d);
            const active = d === activeDate;
            const dot = e.complete && e.level ? RISK_DOT_BG[e.level] : "bg-muted";
            const updatedTip = stored?.updatedAt
              ? `Ostatnia aktualizacja: ${formatUpdatedAt(stored.updatedAt)}`
              : "Brak wpisu — kliknij, aby dodać";
            return (
              <button
                key={d}
                type="button"
                onClick={() => setActiveDate(d)}
                title={updatedTip}
                className={`shrink-0 snap-start w-14 sm:w-16 rounded-xl border px-2 py-2.5 transition-all text-center ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background/40 hover:border-primary/40"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-sans">
                  {formatDayLabel(d)}
                </p>
                <p
                  className={`font-heading text-base mt-0.5 ${
                    active ? "text-primary" : "text-foreground"
                  }`}
                >
                  {d === todayKey() ? "dziś" : ""}
                </p>
                <span
                  className={`inline-block mt-1 w-2 h-2 rounded-full ${dot}`}
                  aria-hidden="true"
                />
                {stored?.updatedAt && (
                  <span className="block mt-1 text-[9px] text-muted-foreground/80 font-sans leading-none">
                    {formatUpdatedAtCompact(stored.updatedAt).replace(/^(dziś|wczoraj)\s/, "")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Active day editor */}
      <motion.div
        key={activeDate}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
        className="glass-card rounded-2xl p-5 sm:p-6 md:p-8 mb-8"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-sans mb-1">
              Wpis na dzień
            </p>
            <h3 className="font-heading text-xl md:text-2xl text-foreground capitalize">
              {formatLongDate(activeDate)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {completed}/{total} pytań • {entry.score} pkt {entry.complete && entry.label && (
                <span className={`font-sans uppercase tracking-[0.1em] ${RISK_COLORS[entry.level!]}`}>
                  · {entry.label}
                </span>
              )}
            </p>
            {entries[activeDate]?.updatedAt && (
              <p className="text-[11px] text-muted-foreground/90 mt-1.5 inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-primary" />
                Ostatnia aktualizacja:{" "}
                <span className="text-foreground/80 font-sans">
                  {formatUpdatedAt(entries[activeDate].updatedAt)}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <RiskIcon level={entry.complete ? entry.level : null} />
            {(entry.answers.some((a) => a !== null) || entry.notes) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(activeDate)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Wyczyść dzień
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: easeOut }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-5">
          {HEMOROIDY_QUESTIONS.map((q, qi) => (
            <fieldset key={q.id} className="rounded-xl border border-border bg-background/40 p-4">
              <legend className="px-2 -ml-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-sans">
                Pyt. {qi + 1}/{total}
              </legend>
              <p className="font-heading text-base text-foreground mb-3 leading-snug">{q.q}</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {q.options.map((opt, oi) => {
                  const selected = entry.answers[qi] === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setAnswer(activeDate, qi, selected ? null : oi)}
                      className={`text-left rounded-lg border px-3 py-2.5 transition-all text-sm leading-snug ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background/40 text-foreground/80 hover:border-primary/40"
                      }`}
                      aria-pressed={selected}
                    >
                      <span className="block">{opt.label}</span>
                      <span className="block text-[11px] text-muted-foreground mt-1">
                        {opt.points} pkt
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {/* Notes */}
        <div className="mt-6">
          <label
            htmlFor={`diary-notes-${activeDate}`}
            className="font-heading text-base text-foreground mb-2 inline-flex items-center gap-2"
          >
            <NotebookPen className="w-4 h-4 text-primary" />
            Notatki dnia (opcjonalnie)
          </label>
          <Textarea
            id={`diary-notes-${activeDate}`}
            value={entry.notes}
            onChange={(e) => setNotes(activeDate, e.target.value)}
            placeholder="Co dziś jadłeś/aś, samopoczucie, leki, objawy, sytuacje stresowe… (max 1000 znaków)"
            maxLength={1000}
            rows={4}
            className="resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5 text-right">
            {entry.notes.length}/1000
          </p>
        </div>

        {/* Save day button */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            type="button"
            variant="hero"
            size="lg"
            onClick={handleSaveDay}
            className="gap-2"
          >
            {entry.complete ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Zapisz dzień
          </Button>
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            Każda zmiana zapisuje się automatycznie. Przycisk daje Ci pewność potwierdzenia.
          </p>
        </div>

        {/* Result summary */}
        {entry.complete && entry.level && (
          <div
            className={`mt-6 rounded-xl border ${RISK_BORDER[entry.level]} ${RISK_BG[entry.level]} p-4`}
          >
            <div className="flex items-start gap-3">
              <RiskIcon level={entry.level} />
              <div className="flex-1">
                <p className={`font-heading text-base ${RISK_COLORS[entry.level]}`}>
                  {entry.label} — {entry.score}/{maxScore} pkt
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Wynik dnia został zapisany w trendzie. Wracaj jutro o tej samej porze, aby
                  utrzymać rytm.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Export module — PDF + CSV with quick trend summary */}
      {showExport && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background/40 to-background/40 p-5 sm:p-6 md:p-8 mb-8"
          aria-label="Eksport dziennika"
        >
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <FileDown className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.18em] text-primary mb-1">
                Eksport · PDF lub CSV
              </p>
              <h3 className="font-heading text-xl md:text-2xl text-foreground leading-tight">
                Pobierz dziennik z podsumowaniem trendu
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Zabierz dziennik na konsultację lub zachowaj kopię. PDF — gotowy do druku z mini-wykresem
                i tabelą wpisów. CSV — otwórz w Excelu, by samemu analizować dane.
              </p>
            </div>
          </div>

          {/* Mini trend summary chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border border-border bg-background/60 text-foreground">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              Wypełnione: <strong className="font-semibold">{summary.filledDays}/{summary.totalDays}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border border-border bg-background/60 text-foreground">
              Średnia:{" "}
              <strong className="font-semibold">
                {summary.averageScore !== null ? `${summary.averageScore} pkt` : "—"}
              </strong>
            </span>
            {summary.delta !== null && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border ${
                  summary.trendDirection === "down"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : summary.trendDirection === "up"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                {summary.trendDirection === "down" ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : summary.trendDirection === "up" ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                Zmiana: {summary.delta > 0 ? "+" : ""}
                {summary.delta} pkt
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              Niskie: {summary.levelCounts.low}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border border-primary/30 bg-primary/10 text-primary">
              Średnie: {summary.levelCounts.medium}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border border-destructive/30 bg-destructive/10 text-destructive">
              Wysokie: {summary.levelCounts.high}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              variant="hero"
              onClick={handleExportPdf}
              disabled={!hasAnyData}
              className="gap-2 h-auto min-h-11 py-2.5 px-5 whitespace-normal"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              Pobierz PDF (z wykresem trendu)
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleExportCsv}
              disabled={!hasAnyData}
              className="gap-2 h-auto min-h-11 py-2.5 px-5 whitespace-normal border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              Pobierz CSV (Excel)
            </Button>
          </div>

          {!hasAnyData && (
            <p className="text-xs text-muted-foreground italic mt-4">
              Wypełnij przynajmniej jeden dzień, by aktywować eksport.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground italic mt-3">
            Eksport powstaje lokalnie w przeglądarce — żadne dane nie są wysyłane na serwer.
          </p>
        </motion.section>
      )}

      {/* Reminder settings + clear all */}
      {showReminderSettings && (
        <>
          <DiaryReminderSettings />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border bg-background/40 p-4 sm:p-5 mb-4"
          >
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-primary" />
              Wszystkie wpisy są zapisywane lokalnie w pamięci Twojej przeglądarki
              (<code>localStorage</code>). Wyczyszczenie danych przeglądarki usunie też dziennik.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Wyczyść cały dziennik
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć wszystkie wpisy?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tej operacji nie można cofnąć. Wszystkie 14 dni wpisów i notatek zostaną trwale
                    usunięte z tej przeglądarki.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearAll()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Usuń wszystko
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default DiaryFullModule;
