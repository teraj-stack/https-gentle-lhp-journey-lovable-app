import { useEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, ShieldAlert, Activity, AlertTriangle, RefreshCw, Ban, Webhook, Repeat, Filter, X, Eye, Download, ArrowDownWideNarrow, ArrowUpWideNarrow, Locate, Info, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Settings2, RotateCcw, FileDown, FileUp, Link2, Play, Pause } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SeoHead from "@/components/shared/SeoHead";
import { computeRowScrollTarget } from "@/lib/scrollHelpers";
import { applyPulseSequence, type PulsePrefs } from "@/lib/pulseAnimation";
import {
  type FocusPrefs,
  type FocusPrefsByVariant,
  type ThemeVariant,
  exportFocusPrefsToJson,
  importFocusPrefsFromJson,
  buildFocusPrefsShareUrl,
  extractFocusPrefsFromHash,
  sanitizeFocusPrefsByVariant,
  getDefaultFocusPrefsByVariant,
} from "@/lib/focusPrefsSerialization";
import { useThemeVariant } from "@/hooks/useThemeVariant";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";

// Próg alarmu dla webhooka on-booking-created — przekroczenie sygnalizuje
// pętlę webhooków DB lub atak floodowy. 60/60s to limit per IP, więc 50
// odrzuceń w 15 min oznacza wyraźny zewnętrzny abuse (jedyny "klient"
// w normalnym ruchu to outbound IP Supabase z webhookiem na INSERT).
const BOOKING_WEBHOOK_DENIED_THRESHOLD = 50;

// Próg alarmu dla retry'ów wewnętrznego webhooka DB (UA Deno/*) w oknie 1h.
// Supabase webhook po 429 retry-uje z exponential backoff, więc 30 retry'ów
// Deno/* w 1h to silny sygnał pętli (UPDATE → INSERT loop) lub spike'a
// importu, który zalał shared rate limit.
const BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD = 30;

type AbuseRow = {
  ip: string;
  failure_count: number;
  invalid_token_count: number;
  rate_limited_count: number;
  expired_count: number;
  already_used_count: number;
  first_seen: string;
  last_seen: string;
  endpoints: string[];
  last_user_agent: string | null;
};

type FailureRow = {
  id: string;
  endpoint: string;
  reason: string;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type RateLimitedIp = {
  endpoint: string;
  ip: string;
  denied: number;
  hits: number;
  windows: number;
  last_window: string;
};

const REASON_LABELS: Record<string, string> = {
  invalid_token: "Nieprawidłowy token",
  rate_limited: "Rate-limit (429)",
  expired: "Token wygasł",
  already_used: "Token już użyty",
  rate_limit_failopen: "RL fail-open (DB error)",
  unauthorized: "Brak autoryzacji",
  invalid_payload: "Nieprawidłowy payload",
};

const REASON_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  invalid_token: "destructive",
  rate_limited: "destructive",
  expired: "secondary",
  already_used: "outline",
  rate_limit_failopen: "destructive",
  unauthorized: "secondary",
  invalid_payload: "outline",
};

// Pola podświetlane w widoku metadanych — szybciej rzuca się w oczy
// przy analizie ataku/pętli (retry-after, podgląd tokenu, metoda HTTP).
const HIGHLIGHTED_METADATA_KEYS = new Set(["retryAfterSec", "tokenPreview", "method"]);

// Walidator numerycznej preferencji z LS — chroni przed NaN/string/poza zakresem.
function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const MetadataView = ({ data }: { data: Record<string, unknown> }) => {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <span className="text-muted-foreground italic">{"{}"}</span>;
  }
  return (
    <div className="space-y-0.5">
      {entries.map(([key, value]) => {
        const isHighlighted = HIGHLIGHTED_METADATA_KEYS.has(key);
        const rendered =
          typeof value === "string" ? `"${value}"` : JSON.stringify(value, null, 2);
        return (
          <div
            key={key}
            className={
              isHighlighted
                ? "rounded bg-primary/15 border border-primary/30 px-1.5 py-0.5 -mx-0.5"
                : "px-1.5 py-0.5"
            }
          >
            <span className={isHighlighted ? "text-primary font-semibold" : "text-muted-foreground"}>
              {key}
            </span>
            <span className="text-muted-foreground">: </span>
            <span className={isHighlighted ? "text-foreground font-semibold" : "text-foreground/90"}>
              {rendered}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Pływająca etykieta „X/Y" przyklejona do prawej krawędzi aktywnego wiersza
// po skoku Next/Prev/Enter/J/K. position: fixed + rAF do śledzenia rect (scroll/resize).
// Auto-fade-out w ostatnich 400ms żywotności.
const JumpLabel = ({
  el,
  ordinal,
  total,
  expiresAt,
}: {
  el: HTMLElement;
  ordinal: number;
  total: number;
  expiresAt: number;
}) => {
  const [pos, setPos] = useState<{ top: number; left: number; visible: boolean; opacity: number }>(
    () => ({ top: 0, left: 0, visible: false, opacity: 0 }),
  );
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const visible = rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw;
      const remaining = expiresAt - performance.now();
      const opacity = remaining > 400 ? 1 : Math.max(0, remaining / 400);
      const top = Math.max(8, Math.min(vh - 32, rect.top + rect.height / 2 - 14));
      const left = Math.min(vw - 12, rect.right + 8);
      setPos({ top, left, visible, opacity });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [el, expiresAt]);
  if (!pos.visible || pos.opacity <= 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        opacity: pos.opacity,
        pointerEvents: "none",
        zIndex: 60,
        transition: "opacity 120ms ease-out",
      }}
      className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-mono font-semibold shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.55)] ring-1 ring-primary-foreground/20 whitespace-nowrap"
    >
      <span className="opacity-80 mr-1">▸</span>
      {ordinal}/{total}
    </div>
  );
};

// Mini-tryb testowy w popoverze „Styl focusu" — 3 sztuczne wiersze, na które
// cyklicznie aplikujemy `applyPulseSequence` z aktualnymi `prefs` (przekazanymi z parenta).
// Każda iteracja przeskakuje na kolejny wiersz (round-robin), pełen cykl trwa
// `pulseDuration + cooldown` żeby admin zobaczył całą sekwencję pulse→afterglow→cleanup
// zanim demo skoczy dalej. Dzięki temu zmiana sliderów daje natychmiastowy podgląd
// efektu BEZ konieczności scrollowania do tabeli i klikania Next/Prev.
const FocusDemo = ({
  prefs,
  highContrast,
  active,
}: {
  prefs: PulsePrefs;
  highContrast: boolean;
  active: boolean;
}) => {
  const rowsRef = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  // Per-component WeakMap timerów dla applyPulseSequence — izolacja od głównej tabeli.
  const timersRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap());
  // Tick licznik zwiększany przez interval; z niego liczymy aktywny indeks (mod 3).
  const [tick, setTick] = useState(0);
  // Każda iteracja: 1700ms pulse + afterglowMs + 500ms cooldown na "wybrzmienie" + krótka pauza.
  // Domyślne 2400ms afterglow → cykl ~4.6s na wiersz, 3 wiersze → ~14s pełnego loopu.
  const cycleDuration = 1700 + prefs.afterglowMs + 500;

  useEffect(() => {
    if (!active) return;
    // Pierwsze odpalenie od razu, potem co `cycleDuration` ms.
    const startEl = rowsRef.current[0];
    if (startEl) {
      applyPulseSequence(startEl, prefs, timersRef.current, { highContrast });
    }
    setTick(1);
    const id = window.setInterval(() => {
      setTick((t) => {
        const next = t + 1;
        const el = rowsRef.current[next % 3];
        if (el) {
          applyPulseSequence(el, prefs, timersRef.current, { highContrast });
        }
        return next;
      });
    }, cycleDuration);
    return () => {
      window.clearInterval(id);
      // Cleanup wszystkich klas/CSS vars na sztucznych wierszach przy zatrzymaniu demo.
      rowsRef.current.forEach((el) => {
        if (!el) return;
        el.classList.remove("animate-jump-pulse", "animate-jump-afterglow", "jump-hc");
        el.style.removeProperty("--jump-ring-w");
        el.style.removeProperty("--jump-glow-blur");
        el.style.removeProperty("--jump-glow-spread");
        el.style.removeProperty("--jump-glow-opacity");
        el.style.removeProperty("--jump-afterglow-duration");
      });
    };
    // Zmiana prefs (slider) restartuje interwał z nową długością cyklu — dzięki temu
    // user widzi DOKŁADNIE ten czas afterglow który ustawił, a nie poprzedni.
  }, [active, cycleDuration, prefs, highContrast]);

  const activeIdx = active ? tick % 3 : -1;

  return (
    <div className="space-y-1.5" aria-label="Podgląd stylu focusu">
      {[0, 1, 2].map((i) => {
        const isActive = i === activeIdx;
        return (
          <div
            key={i}
            ref={(el) => { rowsRef.current[i] = el; }}
            className={`px-2.5 py-1.5 rounded text-[11px] font-mono border bg-card ${
              isActive ? "border-primary/40" : "border-border/50 text-muted-foreground/70"
            }`}
            // Symulujemy aktywny "navigator row" — gdy tick wskazuje ten indeks, dajemy
            // ten sam inline box-shadow jak w głównej tabeli (z aktualnych prefs).
            style={
              isActive
                ? {
                    boxShadow: highContrast
                      ? `inset 0 0 0 ${prefs.ringWidthPx + 2}px hsl(var(--primary)), inset 0 0 0 ${prefs.ringWidthPx + 4}px hsl(var(--foreground) / 0.7), 0 0 ${Math.round(20 + (prefs.glowIntensity / 100) * 20)}px ${Math.round((prefs.glowIntensity / 100) * 6)}px hsl(var(--primary) / ${(0.4 + (prefs.glowIntensity / 100) * 0.5).toFixed(2)})`
                      : `inset 0 0 0 ${prefs.ringWidthPx}px hsl(var(--primary)), 0 0 ${Math.round(16 + (prefs.glowIntensity / 100) * 14)}px ${Math.round((prefs.glowIntensity / 100) * 4)}px hsl(var(--primary) / ${(0.25 + (prefs.glowIntensity / 100) * 0.45).toFixed(2)})`,
                  }
                : undefined
            }
          >
            <span className="opacity-60">row #{i + 1}</span>{" "}
            <span>192.168.{10 + i}.{42 + i * 7}</span>
          </div>
        );
      })}
    </div>
  );
};


const AdminSystemHealth = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [retryFilterIp, setRetryFilterIp] = useState("");
  const [retryFilterUa, setRetryFilterUa] = useState("");
  const [retryDenoOnly, setRetryDenoOnly] = useState(false);
  // Modal inspekcji konkretnej kombinacji IP+UA. null = zamknięty.
  const [inspectSource, setInspectSource] = useState<{ ip: string; ua: string } | null>(null);
  // Filtr tekstowy w modalu — szuka substringa w JSON metadata (case-insensitive).
  const [inspectQuery, setInspectQuery] = useState("");
  // Kierunek sortowania w modalu: desc = najnowsze pierwsze (domyślnie).
  const [inspectSort, setInspectSort] = useState<"desc" | "asc">("desc");
  // Aktualnie podświetlone źródło — dokładny wiersz (`ip+ua`) wyróżniamy mocno (ring + bg primary/15),
  // a wszystkie inne wiersze z tym samym IP dyskretnie (samo bg primary/5). Null = brak highlightu.
  const [highlightedSource, setHighlightedSource] = useState<{ ip: string; ua: string } | null>(null);
  // Ref-flag: true gdy zamknięcie modala wywołujemy programowo z revealRowInTable,
  // żeby onOpenChange nie odpalił drugi raz auto-reveal (unikamy podwójnego toastu).
  const suppressCloseRevealRef = useRef(false);
  // Nawigator dopasowań nad tabelą — uruchamiany przyciskiem "Pokaż kolejne dopasowania" w modalu.
  // keys: pełna lista ip::ua do iteracji (exact na pozycji 0, potem related w kolejności sortowania).
  // index: aktualnie wskazana pozycja (przy 0 = exact). Null = navigator zamknięty.
  const [matchNavigator, setMatchNavigator] = useState<{ keys: string[]; index: number } | null>(null);
  // Kursor skoku do następnego dopasowania — używany przez przycisk "Skocz do następnego"
  // w modalu. Inkrementowany przy każdym kliknięciu, modulo liczba dopasowań.
  // Reset do 0 przy zmianie inspectSource / highlightScope.
  const [inspectJumpIndex, setInspectJumpIndex] = useState(0);
  // Kierunek ostatniego skoku — używany do pokazania ikony ▼/▲ przy badge "Następne".
  // null = jeszcze nie wykonano skoku w tej sesji modala. Reset z inspectJumpIndex.
  const [lastJumpDirection, setLastJumpDirection] = useState<"forward" | "backward" | null>(null);
  // Czy lista podglądu dopasowań jest rozwinięta. Trzymane w localStorage — preferencja
  // widokowa per cała sesja (nie per IP/UA), żeby po zamknięciu modala i ponownym otwarciu
  // (nawet dla innego źródła) zachować ulubiony układ użytkownika. Lazy init — sync z LS.
  const [inspectListOpen, setInspectListOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("admin-sys-health.inspect-list-open") === "1";
  });
  // Query wyszukiwania w "Podgląd dopasowań" — filtruje po IP/UA (case-insensitive substring).
  // NIE persystowane (specyficzne dla bieżącej sesji eksploracji).
  const [inspectListQuery, setInspectListQuery] = useState("");
  // Klucz `${ip}::${ua}` aktualnie wskazany strzałkami w mini-liście "Podgląd dopasowań".
  // Dodaje wizualny ring + badge "klawiatura" obok zwykłego "next cursor", żeby user widział
  // gdzie stoi fokus PRZED naciśnięciem Enter. Czyszczony po wykonaniu skoku (Enter/klik),
  // przy zamknięciu modala oraz przy zmianie inspectSource — to stan "sesji nawigacji",
  // nie persystowany. NIE używamy document.activeElement, bo focus może być utracony np.
  // gdy lista re-renderuje się po zmianie filtra/sortowania.
  const [keyboardActiveKey, setKeyboardActiveKey] = useState<string | null>(null);
  // Sortowanie mini-listy "Podgląd dopasowań": "default" (kolejność z buildMatchKeys = exact
  // + related), "count-desc" (najwięcej retry'ów na górze — typowy use-case "co naprawić"),
  // "ip-asc" (alfabetycznie po IP). Persystowane w LS — to preferencja widokowa.
  const [inspectListSort, setInspectListSort] = useState<"default" | "count-desc" | "ip-asc">(() => {
    if (typeof window === "undefined") return "default";
    const v = window.localStorage.getItem("admin-sys-health.inspect-list-sort");
    return v === "count-desc" || v === "ip-asc" ? v : "default";
  });
  // Sync preferencji widokowych do localStorage przy każdej zmianie.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("admin-sys-health.inspect-list-open", inspectListOpen ? "1" : "0");
  }, [inspectListOpen]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("admin-sys-health.inspect-list-sort", inspectListSort);
  }, [inspectListSort]);
  // Per-source pamięć kursora — żeby po zamknięciu i ponownym otwarciu modala
  // dla tego samego IP+UA+scope, kursor i kierunek wskazywały to samo dopasowanie
  // co poprzednio. Klucz: `${ip}::${ua}::${scope}`. In-memory (Map w refie) — nie potrzeba
  // localStorage, bo dane retry się odświeżają i indeksy mogą się zdezaktualizować po reloadzie.
  const jumpStateMemoryRef = useRef<Map<string, { index: number; direction: "forward" | "backward" | null }>>(
    new Map(),
  );
  // Timer auto-hide nawigatora po 30s bezczynności.
  const navigatorHideTimerRef = useRef<number | null>(null);
  // Timestamp ostatniego smooth scrolla (performance.now). Używany do auto-degradacji
  // smooth → instant gdy user spamuje J/K — kolejne smooth animacje anulują się nawzajem
  // i wyglądają jak "lag", instant trzyma kursor synchronicznie z klawiszem.
  // Próg 250ms ≈ szybsze niż komfortowe trzymanie klawisza (~30/s przy autorepeat).
  const lastScrollAtRef = useRef<number>(0);
  // Per-element timery cleanup'u animacji `animate-jump-pulse`. WeakMap (klucz = HTMLElement)
  // żeby uniknąć zaśmiecania jednym globalnym setTimeoutem, który mógłby ucinać kolejny pulse
  // na tym samym wierszu (Next/Prev wracający do tego samego elementu). Każdy element ma swój
  // timer — nowy pulse czyści stary, animacja zawsze gra do końca.
  const pulseTimersRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap());
  // Preferencja użytkownika: czy zamknięcie modala / klik "Pokaż w tabeli" ma przewijać
  // i podświetlać wiersz w tabeli. Trzymane w localStorage żeby przeżyło reload.
  const AUTO_REVEAL_LS_KEY = "admin-system-health.auto-reveal-row";
  const [autoRevealEnabled, setAutoRevealEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem(AUTO_REVEAL_LS_KEY);
    // Domyślnie ON — wartość zapisujemy tylko gdy admin świadomie wyłączy.
    return v === null ? true : v === "1";
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(AUTO_REVEAL_LS_KEY, autoRevealEnabled ? "1" : "0");
    } catch {
      // localStorage może być zablokowany (private mode) — ignorujemy.
    }
  }, [autoRevealEnabled]);

  // Preferencja: zakres podświetlenia po reveal.
  //  - "exact"   → tylko wiersz z dokładnym IP+UA (jeden, mocny)
  //  - "same-ip" → wiersz źródłowy mocno + wszystkie pozostałe z tym samym IP delikatnie (default)
  //  - "same-ua" → wiersz źródłowy mocno + wszystkie pozostałe z tym samym UA delikatnie
  const HIGHLIGHT_SCOPE_LS_KEY = "admin-system-health.highlight-scope";
  type HighlightScope = "exact" | "same-ip" | "same-ua";
  const [highlightScope, setHighlightScope] = useState<HighlightScope>(() => {
    if (typeof window === "undefined") return "same-ip";
    const v = window.localStorage.getItem(HIGHLIGHT_SCOPE_LS_KEY);
    if (v === "exact" || v === "same-ip" || v === "same-ua") return v;
    return "same-ip";
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(HIGHLIGHT_SCOPE_LS_KEY, highlightScope);
    } catch {
      // ignoruj w private mode
    }
  }, [highlightScope]);

  // Preferencja: tryb wysokiego kontrastu obrysu aktywnego wiersza po skoku.
  // Gdy ON, wiersz isNavigatorActive otrzymuje grubszy ring (4px), mocniejszy halo
  // shadow i dodatkowy inset-outline w kolorze foreground — czytelne zarówno na
  // jasnych, jak i ciemnych motywach (warstwa primary+foreground + offset background).
  // Animacje pulse/afterglow dostają klasę -hc, która podkręca opacity i grubość ringa.
  // Persystowane w localStorage, default OFF (większość adminów zostaje przy spokojnym).
  const HIGH_CONTRAST_LS_KEY = "admin-system-health.high-contrast-focus";
  const [highContrastFocus, setHighContrastFocus] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(HIGH_CONTRAST_LS_KEY) === "1";
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(HIGH_CONTRAST_LS_KEY, highContrastFocus ? "1" : "0");
    } catch {
      // ignoruj w private mode
    }
  }, [highContrastFocus]);

  // ============================================================================
  // Preferencje stylu focusu po skoku — persystowane w localStorage.
  // Sliders w popoverze "Styl focusu" (toolbar tabeli "Top retry sources") pozwalają
  // dostroić: (1) afterglow duration (czas trwałego ringa po pulse'ie), (2) ring width
  // (grubość obrysu aktywnego wiersza), (3) glow intensity (siła halo / shadow).
  // Wartości są aplikowane przez CSS custom properties ustawiane na elemencie wiersza
  // w `pulseRow` oraz na `<TableRow isNavigatorActive>` przez inline style.
  // ============================================================================
  const FOCUS_PREFS_LS_KEY = "admin-system-health.focus-style-prefs";
  // Per-variant prefs (v2): trzymamy 3 osobne sety stylu focusu — `light`, `dark`, `hc`.
  // Aktywny variant wybierany przez `useThemeVariant(highContrastFocus)` — gdy admin
  // przełącza HC toggle albo zmienia motyw OS, automatycznie aplikuje się variant z LS.
  // Storage trzyma cały obiekt `{ light, dark, hc }` jako JSON; legacy single-prefs
  // (z v1) jest auto-replikowany do wszystkich 3 wariantów przez `sanitizeFocusPrefsByVariant`.
  const [focusPrefsByVariant, setFocusPrefsByVariant] = useState<FocusPrefsByVariant>(() => {
    if (typeof window === "undefined") return getDefaultFocusPrefsByVariant();
    // Priorytet 1: URL fragment `#focus-prefs=...` (np. po wklejeniu shared linka).
    const fromHash = extractFocusPrefsFromHash(window.location.hash);
    if (fromHash) return fromHash;
    // Priorytet 2: localStorage (zapamiętane przy poprzedniej sesji).
    try {
      const raw = window.localStorage.getItem(FOCUS_PREFS_LS_KEY);
      if (!raw) return getDefaultFocusPrefsByVariant();
      const parsed: unknown = JSON.parse(raw);
      // sanitizeFocusPrefsByVariant rozpoznaje legacy v1 (single prefs) i replikuje do 3 wariantów.
      return sanitizeFocusPrefsByVariant(parsed);
    } catch {
      return getDefaultFocusPrefsByVariant();
    }
  });
  // Hidden input ref dla Import — programowy klik z przycisku otwiera natywny picker.
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  // Tryb testowy w popoverze — cyklicznie pulsuje sztuczne wiersze, żeby admin
  // od razu zobaczył efekt po zmianie sliderów (bez chodzenia do tabeli).
  const [focusDemoActive, setFocusDemoActive] = useState(false);
  // Variant do EDYCJI w popoverze — domyślnie ten sam co aktywny, ale admin może
  // ręcznie wybrać inny żeby ustawić styl „z góry" zanim przełączy motyw.
  // null = follow active variant (default).
  const [editingVariantOverride, setEditingVariantOverride] = useState<ThemeVariant | null>(null);
  // Autosave do localStorage z debounce 400ms — gdy admin ciągnie slider, NIE
  // zapisujemy 50 razy/s (każdy onValueChange triggeruje setState). Zamiast tego
  // czekamy aż przestanie ruszać przez 400ms i robimy 1 zapis. UI dostaje status
  // ("Zapisuję…" / "Zapisano ✓") żeby było wiadomo że nie trzeba klikać save.
  // Initial render NIE pokazuje statusu (didMountRef) — bo to nie jest "user edit",
  // tylko hydration z localStorage.
  type SaveStatus = "idle" | "pending" | "saved";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const didMountFocusPrefsRef = useRef(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Pierwszy effect po mount = hydration z initial state, nie user edit.
    if (!didMountFocusPrefsRef.current) {
      didMountFocusPrefsRef.current = true;
      return;
    }
    setSaveStatus("pending");
    const debounceId = setTimeout(() => {
      try {
        window.localStorage.setItem(FOCUS_PREFS_LS_KEY, JSON.stringify(focusPrefsByVariant));
        setSaveStatus("saved");
        // „Zapisano ✓" widoczne 1.5s, potem znika żeby nie rozpraszało.
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
      } catch {
        // ignoruj w private mode — UI po prostu zostanie w "pending" i znika po unmount.
        setSaveStatus("idle");
      }
    }, 400);
    return () => clearTimeout(debounceId);
  }, [focusPrefsByVariant]);
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);
  // Po zaaplikowaniu prefs z URL fragmentu (initial state) — wyczyść hash, żeby
  // odświeżenie strony nie nadpisało lokalnych zmian usera. Toast informuje użytkownika.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromHash = extractFocusPrefsFromHash(window.location.hash);
    if (!fromHash) return;
    const clean = window.location.hash.replace(/(^#|&)focus-prefs=[^&]*/g, "").replace(/^#&/, "#");
    const newHash = clean === "#" ? "" : clean;
    window.history.replaceState(null, "", window.location.pathname + window.location.search + newHash);
    toast.success("Zaaplikowano styl focusu z linka", {
      description: "Per-variant preferencje (light/dark/HC) zostały zapisane lokalnie.",
    });
  }, []);
  // Eksport WSZYSTKICH 3 wariantów do pliku .json — admin dostaje pełny backup,
  // nie tylko aktywny variant.
  const handleExportFocusPrefs = () => {
    try {
      const json = exportFocusPrefsToJson(focusPrefsByVariant);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `focus-prefs-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Wyeksportowano preferencje", {
        description: `${a.download} (3 warianty: light/dark/HC)`,
      });
    } catch (err) {
      toast.error("Błąd eksportu", {
        description: err instanceof Error ? err.message : "Nieznany błąd",
      });
    }
  };
  // Kopia shareable URL — link niesie wszystkie 3 warianty (compact base64url ~60 znaków).
  const handleCopyFocusPrefsLink = async () => {
    try {
      const url = buildFocusPrefsShareUrl(focusPrefsByVariant, window.location.href);
      await navigator.clipboard.writeText(url);
      toast.success("Skopiowano link z preferencjami", {
        description: "Link zawiera wszystkie 3 warianty (light/dark/HC).",
      });
    } catch (err) {
      toast.error("Nie udało się skopiować linka", {
        description: err instanceof Error ? err.message : "Brak dostępu do clipboardu",
      });
    }
  };
  // Kopia shareable URL TYLKO dla aktualnie edytowanego wariantu — przydatne gdy admin
  // chce udostępnić styl konkretnego motywu (np. tylko HC dla użytkownika a11y) bez
  // nadpisywania pozostałych wariantów u odbiorcy. Replikujemy edytowane prefs do
  // wszystkich 3 slotów schematu — odbiorca po imporcie dostaje jednolity styl,
  // który może potem zróżnicować ręcznie.
  const handleCopyFocusPrefsLinkVariant = async () => {
    try {
      const single = focusPrefsByVariant[editingVariant];
      const replicated = { light: single, dark: single, hc: single };
      const url = buildFocusPrefsShareUrl(replicated, window.location.href);
      await navigator.clipboard.writeText(url);
      const label = editingVariant === "hc" ? "High Contrast" : editingVariant === "light" ? "Light" : "Dark";
      // Krótki, konkretny opis — pokazujemy realne wartości ring/glow/afterglow,
      // żeby admin po skopiowaniu od razu wiedział co trafiło do schowka (i mógł
      // zweryfikować przed wysłaniem linka).
      toast.success(`Skopiowano link (${label})`, {
        description: `Wariant ${label}: ring ${single.ringWidthPx}px · glow ${single.glowIntensity}% · afterglow ${single.afterglowMs}ms`,
      });
    } catch (err) {
      toast.error("Nie udało się skopiować linka", {
        description: err instanceof Error ? err.message : "Brak dostępu do clipboardu",
      });
    }
  };
  // Import z pliku .json — czytamy przez FileReader, sanityzujemy, ustawiamy stan.
  // Akceptuje v2 (per-variant), v1 (single, replikowany) i legacy plain.
  const handleImportFocusPrefs = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const imported = importFocusPrefsFromJson(text);
        setFocusPrefsByVariant(imported);
        toast.success("Zaimportowano preferencje", {
          description: "Zaktualizowano wszystkie 3 warianty (light/dark/HC).",
        });
      } catch (err) {
        toast.error("Błąd importu", {
          description: err instanceof Error ? err.message : "Niepoprawny plik JSON",
        });
      }
    };
    reader.onerror = () => {
      toast.error("Nie udało się odczytać pliku");
    };
    reader.readAsText(file);
  };
  // Aktualny variant motywu — `hc` zawsze wygrywa nad light/dark gdy HC toggle ON.
  const activeThemeVariant = useThemeVariant(highContrastFocus);
  // Variant edytowany w popoverze — domyślnie aktywny, override przez tabs.
  const editingVariant: ThemeVariant = editingVariantOverride ?? activeThemeVariant;
  // Aktywne prefs (do aplikacji w pulse + activeRowStyle) zawsze z aktywnego wariantu.
  const focusPrefs: FocusPrefs = focusPrefsByVariant[activeThemeVariant];
  // Setter dla aktualnie EDYTOWANEGO wariantu (slider/reset działają na nim).
  const setEditingVariantPrefs = (updater: (prev: FocusPrefs) => FocusPrefs) => {
    setFocusPrefsByVariant((all) => ({
      ...all,
      [editingVariant]: updater(all[editingVariant]),
    }));
  };
  // Trzymaj najnowsze AKTYWNE wartości w refie — pulseRow czyta je w momencie wywołania.
  const focusPrefsRef = useRef<FocusPrefs>(focusPrefs);
  useEffect(() => {
    focusPrefsRef.current = focusPrefs;
  }, [focusPrefs]);
  // Auto-toast gdy aktywny variant się zmienia (HC toggle, system theme switch) —
  // admin dostaje feedback „przełączono na ciemny styl X".
  const prevVariantRef = useRef<ThemeVariant>(activeThemeVariant);
  useEffect(() => {
    if (prevVariantRef.current === activeThemeVariant) return;
    const labels: Record<ThemeVariant, string> = {
      light: "jasny",
      dark: "ciemny",
      hc: "high-contrast",
    };
    toast.info(`Aktywny styl focusu: ${labels[activeThemeVariant]}`, {
      description: `Załadowano zapisane prefs: afterglow ${(focusPrefs.afterglowMs / 1000).toFixed(1)}s, ring ${focusPrefs.ringWidthPx}px, glow ${focusPrefs.glowIntensity}%`,
      duration: 2500,
    });
    prevVariantRef.current = activeThemeVariant;
  }, [activeThemeVariant, focusPrefs]);
  // Inline style dla aktywnego wiersza (isNavigatorActive) — ring + halo wyliczone
  // z preferencji AKTYWNEGO wariantu. Memo, bo używane wielokrotnie w mapie wierszy.
  const activeRowStyle = useMemo<CSSProperties>(() => {
    const ring = highContrastFocus ? focusPrefs.ringWidthPx + 2 : focusPrefs.ringWidthPx;
    const glow = focusPrefs.glowIntensity / 100; // 0..1
    return {
      boxShadow: highContrastFocus
        ? `inset 0 0 0 ${ring}px hsl(var(--primary)), inset 0 0 0 ${ring + 2}px hsl(var(--foreground) / 0.7), 0 0 ${Math.round(20 + glow * 20)}px ${Math.round(glow * 6)}px hsl(var(--primary) / ${(0.4 + glow * 0.5).toFixed(2)})`
        : `inset 0 0 0 ${ring}px hsl(var(--primary)), 0 0 ${Math.round(16 + glow * 14)}px ${Math.round(glow * 4)}px hsl(var(--primary) / ${(0.25 + glow * 0.45).toFixed(2)})`,
    };
  }, [focusPrefs, highContrastFocus]);


  // Auto-fade highlightu wiersza po 10s — wystarczająco długo, żeby admin zdążył zauważyć
  // wyróżnienie po zamknięciu modala, ale nie zostawia trwałego kolorowego rzędu.
  useEffect(() => {
    if (!highlightedSource) return;
    const t = window.setTimeout(() => setHighlightedSource(null), 10000);
    return () => window.clearTimeout(t);
  }, [highlightedSource]);

  // Pływająca etykieta „X/Y" pojawiająca się tuż obok aktywnego wiersza zaraz po skoku.
  // Pokazuje aktualny indeks i sumę dopasowań, żeby user od razu widział „gdzie jestem"
  // bez szukania badge'a w komórce. Ustawiana przez pulseRow(label={...}), automatycznie
  // znika po `pulseLabelDuration` (1700ms pulse + afterglowMs + 200ms zapasu).
  // `el` przechowywany żeby JumpLabel mógł śledzić rect przez rAF (scroll/resize).
  const [jumpLabel, setJumpLabel] = useState<{
    el: HTMLElement;
    ordinal: number;
    total: number;
    expiresAt: number;
  } | null>(null);
  const jumpLabelTimerRef = useRef<number | null>(null);

  // Snapshot filtrów tabeli źródeł sprzed wywołania "Pokaż w tabeli" — używany do przywrócenia
  // poprzednich ustawień filtrowania, jeśli reveal je wyczyścił. null = brak aktywnego snapshotu.
  const [filtersSnapshot, setFiltersSnapshot] = useState<{
    ip: string;
    ua: string;
    denoOnly: boolean;
  } | null>(null);

  // Przywraca filtry z ostatniego snapshotu (i zamyka toasta przez to samo id, jeśli aktywny).
  const restoreFiltersSnapshot = (snap: { ip: string; ua: string; denoOnly: boolean }) => {
    setRetryFilterIp(snap.ip);
    setRetryFilterUa(snap.ua);
    setRetryDenoOnly(snap.denoOnly);
    setFiltersSnapshot(null);
    toast.success("Przywrócono poprzednie filtry");
  };

  // Przewija stronę do zadanej pozycji Y z natywnym smooth scrollem.
  const scrollToY = (y: number) => {
    window.scrollTo({ top: y, left: 0, behavior: "smooth" });
  };

  // Przewija wiersz tabeli do widoku z uwzględnieniem wysokości sticky nagłówka strony
  // (CSS var --header-height ustawiana przez Header.tsx). Natywne `scrollIntoView({ block: "center" })`
  // ignoruje sticky elementy i potrafi schować górną część wiersza pod headerem — własny scroll
  // celuje w ŚRODEK bezpiecznej strefy (między dolną krawędzią headera a dnem viewportu),
  // żeby wiersz był łatwy do zlokalizowania wzrokowo, a nie tylko minimalnie wsunięty pod header.
  // `force=true` (klik badge'a / Next/Prev / Enter/J/K) — zawsze scrolluj, żeby user dostał
  // wizualne potwierdzenie, że jego intencja została zarejestrowana.
  // `force=false` (auto-reveal po zamknięciu modala) — pomiń, gdy wiersz już w pełni widoczny,
  // żeby nie szarpać widokiem bez powodu.
  // Behavior: smooth domyślnie, ale auto (instant) gdy:
  //  - user ma `prefers-reduced-motion: reduce` (accessibility),
  //  - poprzedni scroll był <250ms temu (spam J/K — smooth animacje anulują się nawzajem
  //    i wyglądają jak "lag" / kursor nie nadąża za klawiszem; instant utrzymuje 1:1 sync).
  const scrollRowIntoView = (el: HTMLElement, force = false) => {
    const cssVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--header-height")
      .trim();
    const headerH = cssVar ? parseFloat(cssVar) : 80;
    const rect = el.getBoundingClientRect();
    // Pure helper (src/lib/scrollHelpers.ts) liczy targetY i wykrywa "już widoczny".
    // Wyciągnięte żeby pokryć testem jednostkowym — patrz scrollHelpers.test.ts.
    const targetY = computeRowScrollTarget({
      rectTop: rect.top,
      rowHeight: rect.height,
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      headerHeight: headerH,
      force,
    });
    if (targetY === null) return; // wiersz w pełni widoczny + !force → pomiń scroll
    const now = performance.now();
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rapidRepeat = now - lastScrollAtRef.current < 250;
    const behavior: ScrollBehavior = prefersReducedMotion || rapidRepeat ? "auto" : "smooth";
    lastScrollAtRef.current = now;
    window.scrollTo({ top: targetY, left: 0, behavior });
  };

  // Aplikuje powtarzalne wyróżnienie (animate-jump-pulse) na wierszu — wizualne potwierdzenie
  // skoku Next/Prev/Enter/J/K/klik badge. Replay przez force-reflow (`void el.offsetWidth`)
  // żeby kolejny skok na ten sam element też zagrał animację od początku.
  // Per-element timer w WeakMap czyści poprzedni cleanup zanim ustawi nowy — bez tego
  // szybki Next→Prev na tym samym wierszu mógłby uciąć drugą animację o pozostałe ms.
  // Respektuje `prefers-reduced-motion: reduce` — pomija animację dla a11y.
  //
  // Sekwencja wzrokowa po skoku:
  //   1. `animate-jump-pulse`     (~1.8s, 3× pulsujący ring + halo + scale 1.012)
  //   2. `animate-jump-afterglow` (~2.4s, fade-out trwałego ringa + tła) — startuje
  //      tuż przed końcem pulse'a (1.7s), żeby user nie tracił z oczu „gdzie jestem"
  //      gdy main animation wygaśnie.
  // Łącznie ~4s wyraźnego sygnału, potem wiersz wraca do neutralnego stanu (lub do
  // ringa nawigatora gdy `isNavigatorActive` nadal true → patrz className TableRow).
  //
  // Opcja `focus=true`: po pulse'ie ustawia fokus na wierszu (tabIndex=-1 + preventScroll),
  // żeby a11y/keyboard users dostali screen-reader announcement i mogli kontynuować nawigację
  // klawiszem (np. Tab z wiersza do kolejnych przycisków). Domyślnie false — focus podczas
  // skoków w modalu ukradłby klawiaturę z dialogu.
  const pulseRow = (
    el: HTMLElement,
    opts: { focus?: boolean; label?: { ordinal: number; total: number } } = {},
  ) => {
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Cała logika DOM (klasy, CSS vars, timery, force-reflow, anulowanie poprzedniego
    // pulse'u) wyciągnięta do `applyPulseSequence` w `src/lib/pulseAnimation.ts` —
    // pokryta testami jednostkowymi (`pulseAnimation.test.ts`) które bronią kontraktu
    // wizualnego: obrys MUSI pojawić się natychmiast i NIE wolno mu zniknąć przed
    // czasem (1700 + afterglowMs + 100 ms).
    applyPulseSequence(
      el,
      focusPrefsRef.current,
      pulseTimersRef.current,
      {
        highContrast: highContrastFocus,
        reducedMotion: prefersReducedMotion,
      },
    );
    // Pływająca etykieta „X/Y" obok wiersza — pokazujemy zawsze gdy podany label,
    // niezależnie od prefers-reduced-motion (etykieta to informacja, nie animacja).
    if (opts.label) {
      const totalDuration = 1700 + focusPrefsRef.current.afterglowMs + 200;
      setJumpLabel({
        el,
        ordinal: opts.label.ordinal,
        total: opts.label.total,
        expiresAt: performance.now() + totalDuration,
      });
      if (jumpLabelTimerRef.current !== null) {
        window.clearTimeout(jumpLabelTimerRef.current);
      }
      jumpLabelTimerRef.current = window.setTimeout(() => {
        setJumpLabel(null);
        jumpLabelTimerRef.current = null;
      }, totalDuration);
    }
    if (opts.focus) {
      // preventScroll: nasz scrollRowIntoView już wycentrował wiersz — focus nie powinien
      // tego cofać natywnym skokiem do brzegu viewportu.
      try {
        el.focus({ preventScroll: true });
      } catch {
        // Element bez tabIndex / detached — ignorujemy.
      }
    }
  };

  // Zamyka modal i przewija/podświetla wiersz w tabeli źródeł dla wskazanej kombinacji IP+UA.
  // Czeka jeden frame, żeby DOM zdążył odmontować dialog i przywrócić scroll body.
  const revealRowInTable = (ip: string, ua: string) => {
    // Jeśli admin wyłączył auto-reveal w preferencjach — tylko zamknij modal, bez
    // czyszczenia filtrów, scrolla, podświetlenia i toastów. To jest "kill switch".
    if (!autoRevealEnabled) {
      suppressCloseRevealRef.current = true;
      setInspectSource(null);
      setInspectQuery("");
      setInspectSort("desc");
      return;
    }
    const key = `${ip}::${ua}`;
    // Zapamiętaj pozycję scrolla SPRZED auto-przewinięcia, żeby toast "Cofnij" mógł
    // przywrócić użytkownika dokładnie tam, gdzie był.
    const previousScrollY = window.scrollY;
    // Zapisz snapshot tylko, jeśli jakiś filtr faktycznie zostanie wyczyszczony — inaczej
    // nie ma czego przywracać i nie zaśmiecamy UI toastem.
    const willClearIp = retryFilterIp.trim() !== "";
    const willClearUa = retryFilterUa.trim() !== "";
    const willClearDeno = retryDenoOnly && !/^Deno\//i.test(ua);
    const hadFilters = willClearIp || willClearUa || willClearDeno;
    const snapshot = hadFilters
      ? { ip: retryFilterIp, ua: retryFilterUa, denoOnly: retryDenoOnly }
      : null;
    if (snapshot) setFiltersSnapshot(snapshot);
    // Wyczyść filtry, jeśli przez nie wiersz jest poza listą — inaczej scroll trafi w pustkę.
    if (willClearIp) setRetryFilterIp("");
    if (willClearUa) setRetryFilterUa("");
    if (willClearDeno) setRetryDenoOnly(false);
    suppressCloseRevealRef.current = true;
    setInspectSource(null);
    setInspectQuery("");
    setInspectSort("desc");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-retry-row-key="${CSS.escape(key)}"]`);
        let didScroll = false;
        if (el) {
          scrollRowIntoView(el);
          // Pulse + focus po zamknięciu modala — modal już odmontowany, więc focus
          // na wierszu jest bezpieczny i pomaga screen-readerowi ogłosić docelowy wiersz.
          // Etykieta „X/Y": reveal trafia w exact (idx 0), więc ordinal=1; total
          // wyznaczamy z buildMatchKeys (uwzględnia bieżący highlightScope).
          {
            const totalKeys = buildMatchKeys({ ip, ua }, highlightScope).length;
            pulseRow(el, {
              focus: true,
              label: { ordinal: 1, total: Math.max(totalKeys, 1) },
            });
          }
          // Zapamiętaj exact source — render porównuje s.ip+s.ua dla mocnego highlightu,
          // a samo IP dla delikatnego highlightu pokrewnych wierszy z tego samego adresu.
          setHighlightedSource({ ip, ua });
          didScroll = true;
        }
        if (snapshot) {
          // Toast z akcją "Przywróć filtry" — czas życia 8s, żeby admin zdążył kliknąć.
          toast("Wyczyszczono filtry, żeby pokazać wiersz", {
            description: "Możesz przywrócić poprzednie ustawienia jednym kliknięciem.",
            action: {
              label: "Przywróć filtry",
              onClick: () => restoreFiltersSnapshot(snapshot),
            },
            duration: 8000,
          });
        }
        // Drugi, niezależny toast z akcją "Cofnij" — pojawia się tylko jeśli faktycznie
        // przewinęliśmy stronę (różnica >40 px), żeby nie zaśmiecać UI gdy wiersz był już
        // widoczny w viewporcie.
        if (didScroll && Math.abs(window.scrollY - previousScrollY) > 40) {
          toast("Przewinięto do wiersza", {
            description: "Możesz wrócić do poprzedniego miejsca na stronie.",
            action: {
              label: "Cofnij",
              onClick: () => {
                scrollToY(previousScrollY);
                toast.success("Przywrócono poprzednią pozycję");
              },
            },
            duration: 8000,
          });
        }
      });
    });
  };

  // Resetuje timer auto-hide (30s) — wywoływany przy każdej interakcji z navigatorem.
  const bumpNavigatorTimer = () => {
    if (navigatorHideTimerRef.current !== null) {
      window.clearTimeout(navigatorHideTimerRef.current);
    }
    navigatorHideTimerRef.current = window.setTimeout(() => {
      setMatchNavigator(null);
      navigatorHideTimerRef.current = null;
    }, 30_000);
  };

  // Scrolluje do wiersza wskazanego przez index w keys + aplikuje pulse animation
  // (animate-jump-pulse) — spójnie z performJumpToMatch (J/K). Robust: rAF + 1 retry,
  // bo navigator bar jest renderowany po zamknięciu modala i wiersz w tabeli może
  // jeszcze nie być w DOM w momencie wywołania (transition/reflow po dialog close).
  const scrollToNavigatorIndex = (idx: number, keys: string[]) => {
    const key = keys[idx];
    if (!key) return;
    const tryScroll = (attempt: number) => {
      const el = document.querySelector<HTMLElement>(`[data-retry-row-key="${CSS.escape(key)}"]`);
      if (!el) {
        if (attempt < 3) {
          requestAnimationFrame(() => tryScroll(attempt + 1));
        }
        return;
      }
      scrollRowIntoView(el, true);
      // focus=true: nawigator bar = modal zamknięty → bezpiecznie kradniemy fokus,
      // żeby a11y/screen-reader ogłosił nowy wiersz i Tab kontynuował z tabeli.
      pulseRow(el, {
        focus: true,
        label: { ordinal: idx + 1, total: keys.length },
      });
    };
    requestAnimationFrame(() => tryScroll(0));
  };

  // Otwiera nawigator dopasowań. keys[0] musi być exact (zostanie scrollowany pierwszy
  // przez revealRowInTable, nie przez navigator).
  const openMatchNavigator = (keys: string[]) => {
    if (keys.length <= 1) return; // brak pokrewnych — nic do nawigacji
    setMatchNavigator({ keys, index: 0 });
    bumpNavigatorTimer();
  };

  const goToNavigatorOffset = (offset: number) => {
    setMatchNavigator((nav) => {
      if (!nav) return nav;
      const len = nav.keys.length;
      const nextIdx = ((nav.index + offset) % len + len) % len;
      queueMicrotask(() => scrollToNavigatorIndex(nextIdx, nav.keys));
      return { ...nav, index: nextIdx };
    });
    bumpNavigatorTimer();
  };

  // Cleanup timera przy unmount.
  useEffect(() => {
    return () => {
      if (navigatorHideTimerRef.current !== null) {
        window.clearTimeout(navigatorHideTimerRef.current);
      }
    };
  }, []);

  // Restore kursora przy zmianie źródła inspekcji lub scope:
  // - jeśli mamy zapamiętany stan dla `${ip}::${ua}::${scope}` → przywróć indeks i kierunek
  //   (po reopen modala dla tego samego źródła zobaczymy to samo dopasowanie co poprzednio)
  // - jeśli nie → reset do 0 (świeża sesja dla nowego źródła)
  // Walidujemy tylko że indeks mieści się w aktualnej liczbie dopasowań — jeśli dane
  // retry się odświeżyły i indeks wypadł poza zakres, fallback do 0.
  useEffect(() => {
    // Każda zmiana inspectSource (open/close/switch) resetuje wskaźnik klawiatury —
    // to jest stan sesji nawigacji, nie powinien przeciekać między źródłami.
    setKeyboardActiveKey(null);
    if (!inspectSource) {
      setInspectJumpIndex(0);
      setLastJumpDirection(null);
      return;
    }
    const memoryKey = `${inspectSource.ip}::${inspectSource.ua}::${highlightScope}`;
    const remembered = jumpStateMemoryRef.current.get(memoryKey);
    if (remembered) {
      const total = buildMatchKeys(inspectSource, highlightScope).length;
      const safeIndex = total > 0 ? remembered.index % total : 0;
      setInspectJumpIndex(safeIndex);
      setLastJumpDirection(remembered.direction);
    } else {
      setInspectJumpIndex(0);
      setLastJumpDirection(null);
    }
    // buildMatchKeys zależy od webhookRetryStats.sources, ale to OK — chcemy walidować
    // przy każdej zmianie source/scope, niezależnie od refresh danych.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectSource, highlightScope]);


  // Wykonuje skok do podświetlonego wiersza o offset (+1 = następne, -1 = poprzednie)
  // względem aktualnego inspectJumpIndex. Cyklicznie modulo total. Aplikuje animate-jump-pulse
  // na trafiony wiersz. Używane przez przycisk w modalu ORAZ skróty klawiszowe (↓/↑/J/K).
  const performJumpToMatch = (offset: number) => {
    if (!inspectSource) return;
    const jumpKeys = buildMatchKeys(inspectSource, highlightScope);
    if (jumpKeys.length <= 1) return; // exact only — nic do skakania
    const total = jumpKeys.length;
    // Zapisz kierunek skoku dla wskaźnika ▼/▲ przy badge "Następne".
    const newDirection: "forward" | "backward" = offset >= 0 ? "forward" : "backward";
    setLastJumpDirection(newDirection);
    setInspectJumpIndex((prev) => {
      const idx = ((prev + offset) % total + total) % total;
      const key = jumpKeys[idx];
      const el = document.querySelector<HTMLElement>(`[data-retry-row-key="${CSS.escape(key)}"]`);
      if (el) {
        scrollRowIntoView(el, true);
        pulseRow(el, { label: { ordinal: idx + 1, total } });
      }
      const nextIndex = (idx + 1) % total;
      // Persist do mapy — żeby reopen modala dla tego samego (ip, ua, scope) wrócił tu.
      const memoryKey = `${inspectSource.ip}::${inspectSource.ua}::${highlightScope}`;
      jumpStateMemoryRef.current.set(memoryKey, { index: nextIndex, direction: newDirection });
      return nextIndex;
    });
  };

  // Skok do KONKRETNEGO indeksu (absolutnego), nie offsetu — używane przez kliknięcie
  // numeru porządkowego w tabeli. Zachowuje pulse + scroll + persist memory + direction
  // (wyznaczany względem poprzedniego indeksu) tak samo jak performJumpToMatch.
  // Działa w obu trybach:
  //  - matchNavigator aktywny (modal zamknięty) → aktualizuje matchNavigator.index + scrollToNavigatorIndex
  //  - inspectSource aktywny (modal otwarty / bez navigator bar) → aktualizuje inspectJumpIndex
  const jumpToMatchIndex = (targetIdx: number) => {
    // Tryb 1: navigator bar (modal zamknięty po "Pokaż kolejne dopasowania")
    if (matchNavigator) {
      const len = matchNavigator.keys.length;
      if (len === 0) return;
      const idx = ((targetIdx % len) + len) % len;
      setMatchNavigator({ ...matchNavigator, index: idx });
      bumpNavigatorTimer();
      queueMicrotask(() => scrollToNavigatorIndex(idx, matchNavigator.keys));
      return;
    }
    // Tryb 2: modal otwarty — używa inspectSource + buildMatchKeys
    if (!inspectSource) return;
    const jumpKeys = buildMatchKeys(inspectSource, highlightScope);
    const total = jumpKeys.length;
    if (total === 0) return;
    const idx = ((targetIdx % total) + total) % total;
    setInspectJumpIndex((prev) => {
      const newDirection: "forward" | "backward" = idx >= (prev % total) ? "forward" : "backward";
      setLastJumpDirection(newDirection);
      const key = jumpKeys[idx];
      const el = document.querySelector<HTMLElement>(`[data-retry-row-key="${CSS.escape(key)}"]`);
      if (el) {
        scrollRowIntoView(el, true);
        pulseRow(el, { label: { ordinal: idx + 1, total } });
      }
      // Persist tak samo jak performJumpToMatch — kolejny J pójdzie do idx+1.
      const nextIndex = (idx + 1) % total;
      const memoryKey = `${inspectSource.ip}::${inspectSource.ua}::${highlightScope}`;
      jumpStateMemoryRef.current.set(memoryKey, { index: nextIndex, direction: newDirection });
      return nextIndex;
    });
};


  // Skróty klawiszowe w modalu inspekcji:
  // - Ctrl/Cmd+K  → "Pokaż w tabeli" (zamyka modal i scrolluje do wiersza)
  // - Enter       → "Pokaż w tabeli" (gdy fokus nie jest w polu tekstowym)
  // - ↓ / J       → następne dopasowanie (skok bez zamykania modala)
  // - ↑ / K       → poprzednie dopasowanie (skok bez zamykania modala)
  // Strzałki/J/K działają tylko gdy fokus NIE jest w polu tekstowym, żeby nie kolidować
  // z nawigacją kursorem w inpucie wyszukiwania.
  useEffect(() => {
    if (!inspectSource) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      const isPlainEnter = e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !inEditable;
      if (isCmdK || isPlainEnter) {
        e.preventDefault();
        revealRowInTable(inspectSource.ip, inspectSource.ua);
        return;
      }
      if (inEditable) return;
      // Jeśli fokus jest wewnątrz listy "Podgląd dopasowań", pozwól lokalnemu handlerowi
      // (roving tabindex) przejąć ↑/↓ — globalny skok nie powinien interferować z nawigacją
      // po elementach listy. Enter na buttonie listy = natywny click = skok do tego wiersza.
      if (target?.closest('[data-list-nav="true"]')) return;
      const isNext = e.key === "ArrowDown" || e.key.toLowerCase() === "j";
      const isPrev = e.key === "ArrowUp" || e.key.toLowerCase() === "k";
      if (isNext || isPrev) {
        // Tylko gdy są dopasowania do skakania (jumpKeys.length > 1) — sprawdzamy lazy
        // wewnątrz performJumpToMatch i tam też no-op.
        e.preventDefault();
        performJumpToMatch(isNext ? 1 : -1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // revealRowInTable / performJumpToMatch są stabilne w obrębie renderu —
    // zależymy tylko od inspectSource + highlightScope (drugi użyty w buildMatchKeys).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectSource, highlightScope]);

  useEffect(() => {
    let isMounted = true;
    const apply = (s: Session | null) => {
      if (!isMounted) return;
      setSession(s);
      setAuthLoading(false);
      if (!s) navigate("/admin/login", { replace: true });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    supabase.auth.getSession().then(({ data: { session: s } }) => apply(s));
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, [navigate]);

  const enabled = !authLoading && !!session && !adminLoading && isAdmin;

  const { data: abuseIps = [], isLoading: abuseLoading, refetch: refetchAbuse, dataUpdatedAt: abuseUpdated } = useQuery({
    queryKey: ["admin-abuse-ips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recent_token_abuse_ips" as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as AbuseRow[];
    },
    enabled,
    refetchInterval: 30_000,
  });

  const { data: recentFailures = [], isLoading: failuresLoading, refetch: refetchFailures } = useQuery({
    queryKey: ["admin-token-failures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_validation_failures" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as FailureRow[];
    },
    enabled,
    refetchInterval: 30_000,
  });

  const { data: rateLimitedIps = [], isLoading: rateLimitedLoading, refetch: refetchRateLimited, dataUpdatedAt: rateLimitedUpdated } = useQuery({
    queryKey: ["admin-rate-limited-ips"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_rate_limited_ips" as never, { p_limit: 10 } as never);
      if (error) throw error;
      return (data ?? []) as unknown as RateLimitedIp[];
    },
    enabled,
    refetchInterval: 30_000,
  });

  // 15-minutowy licznik odrzuceń webhooka on-booking-created.
  // Liczymy wpisy reason=rate_limited z ostatnich 15 min — to bezpośredni
  // sygnał, że ktoś (lub pętla DB-webhook) bombarduje endpoint.
  const { data: bookingWebhookDenied = 0, dataUpdatedAt: webhookUpdated } = useQuery({
    queryKey: ["admin-booking-webhook-denied-15m"],
    queryFn: async () => {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("token_validation_failures" as never)
        .select("id", { count: "exact", head: true })
        .eq("endpoint", "on-booking-created")
        .eq("reason", "rate_limited")
        .gte("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
    enabled,
    refetchInterval: 30_000,
  });

  // Retry webhooka DB → 429 dla on-booking-created.
  // Sygnał = wpisy reason='rate_limited' z UA "Deno/*" (Supabase webhook
  // delivery używa Deno fetch). Każdy taki wpis to próba ponowienia, którą
  // Supabase wykonuje z exponential backoff. Pokazujemy 3 okna (1h/6h/24h)
  // + breakdown per IP/UA, żeby od razu widzieć czy to jednorazowy spike,
  // czy stały szum (sygnał do podniesienia limitu lub zbadania pętli).
  type WebhookRetryRow = {
    id: string;
    ip: string | null;
    user_agent: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  };
  const { data: webhookRetries = [], isLoading: retriesLoading, dataUpdatedAt: retriesUpdated } = useQuery({
    queryKey: ["admin-booking-webhook-retries-24h"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("token_validation_failures" as never)
        .select("id, ip, user_agent, metadata, created_at")
        .eq("endpoint", "on-booking-created")
        .eq("reason", "rate_limited")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as WebhookRetryRow[];
    },
    enabled,
    refetchInterval: 60_000,
  });

  const webhookRetryStats = useMemo(() => {
    const now = Date.now();
    const buckets = { last1h: 0, last6h: 0, last24h: webhookRetries.length };
    const perSource = new Map<string, { ip: string; ua: string; count: number; last: string; maxRetryAfter: number }>();
    const perIp = new Map<string, number>();
    let denoOnly = 0;
    let denoLast1h = 0;
    // Statystyki retry-after z metadanych. Liczymy tylko wpisy z dodatnią
    // wartością — 0/null oznacza brak retry_after w odpowiedzi (np. fail-open
    // lub stary log bez metadanych).
    let retryAfterSum = 0;
    let retryAfterMax = 0;
    let retryAfterCount = 0;
    for (const r of webhookRetries) {
      const ageMs = now - new Date(r.created_at).getTime();
      const ua = r.user_agent ?? "—";
      const isDeno = /^Deno\//i.test(ua);
      if (ageMs <= 60 * 60 * 1000) {
        buckets.last1h += 1;
        if (isDeno) denoLast1h += 1;
      }
      if (ageMs <= 6 * 60 * 60 * 1000) buckets.last6h += 1;
      if (isDeno) denoOnly += 1;
      const ipKey = r.ip ?? "—";
      perIp.set(ipKey, (perIp.get(ipKey) ?? 0) + 1);
      const key = `${ipKey}::${ua}`;
      const retryAfter = typeof r.metadata?.retryAfterSec === "number" ? (r.metadata.retryAfterSec as number) : 0;
      if (retryAfter > 0) {
        retryAfterSum += retryAfter;
        retryAfterCount += 1;
        if (retryAfter > retryAfterMax) retryAfterMax = retryAfter;
      }
      const existing = perSource.get(key);
      if (existing) {
        existing.count += 1;
        if (retryAfter > existing.maxRetryAfter) existing.maxRetryAfter = retryAfter;
      } else {
        perSource.set(key, { ip: ipKey, ua, count: 1, last: r.created_at, maxRetryAfter: retryAfter });
      }
    }
    const sources = Array.from(perSource.values()).sort((a, b) => b.count - a.count);
    // Top IP po liczbie retry'ów (niezależnie od UA — łapie też przypadek,
    // gdy ten sam IP używa różnych UA).
    let topIp: string | null = null;
    let topIpCount = 0;
    for (const [ip, count] of perIp.entries()) {
      if (count > topIpCount) {
        topIp = ip;
        topIpCount = count;
      }
    }
    const topIpShare = buckets.last24h > 0 ? (topIpCount / buckets.last24h) * 100 : 0;
    const uniqueIps = perIp.size;
    const avgRetryAfter = retryAfterCount > 0 ? retryAfterSum / retryAfterCount : 0;
    return {
      ...buckets,
      denoOnly,
      denoLast1h,
      sources,
      topIp,
      topIpCount,
      topIpShare,
      uniqueIps,
      avgRetryAfter,
      maxRetryAfter: retryAfterMax,
      retryAfterSampleCount: retryAfterCount,
    };
  }, [webhookRetries]);

  // Filtrowanie tabeli retry'ów po IP / UA + przełącznik "tylko Deno/*".
  // Filtrujemy po stronie klienta — w 24h oknie mamy max ~1000 wpisów, a po
  // agregacji (perSource) zwykle <50 wierszy, więc nie ma sensu round-tripować
  // do bazy. Limit prezentacji: 50 wierszy (nawet bez filtra).
  const filteredRetrySources = useMemo(() => {
    const ipQ = retryFilterIp.trim().toLowerCase();
    const uaQ = retryFilterUa.trim().toLowerCase();
    return webhookRetryStats.sources
      .filter((s) => {
        if (retryDenoOnly && !/^Deno\//i.test(s.ua)) return false;
        if (ipQ && !s.ip.toLowerCase().includes(ipQ)) return false;
        if (uaQ && !s.ua.toLowerCase().includes(uaQ)) return false;
        return true;
      })
      .slice(0, 50);
  }, [webhookRetryStats.sources, retryFilterIp, retryFilterUa, retryDenoOnly]);

  const retryFiltersActive = retryDenoOnly || retryFilterIp.trim() !== "" || retryFilterUa.trim() !== "";

  // Pozycja inspectSource w pełnej (posortowanej) liście źródeł — używana do podpisu
  // "1 z N" w nagłówku modala. -1 oznacza brak dopasowania (np. dane się odświeżyły
  // i kombinacja IP+UA wypadła z 24h okna).
  const inspectSourceIndex = useMemo(() => {
    if (!inspectSource) return -1;
    return webhookRetryStats.sources.findIndex(
      (s) => s.ip === inspectSource.ip && s.ua === inspectSource.ua,
    );
  }, [inspectSource, webhookRetryStats.sources]);

  // Limit pokrewnych wierszy podświetlanych w tabeli (oprócz exact matchu) — chroni
  // przed tym, że dla popularnego UA (np. Deno/*) cała tabela by się "zalała" highlightem.
  const MAX_RELATED_HIGHLIGHTS = 50;

  // Liczba pokrewnych wierszy (bez exact) pasujących do bieżącego inspectSource
  // wg aktualnie wybranego scope. Używane w modalu (komunikat + ostrzeżenie o limicie)
  // i w toaście po reveal.
  const relatedMatchCount = useMemo(() => {
    if (!inspectSource) return 0;
    if (highlightScope === "exact") return 0;
    return webhookRetryStats.sources.filter((s) => {
      const isExact = s.ip === inspectSource.ip && s.ua === inspectSource.ua;
      if (isExact) return false;
      if (highlightScope === "same-ip") return s.ip === inspectSource.ip;
      if (highlightScope === "same-ua") return s.ua === inspectSource.ua;
      return false;
    }).length;
  }, [inspectSource, highlightScope, webhookRetryStats.sources]);

  // Set kluczy `ip::ua` pokrewnych wierszy do podświetlenia (bez exact). Liczony na
  // podstawie `highlightedSource` (NIE inspectSource — modal może być już zamknięty),
  // ograniczony do MAX_RELATED_HIGHLIGHTS żeby nie zalać UI dla popularnych UA.
  // Wybieramy pierwsze N w naturalnej kolejności webhookRetryStats.sources (sort desc by count).
  const relatedHighlightKeys = useMemo(() => {
    const set = new Set<string>();
    if (!highlightedSource || highlightScope === "exact") return set;
    let added = 0;
    for (const s of webhookRetryStats.sources) {
      if (added >= MAX_RELATED_HIGHLIGHTS) break;
      const isExact = s.ip === highlightedSource.ip && s.ua === highlightedSource.ua;
      if (isExact) continue;
      const matches =
        highlightScope === "same-ip"
          ? s.ip === highlightedSource.ip
          : s.ua === highlightedSource.ua;
      if (matches) {
        set.add(`${s.ip}::${s.ua}`);
        added++;
      }
    }
    return set;
  }, [highlightedSource, highlightScope, webhookRetryStats.sources]);

  // Buduje pełną listę kluczy ip::ua do nawigacji "Pokaż kolejne dopasowania":
  // [0] = exact (wiersz źródłowy z modala), [1..N] = related (max MAX_RELATED_HIGHLIGHTS),
  // w naturalnej kolejności sortowania źródeł (desc by count).
  const buildMatchKeys = (
    source: { ip: string; ua: string },
    scope: HighlightScope,
  ): string[] => {
    const keys = [`${source.ip}::${source.ua}`];
    if (scope === "exact") return keys;
    let added = 0;
    for (const s of webhookRetryStats.sources) {
      if (added >= MAX_RELATED_HIGHLIGHTS) break;
      const isExact = s.ip === source.ip && s.ua === source.ua;
      if (isExact) continue;
      const matches = scope === "same-ip" ? s.ip === source.ip : s.ua === source.ua;
      if (matches) {
        keys.push(`${s.ip}::${s.ua}`);
        added++;
      }
    }
    return keys;
  };

  // Rekordy filtrowane do modala inspekcji (wybrane IP + UA, max 50 ostatnich).
  const inspectRecords = useMemo(() => {
    if (!inspectSource) return [];
    return webhookRetries
      .filter((r) => (r.ip ?? "—") === inspectSource.ip && (r.user_agent ?? "—") === inspectSource.ua)
      .slice(0, 50);
  }, [inspectSource, webhookRetries]);

  // Wynik wyszukiwania w modalu — substring w stringified metadata (case-insensitive),
  // z sortowaniem po created_at (desc=najnowsze, asc=najstarsze).
  const inspectFilteredRecords = useMemo(() => {
    const q = inspectQuery.trim().toLowerCase();
    const filtered = q
      ? inspectRecords.filter((r) => {
          try {
            return JSON.stringify(r.metadata ?? {}).toLowerCase().includes(q);
          } catch {
            return false;
          }
        })
      : inspectRecords;
    // inspectRecords już przychodzi w kolejności DESC z query, więc dla "desc" zostawiamy,
    // a dla "asc" tworzymy odwróconą kopię (nie mutujemy oryginału).
    return inspectSort === "asc" ? [...filtered].reverse() : filtered;
  }, [inspectRecords, inspectQuery, inspectSort]);

  // Trend retry'ów per godzina, ostatnie 24h. Dwie serie: deno (wewnętrzny
  // webhook DB) i other (ruch zewnętrzny / boty). Każdy bucket = pełna
  // godzina kalendarzowa (lokalna), wstecz od "teraz". Dzięki stałej liczbie
  // 24 punktów wykres jest stabilny niezależnie od wolumenu danych.
  const retryTrend = useMemo(() => {
    const now = new Date();
    const hourMs = 60 * 60 * 1000;
    // Bucket startuje na pełnej godzinie. Tworzymy 24 backety: [now-23h, …, now].
    const startHour = new Date(now);
    startHour.setMinutes(0, 0, 0);
    const buckets: { ts: number; label: string; deno: number; other: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const ts = startHour.getTime() - i * hourMs;
      const d = new Date(ts);
      buckets.push({
        ts,
        label: `${String(d.getHours()).padStart(2, "0")}:00`,
        deno: 0,
        other: 0,
      });
    }
    for (const r of webhookRetries) {
      const t = new Date(r.created_at).getTime();
      const idx = Math.floor((t - buckets[0].ts) / hourMs);
      if (idx < 0 || idx >= buckets.length) continue;
      const ua = r.user_agent ?? "";
      if (/^Deno\//i.test(ua)) buckets[idx].deno += 1;
      else buckets[idx].other += 1;
    }
    return buckets;
  }, [webhookRetries]);

  const retryTrendHasData = useMemo(
    () => retryTrend.some((b) => b.deno > 0 || b.other > 0),
    [retryTrend],
  );

  // Toast tylko przy WEJŚCIU w stan przekroczenia (nie przy każdym refetchu).
  const wasOverThreshold = useMemo(() => ({ value: false }), []);
  useEffect(() => {
    if (bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD && !wasOverThreshold.value) {
      wasOverThreshold.value = true;
      toast.error("Webhook on-booking-created: nadużycie!", {
        description: `${bookingWebhookDenied} odrzuceń w ostatnich 15 min (próg: ${BOOKING_WEBHOOK_DENIED_THRESHOLD}).`,
        duration: 10_000,
      });
    } else if (bookingWebhookDenied < BOOKING_WEBHOOK_DENIED_THRESHOLD) {
      wasOverThreshold.value = false;
    }
  }, [bookingWebhookDenied, wasOverThreshold]);

  // Toast dla retry'ów Deno/* (wewnętrzny webhook DB) w 1h — edge-triggered.
  const wasOverDenoRetryThreshold = useMemo(() => ({ value: false }), []);
  useEffect(() => {
    if (
      webhookRetryStats.denoLast1h >= BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD &&
      !wasOverDenoRetryThreshold.value
    ) {
      wasOverDenoRetryThreshold.value = true;
      toast.error("Retry webhooka DB: pętla lub spike!", {
        description: `${webhookRetryStats.denoLast1h} retry'ów Deno/* w ostatniej 1h dla on-booking-created (próg: ${BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD}). Sprawdź konfigurację webhooka DB i logi.`,
        duration: 12_000,
      });
    } else if (webhookRetryStats.denoLast1h < BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD) {
      wasOverDenoRetryThreshold.value = false;
    }
  }, [webhookRetryStats.denoLast1h, wasOverDenoRetryThreshold]);

  const stats = useMemo(() => {
    const total = recentFailures.length;
    const last24h = recentFailures.filter(
      (f) => new Date(f.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
    ).length;
    const uniqueIps = new Set(recentFailures.map((f) => f.ip).filter(Boolean)).size;
    return { total, last24h, uniqueIps };
  }, [recentFailures]);

  if (authLoading || adminLoading) {
    return <div className="container mx-auto p-8 text-muted-foreground">Ładowanie…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8 max-w-md">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Brak uprawnień</AlertTitle>
          <AlertDescription>Ta strona wymaga roli administratora.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title="System Health — Admin"
        description="Monitoring podejrzanych prób użycia tokenów rezerwacji."
        path="/admin/system-health"
      />
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
            </Button>
            <h1 className="text-2xl md:text-3xl font-display flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" /> System Health
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchAbuse(); refetchFailures(); refetchRateLimited(); }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Odśwież
          </Button>
        </div>

        {/* BOOKING WEBHOOK ALERT — przyciągająca uwagę kafelka u góry, pulsująca przy przekroczeniu progu. */}
        <Card
          className={
            bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD
              ? "mb-8 border-destructive ring-2 ring-destructive/40 animate-pulse"
              : "mb-8 border-border"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook
                className={
                  bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD
                    ? "h-5 w-5 text-destructive"
                    : "h-5 w-5 text-primary"
                }
              />
              Webhook on-booking-created — odrzucenia 15 min
              {bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD && (
                <Badge variant="destructive" className="ml-2">ALERT</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Liczba wpisów <code className="text-xs">reason=rate_limited</code> dla endpointu{" "}
              <code className="text-xs">on-booking-created</code> z ostatnich 15 minut. Próg alarmu:{" "}
              <strong>{BOOKING_WEBHOOK_DENIED_THRESHOLD}</strong>. Auto-refresh 30s. Aktualizacja:{" "}
              {webhookUpdated ? formatDistanceToNow(new Date(webhookUpdated), { addSuffix: true, locale: pl }) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span
                className={
                  bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD
                    ? "text-5xl font-bold text-destructive"
                    : "text-5xl font-bold text-foreground"
                }
              >
                {bookingWebhookDenied}
              </span>
              <span className="text-muted-foreground text-sm">odrzuceń / 15 min</span>
            </div>
            {bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD ? (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Możliwa pętla webhooków lub flood</AlertTitle>
                <AlertDescription>
                  Próg <strong>{BOOKING_WEBHOOK_DENIED_THRESHOLD}/15min</strong> przekroczony. Sprawdź:
                  <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                    <li>Logi <code>on-booking-created</code> — czy lecą prawdziwe insertowane bookingi?</li>
                    <li>Tabela <code>bookings</code> — czy nie ma masowego importu?</li>
                    <li>Konfiguracja webhooka DB — czy nie jest zapętlona (UPDATE → INSERT)?</li>
                  </ol>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">
                ✓ W normie — webhook DB zazwyczaj generuje 1 request na booking.
              </p>
            )}
          </CardContent>
        </Card>

        {/* BOOKING WEBHOOK RETRIES — historia retry'ów Supabase webhooka DB.
            Supabase delivery retry-uje 429 z exponential backoff; każdy taki
            retry ląduje tu jako reason='rate_limited' z UA "Deno/...". */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Retry webhooka DB → 429 (on-booking-created)
            </CardTitle>
            <CardDescription>
              Liczba odrzuceń webhooka Supabase (UA <code className="text-xs">Deno/*</code>) w oknach 1h / 6h / 24h.
              Każdy wpis to próba ponowienia, którą Supabase wykonuje z exponential backoff po otrzymaniu HTTP 429.
              Ostatnia aktualizacja:{" "}
              {retriesUpdated ? formatDistanceToNow(new Date(retriesUpdated), { addSuffix: true, locale: pl }) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {retriesLoading ? (
              <p className="text-muted-foreground">Ładowanie…</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div
                    className={
                      webhookRetryStats.denoLast1h >= BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD
                        ? "rounded-lg border-2 border-destructive p-3 ring-2 ring-destructive/30 animate-pulse"
                        : "rounded-lg border border-border p-3"
                    }
                  >
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Ostatnia 1h
                      {webhookRetryStats.denoLast1h >= BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD && (
                        <Badge variant="destructive" className="ml-1 text-[10px] py-0 h-4">ALERT</Badge>
                      )}
                    </p>
                    <p
                      className={
                        webhookRetryStats.denoLast1h >= BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD
                          ? "text-2xl font-bold text-destructive"
                          : "text-2xl font-bold"
                      }
                    >
                      {webhookRetryStats.last1h}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Deno/*: <strong>{webhookRetryStats.denoLast1h}</strong> / próg {BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Ostatnie 6h</p>
                    <p className="text-2xl font-bold">{webhookRetryStats.last6h}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Ostatnie 24h</p>
                    <p className="text-2xl font-bold">{webhookRetryStats.last24h}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Z czego z UA <code>Deno/*</code> (wewnętrzny webhook):{" "}
                  <Badge variant="secondary">{webhookRetryStats.denoOnly} / {webhookRetryStats.last24h}</Badge>
                  {" "}— pozostałe to ruch zewnętrzny / boty.
                </p>

                {/* Karta podsumowania: koncentracja źródeł + retry-after.
                    Wysoki topIpShare (>70%) = pojedynczy abuser / pętla.
                    Wysoki avgRetryAfter = klient odbija się o pełne okno
                    rate-limitu (60s), czyli realnie czeka maksymalnie długo. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div
                    className={
                      webhookRetryStats.topIpShare >= 70 && webhookRetryStats.last24h > 0
                        ? "rounded-lg border-2 border-destructive/60 p-4 bg-destructive/5"
                        : "rounded-lg border border-border p-4 bg-card/40"
                    }
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Ban
                        className={
                          webhookRetryStats.topIpShare >= 70 && webhookRetryStats.last24h > 0
                            ? "h-4 w-4 text-destructive"
                            : "h-4 w-4 text-muted-foreground"
                        }
                      />
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Koncentracja źródeł
                      </p>
                    </div>
                    {webhookRetryStats.last24h === 0 ? (
                      <p className="text-sm text-muted-foreground">Brak danych w 24h.</p>
                    ) : (
                      <>
                        <p
                          className={
                            webhookRetryStats.topIpShare >= 70
                              ? "text-3xl font-bold text-destructive"
                              : "text-3xl font-bold text-foreground"
                          }
                        >
                          {webhookRetryStats.topIpShare.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          retry'ów z jednego IP{" "}
                          <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">
                            {webhookRetryStats.topIp ?? "—"}
                          </code>{" "}
                          (<strong>{webhookRetryStats.topIpCount}</strong> / {webhookRetryStats.last24h})
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Unikalne IP w 24h: <strong>{webhookRetryStats.uniqueIps}</strong>
                          {webhookRetryStats.topIpShare >= 70 && (
                            <span className="text-destructive ml-2">⚠ Wysoka koncentracja — sprawdź źródło.</span>
                          )}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="rounded-lg border border-border p-4 bg-card/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Retry-after (z metadanych)
                      </p>
                    </div>
                    {webhookRetryStats.retryAfterSampleCount === 0 ? (
                      <p className="text-sm text-muted-foreground">Brak metadanych retry-after.</p>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-foreground">
                          {webhookRetryStats.avgRetryAfter.toFixed(1)}
                          <span className="text-sm font-normal text-muted-foreground ml-1">s średnio</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Maksymalny: <strong>{webhookRetryStats.maxRetryAfter}s</strong>{" "}
                          (próbka: {webhookRetryStats.retryAfterSampleCount} / {webhookRetryStats.last24h})
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {webhookRetryStats.avgRetryAfter >= 45 ? (
                            <span className="text-destructive">
                              ⚠ Klienci czekają prawie pełne okno (60s) — limit jest stale wysycony.
                            </span>
                          ) : webhookRetryStats.avgRetryAfter >= 20 ? (
                            <>Średnie obciążenie — okno rate-limitu często aktywne.</>
                          ) : (
                            <>Niski czas czekania — pojedyncze odrzucenia.</>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Trend retry'ów per godzina, ostatnie 24h.
                    Stacked area: Deno/* (wewnętrzny webhook) vs pozostałe. */}
                <div className="rounded-lg border border-border p-3 mb-4 bg-card/40">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Trend retry'ów (24h, per godzina)
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-destructive" />
                        Deno/* (webhook DB)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
                        Pozostałe
                      </span>
                    </div>
                  </div>
                  {retryTrendHasData ? (
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={retryTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="retryDeno" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.55} />
                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="retryOther" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          interval={3}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                          width={28}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                          formatter={(v: number, name) => [v, name === "deno" ? "Deno/*" : "Pozostałe"]}
                          labelFormatter={(l) => `Godz. ${l}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="deno"
                          stackId="1"
                          stroke="hsl(var(--destructive))"
                          fill="url(#retryDeno)"
                          strokeWidth={1.5}
                        />
                        <Area
                          type="monotone"
                          dataKey="other"
                          stackId="1"
                          stroke="hsl(var(--primary))"
                          fill="url(#retryOther)"
                          strokeWidth={1.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[140px] text-xs text-muted-foreground">
                      ✓ Brak retry'ów w ostatnich 24h — wykres pusty.
                    </div>
                  )}
                </div>

                {webhookRetryStats.sources.length === 0 ? (
                  <p className="text-muted-foreground py-2 text-sm">
                    ✓ Brak retry'ów w ostatnich 24h.
                  </p>
                ) : (
                  <>
                    {/* Filtry tabeli retry'ów */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 p-3 rounded-lg border border-border bg-muted/30">
                      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Filtr IP (substring)…"
                        value={retryFilterIp}
                        onChange={(e) => setRetryFilterIp(e.target.value)}
                        className="h-8 w-full sm:w-44 font-mono text-xs"
                      />
                      <Input
                        placeholder="Filtr User-Agent (substring)…"
                        value={retryFilterUa}
                        onChange={(e) => setRetryFilterUa(e.target.value)}
                        className="h-8 w-full sm:w-64 font-mono text-xs"
                      />
                      <Toggle
                        size="sm"
                        pressed={retryDenoOnly}
                        onPressedChange={setRetryDenoOnly}
                        aria-label="Pokaż tylko webhook DB (Deno/*)"
                        className="h-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Webhook className="h-3.5 w-3.5 mr-1.5" />
                        Tylko webhook DB (Deno/*)
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={autoRevealEnabled}
                        onPressedChange={(v) => {
                          setAutoRevealEnabled(v);
                          toast.success(
                            v
                              ? "Auto-przewijanie i podświetlenie włączone"
                              : "Auto-przewijanie i podświetlenie wyłączone",
                          );
                        }}
                        aria-label="Auto-przewijanie i podświetlenie wiersza po zamknięciu modala"
                        title={
                          autoRevealEnabled
                            ? "Po zamknięciu modala wiersz zostanie automatycznie przewinięty i podświetlony. Kliknij, aby wyłączyć."
                            : "Auto-reveal wyłączony — zamknięcie modala nie będzie przewijać ani podświetlać wiersza. Kliknij, aby włączyć."
                        }
                        className="h-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Locate className="h-3.5 w-3.5 mr-1.5" />
                        Auto-reveal {autoRevealEnabled ? "ON" : "OFF"}
                      </Toggle>
                      {/* Cykliczny przycisk zakresu podświetlenia: exact → same-ip → same-ua → exact…
                          Disabled gdy auto-reveal off, bo i tak nic nie podświetlamy. */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!autoRevealEnabled}
                        onClick={() => {
                          const next: HighlightScope =
                            highlightScope === "exact"
                              ? "same-ip"
                              : highlightScope === "same-ip"
                                ? "same-ua"
                                : "exact";
                          setHighlightScope(next);
                          toast.success(
                            next === "exact"
                              ? "Podświetlam tylko jeden — dokładny match IP+UA"
                              : next === "same-ip"
                                ? "Podświetlam wszystkie wiersze z tym samym IP"
                                : "Podświetlam wszystkie wiersze z tym samym User-Agent",
                          );
                        }}
                        aria-label="Zakres podświetlenia po reveal"
                        title={
                          highlightScope === "exact"
                            ? "Aktualnie: tylko exact match (1 wiersz). Kliknij, aby rozszerzyć na same-IP."
                            : highlightScope === "same-ip"
                              ? "Aktualnie: same-IP (wszystkie wiersze z tym samym IP). Kliknij, aby przełączyć na same-UA."
                              : "Aktualnie: same-UA (wszystkie wiersze z tym samym User-Agent). Kliknij, aby wrócić do exact."
                        }
                        className="h-8 gap-1.5"
                      >
                        <Locate className="h-3.5 w-3.5" />
                        Highlight:{" "}
                        {highlightScope === "exact"
                          ? "tylko exact"
                          : highlightScope === "same-ip"
                            ? "wszystkie z IP"
                            : "wszystkie z UA"}
                      </Button>
                      {/* Wysoki kontrast obrysu aktywnego wiersza — grubszy ring, mocniejsze
                          halo i dodatkowy outline w kolorze foreground (czytelne na jasnym
                          i ciemnym motywie). Wzmacnia także animacje pulse/afterglow przez
                          klasę `.jump-hc` (patrz index.css). */}
                      <Toggle
                        size="sm"
                        pressed={highContrastFocus}
                        onPressedChange={(v) => {
                          setHighContrastFocus(v);
                          toast.success(
                            v
                              ? "Wysoki kontrast obrysu włączony"
                              : "Wysoki kontrast obrysu wyłączony",
                          );
                        }}
                        aria-label="Wysoki kontrast obrysu aktywnego wiersza po skoku"
                        title={
                          highContrastFocus
                            ? "Wysoki kontrast: obrys aktywnego wiersza i animacja skoku są wzmocnione (grubszy ring + outline foreground). Kliknij, aby wrócić do trybu standardowego."
                            : "Standardowy obrys aktywnego wiersza. Kliknij, aby włączyć tryb wysokiego kontrastu (czytelniejszy focus na jasnych i ciemnych motywach)."
                        }
                        className="h-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        HC focus {highContrastFocus ? "ON" : "OFF"}
                      </Toggle>
                      {/* Popover „Styl focusu" — sliders dla afterglow duration, ring width
                          i glow intensity. Wartości persystowane w localStorage (focusPrefs),
                          aplikowane na żywo przez CSS vars w pulseRow + inline style w aktywnym
                          wierszu. Reset przywraca defaulty. */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            aria-label="Ustawienia stylu focusu po skoku"
                            title="Dostosuj czas afterglow, grubość ringa i intensywność glow. Preferencje są zapamiętywane."
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Styl focusu
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4 space-y-4" align="start">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="text-sm font-semibold">Styl focusu po skoku</div>
                              {/* Wskaźnik autosave — pojawia się tylko gdy zmiana jest w toku
                                  lub świeżo zapisana. „idle" = nic nie pokazujemy, żeby nie
                                  rozpraszać gdy admin tylko przegląda popover. */}
                              {saveStatus === "pending" && (
                                <span
                                  className="text-[10px] text-muted-foreground flex items-center gap-1"
                                  aria-live="polite"
                                  title="Autozapis: czekam na zatrzymanie suwaka (debounce 400ms)"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
                                  Zapisuję…
                                </span>
                              )}
                              {saveStatus === "saved" && (
                                <span
                                  className="text-[10px] text-primary flex items-center gap-1"
                                  aria-live="polite"
                                  title="Zapisano w localStorage tej przeglądarki"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                  Zapisano ✓
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => {
                                // Przywracamy defaults TYLKO dla aktualnie edytowanego wariantu —
                                // setEditingVariantPrefs (linia 593-596) zapisuje wyłącznie do
                                // `[editingVariant]`, więc pozostałe 2 sloty (np. light/hc gdy
                                // resetujemy dark) zostają nietknięte.
                                const defaults = getDefaultFocusPrefsByVariant();
                                const variantLabel =
                                  editingVariant === "hc"
                                    ? "High Contrast"
                                    : editingVariant === "light"
                                      ? "Light"
                                      : "Dark";
                                const d = defaults[editingVariant];
                                setEditingVariantPrefs(() => d);
                                toast.success(`Przywrócono domyślne (${variantLabel})`, {
                                  description: `Wariant ${variantLabel}: ring ${d.ringWidthPx}px · glow ${d.glowIntensity}% · afterglow ${d.afterglowMs}ms · pozostałe warianty bez zmian`,
                                });
                              }}
                              title={`Przywróć wartości domyślne tylko dla wariantu ${editingVariant} (pozostałe nietknięte)`}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Przywróć domyślne
                            </Button>
                          </div>

                          {/* Tabs wyboru wariantu motywu do edycji — Light / Dark / High Contrast.
                              Każdy variant ma osobny zestaw prefs (afterglow/ring/glow). Aktywny
                              variant (oznaczony kropką ●) jest wybierany automatycznie na podstawie
                              `useThemeVariant(highContrastFocus)` — admin może edytować INNY variant
                              („z góry"), żeby przygotować ustawienia zanim przełączy motyw. */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Edytuj wariant
                              </span>
                              {editingVariantOverride !== null && (
                                <button
                                  type="button"
                                  onClick={() => setEditingVariantOverride(null)}
                                  className="text-[10px] text-primary hover:underline"
                                  title="Wróć do edycji aktywnego wariantu"
                                >
                                  ← aktywny
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-1 rounded-md bg-muted/50 p-0.5">
                              {(["light", "dark", "hc"] as const).map((v) => {
                                const isEditing = editingVariant === v;
                                const isActive = activeThemeVariant === v;
                                const label = v === "hc" ? "High Contrast" : v === "light" ? "Light" : "Dark";
                                return (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => setEditingVariantOverride(v === activeThemeVariant ? null : v)}
                                    aria-pressed={isEditing}
                                    className={`relative h-7 rounded text-[11px] font-medium transition-colors ${
                                      isEditing
                                        ? "bg-background text-foreground shadow-sm ring-1 ring-primary/40"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                                    }`}
                                    title={
                                      isActive
                                        ? `${label} — aktywny teraz`
                                        : `${label} — edytuj „z góry" (zaaplikuje się po przełączeniu motywu)`
                                    }
                                  >
                                    {label}
                                    {isActive && (
                                      <span
                                        className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-primary"
                                        aria-label="Aktywny variant"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-muted-foreground/70 leading-snug">
                              Edytujesz: <span className="font-mono text-foreground">{editingVariant}</span>
                              {editingVariant !== activeThemeVariant && (
                                <> — zmiany pojawią się po przełączeniu motywu (aktualnie aktywny: <span className="font-mono">{activeThemeVariant}</span>).</>
                              )}
                            </p>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Preferencje zapisywane w przeglądarce — osobny zestaw dla light / dark / HC.
                          </p>

                          {/* Tryb testowy: cykliczny podgląd pulse→afterglow na 3 sztucznych
                              wierszach. Pozwala zobaczyć efekt zmiany sliderów BEZ scrollowania
                              do tabeli. Toggle Play/Pause — domyślnie OFF (nie zaśmieca popovera). */}
                          <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium">Tryb testowy</span>
                                {focusDemoActive && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-mono uppercase tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    Live
                                  </span>
                                )}
                              </div>
                              <Button
                                variant={focusDemoActive ? "secondary" : "outline"}
                                size="sm"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => setFocusDemoActive((v) => !v)}
                                aria-pressed={focusDemoActive}
                                title={
                                  focusDemoActive
                                    ? "Zatrzymaj cykliczny podgląd"
                                    : "Uruchom cykliczny podgląd efektu na sztucznych wierszach"
                                }
                              >
                                {focusDemoActive ? (
                                  <>
                                    <Pause className="h-3 w-3" />
                                    Stop
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3" />
                                    Start
                                  </>
                                )}
                              </Button>
                            </div>
                            <FocusDemo
                              prefs={focusPrefsByVariant[editingVariant]}
                              highContrast={editingVariant === "hc"}
                              active={focusDemoActive}
                            />

                            {!focusDemoActive && (
                              <p className="text-[10px] text-muted-foreground/70 leading-snug">
                                Po włączeniu wiersze cyklicznie zagrają pulse → afterglow z aktualnymi
                                ustawieniami. Zmiana slidera zastosuje się od razu w kolejnym cyklu.
                              </p>
                            )}
                          </div>


                          {(() => {
                            // Slider edytuje WYBRANY w tabs variant (editingVariant), nie zawsze aktywny.
                            // Dzięki temu admin może ustawić styl „z góry" dla dark/HC bez przełączania motywu.
                            const editedPrefs = focusPrefsByVariant[editingVariant];
                            return (
                              <>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="afterglow-slider" className="text-xs font-medium">
                                      Czas afterglow
                                    </Label>
                                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                                      {(editedPrefs.afterglowMs / 1000).toFixed(1)}s
                                    </span>
                                  </div>
                                  <Slider
                                    id="afterglow-slider"
                                    min={800}
                                    max={6000}
                                    step={100}
                                    value={[editedPrefs.afterglowMs]}
                                    onValueChange={([v]) =>
                                      setEditingVariantPrefs((p) => ({ ...p, afterglowMs: v }))
                                    }
                                    aria-label={`Czas trwania afterglow w milisekundach (variant ${editingVariant})`}
                                  />
                                  <div className="flex justify-between text-[10px] text-muted-foreground/70 font-mono">
                                    <span>0.8s</span>
                                    <span>6.0s</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="ring-slider" className="text-xs font-medium">
                                      Grubość ringa
                                    </Label>
                                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                                      {editedPrefs.ringWidthPx}px
                                      {editingVariant === "hc" && (
                                        <span className="ml-1 text-primary">
                                          (efektywnie: {editedPrefs.ringWidthPx + 2}px)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <Slider
                                    id="ring-slider"
                                    min={1}
                                    max={6}
                                    step={1}
                                    value={[editedPrefs.ringWidthPx]}
                                    onValueChange={([v]) =>
                                      setEditingVariantPrefs((p) => ({ ...p, ringWidthPx: v }))
                                    }
                                    aria-label={`Grubość ringa aktywnego wiersza w pikselach (variant ${editingVariant})`}
                                  />
                                  <div className="flex justify-between text-[10px] text-muted-foreground/70 font-mono">
                                    <span>1px</span>
                                    <span>6px</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="glow-slider" className="text-xs font-medium">
                                      Intensywność glow
                                    </Label>
                                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                                      {editedPrefs.glowIntensity}%
                                    </span>
                                  </div>
                                  <Slider
                                    id="glow-slider"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={[editedPrefs.glowIntensity]}
                                    onValueChange={([v]) =>
                                      setEditingVariantPrefs((p) => ({ ...p, glowIntensity: v }))
                                    }
                                    aria-label={`Intensywność halo / shadow glow (variant ${editingVariant})`}
                                  />
                                  <div className="flex justify-between text-[10px] text-muted-foreground/70 font-mono">
                                    <span>0% (off)</span>
                                    <span>100% (max)</span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}

                          {/* Widok „Różnice" — pokazuje co admin zmienił w wybranym wariancie
                              względem defaultów PRZED zapisem (zapis i tak idzie do localStorage
                              w useEffect, ale wizualnie ta lista uświadamia różnicę zanim
                              kliknie „Kopiuj link"/„Pobierz plik"). Pokazujemy TYLKO pola które
                              różnią się — żeby było widać "diff", a nie pełną listę. */}
                          {(() => {
                            const defaults = getDefaultFocusPrefsByVariant()[editingVariant];
                            const current = focusPrefsByVariant[editingVariant];
                            const variantLabel =
                              editingVariant === "hc"
                                ? "High Contrast"
                                : editingVariant === "light"
                                  ? "Light"
                                  : "Dark";
                            // Lista pól + formattery wartości (s vs px vs %).
                            const fields: Array<{
                              key: keyof FocusPrefs;
                              label: string;
                              format: (v: number) => string;
                            }> = [
                              { key: "ringWidthPx", label: "Ring", format: (v) => `${v}px` },
                              { key: "glowIntensity", label: "Glow", format: (v) => `${v}%` },
                              {
                                key: "afterglowMs",
                                label: "Afterglow",
                                format: (v) => `${(v / 1000).toFixed(1)}s`,
                              },
                            ];
                            const diffs = fields.filter((f) => current[f.key] !== defaults[f.key]);
                            return (
                              <div className="pt-3 border-t border-border space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold text-foreground">
                                    Różnice ({variantLabel})
                                  </div>
                                  <span className="text-[10px] text-muted-foreground/70 font-mono">
                                    {diffs.length === 0
                                      ? "brak zmian"
                                      : `${diffs.length}/${fields.length} zmienione`}
                                  </span>
                                </div>
                                {diffs.length === 0 ? (
                                  <p className="text-[11px] text-muted-foreground italic leading-snug">
                                    Wszystkie wartości równe domyślnym dla wariantu{" "}
                                    <span className="font-mono not-italic">{variantLabel}</span>.
                                  </p>
                                ) : (
                                  <ul className="space-y-1">
                                    {diffs.map((f) => {
                                      const before = defaults[f.key];
                                      const after = current[f.key];
                                      return (
                                        <li
                                          key={f.key}
                                          className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
                                        >
                                          <span className="text-muted-foreground">{f.label}</span>
                                          <span className="flex items-center gap-1.5">
                                            <span className="text-muted-foreground/70 line-through">
                                              {f.format(before)}
                                            </span>
                                            <span className="text-muted-foreground/50">→</span>
                                            <span className="text-primary font-semibold">
                                              {f.format(after)}
                                            </span>
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            );
                          })()}

                          {/* Sekcja eksport / import — przenoszenie prefs między urządzeniami.
                              3 ścieżki: (1) plik .json (backup/email), (2) shareable URL z #focus-prefs=base64url
                              do clipboardu (najszybsze), (3) import z .json (np. od kolegi). */}
                          <div className="pt-3 border-t border-border space-y-2">
                            <div className="text-xs font-semibold text-foreground">
                              Przenieś między urządzeniami
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1"
                                onClick={handleExportFocusPrefs}
                                title="Pobierz preferencje jako plik .json (backup, e-mail)"
                              >
                                <FileDown className="h-3 w-3" />
                                Plik
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1"
                                onClick={handleCopyFocusPrefsLink}
                                title="Skopiuj link z preferencjami do clipboardu — wklej na innym urządzeniu"
                              >
                                <Link2 className="h-3 w-3" />
                                Link
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1"
                                onClick={() => importFileInputRef.current?.click()}
                                title="Wczytaj preferencje z pliku .json"
                              >
                                <FileUp className="h-3 w-3" />
                                Import
                              </Button>
                            </div>
                            {/* Drugi rząd: link tylko dla aktualnie edytowanego wariantu.
                                Przydatne gdy admin chce udostępnić tylko jeden styl (np. HC dla a11y),
                                bez nadpisywania pozostałych 2 wariantów u odbiorcy. */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-full text-xs gap-1"
                              onClick={handleCopyFocusPrefsLinkVariant}
                              title={`Skopiuj link tylko z ustawieniami wariantu ${editingVariant}`}
                            >
                              <Link2 className="h-3 w-3" />
                              Kopiuj link ({editingVariant === "hc" ? "High Contrast" : editingVariant === "light" ? "Light" : "Dark"})
                            </Button>
                            <input
                              ref={importFileInputRef}
                              type="file"
                              accept="application/json,.json"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImportFocusPrefs(file);
                                // Reset value żeby ten sam plik mógł być wybrany ponownie.
                                e.target.value = "";
                              }}
                              aria-label="Wybierz plik JSON z preferencjami stylu focusu"
                            />
                            <p className="text-[10px] text-muted-foreground/80 leading-snug">
                              Link zawiera prefs w hashu URL — bezpieczne (nie trafia do logów serwera),
                              kompaktowe (~40 znaków), działa po wklejeniu w pasku adresu.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {retryFiltersActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setRetryFilterIp("");
                            setRetryFilterUa("");
                            setRetryDenoOnly(false);
                            setFiltersSnapshot(null);
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Wyczyść
                        </Button>
                      )}
                      {filtersSnapshot && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                          onClick={() => restoreFiltersSnapshot(filtersSnapshot)}
                          title="Przywróć filtry sprzed kliknięcia 'Pokaż w tabeli'"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Przywróć filtry
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {filteredRetrySources.length} / {webhookRetryStats.sources.length} źródeł
                      </span>
                    </div>

                    {/* Pasek nawigatora dopasowań — pojawia się po kliknięciu "Pokaż kolejne dopasowania"
                        w modalu. Auto-hide po 30s bezczynności. */}
                    {matchNavigator && matchNavigator.keys.length > 1 && (
                      <div className="mb-3 flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                        <Locate className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-primary font-medium">
                          Dopasowanie {matchNavigator.index + 1} z {matchNavigator.keys.length}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {matchNavigator.index === 0 ? "(wiersz źródłowy)" : "(pokrewny)"}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => goToNavigatorOffset(-1)}
                            title="Poprzednie dopasowanie (cyklicznie)"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline ml-1">Poprzednie</span>
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => goToNavigatorOffset(1)}
                            title="Następne dopasowanie (cyklicznie)"
                          >
                            <span className="hidden sm:inline mr-1">Następne</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setMatchNavigator(null);
                              if (navigatorHideTimerRef.current !== null) {
                                window.clearTimeout(navigatorHideTimerRef.current);
                                navigatorHideTimerRef.current = null;
                              }
                            }}
                            title="Zamknij nawigator"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {filteredRetrySources.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-sm text-center">
                        Brak wyników dla aktywnych filtrów.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>IP</TableHead>
                              <TableHead>User-Agent</TableHead>
                              <TableHead>Liczba retry</TableHead>
                              <TableHead>Max retry-after (s)</TableHead>
                              <TableHead>Ostatni</TableHead>
                              <TableHead className="w-[80px] text-right">Akcje</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              // Unified active-cursor key dla całego mapowania wierszy.
                              // Priorytet: matchNavigator (po "Pokaż kolejne dopasowania", modal zamknięty)
                              // > inspectSource+inspectJumpIndex (modal otwarty, J/K/„Skocz do następnego").
                              // Dzięki temu kolor + ring badge'a w kolumnie IP zawsze podąża za bieżącym
                              // kursorem niezależnie od źródła nawigacji.
                              const navigatorKeys = matchNavigator?.keys ?? null;
                              const navigatorIndex = matchNavigator?.index ?? -1;
                              const modalKeys = !matchNavigator && inspectSource
                                ? buildMatchKeys(inspectSource, highlightScope)
                                : null;
                              const modalActiveKey = modalKeys && modalKeys.length > 0
                                ? modalKeys[inspectJumpIndex % modalKeys.length]
                                : null;
                              const activeCursorKey = navigatorKeys && navigatorKeys.length > 0
                                ? navigatorKeys[navigatorIndex] ?? null
                                : modalActiveKey;
                              // Numery porządkowe: navigator > modal — żeby badge'e (1..N) w kolumnie IP
                              // były widoczne także gdy navigator bar jeszcze nie wystartował (modal open).
                              const ordinalKeys = navigatorKeys ?? modalKeys;
                              const ordinalTotal = ordinalKeys?.length ?? 0;
                              return filteredRetrySources.map((s) => {
                              const isDeno = /^Deno\//i.test(s.ua);
                              const rowKey = `${s.ip}::${s.ua}`;
                              // Dwa poziomy podświetlenia:
                              //  - exact (IP+UA): mocny — ring + bg primary/15 (wiersz źródłowy z modala)
                              //  - related (same-IP / same-UA): delikatny — bg primary/5, ograniczone przez
                              //    relatedHighlightKeys (max MAX_RELATED_HIGHLIGHTS pierwszych w sortowaniu).
                              const isExactHighlight =
                                !!highlightedSource &&
                                highlightedSource.ip === s.ip &&
                                highlightedSource.ua === s.ua;
                              const isInRelatedSet = !isExactHighlight && relatedHighlightKeys.has(rowKey);
                              // Flagi pomocnicze tylko do wyboru właściwego badge w tooltipie.
                              const isSameIpHighlight =
                                isInRelatedSet && highlightScope === "same-ip";
                              const isSameUaHighlight =
                                isInRelatedSet && highlightScope === "same-ua";
                              const isRelatedHighlight = isInRelatedSet;
                              const isHighlighted = isExactHighlight || isRelatedHighlight;
                              // Czy ten wiersz jest aktualnym kursorem nawigacji (Enter/J/K,
                              // navigator bar lub „Skocz do następnego"). Używa unified
                              // activeCursorKey wyliczonego raz dla całego mapowania.
                              const isNavigatorActive = activeCursorKey === rowKey;
                              // Numer porządkowy w sekwencji dopasowań (1-based) — index 0 = exact,
                              // reszta = related. ordinalKeys to navigatorKeys (gdy aktywny) albo modalKeys
                              // (gdy modal otwarty bez navigator bar) — dzięki temu badge'e w tabeli
                              // są widoczne w obu trybach.
                              const navIdx = ordinalKeys ? ordinalKeys.indexOf(rowKey) : -1;
                              const navOrdinal = navIdx >= 0 ? navIdx + 1 : null;
                              const navTotal = ordinalTotal;
                              const row = (
                                <TableRow
                                  key={rowKey}
                                  data-retry-row-key={rowKey}
                                  tabIndex={-1}
                                  style={isNavigatorActive ? activeRowStyle : undefined}
                                  className={
                                    isNavigatorActive
                                      ? highContrastFocus
                                        ? "relative bg-primary/30 ring-offset-2 ring-offset-background outline outline-2 outline-offset-[-4px] outline-foreground/70 transition-all cursor-help focus:outline-none"
                                        : "relative bg-primary/20 ring-offset-2 ring-offset-background transition-all cursor-help focus:outline-none"
                                      : isExactHighlight
                                        ? "bg-primary/15 ring-2 ring-primary/40 transition-colors cursor-help focus:outline-none"
                                        : isRelatedHighlight
                                          ? "bg-primary/5 transition-colors cursor-help focus:outline-none"
                                          : "transition-colors focus:outline-none"
                                  }
                                >
                                  <TableCell className="font-mono text-xs relative">
                                    {/* Persistent navigator marker — pionowy pasek + pill „▸ N/T"
                                        po lewej stronie aktywnego wiersza. Niezależny od animacji
                                        pulse/afterglow i pływającej etykiety JumpLabel — pozostaje
                                        widoczny tak długo, jak długo wiersz jest `isNavigatorActive`,
                                        więc przy szybkim scrollu zawsze wiadomo „gdzie jestem".
                                        Position: absolute względem komórki (TableCell `relative`),
                                        wysunięty w lewo poza krawędź tabeli (-left-1) z translate
                                        żeby nie zaburzał szerokości kolumny. aria-hidden — to
                                        wizualny duplikat ordinal-button, który jest dostępny dla a11y. */}
                                    {isNavigatorActive && navOrdinal !== null && (
                                      <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full flex items-center gap-1 z-10"
                                      >
                                        <span className="inline-block w-1 h-7 rounded-full bg-primary shadow-[0_0_10px_-1px_hsl(var(--primary)/0.7)]" />
                                        <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 h-5 rounded bg-primary text-primary-foreground text-[10px] font-mono font-semibold shadow-md">
                                          <span aria-hidden="true">▸</span>
                                          {navOrdinal}/{navTotal}
                                        </span>
                                      </span>
                                    )}
                                    <div className="flex items-center gap-2">
                                      {/* Numer porządkowy dopasowania — kolory spójne z legendą:
                                          primary (gold) = exact (1) lub aktywny kursor,
                                          muted = related (2..N) gdy nieaktywny.
                                          Aktywny wiersz dostaje ring + primary fill — synchronizacja
                                          z `isNavigatorActive` (matchNavigator/Enter/J/K). */}
                                      {navOrdinal !== null && (
                                        <UITooltip delayDuration={150}>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // Klik = ten sam efekt co Enter na liczniku „X/Y" /
                                                // przycisk „Skocz do następnego" wskazujący właśnie ten indeks.
                                                jumpToMatchIndex(navIdx);
                                              }}
                                              className={`shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                                                isNavigatorActive || navIdx === 0
                                                  ? "bg-primary text-primary-foreground"
                                                  : "bg-muted text-muted-foreground"
                                              } ${isNavigatorActive ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                                              aria-label={`Przejdź do dopasowania ${navOrdinal} z ${navTotal}`}
                                            >
                                              {navOrdinal}
                                            </button>
                                          </TooltipTrigger>
                                          {/* Bogaty tooltip — wyjaśnia typ (exact/related), pozycję X/Y
                                              oraz dokładnie co zrobi Enter/J dla TEGO konkretnego wiersza.
                                              Treść akcji zależy od stanu kursora (active vs nieaktywny). */}
                                          <TooltipContent side="top" align="start" className="text-xs max-w-sm">
                                            <div className="space-y-1.5">
                                              <div className="flex items-center gap-1.5 font-semibold">
                                                <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded text-[10px] font-mono ${
                                                  navIdx === 0
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                                }`}>
                                                  {navOrdinal}
                                                </span>
                                                <span>
                                                  {navOrdinal}/{navTotal} —{" "}
                                                  {navIdx === 0 ? (
                                                    <strong className="text-primary">exact</strong>
                                                  ) : (
                                                    <strong>related</strong>
                                                  )}
                                                  {isNavigatorActive && (
                                                    <span className="ml-1 text-primary">(bieżący kursor)</span>
                                                  )}
                                                </span>
                                              </div>
                                              <div className="text-muted-foreground">
                                                {navIdx === 0
                                                  ? "Wiersz źródłowy — dokładne dopasowanie IP+UA z modala inspekcji."
                                                  : "Powiązany wiersz — ten sam IP lub User-Agent (zależnie od zakresu podświetlenia)."}
                                              </div>
                                              <div className="pt-1 border-t border-border/40 text-muted-foreground">
                                                {isNavigatorActive ? (
                                                  <>
                                                    Ten wiersz jest aktywnym kursorem.{" "}
                                                    <kbd className="px-1 py-0 text-[10px] font-mono rounded border border-border/60 bg-muted/60">Enter</kbd>{" "}
                                                    /{" "}
                                                    <kbd className="px-1 py-0 text-[10px] font-mono rounded border border-border/60 bg-muted/60">J</kbd>{" "}
                                                    przejdzie do następnego ({((navIdx + 1) % Math.max(navTotal, 1)) + 1}/{navTotal}).
                                                  </>
                                                ) : (
                                                  <>
                                                    Klik (lub{" "}
                                                    <kbd className="px-1 py-0 text-[10px] font-mono rounded border border-border/60 bg-muted/60">Enter</kbd>
                                                    ) ustawi kursor tutaj. Następny{" "}
                                                    <kbd className="px-1 py-0 text-[10px] font-mono rounded border border-border/60 bg-muted/60">J</kbd>{" "}
                                                    pójdzie do {((navIdx + 1) % Math.max(navTotal, 1)) + 1}/{navTotal}.
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </UITooltip>
                                      )}
                                      <span>{s.ip}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {isDeno ? (
                                      <Badge variant="secondary" className="mr-2">webhook DB</Badge>
                                    ) : null}
                                    {s.ua}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={s.count >= 50 ? "destructive" : "outline"}>{s.count}</Badge>
                                  </TableCell>
                                  <TableCell className="text-xs">{s.maxRetryAfter || "—"}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(s.last), { addSuffix: true, locale: pl })}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => setInspectSource({ ip: s.ip, ua: s.ua })}
                                      title="Pokaż surowe rekordy z metadata"
                                    >
                                      <Eye className="h-3.5 w-3.5 mr-1" />
                                      <span className="text-xs">Szczegóły</span>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                              if (!isHighlighted) return row;
                              // Tooltip aktywny tylko dla wiersza podświetlonego po "Pokaż w tabeli" —
                                // szybki podgląd IP/UA/daty bez konieczności otwierania modala.
                              return (
                                <UITooltip key={rowKey} delayDuration={150}>
                                  <TooltipTrigger asChild>{row}</TooltipTrigger>
                                  <TooltipContent side="top" align="start" className="max-w-md">
                                    <div className="space-y-1 text-xs">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        {isExactHighlight ? (
                                          <Badge variant="default" className="text-[10px] py-0 h-4">
                                            Wiersz źródłowy (z modala)
                                          </Badge>
                                        ) : isSameIpHighlight ? (
                                          <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/40 text-primary">
                                            Ten sam IP
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/40 text-primary">
                                            Ten sam User-Agent
                                          </Badge>
                                        )}
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">IP: </span>
                                        <span className="font-mono">{s.ip}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">User-Agent: </span>
                                        <span className="font-mono break-all">{s.ua}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Ostatni rekord: </span>
                                        <span className="font-mono">
                                          {new Date(s.last).toLocaleString("pl-PL", {
                                            dateStyle: "short",
                                            timeStyle: "medium",
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </UITooltip>
                              );
                              });
                            })()}
                          </TableBody>
                        </Table>
                        {/* Legenda numerów porządkowych w kolumnie IP — spójna z licznikiem
                            "X/Y" w nawigatorze dopasowań i w modalu "Podgląd dopasowań".
                            Index 0 z buildMatchKeys = wiersz źródłowy (exact, badge primary),
                            kolejne = related (badge muted). */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground/80">Numery dopasowań:</span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded text-[10px] font-mono font-semibold bg-primary text-primary-foreground">
                              1
                            </span>
                            <span><strong className="text-foreground/90">exact</strong> — wiersz źródłowy</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded text-[10px] font-mono font-semibold bg-muted text-muted-foreground">
                              2..n
                            </span>
                            <span><strong className="text-foreground/90">related</strong> — ten sam IP / User-Agent</span>
                          </span>
                          <span className="hidden md:inline opacity-70">Spójne z licznikiem „X/Y” w „Podgląd dopasowań”.</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Wpisy w bazie (ostatnie 100)</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Z ostatnich 24h</CardDescription>
              <CardTitle className="text-3xl">{stats.last24h}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unikalne IP</CardDescription>
              <CardTitle className="text-3xl">{stats.uniqueIps}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* ABUSE ALERT */}
        <Card className="mb-8 border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Podejrzane IP (≥10 nieudanych prób w ostatnich 10 minutach)
            </CardTitle>
            <CardDescription>
              Próg detekcji brute-force. Auto-refresh co 30s. Ostatnia aktualizacja:{" "}
              {abuseUpdated ? formatDistanceToNow(new Date(abuseUpdated), { addSuffix: true, locale: pl }) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {abuseLoading ? (
              <p className="text-muted-foreground">Ładowanie…</p>
            ) : abuseIps.length === 0 ? (
              <p className="text-muted-foreground py-4">
                ✓ Brak podejrzanej aktywności. Żadne IP nie przekroczyło progu 10 prób / 10 min.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP</TableHead>
                      <TableHead>Łącznie</TableHead>
                      <TableHead>Invalid</TableHead>
                      <TableHead>Rate-lim</TableHead>
                      <TableHead>Expired</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Pierwszy</TableHead>
                      <TableHead>Ostatni</TableHead>
                      <TableHead>User-Agent (ostatni)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abuseIps.map((row) => (
                      <TableRow key={row.ip}>
                        <TableCell className="font-mono text-sm">{row.ip}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{row.failure_count}</Badge>
                        </TableCell>
                        <TableCell>{row.invalid_token_count}</TableCell>
                        <TableCell>{row.rate_limited_count}</TableCell>
                        <TableCell>{row.expired_count}</TableCell>
                        <TableCell>{row.already_used_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(row.first_seen), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(row.last_seen), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={row.last_user_agent ?? ""}>
                          {row.last_user_agent ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TOP RATE-LIMITED IPs */}
        <Card className="mb-8 border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Top rate-limited IP (aktywne nadużycia)
            </CardTitle>
            <CardDescription>
              Agregat z <code className="text-xs">rate_limit_buckets</code> — IP × endpoint, których count w jakimkolwiek oknie przekroczył limit.
              "Denied" = liczba odrzuconych requestów (count − limit). Niezależne od <code className="text-xs">token_validation_failures</code>.
              Auto-refresh 30s. Aktualizacja:{" "}
              {rateLimitedUpdated ? formatDistanceToNow(new Date(rateLimitedUpdated), { addSuffix: true, locale: pl }) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rateLimitedLoading ? (
              <p className="text-muted-foreground">Ładowanie…</p>
            ) : rateLimitedIps.length === 0 ? (
              <p className="text-muted-foreground py-4">
                ✓ Żadne IP nie przekracza obecnie limitu rate-limit.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Denied</TableHead>
                      <TableHead>Hits (total)</TableHead>
                      <TableHead>Okien</TableHead>
                      <TableHead>Ostatnie okno</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateLimitedIps.map((row) => (
                      <TableRow key={`${row.endpoint}::${row.ip}`}>
                        <TableCell className="font-mono text-sm">{row.ip}</TableCell>
                        <TableCell className="font-mono text-xs">{row.endpoint}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{row.denied}</Badge>
                        </TableCell>
                        <TableCell>{row.hits}</TableCell>
                        <TableCell>{row.windows}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(row.last_window), { addSuffix: true, locale: pl })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT FAILURES */}
        <Card>
          <CardHeader>
            <CardTitle>Ostatnie 100 nieudanych prób</CardTitle>
            <CardDescription>Pełen log z tabeli token_validation_failures (auto-refresh 30s).</CardDescription>
          </CardHeader>
          <CardContent>
            {failuresLoading ? (
              <p className="text-muted-foreground">Ładowanie…</p>
            ) : recentFailures.length === 0 ? (
              <p className="text-muted-foreground py-4">Brak wpisów.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kiedy</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Powód</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>User-Agent</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentFailures.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{f.endpoint}</TableCell>
                        <TableCell>
                          <Badge variant={REASON_VARIANT[f.reason] ?? "outline"}>
                            {REASON_LABELS[f.reason] ?? f.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{f.ip ?? "—"}</TableCell>
                        <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground" title={f.user_agent ?? ""}>
                          {f.user_agent ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground font-mono" title={f.metadata ? JSON.stringify(f.metadata) : ""}>
                          {f.metadata ? JSON.stringify(f.metadata) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal inspekcji surowych rekordów dla wybranego IP+UA. */}
      <Dialog
        open={!!inspectSource}
        onOpenChange={(open) => {
          if (!open) {
            // Auto-reveal przy zamknięciu (X / Esc / klik w tło): jeśli mamy aktywne
            // źródło, traktujemy zamknięcie jak "Pokaż w tabeli" — przewijamy do wiersza
            // i podświetlamy. Flaga suppress chroni przed podwójnym wywołaniem,
            // gdy revealRowInTable samo wyzerowało inspectSource.
            const src = inspectSource;
            if (suppressCloseRevealRef.current) {
              suppressCloseRevealRef.current = false;
            } else if (src) {
              revealRowInTable(src.ip, src.ua);
              return;
            }
            setInspectSource(null);
            setInspectQuery("");
            setInspectSort("desc");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <Eye className="h-5 w-5 text-primary" />
                Surowe rekordy retry'ów
                {inspectSourceIndex >= 0 && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary text-[11px] font-normal gap-1"
                    title="Pozycja tego źródła w posortowanej liście — kliknięcie 'Pokaż w tabeli' zamknie modal i przewinie do tego wiersza"
                  >
                    <Locate className="h-3 w-3" />
                    Zamknij i przejdź do wiersza ({inspectSourceIndex + 1} z {webhookRetryStats.sources.length})
                  </Badge>
                )}
                {/* Liczniki dopasowań — pokazują (1) który wiersz jest aktualnie podświetlony
                    (ostatni skok) oraz (2) który zostanie podświetlony przy najbliższym kliknięciu.
                    Widoczne tylko gdy mamy >1 dopasowanie (czyli jest po czym skakać). */}
                {(() => {
                  if (!inspectSource) return null;
                  const jumpKeys = buildMatchKeys(inspectSource, highlightScope);
                  if (jumpKeys.length <= 1) return null;
                  const total = jumpKeys.length;
                  const nextDisplay = (inspectJumpIndex % total) + 1;
                  // "Aktualnie" = ostatni skok = pozycja PRZED kursorem.
                  // Przed pierwszym skokiem (inspectJumpIndex === 0) nic nie jest podświetlone.
                  // Po pierwszym skoku kursor = 1, więc "aktualnie" = 1 (bo (0-1+total)%total+1 = total,
                  // co jest złe). Trzymamy dlatego osobny stan: przed pierwszym skokiem = null.
                  const hasJumped = inspectJumpIndex > 0 || inspectJumpIndex < 0;
                  const currentDisplay = hasJumped
                    ? ((inspectJumpIndex - 1) % total + total) % total + 1
                    : null;
                  return (
                    <>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-normal gap-1 ${
                          currentDisplay !== null
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted-foreground/30 text-muted-foreground"
                        }`}
                        title={
                          currentDisplay !== null
                            ? `Aktualnie podświetlone: dopasowanie ${currentDisplay} z ${total}`
                            : "Jeszcze nie wykonano skoku — kliknij 'Skocz do następnego' lub naciśnij ↓"
                        }
                      >
                        <Locate className="h-3 w-3" />
                        Aktualnie: {currentDisplay !== null ? `${currentDisplay} z ${total}` : "—"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary text-[11px] font-normal gap-1"
                        title={`Następny skok podświetli dopasowanie ${nextDisplay} z ${total} (cyklicznie). Kierunek: ${
                          lastJumpDirection === "backward" ? "wstecz (ostatnio użyto ↑/K)" : "w przód (ostatnio użyto ↓/J lub przed pierwszym skokiem)"
                        }`}
                      >
                        {/* Ikona kierunku zależna od ostatniego skoku:
                            ▼ ChevronDown — w przód (default lub po ↓/J/Skocz do następnego)
                            ▲ ChevronUp   — wstecz (po ↑/K) */}
                        {lastJumpDirection === "backward" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        Następne: {nextDisplay} z {total}
                      </Badge>
                    </>
                  );
                })()}
              </DialogTitle>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    if (!inspectSource) return;
                    revealRowInTable(inspectSource.ip, inspectSource.ua);
                  }}
                  title="Zamknij modal i przewiń do wiersza w tabeli źródeł (Enter lub Ctrl+K)"
                >
                  <Locate className="h-3.5 w-3.5" />
                  Pokaż w tabeli
                  <kbd className="ml-1 hidden sm:inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1 py-0 text-[10px] font-mono text-muted-foreground">
                    ⏎
                  </kbd>
                </Button>
                {/* Przycisk "Pokaż kolejne dopasowania" — tylko gdy są pokrewne wiersze
                    do nawigacji (auto-reveal włączony, scope != exact, related > 0). */}
                {autoRevealEnabled && relatedMatchCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                    onClick={() => {
                      if (!inspectSource) return;
                      const keys = buildMatchKeys(inspectSource, highlightScope);
                      // Najpierw standardowy reveal exact (zamknie modal, scrolluje, podświetla),
                      // a potem otwiera nawigator do iteracji po pokrewnych przyciskami ◀ ▶.
                      revealRowInTable(inspectSource.ip, inspectSource.ua);
                      // Drugi rAF, żeby navigator pojawił się po DOM-update revealu.
                      requestAnimationFrame(() => requestAnimationFrame(() => openMatchNavigator(keys)));
                    }}
                    title={`Zamknij modal i włącz nawigator po ${relatedMatchCount} pokrewnych dopasowaniach`}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    Pokaż kolejne dopasowania ({relatedMatchCount})
                  </Button>
                )}
                {/* Przycisk "Skocz do następnego" — modal POZOSTAJE OTWARTY, klik tylko
                    przewija tabelę pod modalem do kolejnego podświetlonego wiersza
                    (cyklicznie po exact + related). Działa też gdy auto-reveal OFF —
                    bazuje wyłącznie na inspectSource + highlightScope. */}
                {(() => {
                  if (!inspectSource) return null;
                  const jumpKeys = buildMatchKeys(inspectSource, highlightScope);
                  if (jumpKeys.length <= 1) return null; // exact only — nie ma czego skakać
                  const total = jumpKeys.length;
                  const currentDisplay = (inspectJumpIndex % total) + 1;
                  return (
                    <div className="flex items-center gap-1">
                      {/* Przycisk "Poprzednie" — symetryczny do "Skocz do następnego",
                          żeby nawigacja klawiszami (↑/K) miała wizualny odpowiednik w UI. */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-primary/40 text-primary hover:bg-primary/10"
                        onClick={() => performJumpToMatch(-1)}
                        title={`Poprzednie podświetlone dopasowanie (cyklicznie). Skrót: ↑ lub K.`}
                        aria-label="Poprzednie dopasowanie"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                        onClick={() => performJumpToMatch(1)}
                        title={`Przewiń tabelę pod modalem do następnego podświetlonego wiersza (${currentDisplay}/${total}). Modal pozostaje otwarty. Skróty: ↓ / J = następne, ↑ / K = poprzednie.`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        Skocz do następnego ({currentDisplay}/{total})
                        <kbd className="ml-1 hidden sm:inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1 py-0 text-[10px] font-mono text-muted-foreground">
                          ↓
                        </kbd>
                      </Button>
                    </div>
                  );
                })()}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 shrink-0"
                
                onClick={() => {
                  if (!inspectSource || inspectFilteredRecords.length === 0) return;
                  // Eksport tylko aktualnie wyświetlanych rekordów (po filtrach IP+UA + tekst).
                  const payload = {
                    exportedAt: new Date().toISOString(),
                    endpoint: "on-booking-created",
                    source: { ip: inspectSource.ip, userAgent: inspectSource.ua },
                    query: inspectQuery.trim() || null,
                    count: inspectFilteredRecords.length,
                    records: inspectFilteredRecords,
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const safeIp = inspectSource.ip.replace(/[^a-z0-9.-]/gi, "_");
                  const ts = new Date().toISOString().replace(/[:.]/g, "-");
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `retry-records_${safeIp}_${ts}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success(`Wyeksportowano ${inspectFilteredRecords.length} rekordów`);
                }}
                disabled={inspectFilteredRecords.length === 0}
                title="Pobierz aktualnie wyświetlane rekordy jako JSON"
              >
                <Download className="h-3.5 w-3.5" />
                Eksportuj
              </Button>
              </div>
            </div>
            <DialogDescription asChild>
              <div className="text-xs space-y-1">
                {inspectSource && (
                  <>
                    <div>
                      Endpoint <code>on-booking-created</code> · IP{" "}
                      <code className="font-mono">{inspectSource.ip}</code>
                    </div>
                    <div>
                      UA <code className="font-mono break-all">{inspectSource.ua}</code>
                    </div>
                    <div>
                      Pokazuję <strong>{inspectFilteredRecords.length}</strong> z {inspectRecords.length} (max 50 najnowszych, window 24h).
                    </div>
                    {inspectSourceIndex >= 0 && (
                      autoRevealEnabled ? (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-primary">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>
                            Po zamknięciu modala wiersz zostanie automatycznie przewinięty
                            i podświetlony w tabeli źródeł na ~10 s.
                            {highlightScope !== "exact" && (
                              <>
                                {" "}Znaleziono <strong>{relatedMatchCount}</strong>{" "}
                                {relatedMatchCount === 1 ? "pokrewny wiersz" : "pokrewnych wierszy"} z{" "}
                                {highlightScope === "same-ip" ? "tym samym IP" : "tym samym User-Agent"}
                                {relatedMatchCount > MAX_RELATED_HIGHLIGHTS ? (
                                  <>
                                    {" "}— podświetlimy <strong>pierwszych {MAX_RELATED_HIGHLIGHTS}</strong>{" "}
                                    (limit ochronny).
                                  </>
                                ) : (
                                  <>.</>
                                )}
                              </>
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-muted-foreground/30 bg-muted/40 px-2 py-1.5 text-muted-foreground">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>
                            Auto-przewijanie i podświetlenie jest <strong>wyłączone</strong>{" "}
                            w ustawieniach (toggle „Auto-reveal” w pasku filtrów).
                            Zamknięcie modala tylko go zamknie.
                          </span>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {/* Podgląd dopasowań — rozwijana mini-lista wszystkich podświetlonych wierszy
              (exact + related, max MAX_RELATED_HIGHLIGHTS+1). Każdy element jest klikalny
              i wykonuje skok do tego konkretnego wiersza (z animate-jump-pulse).
              Widoczna tylko gdy jest >1 dopasowanie do wyboru. */}
          {(() => {
            if (!inspectSource) return null;
            const jumpKeys = buildMatchKeys(inspectSource, highlightScope);
            if (jumpKeys.length <= 1) return null;
            const total = jumpKeys.length;
            // Filtr wyszukiwania zastosowany TYLKO do wyświetlania (nie zmienia globalnego cursora
            // inspectJumpIndex — ten cyklicznie chodzi po pełnej liście jumpKeys). Zachowujemy oryginalny
            // indeks `i` per dopasowanie, żeby móc:
            //   1) sprawdzić czy bieżący kursor (inspectJumpIndex % total) jest w widocznej części,
            //   2) policzyć czy widoczne dopasowanie jest "exact" (i === 0).
            // Liczymy w nagłówku, żeby badge "X/Y" odzwierciedlał aktualny widok listy.
            const q = inspectListQuery.trim().toLowerCase();
            const filteredKeys = q
              ? jumpKeys
                  .map((key, i) => ({ key, i }))
                  .filter(({ key }) => {
                    const [ip, ua] = key.split("::");
                    return ip.toLowerCase().includes(q) || ua.toLowerCase().includes(q);
                  })
              : jumpKeys.map((key, i) => ({ key, i }));
            const filteredTotal = filteredKeys.length;
            const isFiltered = q.length > 0 && filteredTotal !== total;
            // Pozycja kursora w przefiltrowanym widoku (1-based) — null gdy kursor odfiltrowany.
            const cursorIndexInFull = inspectJumpIndex % total;
            const cursorPosInFiltered = filteredKeys.findIndex(({ i }) => i === cursorIndexInFull);
            const cursorVisibleInFiltered = cursorPosInFiltered !== -1;
            // currentDisplay = pozycja, do której skoczy NASTĘPNE Enter/J (1-based).
            // Index 0 z buildMatchKeys = wiersz źródłowy (exact); 1..N = related.
            const currentDisplay = cursorIndexInFull + 1;
            const isNextExact = cursorIndexInFull === 0;
            return (
              <Collapsible open={inspectListOpen} onOpenChange={setInspectListOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full gap-2 justify-start border-primary/30 text-primary hover:bg-primary/10"
                    title="Pokaż/ukryj listę wszystkich podświetlonych dopasowań — kliknij dowolne, by skoczyć do niego"
                  >
                    {inspectListOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {/* Tytuł + globalny licznik. Gdy filtr aktywny i zawęża wynik, pokazujemy
                        "(X z Y)" zamiast "(Y)" — Y zawsze odzwierciedla bieżący highlightScope
                        (buildMatchKeys re-runs per render), a X — bieżący filtr wyszukiwania. */}
                    Podgląd dopasowań{" "}
                    {isFiltered ? (
                      <span className="font-mono tabular-nums">
                        ({filteredTotal} z {total})
                      </span>
                    ) : (
                      <span className="font-mono tabular-nums">({total})</span>
                    )}
                    {/* Licznik "Następne: X/Y" + mini-badge typu (exact/related) — kolory
                        zgodne z legendą poniżej (primary = exact, muted = related). Tooltip
                        wyjaśnia co zrobi Enter / J / klik "Skocz do następnego". */}
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-normal">
                      <UITooltip delayDuration={150}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 cursor-help">
                            <span className="text-muted-foreground">Następne:</span>
                            {/* Licznik dwa-trybowy:
                                - bez filtra: "X/Y" (Y = total wynikający z highlightScope),
                                - z filtrem zawężającym: "P/F z Y" gdzie P = pozycja kursora w widoku
                                  (lub "—" gdy odfiltrowany), F = filteredTotal, Y = total.
                                Dzięki temu od razu widać, że Enter skoczy w obrębie pełnej listy,
                                ale widoczna część jest węższa. */}
                            {isFiltered ? (
                              <span className="font-mono tabular-nums text-foreground">
                                {cursorVisibleInFiltered ? cursorPosInFiltered + 1 : "—"}/{filteredTotal}{" "}
                                <span className="text-muted-foreground">z {total}</span>
                              </span>
                            ) : (
                              <span className="font-mono tabular-nums text-foreground">
                                {currentDisplay}/{total}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center justify-center min-w-4 h-4 px-1 rounded text-[9px] font-mono font-semibold ${
                                isNextExact
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isNextExact ? "exact" : "related"}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="end" className="text-xs max-w-sm">
                          {/* Bogata podpowiedź: definicje exact/related (zgodnie z legendą poniżej)
                              + jasny komunikat co zrobi następna akcja klawiatury / klik. */}
                          <div className="space-y-1.5">
                            <div className="font-semibold">
                              {currentDisplay}/{total} — {isNextExact ? "exact" : "related"}
                            </div>
                            {isFiltered && (
                              <div className="text-muted-foreground">
                                Widoczne po filtrze: <span className="font-mono">{filteredTotal}</span> z{" "}
                                <span className="font-mono">{total}</span>
                                {!cursorVisibleInFiltered && " · bieżący kursor jest poza filtrem"}
                              </div>
                            )}
                            <div className="flex items-start gap-1.5">
                              <span className="inline-flex shrink-0 items-center justify-center w-3.5 h-3.5 rounded bg-primary text-primary-foreground text-[9px] font-mono font-semibold">1</span>
                              <span><strong>exact</strong> — wiersz źródłowy z modala (dokładny IP+UA).</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="inline-flex shrink-0 items-center justify-center w-3.5 h-3.5 rounded bg-muted text-muted-foreground text-[9px] font-mono font-semibold">n</span>
                              <span><strong>related</strong> — wpisy z tym samym IP lub UA (wg „Zakres”).</span>
                            </div>
                            <div className="pt-1 border-t border-border/40 text-muted-foreground">
                              <kbd className="font-mono">Enter</kbd> / <kbd className="font-mono">J</kbd> / klik „Skocz do następnego” →{" "}
                              {isNextExact
                                ? `wróci do wiersza źródłowego (1/${total}).`
                                : `podświetli dopasowanie ${currentDisplay}/${total}.`}
                              {" "}<kbd className="font-mono">K</kbd> = poprzednie (cyklicznie).
                              {isFiltered && " Skok ignoruje filtr — chodzi po pełnej liście."}
                            </div>
                          </div>
                        </TooltipContent>
                      </UITooltip>
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {/* Pole wyszukiwania + sortowanie listy dopasowań — szybkie znajdowanie
                      konkretnego IP/UA i priorytetyzacja po liczbie retry'ów. */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        value={inspectListQuery}
                        onChange={(e) => setInspectListQuery(e.target.value)}
                        placeholder="Szukaj po IP lub User-Agent…"
                        className="h-8 pl-8 pr-8 text-xs"
                      />
                      {inspectListQuery && (
                        <button
                          type="button"
                          onClick={() => setInspectListQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="Wyczyść wyszukiwanie"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Natywny <select> zamiast shadcn Select — minimalna zależność, spójny
                        z resztą stylu (h-8, text-xs, semantic tokens). */}
                    <select
                      value={inspectListSort}
                      onChange={(e) =>
                        setInspectListSort(e.target.value as "default" | "count-desc" | "ip-asc")
                      }
                      className="h-8 shrink-0 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Sortuj listę dopasowań"
                      aria-label="Sortuj listę dopasowań"
                    >
                      <option value="default">Domyślnie</option>
                      <option value="count-desc">Najwięcej retry'ów</option>
                      <option value="ip-asc">IP (A→Z)</option>
                    </select>
                  </div>
                  {/* Legenda — wyjaśnia co oznaczają badge'e numeryczne w liście:
                      złoty/primary = wiersz źródłowy (exact, indeks 0 z buildMatchKeys),
                      szary/muted = dopasowania powiązane (related, ten sam IP lub UA).
                      Każda pozycja ma tooltip z dokładniejszym opisem + osobny chip
                      "⌨ Skróty" pokazuje pełną listę bindingów (↑/↓/Enter/Home/End). */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <UITooltip delayDuration={150}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1.5 cursor-help">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-primary text-primary-foreground text-[9px] font-mono font-semibold">
                            1
                          </span>
                          Wiersz źródłowy (exact)
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-xs">
                        Dokładne dopasowanie IP+UA z modala — pierwsze w kolejce skoków.
                      </TooltipContent>
                    </UITooltip>
                    <UITooltip delayDuration={150}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1.5 cursor-help">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-muted text-muted-foreground text-[9px] font-mono font-semibold">
                            n
                          </span>
                          Powiązane (related)
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-xs">
                        Wiersze z tym samym IP lub UA (zakres zależy od „Zakres podświetlenia”).
                      </TooltipContent>
                    </UITooltip>
                    <UITooltip delayDuration={150}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1.5 cursor-help">
                          <ChevronRight className="h-3 w-3 text-primary" />
                          Aktualny kursor
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-xs">
                        Pozycja, do której skoczy następny ↓ / J / klik „Pokaż kolejne dopasowania”.
                      </TooltipContent>
                    </UITooltip>
                    {/* Prawa strona legendy: segmented control "Zakres" (exact / same-ip / same-ua)
                        + chip ze skrótami klawiszowymi. Reużywamy istniejący setHighlightScope —
                        dokładnie ten sam stan co przycisk w nagłówku modala (źródło prawdy w LS).
                        Zmiana scope automatycznie odświeża listę dopasowań (buildMatchKeys w useMemo
                        dependsuje na highlightScope), więc UI sam się przerenderuje. */}
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">Zakres:</span>
                      <div role="radiogroup" aria-label="Zakres podświetlenia" className="inline-flex rounded border border-border/60 overflow-hidden">
                        {(["exact", "same-ip", "same-ua"] as const).map((scope) => {
                          const labels: Record<typeof scope, { short: string; full: string }> = {
                            "exact": { short: "Exact", full: "Tylko dokładny IP+UA" },
                            "same-ip": { short: "Same IP", full: "Wszystkie wpisy z tym samym IP" },
                            "same-ua": { short: "Same UA", full: "Wszystkie wpisy z tym samym UA" },
                          };
                          const isActive = highlightScope === scope;
                          return (
                            <UITooltip key={scope} delayDuration={150}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={isActive}
                                  onClick={() => setHighlightScope(scope)}
                                  className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                                  }`}
                                >
                                  {labels[scope].short}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {labels[scope].full}
                              </TooltipContent>
                            </UITooltip>
                          );
                        })}
                      </div>
                      {/* Chip skrótów — wizualny separator + bogaty tooltip z pełną listą bindingów. */}
                      <UITooltip delayDuration={150}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 cursor-help rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
                            ⌨ ↑/↓ • Enter
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="end" className="text-xs max-w-xs">
                          <div className="font-semibold mb-1">Skróty w liście</div>
                          <ul className="space-y-0.5">
                            <li><kbd className="font-mono">↑</kbd> / <kbd className="font-mono">↓</kbd> — przełącz wybór wiersza</li>
                            <li><kbd className="font-mono">Home</kbd> / <kbd className="font-mono">End</kbd> — pierwszy / ostatni</li>
                            <li><kbd className="font-mono">Enter</kbd> / <kbd className="font-mono">Space</kbd> — skok do wiersza</li>
                            <li className="pt-1 text-muted-foreground">Globalnie (poza listą): <kbd className="font-mono">J</kbd>/<kbd className="font-mono">K</kbd> = następne / poprzednie</li>
                          </ul>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                  </div>
                  {(() => {
                    const q = inspectListQuery.trim().toLowerCase();
                    // Helper: count retry'ów dla pary ip+ua (0 jeśli brak w sources).
                    const getCount = (ip: string, ua: string) =>
                      webhookRetryStats.sources.find((s) => s.ip === ip && s.ua === ua)?.count ?? 0;
                    // Zachowujemy oryginalny indeks (i) — żeby skok do wiersza był spójny
                    // z buildMatchKeys (kursor `inspectJumpIndex` operuje na pełnej liście).
                    const filtered = jumpKeys
                      .map((key, i) => ({ key, i }))
                      .filter(({ key }) => {
                        if (!q) return true;
                        const [ip, ua] = key.split("::");
                        return (
                          ip.toLowerCase().includes(q) ||
                          ua.toLowerCase().includes(q)
                        );
                      });
                    // Sortowanie po wybranym kryterium. "default" = pomijamy sort (kolejność
                    // z buildMatchKeys: exact pierwszy, potem related). Tworzymy kopię, żeby
                    // nie mutować referencji z .filter() (defensywnie — V8 i tak by sobie poradził).
                    if (inspectListSort === "count-desc") {
                      filtered.sort((a, b) => {
                        const [ipA, uaA] = a.key.split("::");
                        const [ipB, uaB] = b.key.split("::");
                        return getCount(ipB, uaB) - getCount(ipA, uaA);
                      });
                    } else if (inspectListSort === "ip-asc") {
                      filtered.sort((a, b) => {
                        const ipA = a.key.split("::")[0];
                        const ipB = b.key.split("::")[0];
                        return ipA.localeCompare(ipB);
                      });
                    }
                    if (filtered.length === 0) {
                      return (
                        <div className="mt-2 rounded-md border border-border/60 bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                          Brak dopasowań dla „{inspectListQuery}”.
                        </div>
                      );
                    }
                    return (
                      <div
                        data-list-nav="true"
                        className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border/60 bg-muted/30 divide-y divide-border/40"
                        onKeyDown={(e) => {
                          // Roving navigation strzałkami — przesuwa fokus po przyciskach
                          // wewnątrz listy. Enter / Space już są natywnie obsłużone przez
                          // <button> (wywołują onClick → performJumpToMatch).
                          if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
                          const container = e.currentTarget;
                          const items = Array.from(
                            container.querySelectorAll<HTMLButtonElement>('button[data-list-item="true"]'),
                          );
                          if (items.length === 0) return;
                          const activeIdx = items.findIndex((b) => b === document.activeElement);
                          let nextIdx = activeIdx;
                          if (e.key === "ArrowDown") nextIdx = activeIdx < 0 ? 0 : Math.min(items.length - 1, activeIdx + 1);
                          else if (e.key === "ArrowUp") nextIdx = activeIdx < 0 ? 0 : Math.max(0, activeIdx - 1);
                          else if (e.key === "Home") nextIdx = 0;
                          else if (e.key === "End") nextIdx = items.length - 1;
                          if (nextIdx !== activeIdx) {
                            e.preventDefault();
                            const target = items[nextIdx];
                            target?.focus();
                            // Plynne wyrównanie fokusowanego elementu w widoku scrollowalnym.
                            target?.scrollIntoView({ block: "nearest" });
                            // Zapamiętaj klucz wskazany strzałkami → użyte do dodatkowego ringa
                            // i badge "klawiatura". Read z data-attr (set'owany w renderze button'a).
                            const k = target?.getAttribute("data-key");
                            if (k) setKeyboardActiveKey(k);
                          }
                        }}
                      >
                        {filtered.map(({ key, i }, listIdx) => {
                          const [ip, ua] = key.split("::");
                          // Lookup count z webhookRetryStats.sources (deterministycznie po ip+ua).
                          const sourceMeta = webhookRetryStats.sources.find(
                            (s) => s.ip === ip && s.ua === ua,
                          );
                          const isExact = i === 0;
                          // "next" cursor wskazuje który wiersz zostanie podświetlony następnym
                          // skokiem — wyróżnij go w liście (żeby user widział, gdzie "stoi").
                          const isNextCursor = i === inspectJumpIndex % total;
                          // Klawiatura: wskaźnik strzałek (gdzie stoi fokus po ArrowUp/Down).
                          // Czyszczony po Enterze/kliknięciu — pokazuje INTENT przed skokiem.
                          const isKeyboardActive = key === keyboardActiveKey;
                          // Roving tabindex: tylko jeden element w liście jest "tabbable".
                          // Preferujemy isNextCursor (jeśli widoczny po filtrze), inaczej pierwszy.
                          const hasCursorInList = filtered.some((f) => f.i === inspectJumpIndex % total);
                          const isRovingActive = hasCursorInList ? isNextCursor : listIdx === 0;
                          return (
                            <button
                              key={key}
                              type="button"
                              data-list-item="true"
                              data-key={key}
                              tabIndex={isRovingActive ? 0 : -1}
                              onClick={() => {
                                // Skok do konkretnego indeksu (offset = różnica od aktualnego kursora).
                                const offset = i - (inspectJumpIndex % total);
                                performJumpToMatch(offset);
                                // Po wykonaniu skoku (Enter / Space / klik) czyścimy wskaźnik
                                // klawiatury — intent się zmaterializował, badge nie ma już sensu.
                                setKeyboardActiveKey(null);
                              }}
                              className={`group relative w-full flex items-center gap-2 pl-3 pr-3 py-1.5 text-left text-xs transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset ${
                                // "Bieżący" element (do którego trafi NASTĘPNE Enter/J — ten sam stan co
                                // licznik "Następne: X/Y" w nagłówku). Mocne tło + lewy gold border-bar
                                // (przez pseudo via className `before:`) — wizualnie spójne z licznikiem,
                                // żeby user od razu widział "co wykonam Enterem".
                                isNextCursor
                                  ? "bg-primary/20 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary"
                                  : ""
                              } ${
                                // Dodatkowy ring dla aktywnego klawiaturą wiersza (poza focus-visible),
                                // żeby był widoczny też wtedy, gdy focus ring jest słabo kontrastowy
                                // na bg-primary/15. Inset, żeby nie wychodził za kontener.
                                isKeyboardActive ? "ring-2 ring-primary ring-inset bg-primary/10" : ""
                              }`}
                              aria-current={isNextCursor ? "true" : undefined}
                              title={`${isNextCursor ? "[BIEŻĄCE] " : ""}Skocz do dopasowania ${i + 1} z ${total}${isExact ? " (wiersz źródłowy)" : ""} — Enter`}
                            >
                              <span
                                className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-mono font-semibold ${
                                  isExact
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                } ${isNextCursor ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                              >
                                {i + 1}
                              </span>
                              <span className={`flex-1 truncate font-mono ${isNextCursor ? "text-foreground font-semibold" : "text-foreground"}`}>{ip}</span>
                              <span className="shrink-0 text-muted-foreground hidden sm:inline truncate max-w-[180px]">
                                {ua === "—" ? "—" : ua.split(" ")[0]}
                              </span>
                              {sourceMeta && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px] font-normal h-5 px-1.5 border-border/60"
                                  title={`${sourceMeta.count} retry'ów`}
                                >
                                  {sourceMeta.count}
                                </Badge>
                              )}
                              {/* Badge "X/Y → Enter" pojawia się TYLKO na bieżącym kursorze i pokazuje
                                  ten sam licznik co nagłówek + wskazówkę co wykona Enter. Ukryty gdy
                                  isKeyboardActive (wtedy ⌨ Enter badge poniżej spełnia tę rolę). */}
                              {isNextCursor && !isKeyboardActive && (
                                <Badge
                                  className="shrink-0 text-[10px] font-mono font-semibold h-5 px-1.5 bg-primary text-primary-foreground hover:bg-primary"
                                  title={`Bieżące dopasowanie (${i + 1}/${total}) — Enter / J / klik wykona skok`}
                                >
                                  {i + 1}/{total} → Enter
                                </Badge>
                              )}
                              {isKeyboardActive && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px] font-normal h-5 px-1.5 border-primary/60 text-primary"
                                  title="Aktywny strzałkami — Enter wykona skok"
                                >
                                  ⌨ Enter
                                </Badge>
                              )}
                              {isNextCursor && (
                                <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>
            );
          })()}

          {inspectRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Brak rekordów dla tej kombinacji w ostatnich 24h.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={inspectQuery}
                    onChange={(e) => setInspectQuery(e.target.value)}
                    placeholder="Filtruj po metadata (np. tokenPreview, method, fragment ID)…"
                    className="h-8 pl-8 pr-8 text-xs"
                  />
                  {inspectQuery && (
                    <button
                      type="button"
                      onClick={() => setInspectQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Wyczyść filtr"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 shrink-0 text-xs"
                  onClick={() => setInspectSort((s) => (s === "desc" ? "asc" : "desc"))}
                  title={inspectSort === "desc" ? "Pokaż najstarsze pierwsze" : "Pokaż najnowsze pierwsze"}
                >
                  {inspectSort === "desc" ? (
                    <>
                      <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                      Najnowsze
                    </>
                  ) : (
                    <>
                      <ArrowUpWideNarrow className="h-3.5 w-3.5" />
                      Najstarsze
                    </>
                  )}
                </Button>
              </div>
              {inspectFilteredRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Brak rekordów pasujących do „{inspectQuery}”.
                </p>
              ) : (
                <ScrollArea className="flex-1 -mx-6 px-6 max-h-[55vh]">
                  <div className="space-y-2 py-2">
                    {inspectFilteredRecords.map((r) => {
                      const retryAfter =
                        typeof r.metadata?.retryAfterSec === "number"
                          ? (r.metadata.retryAfterSec as number)
                          : null;
                      return (
                        <div key={r.id} className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-muted-foreground">
                              {new Date(r.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "medium" })}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: pl })}
                            </span>
                          </div>
                          {retryAfter !== null && (
                            <Badge variant="outline" className="text-[10px]">
                              retry-after: {retryAfter}s
                            </Badge>
                          )}
                          <div className="font-mono text-[11px] bg-background border border-border rounded p-2 overflow-x-auto">
                            <MetadataView data={r.metadata ?? {}} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      {jumpLabel && (
        <JumpLabel
          el={jumpLabel.el}
          ordinal={jumpLabel.ordinal}
          total={jumpLabel.total}
          expiresAt={jumpLabel.expiresAt}
        />
      )}
    </>
  );
};

export default AdminSystemHealth;
