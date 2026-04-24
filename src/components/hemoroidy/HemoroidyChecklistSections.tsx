import { motion } from "framer-motion";
import {
  Apple,
  Droplets,
  Timer,
  Activity,
  Stethoscope,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";

const easeOut = [0.16, 1, 0.3, 1] as const;

type ChecklistSection = {
  id: string;
  Icon: typeof Apple;
  title: string;
  lead: string;
  items: string[];
  source: string;
};

const sections: ChecklistSection[] = [
  {
    id: "fiber",
    Icon: Apple,
    title: "1. Błonnik 25–35 g dziennie",
    lead: "Miękki, uformowany stolec to najsilniejsza profilaktyka hemoroidów (Cochrane 2005, ASCRS 2018).",
    items: [
      "Warzywa, owoce, pełne ziarno, strączki — z każdym posiłkiem",
      "Babka płesznik (psyllium) 1 łyżka stołowa dziennie + szklanka wody",
      "Wprowadzaj błonnik stopniowo (przez 2 tygodnie), aby uniknąć wzdęć",
      "Ogranicz żywność wysokoprzetworzoną, fast food i biały chleb",
    ],
    source: "Wytyczne ASCRS 2018 · Cochrane 2005",
  },
  {
    id: "hydration",
    Icon: Droplets,
    title: "2. Nawodnienie 2–2,5 l wody",
    lead: "Bez wody błonnik twardnieje i pogarsza zaparcia. Pij regularnie przez cały dzień.",
    items: [
      "2–2,5 l czystej wody dziennie (więcej przy upale i aktywności)",
      "Szklanka wody zaraz po przebudzeniu — uruchamia perystaltykę",
      "Kawa i herbata nie liczą się w pełni (efekt diuretyczny)",
      "Sygnał ostrzegawczy: ciemny kolor moczu = za mało wody",
    ],
    source: "ESCP Guidelines · ASCRS 2018",
  },
  {
    id: "toilet",
    Icon: Timer,
    title: "3. Nawyki toaletowe — max 3 min",
    lead: "Długie siedzenie i parcie to bezpośrednia przyczyna powiększania się hemoroidów.",
    items: [
      "Maksymalnie 3 minuty na sedesie — bez telefonu, książki i gazety",
      "Pozycja kuczna: podnóżek (~20 cm) prostuje kąt odbytniczo-odbytowy",
      "Nie odkładaj parcia — reaguj na pierwszy sygnał z jelit",
      "Bez parcia (próby Valsalvy) — to ono uszkadza sploty żylne",
    ],
    source: "ASCRS 2018 · Garg 2018",
  },
  {
    id: "movement",
    Icon: Activity,
    title: "4. Ruch min. 30 min dziennie",
    lead: "Aktywność stymuluje perystaltykę i poprawia powrót żylny w okolicy miednicy.",
    items: [
      "30 min spaceru, pływania lub jazdy rowerem dziennie",
      "Co 45–60 min pracy siedzącej — wstań i przejdź się 2–3 minuty",
      "Ćwiczenia Kegla 3×10 dziennie — wzmacniają mięśnie dna miednicy",
      "Przy podnoszeniu ciężarów — wydychaj powietrze (unikaj próby Valsalvy)",
    ],
    source: "ESCP Guidelines · WHO Physical Activity",
  },
  {
    id: "symptoms",
    Icon: Stethoscope,
    title: "5. Objawy — kiedy do proktologa",
    lead: "Każde krwawienie z odbytu wymaga oceny — nawet jednorazowe. Wczesna diagnoza = leczenie małoinwazyjne (LHP).",
    items: [
      "Krwawienie (jasne lub ciemne) — zawsze wymaga konsultacji",
      "Wyczuwalny guzek lub wypadanie hemoroidów po wypróżnieniu",
      "Świąd, pieczenie, ból utrzymujący się ponad 7 dni",
      "Zmiana rytmu wypróżnień, naprzemienne biegunki/zaparcia (≥40 r.ż.)",
    ],
    source: "ASCRS 2018 · NICE Guidelines",
  },
  {
    id: "urgent",
    Icon: AlertOctagon,
    title: "6. Pilnie do lekarza (24–48 h)",
    lead: "Niektóre objawy wymagają natychmiastowej oceny — nie zwlekaj.",
    items: [
      "Obfite krwawienie (zalewa muszlę, zawroty głowy, osłabienie)",
      "Silny narastający ból okolicy odbytu",
      "Twardy, bolesny guz (możliwa zakrzepica hemoroidu)",
      "Gorączka z bólem okolicy odbytu (ryzyko ropnia)",
    ],
    source: "ASCRS Emergency Criteria",
  },
];

const HemoroidyChecklistSections = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="text-center mb-10"
      >
        <p className="text-xs font-sans uppercase tracking-[0.18em] text-primary mb-3">
          Checklista 4 filarów + objawy
        </p>
        <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3">
          Pełna profilaktyka hemoroidów
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          Każde zalecenie z Twojego wyniku linkuje bezpośrednio do odpowiedniej sekcji poniżej.
        </p>
      </motion.div>

      <div className="space-y-5">
        {sections.map((section, idx) => {
          const SectionIcon = section.Icon;
          const isUrgent = section.id === "urgent";
          return (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: idx * 0.05, ease: easeOut }}
              className={`scroll-mt-32 glass-card rounded-2xl p-6 md:p-7 border ${
                isUrgent ? "border-destructive/40 bg-destructive/5" : "border-border"
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isUrgent ? "bg-destructive/15" : "bg-primary/15"
                  }`}
                >
                  <SectionIcon
                    className={`w-5 h-5 ${isUrgent ? "text-destructive" : "text-primary"}`}
                  />
                </div>
                <div>
                  <h3 className="font-heading text-xl md:text-2xl text-foreground leading-tight mb-1.5">
                    {section.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{section.lead}</p>
                </div>
              </div>

              <ul className="space-y-2.5 ml-0 md:ml-[60px]">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      className={`w-4 h-4 mt-1 shrink-0 ${
                        isUrgent ? "text-destructive" : "text-primary"
                      }`}
                    />
                    <span className="text-sm md:text-base text-foreground/90 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/70 mt-4 ml-0 md:ml-[60px]">
                Źródło: {section.source}
              </p>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
};

export default HemoroidyChecklistSections;
