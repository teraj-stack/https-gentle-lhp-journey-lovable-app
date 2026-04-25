import { motion } from "framer-motion";
import { AlertTriangle, ExternalLink } from "lucide-react";
import FaqSchema from "@/components/shared/FaqSchema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trackEbmClick } from "@/lib/ebmAnalytics";

const easeOut = [0.16, 1, 0.3, 1] as const;

type Source = { label: string; url: string };

type RedFlagFaq = {
  q: string;
  a: string;
  sources: Source[];
};

const RED_FLAG_FAQS: RedFlagFaq[] = [
  {
    q: "Krwawienie z odbytu — kiedy to NIE są „zwykłe” hemoroidy?",
    a: "Każde krwawienie z odbytu wymaga oceny lekarskiej, ale do PILNEJ konsultacji (24–72 h) kwalifikują: krew ciemna/skrzepy, krwawienie obfite (zalewa muszlę), krwawienie bez wypróżnienia, towarzyszący ból brzucha, gorączka, spadek wagi, anemia, wiek >45 lat lub wywiad rodzinny raka jelita. To może maskować polipy, chorobę zapalną jelit (IBD) lub raka jelita grubego — diagnostyka różnicowa jest obowiązkowa zgodnie z wytycznymi USMSTF i ASCRS.",
    sources: [
      {
        label: "USMSTF 2017 — Colorectal Cancer Screening (Rex et al., Gastroenterology)",
        url: "https://pubmed.ncbi.nlm.nih.gov/28600072/",
      },
      {
        label: "ASCRS 2018 — Hemorrhoid Management Guidelines (Davis et al.)",
        url: "https://journals.lww.com/dcrjournal/Fulltext/2018/03000/The_American_Society_of_Colon_and_Rectal_Surgeons.7.aspx",
      },
    ],
  },
  {
    q: "Silny, narastający ból odbytu — co może oznaczać?",
    a: "Hemoroidy zazwyczaj NIE bolą silnie (są wewnątrz, bez unerwienia czuciowego). Nagły, ostry ból sugeruje: zakrzepicę guzka krwawniczego (sino-fioletowy guzek na brzegu odbytu), szczelinę odbytu (ból ostry przy wypróżnieniu, krew jasnoczerwona), ropień okołoodbytniczy (ból narastający, gorączka, obrzęk) lub uwięźnięte hemoroidy IV°. Ropień to STAN NAGŁY — wymaga drenażu w ciągu 24 h.",
    sources: [
      {
        label: "ESCP 2020 — Haemorrhoidal Disease Guideline (van Tol et al.)",
        url: "https://onlinelibrary.wiley.com/doi/10.1111/codi.14975",
      },
      {
        label: "Lohsiriwat V. (2012) — Hemorrhoids: pathophysiology to clinical management",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3342598/",
      },
    ],
  },
  {
    q: "Guzek przy odbycie nie cofa się ani nie znika — kiedy to alarm?",
    a: "Stale wystający guzek może być: zakrzepicą żylakową (ostry ból + sino-niebieski kolor — drenaż w pierwszych 72 h przynosi ulgę), wypadającym hemoroidem IV° (nieodprowadzalny — wskazanie do zabiegu), polipem odbytu lub zmianą nowotworową. Każda zmiana, która nie ustępuje w ciągu 7 dni mimo leczenia zachowawczego, wymaga oceny proktologicznej z anoskopią.",
    sources: [
      {
        label: "ASCRS 2018 — Clinical Practice Guidelines (Davis et al.)",
        url: "https://journals.lww.com/dcrjournal/Fulltext/2018/03000/The_American_Society_of_Colon_and_Rectal_Surgeons.7.aspx",
      },
      {
        label: "Greenspon et al. (2004) — Thrombosed external hemorrhoids: outcome of conservative vs surgical mgmt",
        url: "https://pubmed.ncbi.nlm.nih.gov/15486746/",
      },
    ],
  },
  {
    q: "Zmiana rytmu wypróżnień + krew — czy to może być rak jelita?",
    a: "TAK, to klasyczna „czerwona flaga” onkologiczna. Wytyczne USMSTF i NICE wskazują na konieczność pilnej kolonoskopii przy: zmianie rytmu wypróżnień >6 tygodni, naprzemiennej biegunce/zaparciu, krwi zmieszanej ze stolcem (nie tylko na papierze), uczuciu niepełnego wypróżnienia (tenesmus), nieuzasadnionej utracie wagi >5%, niedokrwistości z niedoboru żelaza. Hemoroidy NIE wykluczają raka — mogą współistnieć.",
    sources: [
      {
        label: "USMSTF 2017 — CRC Screening Recommendations (Gastroenterology)",
        url: "https://pubmed.ncbi.nlm.nih.gov/28600072/",
      },
      {
        label: "NICE NG12 — Suspected cancer: recognition and referral (2015, aktualizacja 2023)",
        url: "https://www.nice.org.uk/guidance/ng12",
      },
    ],
  },
  {
    q: "Gorączka, dreszcze, narastający ból okołoodbytniczy — jak szybko reagować?",
    a: "PILNE — to objawy ropnia okołoodbytniczego lub posocznicy okołoodbytniczej (zwłaszcza u pacjentów z cukrzycą lub immunosupresją). Wymagają oceny CHIRURGICZNEJ w ciągu kilku godzin. Nieleczony ropień może prowadzić do przetoki okołoodbytniczej (FiLaC) lub martwiczego zapalenia tkanek (gangrena Fourniera). Nie czekaj „aż samo przejdzie” — zgłoś się na SOR lub do izby przyjęć chirurgicznej.",
    sources: [
      {
        label: "ASCRS 2016 — Practice Parameters for Anorectal Abscess and Fistula",
        url: "https://pubmed.ncbi.nlm.nih.gov/27893429/",
      },
      {
        label: "Sahnan et al. (2017) — Perianal abscess: BMJ Best Practice review",
        url: "https://www.bmj.com/content/356/bmj.j475",
      },
    ],
  },
  {
    q: "Nawracające krwawienie pomimo zmiany stylu życia — kiedy do specjalisty?",
    a: "Jeśli mimo wdrożenia zaleceń (błonnik 25–35 g/d, woda 2 l/d, krótkie wizyty w toalecie) krwawienie utrzymuje się >2 tygodni lub nawraca w ciągu 4–8 tygodni — wskazana konsultacja proktologiczna z anoskopią/rektoskopią. Zgodnie z ESCP utrzymujące się objawy II–III° są wskazaniem do leczenia zabiegowego (LHP, ligacja gumkami, skleroterapia) zamiast przedłużania leczenia zachowawczego.",
    sources: [
      {
        label: "ESCP 2020 — Haemorrhoidal Disease Guideline (van Tol et al.)",
        url: "https://onlinelibrary.wiley.com/doi/10.1111/codi.14975",
      },
      {
        label: "Naderan M. et al. (2017) — RCT: LHP vs Milligan-Morgan",
        url: "https://pubmed.ncbi.nlm.nih.gov/27922290/",
      },
    ],
  },
];

const RedFlagsFAQ = () => {
  const faqsForSchema = RED_FLAG_FAQS.map((f) => ({ q: f.q, a: f.a }));

  return (
    <section
      className="max-w-3xl mx-auto"
      aria-labelledby="red-flags-faq-heading"
    >
      <FaqSchema
        faqs={faqsForSchema}
        name="FAQ — Objawy alarmowe hemoroidów: kiedy pilnie do lekarza"
        url="https://mcml.pro/dla-pacjenta/quiz-hemoroidy"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 border border-destructive/30 mb-4">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs font-sans uppercase tracking-[0.18em] text-destructive">
            Czerwone flagi · EBM
          </span>
        </div>
        <h2
          id="red-flags-faq-heading"
          className="font-heading text-2xl md:text-4xl text-foreground mb-3"
        >
          Objawy alarmowe — <em className="text-destructive not-italic">kiedy pilnie do lekarza?</em>
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          6 najczęstszych „red flags” w proktologii — z odpowiedziami opartymi na wytycznych
          ASCRS, ESCP, USMSTF i NICE. Uzupełnienie do oznaczeń ryzyka w teście powyżej.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: easeOut }}
      >
        <Accordion type="multiple" className="space-y-2">
          {RED_FLAG_FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`red-flag-${i}`}
              className="rounded-xl border border-destructive/20 bg-background/40 overflow-hidden data-[state=open]:border-destructive/50 data-[state=open]:bg-destructive/5 transition-colors"
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline group text-left">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 group-data-[state=open]:bg-destructive/20 transition-colors mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </span>
                  <p className="font-heading text-base md:text-lg text-foreground flex-1">
                    {faq.q}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="pt-2 border-t border-border/50 space-y-4">
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed pt-3">
                    {faq.a}
                  </p>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2 font-sans">
                      Źródła EBM
                    </p>
                    <ul className="space-y-1.5">
                      {faq.sources.map((src, j) => (
                        <li key={j} className="text-xs md:text-sm">
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackEbmClick({
                                url: src.url,
                                label: src.label,
                                source: "RedFlagsFAQ",
                                kind: "external_source",
                              })
                            }
                            className="text-primary hover:underline inline-flex items-start gap-1.5 leading-snug"
                          >
                            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{src.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>

      <p className="text-xs text-muted-foreground italic mt-6 text-center max-w-2xl mx-auto">
        Treść edukacyjna oparta na wytycznych ASCRS, ESCP, USMSTF i NICE. Nie zastępuje konsultacji
        lekarskiej — w razie wątpliwości zawsze skontaktuj się z proktologiem.
      </p>
    </section>
  );
};

export default RedFlagsFAQ;
