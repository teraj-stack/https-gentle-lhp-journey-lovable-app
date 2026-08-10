import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import { Button } from "@/components/ui/button";
import {
  Clock, Footprints, ShieldAlert, ThermometerSnowflake, Droplets,
  Heart, CheckCircle2, AlertTriangle, Phone, Mail, CalendarDays,
  Activity, Ban, Shirt, BedDouble, Pill, Sun, Car, Dumbbell,
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
    icon: Footprints,
    items: [
      "Po zabiegu wstaniesz z fotela i wyjdziesz o własnych siłach — to zupełnie normalne i pożądane.",
      "Spacer 20–30 minut zaraz po zabiegu — uruchamia krążenie i zmniejsza ryzyko zakrzepów.",
      "Załóż pończochę uciskową, którą otrzymasz w klinice — noś ją nieprzerwanie przez pierwszą dobę.",
      "W domu połóż się wygodnie z nogami lekko uniesionymi (poduszka pod łydki).",
      "Lekki dyskomfort, uczucie ciągania wzdłuż leczonej żyły — to normalne i szybko ustępuje.",
    ],
  },
  {
    period: "Dni 1–3",
    icon: Activity,
    items: [
      "Codzienne spacery 30–45 minut — ruch to Twój najlepszy lek w tym okresie.",
      "Pończochę uciskową zdejmuj tylko na czas kąpieli (krótki, letni prysznic).",
      "Unikaj długiego stania i siedzenia w jednej pozycji — co 30 minut rób krótki spacer.",
      "Możesz odczuwać lekkie siniaki i tkliwość wzdłuż przebiegu żyły — to naturalny proces gojenia.",
      "Paracetamol lub ibuprofen (wg zaleceń lekarza) w razie dyskomfortu.",
    ],
  },
  {
    period: "Dni 4–14",
    icon: CalendarDays,
    items: [
      "Pończochę uciskową noś w ciągu dnia (zdejmuj na noc) — łącznie przez 2 tygodnie.",
      "Wracaj do normalnych aktywności — praca biurowa, zakupy, gotowanie.",
      "Stopniowo wydłużaj spacery do 60 minut dziennie.",
      "Siniaki zaczynają blaknąć i mogą zmieniać kolor — to normalne.",
      "Wizyta kontrolna z USG wg ustalonego terminu.",
    ],
  },
  {
    period: "Tygodnie 3–6",
    icon: Heart,
    items: [
      "Powrót do pełnej aktywności fizycznej — bieganie, rower, pływanie.",
      "Pończochę uciskową noś nadal, jeśli lekarz zalecił dłuższy okres.",
      "Możliwe uczucie stwardnienia (sznurka) pod skórą — to zamknięta żyła, która z czasem wchłonie się całkowicie.",
      "Kontrola USG potwierdzi skuteczność zabiegu.",
    ],
  },
];

const compressionRules = [
  {
    icon: Clock,
    title: "Doba 1: non-stop",
    text: "Pierwszą dobę po zabiegu pończocha uciskowa pozostaje na nodze nieprzerwanie — także w nocy.",
  },
  {
    icon: Sun,
    title: "Dni 2–14: w ciągu dnia",
    text: "Zakładaj pończochę rano, zdejmuj wieczorem przed snem. Noś ją codziennie przez minimum 2 tygodnie.",
  },
  {
    icon: Droplets,
    title: "Kąpiel",
    text: "Krótki, letni prysznic. Unikaj gorących kąpieli, sauny i jacuzzi przez 4–6 tygodni.",
  },
  {
    icon: Shirt,
    title: "Dobór pończochy",
    text: "Klasa kompresji II (23–32 mmHg). Jeśli nie masz własnej, zapewnimy ją w klinice.",
  },
];

const forbidden = [
  { icon: ThermometerSnowflake, text: "Gorące kąpiele, sauna, jacuzzi — przez 4–6 tygodni" },
  { icon: Sun, text: "Opalanie i solarium — przez 4–6 tygodni (ryzyko przebarwień)" },
  { icon: Dumbbell, text: "Intensywny wysiłek (siłownia, bieganie) — przez 2 tygodnie" },
  { icon: Ban, text: "Depilacja woskiem/laserem leczonej nogi — przez 4 tygodnie" },
  { icon: Car, text: "Długie podróże samochodem/samolotem (>2h) bez przerw — przez 2 tygodnie" },
];

const warningSignals = [
  "Silny, narastający ból nogi, który nie ustępuje po lekach",
  "Nagły obrzęk całej łydki lub uda",
  "Zaczerwienienie skóry z gorącem w dotyku (>5 cm)",
  "Gorączka powyżej 38°C",
  "Duszność lub ból w klatce piersiowej — natychmiast wezwij pogotowie",
];

const ZaleceniaPoEVLT = () => {
  return (
    <>
      <SeoHead
        title="Zalecenia po zabiegu EVLT | Rekonwalescencja | CML"
        description="Kompresja, spacery, praca, kąpiele i sygnały alarmowe po laserowym usuwaniu żylaków EVLT. Praktyczny poradnik rekonwalescencji od flebologów CML Warszawa."
        path="/dla-pacjenta/zalecenia-po-evlt"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-background via-accent/10 to-background pt-28 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs
            items={BREADCRUMBS_MAP["/dla-pacjenta/zalecenia-po-evlt"]}
          />
          <motion.div {...fadeUp} className="mt-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Poradnik rekonwalescencji
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight mb-6">
              Zalecenia po zabiegu{" "}
              <span className="text-primary">EVLT</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Co robić, czego unikać i kiedy wrócić do pełnej aktywności
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
                Gratulacje — najważniejszy etap masz już za sobą! Zabieg EVLT został wykonany, a teraz pora na spokojną rekonwalescencję. Poniższe wskazówki pomogą Ci wrócić do pełni formy <strong className="text-foreground">szybciej i bezpieczniej</strong>. Potraktuj je jak mapę drogową na najbliższe tygodnie.
              </p>
              <p>
                Pamiętaj: Twoja noga przeszła precyzyjną procedurę — zamknęliśmy chorą żyłę laserem, a krew teraz płynie prawidłowymi, zdrowymi naczyniami. To <strong className="text-foreground">proces naturalny</strong>, a Twój organizm doskonale sobie z nim radzi.
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

      {/* Compression therapy */}
      <section className="py-12 md:py-16 bg-accent/5">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2 {...fadeUp} className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-10 text-center">
            Kompresjoterapia — fundament gojenia
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {compressionRules.map((rule, i) => (
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
              Poniższe objawy zdarzają się niezwykle rzadko, ale wymagają pilnej konsultacji:
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
              Nie wahaj się dzwonić — nawet drobne wątpliwości warto wyjaśnić. Lepiej zapytać o jeden szczegół za dużo niż za mało. Jesteśmy tutaj, by towarzyszyć Ci na każdym etapie rekonwalescencji.
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
              Życzymy szybkiego powrotu do lekkich nóg! 🦵✨
            </p>
          </motion.div>
        </div>
      </section>

      <TestimonialsSection />
    </>
  );
};

export default ZaleceniaPoEVLT;
