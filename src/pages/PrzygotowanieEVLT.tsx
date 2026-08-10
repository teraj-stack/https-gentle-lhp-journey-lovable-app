import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import { Button } from "@/components/ui/button";
import {
  Droplets,
  Utensils,
  Shirt,
  Footprints,
  FileText,
  Phone,
  Mail,
  Heart,
  CheckCircle2,
  Scissors,
  SprayCan,
  Pill,
  CalendarDays,
  Briefcase,
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
        text: "Jeśli przyjmujesz na stałe jakiekolwiek leki, a w szczególności te wpływające na krzepnięcie krwi (tzw. leki przeciwzakrzepowe), koniecznie przypomnij nam o tym. Lekarz przekaże Ci jasne instrukcje, czy należy je na chwilę odstawić lub zmodyfikować. Proszę, nigdy nie zmieniaj dawkowania leków na własną rękę.",
      },
      {
        icon: Droplets,
        title: "Nawodnienie to podstawa",
        text: "Zacznij pić nieco więcej wody niż zazwyczaj (około 2–2,5 litra dziennie). Dobrze nawodniony organizm to dla nas lepiej widoczne naczynia krwionośne na aparacie USG, co znacznie ułatwia i przyspiesza naszą pracę.",
      },
    ],
  },
  {
    title: "Dzień przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: Scissors,
        title: "Przygotowanie skóry",
        text: "Bardzo proszę nie golić nóg, które będą poddawane zabiegowi. Podrażnienie skóry i przerwanie bariery skórno-naskórkowej powoduje wzrost ryzyka infekcji poddawanej zabiegowi okolicy",
      },
      {
        icon: SprayCan,
        title: "Tylko czysta skóra",
        text: "Wieczorem po kąpieli, a także rano w dniu zabiegu, nie nakładaj na nogi żadnych balsamów, kremów, olejków ani samoopalaczy. Skóra musi być idealnie czysta i sucha, abyśmy mogli ją odpowiednio zdezynfekować, a plastry i opatrunki dobrze się trzymały.",
      },
    ],
  },
  {
    title: "W dniu zabiegu (najważniejsze zasady!)",
    icon: CalendarDays,
    items: [
      {
        icon: Utensils,
        title: "Zjedz posiłek! NIE bądź na czczo",
        text: "To kluczowa informacja, która często zaskakuje pacjentów. Ponieważ zabieg wykonujemy w znieczuleniu miejscowym, absolutnie nie powinieneś być na czczo! Zjedz w domu lekki, pożywny posiłek (np. owsiankę, jogurt, kanapkę) i normalnie pij wodę. Pusty żołądek potęguje stres i sprzyja zasłabnięciom – zależy nam, byś miał energię i czuł się stabilnie i komfortoeo.",
      },
      {
        icon: Shirt,
        title: "Luźny, wygodny ubiór",
        text: "Zostaw w szafie obcisłe jeansy. Po zabiegu na Twojej nodze pojawi się opatrunek oraz specjalna pończocha uciskowa, przez co obwód nogi nieco się zwiększy. Załóż bardzo luźne ubranie – świetnie sprawdzą się szerokie spodnie dresowe, luźne spodnie materiałowe, a u pań długa spódnica lub sukienka.",
      },
      {
        icon: Footprints,
        title: "Płaskie obuwie",
        text: "Wybierz wygodne, stabilne buty na płaskiej podeszwie, które łatwo założysz na stopę ubraną w pończochę (np. wsuwane mokasyny, miękkie adidasy).",
      },
    ],
  },
];

const packingList = [
  { icon: FileText, text: "Dokument tożsamości (dowód osobisty)" },
  { icon: FileText, text: "Dokumentację medyczną i wyniki badań (np. dotychczasowe opisy USG, wyniki zleconych badań krwi)" },
  { icon: FileText, text: "Pończochę uciskową – jeśli ustalaliśmy, że przyniesiesz własną" },
];

const PrzygotowanieEVLT = () => {
  return (
    <>
      <SeoHead
        title="Przygotowanie do zabiegu EVLT | Checklista | CML Wilanów"
        description="Jak przygotować się do laserowego usuwania żylaków EVLT w znieczuleniu miejscowym: leki, posiłek, ubranie i pończochy. Checklista specjalistów CML Warszawa."
        path="/dla-pacjenta/przygotowanie-evlt"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-background via-accent/10 to-background pt-28 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs
            items={BREADCRUMBS_MAP["/dla-pacjenta/przygotowanie-evlt"]}
          />
          <motion.div {...fadeUp} className="mt-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Poradnik pacjenta
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight mb-6">
              Jak przygotować się do zabiegu{" "}
              <span className="text-primary">EVLT</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Laserowe usuwanie żylaków w znieczuleniu miejscowym
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
                Dzień dobry! Skoro czytasz ten poradnik, to znaczy, że najważniejszy krok w stronę zdrowych i lekkich nóg masz już za sobą – <strong className="text-foreground">decyzja o zabiegu została podjęta</strong>. To zupełnie naturalne, że przed wizytą w klinice możesz odczuwać lekki stres. Chcę Cię jednak od razu uspokoić: usiądź wygodnie, weź głęboki oddech i wyobraź sobie, że rozmawiamy przy dobrej kawie. Jesteś w bezpiecznych, doświadczonych rękach.
              </p>
              <p>
                Zabieg EVLT (wewnątrznaczyniowa ablacja laserowa) to dziś absolutny <strong className="text-foreground">złoty standard</strong> w leczeniu żylaków. Jest to metoda nowoczesna, niezwykle precyzyjna i bezpieczna. Co dla Ciebie najważniejsze – przeprowadzamy ją w <strong className="text-foreground">znieczuleniu miejscowym</strong>. Oznacza to pełen komfort, zminimalizowanie dolegliwości i ominięcie obciążenia, jakim jest narkoza ogólna. Będziemy cały czas w kontakcie, a tuż po zabiegu o własnych siłach wyjdziesz z gabinetu.
              </p>
              <p>
                Abyś mógł poczuć się pewnie i na spokojnie zaplanować najbliższe dni, przygotowałem dla Ciebie krótką listę wskazówek. Potraktuj ją jak wygodną checklistę.
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
            Spakuj te rzeczy dzień wcześniej, by tuż przed wyjściem mieć wolną głowę:
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

      <RecoveryBoostBanner />

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
              Pamiętaj, że zależy nam na Twoim poczuciu bezpieczeństwa równie mocno, jak na perfekcyjnym wykonaniu samego zabiegu. Będziemy Ci krok po kroku towarzyszyć, tłumacząc, co się dzieje. Większość naszych pacjentów tuż po zejściu z fotela zabiegowego z uśmiechem przyznaje:{" "}
              <em className="text-foreground font-medium">"To naprawdę nic strasznego!"</em>
            </p>
            <p className="text-muted-foreground mb-8">
              Jeśli masz jakiekolwiek wątpliwości przed przyjazdem, po prostu daj nam znać.
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

export default PrzygotowanieEVLT;
