import { motion } from "framer-motion";
import { CalendarDays, Clock, Repeat, AlertTriangle, Footprints } from "lucide-react";
import {
  FootCircleIcon,
  AnkleFlexIcon,
  ToeRaiseIcon,
  BicycleIcon,
  LegLiftIcon,
} from "./ExerciseIcons";

const easeOut = [0.16, 1, 0.3, 1] as const;

type PostOpExercise = {
  Icon: () => JSX.Element;
  title: string;
  technique: string;
  dose: string;
  duration: string;
  benefit: string;
};

type Phase = {
  range: string;
  label: string;
  intensity: "very-light" | "light" | "moderate" | "normal";
  intensityLabel: string;
  summary: string;
  caution?: string;
  exercises: PostOpExercise[];
};

const phases: Phase[] = [
  {
    range: "Dni 1–3",
    label: "Faza ochronna",
    intensity: "very-light",
    intensityLabel: "Bardzo delikatnie",
    summary:
      "Pończochy uciskowe noszone non-stop (poza prysznicem). Cel: aktywować pompę mięśniową łydki bez napięcia tkanek po EVLT/CLaCS. Krótkie spacery co 1–2 godziny.",
    caution:
      "Bez wysiłku, bez kucania, bez podnoszenia ciężarów >5 kg. Zakaz gorącej kąpieli, sauny i basenu.",
    exercises: [
      {
        Icon: AnkleFlexIcon,
        title: "Pompa kostki w pończosze",
        technique:
          "W pozycji siedzącej lub leżącej powoli zginaj i prostuj stopy w stawie skokowym. Ruch płynny, bez gwałtownych szarpnięć.",
        dose: "20 powtórzeń × 4–6 razy dziennie",
        duration: "~1 minuta",
        benefit:
          "Uruchamia pompę żylną łydki, redukuje ryzyko zastoju krwi i obrzęku po EVLT.",
      },
      {
        Icon: FootCircleIcon,
        title: "Krążenia stóp",
        technique:
          "Powolne pełne koła w stawie skokowym — najpierw w jedną, potem w drugą stronę. Bez napinania uda.",
        dose: "10 kółek × 2 strony × każda noga",
        duration: "~2 minuty",
        benefit: "Mobilizuje przepływ żylny w okolicy łydki bez obciążenia żył udowych.",
      },
      {
        Icon: Footprints as unknown as () => JSX.Element,
        title: "Krótki spacer co godzinę",
        technique:
          "Wstań i przejdź się 3–5 minut po mieszkaniu w spokojnym tempie. Nie stój dłużej niż 15 minut bez ruchu.",
        dose: "5 minut × co 1–2 godziny",
        duration: "~5 minut",
        benefit:
          "Najważniejsze ćwiczenie pierwszych dni — pompa mięśniowa zapobiega zakrzepicy.",
      },
    ],
  },
  {
    range: "Dni 4–7",
    label: "Faza odbudowy",
    intensity: "light",
    intensityLabel: "Delikatnie",
    summary:
      "Pończochy w ciągu dnia. Możesz wydłużyć spacery, dodać proste ćwiczenia mobilizujące. Wsłuchuj się w nogi — tępe ciągnięcie jest normalne, ostry ból nie.",
    caution: "Nadal bez biegania, skoków, intensywnego rowera i siłowni.",
    exercises: [
      {
        Icon: ToeRaiseIcon,
        title: "Łagodne wspięcia na palce",
        technique:
          "Stojąc, dłonie oparte na blacie/ścianie. Powoli unieś pięty, zatrzymaj na 2 sekundy i delikatnie opuść (nie uderzaj piętami o podłogę).",
        dose: "2 serie × 10 powtórzeń",
        duration: "~2 minuty",
        benefit: "Stopniowo wzmacnia łydkę bez przeciążania żył leczonych laserem.",
      },
      {
        Icon: LegLiftIcon,
        title: "Elewacja nóg na ścianie",
        technique:
          "Połóż się przy ścianie i oprzyj wyprostowane nogi pod kątem 90°. Spokojny oddech, delikatne ruchy palców.",
        dose: "1 serie × 10–15 minut",
        duration: "~10–15 minut",
        benefit:
          "Klasyczna pozycja drenażowa — błyskawicznie zmniejsza obrzęk i uczucie ciężkości po zabiegu.",
      },
      {
        Icon: Footprints as unknown as () => JSX.Element,
        title: "Spacer 20–30 minut",
        technique:
          "Spacer w komfortowym, równym tempie po płaskim terenie. Najlepiej w pończochach uciskowych.",
        dose: "1× dziennie",
        duration: "~20–30 minut",
        benefit: "Wspiera krążenie i przyspiesza wchłanianie zamkniętych naczyń.",
      },
    ],
  },
  {
    range: "Dni 8–14",
    label: "Faza powrotu do aktywności",
    intensity: "moderate",
    intensityLabel: "Umiarkowanie",
    summary:
      "Możesz wrócić do większości codziennych aktywności. Pończochy zwykle nadal w ciągu dnia (zgodnie z zaleceniem flebologa). Czas na delikatne wzmocnienie.",
    caution:
      "Wstrzymaj się ze sportami siłowymi, długim bieganiem, intensywnym rowerem stacjonarnym i sauną.",
    exercises: [
      {
        Icon: BicycleIcon,
        title: "Łagodny „rowerek” leżąc",
        technique:
          "Leżąc na plecach unieś nogi i imituj spokojne pedałowanie roweru. Tempo bardzo wolne, bez forsowania.",
        dose: "2 serie × 30 sekund",
        duration: "~2 minuty",
        benefit: "Łączy elewację nóg z aktywnością mięśniową — odciąża żyły i pobudza krążenie.",
      },
      {
        Icon: ToeRaiseIcon,
        title: "Wspięcia na palce — pełna seria",
        technique:
          "Powolne, kontrolowane wspięcia na palce. Wyciąż się wysoko, zatrzymaj na 2 sekundy, opuść powoli.",
        dose: "3 serie × 12–15 powtórzeń",
        duration: "~3 minuty",
        benefit: "Wzmacnia mechanizm „drugiego serca” — łydki jako pompę żylną.",
      },
      {
        Icon: Footprints as unknown as () => JSX.Element,
        title: "Spacer 30–45 minut lub Nordic Walking",
        technique:
          "Możesz wydłużyć spacer i wprowadzić lekkie tempo marszu. Nordic Walking dodatkowo angażuje górną część ciała.",
        dose: "1× dziennie",
        duration: "~30–45 minut",
        benefit: "Optymalna forma aktywności w drugim tygodniu rekonwalescencji.",
      },
    ],
  },
  {
    range: "Od 14. dnia",
    label: "Powrót do pełnej aktywności",
    intensity: "normal",
    intensityLabel: "Normalna intensywność",
    summary:
      "Po kontroli flebologicznej możesz stopniowo wrócić do biegania, basenu, jogi i siłowni. Pielęgnuj nawyk codziennych ćwiczeń profilaktycznych — to najlepsza ochrona przed nawrotem.",
    exercises: [
      {
        Icon: FootCircleIcon,
        title: "Pełny program profilaktyczny",
        technique:
          "Wróć do 6 standardowych ćwiczeń profilaktycznych (krążenia, wspięcia, rowerek, elewacja, marsz, zginanie stóp).",
        dose: "10–15 minut dziennie",
        duration: "~15 minut",
        benefit:
          "Codzienna aktywacja pompy mięśniowej to najsilniejsza ochrona przed nawrotem żylaków.",
      },
      {
        Icon: Footprints as unknown as () => JSX.Element,
        title: "Pływanie / rower / joga",
        technique:
          "Idealne sporty po zabiegu: woda zapewnia naturalny ucisk, rower aktywuje łydki bez wstrząsów, joga poprawia mobilność.",
        dose: "2–3 razy w tygodniu",
        duration: "~30–60 minut",
        benefit: "Niskoudarowe sporty wspierające układ żylny bez przeciążania zastawek.",
      },
    ],
  },
];

const intensityColor: Record<Phase["intensity"], string> = {
  "very-light": "bg-warm-beige/15 text-warm-beige border-warm-beige/30",
  light: "bg-primary/10 text-primary border-primary/30",
  moderate: "bg-primary/15 text-primary border-primary/40",
  normal: "bg-primary/20 text-primary border-primary/50",
};

const PostOpExercises = () => {
  return (
    <section className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 28, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: easeOut }}
        className="text-center"
      >
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
          Strefa pacjenta · Rekonwalescencja
        </p>
        <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
          Ćwiczenia po zabiegu EVLT / CLaCS
        </h2>
        <div className="premium-divider mb-4" />
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Stopniowy program rekonwalescencji w 4 fazach. Pompa mięśniowa łydki wspiera gojenie
          i chroni przed zakrzepicą — ale każdy etap ma swoje granice. Zaczynamy bardzo
          delikatnie i zwiększamy intensywność dopiero, gdy żyły są gotowe.
        </p>
      </motion.div>

      <div className="space-y-12">
        {phases.map((phase, phaseIdx) => (
          <motion.div
            key={phase.range}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="space-y-5"
          >
            {/* Phase header */}
            <div className="glass-card rounded-2xl p-6 md:p-7 border-l-4 border-primary">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="text-xs font-sans uppercase tracking-[0.18em] text-primary font-semibold">
                      Faza {phaseIdx + 1} · {phase.range}
                    </span>
                    <span
                      className={`text-[10px] font-sans uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border ${intensityColor[phase.intensity]}`}
                    >
                      {phase.intensityLabel}
                    </span>
                  </div>
                  <h3 className="font-heading text-2xl text-foreground mb-2">
                    {phase.label}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {phase.summary}
                  </p>
                  {phase.caution && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-foreground/85 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                      <span>
                        <span className="font-semibold text-destructive">Uwaga: </span>
                        {phase.caution}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Exercises grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {phase.exercises.map((ex, i) => {
                const Icon = ex.Icon;
                return (
                  <motion.article
                    key={ex.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: easeOut }}
                    className="glass-card rounded-2xl p-6 flex flex-col group hover:border-primary/30 transition-colors"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/15 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/10 transition-colors text-primary">
                      <div className="w-14 h-14 flex items-center justify-center">
                        <Icon />
                      </div>
                    </div>
                    <div className="text-center mb-4">
                      <h4 className="font-heading text-lg text-foreground">{ex.title}</h4>
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
          </motion.div>
        ))}
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
          Każdy organizm goi się w swoim tempie. Powyższy harmonogram to bezpieczna mapa, ale
          to <span className="text-foreground font-semibold">indywidualne zalecenia po kontroli USG</span>{" "}
          mają pierwszeństwo. Jeśli pojawi się gorący obrzęk, ostry ból łydki lub zaczerwienienie
          rozprzestrzeniające się wzdłuż żyły — przerwij ćwiczenia i skontaktuj się z gabinetem.
        </p>
      </motion.div>
    </section>
  );
};

export default PostOpExercises;
