import confetti from "canvas-confetti";

export const STREAK_MILESTONES = [7, 14, 30, 100] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export type MilestoneInfo = {
  days: StreakMilestone;
  title: string;
  message: string;
};

const COPY: Record<StreakMilestone, Omit<MilestoneInfo, "days">> = {
  7: {
    title: "Tydzień konsekwencji",
    message:
      "7 dni z rzędu — Twoja pompa mięśniowa łydki właśnie weszła w nowy rytm. Tak buduje się długoterminowa profilaktyka.",
  },
  14: {
    title: "Dwa tygodnie nawyku",
    message:
      "14 dni z rzędu — neurobiologicznie tak właśnie powstaje nawyk. Świetna robota.",
  },
  30: {
    title: "Miesiąc dyscypliny",
    message:
      "30 dni z rzędu — to poziom pacjentów, którzy realnie spowalniają progresję choroby żylnej.",
  },
  100: {
    title: "Setka — elita profilaktyki",
    message:
      "100 dni z rzędu. Niewielu pacjentów osiąga ten wynik. Twoje żyły dziękują każdego dnia.",
  },
};

export const getMilestone = (streak: number): MilestoneInfo | null => {
  if ((STREAK_MILESTONES as readonly number[]).includes(streak)) {
    return { days: streak as StreakMilestone, ...COPY[streak as StreakMilestone] };
  }
  return null;
};

/** Zwraca najbliższy nieosiągnięty kamień milowy lub null jeśli wszystkie zaliczone. */
export const getNextMilestone = (streak: number): number | null => {
  for (const m of STREAK_MILESTONES) {
    if (streak < m) return m;
  }
  return null;
};

/** Confetti dopasowane do złotej palety CML — gold + warm-beige + biel */
export const fireMilestoneConfetti = () => {
  if (typeof window === "undefined") return;
  const colors = ["#c9a84c", "#e6c668", "#f5e6b8", "#ffffff"];

  const burst = (originX: number) => {
    confetti({
      particleCount: 80,
      spread: 70,
      startVelocity: 45,
      origin: { x: originX, y: 0.65 },
      colors,
      scalar: 1.05,
      ticks: 220,
    });
  };

  burst(0.25);
  burst(0.75);
  // delikatny dosyp w środku po chwili
  window.setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 100,
      startVelocity: 35,
      origin: { x: 0.5, y: 0.55 },
      colors,
      scalar: 0.9,
      ticks: 200,
    });
  }, 250);
};
