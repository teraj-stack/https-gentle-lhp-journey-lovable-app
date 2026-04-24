import { motion } from "framer-motion";
import {
  AlertTriangle,
  Salad,
  Droplet,
  Armchair,
  Baby,
  Scale,
  Dna,
  Smartphone,
  Dumbbell,
  Activity,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";

const easeOut = [0.16, 1, 0.3, 1] as const;

type RiskSource = {
  label: string;
  url: string;
  /** Id kategorii w EBMSourcesSection — do deep-linku #ebm-<id> */
  ebmId?: string;
};

type RiskFactor = {
  id: string;
  Icon: typeof AlertTriangle;
  title: string;
  shortBadge: string;
  body: string;
  sources: RiskSource[];
};

const RISK_FACTORS: RiskFactor[] = [
  {
    id: "constipation",
    Icon: AlertTriangle,
    title: "Przewlekłe zaparcia i parcie (Valsalva)",
    shortBadge: "Najsilniejszy modyfikowalny czynnik",
    body: "Twardy stolec wymusza długotrwałe parcie, które znacząco zwiększa ciśnienie żylne w splotach hemoroidalnych. To prowadzi do osłabienia tkanki łącznej i wypadania guzków. Według ASCRS i ESCP redukcja parcia jest priorytetem profilaktyki.",
    sources: [
      {
        label: "ASCRS Clinical Practice Guidelines (2018)",
        url: "https://journals.lww.com/dcrjournal/Fulltext/2018/03000/The_American_Society_of_Colon_and_Rectal_Surgeons.7.aspx",
        ebmId: "guidelines",
      },
      {
        label: "Garg P., Singh P. (2017) — Adequate fiber and TONE",
        url: "https://pubmed.ncbi.nlm.nih.gov/28206729/",
        ebmId: "toilet",
      },
    ],
  },
  {
    id: "fiber",
    Icon: Salad,
    title: "Dieta uboga w błonnik",
    shortBadge: "Cochrane: −50% objawów przy suplementacji",
    body: "Niedobór błonnika rozpuszczalnego (psyllium) zwiększa ryzyko twardych stolców, zaparć i krwawień. Suplementacja redukuje objawy o ok. 50% (Cochrane Systematic Review). To najsilniej rekomendowana interwencja zachowawcza (poziom dowodów 1A).",
    sources: [
      {
        label: "Alonso-Coello P. et al. (2005) — Cochrane Review",
        url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004649.pub2/full",
        ebmId: "fiber",
      },
      {
        label: "Alonso-Coello P. et al. (2006) — Meta-analiza fiber",
        url: "https://pubmed.ncbi.nlm.nih.gov/16405552/",
        ebmId: "fiber",
      },
    ],
  },
  {
    id: "hydration",
    Icon: Droplet,
    title: "Niedostateczne nawodnienie",
    shortBadge: "1,5–2 l wody / dobę (ASCRS, ESCP)",
    body: "Odwodniony stolec jest twardy i wymaga większego parcia — kluczowego mechanizmu uszkadzającego sploty hemoroidalne. Bez wody błonnik może paradoksalnie nasilać zaparcia.",
    sources: [
      {
        label: "Arnaud M.J. (2003) — Mild dehydration & constipation",
        url: "https://pubmed.ncbi.nlm.nih.gov/14681719/",
        ebmId: "hydration",
      },
      {
        label: "Anti M. et al. (1998) — Water + fiber synergia",
        url: "https://pubmed.ncbi.nlm.nih.gov/9684123/",
        ebmId: "hydration",
      },
    ],
  },
  {
    id: "sedentary",
    Icon: Armchair,
    title: "Siedzący tryb życia",
    shortBadge: "Niezależny czynnik ryzyka (PLoS ONE)",
    body: "Brak ruchu spowalnia perystaltykę i nasila zaparcia. Długie siedzenie powoduje także zastój żylny w miednicy. ESCP zaleca ≥150 min aktywności tygodniowo i przerwy w siedzeniu co 45–60 min.",
    sources: [
      {
        label: "Peery A.F. et al. (2015) — Risk factors PLoS ONE",
        url: "https://pubmed.ncbi.nlm.nih.gov/26406337/",
        ebmId: "activity",
      },
      {
        label: "De Schryver A.M. et al. (2005) — Activity & defecation",
        url: "https://pubmed.ncbi.nlm.nih.gov/16028436/",
        ebmId: "activity",
      },
    ],
  },
  {
    id: "pregnancy",
    Icon: Baby,
    title: "Ciąża i poród",
    shortBadge: "Ryzyko wzrasta 3–4×",
    body: "Ucisk macicy na żyły miednicy, wzrost relaksyny (osłabia tkankę łączną) oraz parcie podczas porodu zwiększają ryzyko. Choroba hemoroidalna dotyczy nawet 25–35% kobiet w ciąży i połogu.",
    sources: [
      {
        label: "Poskus T. et al. (2014) — BJOG cohort study",
        url: "https://pubmed.ncbi.nlm.nih.gov/24810254/",
        ebmId: "risk",
      },
    ],
  },
  {
    id: "obesity",
    Icon: Scale,
    title: "Otyłość i nadwaga",
    shortBadge: "Wzrost ciśnienia wewnątrzbrzusznego",
    body: "Zwiększona masa ciała przekłada się na wyższe ciśnienie wewnątrzbrzuszne, co utrudnia odpływ żylny ze splotów hemoroidalnych. Wymieniana w ESCP wśród modyfikowalnych czynników ryzyka.",
    sources: [
      {
        label: "Lohsiriwat V. (2012) — Pathophysiology review",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3342598/",
        ebmId: "risk",
      },
      {
        label: "Riss S. et al. (2012) — Prevalence in adults",
        url: "https://pubmed.ncbi.nlm.nih.gov/21932016/",
        ebmId: "activity",
      },
    ],
  },
  {
    id: "genetics",
    Icon: Dna,
    title: "Predyspozycje genetyczne",
    shortBadge: "Wrodzona słabość tkanki łącznej",
    body: "Tak jak żylaki kończyn dolnych, choroba hemoroidalna ma silny komponent rodzinny — wrodzone osłabienie kolagenu w ścianach naczyń. Tego czynnika nie zmienisz, ale można skuteczniej kontrolować pozostałe.",
    sources: [
      {
        label: "Lohsiriwat V. (2012) — Hemorrhoids pathophysiology",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3342598/",
        ebmId: "risk",
      },
    ],
  },
  {
    id: "toilet-time",
    Icon: Smartphone,
    title: "Długi czas w toalecie (smartfon)",
    shortBadge: "Granica bezpieczeństwa: 3–5 min",
    body: "Pozycja siedząca z opuszczonymi udami powoduje zastój żylny w okolicy odbytu. Scrollowanie telefonu wydłuża wizytę w toalecie i wielokrotnie zwiększa ekspozycję — udokumentowany czynnik ryzyka.",
    sources: [
      {
        label: "Garg P., Singh P. (2017) — Adequate fiber & TONE",
        url: "https://pubmed.ncbi.nlm.nih.gov/28206729/",
        ebmId: "toilet",
      },
      {
        label: "Sikirov D. (2003) — Pozycja a parcie",
        url: "https://pubmed.ncbi.nlm.nih.gov/12870773/",
        ebmId: "toilet",
      },
    ],
  },
  {
    id: "valsalva",
    Icon: Dumbbell,
    title: "Podnoszenie ciężarów na zatrzymanym oddechu",
    shortBadge: "Próba Valsalvy → skok ciśnienia",
    body: "Powtarzalny wzrost ciśnienia tłoczni brzusznej przy treningu siłowym z zatrzymanym oddechem działa na sploty hemoroidalne podobnie jak parcie na stolcu. Rozwiązanie: wydech podczas wysiłku.",
    sources: [
      {
        label: "Johanson J.F., Sonnenberg A. (1990) — Epidemiologia",
        url: "https://pubmed.ncbi.nlm.nih.gov/2295392/",
        ebmId: "toilet",
      },
    ],
  },
  {
    id: "diarrhea",
    Icon: Activity,
    title: "Przewlekła biegunka",
    shortBadge: "Drażni śluzówkę i osłabia poduszki",
    body: "Częste, luźne wypróżnienia drażnią śluzówkę odbytu i osłabiają poduszki naczyniowe. Wymaga diagnostyki przyczyny (IBS, IBD, infekcje) — nie tylko leczenia objawowego.",
    sources: [
      {
        label: "ESCP guideline for haemorrhoidal disease (2020)",
        url: "https://onlinelibrary.wiley.com/doi/10.1111/codi.14975",
        ebmId: "guidelines",
      },
    ],
  },
];

const RiskFactorsAccordion = () => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className="my-10 not-prose"
      aria-labelledby="risk-factors-heading"
    >
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/30 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs font-sans uppercase tracking-[0.16em] text-destructive">
            Co naprawdę zwiększa ryzyko
          </span>
        </div>
        <h2
          id="risk-factors-heading"
          className="font-heading text-2xl md:text-3xl text-foreground mb-2"
        >
          Najczęstsze czynniki ryzyka
        </h2>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
          Rozwiń kategorię, aby zobaczyć mechanizm i przejść do konkretnych badań w module
          „Źródła EBM" na dole artykułu lub do pełnej bibliografii.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {RISK_FACTORS.map((rf) => {
          const Icon = rf.Icon;
          return (
            <AccordionItem
              key={rf.id}
              value={rf.id}
              className="rounded-xl border border-border bg-background/40 overflow-hidden data-[state=open]:border-primary/40 data-[state=open]:bg-primary/5 transition-colors"
            >
              <AccordionTrigger className="px-4 sm:px-5 py-3.5 hover:no-underline group text-left">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-data-[state=open]:bg-primary/20 transition-colors">
                    <Icon className="w-4 h-4 text-primary" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-base md:text-lg text-foreground leading-snug">
                      {rf.title}
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      {rf.shortBadge}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-5 pb-5">
                <p className="text-sm leading-relaxed text-foreground/90 pt-2 border-t border-border/50">
                  {rf.body}
                </p>
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-sans text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    Źródła EBM
                  </p>
                  <ul className="space-y-1.5">
                    {rf.sources.map((s, i) => (
                      <li key={i} className="text-sm">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {s.label}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {s.ebmId && (
                          <>
                            {" · "}
                            <Link
                              to={`/dla-pacjenta/ebm-hemoroidy#ebm-${s.ebmId}`}
                              className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                            >
                              kategoria w bibliografii →
                            </Link>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="mt-5 text-xs text-muted-foreground">
        Pełna bibliografia z linkami do PubMed, ASCRS, ESCP i Cochrane:{" "}
        <Link
          to="/dla-pacjenta/ebm-hemoroidy#bibliografia"
          className="text-primary hover:underline"
        >
          moduł „Źródła EBM" →
        </Link>
      </div>
    </motion.section>
  );
};

export default RiskFactorsAccordion;
