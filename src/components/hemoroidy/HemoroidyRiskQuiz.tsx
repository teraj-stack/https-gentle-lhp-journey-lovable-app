import { useState } from "react";
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
  Check,
  Download,
  Stethoscope,
  ArrowDown,
} from "lucide-react";

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
    id: "movement",
    q: "Jak wygląda Twoja codzienna aktywność?",
    options: [
      { label: "Min. 30 min ruchu dziennie + przerwy w pracy", points: 0 },
      { label: "Praca siedząca, ruch 1–2 razy w tygodniu", points: 2 },
      { label: "Siedzący tryb życia, ciąża lub nadwaga", points: 3 },
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
    range: "0–5 pkt",
    Icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    headline: "Świetnie — Twoje nawyki sprzyjają zdrowiu jelit.",
    desc:
      "Twój styl życia minimalizuje ryzyko hemoroidów. Kontynuuj profilaktykę i obserwuj objawy.",
    recommendations: [
      { text: "Utrzymuj 25–35 g błonnika dziennie", anchor: "fiber" },
      { text: "Pij 2–2,5 l wody dziennie", anchor: "hydration" },
      { text: "Krótkie wizyty w toalecie (do 3 minut) — bez telefonu", anchor: "toilet" },
      { text: "Min. 30 min aktywności fizycznej dziennie", anchor: "movement" },
      { text: "Każde krwawienie z odbytu — zgłoś proktologowi (nawet jednorazowe)", anchor: "symptoms" },
    ],
    ctaLabel: "Pobierz checklistę PDF",
    ctaHref:
      "https://jowtjcyevactqmhqrytz.supabase.co/storage/v1/object/public/blog-covers/downloads%2Fchecklista-profilaktyka-hemoroidow-CML.pdf",
    ctaInternal: false,
  },
  {
    level: "medium",
    label: "Średnie ryzyko",
    range: "6–11 pkt",
    Icon: AlertTriangle,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/40",
    headline: "Warto wzmocnić codzienne nawyki.",
    desc:
      "Masz kilka czynników, które kumulatywnie zwiększają ryzyko hemoroidów. Wprowadź zmiany od dziś — większość przypadków ustępuje pod wpływem leczenia zachowawczego.",
    recommendations: [
      { text: "Zwiększ błonnik (psyllium 1 łyżka dziennie)", anchor: "fiber" },
      { text: "Pij dodatkowe 0,5 l wody dziennie", anchor: "hydration" },
      { text: "Skróć czas w toalecie do 3 minut + użyj podnóżka (pozycja kuczna)", anchor: "toilet" },
      { text: "Dodaj codzienny spacer 30 min + ćwiczenia Kegla 3×10", anchor: "movement" },
      { text: "Przy podnoszeniu ciężarów wydychaj powietrze (unikaj próby Valsalvy)", anchor: "movement" },
      { text: "Jeśli pojawi się krwawienie lub guzek — umów konsultację proktologiczną", anchor: "symptoms" },
    ],
    ctaLabel: "Umów konsultację",
    ctaHref: "/kontakt",
    ctaInternal: true,
  },
  {
    level: "high",
    label: "Wysokie ryzyko",
    range: "12+ pkt",
    Icon: AlertOctagon,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/40",
    headline: "Nie odkładaj wizyty u proktologa.",
    desc:
      "Kombinacja czynników stylu życia i objawów wskazuje na duże prawdopodobieństwo aktywnej choroby hemoroidalnej. Wczesna ocena pozwala leczyć małoinwazyjnie (LHP) z szybkim powrotem do aktywności.",
    recommendations: [
      { text: "Umów konsultację proktologiczną w ciągu najbliższych 7 dni", anchor: "symptoms" },
      { text: "Każde krwawienie z odbytu wymaga oceny — wyklucz inne przyczyny", anchor: "symptoms" },
      { text: "Wprowadź pełną checklistę 4 filarów (błonnik, woda, toaleta, ruch)", anchor: "fiber" },
      { text: "Unikaj długiego siedzenia bez przerw i podnoszenia dużych ciężarów", anchor: "movement" },
      { text: "Notuj objawy: częstotliwość, intensywność, kolor krwawienia", anchor: "symptoms" },
      { text: "Pilnie zgłoś się przy: obfitym krwawieniu, gorączce, silnym bólu", anchor: "urgent" },
    ],
    ctaLabel: "Pilnie umów konsultację",
    ctaHref: "/kontakt",
    ctaInternal: true,
    showUrgent: true,
  },
];

const getTier = (score: number): RiskTier => {
  if (score <= 5) return tiers[0];
  if (score <= 11) return tiers[1];
  return tiers[2];
};

const easeOut = [0.16, 1, 0.3, 1] as const;

const HemoroidyRiskQuiz = () => {
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
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-sans uppercase tracking-[0.18em] text-primary">
            Test ryzyka · 5 pytań · ~1 minuta
          </p>
          <h2 className="font-heading text-xl md:text-2xl text-foreground">
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
            <div className={`rounded-xl border ${tier.border} ${tier.bg} p-6 md:p-8`}>
              <div className="flex items-start gap-3 mb-3">
                <TierIcon className={`w-7 h-7 ${tier.color} shrink-0 mt-0.5`} />
                <div>
                  <p className="text-xs font-sans uppercase tracking-[0.18em] text-muted-foreground">
                    Twój wynik · {score} pkt · {tier.range}
                  </p>
                  <h3 className={`font-heading text-2xl md:text-3xl ${tier.color}`}>
                    {tier.label}
                  </h3>
                </div>
              </div>
              <p className="font-heading text-lg text-foreground mb-3">{tier.headline}</p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6">
                {tier.desc}
              </p>

              {/* Recommendations */}
              <div className="mb-6">
                <p className="text-xs font-sans uppercase tracking-[0.18em] text-primary mb-3">
                  Twoje dopasowane zalecenia
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Kliknij zalecenie, aby przeskoczyć do odpowiedniej sekcji checklisty poniżej.
                </p>
                <ul className="space-y-2">
                  {tier.recommendations.map((rec) => (
                    <li key={rec.text}>
                      <a
                        href={`#${rec.anchor}`}
                        className="group flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
                      >
                        <span className="w-5 h-5 rounded-full bg-primary/15 group-hover:bg-primary/25 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                          <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                        </span>
                        <span className="flex-1 text-sm md:text-base text-foreground/90 group-hover:text-foreground leading-relaxed">
                          {rec.text}
                        </span>
                        <ArrowDown className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-y-0.5 transition-all shrink-0 mt-1" />
                      </a>
                    </li>
                  ))}
                </ul>
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
              <div className="flex flex-col sm:flex-row gap-3">
                {tier.ctaInternal ? (
                  <Button variant="hero" size="lg" asChild className="flex-1">
                    <Link to={tier.ctaHref}>
                      <Stethoscope className="w-4 h-4 mr-2" />
                      {tier.ctaLabel}
                    </Link>
                  </Button>
                ) : (
                  <Button variant="hero" size="lg" asChild className="flex-1">
                    <a href={tier.ctaHref} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      {tier.ctaLabel}
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="lg" onClick={reset} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
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
