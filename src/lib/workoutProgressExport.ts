/**
 * Eksport postępu treningu dnia do pliku JSON.
 * Pozwala pacjentowi zachować historię przed czyszczeniem przeglądarki
 * (np. przed zmianą urządzenia, czyszczeniem ciasteczek lub w trybie incognito).
 */

import { getMilestone, STREAK_MILESTONES } from "./streakMilestones";
import { markWorkoutProgressExported } from "@/hooks/useLastExportTimestamp";

const SCHEMA_VERSION = 1;

export type WorkoutProgressExport = {
  schema: "cml-workout-progress";
  schemaVersion: number;
  exportedAt: string; // ISO 8601 z timezone
  source: {
    app: "Centrum Medycyny Laserowej";
    page: "/dla-pacjenta/profilaktyka-zylakow";
    feature: "Trening dnia — profilaktyka żylaków";
  };
  summary: {
    currentStreak: number;
    totalDays: number;
    firstDayISO: string | null;
    lastDayISO: string | null;
    milestonesAchieved: number[];
    nextMilestone: number | null;
    daysToNextMilestone: number | null;
  };
  history: {
    days: string[]; // ISO YYYY-MM-DD
  };
};

type BuildArgs = {
  currentStreak: number;
  totalDays: number;
  days: string[];
};

export const buildWorkoutProgressExport = ({
  currentStreak,
  totalDays,
  days,
}: BuildArgs): WorkoutProgressExport => {
  const sortedDays = [...days].sort();
  const milestonesAchieved = STREAK_MILESTONES.filter(
    (m) => currentStreak >= m || sortedDays.length >= m,
  ).map((m) => Number(m));
  const nextMilestone =
    STREAK_MILESTONES.find((m) => currentStreak < m) ?? null;
  const daysToNextMilestone =
    nextMilestone !== null ? nextMilestone - currentStreak : null;

  return {
    schema: "cml-workout-progress",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    source: {
      app: "Centrum Medycyny Laserowej",
      page: "/dla-pacjenta/profilaktyka-zylakow",
      feature: "Trening dnia — profilaktyka żylaków",
    },
    summary: {
      currentStreak,
      totalDays,
      firstDayISO: sortedDays[0] ?? null,
      lastDayISO: sortedDays[sortedDays.length - 1] ?? null,
      milestonesAchieved,
      nextMilestone,
      daysToNextMilestone,
    },
    history: {
      days: sortedDays,
    },
  };
};

const todayStampForFilename = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Inicjuje pobranie pliku JSON w przeglądarce.
 * Zwraca obiekt z metadanymi wykorzystanymi w toaście.
 */
export const downloadWorkoutProgressJson = (args: BuildArgs) => {
  if (typeof window === "undefined") return null;

  const data = buildWorkoutProgressExport(args);
  // Świadomie używam getMilestone, by przyszły konsument exportu
  // mógł odtworzyć copy kamienia milowego — pakuję title/message jeśli aktualnie aktywny.
  const activeMilestone = getMilestone(args.currentStreak);
  const payload = activeMilestone
    ? { ...data, summary: { ...data.summary, activeMilestone } }
    : data;

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const filename = `cml-trening-postep-${todayStampForFilename()}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Drobne opóźnienie zwolnienia URL — Safari/iOS bywa wybredne
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);

  // Zapamiętaj timestamp eksportu dla licznika "ostatni eksport: X dni temu".
  markWorkoutProgressExported();

  return { filename, totalDays: args.totalDays };
};
