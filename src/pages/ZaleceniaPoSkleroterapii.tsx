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
      "Bezpośrednio po zabiegu załóż pończochy/rajstopy uciskowe — noszenie rozpocznij od razu.",
      "Spacer 20–30 minut zaraz po zabiegu — ruch jest obowiązkowy, nie jedź do domu bez spaceru.",
      "Możliwe uczucie pieczenia, tkliwości lub lekkiego ucisku w miejscach iniekcji — to normalne.",
      "Nie zdejmuj opatrunku uciskowego przez pierwsze 24 godziny (chyba że lekarz zaleci inaczej).",
      "Paracetamol w razie dyskomfortu — unikaj aspiryny i ibuprofenu przez 48 godzin.",
    ],
  },
  {
    period: "Dni 1–7",
    icon: Activity,
    items: [
      "Noś pończochy/rajstopy uciskowe 24/7 (zdejmuj tylko na czas kąpieli) — to fundament skuteczności.",
      "Codzienny spacer minimum 30 minut — ruch wspomaga wchłanianie środka obliterującego.",
      "Możliwe siniaki, lekki obrzęk i stwardnienia wzdłuż żyły — to prawidłowa reakcja na zabieg.",
      "Delikatnie myj nogi letnią wodą — nie pocieraj miejsc po iniekcjach.",
      "Unikaj długiego stania i siedzenia bez przerw — rób przerwy na ruch co 30 minut.",
    ],
  },
  {
    period: "Tygodnie 2–4",
    icon: CalendarDays,
    items: [
      "Kontynuuj noszenie pończoch uciskowych wg zaleceń lekarza (zwykle 2–4 tygodnie).",
      "Siniaki stopniowo ustępują — mogą zmienić kolor na żółto-zielony przed zniknięciem.",
      "Stwardnienia wzdłuż żyły mogą utrzymywać się przez kilka tygodni — to normalne.",
      "Wizyta kontrolna wg ustalonego terminu — ocena skuteczności zabiegu.",
      "Stopniowy powrót do intensywniejszej aktywności fizycznej.",
    ],
  },
  {
    period: "Po 4 tygodniach",
    icon: Heart,
    items: [
      "Efekty kosmetyczne widoczne w pełni po 4–8 tygodniach (czasem do 3 miesięcy).",
      "Ewentualna ocena potrzeby kolejnej sesji skleroterapii.",
      "Powrót do pełnej aktywności — bieganie, siłownia, pływanie.",
      "Utrzymuj aktywny styl życia i unikaj długiego stania — to najlepsza profilaktyka nawrotów.",
    ],
  },
];

const careRules = [
  {
    icon: Shirt,
    title: "Pończochy uciskowe",
    text: "Klasa ucisku wg zaleceń lekarza (zwykle II stopień). Noś nieprzerwanie przez 3–7 dni, potem w dzień przez 2–4 tygodnie. To kluczowy element skuteczności zabiegu.",
  },
  {
    icon: Footprints,
    title: "Ruch i spacery",
    text: "Minimum 30 minut spaceru dziennie. Ruch aktywuje pompę mięśniową łydek, wspomaga wchłanianie środka i zapobiega zakrzepicy.",
  },
  {
    icon: Droplets,
    title: "Higiena nóg",
    text: "Myj nogi letnią wodą z łagodnym mydłem. Nie pocieraj miejsc iniekcji. Nie stosuj kremów, balsamów ani samoopalaczy na leczone miejsca przez 2 tygodnie.",
  },
  {
    icon: Sun,
    title: "Ochrona przed słońcem",
    text: "Nie opalaj leczonych miejsc przez minimum 4–6 tygodni. Stosuj filtr SPF 50 na eksponowane obszary — zapobiega przebarwieniom poiksantozycznym.",
  },
];

const forbidden = [
  { icon: ThermometerSnowflake, text: "Gorące kąpiele, sauna, jacuzzi — przez 4 tygodnie" },
  { icon: Ban, text: "Intensywny wysiłek fizyczny (siłownia, bieganie, aerobik) — przez 7–10 dni" },
  { icon: Ban, text: "Długie stanie lub siedzenie bez przerw (>30 min) — przez 2–3 tygodnie" },
  { icon: Sun, text: "Opalanie i solarium — przez 4–6 tygodni (ryzyko przebarwień)" },
  { icon: Ban, text: "Depilacja woskiem lub laserem w leczonym obszarze — przez 4 tygodnie" },
  { icon: Ban, text: "Aspiryna i ibuprofen — przez 48 godzin po zabiegu" },
];

const warningSignals = [
  "Silny, narastający ból w nodze, który nie ustępuje po uniesieniu kończyny",
  "Obrzęk całej kończyny dolnej z zaczerwienieniem i gorącem",
  "Gorączka powyżej 38°C utrzymująca się dłużej niż 24 godziny",
  "Duszność, ból w klatce piersiowej — natychmiast zadzwoń 112",
  "Rozległy owrzodzenie skóry w miejscu iniekcji",
  "Znaczne nasilenie siniaków lub krwawienie z miejsca wkłucia",
];

const ZaleceniaPoSkleroterapii = () => {
  return (
    <>
      <SeoHead
        title="Zalecenia po skleroterapii | Rekonwalescencja | CML"
        description="Pończochy uciskowe, spacery, higiena, ochrona przed słońcem i sygnały alarmowe po skleroterapii żylaków i pajączków. Poradnik flebologów CML Warszawa."
        path="/dla-pacjenta/zalecenia-po-skleroterapii"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-background via-accent/10 to-background pt-28 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs
            items={BREADCRUMBS_MAP["/dla-pacjenta/zalecenia-po-skleroterapii"]}
          />
          <motion.div {...fadeUp} className="mt-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Poradnik rekonwalescencji
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight mb-6">
              Zalecenia po{" "}
              <span className="text-primary">skleroterapii</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Zamykanie żylaków i pajączków naczyniowych — klucz do sukcesu to ucisk i ruch
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
                Zabieg skleroterapii jest za Tobą — to <strong className="text-foreground">pierwszy krok ku zdrowym, lekkim nogom</strong>. Środek obliterujący został podany do żyły, a teraz Twoje ciało przejmuje kontrolę nad procesem zamykania naczynia.
              </p>
              <p>
                Dwa najważniejsze elementy rekonwalescencji to <strong className="text-foreground">ucisk (pończochy uciskowe)</strong> i <strong className="text-foreground">ruch (spacery)</strong>. Razem zapewniają skuteczne zamknięcie żyły i minimalizują ryzyko powikłań. Poniżej znajdziesz szczegółowy plan działania.
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
            Ucisk, ruch i ochrona — fundamenty skuteczności
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
            Te czynności mogą zmniejszyć skuteczność skleroterapii lub zwiększyć ryzyko powikłań.
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
              Każdy organizm reaguje inaczej. Jeśli cokolwiek Cię niepokoi — siniaki, stwardnienia, uczucie ciężkości — daj znać. Lepiej zapytać o jeden szczegół za dużo niż za mało.
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

export default ZaleceniaPoSkleroterapii;
