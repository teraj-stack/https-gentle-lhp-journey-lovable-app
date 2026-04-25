import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookMarked, Download, ExternalLink, Salad, Droplet, Timer, Activity, Stethoscope, ScrollText, AlertCircle, Microscope, Info, Search, X, Loader2, CheckCircle2, AlertTriangle, History, Trash2 } from "lucide-react";
import { trackEbmClick } from "@/lib/ebmAnalytics";

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");

const PDF_URL =
  "https://jowtjcyevactqmhqrytz.supabase.co/storage/v1/object/public/blog-covers/downloads%2Fzrodla-EBM-quiz-hemoroidy-CML.pdf";

/**
 * Klasyfikacja linku źródła EBM na czytelną etykietę („PDF", „PubMed", „Wytyczne kliniczne", …).
 * Używana w karcie źródła, żeby użytkownik wiedział, czego dotknie zanim kliknie.
 */
type SourceLinkKind =
  | "pdf"
  | "pubmed"
  | "cochrane"
  | "guidelines"
  | "journal"
  | "external";

type SourceLinkMeta = {
  kind: SourceLinkKind;
  /** Krótka etykieta na chipie (PL). */
  label: string;
  /** Pełny tekst dla aria-label / tooltipa. */
  longLabel: string;
};

const classifyLink = (url: string, opts?: { categoryId?: string }): SourceLinkMeta => {
  const u = url.toLowerCase();
  if (u.endsWith(".pdf") || u.includes("/pdf/") || u.includes(".pdf?")) {
    return { kind: "pdf", label: "PDF", longLabel: "Plik PDF — pełny tekst" };
  }
  if (u.includes("pubmed.ncbi.nlm.nih.gov") || u.includes("ncbi.nlm.nih.gov/pmc")) {
    return { kind: "pubmed", label: "PubMed", longLabel: "Abstrakt w bazie PubMed (NIH)" };
  }
  if (u.includes("cochranelibrary.com") || u.includes("cochrane.org")) {
    return {
      kind: "cochrane",
      label: "Cochrane Review",
      longLabel: "Przegląd systematyczny Cochrane",
    };
  }
  // Główne źródła wytycznych klinicznych (ASCRS, ESCP, NICE, WGO, AGA, ESC)
  if (
    u.includes("fascrs.org") ||
    u.includes("journals.lww.com/dcrjournal") ||
    u.includes("escp.eu.com") ||
    u.includes("nice.org.uk") ||
    u.includes("worldgastroenterology.org") ||
    u.includes("gastrojournal.org") ||
    opts?.categoryId === "guidelines"
  ) {
    return {
      kind: "guidelines",
      label: "Wytyczne kliniczne",
      longLabel: "Oficjalne wytyczne towarzystwa naukowego",
    };
  }
  if (
    u.includes("onlinelibrary.wiley.com") ||
    u.includes("sciencedirect.com") ||
    u.includes("springer.com") ||
    u.includes("nature.com") ||
    u.includes("nejm.org") ||
    u.includes("jamanetwork.com") ||
    u.includes("bmj.com") ||
    u.includes("thelancet.com") ||
    u.includes("karger.com") ||
    u.includes("tandfonline.com") ||
    u.includes("oup.com") ||
    u.includes("sagepub.com")
  ) {
    return {
      kind: "journal",
      label: "Artykuł w czasopiśmie",
      longLabel: "Pełen artykuł w recenzowanym czasopiśmie",
    };
  }
  return {
    kind: "external",
    label: "Strona zewnętrzna",
    longLabel: "Zewnętrzne źródło naukowe",
  };
};

const linkKindClasses: Record<SourceLinkKind, string> = {
  pdf: "bg-destructive/10 text-destructive border-destructive/30",
  pubmed: "bg-primary/10 text-primary border-primary/30",
  cochrane: "bg-primary/10 text-primary border-primary/30",
  guidelines: "bg-primary/15 text-primary border-primary/40",
  journal: "bg-muted/40 text-foreground/80 border-border",
  external: "bg-muted/30 text-muted-foreground border-border",
};

/**
 * Klasyfikacja typu badania na podstawie tytułu / czasopisma — używana w filtrach
 * „Typ badania" w module „Źródła i badania".
 */
type StudyType =
  | "guideline"
  | "systematic_review"
  | "meta_analysis"
  | "rct"
  | "cohort"
  | "review"
  | "other";

const STUDY_TYPE_LABEL: Record<StudyType, string> = {
  guideline: "Wytyczne kliniczne",
  systematic_review: "Przegląd systematyczny",
  meta_analysis: "Meta-analiza",
  rct: "RCT (badanie randomizowane)",
  cohort: "Badanie kohortowe / obserwacyjne",
  review: "Przegląd narracyjny",
  other: "Inne / oryginalne",
};

const classifyStudyType = (
  src: { title: string; journal: string },
  categoryId?: string,
): StudyType => {
  const t = `${src.title} ${src.journal}`.toLowerCase();
  if (
    t.includes("guideline") ||
    t.includes("clinical practice guideline") ||
    t.includes("recommendations") ||
    t.includes("task force") ||
    categoryId === "guidelines"
  ) {
    return "guideline";
  }
  if (t.includes("cochrane") || t.includes("systematic review")) {
    return "systematic_review";
  }
  if (t.includes("meta-analysis") || t.includes("meta analysis")) {
    return "meta_analysis";
  }
  if (
    t.includes("randomized") ||
    t.includes("randomised") ||
    t.includes("rct") ||
    t.includes("double-blind") ||
    t.includes("double blind") ||
    t.includes("trial")
  ) {
    return "rct";
  }
  if (
    t.includes("cohort") ||
    t.includes("case-control") ||
    t.includes("observational") ||
    t.includes("cross-sectional") ||
    t.includes("screening colonoscopy") ||
    t.includes("risk factors")
  ) {
    return "cohort";
  }
  if (t.includes("review")) {
    return "review";
  }
  return "other";
};

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
  /** Krótkie 1–2 zdania TL;DR z wytycznych ASCRS/ESCP dla danej kategorii. */
  tldr?: string;
  Icon: typeof BookMarked;
  items: Source[];
};

const CATEGORIES: Category[] = [
  {
    id: "guidelines",
    title: "Wytyczne kliniczne",
    intro: "Oficjalne rekomendacje towarzystw kolorektalnych — fundament zaleceń profilaktycznych.",
    tldr: "ASCRS (2018) i ESCP (2020) zgodnie zalecają leczenie zachowawcze (błonnik + nawodnienie) jako pierwszą linię terapii w I–II stopniu, a metody małoinwazyjne i chirurgiczne rezerwują dla wyższych stopni i nawrotów.",
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
    tldr: "Według ASCRS i ESCP suplementacja błonnika (≥25 g/dobę, najlepiej psyllium) zmniejsza ryzyko krwawienia i nasilenie objawów o ~50% — to najsilniej rekomendowana interwencja zachowawcza (poziom dowodów 1A).",
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
    tldr: "ASCRS i ESCP wskazują nawodnienie (1,5–2 l wody/dobę) jako niezbędne uzupełnienie diety bogatobłonnikowej — bez wody błonnik może nasilać zaparcia i parcie, czyli kluczowy mechanizm uszkadzający sploty hemoroidalne.",
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
    tldr: "ASCRS i ESCP rekomendują skrócenie czasu defekacji (<3–5 min), unikanie parcia (Valsalva) i czytania w toalecie — przewlekłe parcie zwiększa ciśnienie w splotach i jest udokumentowanym czynnikiem powstawania oraz nawrotu hemoroidów.",
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
    tldr: "ESCP zaznacza, że regularna aktywność fizyczna (≥150 min/tydz.) poprawia motorykę jelit i zmniejsza ryzyko zaparć; siedzący tryb życia oraz długie pozostawanie w pozycji siedzącej są niezależnymi czynnikami ryzyka choroby hemoroidalnej.",
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
    tldr: "ASCRS i ESCP wymieniają ciążę, poród naturalny, wiek >45 lat, otyłość i przewlekłe zaparcia jako główne czynniki ryzyka — w ciąży i połogu choroba hemoroidalna dotyczy nawet 25–35% kobiet i wymaga szczególnej profilaktyki zachowawczej.",
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
    tldr: "ASCRS i ESCP są jednoznaczne: każde krwawienie z odbytu wymaga oceny lekarskiej, a u osób >45 r.ż. lub z czynnikami ryzyka — kolonoskopii. Hemoroidów nie wolno rozpoznawać „na odległość”, bo identyczne objawy daje m.in. rak jelita grubego.",
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
    tldr: "RCT i meta-analizy cytowane także w wytycznych ESCP pokazują, że LHP daje porównywalną skuteczność do operacji Milligana-Morgana przy istotnie mniejszym bólu pooperacyjnym, krótszej rekonwalescencji i szybszym powrocie do pracy.",
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
  const [forcedOpen, setForcedOpen] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string>("all"); // "all" | "lt2010" | "2010-2014" | "2015-2019" | "gte2020"
  const [studyTypeFilter, setStudyTypeFilter] = useState<string>("all"); // "all" | StudyType
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // ===== „Ostatnio otwierane" — historia kliknięć w linki EBM (localStorage) =====
  type RecentEntry = {
    url: string;
    title: string;
    journal: string;
    authors: string;
    year: string;
    categoryId: string;
    categoryTitle: string;
    linkLabel: string;
    linkKind: SourceLinkKind;
    openedAt: number; // epoch ms
  };
  const RECENTS_KEY = "cml.hemoroidy.ebm.recents.v1";
  const RECENTS_MAX = 8;
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  // Wczytaj z localStorage przy pierwszym renderze
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter(
            (e): e is RecentEntry =>
              !!e && typeof e === "object" && typeof (e as RecentEntry).url === "string",
          )
          .slice(0, RECENTS_MAX);
        setRecents(cleaned);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  const persistRecents = (next: RecentEntry[]) => {
    try {
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // quota / private mode — ignore
    }
  };

  const recordRecent = (entry: Omit<RecentEntry, "openedAt">) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => r.url !== entry.url);
      const next = [{ ...entry, openedAt: Date.now() }, ...filtered].slice(0, RECENTS_MAX);
      persistRecents(next);
      return next;
    });
  };

  const removeRecent = (url: string) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r.url !== url);
      persistRecents(next);
      return next;
    });
  };

  const clearRecents = () => {
    setRecents([]);
    persistRecents([]);
  };

  const formatRelative = (ts: number): string => {
    const diff = Date.now() - ts;
    const sec = Math.max(1, Math.round(diff / 1000));
    if (sec < 60) return "przed chwilą";
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} min temu`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} godz. temu`;
    const day = Math.round(hr / 24);
    if (day < 7) return `${day} dn. temu`;
    try {
      return new Date(ts).toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return `${day} dn. temu`;
    }
  };


  // Stan pobierania bibliografii PDF (z determinate progress)
  type DownloadStatus = "idle" | "downloading" | "success" | "error";
  const [dlStatus, setDlStatus] = useState<DownloadStatus>("idle");
  const [dlProgress, setDlProgress] = useState<number>(0); // 0..100, -1 = nieznany rozmiar
  const [dlBytes, setDlBytes] = useState<{ loaded: number; total: number | null }>({
    loaded: 0,
    total: null,
  });
  const dlAbortRef = useRef<AbortController | null>(null);

  const formatBytes = (n: number): string => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  };

  const triggerBrowserSave = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleDownloadPdf = async () => {
    if (dlStatus === "downloading") return;
    const filename = "zrodla-EBM-quiz-hemoroidy-CML.pdf";
    const controller = new AbortController();
    dlAbortRef.current = controller;
    setDlStatus("downloading");
    setDlProgress(0);
    setDlBytes({ loaded: 0, total: null });

    trackEbmClick({
      url: PDF_URL,
      label: "Pobierz PDF (bibliografia EBM)",
      source: "EBMSourcesSection",
      kind: "external_source",
    });

    try {
      const res = await fetch(PDF_URL, { signal: controller.signal });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
      const totalHeader = res.headers.get("content-length");
      const total = totalHeader ? parseInt(totalHeader, 10) : null;
      setDlBytes({ loaded: 0, total });
      if (!total) setDlProgress(-1);

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          setDlBytes({ loaded, total });
          if (total) {
            setDlProgress(Math.min(99, Math.round((loaded / total) * 100)));
          }
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: "application/pdf" });
      triggerBrowserSave(blob, filename);
      setDlProgress(100);
      setDlStatus("success");
      toast.success("Pobrano bibliografię EBM (PDF)", {
        description: `${formatBytes(loaded)} · zapisano jako ${filename}`,
        duration: 5000,
      });
      // Po 6 s wracamy do stanu idle, żeby przycisk znowu był „świeży"
      window.setTimeout(() => {
        setDlStatus((s) => (s === "success" ? "idle" : s));
        setDlProgress(0);
        setDlBytes({ loaded: 0, total: null });
      }, 6000);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        setDlStatus("idle");
        setDlProgress(0);
        setDlBytes({ loaded: 0, total: null });
        toast("Pobieranie anulowane");
        return;
      }
      setDlStatus("error");
      toast.error("Nie udało się pobrać PDF", {
        description: "Otwórz plik bezpośrednio w nowej karcie i zapisz ręcznie.",
        action: {
          label: "Otwórz w nowej karcie",
          onClick: () => window.open(PDF_URL, "_blank", "noopener,noreferrer"),
        },
        duration: 7000,
      });
    } finally {
      dlAbortRef.current = null;
    }
  };

  const cancelDownload = () => {
    dlAbortRef.current?.abort();
  };

  // Sprzątanie przy odmontowaniu
  useEffect(() => {
    return () => {
      dlAbortRef.current?.abort();
    };
  }, []);

  // Open category from URL hash (#ebm-<id>) and scroll + highlight it
  useEffect(() => {
    const applyHash = () => {
      const h = typeof window !== "undefined" ? window.location.hash : "";
      const m = h.match(/^#ebm-([a-z0-9-]+)$/i);
      if (!m) return;
      const id = m[1];
      if (!baseCats.some((c) => c.id === id)) return;
      setForcedOpen((prev) => (prev.includes(id) ? prev : [...prev, id]));
      window.setTimeout(() => {
        const el = document.getElementById(`ebm-${id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        // Trigger highlight pulse — re-set even if same id, by clearing first
        setHighlightedId(null);
        window.setTimeout(() => setHighlightedId(id), 30);
      }, 80);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [baseCats]);

  // Auto-clear highlight after animation completes (~2.4s)
  useEffect(() => {
    if (!highlightedId) return;
    const t = window.setTimeout(() => setHighlightedId(null), 2400);
    return () => window.clearTimeout(t);
  }, [highlightedId]);

  // Helper: czy rok publikacji pasuje do wybranego zakresu?
  const yearMatches = (yearStr: string): boolean => {
    if (yearFilter === "all") return true;
    const y = parseInt(yearStr, 10);
    if (Number.isNaN(y)) return false;
    switch (yearFilter) {
      case "lt2010":
        return y < 2010;
      case "2010-2014":
        return y >= 2010 && y <= 2014;
      case "2015-2019":
        return y >= 2015 && y <= 2019;
      case "gte2020":
        return y >= 2020;
      default:
        return true;
    }
  };

  const studyTypeMatches = (src: Source, categoryId: string): boolean => {
    if (studyTypeFilter === "all") return true;
    return classifyStudyType(src, categoryId) === studyTypeFilter;
  };

  // Dostępne typy badań w aktualnym zbiorze (do dynamicznego budowania selecta)
  const availableStudyTypes = useMemo(() => {
    const set = new Set<StudyType>();
    baseCats.forEach((c) => c.items.forEach((s) => set.add(classifyStudyType(s, c.id))));
    return set;
  }, [baseCats]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const byCat = activeCat === "all" ? baseCats : baseCats.filter((c) => c.id === activeCat);
    return byCat
      .map((c) => {
        const passesQuery = (s: Source): boolean => {
          if (q.length < 2) return true;
          const haystack = normalize(
            `${s.authors} ${s.year} ${s.title} ${s.journal}`,
          );
          return haystack.includes(q);
        };
        const catTextHit =
          q.length >= 2 &&
          (normalize(c.title).includes(q) || normalize(c.intro).includes(q));

        // Najpierw filtr query (z uwzględnieniem catTextHit), potem rok + typ.
        const queryFiltered = catTextHit ? c.items : c.items.filter(passesQuery);
        const matchedItems = queryFiltered.filter(
          (s) => yearMatches(s.year) && studyTypeMatches(s, c.id),
        );

        if (matchedItems.length > 0) return { ...c, matchedItems };
        return null;
      })
      .filter((c): c is Category & { matchedItems: Source[] } => c !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCats, activeCat, query, yearFilter, studyTypeFilter]);

  const totalMatches = filtered.reduce((sum, c) => sum + c.matchedItems.length, 0);
  const isFiltering =
    query.trim().length >= 2 ||
    activeCat !== "all" ||
    yearFilter !== "all" ||
    studyTypeFilter !== "all";
  const computedOpen = isFiltering ? filtered.map((c) => c.id) : [];
  const openValues =
    isFiltering || forcedOpen.length > 0
      ? Array.from(new Set([...computedOpen, ...forcedOpen]))
      : undefined;

  const resetAllFilters = () => {
    setQuery("");
    setActiveCat("all");
    setYearFilter("all");
    setStudyTypeFilter("all");
  };


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

      {/* Download CTA — z podglądem postępu i komunikatem o zakończeniu */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="glass-card rounded-xl p-5 md:p-6 mb-8 border border-primary/20"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              dlStatus === "success"
                ? "bg-primary/20"
                : dlStatus === "error"
                  ? "bg-destructive/15"
                  : "bg-primary/15"
            }`}
          >
            {dlStatus === "downloading" ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : dlStatus === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : dlStatus === "error" ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <Download className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-base md:text-lg text-foreground mb-1">
              Bibliografia EBM (PDF) — dokładnie te same źródła
            </p>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              8 kategorii · 21 referencji z aktywnymi linkami do PubMed, ASCRS, ESCP i Cochrane —
              1:1 z sekcją poniżej. Do wglądu lekarza lub wydruku.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
            {dlStatus === "downloading" ? (
              <Button
                type="button"
                variant="outline"
                onClick={cancelDownload}
                className="w-full sm:w-auto"
                aria-label="Anuluj pobieranie bibliografii EBM"
              >
                <X className="w-4 h-4 mr-2" aria-hidden="true" />
                Anuluj
              </Button>
            ) : null}
            <Button
              type="button"
              variant="hero"
              onClick={handleDownloadPdf}
              disabled={dlStatus === "downloading"}
              className="w-full sm:w-auto"
              aria-label={
                dlStatus === "downloading"
                  ? "Trwa pobieranie bibliografii EBM"
                  : "Pobierz bibliografię EBM w formacie PDF"
              }
              aria-busy={dlStatus === "downloading"}
            >
              {dlStatus === "downloading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Pobieram…
                </>
              ) : dlStatus === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Pobrano — pobierz ponownie
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                  Pobierz PDF (bibliografia)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Pasek postępu + komunikat o zakończeniu (status region) */}
        {(dlStatus === "downloading" || dlStatus === "success" || dlStatus === "error") && (
          <div
            className="mt-4"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {dlStatus === "downloading" && (
              <>
                {dlProgress >= 0 ? (
                  <Progress
                    value={dlProgress}
                    className="h-2 bg-muted/40"
                    aria-label={`Postęp pobierania: ${dlProgress}%`}
                  />
                ) : (
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted/40 relative"
                    aria-label="Pobieranie w toku"
                  >
                    <div className="absolute inset-y-0 left-0 w-1/3 bg-primary/70 rounded-full animate-[indeterminate_1.4s_ease_infinite]" />
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {dlProgress >= 0 ? `${dlProgress}% · ` : "Trwa pobieranie · "}
                  {formatBytes(dlBytes.loaded)}
                  {dlBytes.total ? ` z ${formatBytes(dlBytes.total)}` : ""}
                </p>
              </>
            )}
            {dlStatus === "success" && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-foreground font-medium">Pobieranie zakończone</p>
                  <p className="text-xs text-muted-foreground">
                    Plik <span className="text-foreground/80">zrodla-EBM-quiz-hemoroidy-CML.pdf</span>{" "}
                    zapisano w folderze pobierania
                    {dlBytes.loaded > 0 ? ` (${formatBytes(dlBytes.loaded)})` : ""}.
                  </p>
                </div>
              </div>
            )}
            {dlStatus === "error" && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-medium">Pobieranie nie powiodło się</p>
                  <p className="text-xs text-muted-foreground">
                    Sprawdź połączenie lub{" "}
                    <a
                      href={PDF_URL}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      referrerPolicy="no-referrer"
                      className="text-primary hover:underline"
                    >
                      otwórz PDF w nowej karcie
                    </a>
                    .
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Ostatnio otwierane (localStorage) — widoczne tylko gdy są wpisy */}
      {recents.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: easeOut }}
          aria-labelledby="ebm-recents-heading"
          className="mb-6 rounded-xl border border-border bg-background/40 p-4 sm:p-5"
        >
          <div className="flex items-start sm:items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <History className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3
                  id="ebm-recents-heading"
                  className="font-heading text-base md:text-lg text-foreground leading-tight"
                >
                  Ostatnio otwierane
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Twoje {recents.length === 1 ? "ostatnie kliknięcie" : `ostatnie ${recents.length} kliknięć`} w linki EBM · zapisane lokalnie w przeglądarce
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearRecents}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-sans uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Wyczyść historię ostatnio otwieranych źródeł"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Wyczyść
            </button>
          </div>

          <ul className="space-y-2">
            {recents.map((r) => (
              <li
                key={r.url}
                className="group flex items-start gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5 hover:border-primary/40 hover:bg-background/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-sans uppercase tracking-[0.08em] ${linkKindClasses[r.linkKind]}`}
                    >
                      {r.linkLabel}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/80">
                      {r.categoryTitle}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70" aria-hidden="true">
                      ·
                    </span>
                    <time
                      dateTime={new Date(r.openedAt).toISOString()}
                      className="text-[10px] text-muted-foreground/80"
                    >
                      {formatRelative(r.openedAt)}
                    </time>
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow external"
                    referrerPolicy="no-referrer"
                    onClick={() => {
                      trackEbmClick({
                        url: r.url,
                        label: r.title,
                        source: "EBMSourcesSection",
                        kind: "external_source",
                        ebmId: r.categoryId,
                      });
                      recordRecent({
                        url: r.url,
                        title: r.title,
                        journal: r.journal,
                        authors: r.authors,
                        year: r.year,
                        categoryId: r.categoryId,
                        categoryTitle: r.categoryTitle,
                        linkLabel: r.linkLabel,
                        linkKind: r.linkKind,
                      });
                    }}
                    className="block text-sm text-foreground hover:text-primary transition-colors leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                    aria-label={`${r.title} — otwórz ponownie w nowej karcie`}
                    title="Otwórz ponownie w nowej karcie"
                  >
                    <span className="font-medium">
                      {r.authors} ({r.year}).
                    </span>{" "}
                    {r.title}
                    <ExternalLink className="inline-block w-3 h-3 ml-1 -mt-0.5 text-muted-foreground" aria-hidden="true" />
                  </a>
                  <p className="text-[11px] text-muted-foreground/80 truncate">
                    {r.journal}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeRecent(r.url)}
                  aria-label={`Usuń z historii: ${r.title}`}
                  title="Usuń z historii"
                  className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

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

        {/* Filtry zaawansowane: Rok publikacji + Typ badania */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="ebm-year-filter"
              className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80 font-sans"
            >
              Rok publikacji
            </label>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger
                id="ebm-year-filter"
                className="h-9 bg-background/40 border-border text-sm focus:ring-primary"
                aria-label="Filtruj według roku publikacji"
              >
                <SelectValue placeholder="Wszystkie lata" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie lata</SelectItem>
                <SelectItem value="gte2020">2020 i nowsze</SelectItem>
                <SelectItem value="2015-2019">2015 – 2019</SelectItem>
                <SelectItem value="2010-2014">2010 – 2014</SelectItem>
                <SelectItem value="lt2010">Przed 2010</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="ebm-study-type-filter"
              className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80 font-sans"
            >
              Typ badania
            </label>
            <Select value={studyTypeFilter} onValueChange={setStudyTypeFilter}>
              <SelectTrigger
                id="ebm-study-type-filter"
                className="h-9 bg-background/40 border-border text-sm focus:ring-primary"
                aria-label="Filtruj według typu badania"
              >
                <SelectValue placeholder="Wszystkie typy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                {(
                  [
                    "guideline",
                    "systematic_review",
                    "meta_analysis",
                    "rct",
                    "cohort",
                    "review",
                    "other",
                  ] as StudyType[]
                )
                  .filter((t) => availableStudyTypes.has(t))
                  .map((t) => (
                    <SelectItem key={t} value={t}>
                      {STUDY_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
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
              onClick={resetAllFilters}
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
              onClick={resetAllFilters}
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
                id={`ebm-${cat.id}`}
                data-highlighted={highlightedId === cat.id ? "true" : undefined}
                className="scroll-mt-32 rounded-xl border border-border bg-background/40 overflow-hidden data-[state=open]:border-primary/40 data-[state=open]:bg-primary/5 data-[highlighted=true]:animate-[ebm-pulse_1.6s_ease-out] data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-primary/60 data-[highlighted=true]:border-primary/60 transition-colors"
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
                  {cat.tldr && (
                    <div className="mt-1 mb-4 rounded-lg border border-primary/25 bg-primary/5 p-3.5 sm:p-4">
                      <div className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-sans uppercase tracking-[0.14em] bg-primary/15 text-primary border border-primary/30 shrink-0"
                          aria-label="Podsumowanie wytycznych ASCRS i ESCP"
                        >
                          TL;DR · ASCRS / ESCP
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                        {cat.tldr}
                      </p>
                    </div>
                  )}
                  <ul className="space-y-3 pt-2 border-t border-border/50">
                    {cat.matchedItems.map((src, i) => {
                      const meta = classifyLink(src.url, { categoryId: cat.id });
                      return (
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
                            rel="noopener noreferrer nofollow external"
                            referrerPolicy="no-referrer"
                            onClick={() => {
                              trackEbmClick({
                                url: src.url,
                                label: src.title,
                                source: "EBMSourcesSection",
                                kind: "external_source",
                                ebmId: cat.id,
                              });
                              recordRecent({
                                url: src.url,
                                title: src.title,
                                journal: src.journal,
                                authors: src.authors,
                                year: src.year,
                                categoryId: cat.id,
                                categoryTitle: cat.title,
                                linkLabel: meta.label,
                                linkKind: meta.kind,
                              });
                            }}
                            aria-label={`${src.title} — ${meta.longLabel}, otwiera się w nowej karcie`}
                            title={`${meta.longLabel} — otwiera się w nowej karcie`}
                            className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-sans uppercase tracking-[0.08em] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${linkKindClasses[meta.kind]}`}
                          >
                            <span>{meta.label}</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            <span className="sr-only"> (nowa karta)</span>
                          </a>
                        </li>
                      );
                    })}
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
