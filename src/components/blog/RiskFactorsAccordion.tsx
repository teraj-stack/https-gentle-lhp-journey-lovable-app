import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  Share2,
  Link2,
  Copy,
  CalendarClock,
  Star,
  ShieldOff,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { trackEbmClick } from "@/lib/ebmAnalytics";
import { exportChecklistCsv, exportChecklistPdf } from "@/lib/checklistExport";
import { buildChecklistSummary } from "@/lib/checklistSummary";
import ChecklistAutoSummary from "@/components/blog/ChecklistAutoSummary";
import {
  buildChecklistShareUrl,
  buildChecklistShortCode,
  decodeChecklist,
} from "@/lib/checklistShare";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

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
const PRIORITY_STORAGE_KEY = "cml.hemoroidy.risk-factors.priority.v1";
const OPEN_ITEMS_STORAGE_KEY = "cml.hemoroidy.risk-factors.open.v1";
/** Tryb prywatności: gdy `true`, NIE zapisujemy `readItems` do localStorage (tylko sesja). */
const PRIVACY_STORAGE_KEY = "cml.hemoroidy.risk-factors.privacy.v1";
const TIMESTAMP_STORAGE_KEY = "cml.hemoroidy.risk-factors.selected-at.v1";

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

const loadTimestamp = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TIMESTAMP_STORAGE_KEY);
    if (!raw) return null;
    // Walidacja ISO date
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : raw;
  } catch {
    return null;
  }
};

/** Format: "23 kwi 2026, 14:32" */
const formatSelectedAt = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Mapowanie źródła EBM (label + url) na "providera" — wydawcę/bazę dowodów.
 * Używane przez przełącznik filtra źródeł EBM w UI.
 *
 * Dlaczego po url-host + label, a nie po `ebmId`:
 * `ebmId` koduje kategorię merytoryczną (fiber/hydration/...), a nie wydawcę.
 * Provider to ortogonalna oś — jedno źródło może być z PubMed, ale dotyczyć fiber.
 */
type EbmProvider = "cochrane" | "pubmed" | "ascrs" | "escp" | "journal";

const EBM_PROVIDERS: { id: EbmProvider; label: string; hint: string }[] = [
  { id: "cochrane", label: "Cochrane", hint: "Cochrane Systematic Reviews" },
  { id: "pubmed", label: "PubMed", hint: "Indeksowane w PubMed/NCBI" },
  { id: "ascrs", label: "ASCRS", hint: "American Society of Colon & Rectal Surgeons" },
  { id: "escp", label: "ESCP", hint: "European Society of Coloproctology" },
  { id: "journal", label: "Czasopisma", hint: "LWW, Wiley i inne wydawnictwa naukowe" },
];

const getSourceProviders = (source: RiskSource): EbmProvider[] => {
  const providers = new Set<EbmProvider>();
  const url = source.url.toLowerCase();
  const label = source.label.toLowerCase();
  // Cochrane — najjaśniejszy sygnał: host cochranelibrary.com lub słowo w label.
  if (url.includes("cochranelibrary.com") || label.includes("cochrane")) providers.add("cochrane");
  // PubMed/NCBI — host pubmed.ncbi.nlm.nih.gov lub ncbi.nlm.nih.gov (nie pokrywa cochrane bo tam host inny).
  if (url.includes("pubmed.ncbi.nlm.nih.gov") || url.includes("ncbi.nlm.nih.gov")) providers.add("pubmed");
  // ASCRS / ESCP — wytyczne towarzystw, rozpoznawane po label (zawsze podpisane skrótem).
  if (label.includes("ascrs")) providers.add("ascrs");
  if (label.includes("escp")) providers.add("escp");
  // Czasopisma naukowe (publishers) — LWW, Wiley.
  if (url.includes("journals.lww.com") || url.includes("onlinelibrary.wiley.com")) providers.add("journal");
  return Array.from(providers);
};

const factorHasProvider = (rf: RiskFactor, providers: Set<EbmProvider>): boolean => {
  if (providers.size === 0) return true;
  return rf.sources.some((s) => getSourceProviders(s).some((p) => providers.has(p)));
};

const RiskFactorsAccordion = () => {
  const [query, setQuery] = useState("");
  const nQuery = normalize(query.trim());

  // Filtr po wydawcy/bazie EBM (multi-select OR). Pusty Set = pokaż wszystko.
  // Logika OR: zaznaczenie Cochrane + PubMed pokazuje czynniki które mają ≥1 źródło z któregokolwiek.
  const [sourceFilter, setSourceFilter] = useState<Set<EbmProvider>>(() => new Set());
  const toggleSourceProvider = (id: EbmProvider) => {
    setSourceFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSourceFilter = () => setSourceFilter(new Set());

  // Otwarte sekcje (tryb ręczny — gdy nie ma aktywnego wyszukiwania)
  // Persystencja w localStorage: pamiętamy stan rozwinięcia między sesjami.
  const [openItems, setOpenItems] = useState<string[]>(() => {
    const stored = loadStringArray(OPEN_ITEMS_STORAGE_KEY);
    const validIds = new Set(RISK_FACTORS.map((rf) => rf.id));
    return stored.filter((id) => validIds.has(id));
  });

  // Autosave: zapisuj zmiany openItems do localStorage (TYLKO gdy nie aktywne wyszukiwanie,
  // bo `accordionValue` przechodzi wtedy w tryb auto-rozwinięcia dopasowań — to nie jest wybór użytkownika).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (nQuery) return;
    if (sourceFilter.size > 0) return; // tryb filtra nadpisuje accordionValue → nie zapisujemy
    try {
      window.localStorage.setItem(OPEN_ITEMS_STORAGE_KEY, JSON.stringify(openItems));
    } catch {
      /* noop */
    }
  }, [openItems, nQuery, sourceFilter]);

  // Wybrane czynniki — persystencja w localStorage (anonimowo)
  const [selected, setSelected] = useState<string[]>(() => loadStringArray(STORAGE_KEY));
  // Data ostatniej modyfikacji checklisty (ISO). null = jeszcze nigdy nie zapisano.
  const [selectedAt, setSelectedAt] = useState<string | null>(() => loadTimestamp());
  // Flaga „pierwszy render” — żeby wczytanie z localStorage nie nadpisywało istniejącego timestampu.
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    } catch {
      /* noop */
    }
    // Aktualizuj timestamp TYLKO przy realnej zmianie (nie przy pierwszym mount/restore).
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const nowIso = new Date().toISOString();
    setSelectedAt(selected.length === 0 ? null : nowIso);
    try {
      if (selected.length === 0) {
        window.localStorage.removeItem(TIMESTAMP_STORAGE_KEY);
      } else {
        window.localStorage.setItem(TIMESTAMP_STORAGE_KEY, nowIso);
      }
    } catch {
      /* noop */
    }
  }, [selected]);

  const toggleSelected = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const clearSelected = () => setSelected([]);

  // Wysokie priorytety — osobny storage z gwiazdkami per id
  const [priorityIds, setPriorityIds] = useState<string[]>(() => loadStringArray(PRIORITY_STORAGE_KEY));

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PRIORITY_STORAGE_KEY, JSON.stringify(priorityIds));
    } catch {
      /* noop */
    }
  }, [priorityIds]);

  // Auto-czyszczenie: jeśli czynnik został odznaczony z checklisty, usuń go też z priorytetów.
  useEffect(() => {
    setPriorityIds((prev) => prev.filter((id) => selected.includes(id)));
  }, [selected]);

  const togglePriority = (id: string) =>
    setPriorityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Restore z URL: ?c=<base64url> — gdy ktoś otworzył link udostępniony przez pacjenta.
  // Robimy MERGE z aktualnym localStorage (nie nadpisujemy "po cichu") + tylko gdy parametr istnieje.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(location.search);
    const code = params.get("c");
    if (!code) return;
    const ids = decodeChecklist(code);
    if (ids.length === 0) return;
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
    // Usuń parametr z URL (zachowaj hash) — żeby nie zaśmiecać i nie re-aplikować.
    params.delete("c");
    const cleanSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: cleanSearch ? `?${cleanSearch}` : "", hash: location.hash || "#moja-checklista-ryzyka" },
      { replace: true },
    );
    toast({
      title: "Wczytano udostępnioną checklistę",
      description: `Dodano ${ids.length} czynników do Twojej listy.`,
    });
  }, [location.search, location.pathname, location.hash, navigate]);

  // Sortowanie: priorytetowe (gwiazdka) na górze, w obrębie grupy zachowujemy kolejność dodania.
  const selectedFactors = useMemo(() => {
    const all = selected
      .map((id) => RISK_FACTORS.find((rf) => rf.id === id))
      .filter(Boolean) as RiskFactor[];
    return [...all].sort((a, b) => {
      const aPrio = priorityIds.includes(a.id) ? 1 : 0;
      const bPrio = priorityIds.includes(b.id) ? 1 : 0;
      return bPrio - aPrio; // priorytety pierwsze
    });
  }, [selected, priorityIds]);

  const priorityCount = useMemo(
    () => selectedFactors.filter((rf) => priorityIds.includes(rf.id)).length,
    [selectedFactors, priorityIds],
  );

  const checklistSummary = useMemo(() => buildChecklistSummary(selected), [selected]);
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"url" | "code" | null>(null);

  const shareUrl = useMemo(
    () => (selectedFactors.length ? buildChecklistShareUrl(selected) : ""),
    [selected, selectedFactors.length],
  );
  const shareCode = useMemo(
    () => (selectedFactors.length ? buildChecklistShortCode(selected) : ""),
    [selected, selectedFactors.length],
  );

  const handleCopyShare = async (value: string, field: "url" | "code") => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: field === "url" ? "Skopiowano link" : "Skopiowano kod",
        description: field === "url"
          ? "Wklej w wiadomości do lekarza — otworzy listę z Twoimi zaznaczeniami."
          : 'Możesz go podyktować lub wpisać po znaku "?c=" w adresie strony.',
      });
    } catch {
      toast({
        title: "Nie udało się skopiować",
        description: "Zaznacz tekst ręcznie i skopiuj (Ctrl/Cmd+C).",
      });
    }
  };

  const handleOpenShare = () => {
    if (selectedFactors.length === 0) {
      toast({
        title: "Brak zaznaczonych czynników",
        description: "Najpierw zaznacz czynniki w akordeonach powyżej.",
      });
      return;
    }
    setShareOpen(true);
  };

  const handleExportChecklistPdf = () => {
    if (selectedFactors.length === 0) {
      toast({
        title: "Brak zaznaczonych czynników",
        description: "Rozwiń akordeon i kliknij „Zapisz moje ryzyko”, aby dodać pozycje.",
      });
      return;
    }
    exportChecklistPdf(selectedFactors, RISK_FACTORS.length, selectedAt);
    toast({
      title: "Pobrano checklistę PDF",
      description: `${selectedFactors.length} z ${RISK_FACTORS.length} czynników — gotowe do druku.`,
    });
  };

  const handleExportChecklistCsv = () => {
    if (selectedFactors.length === 0) {
      toast({
        title: "Brak zaznaczonych czynników",
        description: "Rozwiń akordeon i kliknij „Zapisz moje ryzyko”, aby dodać pozycje.",
      });
      return;
    }
    exportChecklistCsv(selectedFactors, RISK_FACTORS.length, selectedAt);
    toast({
      title: "Pobrano checklistę CSV",
      description: "Plik został zapisany w folderze pobranych.",
    });
  };

  // Tryb prywatności: gdy ON, NIE zapisujemy `readItems` do localStorage
  // (sesja-only). Sama preferencja jednak jest persystowana — żeby przetrwała refresh.
  // Lazy init: czytamy preferencję zanim zainicjujemy `readItems`, żeby przy włączonym
  // privacy mode nie ładować historycznie zapisanych „przeczytane" (privacy oczekuje od nas właśnie tego).
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(PRIVACY_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Przeczytane karty — persystencja w localStorage (anonimowo); pominięta w trybie prywatności.
  const [readItems, setReadItems] = useState<string[]>(() => {
    // Jeśli privacy ON na starcie → ignoruj historyczne dane (czysta sesja).
    if (typeof window !== "undefined") {
      try {
        if (window.localStorage.getItem(PRIVACY_STORAGE_KEY) === "1") return [];
      } catch {
        /* noop */
      }
    }
    return loadStringArray(READ_STORAGE_KEY);
  });

  // Autosave preferencji prywatności + reakcja na włączenie/wyłączenie:
  // ON → usuń istniejące dane „przeczytane" z localStorage (clean wipe) i zostaw tylko sesję.
  // OFF → następne zmiany `readItems` znowu się persistują (przez useEffect poniżej).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PRIVACY_STORAGE_KEY, privacyMode ? "1" : "0");
      if (privacyMode) {
        window.localStorage.removeItem(READ_STORAGE_KEY);
      }
    } catch {
      /* noop */
    }
  }, [privacyMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (privacyMode) return; // tryb prywatności — pomijamy zapis
    try {
      window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(readItems));
    } catch {
      /* noop */
    }
  }, [readItems, privacyMode]);

  const markRead = (id: string) =>
    setReadItems((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const toggleRead = (id: string) =>
    setReadItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearRead = () => setReadItems([]);

  // Auto-oznacz jako przeczytane po 1.2 s utrzymanego rozwinięcia (tylko ręczne otwarcie, nie wyszukiwarka)
  useEffect(() => {
    if (nQuery) return;
    if (sourceFilter.size > 0) return; // auto-rozwinięcie z filtra ≠ świadome czytanie
    if (openItems.length === 0) return;
    const timers = openItems
      .filter((id) => !readItems.includes(id))
      .map((id) => window.setTimeout(() => markRead(id), 1200));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openItems, nQuery, sourceFilter]);

  const filtered = useMemo(() => {
    const base = sourceFilter.size === 0
      ? RISK_FACTORS
      : RISK_FACTORS.filter((rf) => factorHasProvider(rf, sourceFilter));
    if (!nQuery) return base;
    return base.filter((rf) => {
      const sourcesText = rf.sources.map((s) => s.label).join(" ");
      const haystack = normalize(`${rf.title} ${rf.shortBadge} ${rf.body} ${sourcesText}`);
      return haystack.includes(nQuery);
    });
  }, [nQuery, sourceFilter]);

  // Auto-rozwijaj dopasowane karty gdy aktywne wyszukiwanie LUB filtr źródeł EBM —
  // dla obu trybów `accordionValue` nadpisuje ręczny `openItems`, żeby wynik był od razu widoczny.
  const filterActive = nQuery.length > 0 || sourceFilter.size > 0;
  const accordionValue = filterActive ? filtered.map((rf) => rf.id) : openItems;
  const allExpanded = openItems.length === RISK_FACTORS.length;

  // Stagger helper: stopniowo buduje/usuwa wpisy z `openItems` po 1 na 40ms,
  // żeby bulk expand/collapse wyglądał jak fala zamiast jednoczesnego skoku.
  // Anuluje poprzednią sekwencję (bookkeeping w `staggerTimersRef`) i respektuje
  // `prefers-reduced-motion: reduce` — wtedy ustawia stan natychmiast.
  const staggerTimersRef = useRef<number[]>([]);
  const STAGGER_STEP_MS = 40;
  const cancelStagger = () => {
    staggerTimersRef.current.forEach((id) => window.clearTimeout(id));
    staggerTimersRef.current = [];
  };
  useEffect(() => () => cancelStagger(), []);
  const setOpenItemsStaggered = (target: string[]) => {
    cancelStagger();
    if (typeof window === "undefined") {
      setOpenItems(target);
      return;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setOpenItems(target);
      return;
    }
    // Kolejność stała wg RISK_FACTORS (od góry w dół) — dla expand i collapse jednakowa.
    const ordered = RISK_FACTORS.map((rf) => rf.id).filter((id) => target.includes(id));
    // Snapshot startu — diff vs target wykonujemy krokowo.
    const startSet = new Set(openItems);
    const targetSet = new Set(ordered);
    const toAdd = ordered.filter((id) => !startSet.has(id));
    // Collapse od dołu (od ostatniego do pierwszego) wygląda naturalniej (fala zamykania w górę).
    const toRemove = Array.from(startSet).filter((id) => !targetSet.has(id));
    const removeOrdered = RISK_FACTORS
      .map((rf) => rf.id)
      .filter((id) => toRemove.includes(id))
      .reverse();
    const steps = [...removeOrdered.map((id) => ({ kind: "remove" as const, id })),
                   ...toAdd.map((id) => ({ kind: "add" as const, id }))];
    steps.forEach((step, i) => {
      const tid = window.setTimeout(() => {
        setOpenItems((prev) => {
          if (step.kind === "add") return prev.includes(step.id) ? prev : [...prev, step.id];
          return prev.filter((x) => x !== step.id);
        });
      }, i * STAGGER_STEP_MS);
      staggerTimersRef.current.push(tid);
    });
  };

  const toggleAll = () =>
    setOpenItemsStaggered(allExpanded ? [] : RISK_FACTORS.map((rf) => rf.id));

  // Skrót klawiaturowy: Ctrl+E (Win/Linux) lub Cmd+E (macOS) — rozwiń/zwiń wszystkie sekcje.
  // Ignorujemy gdy fokus jest w polu tekstowym (input/textarea/contenteditable),
  // żeby nie kolidować z normalnym pisaniem litery „e".
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTextInput = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    };
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.shiftKey || e.altKey) return;
      if (e.key !== "e" && e.key !== "E") return;
      if (isTextInput(e.target)) return;
      e.preventDefault();
      // Sczytujemy aktualny stan ze stanu komponentu — zamknięcie idzie po toggleAll
      const willExpand = openItems.length !== RISK_FACTORS.length;
      setOpenItemsStaggered(willExpand ? RISK_FACTORS.map((rf) => rf.id) : []);
      toast({
        title: willExpand ? "Rozwinięto wszystkie sekcje" : "Zwinięto wszystkie sekcje",
        description: `Skrót: ${navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}+E`,
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openItems]);

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

      {/* Filtr źródeł EBM — multi-select chips (OR). Pokazuje tylko czynniki, które mają ≥1 źródło z wybranego dostawcy. */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-sans text-[12.5px] sm:text-sm font-medium text-foreground/85">
            Filtruj po źródle EBM
          </h3>
          {sourceFilter.size > 0 && (
            <button
              type="button"
              onClick={clearSourceFilter}
              className="inline-flex items-center gap-1 text-[11.5px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Wyczyść filtr źródeł EBM"
            >
              <X className="w-3 h-3" />
              Wyczyść
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtr źródeł EBM">
          {EBM_PROVIDERS.map((p) => {
            const active = sourceFilter.has(p.id);
            const count = RISK_FACTORS.filter((rf) =>
              rf.sources.some((s) => getSourceProviders(s).includes(p.id)),
            ).length;
            const disabled = count === 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => !disabled && toggleSourceProvider(p.id)}
                disabled={disabled}
                aria-pressed={active}
                title={`${p.hint} — ${count} ${count === 1 ? "czynnik" : count >= 2 && count <= 4 ? "czynniki" : "czynników"}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] sm:text-xs font-sans border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? "bg-primary/20 border-primary/60 text-primary"
                    : "bg-background/40 border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {active && <Check className="w-3 h-3" aria-hidden="true" />}
                {p.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11.5px] sm:text-xs text-muted-foreground" aria-live="polite">
          {sourceFilter.size === 0
            ? "Wybierz źródło, aby zobaczyć tylko czynniki oparte na tym wydawcy/bazie."
            : `Filtr aktywny: ${Array.from(sourceFilter)
                .map((id) => EBM_PROVIDERS.find((p) => p.id === id)?.label)
                .filter(Boolean)
                .join(" + ")} → ${filtered.length} z ${RISK_FACTORS.length} czynników`}
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

      {/* Pasek wyników wyszukiwania — widoczny licznik + akcja „rozwiń tylko dopasowane" */}
      {nQuery && filtered.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/[0.05] px-3 py-2">
          <div className="flex items-center gap-2 text-[12.5px] sm:text-sm">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/40 font-sans font-medium tabular-nums">
              <Search className="w-3 h-3" aria-hidden="true" />
              {filtered.length}/{RISK_FACTORS.length}
            </span>
            <span className="text-muted-foreground">
              {filtered.length === 1
                ? "dopasowany czynnik dla"
                : filtered.length < 5
                  ? "dopasowane czynniki dla"
                  : "dopasowanych czynników dla"}{" "}
              <span className="text-foreground font-medium">„{query}"</span>
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setOpenItemsStaggered(filtered.map((rf) => rf.id));
              setQuery("");
              toast({
                title: "Rozwinięto dopasowane sekcje",
                description: `${filtered.length} ${filtered.length === 1 ? "sekcja jest" : "sekcji jest"} otwarta. Pozostałe zwinięto.`,
              });
            }}
            className="gap-2"
            title="Zapisuje dopasowania jako rozwinięte i czyści wyszukiwanie"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            Rozwiń tylko dopasowane
          </Button>
        </div>
      )}

      {/* Pasek akcji: Zwiń / Rozwiń wszystko (ukryty podczas wyszukiwania, które samo rozwija dopasowania) */}
      {!nQuery && filtered.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] sm:text-xs text-muted-foreground">
            <span>
              {openItems.length === 0
                ? "Wszystkie sekcje zwinięte"
                : `Rozwinięte: ${openItems.length} z ${RISK_FACTORS.length}`}
            </span>
            {readItems.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Przeczytane: {readItems.length}/{RISK_FACTORS.length}
                </span>
                <button
                  type="button"
                  onClick={clearRead}
                  className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  aria-label="Wyczyść oznaczenia „przeczytane” dla wszystkich kart"
                >
                  wyczyść
                </button>
              </span>
            )}
            <span className="inline-flex items-center gap-2 ml-auto sm:ml-0">
              <ShieldOff
                className={`w-3.5 h-3.5 ${privacyMode ? "text-primary" : "text-muted-foreground"}`}
                aria-hidden="true"
              />
              <label
                htmlFor="risk-factors-privacy-toggle"
                className="cursor-pointer select-none"
                title='Gdy włączone: oznaczenia „przeczytane" działają tylko w tej sesji i nie są zapisywane w przeglądarce.'
              >
                Tryb prywatny
              </label>
              <Switch
                id="risk-factors-privacy-toggle"
                checked={privacyMode}
                onCheckedChange={(v) => {
                  setPrivacyMode(v);
                  if (v) {
                    // Wyłączenie persystencji = wyczyść też bieżącą sesyjną listę,
                    // żeby przełącznik dawał namacalny efekt (licznik znika).
                    setReadItems([]);
                    toast({
                      title: "Tryb prywatny włączony",
                      description: 'Oznaczenia „przeczytane" nie będą zapisywane w przeglądarce. Wyczyściliśmy też bieżącą historię.',
                    });
                  } else {
                    toast({
                      title: "Tryb prywatny wyłączony",
                      description: 'Oznaczenia „przeczytane" znowu będą zapisywane lokalnie.',
                    });
                  }
                }}
                aria-label="Tryb prywatny — nie zapisuj „przeczytane” w przeglądarce"
              />
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleAll}
            className="gap-2"
            aria-expanded={allExpanded}
            aria-controls="risk-factors-list"
            title={`Skrót: Ctrl/⌘ + E — ${allExpanded ? "zwiń" : "rozwiń"} wszystkie`}
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
          className="space-y-3 sm:space-y-2.5 md:space-y-3 lg:space-y-2.5"
          value={accordionValue}
          onValueChange={(v) => {
            // Pozwól na ręczne zwijanie tylko gdy nie filtrujemy wyszukiwarką
            if (!nQuery) setOpenItems(v);
          }}
        >
          {filtered.map((rf) => {
            const Icon = rf.Icon;
            const isSelected = selected.includes(rf.id);
            const isRead = readItems.includes(rf.id);
            return (
              <AccordionItem
                key={rf.id}
                value={rf.id}
                data-selected={isSelected}
                data-read={isRead}
                className="rounded-xl border border-border bg-background/40 overflow-hidden data-[state=open]:border-primary/40 data-[state=open]:bg-primary/5 data-[selected=true]:border-primary/60 data-[selected=true]:bg-primary/[0.07] data-[read=true]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="px-3.5 sm:px-5 md:px-6 lg:px-5 py-4 sm:py-3.5 md:py-4 hover:no-underline group text-left gap-2">
                  <div className="flex items-start sm:items-center gap-3 md:gap-4 lg:gap-3 flex-1 min-w-0">
                    <span className="relative w-10 h-10 sm:w-9 sm:h-9 md:w-11 md:h-11 lg:w-9 lg:h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-data-[state=open]:bg-primary/20 transition-colors mt-0.5 sm:mt-0">
                      <Icon className="w-4 h-4 md:w-[18px] md:h-[18px] lg:w-4 lg:h-4 text-primary" />
                      {isRead && (
                        <span
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm ring-1 ring-background"
                          aria-hidden="true"
                        >
                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                        </span>
                      )}
                    </span>

                    {/* Tablet (md..lg): układ 2-kolumnowy w nagłówku — tytuł po lewej, badge po prawej.
                        Mobile (<md) i desktop (≥lg): układ jednokolumnowy z badge'ami pod tytułem. */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between md:gap-5 lg:flex-col lg:items-stretch lg:gap-1.5">
                      <p className={`font-heading text-[15px] sm:text-base md:text-[17px] lg:text-lg leading-snug md:flex-1 md:min-w-0 ${isRead ? "text-foreground/70" : "text-foreground"}`}>
                        <Highlight text={rf.title} query={query} />
                        {isRead && (
                          <span className="sr-only"> (przeczytane)</span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 md:flex-nowrap md:justify-end md:shrink-0 md:max-w-[46%] lg:max-w-none lg:justify-start lg:flex-wrap">
                        <span className="inline-flex w-fit max-w-full items-center px-2 py-0.5 rounded-md text-[10.5px] sm:text-[11px] md:text-[11.5px] font-sans uppercase tracking-[0.06em] bg-destructive/10 text-destructive border border-destructive/25 leading-snug">
                          <span className="truncate">
                            <Highlight text={rf.shortBadge} query={query} />
                          </span>
                        </span>
                        {isRead && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] sm:text-[10.5px] md:text-[11px] font-sans uppercase tracking-[0.08em] bg-primary/10 text-primary border border-primary/30 leading-snug shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Przeczytane
                          </span>
                        )}
                      </div>
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
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleRead(rf.id)}
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                        aria-pressed={isRead}
                        title={isRead ? "Oznacz jako nieprzeczytane" : "Oznacz jako przeczytane"}
                      >
                        {isRead ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            Cofnij „przeczytane"
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            Oznacz jako przeczytane
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => toggleSelected(rf.id)}
                        className="gap-2"
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
                Zapisywane lokalnie w przeglądarce (anonimowo). {selectedFactors.length} z {RISK_FACTORS.length} zaznaczonych
                {priorityCount > 0 && (
                  <>
                    {" "}·{" "}
                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                      <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                      {priorityCount} {priorityCount === 1 ? "priorytet" : "priorytetów"}
                    </span>
                  </>
                )}
                .
              </p>
              {selectedAt && selectedFactors.length > 0 && (
                <p className="text-[11px] sm:text-[11.5px] text-primary/80 mt-1 inline-flex items-center gap-1.5 font-sans">
                  <CalendarClock className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                  <span>
                    Data zaznaczenia:{" "}
                    <time dateTime={selectedAt} className="font-medium text-foreground">
                      {formatSelectedAt(selectedAt)}
                    </time>
                  </span>
                </p>
              )}
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
              const isPriority = priorityIds.includes(rf.id);
              return (
                <li
                  key={rf.id}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                    isPriority
                      ? "border-primary/60 bg-primary/[0.06] ring-1 ring-primary/20"
                      : "border-border/60 bg-background/60"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      isPriority ? "bg-primary/25" : "bg-primary/15"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] sm:text-sm font-medium text-foreground leading-snug flex items-center gap-1.5 flex-wrap">
                      {rf.title}
                      {isPriority && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] uppercase tracking-[0.12em] font-sans bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                          <Star className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
                          Priorytet
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] sm:text-[11.5px] text-muted-foreground leading-snug mt-0.5 truncate">
                      {rf.shortBadge}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => togglePriority(rf.id)}
                      className={`p-1 rounded-md transition-colors ${
                        isPriority
                          ? "text-primary hover:bg-primary/15"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                      }`}
                      aria-label={
                        isPriority
                          ? `Usuń „${rf.title}" z priorytetów`
                          : `Oznacz „${rf.title}" jako wysoki priorytet`
                      }
                      aria-pressed={isPriority}
                      title={isPriority ? "Usuń priorytet" : "Oznacz jako wysoki priorytet"}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${isPriority ? "fill-current" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSelected(rf.id)}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={`Usuń „${rf.title}" z checklisty`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <ChecklistAutoSummary summary={checklistSummary} />

        {selectedFactors.length > 0 && (
          <>
            <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
              <Button
                type="button"
                variant="hero"
                size="sm"
                onClick={handleOpenShare}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                Utwórz link do checklisty
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportChecklistPdf}
                className="gap-2"
              >
                <FileDown className="w-4 h-4" />
                Pobierz PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportChecklistCsv}
                className="gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Pobierz CSV
              </Button>
            </div>
            <p className="mt-3 text-[11.5px] sm:text-xs text-muted-foreground">
              Pokaż tę listę lekarzowi: udostępnij link (otworzy ją z tymi samymi zaznaczeniami) lub
              pobierz PDF/CSV. Wszystko działa offline — nic nie wysyłamy do serwera.
            </p>
          </>
        )}
      </motion.div>

      {/* Dialog: udostępnianie checklisty (link + krótki kod) */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Udostępnij swoją checklistę
            </DialogTitle>
            <DialogDescription>
              Twoje {selectedFactors.length}{" "}
              {selectedFactors.length === 1 ? "zaznaczenie" : "zaznaczeń"} zakodowane w linku.
              Lekarz po kliknięciu zobaczy dokładnie tę samą listę.
              <span className="block mt-1 text-[11px] italic">
                Działa lokalnie — nic nie zapisujemy na serwerze.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Link */}
            <div>
              <label
                htmlFor="checklist-share-url"
                className="text-xs font-sans uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1.5 mb-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-primary" />
                Pełny link
              </label>
              <div className="flex gap-2">
                <Input
                  id="checklist-share-url"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="hero"
                  size="sm"
                  onClick={() => handleCopyShare(shareUrl, "url")}
                  className="gap-1.5 shrink-0"
                >
                  {copiedField === "url" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedField === "url" ? "Skopiowano" : "Kopiuj"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Wklej w SMS-ie, e-mailu lub komunikatorze — otworzy stronę z Twoimi zaznaczeniami.
              </p>
            </div>

            {/* Krótki kod */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <label
                htmlFor="checklist-share-code"
                className="text-xs font-sans uppercase tracking-[0.14em] text-muted-foreground mb-1.5 block"
              >
                Krótki kod (opcjonalnie)
              </label>
              <div className="flex gap-2">
                <Input
                  id="checklist-share-code"
                  readOnly
                  value={shareCode}
                  onFocus={(e) => e.currentTarget.select()}
                  className="font-mono text-sm tracking-wider"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyShare(shareCode, "code")}
                  className="gap-1.5 shrink-0"
                >
                  {copiedField === "code" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedField === "code" ? "OK" : "Kopiuj"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Można podyktować ustnie. Lekarz wpisuje go ręcznie w pasku adresu po:{" "}
                <code className="font-mono text-foreground/80">/dla-pacjenta/hemoroidy?c=</code>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
