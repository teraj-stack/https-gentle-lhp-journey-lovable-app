import { useCallback, useEffect, useState } from "react";
import { todayKey } from "@/hooks/useDailyDiary";

/**
 * In-app przypomnienia dziennika hemoroidów + powrotu do quizu.
 * Anonimowo, w localStorage. Opcjonalnie wykorzystuje Notification API
 * (tylko gdy użytkownik świadomie włączy „powiadomienia systemowe").
 *
 * Reguły:
 *  - cadence: off | daily | every2days | every3days  (domyślnie daily)
 *  - quizCadence: off | weekly | biweekly | monthly  (domyślnie weekly)
 *  - snooze: ISO date (YYYY-MM-DD) — do tego dnia (włącznie) chowamy banner
 *  - „due" = jeśli od ostatniego wpisu minęło >= cadence dni (lub nigdy nie wypełniono)
 */

export type DiaryCadence = "off" | "daily" | "every2days" | "every3days";
export type QuizCadence = "off" | "weekly" | "biweekly" | "monthly";

export type ReminderPrefs = {
  cadence: DiaryCadence;
  quizCadence: QuizCadence;
  /** ISO timestamp wł. push do natywnych notyfikacji (poza bannerem) */
  systemNotifications: boolean;
  /** YYYY-MM-DD — banner ukryty do końca tego dnia */
  snoozedUntil: string | null;
  /** ISO timestamp ostatniego pomyślnego ukończenia quizu (do quizCadence) */
  lastQuizCompletedAt: string | null;
};

const PREFS_KEY = "cml.hemoroidy.reminders.v1";
const DIARY_STORAGE_KEY = "cml.hemoroidy.diary.v1";

const isBrowser = () => typeof window !== "undefined";

const DEFAULT_PREFS: ReminderPrefs = {
  cadence: "daily",
  quizCadence: "weekly",
  systemNotifications: false,
  snoozedUntil: null,
  lastQuizCompletedAt: null,
};

const sanitize = (raw: unknown): ReminderPrefs => {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
  const r = raw as Partial<ReminderPrefs>;
  const cadence: DiaryCadence =
    r.cadence === "off" || r.cadence === "every2days" || r.cadence === "every3days"
      ? r.cadence
      : "daily";
  const quizCadence: QuizCadence =
    r.quizCadence === "off" ||
    r.quizCadence === "biweekly" ||
    r.quizCadence === "monthly"
      ? r.quizCadence
      : "weekly";
  return {
    cadence,
    quizCadence,
    systemNotifications: !!r.systemNotifications,
    snoozedUntil:
      typeof r.snoozedUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.snoozedUntil)
        ? r.snoozedUntil
        : null,
    lastQuizCompletedAt:
      typeof r.lastQuizCompletedAt === "string" ? r.lastQuizCompletedAt : null,
  };
};

const readPrefs = (): ReminderPrefs => {
  if (!isBrowser()) return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

const writePrefs = (prefs: ReminderPrefs) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("cml:reminder-prefs-updated"));
  } catch {
    // ignore
  }
};

const cadenceDays = (c: DiaryCadence): number =>
  c === "every3days" ? 3 : c === "every2days" ? 2 : 1;

const quizCadenceDays = (c: QuizCadence): number =>
  c === "monthly" ? 30 : c === "biweekly" ? 14 : 7;

const dayDiff = (fromKey: string, toKey: string): number => {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

/** Najnowszy klucz dnia z istniejącym wpisem (po answers/notes), albo null */
const getLastDiaryDate = (): string | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DIARY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const keys = Object.keys(parsed)
      .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
      .filter((k) => {
        const e = (parsed as Record<string, { answers?: unknown[]; notes?: string }>)[k];
        const hasAnswer =
          Array.isArray(e?.answers) && e!.answers!.some((a) => typeof a === "number");
        const hasNotes = typeof e?.notes === "string" && e!.notes!.trim().length > 0;
        return hasAnswer || hasNotes;
      })
      .sort();
    return keys.length ? keys[keys.length - 1] : null;
  } catch {
    return null;
  }
};

export type ReminderStatus = {
  diaryDue: boolean;
  diaryDaysSince: number | null;
  diaryNeverFilled: boolean;
  quizDue: boolean;
  quizDaysSince: number | null;
  quizNeverCompleted: boolean;
  snoozedToday: boolean;
};

const computeStatus = (prefs: ReminderPrefs): ReminderStatus => {
  const today = todayKey();
  const snoozedToday = !!prefs.snoozedUntil && prefs.snoozedUntil >= today;

  // Diary
  const lastDiary = getLastDiaryDate();
  const diaryDaysSince = lastDiary ? dayDiff(lastDiary, today) : null;
  const diaryDue =
    prefs.cadence !== "off" &&
    (lastDiary === null || (diaryDaysSince ?? 0) >= cadenceDays(prefs.cadence));

  // Quiz
  let quizDaysSince: number | null = null;
  if (prefs.lastQuizCompletedAt) {
    const last = new Date(prefs.lastQuizCompletedAt);
    if (!Number.isNaN(last.getTime())) {
      quizDaysSince = dayDiff(todayKey(last), today);
    }
  }
  const quizDue =
    prefs.quizCadence !== "off" &&
    (prefs.lastQuizCompletedAt === null ||
      (quizDaysSince ?? 0) >= quizCadenceDays(prefs.quizCadence));

  return {
    diaryDue,
    diaryDaysSince,
    diaryNeverFilled: lastDiary === null,
    quizDue,
    quizDaysSince,
    quizNeverCompleted: prefs.lastQuizCompletedAt === null,
    snoozedToday,
  };
};

export const useDiaryReminders = () => {
  const [prefs, setPrefs] = useState<ReminderPrefs>(() => readPrefs());
  const [status, setStatus] = useState<ReminderStatus>(() => computeStatus(readPrefs()));

  // re-read on storage / custom events / visibility
  useEffect(() => {
    if (!isBrowser()) return;
    const refresh = () => {
      const p = readPrefs();
      setPrefs(p);
      setStatus(computeStatus(p));
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("cml:diary-updated", refresh);
    window.addEventListener("cml:reminder-prefs-updated", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    // odśwież co 30 min, żeby data przeszła w nocy
    const interval = window.setInterval(refresh, 30 * 60 * 1000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("cml:diary-updated", refresh);
      window.removeEventListener("cml:reminder-prefs-updated", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, []);

  const update = useCallback((patch: Partial<ReminderPrefs>) => {
    const current = readPrefs();
    const next = sanitize({ ...current, ...patch });
    writePrefs(next);
    setPrefs(next);
    setStatus(computeStatus(next));
  }, []);

  const setCadence = useCallback(
    (c: DiaryCadence) => update({ cadence: c }),
    [update],
  );
  const setQuizCadence = useCallback(
    (c: QuizCadence) => update({ quizCadence: c }),
    [update],
  );

  /** Snooze do końca dzisiaj (banner zniknie, wróci jutro jeżeli nadal due) */
  const snoozeToday = useCallback(() => {
    update({ snoozedUntil: todayKey() });
  }, [update]);

  /** Snooze na N dni naprzód */
  const snoozeForDays = useCallback(
    (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + Math.max(0, days));
      update({ snoozedUntil: todayKey(d) });
    },
    [update],
  );

  const clearSnooze = useCallback(() => update({ snoozedUntil: null }), [update]);

  /** Zaznacz że quiz został dzisiaj ukończony (do liczenia quizCadence) */
  const markQuizCompleted = useCallback(() => {
    update({ lastQuizCompletedAt: new Date().toISOString() });
  }, [update]);

  /** System notifications — Notification API (tylko jeśli przeglądarka wspiera) */
  const requestSystemNotifications = useCallback(async (): Promise<boolean> => {
    if (!isBrowser() || typeof Notification === "undefined") return false;
    try {
      const result = await Notification.requestPermission();
      const granted = result === "granted";
      update({ systemNotifications: granted });
      if (granted) {
        // jednorazowy „test ping", że rzeczywiście działa
        try {
          new Notification("CML — przypomnienia włączone", {
            body: "Dostaniesz delikatne przypomnienia, aby uzupełniać dziennik 14 dni.",
            icon: "/favicon.ico",
            silent: true,
          });
        } catch {
          // noop — niektóre przeglądarki blokują tworzenie z handlerów
        }
      }
      return granted;
    } catch {
      return false;
    }
  }, [update]);

  const disableSystemNotifications = useCallback(() => {
    update({ systemNotifications: false });
  }, [update]);

  /** Wyzwala natywną notyfikację gdy przeglądarka jest na zakładce a użytkownik
   * odwiedza dziennik z włączonymi systemowymi (best-effort, bez SW). */
  useEffect(() => {
    if (!isBrowser() || typeof Notification === "undefined") return;
    if (!prefs.systemNotifications) return;
    if (Notification.permission !== "granted") return;
    if (status.snoozedToday) return;
    if (!status.diaryDue && !status.quizDue) return;

    const flagKey = `cml.hemoroidy.notif.shown.${todayKey()}`;
    if (window.sessionStorage.getItem(flagKey)) return;
    try {
      const title = status.diaryDue
        ? "Czas na wpis do dziennika"
        : "Wróć do quizu ryzyka";
      const body = status.diaryDue
        ? "Uzupełnij dzisiejsze pytania — to ~1 minuta."
        : "Sprawdź jak zmieniło się Twoje ryzyko od ostatniego razu.";
      new Notification(title, { body, icon: "/favicon.ico", silent: true });
      window.sessionStorage.setItem(flagKey, "1");
    } catch {
      // noop
    }
  }, [prefs.systemNotifications, status.diaryDue, status.quizDue, status.snoozedToday]);

  return {
    prefs,
    status,
    setCadence,
    setQuizCadence,
    snoozeToday,
    snoozeForDays,
    clearSnooze,
    markQuizCompleted,
    requestSystemNotifications,
    disableSystemNotifications,
  };
};
