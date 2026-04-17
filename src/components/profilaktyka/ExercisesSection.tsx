import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Repeat, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FootCircleIcon,
  ToeRaiseIcon,
  BicycleIcon,
  LegLiftIcon,
  AnkleFlexIcon,
  WallSitIcon,
} from "./ExerciseIcons";
import WorkoutModal, { type WorkoutExercise } from "./WorkoutModal";

const easeOut = [0.16, 1, 0.3, 1] as const;

type Exercise = {
  Icon: () => JSX.Element;
  title: string;
  position: string;
  technique: string;
  dose: string;
  duration: string;
  durationSec: number; // czas dla trybu Trening dnia
  benefit: string;
};

const exercises: Exercise[] = [
  {
    Icon: FootCircleIcon,
    title: "Krążenia stóp",
    position: "Siedząc lub leżąc",
    technique:
      "Unieś jedną stopę kilka cm nad podłogą i wykonuj powolne, pełne koła w stawie skokowym — najpierw w jedną, potem w drugą stronę.",
    dose: "10 kółek × 2 strony × każda noga",
    duration: "~2 minuty",
    durationSec: 60,
    benefit: "Aktywuje pompę mięśniową łydki i poprawia odpływ krwi z żył głębokich.",
  },
  {
    Icon: AnkleFlexIcon,
    title: "Zginanie i prostowanie stóp",
    position: "Siedząc / w samolocie / przy biurku",
    technique:
      "Mocno przyciągnij palce stóp do siebie (jak najwyżej), następnie wyciągnij je maksymalnie w dół, jak baletnica.",
    dose: "20 powtórzeń",
    duration: "~1 minuta",
    durationSec: 45,
    benefit: "Najlepsze ćwiczenie podczas długich podróży — chroni przed zakrzepicą.",
  },
  {
    Icon: ToeRaiseIcon,
    title: "Wspięcia na palce",
    position: "Stojąc, dłonie na biodrach lub na ścianie",
    technique:
      "Powoli unieś się wysoko na palcach stóp, zatrzymaj na 2 sekundy w górze i powoli opuść pięty (nie uderzaj nimi o podłogę).",
    dose: "3 serie × 15 powtórzeń",
    duration: "~3 minuty",
    durationSec: 60,
    benefit: "Wzmacnia łydki — mechanizm „drugiego serca” dla układu żylnego.",
  },
  {
    Icon: BicycleIcon,
    title: "Rowerek",
    position: "Leżąc na plecach, nogi w górze",
    technique:
      "Unieś nogi do kąta ok. 90° i imituj pedałowanie roweru w powietrzu, naprzemiennie zginając kolana.",
    dose: "2 serie × 30 sekund",
    duration: "~2 minuty",
    durationSec: 60,
    benefit: "Łączy elewację nóg z aktywnością mięśni — odciąża żyły i pobudza krążenie.",
  },
  {
    Icon: LegLiftIcon,
    title: "Wznosy nóg z elewacją",
    position: "Leżąc na plecach przy ścianie",
    technique:
      "Połóż się i oprzyj wyprostowane nogi o ścianę pod kątem 90°. Pozostań w pozycji, oddychaj spokojnie i delikatnie ruszaj palcami.",
    dose: "1 serie × 5–10 minut",
    duration: "~5–10 minut",
    durationSec: 120,
    benefit: "Klasyczna „pozycja Trendelenburga light” — błyskawicznie redukuje obrzęki kostek.",
  },
  {
    Icon: WallSitIcon,
    title: "Marsz w miejscu / na pięcie i palcach",
    position: "Stojąc, w przerwie od pracy",
    technique:
      "Maszeruj w miejscu, podnosząc kolana wysoko. Co kilka kroków przejdź chwilę na samych piętach, a następnie na palcach.",
    dose: "60 sekund co godzinę pracy",
    duration: "~1 minuta",
    durationSec: 60,
    benefit: "Mikro-przerwa idealna dla osób pracujących stojąco lub siedząco.",
  },
];

const ExercisesSection = () => {
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const totalMinutes = Math.round(
    (exercises.reduce((s, e) => s + e.durationSec, 0) + (exercises.length - 1) * 10) / 60,
  );

  const workoutExercises: WorkoutExercise[] = exercises.map((e) => ({
    Icon: e.Icon,
    title: e.title,
    technique: e.technique,
    durationSec: e.durationSec,
  }));

  return (
    <section className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 28, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: easeOut }}
        className="text-center"
      >
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
          Krok 4 · Praktyka
        </p>
        <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
          Rekomendowane ćwiczenia profilaktyczne
        </h2>
        <div className="premium-divider mb-4" />
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Sześć prostych ćwiczeń, które aktywują pompę mięśniową łydki — naturalny mechanizm
          odprowadzający krew z nóg. Wystarczy 10–15 minut dziennie.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button
            variant="hero"
            size="lg"
            onClick={() => setWorkoutOpen(true)}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Uruchom „Trening dnia”
          </Button>
          <p className="text-xs text-muted-foreground">
            ~{totalMinutes} min · timer + powiadomienia głosowe
          </p>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {exercises.map((ex, i) => {
          const Icon = ex.Icon;
          return (
            <motion.article
              key={ex.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: easeOut }}
              className="glass-card rounded-2xl p-6 flex flex-col group hover:border-primary/30 transition-colors"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/15 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/10 transition-colors">
                <div className="w-14 h-14">
                  <Icon />
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-[11px] font-sans uppercase tracking-[0.15em] text-primary/80 mb-1">
                  Ćwiczenie {i + 1} · {ex.position}
                </p>
                <h3 className="font-heading text-xl text-foreground">{ex.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {ex.technique}
              </p>
              <div className="mt-auto pt-4 border-t border-border/40 space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground/80">
                  <Repeat className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{ex.dose}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground/80">
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{ex.duration}</span>
                </div>
                <p className="text-xs italic text-muted-foreground pt-2">
                  {ex.benefit}
                </p>
              </div>
            </motion.article>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="glass-card rounded-2xl p-6 max-w-3xl mx-auto border-l-4 border-primary"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Wskazówka flebologa:</span>{" "}
          Najlepszy efekt daje połączenie ćwiczeń z elewacją nóg na zakończenie dnia oraz noszenie
          podkolanówek uciskowych II klasy podczas dłuższego stania lub podróży. Ćwiczenia są
          bezpieczne także po zabiegach laserowych — chyba że flebolog zaleci inaczej.
        </p>
      </motion.div>

      <WorkoutModal
        open={workoutOpen}
        onOpenChange={setWorkoutOpen}
        exercises={workoutExercises}
      />
    </section>
  );
};

export default ExercisesSection;
