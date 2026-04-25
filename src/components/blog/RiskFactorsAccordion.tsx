import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
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
  BookMarked,
  ArrowRight,
  Search,
  X,
  Bookmark,
  BookmarkCheck,
  ListChecks,
  Trash2,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { trackEbmClick } from "@/lib/ebmAnalytics";

/** Polski-friendly normalizer: lowercase + usuwa diakrytyki */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");

/** Podświetlenie dopasowanego fragmentu w tekście */
const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;
  const nText = normalize(text);
  const nQuery = normalize(query.trim());
  const idx = nText.indexOf(nQuery);
  if (idx === -1) return <>{text}</>;
  const end = idx + nQuery.length;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/25 text-foreground rounded px-0.5">
        {text.slice(idx, end)}
      </mark>
      {text.slice(end)}
    </>
  );
};

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

const STORAGE_KEY = "cml.hemoroidy.risk-factors.selected.v1";
const READ_STORAGE_KEY = "cml.hemoroidy.risk-factors.read.v1";

const loadStringArray = (key: string): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const RiskFactorsAccordion = () => {
  const [query, setQuery] = useState("");
  const nQuery = normalize(query.trim());

  // Otwarte sekcje (tryb ręczny — gdy nie ma aktywnego wyszukiwania)
  const [openItems, setOpenItems] = useState<string[]>([]);

  // Wybrane czynniki — persystencja w localStorage (anonimowo)
  const [selected, setSelected] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    } catch {
      /* noop */
    }
  }, [selected]);

  const toggleSelected = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const clearSelected = () => setSelected([]);

  const selectedFactors = useMemo(
    () => selected.map((id) => RISK_FACTORS.find((rf) => rf.id === id)).filter(Boolean) as RiskFactor[],
    [selected],
  );

  const filtered = useMemo(() => {
    if (!nQuery) return RISK_FACTORS;
    return RISK_FACTORS.filter((rf) => {
      const sourcesText = rf.sources.map((s) => s.label).join(" ");
      const haystack = normalize(`${rf.title} ${rf.shortBadge} ${rf.body} ${sourcesText}`);
      return haystack.includes(nQuery);
    });
  }, [nQuery]);

  // Auto-rozwijaj dopasowane karty podczas wyszukiwania (tryb wyszukiwania nadpisuje ręczny)
  const accordionValue = nQuery ? filtered.map((rf) => rf.id) : openItems;
  const allExpanded = openItems.length === RISK_FACTORS.length;
  const toggleAll = () =>
    setOpenItems(allExpanded ? [] : RISK_FACTORS.map((rf) => rf.id));

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

      {/* Wyszukiwarka — filtruje po tytule, badge'u i mechanizmie */}
      <div className="mb-4">
        <label htmlFor="risk-factors-search" className="sr-only">
          Szukaj w czynnikach ryzyka
        </label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="risk-factors-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj np. „błonnik”, „Cochrane”, „ASCRS”, „ciąża”…"
            className="pl-9 pr-10 bg-background/40 border-border/60"
            aria-describedby="risk-factors-search-hint"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="Wyczyść wyszukiwanie"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p
          id="risk-factors-search-hint"
          className="mt-2 text-[11.5px] sm:text-xs text-muted-foreground"
          aria-live="polite"
        >
          {nQuery
            ? `Znaleziono ${filtered.length} z ${RISK_FACTORS.length} czynników`
            : `Filtruje po tytule, oznaczeniu, mechanizmie i nazwie źródła (${RISK_FACTORS.length} kart)`}
        </p>
      </div>

      {/* Pasek akcji: Zwiń / Rozwiń wszystko (ukryty podczas wyszukiwania, które samo rozwija dopasowania) */}
      {!nQuery && filtered.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-[11.5px] sm:text-xs text-muted-foreground">
            {openItems.length === 0
              ? "Wszystkie sekcje zwinięte"
              : `Rozwinięte: ${openItems.length} z ${RISK_FACTORS.length}`}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleAll}
            className="gap-2"
            aria-expanded={allExpanded}
            aria-controls="risk-factors-list"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5" />
                Zwiń wszystko
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5" />
                Rozwiń wszystko
              </>
            )}
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/30 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Brak dopasowań dla „<span className="text-foreground">{query}</span>".
            Spróbuj innego słowa, np. <em>„błonnik”</em>, <em>„valsalva”</em> lub <em>„toaleta”</em>.
          </p>
        </div>
      ) : (
        <Accordion
          id="risk-factors-list"
          type="multiple"
          className="space-y-3 sm:space-y-2.5"
          value={accordionValue}
          onValueChange={(v) => {
            // Pozwól na ręczne zwijanie tylko gdy nie filtrujemy wyszukiwarką
            if (!nQuery) setOpenItems(v);
          }}
        >
          {filtered.map((rf) => {
            const Icon = rf.Icon;
            const isSelected = selected.includes(rf.id);
            return (
              <AccordionItem
                key={rf.id}
                value={rf.id}
                data-selected={isSelected}
                className="rounded-xl border border-border bg-background/40 overflow-hidden data-[state=open]:border-primary/40 data-[state=open]:bg-primary/5 data-[selected=true]:border-primary/60 data-[selected=true]:bg-primary/[0.07] transition-colors"
              >
                <AccordionTrigger className="px-3.5 sm:px-5 py-4 sm:py-3.5 hover:no-underline group text-left gap-2">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-3 flex-1 min-w-0">
                    <span className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-data-[state=open]:bg-primary/20 transition-colors mt-0.5 sm:mt-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </span>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <p className="font-heading text-[15px] sm:text-base md:text-lg text-foreground leading-snug">
                        <Highlight text={rf.title} query={query} />
                      </p>
                      <span className="inline-flex w-fit max-w-full items-center px-2 py-0.5 rounded-md text-[10.5px] sm:text-[11px] font-sans uppercase tracking-[0.06em] bg-destructive/10 text-destructive border border-destructive/25 leading-snug">
                        <span className="truncate">
                          <Highlight text={rf.shortBadge} query={query} />
                        </span>
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3.5 sm:px-5 pb-5">
                  <p className="text-[14px] sm:text-sm leading-relaxed text-foreground/90 pt-3 border-t border-border/50">
                    <Highlight text={rf.body} query={query} />
                  </p>
                  <div className="mt-5 sm:mt-4 rounded-lg bg-muted/30 border border-border/40 p-3 sm:p-3.5">
                    <p className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.14em] font-sans text-muted-foreground mb-2.5 inline-flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" />
                      Źródła EBM
                    </p>
                    <ul className="space-y-3 sm:space-y-2">
                      {rf.sources.map((s, i) => (
                        <li key={i} className="text-[13.5px] sm:text-sm flex flex-col gap-1">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackEbmClick({
                                url: s.url,
                                label: s.label,
                                source: "RiskFactorsAccordion",
                                kind: "external_source",
                                ebmId: s.ebmId,
                              })
                            }
                            className="text-primary hover:underline inline-flex items-start gap-1.5 leading-snug"
                          >
                            <span className="flex-1">
                              <Highlight text={s.label} query={query} />
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0 mt-1" />
                          </a>
                          {s.ebmId && (
                            <Link
                              to={`/dla-pacjenta/ebm-hemoroidy#ebm-${s.ebmId}`}
                              onClick={() =>
                                trackEbmClick({
                                  url: `/dla-pacjenta/ebm-hemoroidy#ebm-${s.ebmId}`,
                                  label: `kategoria bibliografii: ${s.ebmId}`,
                                  source: "RiskFactorsAccordion",
                                  kind: "internal_anchor",
                                  ebmId: s.ebmId,
                                })
                              }
                              className="text-[11.5px] sm:text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline w-fit"
                            >
                              → kategoria w bibliografii
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                    {(() => {
                      const primaryEbm = rf.sources.find((s) => s.ebmId)?.ebmId;
                      if (!primaryEbm) return null;
                      return (
                        <Link
                          to={`/dla-pacjenta/ebm-hemoroidy#ebm-${primaryEbm}`}
                          onClick={() =>
                            trackEbmClick({
                              url: `/dla-pacjenta/ebm-hemoroidy#ebm-${primaryEbm}`,
                              label: `Przejdź do bibliografii: ${primaryEbm}`,
                              source: "RiskFactorsAccordion",
                              kind: "internal_anchor",
                              ebmId: primaryEbm,
                            })
                          }
                          className="mt-3 inline-flex items-center gap-1.5 text-[12px] sm:text-xs font-sans uppercase tracking-[0.08em] text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm w-fit"
                          aria-label="Przejdź do odpowiedniej kategorii w pełnej bibliografii EBM"
                        >
                          <BookMarked className="w-3.5 h-3.5" aria-hidden="true" />
                          Przejdź do bibliografii
                          <ArrowRight className="w-3 h-3" aria-hidden="true" />
                        </Link>
                      );
                    })()}
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-[11.5px] sm:text-xs text-muted-foreground">
                      {isSelected
                        ? "Ten czynnik trafił do Twojej checklisty na dole."
                        : "Dotyczy Cię? Dodaj do swojej krótkiej checklisty ryzyka."}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => toggleSelected(rf.id)}
                      className="gap-2 self-start sm:self-auto"
                      aria-pressed={isSelected}
                    >
                      {isSelected ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          Zapisane — kliknij, aby usunąć
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          Zapisz moje ryzyko
                        </>
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <div className="mt-5 text-xs text-muted-foreground">
        Pełna bibliografia z linkami do PubMed, ASCRS, ESCP i Cochrane:{" "}
        <Link
          to="/dla-pacjenta/ebm-hemoroidy#bibliografia"
          onClick={() =>
            trackEbmClick({
              url: "/dla-pacjenta/ebm-hemoroidy#bibliografia",
              label: "Pełna bibliografia EBM",
              source: "RiskFactorsAccordion",
              kind: "internal_anchor",
            })
          }
          className="text-primary hover:underline"
        >
          moduł „Źródła EBM" →
        </Link>
      </div>

      {/* Moja checklista czynników ryzyka */}
      <motion.div
        layout
        id="moja-checklista-ryzyka"
        className="mt-8 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 sm:p-5"
        aria-labelledby="moja-checklista-heading"
      >
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4 text-primary" />
            </span>
            <div className="min-w-0">
              <h3
                id="moja-checklista-heading"
                className="font-heading text-base sm:text-lg text-foreground leading-tight"
              >
                Moja checklista czynników ryzyka
              </h3>
              <p className="text-[11.5px] sm:text-xs text-muted-foreground mt-0.5">
                Zapisywane lokalnie w przeglądarce (anonimowo). {selectedFactors.length} z {RISK_FACTORS.length} zaznaczonych.
              </p>
            </div>
          </div>
          {selectedFactors.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearSelected}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wyczyść
            </Button>
          )}
        </div>

        {selectedFactors.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground italic">
            Nic jeszcze nie zaznaczono. Rozwiń dowolny akordeon powyżej i kliknij{" "}
            <span className="not-italic font-medium text-foreground">„Zapisz moje ryzyko”</span>,
            aby zbudować swoją krótką listę.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {selectedFactors.map((rf) => {
              const Icon = rf.Icon;
              return (
                <li
                  key={rf.id}
                  className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5"
                >
                  <span className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] sm:text-sm font-medium text-foreground leading-snug">
                      {rf.title}
                    </p>
                    <p className="text-[11px] sm:text-[11.5px] text-muted-foreground leading-snug mt-0.5 truncate">
                      {rf.shortBadge}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSelected(rf.id)}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    aria-label={`Usuń „${rf.title}" z checklisty`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {selectedFactors.length > 0 && (
          <p className="mt-4 text-[11.5px] sm:text-xs text-muted-foreground">
            Pokaż tę listę lekarzowi na konsultacji — ułatwi to dobór profilaktyki i decyzje o leczeniu.
          </p>
        )}
      </motion.div>

      <RiskVsPreventionTable />
    </motion.section>
  );
};

/* ============================================================
   Tabela porównawcza: Ryzyko vs. Profilaktyka
   Linki do badań współdzielone z modułem „Źródła EBM"
   (te same URL-e + ebmId co w RISK_FACTORS).
   ============================================================ */

type Row = {
  risk: string;
  prevention: string;
  source: RiskSource;
};

const COMPARISON_ROWS: Row[] = [
  {
    risk: "Parcie i zaparcia (Valsalva) — ↑ ciśnienie żylne",
    prevention: "Błonnik 25–35 g/d + nawodnienie ≥2 l, krótkie wizyty w toalecie (<3 min)",
    source: {
      label: "ASCRS Clinical Practice Guidelines (2018)",
      url: "https://journals.lww.com/dcrjournal/Fulltext/2018/03000/The_American_Society_of_Colon_and_Rectal_Surgeons.7.aspx",
      ebmId: "guidelines",
    },
  },
  {
    risk: "Dieta uboga w błonnik — twardy stolec, krwawienie",
    prevention: "Psyllium 7–10 g/d (Cochrane: −50% objawów, poziom 1A)",
    source: {
      label: "Alonso-Coello P. et al. (2005) — Cochrane Review",
      url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004649.pub2/full",
      ebmId: "fiber",
    },
  },
  {
    risk: "Długie siedzenie na toalecie + smartfon",
    prevention: 'Zasada „3 minut”: jeśli nie ma efektu — wstań i wróć później',
    source: {
      label: "Garg P., Singh P. (2017) — TONE technique",
      url: "https://pubmed.ncbi.nlm.nih.gov/28206729/",
      ebmId: "toilet",
    },
  },
  {
    risk: "Stosunek analny bez przygotowania — mikrourazy, ↑ napięcie zwieracza",
    prevention: "Lubrykant na bazie wody/silikonu, stopniowa relaksacja, unikanie podczas zaostrzeń",
    source: {
      label: "ESCP guideline for haemorrhoidal disease (2020)",
      url: "https://onlinelibrary.wiley.com/doi/10.1111/codi.14975",
      ebmId: "guidelines",
    },
  },
  {
    risk: "Siedzący tryb życia — zastój żylny w miednicy",
    prevention: "Aktywność aerobowa 150 min/tydz. (chód, pływanie); unikać izometrii (deadlift max)",
    source: {
      label: "Johanson J.F., Sonnenberg A. (1990) — Gastroenterology",
      url: "https://pubmed.ncbi.nlm.nih.gov/2295392/",
      ebmId: "risk",
    },
  },
  {
    risk: "Przewlekła biegunka — drażnienie śluzówki",
    prevention: "Diagnostyka przyczyny (IBS/IBD), nawodnienie elektrolitowe, krótkie podmywanie wodą",
    source: {
      label: "ESCP guideline for haemorrhoidal disease (2020)",
      url: "https://onlinelibrary.wiley.com/doi/10.1111/codi.14975",
      ebmId: "guidelines",
    },
  },
];

const RiskVsPreventionTable = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className="mt-10"
      aria-labelledby="risk-vs-prevention-heading"
    >
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-3">
          <Scale className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-sans uppercase tracking-[0.16em] text-primary">
            Ryzyko vs. profilaktyka
          </span>
        </div>
        <h3
          id="risk-vs-prevention-heading"
          className="font-heading text-xl md:text-2xl text-foreground mb-1.5"
        >
          Co szkodzi — i co realnie chroni
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Każdy wiersz ma jedno źródło EBM (te same linki co w module „Źródła" powyżej i pełnej
          bibliografii). Otwieraj w nowej karcie — strona pozostaje w tle.
        </p>
      </div>

      {/* Desktop / tablet: tabela */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-background/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th scope="col" className="text-left font-sans uppercase tracking-[0.12em] text-[11px] text-muted-foreground px-4 py-3 w-[34%]">
                Czynnik ryzyka
              </th>
              <th scope="col" className="text-left font-sans uppercase tracking-[0.12em] text-[11px] text-muted-foreground px-4 py-3 w-[44%]">
                Profilaktyka (EBM)
              </th>
              <th scope="col" className="text-left font-sans uppercase tracking-[0.12em] text-[11px] text-muted-foreground px-4 py-3 w-[22%]">
                Źródło
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/50 last:border-b-0 hover:bg-primary/[0.03] transition-colors"
              >
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex items-start gap-2 text-foreground/90 leading-snug">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{row.risk}</span>
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-foreground/90 leading-snug">
                  {row.prevention}
                </td>
                <td className="px-4 py-3 align-top">
                  <a
                    href={row.source.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow external"
                    referrerPolicy="no-referrer"
                    onClick={() =>
                      trackEbmClick({
                        url: row.source.url,
                        label: row.source.label,
                        source: "RiskVsPreventionTable:desktop",
                        kind: "external_source",
                        ebmId: row.source.ebmId,
                      })
                    }
                    title="Otwórz źródło w nowej karcie"
                    className="text-primary hover:underline inline-flex items-start gap-1 leading-snug text-[13px]"
                  >
                    <span>{row.source.label}</span>
                    <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                  </a>
                  {row.source.ebmId && (
                    <Link
                      to={`/dla-pacjenta/ebm-hemoroidy#ebm-${row.source.ebmId}`}
                      onClick={() =>
                        trackEbmClick({
                          url: `/dla-pacjenta/ebm-hemoroidy#ebm-${row.source.ebmId}`,
                          label: `kategoria bibliografii: ${row.source.ebmId}`,
                          source: "RiskVsPreventionTable:desktop",
                          kind: "internal_anchor",
                          ebmId: row.source.ebmId,
                        })
                      }
                      className="block mt-1 text-[11.5px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                    >
                      → kategoria w bibliografii
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: karty zamiast tabeli */}
      <ul className="md:hidden space-y-3">
        {COMPARISON_ROWS.map((row, i) => (
          <li
            key={i}
            className="rounded-xl border border-border bg-background/40 p-4"
          >
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-[14px] text-foreground/90 leading-snug font-medium">
                {row.risk}
              </p>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mb-3">
              <p className="text-[10.5px] uppercase tracking-[0.14em] font-sans text-primary mb-1">
                Profilaktyka
              </p>
              <p className="text-[13.5px] text-foreground/90 leading-snug">
                {row.prevention}
              </p>
            </div>
            <a
              href={row.source.url}
              target="_blank"
              rel="noopener noreferrer nofollow external"
              referrerPolicy="no-referrer"
              onClick={() =>
                trackEbmClick({
                  url: row.source.url,
                  label: row.source.label,
                  source: "RiskVsPreventionTable:mobile",
                  kind: "external_source",
                  ebmId: row.source.ebmId,
                })
              }
              className="text-primary hover:underline inline-flex items-start gap-1.5 leading-snug text-[13px]"
            >
              <ExternalLink className="w-3 h-3 mt-1 shrink-0" aria-hidden="true" />
              <span>{row.source.label}</span>
            </a>
            {row.source.ebmId && (
              <Link
                to={`/dla-pacjenta/ebm-hemoroidy#ebm-${row.source.ebmId}`}
                onClick={() =>
                  trackEbmClick({
                    url: `/dla-pacjenta/ebm-hemoroidy#ebm-${row.source.ebmId}`,
                    label: `kategoria bibliografii: ${row.source.ebmId}`,
                    source: "RiskVsPreventionTable:mobile",
                    kind: "internal_anchor",
                    ebmId: row.source.ebmId,
                  })
                }
                className="block mt-1.5 text-[11.5px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
              >
                → kategoria w bibliografii
              </Link>
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground italic mt-4">
        Tabela edukacyjna oparta na ASCRS 2018, ESCP 2020, Cochrane i PubMed. Nie zastępuje
        konsultacji proktologicznej.
      </p>
    </motion.div>
  );
};

export default RiskFactorsAccordion;
