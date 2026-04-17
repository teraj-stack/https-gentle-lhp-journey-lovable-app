import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ClipboardList, RotateCcw, ShieldCheck, AlertTriangle, AlertOctagon, ArrowRight } from "lucide-react";

type Option = { label: string; points: number };
type Question = { id: string; q: string; options: Option[] };

const questions: Question[] = [
  {
    id: "genetics",
    q: "Czy ktoś z Twoich najbliższych krewnych (rodzice, rodzeństwo) ma żylaki lub przewlekłą niewydolność żylną?",
    options: [
      { label: "Nie / nie wiem", points: 0 },
      { label: "Jedna osoba", points: 2 },
      { label: "Co najmniej dwie osoby", points: 3 },
    ],
  },
  {
    id: "work",
    q: "Jak wygląda Twój typowy dzień pracy?",
    options: [
      { label: "Dużo ruchu, zmienne pozycje", points: 0 },
      { label: "Głównie siedząca (>6 h dziennie)", points: 2 },
      { label: "Głównie stojąca (>6 h dziennie)", points: 3 },
    ],
  },
  {
    id: "lifestyle",
    q: "Jak często w tygodniu podejmujesz aktywność fizyczną minimum 30 minut?",
    options: [
      { label: "4 razy w tygodniu lub częściej", points: 0 },
      { label: "1–3 razy w tygodniu", points: 1 },
      { label: "Rzadziej niż raz w tygodniu", points: 3 },
    ],
  },
  {
    id: "hormones",
    q: "Czynniki hormonalne i waga (zaznacz najsilniej dotyczącą Cię opcję):",
    options: [
      { label: "Brak — prawidłowa masa ciała", points: 0 },
      { label: "Antykoncepcja hormonalna lub HTZ", points: 2 },
      { label: "Ciąża / przebyte ciąże lub nadwaga", points: 3 },
    ],
  },
  {
    id: "symptoms",
    q: "Czy zauważasz u siebie którykolwiek z tych objawów?",
    options: [
      { label: "Brak objawów", points: 0 },
      { label: "Ciężkość nóg, obrzęki kostek wieczorem", points: 2 },
      { label: "Widoczne pajączki, uwypuklone żyły lub kurcze nocne", points: 3 },
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
  cta: string;
};

const tiers: RiskTier[] = [
  {
    level: "low",
    label: "Niskie ryzyko",
    range: "0–4 pkt",
    Icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    headline: "Świetnie — Twoje nogi są w dobrych rękach.",
    desc: "Twój styl życia sprzyja zdrowym żyłom. Kontynuuj profilaktykę: ruch, kompresja w długich podróżach i kontrolne badanie USG Doppler co 3–5 lat.",
    cta: "Konsultacja profilaktyczna",
  },
  {
    level: "medium",
    label: "Średnie ryzyko",
    range: "5–9 pkt",
    Icon: AlertTriangle,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/40",
    headline: "Warto przyjrzeć się sygnałom z bliska.",
    desc: "Masz kilka czynników, które kumulatywnie obciążają żyły. Zalecamy konsultację flebologiczną z USG Doppler — wczesna ocena zastawek pozwala wdrożyć precyzyjną profilaktykę.",
    cta: "Umów konsultację flebologiczną",
  },
  {
    level: "high",
    label: "Wysokie ryzyko",
    range: "10+ pkt",
    Icon: AlertOctagon,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/40",
    headline: "Nie odkładaj wizyty na później.",
    desc: "Kombinacja czynników i objawów wskazuje na duże prawdopodobieństwo przewlekłej choroby żylnej. Konsultacja z USG Doppler jest kluczowa — wczesne leczenie minimalnie inwazyjne (CLaCS, EVLT) daje najlepsze efekty.",
    cta: "Pilnie umów konsultację",
  },
];

const getTier = (score: number): RiskTier => {
  if (score <= 4) return tiers[0];
  if (score <= 9) return tiers[1];
  return tiers[2];
};

const easeOut = [0.16, 1, 0.3, 1] as const;

const RiskQuiz = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);

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
  const tier = getTier(score);
  const TierIcon = tier.Icon;
  const current = questions[step];

  return (
    <div className="glass-card rounded-2xl p-6 md:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-sans uppercase tracking-[0.18em] text-primary">
            Test ryzyka · 5 pytań · ~1 minuta
          </p>
          <h3 className="font-heading text-xl md:text-2xl text-foreground">
            Sprawdź swoje ryzyko żylaków
          </h3>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-8">
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
            <h4 className="font-heading text-xl md:text-2xl text-foreground mb-6 leading-snug">
              {current.q}
            </h4>
            <div className="space-y-3">
              {current.options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleAnswer(opt.points)}
                  className="w-full text-left p-4 rounded-xl border border-border bg-background/40 hover:bg-primary/10 hover:border-primary/40 transition-all group flex items-center justify-between gap-4"
                >
                  <span className="text-sm md:text-base text-foreground group-hover:text-foreground">
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
            <div className={`rounded-xl border ${tier.border} ${tier.bg} p-6 md:p-8`}>
              <div className="flex items-center gap-3 mb-3">
                <TierIcon className={`w-7 h-7 ${tier.color}`} />
                <div>
                  <p className="text-xs font-sans uppercase tracking-[0.18em] text-muted-foreground">
                    Twój wynik · {score} pkt · {tier.range}
                  </p>
                  <h4 className={`font-heading text-2xl md:text-3xl ${tier.color}`}>
                    {tier.label}
                  </h4>
                </div>
              </div>
              <p className="font-heading text-lg text-foreground mb-3">{tier.headline}</p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6">
                {tier.desc}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="hero" size="lg" asChild className="flex-1">
                  <a
                    href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tier.cta}
                  </a>
                </Button>
                <Button variant="outline" size="lg" onClick={reset} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Wypełnij ponownie
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic mt-4 text-center max-w-xl mx-auto">
              Test ma charakter edukacyjny i nie zastępuje konsultacji lekarskiej ani badania USG Doppler.
              Wynik bazuje na uznanych czynnikach ryzyka przewlekłej choroby żylnej.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiskQuiz;
