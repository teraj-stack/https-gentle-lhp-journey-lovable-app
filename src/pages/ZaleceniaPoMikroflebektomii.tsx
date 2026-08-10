import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert, ThermometerSnowflake, Droplets,
  Heart, CheckCircle2, AlertTriangle, Phone, Mail, CalendarDays,
  Activity, Ban, BedDouble, Footprints, Sun, Shirt,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const timelineDays = [
  {
    period: "Dzień zabiegu (dzień 0)",
    icon: BedDouble,
    items: [
      "Bezpośrednio po zabiegu załóż bandaż uciskowy lub pończochy uciskowe — noszenie rozpocznij od razu.",
      "Spacer 20–30 minut zaraz po zabiegu — ruch jest obowiązkowy.",
      "Noga może być obolała i obrzęknięta — to normalna reakcja na usunięcie żylaków.",
      "Małe nacięcia (2–3 mm) nie wymagają szwów — zamknięte są paskami Steri-Strip lub opatrunkami.",
      "Paracetamol w razie dyskomfortu — unikaj aspiryny przez 48 godzin.",
    ],
  },
  {
    period: "Dni 1–7",
    icon: Activity,
    items: [
      "Noś pończochy/bandaż uciskowy nieprzerwanie (zdejmuj tylko na czas kąpieli) — fundament gojenia.",
      "Codzienny spacer minimum 30–45 minut — ruch aktywuje pompę mięśniową łydek.",
      "Siniaki i obrzęk wzdłuż przebiegu żyły są normalne — ustąpią w ciągu 2–3 tygodni.",
      "Małe nacięcia mogą lekko sączyć — zmień opatrunek, gdy będzie wilgotny.",
      "Unikaj długiego stania i siedzenia bez przerw — rób przerwy co 30 minut.",
      "Unoś nogi powyżej poziomu serca 2–3× dziennie po 15–20 minut — redukuje obrzęk.",
    ],
  },
  {
    period: "Tygodnie 2–4",
    icon: CalendarDays,
    items: [
      "Kontynuuj noszenie pończoch uciskowych w dzień wg zaleceń (zwykle 3–4 tygodnie łącznie).",
      "Siniaki zmieniają kolor na żółto-zielony i stopniowo ustępują.",
      "Stwardnienia pod skórą w miejscu usuniętych żył mogą utrzymywać się — to normalne.",
      "Wizyta kontrolna wg ustalonego terminu — ocena gojenia i efektu zabiegu.",
      "Stopniowy powrót do intensywniejszej aktywności fizycznej.",
    ],
  },
  {
    period: "Po 4–6 tygodniach",
    icon: Heart,
    items: [
      "Pełne gojenie nacięć — blizny stają się praktycznie niewidoczne.",
      "Efekt kosmetyczny i funkcjonalny widoczny w pełni po 2–3 miesiącach.",
      "Powrót do pełnej aktywności — bieganie, siłownia, pływanie.",
      "Ewentualna ocena potrzeby uzupełniającej skleroterapii drobnych naczynek.",
      "Utrzymuj aktywny styl życia i unikaj długiego stania — profilaktyka nawrotów.",
    ],
  },
];

const careRules = [
  {
    icon: Shirt,
    title: "Pończochy uciskowe",
    text: "Klasa ucisku wg zaleceń lekarza (zwykle II stopień). Noś nieprzerwanie przez 3–7 dni, potem w dzień przez 3–4 tygodnie. Kluczowy element skuteczności.",
  },
  {
    icon: Footprints,
    title: "Ruch i spacery",
    text: "Minimum 30–45 minut spaceru dziennie. Ruch aktywuje pompę mięśniową łydek, zmniejsza obrzęk i zapobiega zakrzepicy. Unoś nogi w pozycji leżącej.",
  },
  {
    icon: Droplets,
    title: "Pielęgnacja nacięć",
    text: "Małe nacięcia (2–3 mm) myj letnią wodą z łagodnym mydłem. Nie zrywaj pasków Steri-Strip — odpadną same. Zmień opatrunek, gdy będzie wilgotny.",
  },
  {
    icon: Sun,
    title: "Ochrona przed słońcem",
    text: "Nie opalaj leczonych miejsc przez minimum 4–6 tygodni. Stosuj filtr SPF 50 na obszary z siniakami — zapobiega przebarwieniom.",
  },
];

const forbidden = [
  { icon: ThermometerSnowflake, text: "Gorące kąpiele, sauna, jacuzzi — przez 4 tygodnie" },
  { icon: Ban, text: "Intensywny wysiłek fizyczny (siłownia, bieganie, aerobik) — przez 2–3 tygodnie" },
  { icon: Ban, text: "Długie stanie lub siedzenie bez przerw (>30 min) — przez 3–4 tygodnie" },
  { icon: Sun, text: "Opalanie i solarium — przez 4–6 tygodni (ryzyko przebarwień)" },
  { icon: Ban, text: "Kąpiel w basenie, jeziorze, morzu — do zagojenia nacięć (ok. 7–10 dni)" },
  { icon: Ban, text: "Podnoszenie ciężarów i ćwiczenia z obciążeniem nóg — przez 3 tygodnie" },
];

const warningSignals = [
  "Silny, narastający ból w nodze, który nie ustępuje po uniesieniu kończyny",
  "Obrzęk całej kończyny dolnej z zaczerwienieniem i gorącem",
  "Gorączka powyżej 38°C utrzymująca się dłużej niż 24 godziny",
  "Duszność, ból w klatce piersiowej — natychmiast zadzwoń 112",
  "Narastające zaczerwienienie lub ropna wydzielina z nacięć",
  "Drętwienie lub utrata czucia w nodze",
];

const ZaleceniaPoMikroflebektomii = () => {
  return (
    <>
      <SeoHead
        title="Zalecenia po mikroflebektomii | Rekonwalescencja | CML"
        description="Pończochy uciskowe, spacery, pielęgnacja nakłuć, ochrona przed słońcem i sygnały alarmowe po mikroflebektomii piankowej. Poradnik flebologów CML Warszawa."
        path="/dla-pacjenta/zalecenia-po-mikroflebektomii"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-background via-accent/10 to-background pt-28 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs
            items={BREADCRUMBS_MAP["/dla-pacjenta/zalecenia-po-mikroflebektomii"]}
          />
          <motion.div {...fadeUp} className="mt-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Poradnik rekonwalescencji
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight mb-6">
              Zalecenia po{" "}
              <span className="text-primary">mikroflebektomii</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Usuwanie żylaków bez skalpela — mini nacięcia, pończochy uciskowe i ruch
            </p>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...fadeUp}>
            <div className="bg-accent/30 border border-border rounded-2xl p-6 md:p-8 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Zabieg mikroflebektomii jest za Tobą — to <strong className="text-foreground">skuteczny krok ku lekkim, zdrowym nogom</strong>. Żylaki zostały usunięte przez mini nacięcia (2–3 mm), które nie wymagają szwów i goją się praktycznie bez blizn.
              </p>
              <p>
                Dwa najważniejsze elementy rekonwalescencji to <strong className="text-foreground">ucisk (pończochy uciskowe)</strong> i <strong className="text-foreground">ruch (spacery)</strong>. Razem przyspieszają gojenie, zmniejszają obrzęk i minimalizują ryzyko powikłań. Poniżej znajdziesz szczegółowy plan działania.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2 {...fadeUp} className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-10 text-center">
            Harmonogram rekonwalescencji
          </motion.h2>
          <div className="space-y-8">
            {timelineDays.map((phase, pIdx) => (
              <motion.div
                key={pIdx}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: pIdx * 0.08 }}
                className="bg-card border border-border rounded-2xl p-6 md:p-8"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                    <phase.icon className="w-5 h-5" />
                  </span>
                  <h3 className="text-xl font-serif font-bold text-foreground">
                    {phase.period}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Care rules */}
      <section className="py-12 md:py-16 bg-accent/5">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2 {...fadeUp} className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-10 text-center">
            Ucisk, ruch i pielęgnacja — fundamenty gojenia
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {careRules.map((rule, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
                    <rule.icon className="w-4 h-4" />
                  </span>
                  <h3 className="font-semibold text-foreground">{rule.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{rule.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Forbidden */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2 {...fadeUp} className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4 text-center">
            Czego unikać po zabiegu
          </motion.h2>
          <motion.p {...fadeUp} className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            Te czynności mogą spowolnić gojenie lub zwiększyć ryzyko powikłań.
          </motion.p>
          <div className="space-y-4">
            {forbidden.map((item, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                className="flex items-center gap-4 bg-destructive/5 border border-destructive/10 rounded-xl p-5"
              >
                <item.icon className="w-5 h-5 text-destructive shrink-0" />
                <span className="text-muted-foreground">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Warning signals */}
      <section className="py-12 md:py-16 bg-accent/5">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...fadeUp} className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <ShieldAlert className="w-7 h-7 text-destructive" />
              <h2 className="text-2xl font-serif font-bold text-foreground">
                Sygnały alarmowe — skontaktuj się z nami
              </h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Poniższe objawy wymagają pilnej konsultacji — nie czekaj na zaplanowaną wizytę:
            </p>
            <ul className="space-y-3">
              {warningSignals.map((signal, i) => (
                <motion.li
                  key={i}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{signal}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <RecoveryBoostBanner />

      {/* CTA */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            {...fadeUp}
            className="bg-gradient-to-br from-primary/5 via-accent/20 to-primary/5 border border-primary/10 rounded-2xl p-8 md:p-10 text-center"
          >
            <Heart className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
              Pytania po zabiegu?
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
              Każdy organizm reaguje inaczej. Jeśli cokolwiek Cię niepokoi — siniaki, obrzęk, stwardnienia — daj znać. Lepiej zapytać o jeden szczegół za dużo niż za mało.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <a href="tel:+48222174007">
                  <Phone className="w-4 h-4" />
                  Zadzwoń do nas
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <a href="/kontakt">
                  <Mail className="w-4 h-4" />
                  Napisz do nas
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-8 font-medium">
              Jesteśmy z Tobą na każdym etapie! 💛
            </p>
          </motion.div>
        </div>
      </section>

      <TestimonialsSection />
    </>
  );
};

export default ZaleceniaPoMikroflebektomii;
