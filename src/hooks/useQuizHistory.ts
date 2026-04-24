import { useCallback, useEffect, useState } from "react";

export type QuizHistoryEntry = {
  /** ISO timestamp */
  date: string;
  score: number;
  maxScore: number;
  level: "low" | "medium" | "high";
  label: string;
};

const STORAGE_KEY = "cml.hemoroidy.quiz.history.v1";
const MAX_ENTRIES = 50;
/** Skip auto-save if last entry is within this many ms (avoid duplicate from re-renders / quick re-takes). */
const DEDUP_WINDOW_MS = 30_000;

const isBrowser = () => typeof window !== "undefined";

const readStorage = (): QuizHistoryEntry[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is QuizHistoryEntry =>
        e &&
        typeof e.date === "string" &&
        typeof e.score === "number" &&
        typeof e.maxScore === "number" &&
        (e.level === "low" || e.level === "medium" || e.level === "high") &&
        typeof e.label === "string"
    );
  } catch {
    return [];
  }
};

const writeStorage = (entries: QuizHistoryEntry[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    // Notify other components in same tab
    window.dispatchEvent(new CustomEvent("cml:quiz-history-updated"));
  } catch {
    // quota exceeded or storage disabled — silently ignore
  }
};

export const useQuizHistory = () => {
  const [history, setHistory] = useState<QuizHistoryEntry[]>(() => readStorage());

  // Sync across tabs and same-tab events
  useEffect(() => {
    if (!isBrowser()) return;
    const handler = () => setHistory(readStorage());
    window.addEventListener("storage", handler);
    window.addEventListener("cml:quiz-history-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("cml:quiz-history-updated", handler);
    };
  }, []);

  const addEntry = useCallback((entry: Omit<QuizHistoryEntry, "date"> & { date?: string }) => {
    const current = readStorage();
    const now = entry.date ?? new Date().toISOString();

    // Dedup: if last entry is identical and within window, skip.
    const last = current[current.length - 1];
    if (
      last &&
      last.score === entry.score &&
      last.level === entry.level &&
      Date.now() - new Date(last.date).getTime() < DEDUP_WINDOW_MS
    ) {
      return last;
    }

    const next: QuizHistoryEntry = {
      date: now,
      score: entry.score,
      maxScore: entry.maxScore,
      level: entry.level,
      label: entry.label,
    };
    const updated = [...current, next].slice(-MAX_ENTRIES);
    writeStorage(updated);
    setHistory(updated);
    return next;
  }, []);

  const clearHistory = useCallback(() => {
    writeStorage([]);
    setHistory([]);
  }, []);

  const removeEntry = useCallback((date: string) => {
    const current = readStorage().filter((e) => e.date !== date);
    writeStorage(current);
    setHistory(current);
  }, []);

  return { history, addEntry, clearHistory, removeEntry };
};
