import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import { Button } from "@/components/ui/button";
import {
  Clock, ShieldAlert, ThermometerSnowflake, Droplets,
  Heart, CheckCircle2, AlertTriangle, Phone, Mail, CalendarDays,
  Activity, Ban, Sun, Shirt, Eye, Footprints,
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
      "Po zabiegu możesz od razu wrócić do codziennych aktywności — to zabieg ambulatoryjny.",
      "Załóż pończochę uciskową, którą otrzymasz w klinice — noś ją nieprzerwanie przez pierwszą dobę.",
      "Lekki spacer 15–20 minut po zabiegu — wspomaga krążenie.",
      "Możesz zauważyć zaczerwienienie, lekkie obrzęki lub drobne siniaki w miejscach iniekcji — to normalne.",
      "W okolicach poddanych krioterapii skóra może być lekko zaczerwieniona — ustąpi w ciągu kilku godzin.",
    ],
  },
  {
    period: "Dni 1–7",
    icon: Activity,
    items: [
      "Pończochę uciskową noś w ciągu dnia (zdejmuj na noc) — przez minimum 7 dni.",
      "Codzienne spacery 30–45 minut — ruch to najlepsze wsparcie procesu zamykania naczynek.",
      "Leczone naczynka mogą wyglądać ciemniej niż przed zabiegiem — to normalna reakcja na skleroterapię.",
      "Drobne grudki lub stwardnienia wzdłuż naczynek — to zamknięty preparat, wchłonie się samoistnie.",
      "Unikaj gorących kąpieli — letni prysznic jest OK.",
    ],
  },
  {
    period: "Tygodnie 2–4",
    icon: CalendarDays,
    items: [
      "Naczynka stopniowo bledną i znikają — pełny efekt widoczny po 4–8 tygodniach.",
      "Kontynuuj noszenie pończochy uciskowej, jeśli lekarz zalecił dłuższy okres.",
      "Możliwe lekkie przebarwienia (brązowe cienie) — to hemosyderyna, wchłania się w ciągu kilku tygodni.",
      "Stosuj filtr SPF 50 na leczone okolice przy ekspozycji na słońce.",
      "Wizyta kontrolna wg ustalonego terminu — ocena efektu i ewentualne dostrzykanie.",
    ],
  },
  {
    period: "Po 4–8 tygodniach",
    icon: Heart,
    items: [
      "Efekt końcowy — naczynka powinny być znacząco mniej widoczne lub całkowicie zniknąć.",
      "W razie potrzeby kolejna sesja CLaCS (zazwyczaj 2–3 sesje dają optymalny rezultat).",
      "Powrót do pełnej aktywności bez ograniczeń.",
      "Profilaktyka: pończochy uciskowe przy długim staniu/siedzeniu, regularna aktywność.",
    ],
  },
];

const skinCare = [
  {
    icon: Sun,
    title: "Ochrona przeciwsłoneczna",
    text: "Filtr SPF 50 na leczone nogi przy każdej ekspozycji na słońce — przez minimum 4 tygodnie. Zapobiega przebarwieniom.",
  },
  {
    icon: Droplets,
    title: "Nawilżanie skóry",
    text: "Delikatny balsam nawilżający po 24 godzinach od zabiegu. Unikaj preparatów z alkoholem i kwasami.",
  },
  {
    icon: Shirt,
    title: "Pończocha uciskowa",
    text: "Klasa kompresji I–II (15–23 mmHg). Pierwsza doba non-stop, potem w ciągu dnia przez 7–14 dni.",
  },
  {
    icon: Eye,
    title: "Obserwacja skóry",
    text: "Ciemniejsze naczynka, drobne siniaki i grudki to normalna reakcja. Jeśli coś Cię niepokoi — skontaktuj się z nami.",
  },
];

const forbidden = [
  { icon: ThermometerSnowflake, text: "Gorące kąpiele, sauna, jacuzzi — przez 2–3 tygodnie" },
  { icon: Sun, text: "Opalanie i solarium — przez 4–6 tygodni (ryzyko przebarwień)" },
  { icon: Ban, text: "Intensywny wysiłek (siłownia, bieganie) — przez 5–7 dni" },
  { icon: Ban, text: "Depilacja woskiem/laserem leczonych okolic — przez 3 tygodnie" },
  { icon: Ban, text: "Masaże i zabiegi kosmetyczne leczonych nóg — przez 2 tygodnie" },
];

const warningSignals = [
  "Silny ból, obrzęk lub zaczerwienienie narastające z dnia na dzień",
  "Gorączka powyżej 38°C",
  "Pojawienie się pęcherzy lub owrzodzeń w miejscu iniekcji",
  "Nagły obrzęk całej łydki (może sugerować zakrzep — wymaga pilnej oceny)",
  "Duszność lub ból w klatce piersiowej — natychmiast wezwij pogotowie",
];

const ZaleceniaPoClacs = () => {
  return (
    <>
      <SeoHead
        title="Zalecenia po zabiegu CLaCS | Rekonwalescencja | CML"
        description="Kompresja, pielęgnacja skóry, ochrona przeciwsłoneczna i sygnały alarmowe po zabiegu CLaCS na pajączki naczyniowe. Poradnik flebologów CML Warszawa. Zapraszamy."
        path="/dla-pacjenta/zalecenia-po-clacs"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-background via-accent/10 to-background pt-28 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs
            items={BREADCRUMBS_MAP["/dla-pacjenta/zalecenia-po-clacs"]}
          />
          <motion.div {...fadeUp} className="mt-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Poradnik rekonwalescencji
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight mb-6">
              Zalecenia po zabiegu{" "}
              <span className="text-primary">CLaCS</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Crio Laser and Crio Sclerotherapy — jak zadbać o nogi po zabiegu
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
                Zabieg CLaCS to <strong className="text-foreground">połączenie trzech technologii</strong> — lasera przezskórnego, krioskleroterapii i chłodzenia — które razem dają najskuteczniejsze efekty w usuwaniu pajączków naczyniowych. Procedura jest ambulatoryjna, a powrót do codziennych aktywności natychmiastowy.
              </p>
              <p>
                Poniższe wskazówki pomogą Ci maksymalnie wykorzystać efekty zabiegu i uniknąć przebarwień. Kluczowe filary: <strong className="text-foreground">unikanie ciasnych ubrań, BEZWZGLĘDNY ZAKAZ NOSZENIA WYROBÓW UCISKOWYCH, stosowanie kremów robionych (dają ochronę przeciwsłoneczną i cierpliwość</strong> — pełny efekt widoczny jest po 4–8 tygodniach.
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

      {/* Skin care */}
      <section className="py-12 md:py-16 bg-accent/5">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2 {...fadeUp} className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-10 text-center">
            Pielęgnacja skóry po zabiegu
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {skinCare.map((rule, i) => (
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
            Te czynności mogą prowadzić do przebarwień lub spowolnić gojenie.
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
              Poniższe objawy są niezwykle rzadkie, ale wymagają pilnej konsultacji:
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
              Nie wahaj się dzwonić — nawet drobne wątpliwości warto wyjaśnić. Jesteśmy tutaj, by towarzyszyć Ci na każdym etapie rekonwalescencji.
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
              Życzymy pięknych, zdrowych nóg! ✨
            </p>
          </motion.div>
        </div>
      </section>

      <TestimonialsSection />
    </>
  );
};

export default ZaleceniaPoClacs;
