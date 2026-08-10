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
  Activity, Ban, ShowerHead, Apple, BedDouble, Pill, Eye,
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
      "Po zabiegu FiLaC odpocznij — możesz odczuwać lekki dyskomfort i tkliwość w okolicy odbytu.",
      "Przyłóż czysty, chłodny okład (nie bezpośrednio lód) na 10–15 minut — łagodzi obrzęk.",
      "Pij dużo wody — nawodnienie ułatwia pierwsze wypróżnienie.",
      "Lekki posiłek bogaty w błonnik — owsianka, jogurt, warzywa.",
      "Paracetamol lub ibuprofen (wg zaleceń lekarza) w razie dyskomfortu.",
    ],
  },
  {
    period: "Dni 1–7",
    icon: Activity,
    items: [
      "Kąpiele nasiadowe w letniej wodzie 2–3× dziennie po 10–15 minut — fundament gojenia.",
      "Krótkie spacery 15–20 minut — ruch pobudza krążenie i wspomaga gojenie.",
      "Możliwe niewielkie sączenie z rany (surowiczy płyn, lekko podbarwiony) — to normalne.",
      "Opatrunek zmieniaj po każdej kąpieli nasiadowej i w razie potrzeby.",
      "Dieta bogatoresztkowa: warzywa, owoce, kasza, pełne ziarna, siemię lniane.",
      "Pij 2–2,5 litra wody dziennie.",
    ],
  },
  {
    period: "Tygodnie 2–4",
    icon: CalendarDays,
    items: [
      "Stopniowy powrót do codziennych aktywności — praca biurowa, zakupy, gotowanie.",
      "Kontynuuj kąpiele nasiadowe tak długo, jak przynoszą ulgę.",
      "Sączenie z rany stopniowo ustępuje — jeśli się nasila, skontaktuj się z nami.",
      "Wizyta kontrolna wg ustalonego terminu — ocena postępu gojenia.",
      "Utrzymuj dietę bogatoresztkową i nawodnienie.",
    ],
  },
  {
    period: "Tygodnie 5–12",
    icon: Heart,
    items: [
      "Pełne gojenie kanału przetoki — proces trwa zwykle 6–12 tygodni.",
      "Powrót do pełnej aktywności fizycznej — bieganie, rower, pływanie.",
      "Kontrola lekarska potwierdzi zamknięcie przetoki.",
      "Utrzymuj zdrowe nawyki żywieniowe — to najlepsza profilaktyka nawrotów.",
    ],
  },
];

const careRules = [
  {
    icon: ShowerHead,
    title: "Kąpiele nasiadowe",
    text: "Letnia (nie gorąca) woda, 10–15 minut, 2–3× dziennie. Możesz dodać rumianek lub korę dębu. Kluczowy element gojenia przetoki.",
  },
  {
    icon: Droplets,
    title: "Higiena rany",
    text: "Po każdej kąpieli i wypróżnieniu delikatnie osusz okolicę czystym ręcznikiem. Zmień opatrunek na świeży.",
  },
  {
    icon: Pill,
    title: "Leki i antybiotyki",
    text: "Stosuj przepisane leki dokładnie wg zaleceń. Jeśli przepisano antybiotyk — dokończ pełny cykl, nawet gdy objawy ustąpią.",
  },
  {
    icon: Apple,
    title: "Dieta bogatoresztkowa",
    text: "Owsianka, warzywa, owoce, kasza, siemię lniane. Unikaj przetworzonej żywności, alkoholu i ostrych przypraw przez 3–4 tygodnie.",
  },
];

const forbidden = [
  { icon: ThermometerSnowflake, text: "Gorące kąpiele, sauna, jacuzzi — przez 6 tygodni" },
  { icon: Ban, text: "Intensywny wysiłek fizyczny (siłownia, bieganie, rower) — przez 3–4 tygodnie" },
  { icon: Ban, text: "Podnoszenie ciężkich przedmiotów (>5 kg) — przez 3 tygodnie" },
  { icon: Ban, text: "Długie siedzenie bez przerw (>30 min) — przez 2–3 tygodnie" },
  { icon: Ban, text: "Kąpiel w basenie, jeziorze, morzu — do pełnego zagojenia rany" },
];

const warningSignals = [
  "Narastające sączenie ropne (gęsta, żółto-zielona wydzielina) lub nieprzyjemny zapach",
  "Gorączka powyżej 38°C utrzymująca się dłużej niż 24 godziny",
  "Narastający ból, który nie reaguje na zalecone leki przeciwbólowe",
  "Obrzęk okolicy odbytu z narastającym zaczerwienieniem i gorącem",
  "Silne krwawienie z rany (więcej niż kilka kropel przy wypróżnieniu)",
  "Trudności z oddawaniem moczu lub stolca",
];

const ZaleceniaPoFilac = () => {
  return (
    <>
      <SeoHead
        title="Zalecenia po zabiegu FiLaC | Rekonwalescencja | CML"
        description="Higiena rany, kąpiele nasiadowe, dieta, kontrole gojenia i sygnały alarmowe po laserowym leczeniu przetoki FiLaC. Poradnik rekonwalescencji od CML. Zapraszamy."
        path="/dla-pacjenta/zalecenia-po-filac"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-background via-accent/10 to-background pt-28 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs
            items={BREADCRUMBS_MAP["/dla-pacjenta/zalecenia-po-filac"]}
          />
          <motion.div {...fadeUp} className="mt-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Poradnik rekonwalescencji
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight mb-6">
              Zalecenia po operacji{" "}
              <span className="text-primary">przetoki okołoodbytniczej</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Metoda FiLaC — laserowe zamykanie przetoki z zachowaniem zwieraczy
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
                Operacja przetoki okołoodbytniczej metodą FiLaC jest za Tobą — to <strong className="text-foreground">ogromny krok ku zdrowiu</strong>. FiLaC to jedna z najbardziej oszczędzających metod — laser zamyka kanał przetoki od wewnątrz, zachowując integralność mięśni zwieraczy.
              </p>
              <p>
                Teraz przed Tobą okres gojenia, który wymaga <strong className="text-foreground">cierpliwości i konsekwencji</strong>. Kanał przetoki goi się od wewnątrz, dlatego proces trwa dłużej niż przy powierzchownych ranach. Poniższe wskazówki pomogą Ci przejść przez ten okres komfortowo i bezpiecznie.
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
            Pielęgnacja i dieta — fundamenty gojenia
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
            Czego unikać po operacji
          </motion.h2>
          <motion.p {...fadeUp} className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            Te czynności mogą spowolnić gojenie kanału przetoki lub zwiększyć ryzyko nawrotu.
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
              Pytania po operacji?
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
              Gojenie przetoki to proces, który wymaga cierpliwości. Jeśli cokolwiek Cię niepokoi — daj znać. Lepiej zapytać o jeden szczegół za dużo niż za mało.
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

export default ZaleceniaPoFilac;
