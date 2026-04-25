/**
 * Współdzielone dane quizu ryzyka hemoroidów.
 * Używane przez:
 *   - src/components/hemoroidy/HemoroidyRiskQuiz.tsx (jednorazowy quiz)
 *   - src/pages/DziennikHemoroidy.tsx (14-dniowy dziennik)
 *
 * Aby zachować spójność scoringu i historii — jedna definicja, jedno źródło prawdy.
 */

export type QuizOption = { label: string; points: number };
export type QuizQuestion = { id: string; q: string; options: QuizOption[] };
export type RiskLevel = "low" | "medium" | "high";

export const HEMOROIDY_QUESTIONS: QuizQuestion[] = [
  {
    id: "fiber",
    q: "Jak często jesz warzywa, owoce, pełne ziarno lub strączki?",
    options: [
      { label: "Codziennie, z każdym posiłkiem", points: 0 },
      { label: "Kilka razy w tygodniu", points: 2 },
      { label: "Rzadko — głównie żywność przetworzona", points: 3 },
    ],
  },
  {
    id: "constipation",
    q: "Jak często masz zaparcia (twarde stolce, wypróżnienia rzadziej niż co 2 dni)?",
    options: [
      { label: "Bardzo rzadko lub nigdy", points: 0 },
      { label: "Kilka razy w miesiącu", points: 2 },
      { label: "Co tydzień lub przewlekle (>3 miesiące)", points: 3 },
    ],
  },
  {
    id: "hydration",
    q: "Ile wody pijesz w ciągu typowego dnia?",
    options: [
      { label: "Około 2 litrów lub więcej", points: 0 },
      { label: "1–1,5 litra", points: 2 },
      { label: "Mniej niż 1 litr lub głównie kawa/herbata", points: 3 },
    ],
  },
  {
    id: "toilet",
    q: "Ile czasu zwykle spędzasz w toalecie podczas wypróżnienia?",
    options: [
      { label: "Do 3 minut, bez parcia", points: 0 },
      { label: "5–10 minut, czasem ze smartfonem", points: 2 },
      { label: "Ponad 10 minut, często z parciem", points: 3 },
    ],
  },
  {
    id: "phone",
    q: "Czy zabierasz do toalety smartfon, książkę lub gazetę?",
    options: [
      { label: "Nie, wychodzę zaraz po wypróżnieniu", points: 0 },
      { label: "Czasem, gdy mam wolną chwilę", points: 2 },
      { label: "Tak, prawie zawsze — to mój moment dla siebie", points: 3 },
    ],
  },
  {
    id: "movement",
    q: "Jak wygląda Twoja codzienna aktywność?",
    options: [
      { label: "Min. 30 min ruchu dziennie + przerwy w pracy", points: 0 },
      { label: "Praca siedząca, ruch 1–2 razy w tygodniu", points: 2 },
      { label: "Siedzący tryb życia bez regularnego ruchu", points: 3 },
    ],
  },
  {
    id: "sitting",
    q: "Ile godzin dziennie spędzasz w pozycji siedzącej (praca + auto + dom)?",
    options: [
      { label: "Mniej niż 4 godziny — mam pracę aktywną", points: 0 },
      { label: "4–8 godzin z regularnymi przerwami", points: 2 },
      { label: "Powyżej 8 godzin, często bez przerwy", points: 3 },
    ],
  },
  {
    id: "pregnancy",
    q: "Czy jesteś w ciąży, po porodzie (do 6 mies.) lub masz BMI > 30?",
    options: [
      { label: "Nie dotyczy", points: 0 },
      { label: "Jeden z czynników (np. nadwaga lub okres okołoporodowy)", points: 2 },
      { label: "Tak — ciąża/połóg lub otyłość (BMI > 30)", points: 3 },
    ],
  },
  {
    id: "symptoms",
    q: "Czy zauważasz u siebie którykolwiek z tych objawów?",
    options: [
      { label: "Brak objawów", points: 0 },
      { label: "Sporadyczny świąd, dyskomfort lub zaparcia", points: 2 },
      { label: "Krwawienie, wyczuwalny guzek lub wypadanie", points: 4 },
    ],
  },
];

export const HEMOROIDY_QUIZ_MAX_SCORE = HEMOROIDY_QUESTIONS.reduce(
  (sum, q) => sum + Math.max(...q.options.map((o) => o.points)),
  0
);

/**
 * Progi kategorii ryzyka. `lowMax` = maksymalny score klasyfikowany jako "low",
 * `mediumMax` = maksymalny score klasyfikowany jako "medium". Wszystko powyżej `mediumMax` to "high".
 *
 * Domyślne wartości pochodzą z konsensusu klinicznego CML (≤8 / 9–17 / 18+) — kalibracja
 * zwalidowana wewnętrznie. Pacjent może je dostosować w panelu ustawień, jeśli np. lekarz
 * zaleci bardziej rygorystyczną interpretację (niższe progi = wcześniejszy alert).
 */
export type RiskThresholds = { lowMax: number; mediumMax: number };

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = { lowMax: 8, mediumMax: 17 };

/** Sanityzacja: lowMax ∈ [0, maxScore-2], mediumMax ∈ [lowMax+1, maxScore-1]. */
export const sanitizeRiskThresholds = (
  t: Partial<RiskThresholds> | null | undefined,
  maxScore: number = HEMOROIDY_QUIZ_MAX_SCORE,
): RiskThresholds => {
  const lowMax = Number.isFinite(t?.lowMax) ? Math.round(Number(t!.lowMax)) : DEFAULT_RISK_THRESHOLDS.lowMax;
  const mediumMax = Number.isFinite(t?.mediumMax) ? Math.round(Number(t!.mediumMax)) : DEFAULT_RISK_THRESHOLDS.mediumMax;
  const clampedLow = Math.max(0, Math.min(lowMax, maxScore - 2));
  const clampedMedium = Math.max(clampedLow + 1, Math.min(mediumMax, maxScore - 1));
  return { lowMax: clampedLow, mediumMax: clampedMedium };
};

export const getRiskLevelWithThresholds = (score: number, t: RiskThresholds): RiskLevel => {
  if (score <= t.lowMax) return "low";
  if (score <= t.mediumMax) return "medium";
  return "high";
};

export const getRiskRangeWithThresholds = (level: RiskLevel, t: RiskThresholds): string => {
  switch (level) {
    case "low":
      return `0–${t.lowMax} pkt`;
    case "medium":
      return `${t.lowMax + 1}–${t.mediumMax} pkt`;
    case "high":
      return `${t.mediumMax + 1}+ pkt`;
  }
};

/** Wersje "default" — używają DEFAULT_RISK_THRESHOLDS. Zachowane dla wstecznej kompatybilności. */
export const getRiskLevel = (score: number): RiskLevel =>
  getRiskLevelWithThresholds(score, DEFAULT_RISK_THRESHOLDS);

export const getRiskRange = (level: RiskLevel): string =>
  getRiskRangeWithThresholds(level, DEFAULT_RISK_THRESHOLDS);
