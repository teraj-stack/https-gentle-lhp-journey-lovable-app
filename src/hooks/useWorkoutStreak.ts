import { useCallback, useEffect, useState } from "react";

/**
 * Streak treningu dnia — pamięć lokalna (bez backendu).
 * - Zlicza unikalne dni ukończenia treningu.
 * - Streak = ciąg następujących po sobie dni (dzisiaj LUB wczoraj jako ostatni dzień).
 * - Jeśli ostatni dzień to "przedwczoraj" lub wcześniej — streak = 0 (zerwany), ale total zostaje.
 */

const STORAGE_KEY = "cml-workout-streak-v1";

type StreakData = {
  // ISO daty (YYYY-MM-DD) ukończonych dni — sortowane rosnąco, unikalne
  days: string[];
  totalCompletions: number; // wszystkie sesje (mogą być >1 dziennie, ale liczone osobno)
};

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isoDaysDiff = (a: string, b: string) => {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
};

const calcCurrentStreak = (days: string[]): number => {
  if (days.length === 0) return 0;
  const today = todayISO();
  const last = days[days.length - 1];
  const gapToToday = isoDaysDiff(last, today);
  // streak żyje, gdy ostatni dzień to dziś (0) lub wczoraj (1)
  if (gapToToday > 1) return 0;

  let streak = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const diff = isoDaysDiff(days[i - 1], days[i]);
    if (diff === 1) streak += 1;
    else break;
  }
  return streak;
};

const readStorage = (): StreakData => {
  if (typeof window === "undefined") return { days: [], totalCompletions: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { days: [], totalCompletions: 0 };
    const parsed = JSON.parse(raw) as StreakData;
    if (!parsed || !Array.isArray(parsed.days)) {
      return { days: [], totalCompletions: 0 };
    }
    return {
      days: parsed.days.filter(Boolean),
      totalCompletions:
        typeof parsed.totalCompletions === "number" ? parsed.totalCompletions : parsed.days.length,
    };
  } catch {
    return { days: [], totalCompletions: 0 };
  }
};

const writeStorage = (data: StreakData) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
};

export const useWorkoutStreak = () => {
  const [data, setData] = useState<StreakData>(() => readStorage());

  // Synchronizacja między kartami przeglądarki
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setData(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const recordCompletion = useCallback(() => {
    const today = todayISO();
    setData((prev) => {
      const alreadyToday = prev.days[prev.days.length - 1] === today;
      const days = alreadyToday ? prev.days : [...prev.days, today];
      const next: StreakData = {
        days,
        totalCompletions: prev.totalCompletions + 1,
      };
      writeStorage(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next: StreakData = { days: [], totalCompletions: 0 };
    writeStorage(next);
    setData(next);
  }, []);

  const currentStreak = calcCurrentStreak(data.days);
  const lastCompletedISO = data.days[data.days.length - 1] ?? null;
  const completedToday = lastCompletedISO === todayISO();

  return {
    currentStreak,
    totalCompletions: data.totalCompletions,
    totalDays: data.days.length,
    completedToday,
    lastCompletedISO,
    recordCompletion,
    reset,
  };
};
