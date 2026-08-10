import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import { Button } from "@/components/ui/button";
import {
  Droplets,
  Utensils,
  Pill,
  CalendarDays,
  FileText,
  Phone,
  Mail,
  Heart,
  CheckCircle2,
  Briefcase,
  ShowerHead,
  Apple,
  Clock,
  Shirt,
  AlertTriangle,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const checklistSections = [
  {
    title: "Na kilka dni przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: Pill,
        title: "Twoje stałe leki",
        text: "Jeśli przyjmujesz leki wpływające na krzepnięcie krwi (aspiryna, warfaryna, heparyna, NOAC), koniecznie poinformuj o tym lekarza na etapie kwalifikacji. Otrzymasz jasne instrukcje — nigdy nie zmieniaj dawkowania na własną rękę.",
      },
      {
        icon: Apple,
        title: "Dieta bogatoresztkowa",
        text: "Zacznij wzbogacać posiłki o błonnik (owsianka, warzywa, owoce, siemię lniane). Po zabiegu regularne, miękkie wypróżnienia to klucz do komfortowego gojenia — warto przyzwyczaić jelita wcześniej.",
      },
      {
        icon: Droplets,
        title: "Nawodnienie",
        text: "Pij około 2–2,5 litra wody dziennie. Dobrze nawodniony organizm lepiej się goi, a miękki stolec oznacza mniej dyskomfortu po zabiegu.",
      },
    ],
  },
  {
    title: "Dzień przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: ShowerHead,
        title: "Higiena okolicy odbytu",
        text: "Wieczorem weź dokładną kąpiel lub prysznic. Zadbaj o czystość okolicy krocza — czysta skóra zmniejsza ryzyko zakażenia.",
      },
      {
        icon: Clock,
        title: "Zaplanuj spokojny dzień po zabiegu",
        text: "Upewnij się, że następnego dnia po zabiegu nie masz zaplanowanych intensywnych aktywności. Najlepiej mieć wolne 2–3 dni na spokojny odpoczynek w domu.",
      },
    ],
  },
  {
    title: "W dniu zabiegu",
    icon: CalendarDays,
    items: [
      {
        icon: Utensils,
        title: "Lekki posiłek",
        text: "Jeśli zabieg odbywa się w znieczuleniu miejscowym — zjedz lekki posiłek (jogurt, kanapkę, owsiankę) i normalnie pij wodę. Jeśli ustalono znieczulenie dożylne — lekarz poinformuje Cię, od której godziny należy być na czczo.",
      },
      {
        icon: Shirt,
        title: "Wygodny, luźny ubiór",
        text: "Załóż luźną bieliznę bawełnianą i wygodne, szerokie spodnie. Po zabiegu w okolicy odbytu będzie opatrunek, więc obcisłe ubranie nie jest wskazane.",
      },
      {
        icon: AlertTriangle,
        title: "Nie prowadź samochodu",
        text: "Jeśli zabieg jest wykonywany w sedacji dożylnej, nie będziesz mógł prowadzić pojazdu. Zaplanuj transport z kliniki — poproś bliską osobę o odwiezienie lub zamów taksówkę.",
      },
    ],
  },
];

const packingList = [
  { icon: FileText, text: "Dokument tożsamości (dowód osobisty)" },
  { icon: FileText, text: "Wyniki badań zleconych na konsultacji kwalifikacyjnej" },
  { icon: FileText, text: "Listę aktualnie przyjmowanych leków" },
  { icon: FileText, text: "Wygodną podkładkę lub poduszkę do siedzenia (opcjonalnie — na drogę powrotną)" },
];

const afterProcedure = [
  { icon: "💊", title: "Leki przeciwbólowe", text: "Otrzymasz precyzyjne instrukcje dotyczące dawkowania leków łagodzących ból i obrzęk." },
  { icon: "🌿", title: "Dieta bogatoresztkowa", text: "Błonnik i nawodnienie to Twoi najlepsi sprzymierzeńcy. Miękki stolec = komfort gojenia." },
  { icon: "🚽", title: "Nasiadówki", text: "Ciepłe nasiadówki 2–3 razy dziennie przez 10–15 minut przynoszą ulgę i wspierają gojenie." },
];

const PrzygotowanieLHP = () => {
  return (
    <>
      <SeoHead
        title="Przygotowanie do zabiegu LHP | Checklista | CML Wilanów"
        description="Leki, dieta z błonnikiem, higiena i co zabrać ze sobą — praktyczna checklista przed laserową plastyką hemoroidów LHP. Wskazówki specjalistów CML Warszawa."
        path="/dla-pacjenta/przygotowanie-lhp"
      />
      <MedicalWebPageSchema
        name="Przygotowanie do zabiegu LHP – laserowe leczenie hemoroidów"
        description="Praktyczna checklista przygotowania do zabiegu LHP (laserowej plastyki hemoroidów). Wskazówki żywieniowe, higieniczne i organizacyjne."
        path="/dla-pacjenta/przygotowanie-lhp"
        specialty="Proctology"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-background via-accent/10 to-background pt-28 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs
            items={BREADCRUMBS_MAP["/dla-pacjenta/przygotowanie-lhp"]}
          />
          <motion.div {...fadeUp} className="mt-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Poradnik pacjenta
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight mb-6">
              Jak przygotować się do zabiegu{" "}
              <span className="text-primary">LHP</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Laserowa plastyka hemoroidów — bez skalpela, w znieczuleniu miejscowym lub krótkim dożylnym
            </p>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...fadeUp} className="prose prose-lg max-w-none">
            <div className="bg-accent/30 border border-border rounded-2xl p-6 md:p-8 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Dzień dobry! Skoro tu trafiłeś, to znaczy, że najważniejszy krok masz już za sobą — <strong className="text-foreground">decyzja o zabiegu została podjęta</strong>. Rozumiemy, że temat jest delikatny, a stres przed wizytą zupełnie naturalny. Chcemy Cię uspokoić: jesteś w dobrych rękach.
              </p>
              <p>
                Zabieg LHP (Laser Hemorrhoidoplasty) to <strong className="text-foreground">minimalnie inwazyjna metoda</strong>, w której energia lasera obkurcza guzek hemoroidalny od wewnątrz — bez wycinania tkanek, bez szwów i bez ran. Większość pacjentów wraca do domu tego samego dnia.
              </p>
              <p>
                Poniższa checklista pomoże Ci spokojnie zaplanować dni przed i po zabiegu. Przeczytaj ją w domu, w swoim tempie.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Checklist sections */}
      {checklistSections.map((section, sIdx) => (
        <section key={sIdx} className="py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.h2
              {...fadeUp}
              className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-8 flex items-center gap-3"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                <section.icon className="w-5 h-5" />
              </span>
              {section.title}
            </motion.h2>

            <div className="space-y-6">
              {section.items.map((item, iIdx) => (
                <motion.div
                  key={iIdx}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: iIdx * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <item.icon className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Packing list */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2
            {...fadeUp}
            className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-8 flex items-center gap-3"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
              <Briefcase className="w-5 h-5" />
            </span>
            Co zabrać ze sobą do kliniki?
          </motion.h2>
          <motion.p {...fadeUp} className="text-muted-foreground mb-6">
            Spakuj te rzeczy dzień wcześniej, by rano mieć wolną głowę:
          </motion.p>
          <div className="space-y-4">
            {packingList.map((item, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className="flex items-start gap-4 bg-card border border-border rounded-xl p-5"
              >
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* After procedure tips */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2
            {...fadeUp}
            className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-8 flex items-center gap-3"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
              <Heart className="w-5 h-5" />
            </span>
            Pierwsze dni po zabiegu — survival tips
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {afterProcedure.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="glass-card p-6 rounded-2xl text-center"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
          <RecoveryBoostBanner />
        </div>
      </section>

      {/* Reassurance + CTA */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            {...fadeUp}
            className="bg-gradient-to-br from-primary/5 via-accent/20 to-primary/5 border border-primary/10 rounded-2xl p-8 md:p-10 text-center"
          >
            <Heart className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
              Jesteśmy tu dla Ciebie
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
              Pamiętaj — zależy nam na Twoim komforcie równie mocno, jak na precyzji zabiegu. Będziemy Cię informować na każdym etapie. Większość pacjentów po zabiegu LHP mówi:{" "}
              <em className="text-foreground font-medium">"Spodziewałem się gorzej — to naprawdę do zniesienia!"</em>
            </p>
            <p className="text-muted-foreground mb-8">
              Masz pytania? Po prostu daj nam znać.
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
              Do zobaczenia w klinice! Będzie dobrze. 🤝
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default PrzygotowanieLHP;
