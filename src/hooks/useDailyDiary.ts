import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HEMOROIDY_QUESTIONS,
  HEMOROIDY_QUIZ_MAX_SCORE,
  RiskLevel,
  RiskThresholds,
  getRiskLabel,
  getRiskLevelWithThresholds,
  DEFAULT_RISK_THRESHOLDS,
} from "@/lib/hemoroidyQuizData";
import { useRiskThresholds } from "@/hooks/useRiskThresholds";

/**
 * 14-dniowy dziennik objawów + quizu hemoroidów.
 * Zapisywany lokalnie (localStorage) — anonimowo, bez konta.
 *
 * Klucz dnia: YYYY-MM-DD (Europe/Warsaw "naive local date").
 * Aktualizacja istniejącego wpisu nadpisuje (jeden wpis na dobę).
 */

export type DiaryEntry = {
  /** YYYY-MM-DD */
  date: string;
  /** Indeks wybranej opcji dla każdego pytania (lub null = pominięte) */
  answers: (number | null)[];
  notes: string;
  /** Suma punktów (po wybraniu wszystkich) */
  score: number;
  maxScore: number;
  /** Czy wszystkie pytania mają odpowiedź */
  complete: boolean;
  level: RiskLevel | null;
  label: string | null;
  /** ISO timestamp ostatniej zmiany */
  updatedAt: string;
};

const STORAGE_KEY = "cml.hemoroidy.diary.v1";

const isBrowser = () => typeof window !== "undefined";

/** YYYY-MM-DD w lokalnej strefie (czyli zwykle Europe/Warsaw na PL urządzeniach) */
export const todayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Zwraca tablicę 14 ostatnich kluczy dni (od najstarszego do dzisiaj) */
export const last14DaysKeys = (today: Date = new Date()): string[] => {
  const out: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
};

const computeDerived = (
  answers: (number | null)[],
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
): Pick<DiaryEntry, "score" | "maxScore" | "complete" | "level" | "label"> => {
  const complete = answers.every((a) => a !== null && a >= 0);
  const score = answers.reduce<number>((sum, a, i) => {
    if (a === null) return sum;
    const opt = HEMOROIDY_QUESTIONS[i]?.options[a];
    return sum + (opt?.points ?? 0);
  }, 0);
  if (!complete) {
    return {
      score,
      maxScore: HEMOROIDY_QUIZ_MAX_SCORE,
      complete: false,
      level: null,
      label: null,
    };
  }
  const level = getRiskLevelWithThresholds(score, thresholds);
  return {
    score,
    maxScore: HEMOROIDY_QUIZ_MAX_SCORE,
    complete: true,
    level,
    label: getRiskLabel(level),
  };
};

const sanitizeEntry = (raw: unknown): DiaryEntry | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
  const rawAnswers = Array.isArray(r.answers) ? r.answers : [];
  const answers: (number | null)[] = HEMOROIDY_QUESTIONS.map((_q, i) => {
    const v = rawAnswers[i];
    return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10 ? v : null;
  });
  const derived = computeDerived(answers);
  return {
    date: r.date,
    answers,
    notes: typeof r.notes === "string" ? r.notes.slice(0, 1000) : "",
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
    ...derived,
  };
};

const readStorage = (): Record<string, DiaryEntry> => {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, DiaryEntry> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const e = sanitizeEntry(v);
      if (e && e.date === k) out[k] = e;
    }
    return out;
  } catch {
    return {};
  }
};

const writeStorage = (entries: Record<string, DiaryEntry>) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent("cml:diary-updated"));
  } catch {
    // quota exceeded etc.
  }
};

const emptyEntry = (date: string): DiaryEntry => {
  const answers = HEMOROIDY_QUESTIONS.map(() => null as number | null);
  return {
    date,
    answers,
    notes: "",
    updatedAt: new Date().toISOString(),
    ...computeDerived(answers),
  };
};

export const useDailyDiary = () => {
  const [entries, setEntries] = useState<Record<string, DiaryEntry>>(() => readStorage());

  useEffect(() => {
    if (!isBrowser()) return;
    const handler = () => setEntries(readStorage());
    window.addEventListener("storage", handler);
    window.addEventListener("cml:diary-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("cml:diary-updated", handler);
    };
  }, []);

  const getEntry = useCallback(
    (date: string): DiaryEntry => entries[date] ?? emptyEntry(date),
    [entries]
  );

  const setAnswer = useCallback((date: string, questionIndex: number, optionIndex: number | null) => {
    const current = readStorage();
    const existing = current[date] ?? emptyEntry(date);
    const answers = existing.answers.slice();
    answers[questionIndex] = optionIndex;
    const updated: DiaryEntry = {
      ...existing,
      date,
      answers,
      updatedAt: new Date().toISOString(),
      ...computeDerived(answers),
    };
    const next = { ...current, [date]: updated };
    writeStorage(next);
    setEntries(next);
  }, []);

  const setNotes = useCallback((date: string, notes: string) => {
    const current = readStorage();
    const existing = current[date] ?? emptyEntry(date);
    const updated: DiaryEntry = {
      ...existing,
      notes: notes.slice(0, 1000),
      updatedAt: new Date().toISOString(),
    };
    const next = { ...current, [date]: updated };
    writeStorage(next);
    setEntries(next);
  }, []);

  const removeEntry = useCallback((date: string) => {
    const current = readStorage();
    if (!(date in current)) return;
    const next = { ...current };
    delete next[date];
    writeStorage(next);
    setEntries(next);
  }, []);

  const clearAll = useCallback(() => {
    writeStorage({});
    setEntries({});
  }, []);

  /** Trend ostatnich 14 dni (z dziurami: dni bez wpisu = null) */
  const last14Trend = useCallback(
    (today: Date = new Date()) =>
      last14DaysKeys(today).map((date) => {
        const e = entries[date];
        return {
          date,
          score: e?.complete ? e.score : null,
          level: e?.complete ? e.level : null,
          hasNotes: !!e?.notes,
        };
      }),
    [entries]
  );

  return {
    entries,
    getEntry,
    setAnswer,
    setNotes,
    removeEntry,
    clearAll,
    last14Trend,
    todayKey,
    maxScore: HEMOROIDY_QUIZ_MAX_SCORE,
  };
};
