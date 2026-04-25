import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Download,
  Stethoscope,
  ArrowDown,
  FileDown,
} from "lucide-react";
import { generateQuizResultPdf } from "@/lib/quizResultPdf";
import { useQuizHistory } from "@/hooks/useQuizHistory";
import { useDiaryReminders } from "@/hooks/useDiaryReminders";
import { useRiskThresholds } from "@/hooks/useRiskThresholds";
import { getRiskLevelWithThresholds, getRiskRangeWithThresholds } from "@/lib/hemoroidyQuizData";

type Option = { label: string; points: number };
type Question = { id: string; q: string; options: Option[] };
type Recommendation = { text: string; anchor: string };

const questions: Question[] = [
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

type RiskTier = {
  level: "low" | "medium" | "high";
  label: string;
  range: string;
  Icon: typeof ShieldCheck;
  color: string;
  bg: string;
  border: string;
  headline: string;
  desc: string;
  recommendations: Recommendation[];
  ctaLabel: string;
  ctaHref: string;
  ctaInternal: boolean;
  showUrgent?: boolean;
};

const tiers: RiskTier[] = [
  {
    level: "low",
    label: "Niskie ryzyko",
    range: "0–8 pkt",
    Icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    headline: "Twoje nawyki dobrze chronią jelita — kontynuuj profilaktykę.",
    desc: "",
    recommendations: [
      { text: "Utrzymuj 25–35 g błonnika dziennie", anchor: "fiber" },
      { text: "Pij 2–2,5 l wody dziennie", anchor: "hydration" },
      { text: "Krótkie wizyty w toalecie (do 3 min, bez telefonu)", anchor: "toilet" },
      { text: "Min. 30 min ruchu dziennie", anchor: "movement" },
      { text: "Każde krwawienie z odbytu — skonsultuj z proktologiem", anchor: "symptoms" },
    ],
    ctaLabel: "Pobierz checklistę PDF",
    ctaHref:
      "https://jowtjcyevactqmhqrytz.supabase.co/storage/v1/object/public/blog-covers/downloads%2Fchecklista-profilaktyka-hemoroidow-CML.pdf",
    ctaInternal: false,
  },
  {
    level: "medium",
    label: "Średnie ryzyko",
    range: "9–17 pkt",
    Icon: AlertTriangle,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/40",
    headline: "Kilka czynników kumuluje ryzyko — zacznij wzmacniać nawyki od dziś.",
    desc: "",
    recommendations: [
      { text: "Dodaj błonnik (psyllium 1 łyżka dziennie) + 0,5 l wody więcej", anchor: "fiber" },
      { text: "Skróć czas w toalecie do 3 min, użyj podnóżka (pozycja kuczna)", anchor: "toilet" },
      { text: "Codzienny spacer 30 min + ćwiczenia Kegla 3×10", anchor: "movement" },
      { text: "Przy podnoszeniu ciężarów wydychaj powietrze (bez próby Valsalvy)", anchor: "movement" },
      { text: "Krwawienie lub guzek — umów konsultację proktologiczną", anchor: "symptoms" },
    ],
    ctaLabel: "Umów konsultację",
    ctaHref: "/kontakt",
    ctaInternal: true,
  },
  {
    level: "high",
    label: "Wysokie ryzyko",
    range: "18+ pkt",
    Icon: AlertOctagon,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/40",
    headline: "Wysokie prawdopodobieństwo aktywnej choroby — nie odkładaj wizyty.",
    desc: "",
    recommendations: [
      { text: "Umów konsultację proktologiczną w ciągu 7 dni", anchor: "symptoms" },
      { text: "Każde krwawienie z odbytu wymaga oceny lekarskiej", anchor: "symptoms" },
      { text: "Wprowadź 4 filary: błonnik, woda, krótka toaleta, ruch", anchor: "fiber" },
      { text: "Unikaj długiego siedzenia i podnoszenia dużych ciężarów", anchor: "movement" },
      { text: "Pilnie 24–48 h: obfite krwawienie, gorączka, silny ból", anchor: "urgent" },
    ],
    ctaLabel: "Pilnie umów konsultację",
    ctaHref: "/kontakt",
    ctaInternal: true,
    showUrgent: true,
  },
];

const getTierForLevel = (level: "low" | "medium" | "high"): RiskTier => {
  return tiers.find((t) => t.level === level) ?? tiers[0];
};

const easeOut = [0.16, 1, 0.3, 1] as const;

const HemoroidyRiskQuiz = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const { addEntry } = useQuizHistory();
  const { markQuizCompleted } = useDiaryReminders();
  const { thresholds } = useRiskThresholds();

  const total = questions.length;
  const progress = done ? 100 : Math.round((step / total) * 100);

  const handleAnswer = (points: number) => {
    const next = [...answers, points];
    setAnswers(next);
    if (step + 1 >= total) {
      setDone(true);
    } else {
      setStep(step + 1);
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers([]);
    setDone(false);
  };

  const score = answers.reduce((a, b) => a + b, 0);
  const maxScore = questions.reduce(
    (sum, q) => sum + Math.max(...q.options.map((o) => o.points)),
    0
  );
  const tierLevel = getRiskLevelWithThresholds(score, thresholds);
  const tier = getTierForLevel(tierLevel);
  const tierRange = getRiskRangeWithThresholds(tierLevel, thresholds);
  const TierIcon = tier.Icon;
  const current = questions[step];

  const handleDownloadPdf = () => {
    generateQuizResultPdf({
      score,
      maxScore,
      tierLabel: tier.label,
      tierRange: tier.range,
      headline: tier.headline,
      recommendations: tier.recommendations.slice(0, 5),
      showUrgent: tier.showUrgent,
    });
  };

  // Persist completed quiz to local history (once per completion).
  useEffect(() => {
    if (!done) return;
    addEntry({
      score,
      maxScore,
      level: tier.level,
      label: tier.label,
    });
    markQuizCompleted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // Listen for external "restart" events (e.g. from QuizRetakeModule's button)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => reset();
    window.addEventListener("cml:quiz-restart", handler);
    return () => window.removeEventListener("cml:quiz-restart", handler);
  }, []);

  return (
    <div
      id="hemoroidy-quiz"
      className="glass-card rounded-2xl p-5 sm:p-6 md:p-10 max-w-3xl mx-auto scroll-mt-32 focus:outline-none"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.14em] sm:tracking-[0.18em] text-primary">
            Test ryzyka · 9 pytań · ~2 minuty
          </p>
          <h2 className="font-heading text-lg sm:text-xl md:text-2xl text-foreground leading-tight">
            Sprawdź swoje ryzyko hemoroidów
          </h2>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-8" aria-hidden="true">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: easeOut }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            key={`q-${step}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: easeOut }}
          >
            <p className="text-xs font-sans uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Pytanie {step + 1} z {total}
            </p>
            <h3 className="font-heading text-xl md:text-2xl text-foreground mb-6 leading-snug">
              {current.q}
            </h3>
            <div className="space-y-3" role="radiogroup" aria-label={current.q}>
              {current.options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleAnswer(opt.points)}
                  className="w-full text-left p-4 rounded-xl border border-border bg-background/40 hover:bg-primary/10 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all group flex items-center justify-between gap-4"
                >
                  <span className="text-sm md:text-base text-foreground">
                    {opt.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: easeOut }}
          >
            <div className={`rounded-xl border ${tier.border} ${tier.bg} p-5 sm:p-6 md:p-8`}>
              <div className="flex items-start gap-3 mb-3">
                <TierIcon className={`w-7 h-7 ${tier.color} shrink-0 mt-0.5`} />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.14em] sm:tracking-[0.18em] text-muted-foreground">
                    Twój wynik · {score} pkt · {tier.range}
                  </p>
                  <h3 className={`font-heading text-2xl md:text-3xl ${tier.color} leading-tight`}>
                    {tier.label}
                  </h3>
                </div>
              </div>
              <p className="text-base md:text-lg text-foreground/90 mb-6 leading-relaxed">
                {tier.headline}
              </p>

              {/* Recommendations — top 5 actionable steps */}
              <div className="mb-6">
                <p className="text-xs font-sans uppercase tracking-[0.18em] text-primary mb-3">
                  Twoje 5 kroków · kliknij, aby przejść do checklisty
                </p>
                <ol className="space-y-2">
                  {tier.recommendations.slice(0, 5).map((rec, idx) => (
                    <li key={rec.text}>
                      <a
                        href={`#${rec.anchor}`}
                        className="group flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
                      >
                        <span className="w-6 h-6 rounded-full bg-primary/15 group-hover:bg-primary/25 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold text-primary transition-colors">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm md:text-base text-foreground/90 group-hover:text-foreground leading-relaxed">
                          {rec.text}
                        </span>
                        <ArrowDown className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-y-0.5 transition-all shrink-0 mt-1" />
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Urgent warning for high tier */}
              {tier.showUrgent && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 mb-6">
                  <p className="text-xs font-sans uppercase tracking-[0.18em] text-destructive mb-1.5">
                    Pilnie do lekarza (24–48 h), jeśli wystąpi:
                  </p>
                  <p className="text-sm text-foreground/90">
                    Obfite krwawienie · silny narastający ból · twardy bolesny guz · gorączka
                    z bólem okolicy odbytu
                  </p>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                {tier.ctaInternal ? (
                  <Button
                    variant="hero"
                    size="lg"
                    asChild
                    className="flex-1 sm:min-w-[220px] h-auto min-h-11 py-2.5 px-4 sm:px-6 whitespace-normal text-sm sm:text-base text-center leading-snug tracking-wide"
                  >
                    <Link to={tier.ctaHref}>
                      <Stethoscope className="w-4 h-4 mr-2 shrink-0" />
                      <span>{tier.ctaLabel}</span>
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="hero"
                    size="lg"
                    asChild
                    className="flex-1 sm:min-w-[220px] h-auto min-h-11 py-2.5 px-4 sm:px-6 whitespace-normal text-sm sm:text-base text-center leading-snug tracking-wide"
                  >
                    <a
                      href={`/downloads/checklista-profilaktyka-hemoroidow-CML.pdf?tier=${tier.level}&score=${score}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="w-4 h-4 mr-2 shrink-0" />
                      <span>{tier.ctaLabel}</span>
                    </a>
                  </Button>
                )}
                {tier.ctaInternal && (
                  <Button
                    variant="outline"
                    size="lg"
                    asChild
                    className="flex-1 sm:min-w-[220px] gap-2 h-auto min-h-11 py-2.5 px-4 sm:px-6 whitespace-normal text-sm sm:text-base text-center leading-snug border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <a
                      href={`/downloads/checklista-profilaktyka-hemoroidow-CML.pdf?tier=${tier.level}&score=${score}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Pobierz checklistę PDF</span>
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDownloadPdf}
                  className="gap-2 h-auto min-h-11 py-2.5 px-4 sm:px-6 whitespace-normal border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <FileDown className="w-4 h-4 shrink-0" />
                  Pobierz wynik (PDF)
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={reset}
                  className="gap-2 h-auto min-h-11 py-2.5 px-4 sm:px-6 whitespace-normal"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  Wypełnij ponownie
                </Button>
              </div>

              {/* Secondary links */}
              <div className="mt-6 pt-6 border-t border-border/50 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <Link to="/dla-pacjenta/hemoroidy" className="text-primary hover:underline">
                  Hemoroidy od A do Z →
                </Link>
                <Link to="/leczenie/lhp" className="text-primary hover:underline">
                  Laserowe leczenie LHP →
                </Link>
                <Link to="/dla-pacjenta/proktolog-faq" className="text-primary hover:underline">
                  FAQ proktolog →
                </Link>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic mt-4 text-center max-w-xl mx-auto">
              Test ma charakter edukacyjny i nie zastępuje konsultacji lekarskiej. Wynik bazuje
              na uznanych czynnikach ryzyka choroby hemoroidalnej (wytyczne ASCRS / ESCP).
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HemoroidyRiskQuiz;
