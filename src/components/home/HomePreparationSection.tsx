import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ClipboardList, Check, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const anim = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const generalGroups = [
  {
    title: "Tydzień przed zabiegiem",
    items: [
      "Zgłoś nam wszystkie przyjmowane leki — szczególnie przeciwzakrzepowe (acenokumarol, NOAC, klopidogrel) i aspirynę. Nigdy nie odstawiaj ich samodzielnie.",
      "Pij 2–2,5 l wody dziennie — dobrze nawodnione tkanki lepiej się goją, a żyły są lepiej widoczne w USG.",
      "Przy zabiegach proktologicznych wprowadź dietę bogatą w błonnik, aby stolec pozostał miękki.",
      "Przy zabiegach na nogach unikaj solarium, opalania i samoopalaczy.",
    ],
  },
  {
    title: "Dzień przed zabiegiem",
    items: [
      "Unikaj alkoholu — rozszerza naczynia, pogarsza krzepliwość i zwiększa ryzyko siniaków.",
      "Nie gol ani nie depiluj okolicy zabiegowej — mikrouszkodzenia skóry to ryzyko infekcji.",
      "Umyj okolicę zabiegową wodą z delikatnym mydłem; nie nakładaj kremów, balsamów ani olejków.",
      "Zjedz lekkostrawną kolację. Post obowiązuje wyłącznie przy znieczuleniu ogólnym — wtedy przekażemy osobne instrukcje.",
    ],
  },
  {
    title: "W dniu zabiegu",
    items: [
      "Zjedz lekki posiłek 1–2 godziny przed wizytą — przy znieczuleniu miejscowym nie musisz być na czczo.",
      "Noś luźną, nieuciskającą odzież z naturalnych tkanin i buty bez obcasa.",
      "Skóra ma być czysta i sucha: bez kremów, pudrów, dezodorantu i perfum.",
      "Zabierz dowód osobisty, listę leków, wyniki badań oraz — przy zabiegach żylnych — pończochę uciskową II klasy.",
      "Po znieczuleniu dożylnym nie prowadź samochodu — zaplanuj powrót z osobą towarzyszącą.",
    ],
  },
];

const guides = [
  { label: "EVLT — laserowe zamknięcie żył", href: "/dla-pacjenta/przygotowanie-evlt" },
  { label: "CLaCS — pajączki", href: "/dla-pacjenta/przygotowanie-clacs" },
  { label: "Skleroterapia", href: "/dla-pacjenta/przygotowanie-skleroterapia" },
  { label: "Mikroflebektomia", href: "/dla-pacjenta/przygotowanie-mikroflebektomia" },
  { label: "LHP — hemoroidy", href: "/dla-pacjenta/przygotowanie-lhp" },
  { label: "FiLaC — przetoka", href: "/dla-pacjenta/przygotowanie-filac" },
  { label: "SiLaC — zatoka włosowa", href: "/dla-pacjenta/przygotowanie-silac" },
  { label: "Plastyka okolicy odbytu", href: "/dla-pacjenta/przygotowanie-plastyka" },
];

const HomePreparationSection = () => (
  <motion.section
    {...anim}
    id="przygotowanie-do-zabiegu"
    aria-labelledby="home-preparation-heading"
    className="py-16 md:py-20 scroll-mt-24"
  >
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="glass-card rounded-2xl p-6 md:p-10">
        <div className="flex items-start gap-4 mb-4">
          <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </span>
          <div>
            <h2
              id="home-preparation-heading"
              className="text-2xl md:text-3xl font-serif font-bold text-foreground"
            >
              Przygotowanie do zabiegu
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Rozwiń listę — konkretne instrukcje przed wizytą w CML.
            </p>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed mb-6">
          Większość naszych zabiegów wykonujemy w znieczuleniu miejscowym, w trybie
          jednego dnia. Poniżej uniwersalna checklista — przy każdym zabiegu
          znajdziesz też szczegółową instrukcję krok po kroku.
        </p>

        <Accordion type="single" collapsible defaultValue="home-prep-0" className="w-full">
          {generalGroups.map((group, idx) => (
            <AccordionItem key={group.title} value={`home-prep-${idx}`}>
              <AccordionTrigger className="text-left">
                <h3 className="text-base md:text-lg font-medium text-foreground">
                  {group.title}
                </h3>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 pt-1">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm md:text-base text-muted-foreground leading-relaxed"
                    >
                      <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary" strokeWidth={3} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-8">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Instrukcje dla konkretnych zabiegów
          </h3>
          <ul className="grid sm:grid-cols-2 gap-2">
            {guides.map((guide) => (
              <li key={guide.href}>
                <Link
                  to={guide.href}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-border/60 px-4 py-3 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <span>{guide.label}</span>
                  <ArrowRight className="w-4 h-4 text-primary opacity-60 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </motion.section>
);

export default HomePreparationSection;
