import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookMarked, Download, ExternalLink, Salad, Droplet, Timer, Activity, Stethoscope, ScrollText, AlertCircle, Microscope, Info, Search, X } from "lucide-react";

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");

const PDF_URL =
  "https://jowtjcyevactqmhqrytz.supabase.co/storage/v1/object/public/blog-covers/downloads%2Fzrodla-EBM-profilaktyka-hemoroidow-CML.pdf";

type Source = {
  authors: string;
  year: string;
  title: string;
  journal: string;
  url: string;
};

type Category = {
  id: string;
  title: string;
  intro: string;
  Icon: typeof BookMarked;
  items: Source[];
};

const CATEGORIES: Category[] = [
  {
    id: "guidelines",
    title: "Wytyczne kliniczne",
    intro: "Oficjalne rekomendacje towarzystw kolorektalnych — fundament zaleceń profilaktycznych.",
    Icon: ScrollText,
    items: [
      {
        authors: "Davis B.R. et al.",
        year: "2018",
        title: "ASCRS Clinical Practice Guidelines for the Management of Hemorrhoids",
        journal: "Diseases of the Colon & Rectum, 61(3):284–292",
        url: "https://journals.lww.com/dcrjournal/Fulltext/2018/03000/The_American_Society_of_Colon_and_Rectal_Surgeons.7.aspx",
      },
      {
        authors: "van Tol R.R. et al.",
        year: "2020",
        title: "European Society of ColoProctology: guideline for haemorrhoidal disease",
        journal: "Colorectal Disease, 22(6):650–662",
        url: "https://onlinelibrary.wiley.com/doi/10.1111/codi.14975",
      },
      {
        authors: "Cocorullo G. et al.",
        year: "2017",
        title: "Non-surgical management for hemorrhoidal disease — A systematic review",
        journal: "G Chir, 38(1):5–14",
        url: "https://pubmed.ncbi.nlm.nih.gov/28460197/",
      },
    ],
  },
  {
    id: "fiber",
    title: "Błonnik i dieta",
    intro: "Dowody na skuteczność błonnika rozpuszczalnego (psyllium) w redukcji objawów i krwawienia.",
    Icon: Salad,
    items: [
      {
        authors: "Alonso-Coello P. et al.",
        year: "2005",
        title: "Laxatives for the treatment of hemorrhoids — Cochrane Systematic Review",
        journal: "Cochrane Database Syst Rev, (4):CD004649",
        url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004649.pub2/full",
      },
      {
        authors: "Alonso-Coello P. et al.",
        year: "2006",
        title: "Fiber for the treatment of hemorrhoids complications: systematic review and meta-analysis",
        journal: "Am J Gastroenterol, 101(1):181–188",
        url: "https://pubmed.ncbi.nlm.nih.gov/16405552/",
      },
      {
        authors: "Moesgaard F. et al.",
        year: "1982",
        title: "High-fiber diet reduces bleeding and pain in patients with hemorrhoids — double-blind trial",
        journal: "Diseases of the Colon & Rectum, 25(5):454–456",
        url: "https://pubmed.ncbi.nlm.nih.gov/6284457/",
      },
    ],
  },
  {
    id: "hydration",
    title: "Nawodnienie i konsystencja stolca",
    intro: "Związek niedostatecznej podaży płynów z zaparciami — kluczowym czynnikiem ryzyka.",
    Icon: Droplet,
    items: [
      {
        authors: "Arnaud M.J.",
        year: "2003",
        title: "Mild dehydration: a risk factor of constipation?",
        journal: "Eur J Clin Nutr, 57 Suppl 2:S88–S95",
        url: "https://pubmed.ncbi.nlm.nih.gov/14681719/",
      },
      {
        authors: "Anti M. et al.",
        year: "1998",
        title: "Water supplementation enhances the effect of high-fiber diet on stool frequency",
        journal: "Hepatogastroenterology, 45(21):727–732",
        url: "https://pubmed.ncbi.nlm.nih.gov/9684123/",
      },
    ],
  },
  {
    id: "toilet",
    title: "Nawyki toaletowe i parcie",
    intro: "Rola czasu w toalecie, parcia (próby Valsalvy) i pozycji ciała w patogenezie.",
    Icon: Timer,
    items: [
      {
        authors: "Garg P., Singh P.",
        year: "2017",
        title: "Adequate dietary fiber and TONE can help avoid surgery in advanced hemorrhoids",
        journal: "Minerva Gastroenterol Dietol, 63(2):92–96",
        url: "https://pubmed.ncbi.nlm.nih.gov/28206729/",
      },
      {
        authors: "Sikirov D.",
        year: "2003",
        title: "Comparison of straining during defecation in three positions",
        journal: "Dig Dis Sci, 48(7):1201–1205",
        url: "https://pubmed.ncbi.nlm.nih.gov/12870773/",
      },
      {
        authors: "Johanson J.F., Sonnenberg A.",
        year: "1990",
        title: "The prevalence of hemorrhoids and chronic constipation — epidemiologic study",
        journal: "Gastroenterology, 98(2):380–386",
        url: "https://pubmed.ncbi.nlm.nih.gov/2295392/",
      },
    ],
  },
  {
    id: "activity",
    title: "Aktywność fizyczna i siedzący tryb życia",
    intro: "Wpływ ruchu na motorykę jelit i czynniki ryzyka choroby hemoroidalnej.",
    Icon: Activity,
    items: [
      {
        authors: "Riss S. et al.",
        year: "2012",
        title: "The prevalence of hemorrhoids in adults",
        journal: "Int J Colorectal Dis, 27(2):215–220",
        url: "https://pubmed.ncbi.nlm.nih.gov/21932016/",
      },
      {
        authors: "Peery A.F. et al.",
        year: "2015",
        title: "Risk factors for hemorrhoids on screening colonoscopy",
        journal: "PLoS ONE, 10(9):e0139100",
        url: "https://pubmed.ncbi.nlm.nih.gov/26406337/",
      },
      {
        authors: "De Schryver A.M. et al.",
        year: "2005",
        title: "Effects of regular physical activity on defecation pattern in chronic constipation",
        journal: "Scand J Gastroenterol, 40(4):422–429",
        url: "https://pubmed.ncbi.nlm.nih.gov/16028436/",
      },
    ],
  },
  {
    id: "risk",
    title: "Czynniki ryzyka — ciąża, wiek, masa ciała",
    intro: "Modyfikowalne i niemodyfikowalne czynniki ryzyka z badań populacyjnych.",
    Icon: AlertCircle,
    items: [
      {
        authors: "Poskus T. et al.",
        year: "2014",
        title: "Haemorrhoids and anal fissures during pregnancy and after childbirth — cohort study",
        journal: "BJOG, 121(13):1666–1671",
        url: "https://pubmed.ncbi.nlm.nih.gov/24810254/",
      },
      {
        authors: "Lohsiriwat V.",
        year: "2012",
        title: "Hemorrhoids: from basic pathophysiology to clinical management",
        journal: "World J Gastroenterol, 18(17):2009–2017",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3342598/",
      },
    ],
  },
  {
    id: "diagnosis",
    title: "Diagnostyka i kiedy do lekarza",
    intro: "Zasady różnicowania krwawień z odbytu i wskazania do oceny specjalistycznej / kolonoskopii.",
    Icon: Stethoscope,
    items: [
      {
        authors: "Rex D.K. et al.",
        year: "2017",
        title: "Colorectal Cancer Screening: Recommendations from U.S. Multi-Society Task Force",
        journal: "Gastroenterology, 153(1):307–323",
        url: "https://pubmed.ncbi.nlm.nih.gov/28600072/",
      },
      {
        authors: "Wilkins T. et al.",
        year: "2013",
        title: "Diagnosis and management of acute diverticulitis",
        journal: "Am Fam Physician, 87(9):612–620",
        url: "https://pubmed.ncbi.nlm.nih.gov/23668524/",
      },
    ],
  },
  {
    id: "lhp",
    title: "Leczenie laserowe (LHP) i małoinwazyjne",
    intro: "Dowody skuteczności i bezpieczeństwa LHP w porównaniu z metodami klasycznymi.",
    Icon: Microscope,
    items: [
      {
        authors: "Naderan M. et al.",
        year: "2017",
        title: "RCT: Laser Intra-Hemorrhoidal Coagulation vs Milligan-Morgan Hemorrhoidectomy",
        journal: "J Invest Surg, 30(5):325–331",
        url: "https://pubmed.ncbi.nlm.nih.gov/27922290/",
      },
      {
        authors: "Maloku H. et al.",
        year: "2014",
        title: "Laser Hemorrhoidoplasty vs Open Surgical Hemorrhoidectomy (3rd–4th degree)",
        journal: "Acta Inform Med, 22(6):365–367",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4315629/",
      },
      {
        authors: "Brusciano L. et al.",
        year: "2020",
        title: "Postoperative Discomfort and Pain: Laser vs Conventional Hemorrhoidectomy",
        journal: "Updates Surg, 72(3):851–857",
        url: "https://pubmed.ncbi.nlm.nih.gov/32086781/",
      },
    ],
  },
];

const easeOut = [0.16, 1, 0.3, 1] as const;

interface EBMSourcesSectionProps {
  /** Pokazuj tylko wybrane kategorie (po id). Domyślnie wszystkie. */
  categoryIds?: string[];
  /** Tytuł sekcji */
  title?: string;
  /** Subtitle */
  subtitle?: string;
}

const EBMSourcesSection = ({
  categoryIds,
  title = "Źródła EBM",
  subtitle = "Pełna bibliografia oparta na wytycznych ASCRS, ESCP, Cochrane i recenzowanych publikacjach z PubMed.",
}: EBMSourcesSectionProps) => {
  const baseCats = categoryIds
    ? CATEGORIES.filter((c) => categoryIds.includes(c.id))
    : CATEGORIES;

  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const byCat = activeCat === "all" ? baseCats : baseCats.filter((c) => c.id === activeCat);
    if (q.length < 2) {
      return byCat.map((c) => ({ ...c, matchedItems: c.items }));
    }
    return byCat
      .map((c) => {
        const catHit =
          normalize(c.title).includes(q) || normalize(c.intro).includes(q);
        const matchedItems = c.items.filter((s) => {
          const haystack = normalize(
            `${s.authors} ${s.year} ${s.title} ${s.journal}`,
          );
          return haystack.includes(q);
        });
        if (catHit) return { ...c, matchedItems: c.items };
        if (matchedItems.length > 0) return { ...c, matchedItems };
        return null;
      })
      .filter((c): c is Category & { matchedItems: Source[] } => c !== null);
  }, [baseCats, activeCat, query]);

  const totalMatches = filtered.reduce((sum, c) => sum + c.matchedItems.length, 0);
  const isFiltering = query.trim().length >= 2 || activeCat !== "all";
  const openValues = isFiltering ? filtered.map((c) => c.id) : undefined;

  return (
    <section className="max-w-3xl mx-auto" aria-labelledby="ebm-sources-heading">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-4">
          <BookMarked className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-sans uppercase tracking-[0.18em] text-primary">
            Evidence-Based Medicine
          </span>
        </div>
        <h2
          id="ebm-sources-heading"
          className="font-heading text-2xl md:text-4xl text-foreground mb-3"
        >
          {title}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      </motion.div>

      {/* Download CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="glass-card rounded-xl p-5 md:p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-primary/20"
      >
        <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-heading text-base md:text-lg text-foreground mb-1">
            Pełna bibliografia w PDF
          </p>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            8 kategorii · 22 referencje z linkami do PubMed/journal · do wglądu lekarza lub
            wydruku.
          </p>
        </div>
        <Button variant="hero" asChild className="shrink-0 w-full sm:w-auto">
          <a href={PDF_URL} target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4 mr-2" />
            Pobierz PDF
          </a>
        </Button>
      </motion.div>

      {/* Filter & search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="mb-5 space-y-3"
        role="search"
        aria-label="Filtrowanie źródeł EBM"
      >
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj: autor, tytuł, journal, rok…"
            aria-label="Wyszukaj w bibliografii"
            className="pl-9 pr-9 bg-background/40 border-border focus-visible:ring-primary"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Kategoria źródeł">
          {[{ id: "all", title: "Wszystkie", Icon: BookMarked }, ...baseCats].map((c) => {
            const Icon = c.Icon;
            const active = activeCat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCat(c.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${
                  active
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-background/40 border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {c.title}
              </button>
            );
          })}
        </div>

        {isFiltering && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Znaleziono <span className="text-foreground font-medium">{totalMatches}</span>{" "}
            {totalMatches === 1 ? "pozycję" : totalMatches >= 2 && totalMatches <= 4 ? "pozycje" : "pozycji"}
            {filtered.length > 0 && (
              <>
                {" "}w <span className="text-foreground font-medium">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "kategorii" : "kategoriach"}
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCat("all");
              }}
              className="ml-2 text-primary hover:underline"
            >
              Wyczyść filtry
            </button>
          </p>
        )}
      </motion.div>

      {/* Accordion list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: easeOut }}
      >
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-background/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Brak źródeł pasujących do wyszukiwania{query ? ` „${query}”` : ""}.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCat("all");
              }}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Wyczyść filtry
            </button>
          </div>
        ) : (
        <Accordion type="multiple" value={openValues} className="space-y-2">
          {filtered.map((cat) => {
            const Icon = cat.Icon;
            return (
              <AccordionItem
                key={cat.id}
                value={cat.id}
                className="rounded-xl border border-border bg-background/40 overflow-hidden data-[state=open]:border-primary/40 data-[state=open]:bg-primary/5 transition-colors"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline group">
                  <div className="flex items-center gap-3 text-left">
                    <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-data-[state=open]:bg-primary/20 transition-colors">
                      <Icon className="w-4 h-4 text-primary" />
                    </span>
                    <div className="flex-1">
                      <p className="font-heading text-base md:text-lg text-foreground">
                        {cat.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        {cat.intro}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <ul className="space-y-3 pt-2 border-t border-border/50">
                    {cat.matchedItems.map((src, i) => (
                      <li
                        key={`${cat.id}-${i}`}
                        className="text-sm leading-relaxed text-foreground/90"
                      >
                        <span className="font-semibold text-foreground">
                          {src.authors} ({src.year}).
                        </span>{" "}
                        {src.title}.{" "}
                        <em className="text-muted-foreground not-italic">{src.journal}.</em>{" "}
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 break-all"
                        >
                          Link
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        )}
      </motion.div>

      {/* Disclaimer — quiz vs konsultacja vs charakter linków */}
      <div className="mt-8 max-w-3xl mx-auto rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 space-y-2.5">
            <p className="font-heading text-base sm:text-lg text-foreground leading-snug">
              Quiz i bibliografia mają charakter edukacyjny
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground/90 font-medium">Wynik testu nie jest diagnozą</span>{" "}
              i nie zastępuje konsultacji proktologicznej. Quiz służy ocenie ryzyka na podstawie
              stylu życia — wyłącznie lekarz po badaniu fizykalnym może rozpoznać chorobę
              hemoroidalną i odróżnić ją od innych przyczyn dolegliwości (m.in. szczeliny odbytu,
              polipów, choroby zapalnej jelit czy nowotworu).
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Linki do publikacji w PubMed, ASCRS i ESCP udostępniamy do{" "}
              <span className="text-foreground/90 font-medium">pogłębienia wiedzy</span>{" "}
              — pozwalają zweryfikować źródło każdego zalecenia. Nie należy ich traktować jako
              instrukcji samoleczenia ani podstawy do dobierania terapii bez nadzoru lekarza.
            </p>
            <p className="text-xs text-muted-foreground italic pt-1">
              W razie objawów alarmowych (krwawienie, silny ból, gorączka, twardy guz) skontaktuj
              się pilnie z proktologiem lub zgłoś na SOR. Aktualizacja bibliografii: kwiecień 2026.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EBMSourcesSection;
