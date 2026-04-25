import { useEffect, useMemo, useRef, useState } from "react";
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
  FileJson,
  FileSpreadsheet,
  TrendingDown,
  Minus,
  Save,
  CheckCircle2,
  CircleDashed,
  Pencil,
  Clock,
  AlertCircle,
  ArrowDownToLine,
  Upload,
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
import {
  buildDiarySummary,
  exportDiaryCsv,
  exportDiaryPdf,
  exportSingleDayJson,
  exportSingleDayPdf,
  parseImportedDayJson,
  type ImportedDayPayload,
} from "@/lib/diaryExport";
import DiaryReminderBanner from "@/components/hemoroidy/DiaryReminderBanner";
import DiaryReminderSettings from "@/components/hemoroidy/DiaryReminderSettings";
import RiskThresholdsSettings from "@/components/hemoroidy/RiskThresholdsSettings";
import DiaryTrendStats from "@/components/hemoroidy/DiaryTrendStats";
import DiaryTrendSummary from "@/components/hemoroidy/DiaryTrendSummary";
import DiaryWeeklySummary from "@/components/hemoroidy/DiaryWeeklySummary";
import AutoSaveSettings from "@/components/hemoroidy/AutoSaveSettings";
import { useAutoSave } from "@/hooks/useAutoSave";
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
  const {
    entries,
    getEntry,
    setAnswer: persistSetAnswer,
    setNotes: persistSetNotes,
    removeEntry,
    clearAll,
    last14Trend,
    maxScore,
    thresholds,
  } = useDailyDiary();

  const { enabled: autoSaveEnabled } = useAutoSave();

  const days = useMemo(() => last14DaysKeys(), []);
  const [activeDate, setActiveDate] = useState<string>(todayKey());

  /**
   * Draft overlay — używany TYLKO gdy auto-zapis jest WYŁĄCZONY.
   * Mapa dnia → częściowy `DiaryEntry` z lokalnymi zmianami pacjenta, które jeszcze
   * NIE trafiły do storage. Po włączeniu auto-zapisu lub po kliknięciu „Zapisz dzień"
   * cały draft jest flushowany do storage przez `flushDraft()`.
   *
   * Trzymamy też `Set<number>` indeksów pytań, gdzie pacjent celowo cofnął odpowiedź
   * (żeby odróżnić „pole puste w drafcie = brak edycji" od „pole celowo wyczyszczone").
   */
  const [draftAnswers, setDraftAnswers] = useState<Record<string, Record<number, number | null>>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  // Merguje storage'owy entry z draftem (jeśli istnieje) — tak by UI od razu pokazywało zmiany.
  const baseEntry = getEntry(activeDate);
  const entry = useMemo(() => {
    const da = draftAnswers[activeDate];
    const dn = draftNotes[activeDate];
    if (!da && dn === undefined) return baseEntry;
    const mergedAnswers = baseEntry.answers.map((a, i) =>
      da && i in da ? da[i] : a,
    );
    return {
      ...baseEntry,
      answers: mergedAnswers,
      notes: dn !== undefined ? dn : baseEntry.notes,
    };
  }, [baseEntry, draftAnswers, draftNotes, activeDate]);

  const trend = last14Trend();

  /**
   * Wrappery setAnswer/setNotes z respektem dla przełącznika auto-zapisu.
   *
   * - **Auto-zapis ON (domyślnie)**: zachowanie identyczne jak wcześniej —
   *   bezpośredni zapis do localStorage przez `useDailyDiary`.
   * - **Auto-zapis OFF**: zmiana trafia tylko do `draftAnswers`/`draftNotes`
   *   (lokalny stan komponentu). UI od razu pokazuje zmianę przez merge w `entry`,
   *   ale storage NIE jest dotykany aż do flushu.
   *
   * `setAnswer` zwraca `StorageWriteResult` — dla draftu zawsze `{ ok: true }`
   * (brak operacji na storage = brak ryzyka błędu).
   */
  const setAnswer = useCallback(
    (date: string, qi: number, oi: number | null) => {
      if (autoSaveEnabled) return persistSetAnswer(date, qi, oi);
      setDraftAnswers((prev) => {
        const dayMap = { ...(prev[date] ?? {}), [qi]: oi };
        return { ...prev, [date]: dayMap };
      });
      return { ok: true } as const;
    },
    [autoSaveEnabled, persistSetAnswer],
  );

  const setNotes = useCallback(
    (date: string, value: string) => {
      if (autoSaveEnabled) {
        persistSetNotes(date, value);
        return;
      }
      setDraftNotes((prev) => ({ ...prev, [date]: value.slice(0, 1000) }));
    },
    [autoSaveEnabled, persistSetNotes],
  );

  /**
   * Flush draftu do storage'u. Wywoływany z „Zapisz dzień" (gdy auto-zapis OFF)
   * oraz w `useEffect` po włączeniu auto-zapisu (przeniesienie wszystkich pending zmian).
   * Czyści draft po pomyślnym zapisie.
   */
  const flushDraft = useCallback(
    (dateFilter?: string) => {
      const datesToFlush = dateFilter
        ? [dateFilter]
        : Array.from(new Set([...Object.keys(draftAnswers), ...Object.keys(draftNotes)]));
      let firstError: string | null = null;
      datesToFlush.forEach((d) => {
        const da = draftAnswers[d];
        if (da) {
          for (const [qi, oi] of Object.entries(da)) {
            const r = persistSetAnswer(d, Number(qi), oi);
            if (r.ok === false && !firstError) firstError = r.message;
          }
        }
        const dn = draftNotes[d];
        if (dn !== undefined) persistSetNotes(d, dn);
      });
      if (firstError) {
        toast({
          variant: "destructive",
          title: "Nie udało się zapisać wszystkich zmian",
          description: firstError,
          duration: 6000,
        });
        return false;
      }
      // Sukces — czyść draft TYLKO dla flushed dni.
      setDraftAnswers((prev) => {
        const next = { ...prev };
        datesToFlush.forEach((d) => delete next[d]);
        return next;
      });
      setDraftNotes((prev) => {
        const next = { ...prev };
        datesToFlush.forEach((d) => delete next[d]);
        return next;
      });
      return true;
    },
    [draftAnswers, draftNotes, persistSetAnswer, persistSetNotes],
  );

  // Auto-flush po włączeniu auto-zapisu — żadne pending zmiany nie giną.
  useEffect(() => {
    if (!autoSaveEnabled) return;
    const hasDraft =
      Object.keys(draftAnswers).length > 0 || Object.keys(draftNotes).length > 0;
    if (hasDraft) flushDraft();
    // celowo bez `flushDraft` w deps — zapobiega pętli (flushDraft zmienia draft state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveEnabled]);

  // Liczba niezapisanych zmian (do wskaźnika w panelu i w banerze ostrzeżenia).
  const pendingDraftCount = useMemo(() => {
    let n = 0;
    for (const day of Object.values(draftAnswers)) n += Object.keys(day).length;
    n += Object.keys(draftNotes).length;
    return n;
  }, [draftAnswers, draftNotes]);

  const activeDayHasDraft =
    !!draftAnswers[activeDate] || draftNotes[activeDate] !== undefined;

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

  // Lista numerów (1-based) pytań bez odpowiedzi — używana w walidacji i w hincie pod CTA.
  const missingQuestionNumbers = useMemo(
    () =>
      entry.answers
        .map((a, i) => (a === null ? i + 1 : null))
        .filter((n): n is number => n !== null),
    [entry.answers],
  );

  /**
   * Komunikat aria-live ogłaszany po wybraniu odpowiedzi quizu — daje natychmiastowe
   * potwierdzenie wzrostu postępu (czytniki ekranu + użytkownicy widzący toast obok).
   * Resetowany do pustego stringa przy zmianie aktywnego dnia, by uniknąć echa.
   */
  const [answerAnnouncement, setAnswerAnnouncement] = useState<string>("");
  useEffect(() => {
    setAnswerAnnouncement("");
  }, [activeDate]);

  /**
   * „Mignięcie" badge'a Zapisano przy pytaniu po każdym kliknięciu odpowiedzi.
   * Trzymamy timestamp ostatniego zapisu per pytanie (qi → ms), bo dzięki temu
   * można równocześnie animować kilka pytań i resetować animację przy ponownym
   * kliknięciu (key={timestamp}).
   */
  const [savedFlash, setSavedFlash] = useState<Record<number, number>>({});
  const flashTimeoutRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    // Reset wszystkich flash przy zmianie aktywnego dnia (inny zestaw pytań).
    Object.values(flashTimeoutRef.current).forEach((t) => clearTimeout(t));
    flashTimeoutRef.current = {};
    setSavedFlash({});
  }, [activeDate]);
  useEffect(() => {
    // Cleanup przy unmount, by nie wywołać setState po unmount.
    return () => {
      Object.values(flashTimeoutRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  /**
   * Czyści wszystkie odpowiedzi quizu w aktywnym dniu (notatki zostają nietknięte).
   * Każda odpowiedź jest zerowana przez setAnswer(..., null), co od razu nadpisuje
   * localStorage przez hook useDailyDiary i emituje event "cml:diary-updated".
   */
  const clearAnswers = () => {
    const hadAnswers = entry.answers.some((a) => a !== null);
    if (!hadAnswers) return;
    entry.answers.forEach((a, qi) => {
      if (a !== null) setAnswer(activeDate, qi, null);
    });
    setAnswerAnnouncement(`Wyczyszczono wszystkie odpowiedzi quizu (${total} pytań).`);
    toast({
      title: "Odpowiedzi wyczyszczone",
      description: `Pola ${total} pytań zostały zresetowane. Notatki dnia pozostały bez zmian.`,
      duration: 2200,
    });
  };

  /**
   * Wrapper na `setAnswer` z mikro-feedbackiem: pokazuje toast „Pytanie X/9 zapisane"
   * tylko gdy użytkownik **zaznacza** odpowiedź (nie przy odznaczaniu/zmianie zdania).
   * Liczbę „uzupełnionych po akcji" obliczamy lokalnie, bo `entry.answers` jeszcze nie
   * odzwierciedla nowego stanu w tym tickne.
   */
  const handleAnswerSelect = (qi: number, oi: number) => {
    const wasAnswered = entry.answers[qi] !== null;
    const willBeAnswered = !wasAnswered; // toggle: jeśli było null → będzie wybrane
    const result = setAnswer(activeDate, qi, wasAnswered ? null : oi);

    // Niepowodzenie zapisu (quota / tryb prywatny / inny błąd) — pokaż błąd
    // z konkretną instrukcją i NIE pokazuj badge'a "Zapisano" (mylące).
    if (result.ok === false) {
      const errMessage = result.message;
      setAnswerAnnouncement(`Błąd zapisu pytania ${qi + 1}: ${errMessage}`);
      toast({
        variant: "destructive",
        title: "Nie udało się zapisać odpowiedzi",
        description: errMessage,
        duration: 6000,
      });
      return;
    }

    // Sukces: mignij badge'em "Zapisano" przy klikniętym pytaniu (1.5 s).
    const stamp = Date.now();
    setSavedFlash((prev) => ({ ...prev, [qi]: stamp }));
    if (flashTimeoutRef.current[qi]) clearTimeout(flashTimeoutRef.current[qi]);
    flashTimeoutRef.current[qi] = setTimeout(() => {
      setSavedFlash((prev) => {
        // Tylko skasuj jeśli wciąż ten sam timestamp (kolejny klik mógł go nadpisać).
        if (prev[qi] !== stamp) return prev;
        const next = { ...prev };
        delete next[qi];
        return next;
      });
    }, 1500);

    if (willBeAnswered) {
      const newCompleted = completed + 1;
      const isLast = newCompleted === total;
      const message = isLast
        ? `Pytanie ${qi + 1} zapisane · komplet ${total}/${total} 🎉`
        : `Pytanie ${qi + 1} zapisane · postęp ${newCompleted}/${total}`;
      setAnswerAnnouncement(message);
      toast({
        title: isLast ? "Wszystkie pytania uzupełnione" : `Pytanie ${qi + 1}/${total} zapisane`,
        description: isLast
          ? `Możesz teraz kliknąć „Zapisz dzień", aby zamknąć wpis.`
          : `Postęp dnia: ${newCompleted}/${total} (${Math.round((newCompleted / total) * 100)}%).`,
        duration: 1800,
      });
    }
  };

  /**
   * Auto-zapis edytora dnia (heartbeat 30 s).
   *
   * Kontekst: `setAnswer` / `setNotes` w `useDailyDiary` już piszą do localStorage natychmiast
   * (per kliknięcie/keystroke), więc dane są stale bezpieczne. Tutaj utrzymujemy
   * **user-facing checkpoint** — co 30 s aktualizujemy `lastAutosaveAt` *tylko jeśli*
   * `entry.updatedAt` zmienił się od ostatniego heartbeatu (czyli pacjent COŚ edytował).
   * Dzięki temu pod CTA „Zapisz dzień" pokazujemy autentyczne „Auto-zapis: X temu"
   * zamiast pseudo-licznika tykającego bez powodu.
   *
   * `pendingChanges` = od ostatniego heartbeatu są nowe edycje (UI: „Niezapisane zmiany…").
   */
  const [lastAutosaveAt, setLastAutosaveAt] = useState<string | null>(
    () => (typeof entry.updatedAt === "string" ? entry.updatedAt : null),
  );
  const lastSeenUpdatedAtRef = useRef<string | null>(entry.updatedAt ?? null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [showOnlyMissing, setShowOnlyMissing] = useState<boolean>(false);

  // Reset checkpointa przy zmianie aktywnego dnia (przełączenie w stripie).
  useEffect(() => {
    lastSeenUpdatedAtRef.current = entry.updatedAt ?? null;
    setLastAutosaveAt(entry.updatedAt ?? null);
    // celowo bez `entry.updatedAt` — chcemy reagować TYLKO na zmianę dnia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate]);

  // Heartbeat 30 s: jeśli `updatedAt` zmienił się od poprzedniego sprawdzenia → checkpoint.
  // Drugi setInterval (1 s) odświeża relatywny licznik „X temu" pod CTA.
  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      const current = entry.updatedAt ?? null;
      if (current && current !== lastSeenUpdatedAtRef.current) {
        lastSeenUpdatedAtRef.current = current;
        setLastAutosaveAt(current);
      }
    }, 30_000);
    const ticker = window.setInterval(() => setNowTick(Date.now()), 1_000);
    return () => {
      window.clearInterval(heartbeat);
      window.clearInterval(ticker);
    };
  }, [entry.updatedAt]);

  const pendingChanges =
    !!entry.updatedAt &&
    entry.updatedAt !== lastAutosaveAt;

  /** Relatywny licznik „X temu" względem `lastAutosaveAt`. nowTick zapewnia odświeżanie co 1 s. */
  const lastAutosaveRelative = useMemo(() => {
    if (!lastAutosaveAt) return null;
    const diffMs = nowTick - new Date(lastAutosaveAt).getTime();
    if (Number.isNaN(diffMs) || diffMs < 0) return null;
    const sec = Math.floor(diffMs / 1000);
    if (sec < 5) return "przed chwilą";
    if (sec < 60) return `${sec} s temu`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min temu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} godz. temu`;
    return formatUpdatedAt(lastAutosaveAt);
  }, [lastAutosaveAt, nowTick]);

  const handleSaveDay = () => {
    // Walidacja: wymaga kompletu 9/9 odpowiedzi przed potwierdzeniem dnia.
    // Auto-zapis postępu działa cały czas (setAnswer/setNotes), ale „Zapisz dzień"
    // to świadome zatwierdzenie kompletnego wpisu — ma znaczenie dla trendu.
    if (!entry.complete) {
      const missingCount = total - completed;
      const preview = missingQuestionNumbers.slice(0, 5).join(", ");
      const more = missingQuestionNumbers.length > 5 ? "…" : "";
      toast({
        variant: "destructive",
        title: `Uzupełnij wszystkie ${total} pytania quizu`,
        description:
          missingCount === total
            ? `Aby zapisać dzień, odpowiedz na wszystkie ${total} pytania.`
            : `Brakuje ${missingCount} ${missingCount === 1 ? "odpowiedzi" : "odpowiedzi"} (pytanie ${preview}${more}). Komplet ${total}/${total} jest wymagany do zatwierdzenia dnia.`,
      });
      return;
    }
    // Manualne potwierdzenie też domyka heartbeat → checkpoint = teraz.
    if (entry.updatedAt) {
      lastSeenUpdatedAtRef.current = entry.updatedAt;
      setLastAutosaveAt(entry.updatedAt);
    }
    toast({
      title: "Zapisano dzień ✓",
      description: `Dziennik zaktualizowany — ${entry.score}/${maxScore} pkt${entry.label ? ` (${entry.label.toLowerCase()})` : ""}.`,
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

  /**
   * Eksport pojedynczego dnia (aktywnego). Dwa formaty:
   *  • JSON — surowe dane do archiwizacji / importu w przyszłości
   *  • PDF — wersja do druku / zabrania na konsultację
   * Aktywne tylko gdy dzień ma ≥1 odpowiedź lub notatkę (inaczej eksport pustki).
   */
  const dayHasContent = entry.answers.some((a) => a !== null) || !!entry.notes?.trim();

  const handleExportDayJson = () => {
    if (!dayHasContent) return;
    try {
      exportSingleDayJson(entry);
      toast({
        title: "Eksport JSON gotowy",
        description: `Wpis z dnia ${formatLongDate(activeDate)} został pobrany.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Nie udało się wyeksportować pliku",
        description: "Spróbuj ponownie lub odśwież stronę.",
      });
    }
  };

  const handleExportDayPdf = () => {
    if (!dayHasContent) return;
    try {
      exportSingleDayPdf(entry);
      toast({
        title: "Eksport PDF gotowy",
        description: `Wpis z dnia ${formatLongDate(activeDate)} został pobrany.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Nie udało się wygenerować PDF",
        description: "Spróbuj ponownie lub odśwież stronę.",
      });
    }
  };

  /**
   * Import wpisu z pliku JSON (eksport pojedynczego dnia, schema `cml.hemoroidy.diary.day.v1`).
   * Plik jest parsowany w przeglądarce — dane nie są nigdzie wysyłane.
   *
   * Flow:
   *  1. Klik „Importuj" → hidden `<input type="file">` otwiera picker
   *  2. Po wyborze pliku: walidacja przez `parseImportedDayJson`
   *  3. Jeśli plik ma datę różną od `activeDate` LUB wpis na docelowy dzień już istnieje
   *     z jakąkolwiek treścią → pokaż AlertDialog z potwierdzeniem
   *  4. Po potwierdzeniu: nadpisz odpowiedzi (per pytanie) + notatki, przełącz na dzień z pliku
   */
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<ImportedDayPayload | null>(null);

  const applyImport = (payload: ImportedDayPayload) => {
    // Najpierw notatki (jeśli są), potem każda odpowiedź — wszystko trafia do localStorage
    // przez te same wrappery co normalna edycja, więc trend/wykres aktualizują się natychmiast.
    if (payload.notes) {
      setNotes(payload.date, payload.notes);
    }
    let firstError: string | null = null;
    payload.answers.forEach((a, qi) => {
      const result = setAnswer(payload.date, qi, a);
      if (result.ok === false && !firstError) firstError = result.message;
    });
    if (firstError) {
      toast({
        variant: "destructive",
        title: "Import nie powiódł się w pełni",
        description: firstError,
        duration: 6000,
      });
      return;
    }
    if (payload.date !== activeDate) {
      // Przełącz strip na dzień z pliku, by pacjent od razu zobaczył efekt importu.
      setActiveDate(payload.date);
    }
    const filledCount = payload.answers.filter((a) => a !== null).length;
    toast({
      title: "Wpis zaimportowany ✓",
      description: `Dzień ${formatLongDate(payload.date)} — ${filledCount}/${HEMOROIDY_QUESTIONS.length} odpowiedzi${payload.notes ? " + notatki" : ""}.`,
    });
    setAnswerAnnouncement(`Zaimportowano wpis z dnia ${formatLongDate(payload.date)}.`);
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Nie udało się odczytać pliku",
        description: "Spróbuj ponownie lub wybierz inny plik JSON.",
      });
    };
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = parseImportedDayJson(text);
      if (result.ok === false) {
        toast({
          variant: "destructive",
          title: "Nieprawidłowy plik",
          description: result.message,
          duration: 6000,
        });
        return;
      }
      // Czy nadpisujemy istniejący wpis lub zmieniamy aktywny dzień?
      const targetExisting = entries[result.payload.date];
      const targetHasContent =
        !!targetExisting &&
        (targetExisting.answers.some((a) => a !== null) || !!targetExisting.notes?.trim());
      if (targetHasContent || result.payload.date !== activeDate) {
        setPendingImport(result.payload);
      } else {
        applyImport(result.payload);
      }
    };
    reader.readAsText(file);
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

      {/* Wskaźnik postępu — ile z 14 dni ukończono + status quizu na aktywnym dniu.
          „Ukończony dzień" = wszystkie 9 pytań quizu mają odpowiedź (entry.complete).
          „Częściowy" = ≥1 odpowiedź lub notatka, ale brak kompletu. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="glass-card rounded-2xl p-4 sm:p-5 mb-6"
        aria-label="Postęp wypełniania dziennika"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden="true" />
            <h3 className="font-sans text-sm sm:text-base font-medium text-foreground">
              Postęp 14-dniowy
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] sm:text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" aria-hidden="true" />
              Ukończone: <strong className="font-semibold text-foreground tabular-nums">{completedDaysCount}/14</strong>
            </span>
            {partialDaysCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <CircleDashed className="w-3 h-3 text-primary" aria-hidden="true" />
                Częściowe: <strong className="font-semibold text-foreground tabular-nums">{partialDaysCount}</strong>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-3 h-3" aria-hidden="true" />
              Pozostało: <strong className="font-semibold text-foreground tabular-nums">{14 - totalProgressDays}</strong>
            </span>
          </div>
        </div>
        <Progress
          value={completedPct}
          className="h-2"
          aria-label={`Ukończono ${completedDaysCount} z 14 dni (${completedPct}%)`}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] sm:text-xs">
          <span className="text-muted-foreground">
            {completedDaysCount === 0
              ? "Zacznij od dzisiaj — odpowiedz na wszystkie 9 pytań, aby zaliczyć dzień."
              : completedDaysCount === 14
                ? "Komplet 14 dni! Świetnie — masz pełny obraz trendu."
                : `${completedPct}% drogi za Tobą. Dni „częściowe" trzeba dokończyć, aby weszły do trendu.`}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border tabular-nums font-sans ${
              entry.complete
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600"
                : completed > 0
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted/40 border-border text-muted-foreground"
            }`}
            aria-live="polite"
            title={entry.complete ? "Wszystkie 9 pytań quizu zapisane" : `Brakuje ${total - completed} odpowiedzi`}
          >
            {entry.complete ? (
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            ) : (
              <CircleDashed className="w-3 h-3" aria-hidden="true" />
            )}
            Aktywny dzień: {completed}/{total} pól quizu
          </span>
        </div>
      </motion.div>

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
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Niskie ≤{thresholds.lowMax}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" /> Średnie {thresholds.lowMax + 1}–{thresholds.mediumMax}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-destructive" /> Wysokie {thresholds.mediumMax + 1}+
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

        {/* Auto-werdykt: kierunek trendu + najważniejszy dzień zmiany */}
        <DiaryTrendSummary trend={trend} entries={entries} />

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

        {/* Pasek eksportu/importu pojedynczego dnia — JSON (archiwum / re-import na innym
            urządzeniu) lub PDF (do druku / na konsultację). Eksport aktywny tylko gdy dzień
            ma treść; Import zawsze dostępny (przywracanie z innego urządzenia). */}
        <div className="mb-5 rounded-xl border border-primary/25 bg-primary/[0.04] px-3 py-2.5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-primary font-sans mr-auto">
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            Eksport / import dnia
          </div>
          {dayHasContent && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportDayPdf}
                className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                aria-label={`Pobierz wpis z dnia ${formatLongDate(activeDate)} jako PDF`}
              >
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportDayJson}
                className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                aria-label={`Pobierz wpis z dnia ${formatLongDate(activeDate)} jako JSON`}
              >
                <FileJson className="w-3.5 h-3.5 mr-1.5" />
                JSON
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => importFileRef.current?.click()}
            className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            aria-label="Importuj wpis dziennika z pliku JSON"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Importuj JSON
          </Button>
          {/* Hidden input — wywoływany przez przycisk powyżej. Po wyborze pliku resetujemy
              `value`, by wybranie tego samego pliku ponownie znowu wyzwoliło `onChange`. */}
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Dialog potwierdzający import gdy nadpisujemy istniejący wpis lub zmieniamy aktywny
            dzień — chroni przed przypadkową utratą danych. */}
        <AlertDialog open={!!pendingImport} onOpenChange={(open) => !open && setPendingImport(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Zaimportować wpis z pliku?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingImport && (
                  <>
                    Plik zawiera wpis z dnia <strong>{formatLongDate(pendingImport.date)}</strong>{" "}
                    ({pendingImport.answers.filter((a) => a !== null).length}/
                    {HEMOROIDY_QUESTIONS.length} odpowiedzi
                    {pendingImport.notes ? " + notatki" : ""}).
                    {entries[pendingImport.date] &&
                      (entries[pendingImport.date].answers.some((a) => a !== null) ||
                        !!entries[pendingImport.date].notes?.trim()) && (
                        <>
                          {" "}<strong>Istniejący wpis na ten dzień zostanie nadpisany</strong> —
                          tej operacji nie można cofnąć.
                        </>
                      )}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingImport) applyImport(pendingImport);
                  setPendingImport(null);
                }}
              >
                Tak, zaimportuj
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


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

        {/* Mini-mapa pytań — wizualny status każdego z 9. Klik przewija i fokusuje
            odpowiedni fieldset. Kolory: emerald=odpowiedziane, primary z pulsem=brak. */}
        <div
          className="mb-4 rounded-xl border border-border bg-background/40 p-3"
          aria-label="Status odpowiedzi quizu"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-sans">
              Status pytań
            </p>
            <p
              className={`text-[11px] font-sans tabular-nums ${
                entry.complete ? "text-emerald-500" : "text-muted-foreground"
              }`}
              aria-live="polite"
            >
              {entry.complete
                ? `✓ ${total}/${total} — komplet`
                : `Brakuje: ${missingQuestionNumbers.join(", ")}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="list">
            {HEMOROIDY_QUESTIONS.map((q, qi) => {
              const answered = entry.answers[qi] !== null;
              return (
                <button
                  key={q.id}
                  type="button"
                  role="listitem"
                  onClick={() => {
                    const el = document.getElementById(`diary-q-${activeDate}-${qi}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      // a11y focus na pierwszą opcję — pacjent może od razu wybrać
                      const firstOpt = el.querySelector<HTMLButtonElement>("button[type='button']");
                      firstOpt?.focus({ preventScroll: true });
                    }
                  }}
                  aria-label={`Pytanie ${qi + 1} — ${answered ? "odpowiedziane" : "brak odpowiedzi, kliknij aby przejść"}`}
                  title={answered ? `Pyt. ${qi + 1}: odpowiedziane` : `Pyt. ${qi + 1}: brak odpowiedzi`}
                  className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md border text-xs font-sans tabular-nums transition-all ${
                    answered
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:border-emerald-500"
                      : "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                  }`}
                >
                  {answered ? <CheckCircle2 className="w-3.5 h-3.5" /> : qi + 1}
                  {!answered && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {/* Akcje pod mini-mapą: po lewej destrukcyjny reset odpowiedzi quizu (z dialogiem
              potwierdzenia, bo to nieodwracalne dla danego dnia), po prawej skok do
              pierwszego brakującego pytania — szybka nawigacja klawiaturą i myszką. */}
          {(completed > 0 || missingQuestionNumbers.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {completed > 0 ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Wyczyść zapisane odpowiedzi quizu dla dnia ${formatLongDate(activeDate)}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Wyczyść zapisane odpowiedzi
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Wyczyścić zapisane odpowiedzi?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Wszystkie {completed} z {total} odpowiedzi quizu na dzień{" "}
                        <span className="text-foreground font-medium">{formatLongDate(activeDate)}</span>{" "}
                        zostaną usunięte z pamięci przeglądarki (localStorage). Notatki tego dnia
                        pozostaną nietknięte. Operacji nie można cofnąć.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={clearAnswers}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Wyczyść odpowiedzi
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <span />
              )}
              {missingQuestionNumbers.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const firstMissing = missingQuestionNumbers[0]; // 1-indexed
                    const qi = firstMissing - 1;
                    const el = document.getElementById(`diary-q-${activeDate}-${qi}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      const firstOpt = el.querySelector<HTMLButtonElement>("button[type='button']");
                      firstOpt?.focus({ preventScroll: true });
                    }
                  }}
                  aria-label={`Przejdź do pierwszego brakującego pytania — pytanie ${missingQuestionNumbers[0]}`}
                  className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
                  Przejdź do pyt. {missingQuestionNumbers[0]}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Procentowy pasek postępu pytań — uzupełnia mini-mapę o liczbową informację
            zwrotną (X/9 + %). Kolor zmienia się na emerald po komplecie. */}
        <div
          className="mb-4 rounded-xl border border-border bg-background/40 px-3 py-2.5"
          aria-label="Postęp uzupełniania pytań"
        >
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-sans">
                Postęp pytań
              </p>
              {/* Badge auto-zapisu — potwierdza że odpowiedzi są zapisywane lokalnie
                  natychmiast po kliknięciu (przeżyją refresh). Pojawia się dopiero gdy
                  jest co potwierdzać (≥1 odpowiedź). */}
              {completed > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-sans text-emerald-500"
                  title="Twoje odpowiedzi są zapisywane lokalnie w przeglądarce po każdym kliknięciu — przeżyją odświeżenie strony."
                >
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                  Auto-zapis
                </span>
              )}
            </div>
            <p
              className={`text-xs font-sans tabular-nums ${
                entry.complete ? "text-emerald-500" : "text-foreground/80"
              }`}
              aria-live="polite"
            >
              <span className="font-semibold">{completed}/{total}</span>
              <span className="text-muted-foreground"> uzupełnione</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-semibold">{progressPct}%</span>
            </p>
          </div>
          {/* 9-segmentowy pasek: każdy segment = 1 pytanie. Emerald = odpowiedziane,
              primary/30 = puste. Pierwszy brakujący ma subtelny pulse dla orientacji. */}
          <div
            className="flex gap-1"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            aria-valuetext={`${completed} z ${total} pytań uzupełnione (${progressPct}%)`}
          >
            {entry.answers.map((a, i) => {
              const answered = a !== null;
              const isFirstMissing = !answered && missingQuestionNumbers[0] === i + 1;
              return (
                <motion.div
                  key={i}
                  className={`relative h-2 flex-1 rounded-full overflow-hidden ${
                    answered
                      ? entry.complete
                        ? "bg-emerald-500"
                        : "bg-primary"
                      : "bg-primary/15 border border-primary/30"
                  } ${isFirstMissing ? "ring-1 ring-primary/60" : ""}`}
                  initial={false}
                  animate={{ opacity: answered ? 1 : 0.85 }}
                  transition={{ duration: 0.3, ease: easeOut }}
                  title={`Pytanie ${i + 1}: ${answered ? "uzupełnione" : "brak odpowiedzi"}`}
                  aria-hidden="true"
                >
                  {isFirstMissing && (
                    <span
                      className="absolute inset-0 bg-primary/20 animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
          {/* Dyskretny komunikat dla czytników ekranu — ogłaszany po każdej zaznaczonej
              odpowiedzi (toast pełni tę samą rolę wizualnie). */}
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {answerAnnouncement}
          </p>
        </div>

        {/* Filtr „Tylko brakujące" — szybko skupia uwagę na nieuzupełnionych pytaniach.
            Auto-wyłącza się gdy quiz jest kompletny (nie ma czego ukrywać). */}
        {missingQuestionNumbers.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-3 py-2">
            <label
              htmlFor={`diary-only-missing-${activeDate}`}
              className="text-xs font-sans text-foreground/80 inline-flex items-center gap-2 cursor-pointer select-none"
            >
              <AlertCircle className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Tylko brakujące pytania
              <span className="text-muted-foreground tabular-nums">
                ({missingQuestionNumbers.length}/{total})
              </span>
            </label>
            <button
              id={`diary-only-missing-${activeDate}`}
              type="button"
              role="switch"
              aria-checked={showOnlyMissing}
              onClick={() => setShowOnlyMissing((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                showOnlyMissing ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${
                  showOnlyMissing ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
              <span className="sr-only">
                {showOnlyMissing ? "Wyłącz filtr" : "Pokaż tylko brakujące"}
              </span>
            </button>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-5">
          {HEMOROIDY_QUESTIONS.map((q, qi) => {
            const isAnswered = entry.answers[qi] !== null;
            if (showOnlyMissing && isAnswered) return null;
            return (
              <fieldset
                key={q.id}
                id={`diary-q-${activeDate}-${qi}`}
                aria-invalid={!isAnswered}
                className={`rounded-xl border p-4 transition-colors scroll-mt-32 ${
                  isAnswered
                    ? "border-border bg-background/40"
                    : "border-primary/40 bg-primary/[0.03]"
                }`}
              >
                <legend className="px-2 -ml-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-sans">
                  <span className="text-muted-foreground">Pyt. {qi + 1}/{total}</span>
                  {isAnswered ? (
                    <span className="inline-flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      odpowiedziane
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                      brak odpowiedzi
                    </span>
                  )}
                  {/* Mignięcie „Zapisano" — pojawia się na 1.5 s po każdym kliknięciu
                      odpowiedzi (klucz timestamp wymusza re-mount = nowa animacja). */}
                  {savedFlash[qi] && (
                    <motion.span
                      key={savedFlash[qi]}
                      initial={{ opacity: 0, y: -2, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: easeOut }}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-500"
                      role="status"
                      aria-label="Odpowiedź zapisana lokalnie"
                    >
                      <Save className="w-2.5 h-2.5" aria-hidden="true" />
                      Zapisano
                    </motion.span>
                  )}
                </legend>
                <p className="font-heading text-base text-foreground mb-3 leading-snug">{q.q}</p>
                <div className="grid sm:grid-cols-3 gap-2">
                  {q.options.map((opt, oi) => {
                    const selected = entry.answers[qi] === oi;
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => handleAnswerSelect(qi, oi)}
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
                {!isAnswered && (
                  <p className="mt-2 text-[11px] text-primary inline-flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    Wybierz jedną z opcji powyżej, aby zaliczyć to pytanie do dziennika dnia.
                  </p>
                )}
              </fieldset>
            );
          })}
          {showOnlyMissing && missingQuestionNumbers.length === 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" aria-hidden="true" />
              <p className="font-heading text-sm text-foreground">
                Wszystkie pytania uzupełnione — możesz wyłączyć filtr.
              </p>
            </div>
          )}
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

        {/* Save day button — wymaga 9/9 odpowiedzi (entry.complete) */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-start gap-3">
          <Button
            type="button"
            variant="hero"
            size="lg"
            onClick={handleSaveDay}
            disabled={!entry.complete}
            aria-disabled={!entry.complete}
            aria-describedby="save-day-hint save-day-autosave"
            title={
              entry.complete
                ? "Zapisz dzień jako kompletny wpis"
                : `Uzupełnij brakujące pytania (${completed}/${total}), aby aktywować przycisk`
            }
            className="gap-2"
          >
            {entry.complete ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Zapisz dzień
            <span className="ml-1 text-xs font-sans tabular-nums opacity-80">
              {completed}/{total}
            </span>
          </Button>
          <div className="flex-1 flex flex-col gap-1">
            <p
              id="save-day-hint"
              className={`text-xs leading-relaxed ${
                entry.complete ? "text-emerald-500" : "text-muted-foreground italic"
              }`}
              aria-live="polite"
            >
              {entry.complete
                ? "✓ Komplet odpowiedzi — możesz zatwierdzić dzień. Każda zmiana zapisuje się też automatycznie."
                : `Aby zapisać dzień, odpowiedz na wszystkie ${total} pytania quizu. Brakuje jeszcze: ${total - completed}.`}
            </p>
            {/* Status auto-zapisu (heartbeat 30s). Pokazujemy tylko gdy istnieje wpis dla aktywnego dnia. */}
            {entry.updatedAt && (
              <p
                id="save-day-autosave"
                className="text-[11px] font-sans inline-flex items-center gap-1.5 text-muted-foreground tabular-nums"
                aria-live="polite"
                title={`Ostatni auto-zapis: ${formatUpdatedAt(lastAutosaveAt ?? entry.updatedAt)}`}
              >
                <Clock className="w-3 h-3" aria-hidden="true" />
                {pendingChanges ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                      Niezapisane zmiany…
                    </span>
                    <span className="text-muted-foreground/70">
                      · auto-zapis co 30 s · ostatnio: {lastAutosaveRelative ?? "—"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-500">Auto-zapis aktywny</span>
                    <span>· ostatnio: {lastAutosaveRelative ?? "—"}</span>
                  </>
                )}
              </p>
            )}
          </div>
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
          <RiskThresholdsSettings />
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
