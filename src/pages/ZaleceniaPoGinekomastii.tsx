import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert, ThermometerSnowflake,
  Heart, CheckCircle2, AlertTriangle, Phone, Mail, CalendarDays,
  Activity, Ban, BedDouble, Shirt, Droplets, Dumbbell,
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
      "Po zabiegu załóż kamizelkę/opaskę uciskową — noszenie rozpocznij od razu.",
      "Możesz odczuwać tkliwość, obrzęk i dyskomfort w okolicy klatki piersiowej — to normalne.",
      "Odpoczywaj w pozycji półleżącej (podparta plecy) — ułatwia oddychanie i zmniejsza obrzęk.",
      "Unikaj podnoszenia ramion powyżej poziomu barków.",
      "Paracetamol lub ibuprofen (wg zaleceń lekarza) w razie dyskomfortu.",
      "Pij dużo wody — nawodnienie wspomaga gojenie.",
    ],
  },
  {
    period: "Dni 1–7",
    icon: Activity,
    items: [
      "Noś kamizelkę uciskową 24/7 (zdejmuj tylko na czas kąpieli) — fundament modelowania sylwetki.",
      "Krótkie spacery 15–20 minut — ruch pobudza krążenie i zapobiega powikłaniom.",
      "Siniaki i obrzęk klatki piersiowej mogą narastać do 3.–4. dnia — to normalne.",
      "Dreny (jeśli założone) — opróżniaj wg instrukcji; zostaną usunięte na wizycie kontrolnej.",
      "Delikatnie myj ciało letnią wodą — nie pocieraj operowanego obszaru.",
      "Unikaj ruchów ramion powyżej barków i dźwigania (>2 kg).",
    ],
  },
  {
    period: "Tygodnie 2–4",
    icon: CalendarDays,
    items: [
      "Kontynuuj noszenie kamizelki uciskowej w dzień i w nocy przez łącznie 4–6 tygodni.",
      "Stopniowy powrót do codziennych aktywności — praca biurowa, zakupy, gotowanie.",
      "Siniaki zmieniają kolor na żółto-zielony i stopniowo ustępują.",
      "Obrzęk zmniejsza się, ale może utrzymywać się częściowo przez kilka tygodni.",
      "Wizyta kontrolna wg ustalonego terminu — ocena gojenia.",
      "Możliwe drętwienie skóry klatki piersiowej — czucie wraca stopniowo.",
    ],
  },
  {
    period: "Po 6 tygodniach",
    icon: Heart,
    items: [
      "Stopniowy powrót do pełnej aktywności fizycznej — siłownia, bieganie, pływanie.",
      "Efekt estetyczny widoczny w pełni po 3–6 miesiącach (ustąpienie obrzęku resztkowego).",
      "Blizny po nacięciach (jeśli były) stopniowo bledną — stosuj krem z SPF 50.",
      "Utrzymuj aktywny styl życia i zdrową wagę — profilaktyka nawrotów.",
      "Kontrola lekarska potwierdzi ostateczny efekt zabiegu.",
    ],
  },
];

const careRules = [
  {
    icon: Shirt,
    title: "Kamizelka uciskowa",
    text: "Noś nieprzerwanie przez 4–6 tygodni (zdejmuj tylko na czas kąpieli). Zapewnia prawidłowe modelowanie sylwetki, zmniejsza obrzęk i wspomaga przyleganie skóry.",
  },
  {
    icon: Droplets,
    title: "Pielęgnacja ran",
    text: "Małe nacięcia myj letnią wodą z łagodnym mydłem. Nie zrywaj opatrunków — zmień na suche po kąpieli. Stosuj krem na blizny wg zaleceń lekarza po pełnym zagojeniu.",
  },
  {
    icon: Dumbbell,
    title: "Aktywność fizyczna",
    text: "Pierwsze 2 tygodnie: tylko spacery. Tygodnie 3–6: lekka aktywność (bez obciążenia klatki piersiowej). Po 6 tygodniach: stopniowy powrót do pełnego treningu.",
  },
  {
    icon: ThermometerSnowflake,
    title: "Chłodne okłady",
    text: "Przez pierwsze 48 godzin stosuj chłodne okłady (nie bezpośrednio lód) na 15–20 minut co 2–3 godziny. Redukują obrzęk i dyskomfort.",
  },
];

const forbidden = [
  { icon: Ban, text: "Podnoszenie ramion powyżej barków — przez 2 tygodnie" },
  { icon: Ban, text: "Dźwiganie ciężarów (>2 kg) — przez 3 tygodnie" },
  { icon: Ban, text: "Ćwiczenia klatki piersiowej (pompki, wyciskanie) — przez 6 tygodni" },
  { icon: ThermometerSnowflake, text: "Gorące kąpiele, sauna, jacuzzi — przez 6 tygodni" },
  { icon: Ban, text: "Kąpiel w basenie, jeziorze, morzu — do pełnego zagojenia nacięć" },
  { icon: Ban, text: "Spanie na brzuchu — przez 4 tygodnie (śpij na plecach lub boku)" },
  { icon: Ban, text: "Opalanie klatki piersiowej — przez 3 miesiące (ryzyko przebarwień blizn)" },
];

const warningSignals = [
  "Narastający obrzęk jednej strony klatki piersiowej z silnym bólem",
  "Gorączka powyżej 38°C utrzymująca się dłużej niż 24 godziny",
  "Ropna wydzielina z nacięć lub nieprzyjemny zapach",
  "Silne krwawienie z rany — więcej niż kilka kropel na opatrunku",
  "Duszność lub ból w klatce piersiowej przy oddychaniu",
  "Narastające zaczerwienienie i gorąco wokół nacięć",
];

const ZaleceniaPoGinekomastii = () => {
  return (
    <>
      <SeoHead
        title="Zalecenia po zabiegu ginekomastii | Rekonwalescencja"
        description="Kamizelka uciskowa, pielęgnacja ran, powrót do treningu i sygnały alarmowe po korekcji ginekomastii metodą Vaser Lipo HD. Poradnik chirurgów CML Warszawa."
        path="/dla-pacjenta/zalecenia-po-ginekomastii"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-background via-accent/10 to-background pt-28 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs
            items={BREADCRUMBS_MAP["/dla-pacjenta/zalecenia-po-ginekomastii"]}
          />
          <motion.div {...fadeUp} className="mt-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Poradnik rekonwalescencji
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight mb-6">
              Zalecenia po zabiegu{" "}
              <span className="text-primary">ginekomastii</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Kamizelka uciskowa, spokojny powrót do aktywności i cierpliwość
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
                Zabieg korekcji ginekomastii jest za Tobą — to <strong className="text-foreground">odważny krok ku pewności siebie i komfortowi</strong>. Niezależnie od wariantu zabiegu (Vaser Lipo HD, wycięcie gruczołu lub kombinacja obu), Twoje ciało potrzebuje teraz czasu na regenerację.
              </p>
              <p>
                Najważniejszy element rekonwalescencji to <strong className="text-foreground">kamizelka uciskowa</strong> — zapewnia prawidłowe modelowanie sylwetki i przyleganie skóry. Drugi to <strong className="text-foreground">cierpliwość</strong> — efekt końcowy widoczny jest po 3–6 miesiącach, gdy obrzęk całkowicie ustąpi.
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
            Ucisk, pielęgnacja i aktywność — fundamenty gojenia
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
            Te czynności mogą spowolnić gojenie lub pogorszyć efekt estetyczny.
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
              Każdy organizm regeneruje się we własnym tempie. Jeśli cokolwiek Cię niepokoi — obrzęk, drętwienie, asymetria — daj znać. Lepiej zapytać o jeden szczegół za dużo niż za mało.
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

export default ZaleceniaPoGinekomastii;
