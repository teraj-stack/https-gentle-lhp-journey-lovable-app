/**
 * Admin: edytor alt + figcaption dla VenousInsufficiencyImage.
 * Zakres: 4 strony × 2 sloty (main + perforator) = 8 grafik.
 *
 * Architektura jest zbieżna z dev-only /dev/vein-images-preview:
 *  - Defaulty (PRESETS) jako fallback i punkt odniesienia "Reset do propsów".
 *  - CMS overrides (vein_image_overrides) jako autorytatywne źródło,
 *    nadpisuje propsy podczas renderu produkcyjnego.
 *  - Walidacja serwerowa (trigger validate_vein_image_override) lustruje
 *    walidację w UI: alt 60–220, caption ≤110, segment „·" ≤40.
 *
 * Dostęp: tylko admin (RLS). Publika nadal może czytać overrides.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  VEIN_IMAGE_QUERY_KEY,
  useVeinImageOverridesForPage,
  type VeinImagePageKey,
  type VeinImageSlot,
} from "@/hooks/useVeinImageOverrides";
import {
  VEIN_IMAGE_PAGE_PRESETS,
  type VeinImagePagePreset,
} from "@/lib/veinImagePagePresets";
import {
  useVeinImageOverrideHistory,
  VEIN_IMAGE_HISTORY_QUERY_KEY,
  type VeinImageOverrideHistoryRow,
} from "@/hooks/useVeinImageOverrideHistory";
import VenousInsufficiencyImage from "@/components/shared/VenousInsufficiencyImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, ShieldAlert, Save, RotateCcw, Database, FileJson, FileSpreadsheet, Trash2, Clock, User, History, Upload, CheckCircle2, AlertTriangle, FileWarning, Search, X, ClipboardCopy, Check, FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";

const ALT_MIN = 60;
const ALT_BUDGET = 220;
const CAPTION_BUDGET = 110;
const SEGMENT_BUDGET = 40;

/**
 * Zwraca polski względny czas (np. „3 godz. temu", „wczoraj", „przed chwilą").
 * Używa Intl.RelativeTimeFormat — zero-dep, działa w SSR i w przeglądarce.
 */
const RELATIVE_FMT = new Intl.RelativeTimeFormat("pl", { numeric: "auto" });
const formatRelativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return RELATIVE_FMT.format(Math.round(diffSec / 1), "second");
  if (abs < 3600) return RELATIVE_FMT.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return RELATIVE_FMT.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 7) return RELATIVE_FMT.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 30) return RELATIVE_FMT.format(Math.round(diffSec / (86400 * 7)), "week");
  if (abs < 86400 * 365) return RELATIVE_FMT.format(Math.round(diffSec / (86400 * 30)), "month");
  return RELATIVE_FMT.format(Math.round(diffSec / (86400 * 365)), "year");
};

interface DraftFields {
  mainAlt: string;
  mainCaption: string;
  perforatorAlt: string;
  perforatorCaption: string;
}

const presetToDraft = (p: VeinImagePagePreset): DraftFields => ({
  mainAlt: p.mainAlt,
  mainCaption: p.mainCaption,
  perforatorAlt: p.perforatorAlt,
  perforatorCaption: p.perforatorCaption,
});

// Logika zapisu + mapowanie błędów żyje w `@/lib/veinImageSave` jako single
// source of truth (testowane w Vitest bez mountowania całego panelu admin).
import { performSaveSlot, describeSaveError } from "@/lib/veinImageSave";

/**
 * Minimalny parser CSV zgodny z RFC 4180:
 *  - cudzysłowy do eskejpowania pól z przecinkiem/nową linią,
 *  - "" w obrębie pola = literalny ",
 *  - akceptuje BOM (\uFEFF) i końce linii \r\n / \n.
 *  - Tolerancyjny na trailing newline.
 */
const parseCsv = (raw: string): string[][] => {
  const text = raw.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\r") {
        // ignore — \n closes row
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  // Flush last field/row jeśli plik nie kończy się \n.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Filtruj puste linie końcowe.
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""));
};

/**
 * Mapuje nieoczywiste warianty nagłówków CSV na 4 kanoniczne pola
 * (page_key/slot/alt/caption). Pozwala adminowi importować pliki edytowane
 * w Excelu/Google Sheets, które często „normalizują" nazwy kolumn:
 *  - „Page Key" / „page-key" / „PAGE_KEY" / „Strona" → page_key
 *  - „Slot" / „Wariant" / „Typ"                      → slot
 *  - „Alt" / „Alt text" / „Opis alternatywny"        → alt
 *  - „Caption" / „Podpis" / „Figcaption"             → caption
 *
 * Normalizacja: lower-case + usuwanie spacji/myślników/podkreśleń → klucz
 * porównania; każdy wariant jest „przyklejony" do tego samego klucza.
 *
 * Zwraca:
 *  - `indices`: index kolumny per kanoniczne pole (–1 jeśli nie znaleziono),
 *  - `matchedHeader`: oryginalna etykieta z CSV, którą rozpoznaliśmy
 *    (do toastu „Rozpoznano nagłówki: Page Key → page_key"); pusty string,
 *    gdy pole nie zostało znalezione.
 */
const CANONICAL_FIELDS = ["page_key", "slot", "alt", "caption"] as const;
type CanonicalField = (typeof CANONICAL_FIELDS)[number];

const normalizeHeaderToken = (s: string): string =>
  s
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    // collapse separator characters: spaces, dashes, underscores, dots
    .replace(/[\s_\-.]+/g, "");

const HEADER_ALIASES: Record<CanonicalField, readonly string[]> = {
  page_key: [
    "pagekey",
    "page",
    "pageid",
    "key",
    "strona",
    "stronaklucz",
    "kluczstrony",
  ],
  slot: ["slot", "wariant", "typ", "type", "variant", "rodzaj"],
  alt: ["alt", "alttext", "altattribute", "opisalternatywny", "altopis"],
  caption: [
    "caption",
    "figcaption",
    "podpis",
    "podpisobrazka",
    "opis",
    "description",
  ],
};

interface CsvHeaderMapping {
  indices: Record<CanonicalField, number>;
  matchedHeader: Record<CanonicalField, string>;
}

const resolveCsvHeaderMapping = (rawHeader: readonly string[]): CsvHeaderMapping => {
  const indices: Record<CanonicalField, number> = {
    page_key: -1,
    slot: -1,
    alt: -1,
    caption: -1,
  };
  const matchedHeader: Record<CanonicalField, string> = {
    page_key: "",
    slot: "",
    alt: "",
    caption: "",
  };
  // Mapa znormalizowany_token → kanoniczne pole (zbudowana raz).
  const aliasMap = new Map<string, CanonicalField>();
  for (const field of CANONICAL_FIELDS) {
    aliasMap.set(normalizeHeaderToken(field), field);
    for (const alias of HEADER_ALIASES[field]) {
      aliasMap.set(alias, field);
    }
  }
  rawHeader.forEach((cell, i) => {
    const norm = normalizeHeaderToken(cell);
    const field = aliasMap.get(norm);
    if (!field) return;
    // First-match-wins per field — chroni przed sytuacją gdzie obie kolumny
    // „caption" i „opis" są w pliku (bardzo nieprawdopodobne, ale safe).
    if (indices[field] === -1) {
      indices[field] = i;
      matchedHeader[field] = cell.trim();
    }
  });
  return { indices, matchedHeader };
};


const VALID_PAGE_KEYS = new Set<VeinImagePageKey>(
  VEIN_IMAGE_PAGE_PRESETS.map((p) => p.key),
);
const VALID_SLOTS: VeinImageSlot[] = ["main", "perforator"];

/**
 * Strukturalna walidacja per-pole — pozwala preview podświetlać konkretne
 * pola (alt/caption) zamiast tylko wyświetlać tekstowe komunikaty.
 *
 * `kind`:
 *  - "empty"   — pole puste (alt/caption),
 *  - "tooShort"— wartość poniżej minimum (alt < ALT_MIN),
 *  - "tooLong" — wartość powyżej maksimum (alt > ALT_BUDGET, caption > CAPTION_BUDGET),
 *  - "segment" — pojedynczy segment caption przekracza SEGMENT_BUDGET.
 */
type FieldIssueField = "alt" | "caption";
type FieldIssueKind = "empty" | "tooShort" | "tooLong" | "segment";

interface FieldIssue {
  field: FieldIssueField;
  kind: FieldIssueKind;
  message: string;
  /** Dla "segment" — fragment naruszający limit (skrócony do podglądu). */
  segment?: string;
  /** Dla "segment" — pełna długość znaków segmentu. */
  segmentLength?: number;
}

/** Te same reguły co trigger Postgres `validate_vein_image_override`. */
const validateImportRowFields = (alt: string, caption: string): FieldIssue[] => {
  const issues: FieldIssue[] = [];
  if (alt.length === 0) {
    issues.push({ field: "alt", kind: "empty", message: `alt jest pusty (wymagane ${ALT_MIN}–${ALT_BUDGET} zn.)` });
  } else if (alt.length < ALT_MIN) {
    issues.push({ field: "alt", kind: "tooShort", message: `alt za krótki: ${alt.length}/${ALT_MIN}–${ALT_BUDGET} zn.` });
  } else if (alt.length > ALT_BUDGET) {
    issues.push({ field: "alt", kind: "tooLong", message: `alt za długi: ${alt.length}/${ALT_MIN}–${ALT_BUDGET} zn.` });
  }
  if (caption.length === 0) {
    issues.push({ field: "caption", kind: "empty", message: `caption jest pusty (limit ≤${CAPTION_BUDGET} zn.)` });
  } else if (caption.length > CAPTION_BUDGET) {
    issues.push({ field: "caption", kind: "tooLong", message: `caption za długi: ${caption.length}/≤${CAPTION_BUDGET} zn.` });
  }
  for (const seg of caption.split(" · ")) {
    if (seg.length > SEGMENT_BUDGET) {
      const preview = `${seg.slice(0, 24)}${seg.length > 24 ? "…" : ""}`;
      issues.push({
        field: "caption",
        kind: "segment",
        message: `segment "${preview}" ${seg.length}/≤${SEGMENT_BUDGET} zn.`,
        segment: preview,
        segmentLength: seg.length,
      });
    }
  }
  return issues;
};

/** Wstecznie kompatybilny adapter — używany tylko przez stare ścieżki. */
const validateImportRow = (alt: string, caption: string): string[] =>
  validateImportRowFields(alt, caption).map((i) => i.message);

type ImportRowStatus = "create" | "update" | "noop" | "error";

/**
 * Strategia obsługi duplikatów `page_key+slot` w pliku CSV:
 *  - "first": pierwsze wystąpienie wygrywa (default — backward compatible).
 *    Kolejne duplikaty lądują z `status: "error"` i nie są commitowane.
 *  - "last": ostatnie wystąpienie wygrywa. Wcześniejsze duplikaty dostają
 *    `status: "noop"` z notką "nadpisany przez linię X" (nie blokują importu,
 *    nie są commitowane — ich miejsce zajmie późniejszy wpis).
 *
 * Wybór jest reaktywny w dialogu preview — admin widzi natychmiast jak
 * zmienia się rozkład create/update/noop/error po przełączeniu radio.
 */
type DedupStrategy = "first" | "last";

interface ImportRow {
  /** 1-based linia w pliku CSV (header = 1, dane od 2). */
  line: number;
  pageKey: VeinImagePageKey | null;
  slot: VeinImageSlot | null;
  alt: string;
  caption: string;
  status: ImportRowStatus;
  errors: string[];
  /** Strukturalne błędy per-pole (alt/caption) — pozwalają preview podświetlać konkretne pola. */
  fieldIssues: FieldIssue[];
  /** Aktualne wartości w bazie — do prezentacji diffu. */
  currentAlt?: string;
  currentCaption?: string;
}

/**
 * Surowy wiersz pliku przed deduplikacją — pojedynczy parsing run trzymamy
 * w stanie dialogu (pre-dedup), żeby przełącznik strategii „pierwszy/ostatni"
 * mógł reaktywnie przeliczać preview bez ponownego czytania pliku.
 */
interface ParsedImportRow {
  line: number;
  pageKey: VeinImagePageKey | null;
  slot: VeinImageSlot | null;
  alt: string;
  caption: string;
  /** Błędy NIEzwiązane z duplikatem (validacja pól, nieznany page_key/slot). */
  baseErrors: string[];
  /** Strukturalne błędy walidacji per-pole (alt/caption). */
  fieldIssues: FieldIssue[];
  currentAlt?: string;
  currentCaption?: string;
}

/**
 * Stosuje wybraną strategię dedupu do listy ParsedImportRow i mapuje wynik
 * na ImportRow z finalnym statusem (create/update/noop/error).
 *
 * Algorithm:
 *  1. Skanuje wiersze w kolejności pliku, zbiera mapę `winner per pageKey:slot`:
 *     - "first" → pierwszy wygrywa (kolejne to duplikaty),
 *     - "last"  → ostatni wygrywa (wcześniejsze to duplikaty).
 *  2. Drugi pass produkuje ImportRow:
 *     - winner z błędami pól → "error",
 *     - winner bez current → "create",
 *     - winner == current   → "noop",
 *     - winner != current   → "update",
 *     - duplikat (loser):
 *       - dla "first" → "error" z notką „duplikat — wygrał wpis z linii X",
 *       - dla "last"  → "noop"  (nadpisany przez wpis z linii X).
 */
const applyDedupStrategy = (
  parsed: readonly ParsedImportRow[],
  strategy: DedupStrategy,
): ImportRow[] => {
  const winnerLine = new Map<string, number>();
  for (const row of parsed) {
    if (!row.pageKey || !row.slot) continue;
    const key = `${row.pageKey}:${row.slot}`;
    if (strategy === "first") {
      if (!winnerLine.has(key)) winnerLine.set(key, row.line);
    } else {
      winnerLine.set(key, row.line);
    }
  }

  return parsed.map<ImportRow>((row) => {
    const errors = [...row.baseErrors];
    const key = row.pageKey && row.slot ? `${row.pageKey}:${row.slot}` : null;
    const winner = key ? winnerLine.get(key) : undefined;
    const isWinner = winner === row.line;
    const isDuplicate = key !== null && winner !== undefined && !isWinner;

    if (isDuplicate && strategy === "first") {
      errors.push(`duplikat page_key+slot — wygrał wpis z linii ${winner}`);
    }

    let status: ImportRowStatus;
    if (errors.length > 0) {
      status = "error";
    } else if (isDuplicate) {
      // last-wins, brak błędów pól → ten wpis ignorujemy na rzecz późniejszego.
      status = "noop";
    } else {
      const current =
        row.currentAlt !== undefined || row.currentCaption !== undefined
          ? { alt: row.currentAlt ?? "", caption: row.currentCaption ?? "" }
          : undefined;
      if (!current) status = "create";
      else if (current.alt === row.alt && current.caption === row.caption) status = "noop";
      else status = "update";
    }

    return {
      line: row.line,
      pageKey: row.pageKey,
      slot: row.slot,
      alt: row.alt,
      caption: row.caption,
      status,
      errors,
      fieldIssues: row.fieldIssues,
      currentAlt: row.currentAlt,
      currentCaption: row.currentCaption,
    };
  });
};

interface FieldStats {
  length: number;
  budget: number;
  overBudget: boolean;
  underMin: boolean;
  /** Lista czytelnych komunikatów błędu — pusta = pole valid. */
  errors: string[];
  segments?: { text: string; length: number; overBudget: boolean }[];
}

const buildStats = (
  value: string,
  budget: number,
  isCaption: boolean,
  fieldLabel: string,
): FieldStats => {
  const length = value.length;
  const errors: string[] = [];
  const overBudget = length > budget;
  const underMin = !isCaption && length < ALT_MIN;

  if (underMin) {
    errors.push(
      `${fieldLabel}: min ${ALT_MIN} znaków (brakuje ${ALT_MIN - length}).`,
    );
  }
  if (overBudget) {
    errors.push(
      `${fieldLabel}: max ${budget} znaków (przekroczone o ${length - budget}).`,
    );
  }

  let segments: FieldStats["segments"];
  if (isCaption) {
    segments = value.split("·").map((segment) => {
      const text = segment.trim();
      return {
        text,
        length: text.length,
        overBudget: text.length > SEGMENT_BUDGET,
      };
    });
    const overSegments = segments.filter((s) => s.overBudget);
    if (overSegments.length > 0) {
      const list = overSegments
        .map((s) => `"${s.text.slice(0, 24)}${s.text.length > 24 ? "…" : ""}" (${s.length})`)
        .join(", ");
      errors.push(
        `Segment „·" max ${SEGMENT_BUDGET} znaków. Za długie: ${list}.`,
      );
    }
  }

  return { length, budget, overBudget, underMin, errors, segments };
};

const StatsBadge = ({ stats }: { stats: FieldStats }) => {
  const hasError = stats.errors.length > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono ${
        hasError
          ? "bg-destructive/15 text-destructive border border-destructive/30"
          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      }`}
      title={hasError ? stats.errors.join(" ") : "OK — w limitach bazy"}
      aria-live="polite"
    >
      {stats.length}/{stats.budget}
      {stats.underMin && " ↓"}
      {stats.overBudget && " ↑"}
      {!hasError && " ✓"}
    </span>
  );
};

const ErrorList = ({
  errors,
  id,
}: {
  errors: string[];
  id: string;
}) => {
  if (errors.length === 0) return null;
  return (
    <ul
      id={id}
      role="alert"
      aria-live="polite"
      className="mt-1.5 space-y-0.5 text-[11px] text-destructive"
    >
      {errors.map((err, idx) => (
        <li key={idx} className="flex items-start gap-1.5 leading-snug">
          <span aria-hidden className="mt-0.5">⚠</span>
          <span>{err}</span>
        </li>
      ))}
    </ul>
  );
};

const SegmentList = ({
  segments,
}: {
  segments: NonNullable<FieldStats["segments"]>;
}) => (
  <ul className="mt-2 grid gap-1 text-[11px]" aria-label="Segmenty figcaption">
    {segments.map((segment, idx) => (
      <li
        key={`${segment.text}-${idx}`}
        className={`flex items-center justify-between gap-2 rounded border px-2 py-1 ${
          segment.overBudget
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border/30 bg-card/40 text-foreground/80"
        }`}
      >
        <span className="truncate font-mono">{segment.text || <em className="opacity-60">pusty</em>}</span>
        <span className="font-mono shrink-0">
          {segment.length}/{SEGMENT_BUDGET}
        </span>
      </li>
    ))}
  </ul>
);

type ViewportMode = "mobile" | "desktop";

const VIEWPORTS: Record<ViewportMode, { width: number; label: string }> = {
  mobile: { width: 375, label: "Mobile · 375px" },
  desktop: { width: 1280, label: "Desktop · 1280px" },
};


/**
 * Etykieta dla typu akcji w historii — krótkie, czytelne polskie opisy.
 */
const ACTION_LABEL: Record<VeinImageOverrideHistoryRow["action"], string> = {
  insert: "utworzono",
  update: "zmieniono",
  delete: "usunięto",
};

interface HistoryPopoverProps {
  pageKey: VeinImagePageKey;
  slot: VeinImageSlot;
  /** Wywoływane po kliknięciu „Przywróć" — rodzic robi update do bazy. */
  onRestore: (row: VeinImageOverrideHistoryRow) => void | Promise<void>;
  restoring: boolean;
}

/**
 * Popover z listą wcześniejszych wersji alt+caption dla danego slotu.
 * Każdy wiersz = snapshot w czasie. Klik „Przywróć" zwraca dane do rodzica,
 * który nadpisuje aktualny override (i sam logujący trigger zapisze nową wersję).
 */
const HistoryPopover = ({ pageKey, slot, onRestore, restoring }: HistoryPopoverProps) => {
  const [open, setOpen] = useState(false);
  // enabled tylko gdy popover otwarty — nie blokujemy bazy zapytaniami w tle.
  const { data, isLoading, error } = useVeinImageOverrideHistory(pageKey, slot, open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Pokaż historię wersji tego slotu"
        >
          <History className="w-3.5 h-3.5 mr-1" />
          Historia
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <div className="px-3 py-2 border-b border-border/40">
          <p className="text-xs font-semibold text-foreground/90">
            Historia wersji — {slot === "main" ? "główny obraz" : "perforator"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Najnowsze pierwsze · max 50 wpisów · klik „Przywróć" nadpisuje bieżący override
          </p>
        </div>
        <ScrollArea className="max-h-[420px]">
          <div className="p-2 space-y-2">
            {isLoading && (
              <p className="text-[11px] text-muted-foreground py-3 text-center">
                Ładowanie historii…
              </p>
            )}
            {error && (
              <p className="text-[11px] text-destructive py-3 text-center">
                Błąd pobierania historii: {error instanceof Error ? error.message : String(error)}
              </p>
            )}
            {!isLoading && !error && (data?.length ?? 0) === 0 && (
              <p className="text-[11px] text-muted-foreground py-3 text-center italic">
                Brak wpisów historii dla tego slotu.
              </p>
            )}
            {data?.map((row, idx) => {
              const isCurrent = idx === 0;
              return (
                <div
                  key={row.id}
                  className="rounded-md border border-border/40 bg-card/40 p-2 space-y-1.5 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono shrink-0 ${
                          row.action === "insert"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : row.action === "update"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-destructive/15 text-destructive border border-destructive/30"
                        }`}
                      >
                        {ACTION_LABEL[row.action]}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono bg-primary/15 text-primary border border-primary/30 shrink-0">
                          najnowszy
                        </span>
                      )}
                      <span className="text-muted-foreground truncate" title={row.updated_by ?? "system"}>
                        {row.updated_by ?? "system"}
                      </span>
                    </div>
                    <time
                      dateTime={row.recorded_at}
                      title={new Date(row.recorded_at).toLocaleString("pl-PL", { dateStyle: "full", timeStyle: "medium" })}
                      className="text-[10px] text-muted-foreground font-mono shrink-0"
                    >
                      {new Date(row.recorded_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
                    </time>
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground/80 select-none text-[10px]">
                      podgląd treści ({row.alt.length} alt · {row.caption.length} cap)
                    </summary>
                    <div className="mt-1.5 space-y-1 font-mono text-[10px]">
                      <div className="rounded border border-border/30 bg-background/40 p-1.5">
                        <span className="text-muted-foreground">alt:</span>{" "}
                        <span className="text-foreground/85 break-words">{row.alt}</span>
                      </div>
                      <div className="rounded border border-border/30 bg-background/40 p-1.5">
                        <span className="text-muted-foreground">caption:</span>{" "}
                        <span className="text-foreground/85 break-words">{row.caption}</span>
                      </div>
                    </div>
                  </details>
                  <div className="flex items-center justify-end pt-0.5">
                    <Button
                      size="sm"
                      variant={isCurrent ? "ghost" : "outline"}
                      disabled={isCurrent || restoring}
                      onClick={async () => {
                        await onRestore(row);
                        setOpen(false);
                      }}
                      title={
                        isCurrent
                          ? "To jest aktualnie zapisana wersja"
                          : "Przywróć ten alt/caption do bazy"
                      }
                      className="h-7 text-[10px]"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      {isCurrent ? "Aktualna" : restoring ? "Przywracanie…" : "Przywróć"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

const AdminVeinImages = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [activeKey, setActiveKey] = useState<VeinImagePageKey>(
    VEIN_IMAGE_PAGE_PRESETS[0]!.key,
  );
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [saving, setSaving] = useState<VeinImageSlot | null>(null);
  const [exporting, setExporting] = useState<"json" | "csv" | "json-copy" | null>(null);
  // Krótki „✓ Skopiowano" feedback na przycisku kopiowania (2 s).
  const [jsonCopied, setJsonCopied] = useState(false);
  /**
   * Filtry eksportu — pozwalają pobrać podzbiór overrides zamiast całej tabeli.
   * "all" = bez filtra (dotychczasowe zachowanie). Filtr jest stosowany lokalnie
   * po `fetchAllOverrides()`, więc nie wymaga zmian w zapytaniu i działa też dla
   * snapshotów eksportu (np. user może wziąć tylko sloty `perforator` ze
   * wszystkich stron, albo tylko stronę `hemoroidy` z oboma slotami).
   *
   * Suffiks pliku zawiera aktywne filtry — łatwiej rozpoznać który eksport jest który.
   */
  const [exportPageKey, setExportPageKey] = useState<"all" | VeinImagePageKey>(
    "all",
  );
  const [exportSlot, setExportSlot] = useState<"all" | VeinImageSlot>("all");
  const [resettingAll, setResettingAll] = useState(false);
  /** Bump po każdym udanym zapisie — wymusza remount podglądu CMS (force-fresh render). */
  const [savedTick, setSavedTick] = useState(0);
  /** Timestamp + slot ostatniego zapisu — driver krótkiego flash highlightu. */
  const [lastSaved, setLastSaved] = useState<{
    at: number;
    slot: VeinImageSlot;
    pageKey: VeinImagePageKey;
  } | null>(null);
  /** Tryb podglądu: draft (live edycja) vs cms (to co jest w bazie po zapisie). */
  const [previewMode, setPreviewMode] = useState<"draft" | "cms">("draft");
  /** Klucz: `${pageKey}:${slot}` — slot, dla którego trwa rollback z historii. */
  const [restoringSlot, setRestoringSlot] = useState<string | null>(null);
  /** Ukryty <input type="file"> — trigger przez Button. */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /**
   * Otwarty dialog z preview parsowanego CSV.
   * Trzymamy `parsedRows` (pre-dedup) — finalna lista `ImportRow` jest
   * derywowana memoicznie z `parsedRows × dedupStrategy`, co pozwala na
   * reaktywne przełączanie strategii bez ponownego parsowania pliku.
   */
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    parsedRows: ParsedImportRow[];
  } | null>(null);
  /** Strategia dedupu duplikatów page_key+slot w pliku CSV (domyślnie „first"). */
  const [dedupStrategy, setDedupStrategy] = useState<DedupStrategy>("first");
  const [importing, setImporting] = useState(false);
  /** Wyszukiwarka — filtruje strony po label/key oraz po treści alt/caption draftu. */
  const [searchQuery, setSearchQuery] = useState("");
  /** Filtr slotów — pokaż tylko main, tylko perforator albo oba. */
  const [slotFilter, setSlotFilter] = useState<"all" | VeinImageSlot>("all");

  const active = useMemo(
    () =>
      VEIN_IMAGE_PAGE_PRESETS.find((p) => p.key === activeKey) ??
      VEIN_IMAGE_PAGE_PRESETS[0]!,
    [activeKey],
  );

  /**
   * Finalna lista wierszy preview po zastosowaniu strategii dedupu.
   * Reaktywna względem `dedupStrategy` — zmiana radio przelicza statusy
   * (np. duplikaty z „error" na „noop") bez ponownego parsowania pliku.
   */
  const importPreviewRows = useMemo<ImportRow[]>(
    () =>
      importPreview ? applyDedupStrategy(importPreview.parsedRows, dedupStrategy) : [],
    [importPreview, dedupStrategy],
  );
  const [drafts, setDrafts] = useState<Record<VeinImagePageKey, DraftFields>>(
    () =>
      VEIN_IMAGE_PAGE_PRESETS.reduce(
        (acc, p) => {
          acc[p.key] = presetToDraft(p);
          return acc;
        },
        {} as Record<VeinImagePageKey, DraftFields>,
      ),
  );

  const draft = drafts[activeKey];
  const overrides = useVeinImageOverridesForPage(activeKey);
  const lastSeededKey = useRef<VeinImagePageKey | null>(null);

  /**
   * Strony pasujące do wyszukiwarki + filtra slotu.
   * - Pusta query → wszystkie strony.
   * - Dopasowanie po: label, key i treści draftu (alt/caption) per slot.
   * - slotFilter zawęża pole „treść" do jednego slotu (main/perforator).
   */
  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return VEIN_IMAGE_PAGE_PRESETS.filter((preset) => {
      if (!q) return true;
      const d = drafts[preset.key];
      const haystack: string[] = [preset.label.toLowerCase(), preset.key.toLowerCase()];
      if (slotFilter === "all" || slotFilter === "main") {
        haystack.push(d.mainAlt.toLowerCase(), d.mainCaption.toLowerCase());
      }
      if (slotFilter === "all" || slotFilter === "perforator") {
        haystack.push(d.perforatorAlt.toLowerCase(), d.perforatorCaption.toLowerCase());
      }
      return haystack.some((s) => s.includes(q));
    });
  }, [searchQuery, slotFilter, drafts]);

  /** Auto-przełącz na pierwszą pasującą stronę, jeśli aktywna wypadła z filtra. */
  useEffect(() => {
    if (filteredPresets.length === 0) return;
    if (!filteredPresets.some((p) => p.key === activeKey)) {
      setActiveKey(filteredPresets[0]!.key);
      lastSeededKey.current = null;
    }
  }, [filteredPresets, activeKey]);

  const visibleSlots = useMemo<VeinImageSlot[]>(
    () => (slotFilter === "all" ? ["main", "perforator"] : [slotFilter]),
    [slotFilter],
  );

  const isFilterActive = searchQuery.trim().length > 0 || slotFilter !== "all";

  // Auth bootstrap (mirror of AdminDashboard pattern).
  useEffect(() => {
    let isMounted = true;

    const apply = (next: Session | null) => {
      if (!isMounted) return;
      setSession(next);
      setAuthLoading(false);
      if (!next) navigate("/admin/login", { replace: true });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT") apply(null);
      else apply(next);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: current } }) => apply(current));

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Seed draft from DB once per page when override arrives, only if pristine.
  useEffect(() => {
    if (lastSeededKey.current === activeKey) return;
    if (!overrides.main && !overrides.perforator) return;
    const preset = VEIN_IMAGE_PAGE_PRESETS.find((p) => p.key === activeKey);
    if (!preset) return;
    setDrafts((prev) => {
      const cur = prev[activeKey];
      const isPristine =
        cur.mainAlt === preset.mainAlt &&
        cur.mainCaption === preset.mainCaption &&
        cur.perforatorAlt === preset.perforatorAlt &&
        cur.perforatorCaption === preset.perforatorCaption;
      if (!isPristine) return prev;
      return {
        ...prev,
        [activeKey]: {
          mainAlt: overrides.main?.alt ?? preset.mainAlt,
          mainCaption: overrides.main?.caption ?? preset.mainCaption,
          perforatorAlt: overrides.perforator?.alt ?? preset.perforatorAlt,
          perforatorCaption:
            overrides.perforator?.caption ?? preset.perforatorCaption,
        },
      };
    });
    lastSeededKey.current = activeKey;
  }, [activeKey, overrides.main, overrides.perforator]);

  // Po 1.6s wygaszamy flash highlight border (lastSaved zostaje, ale border wraca do default).
  const [flashOn, setFlashOn] = useState(false);
  useEffect(() => {
    if (!lastSaved) return;
    setFlashOn(true);
    const t = setTimeout(() => setFlashOn(false), 1600);
    return () => clearTimeout(t);
  }, [lastSaved]);

  const stats = useMemo(
    () => ({
      mainAlt: buildStats(draft.mainAlt, ALT_BUDGET, false, "alt główny"),
      mainCaption: buildStats(
        draft.mainCaption,
        CAPTION_BUDGET,
        true,
        "figcaption główny",
      ),
      perforatorAlt: buildStats(
        draft.perforatorAlt,
        ALT_BUDGET,
        false,
        "alt perforator",
      ),
      perforatorCaption: buildStats(
        draft.perforatorCaption,
        CAPTION_BUDGET,
        true,
        "figcaption perforator",
      ),
    }),
    [draft],
  );

  /** Mapa „czy slot ma jakikolwiek błąd walidacji?" — używana do disabled na Save. */
  const slotHasErrors = useMemo(
    () => ({
      main:
        stats.mainAlt.errors.length > 0 || stats.mainCaption.errors.length > 0,
      perforator:
        stats.perforatorAlt.errors.length > 0 ||
        stats.perforatorCaption.errors.length > 0,
    }),
    [stats],
  );

  const updateDraft = (field: keyof DraftFields, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [activeKey]: { ...prev[activeKey], [field]: value },
    }));
  };

  const resetToProps = () => {
    setDrafts((prev) => ({ ...prev, [activeKey]: presetToDraft(active) }));
    toast.success(`Przywrócono propsy źródłowe — ${active.label}`);
  };

  const resetToDb = () => {
    setDrafts((prev) => ({
      ...prev,
      [activeKey]: {
        mainAlt: overrides.main?.alt ?? active.mainAlt,
        mainCaption: overrides.main?.caption ?? active.mainCaption,
        perforatorAlt: overrides.perforator?.alt ?? active.perforatorAlt,
        perforatorCaption:
          overrides.perforator?.caption ?? active.perforatorCaption,
      },
    }));
    toast.success(`Załadowano wartości z bazy — ${active.label}`);
  };

  const saveSlot = async (slot: VeinImageSlot) => {
    if (!isAdmin) return;
    if (slotHasErrors[slot]) {
      toast.error(
        "Popraw błędy walidacji oznaczone na czerwono przed zapisem.",
      );
      return;
    }
    const altField = slot === "main" ? "mainAlt" : "perforatorAlt";
    const captionField = slot === "main" ? "mainCaption" : "perforatorCaption";
    const altValue = draft[altField];
    const captionValue = draft[captionField];

    setSaving(slot);
    try {
      // Pełna logika lookup → insert/update + invalidacja cache żyje w
      // performSaveSlot — ta sama funkcja, którą pokrywają testy Vitest.
      await performSaveSlot(
        {
          pageKey: activeKey,
          slot,
          alt: altValue,
          caption: captionValue,
          updatedBy: session?.user.email ?? null,
        },
        { supabase, queryClient },
      );
      // Wymuś świeży render podglądu CMS i pokaż flash highlight.
      setSavedTick((t) => t + 1);
      setLastSaved({ at: Date.now(), slot, pageKey: activeKey });
      setPreviewMode("cms");
      toast.success(
        `Zapisano: ${active.label} · ${slot === "main" ? "główny obraz" : "perforator"} — podgląd odświeżony z bazy`,
      );
    } catch (err) {
      const { title, description } = describeSaveError(err, slot, active.label);
      toast.error(title, { description, duration: 8000 });
      // Zostaw użytkownika w trybie draft, żeby mógł natychmiast poprawić.
      setPreviewMode("draft");
    } finally {
      setSaving(null);
    }
  };

  /**
   * Przywraca alt+caption z wybranej wersji historii.
   * Wykonuje upsert do `vein_image_overrides` (trigger logujący zapisze
   * automatycznie poprzednią wersję jako nowy snapshot — działa cykl audytu).
   * Aktualizuje też lokalny draft, żeby UI od razu pokazywał przywróconą treść.
   */
  const restoreFromHistory = async (row: VeinImageOverrideHistoryRow) => {
    if (!isAdmin) return;
    const slotKey = `${row.page_key}:${row.slot}`;
    setRestoringSlot(slotKey);
    try {
      const { data: existing, error: lookupError } = await supabase
        .from("vein_image_overrides")
        .select("id")
        .eq("page_key", row.page_key)
        .eq("slot", row.slot)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const payload = {
        page_key: row.page_key,
        slot: row.slot,
        alt: row.alt,
        caption: row.caption,
        updated_by: session?.user.email ?? null,
      };

      if (existing) {
        const { error } = await supabase
          .from("vein_image_overrides")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vein_image_overrides")
          .insert(payload);
        if (error) throw error;
      }

      // Sync local draft + zapytania.
      const altField = row.slot === "main" ? "mainAlt" : "perforatorAlt";
      const captionField = row.slot === "main" ? "mainCaption" : "perforatorCaption";
      setDrafts((prev) => ({
        ...prev,
        [row.page_key]: {
          ...prev[row.page_key],
          [altField]: row.alt,
          [captionField]: row.caption,
        },
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: VEIN_IMAGE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: [...VEIN_IMAGE_HISTORY_QUERY_KEY, row.page_key, row.slot] }),
      ]);
      setSavedTick((t) => t + 1);
      setLastSaved({ at: Date.now(), slot: row.slot, pageKey: row.page_key });
      setPreviewMode("cms");
      toast.success(
        `Przywrócono wersję z ${new Date(row.recorded_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}`,
      );
    } catch (err) {
      const pageLabel = VEIN_IMAGE_PAGE_PRESETS.find((p) => p.key === row.page_key)?.label ?? row.page_key;
      const { title, description } = describeSaveError(err, row.slot, pageLabel);
      toast.error(`Rollback nie powiódł się: ${title}`, { description, duration: 8000 });
    } finally {
      setRestoringSlot(null);
    }
  };

  /**
   * Pobiera „pusty" szablon CSV gotowy do wypełnienia pod Import CSV.
   *
   * Zawartość: nagłówek (page_key, slot, alt, caption) + 1 wiersz przykładowy
   * per kombinacja (page_key × slot) z VEIN_IMAGE_PAGE_PRESETS, z realnymi
   * wartościami z presetów jako wzorzec stylistyczny. Admin może je nadpisać
   * lub usunąć niepotrzebne wiersze przed importem.
   *
   * Synchronicznie (bez async/setExporting) — to czysty download statycznych
   * danych, nie woła bazy.
   */
  const downloadCsvTemplate = () => {
    const header = ["page_key", "slot", "alt", "caption"];
    const lines = [header.join(",")];
    for (const preset of VEIN_IMAGE_PAGE_PRESETS) {
      lines.push(
        [preset.key, "main", preset.mainAlt, preset.mainCaption]
          .map(csvCell)
          .join(","),
      );
      lines.push(
        [
          preset.key,
          "perforator",
          preset.perforatorAlt,
          preset.perforatorCaption,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    // BOM dla Excela + CRLF zgodnie z RFC 4180 (te same konwencje co exportCsv).
    downloadFile(
      "vein-image-overrides-template.csv",
      "\uFEFF" + lines.join("\r\n"),
      "text/csv",
    );
    toast.success(
      `Pobrano szablon CSV (${VEIN_IMAGE_PAGE_PRESETS.length * 2} wierszy przykładowych)`,
    );
  };


  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /** Pobiera WSZYSTKIE overrides z bazy (4 strony × 2 sloty = max 8 wierszy). */
  const fetchAllOverrides = async () => {
    const { data, error } = await supabase
      .from("vein_image_overrides")
      .select("page_key, slot, alt, caption, updated_at, updated_by")
      .order("page_key", { ascending: true })
      .order("slot", { ascending: true });
    if (error) throw error;
    return data ?? [];
  };

  /**
   * Aplikuje aktywne filtry eksportu (page_key + slot) do listy z bazy
   * i zwraca segment do nazwy pliku, np. "-pajaczki-perforator" / "" / "-perforator".
   */
  const applyExportFilters = <T extends { page_key: string; slot: string }>(
    rows: T[],
  ): { rows: T[]; suffix: string } => {
    const filtered = rows.filter(
      (r) =>
        (exportPageKey === "all" || r.page_key === exportPageKey) &&
        (exportSlot === "all" || r.slot === exportSlot),
    );
    const parts: string[] = [];
    if (exportPageKey !== "all") parts.push(exportPageKey);
    if (exportSlot !== "all") parts.push(exportSlot);
    return { rows: filtered, suffix: parts.length ? `-${parts.join("-")}` : "" };
  };

  /** Krótki opis aktywnego filtra do toastów / hintów ("wszystkie / tylko strona X / tylko slot Y / strona X · slot Y"). */
  const exportFilterSummary = (): string => {
    if (exportPageKey === "all" && exportSlot === "all") return "wszystkie";
    const parts: string[] = [];
    if (exportPageKey !== "all") parts.push(`strona ${exportPageKey}`);
    if (exportSlot !== "all") parts.push(`slot ${exportSlot}`);
    return parts.join(" · ");
  };

  const exportJson = async () => {
    setExporting("json");
    try {
      const allRows = await fetchAllOverrides();
      const { rows, suffix } = applyExportFilters(allRows);
      if (rows.length === 0) {
        toast.info(
          `Brak overrides do eksportu dla filtra: ${exportFilterSummary()}.`,
        );
        return;
      }
      const payload = {
        exported_at: new Date().toISOString(),
        exported_by: session?.user.email ?? null,
        filter: {
          page_key: exportPageKey,
          slot: exportSlot,
        },
        total: rows.length,
        overrides: rows,
      };
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      downloadFile(
        `vein-image-overrides${suffix}-${stamp}.json`,
        JSON.stringify(payload, null, 2),
        "application/json",
      );
      toast.success(
        `Wyeksportowano ${rows.length} overrides do JSON (${exportFilterSummary()})`,
      );
    } catch (err) {
      toast.error(
        `Błąd eksportu JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setExporting(null);
    }
  };

  /**
   * Kopiuje wyfiltrowany payload JSON do schowka — ten sam shape co exportJson
   * (exported_at/exported_by/filter/total/overrides), żeby można było wkleić
   * do Postmana / drugiego konta admina i zaimportować bez różnicy względem
   * pliku. Używa Clipboard API (wymaga HTTPS / localhost — admin panel zawsze
   * leci po HTTPS, więc bezpiecznie).
   */
  const copyJsonToClipboard = async () => {
    setExporting("json-copy");
    try {
      const allRows = await fetchAllOverrides();
      const { rows } = applyExportFilters(allRows);
      if (rows.length === 0) {
        toast.info(
          `Brak overrides do skopiowania dla filtra: ${exportFilterSummary()}.`,
        );
        return;
      }
      const payload = {
        exported_at: new Date().toISOString(),
        exported_by: session?.user.email ?? null,
        filter: {
          page_key: exportPageKey,
          slot: exportSlot,
        },
        total: rows.length,
        overrides: rows,
      };
      const json = JSON.stringify(payload, null, 2);
      if (!navigator.clipboard?.writeText) {
        toast.error(
          'Schowek niedostępny w tej przeglądarce — użyj „Export JSON".',
        );
        return;
      }
      await navigator.clipboard.writeText(json);
      setJsonCopied(true);
      window.setTimeout(() => setJsonCopied(false), 2000);
      toast.success(
        `Skopiowano JSON (${rows.length} overrides, ${exportFilterSummary()}) do schowka`,
      );
    } catch (err) {
      toast.error(
        `Nie udało się skopiować JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setExporting(null);
    }
  };

  /** Escapuje pole CSV zgodnie z RFC 4180. */
  const csvCell = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const exportCsv = async () => {
    setExporting("csv");
    try {
      const allRows = await fetchAllOverrides();
      const { rows, suffix } = applyExportFilters(allRows);
      if (rows.length === 0) {
        toast.info(
          `Brak overrides do eksportu dla filtra: ${exportFilterSummary()}.`,
        );
        return;
      }
      const header = ["page_key", "slot", "alt", "caption", "updated_at", "updated_by"];
      const lines = [header.join(",")];
      for (const row of rows) {
        lines.push(
          header
            .map((h) => csvCell((row as Record<string, unknown>)[h]))
            .join(","),
        );
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      // BOM dla poprawnego otwarcia w Excelu z polskimi znakami.
      downloadFile(
        `vein-image-overrides${suffix}-${stamp}.csv`,
        "\uFEFF" + lines.join("\r\n"),
        "text/csv",
      );
      toast.success(
        `Wyeksportowano ${rows.length} overrides do CSV (${exportFilterSummary()})`,
      );
    } catch (err) {
      toast.error(
        `Błąd eksportu CSV: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setExporting(null);
    }
  };

  /**
   * Czyści CAŁĄ tabelę vein_image_overrides — frontend wraca do PRESETS.
   *
   * UX bezpieczeństwa: PRZED usunięciem robimy snapshot wszystkich rzędów
   * (page_key/slot/alt/caption/updated_by) i po sukcesie pokazujemy toast
   * z akcją „Cofnij" (10 s). Klik wywołuje upsert z payloadu snapshot →
   * odtwarza dokładnie te same alt/caption (rekord dostaje nowe id, ale
   * z punktu widzenia frontu jest to ta sama treść). Trigger
   * log_vein_image_override_history zapisze nowy „insert" do historii,
   * dzięki czemu undo jest w pełni audytowalne.
   *
   * Jeśli user nie kliknie „Cofnij" w oknie, snapshot po prostu wygasa —
   * tabela zostaje pusta i podstrony używają wartości seedowych.
   */
  const resetAllToDefaults = async () => {
    const ok = window.confirm(
      'Usunąć WSZYSTKIE overrides ze wszystkich stron? Strony wrócą do hardkodowanych wartości seedowych. Przez 10 sekund po resecie pokażemy toast z opcją "Cofnij".',
    );
    if (!ok) return;
    setResettingAll(true);
    try {
      // 1. SNAPSHOT przed usunięciem — to nasz „backup" do undo.
      const snapshot = await fetchAllOverrides();

      // 2. .delete() wymaga filtra; .neq na zawsze-prawdziwym warunku usuwa wszystko.
      const { error } = await supabase
        .from("vein_image_overrides")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: VEIN_IMAGE_QUERY_KEY });
      setDrafts(
        VEIN_IMAGE_PAGE_PRESETS.reduce(
          (acc, p) => {
            acc[p.key] = presetToDraft(p);
            return acc;
          },
          {} as Record<VeinImagePageKey, DraftFields>,
        ),
      );
      lastSeededKey.current = null;
      setSavedTick((t) => t + 1);
      setPreviewMode("draft");

      // 3. Toast z akcją Cofnij. Pokazujemy go tylko gdy faktycznie
      //    coś usunęliśmy — pusta baza nie wymaga undo.
      if (snapshot.length === 0) {
        toast.success(
          "Baza overrides była już pusta — strony używają wartości seedowych",
        );
        return;
      }

      // Flag chroni przed double-clickiem na „Cofnij" (gdyby user kliknął
      // 2× zanim toast się zamknął) i przed re-undo z dwóch toastów naraz.
      let undone = false;

      toast.success(
        `Usunięto ${snapshot.length} ${snapshot.length === 1 ? "override" : "overrides"} — strony wróciły do wartości seedowych`,
        {
          duration: 10_000,
          description: "Masz 10 sekund, żeby cofnąć ten reset.",
          action: {
            label: "Cofnij",
            onClick: async () => {
              if (undone) return;
              undone = true;
              try {
                // Upsert na (page_key, slot) — gdyby user w międzyczasie
                // zaczął edytować coś nowego, jego zmiana zostanie nadpisana
                // snapshotem (taki jest semantyczny kontrakt „cofnij reset").
                const payload = snapshot.map((row) => ({
                  page_key: row.page_key,
                  slot: row.slot,
                  alt: row.alt,
                  caption: row.caption,
                  updated_by: row.updated_by ?? session?.user.email ?? null,
                }));
                const { error: restoreError } = await supabase
                  .from("vein_image_overrides")
                  .upsert(payload, { onConflict: "page_key,slot" });
                if (restoreError) throw restoreError;
                await queryClient.invalidateQueries({
                  queryKey: VEIN_IMAGE_QUERY_KEY,
                });
                lastSeededKey.current = null;
                setSavedTick((t) => t + 1);
                setPreviewMode("cms");
                toast.success(
                  `Przywrócono ${payload.length} ${payload.length === 1 ? "override" : "overrides"} z snapshotu`,
                );
              } catch (undoErr) {
                toast.error(
                  `Nie udało się cofnąć resetu: ${undoErr instanceof Error ? undoErr.message : String(undoErr)}`,
                  { duration: 8000 },
                );
              }
            },
          },
        },
      );
    } catch (err) {
      toast.error(
        `Błąd resetu: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setResettingAll(false);
    }
  };

  /**
   * Parsuje plik CSV i przygotowuje preview importu (otwiera dialog).
   * Wymagane kolumny: page_key, slot, alt, caption.
   * Dodatkowe kolumny (np. updated_at, updated_by) są ignorowane — pozwala
   * to wziąć eksportowany CSV, edytować w Excelu i zaimportować z powrotem.
   *
   * Walidacja LOKALNIE = lustrzane odbicie triggera serwera, więc preview
   * pokazuje błędy zanim cokolwiek pójdzie do bazy. Mimo to commit i tak
   * łapie ewentualne błędy serwera per-row (graceful degradation).
   */
  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const matrix = parseCsv(text);
      if (matrix.length === 0) {
        toast.error("Plik CSV jest pusty.");
        return;
      }
      const rawHeader = matrix[0]!;
      const mapping = resolveCsvHeaderMapping(rawHeader);
      const idx = mapping.indices;
      const missing = (["page_key", "slot", "alt", "caption"] as const).filter(
        (k) => idx[k] < 0,
      );
      if (missing.length > 0) {
        toast.error(
          `Brak wymaganych kolumn: ${missing.join(", ")}. Akceptowane warianty nagłówków: page_key/Page Key/Strona, slot/Slot/Wariant, alt/Alt text/Opis alternatywny, caption/Caption/Podpis.`,
        );
        return;
      }
      // Pokaż adminowi co system wykrył — szczególnie ważne, gdy mapowanie
      // zadziałało na nieoczywistym wariancie (np. „Page Key" → page_key).
      const remapped = (Object.keys(idx) as Array<keyof typeof idx>)
        .filter((k) => mapping.matchedHeader[k] && mapping.matchedHeader[k] !== k)
        .map((k) => `${mapping.matchedHeader[k]} → ${k}`);
      if (remapped.length > 0) {
        toast.info(`Rozpoznano nagłówki: ${remapped.join(", ")}`);
      }

      const dbRows = await fetchAllOverrides();
      const dbMap = new Map<string, { alt: string; caption: string }>();
      for (const r of dbRows) {
        dbMap.set(`${r.page_key}:${r.slot}`, { alt: r.alt, caption: r.caption });
      }

      // Etap 1: parsing per-row BEZ dedupu i bez finalnego statusu —
      // dedup robimy w applyDedupStrategy() reaktywnie wg wybranego
      // przełącznika (first/last). Validacje pól robimy tutaj bo nie zależą
      // od strategii.
      const parsedRows: ParsedImportRow[] = matrix.slice(1).map((cells, i) => {
        const line = i + 2;
        const rawPage = (cells[idx.page_key] ?? "").trim();
        const rawSlot = (cells[idx.slot] ?? "").trim();
        const alt = cells[idx.alt] ?? "";
        const caption = cells[idx.caption] ?? "";
        const baseErrors: string[] = [];

        const pageKey = VALID_PAGE_KEYS.has(rawPage as VeinImagePageKey)
          ? (rawPage as VeinImagePageKey)
          : null;
        const slot = (VALID_SLOTS as string[]).includes(rawSlot)
          ? (rawSlot as VeinImageSlot)
          : null;
        if (!pageKey) baseErrors.push(`nieznany page_key: "${rawPage}"`);
        if (!slot) baseErrors.push(`nieznany slot: "${rawSlot}" (oczekiwano main/perforator)`);
        baseErrors.push(...validateImportRow(alt, caption));

        const current = pageKey && slot ? dbMap.get(`${pageKey}:${slot}`) : undefined;

        return {
          line,
          pageKey,
          slot,
          alt,
          caption,
          baseErrors,
          currentAlt: current?.alt,
          currentCaption: current?.caption,
        };
      });

      // Reset strategii do default „first" przy każdym nowym pliku — admin
      // nie powinien dziedziczyć wyboru z poprzedniego importu.
      setDedupStrategy("first");
      setImportPreview({ fileName: file.name, parsedRows });
    } catch (err) {
      toast.error(
        `Błąd parsowania CSV: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  /**
   * Wykonuje upsert dla wszystkich wierszy create/update z preview.
   * Każdy wiersz idzie osobnym requestem — granularne raportowanie błędów,
   * a liczba operacji jest mała (max 8).
   */
  const commitImport = async () => {
    if (!importPreview || !isAdmin) return;
    const applicable = importPreviewRows.filter(
      (r) => (r.status === "create" || r.status === "update") && r.pageKey && r.slot,
    );
    if (applicable.length === 0) {
      toast.info("Nic do zaimportowania (brak zmian).");
      return;
    }
    setImporting(true);
    let okCount = 0;
    const failures: { row: ImportRow; message: string }[] = [];
    try {
      for (const row of applicable) {
        const payload = {
          page_key: row.pageKey!,
          slot: row.slot!,
          alt: row.alt,
          caption: row.caption,
          updated_by: session?.user.email ?? null,
        };
        try {
          const { data: existing, error: lookupError } = await supabase
            .from("vein_image_overrides")
            .select("id")
            .eq("page_key", row.pageKey!)
            .eq("slot", row.slot!)
            .maybeSingle();
          if (lookupError) throw lookupError;
          if (existing) {
            const { error } = await supabase
              .from("vein_image_overrides")
              .update(payload)
              .eq("id", existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("vein_image_overrides")
              .insert(payload);
            if (error) throw error;
          }
          okCount++;
        } catch (err) {
          failures.push({
            row,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Sync drafts dla wszystkich zaimportowanych stron + invalidate cache.
      setDrafts((prev) => {
        const next = { ...prev };
        for (const r of applicable) {
          if (!r.pageKey || !r.slot) continue;
          const altField = r.slot === "main" ? "mainAlt" : "perforatorAlt";
          const captionField = r.slot === "main" ? "mainCaption" : "perforatorCaption";
          next[r.pageKey] = {
            ...next[r.pageKey],
            [altField]: r.alt,
            [captionField]: r.caption,
          };
        }
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: VEIN_IMAGE_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: VEIN_IMAGE_HISTORY_QUERY_KEY });
      setSavedTick((t) => t + 1);
      setPreviewMode("cms");

      if (failures.length === 0) {
        toast.success(`Zaimportowano ${okCount} ${okCount === 1 ? "wiersz" : "wierszy"}.`);
        setImportPreview(null);
      } else {
        toast.error(
          `Zaimportowano ${okCount}/${applicable.length}. Błędy: ${failures.length}.`,
          {
            description: failures
              .slice(0, 3)
              .map((f) => `Linia ${f.row.line} (${f.row.pageKey}/${f.row.slot}): ${f.message}`)
              .join(" • "),
            duration: 10000,
          },
        );
        // Po częściowym failu: dopisujemy `serwer: …` do baseErrors w
        // odpowiednich parsedRows (przez .line lookup). Sukcesy nie wymagają
        // dodatkowej akcji — i tak po refetchu przejdą na status "noop"
        // przy ponownym otwarciu, ale tu zachowujemy preview do wglądu.
        setImportPreview((prev) =>
          prev
            ? {
                ...prev,
                parsedRows: prev.parsedRows.map((r) => {
                  const f = failures.find((x) => x.row.line === r.line);
                  if (!f) return r;
                  return {
                    ...r,
                    baseErrors: [...r.baseErrors, `serwer: ${f.message}`],
                  };
                }),
              }
            : prev,
        );
      }
    } finally {
      setImporting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div
          className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"
          aria-label="Ładowanie panelu"
        />
      </div>
    );
  }

  if (!session) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Brak uprawnień</h1>
          <p className="text-muted-foreground text-sm">
            Twoje konto nie ma roli administratora.
          </p>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Wyloguj
          </Button>
        </div>
      </div>
    );
  }

  const viewportConfig = VIEWPORTS[viewport];

  return (
    <>
      <SeoHead
        title="Vein Images — edytor alt / figcaption"
        description="Edycja alt i figcaption dla schematu niewydolności żylnej na 4 stronach."
        path="/admin/vein-images"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 py-4 md:px-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold font-serif text-foreground">
              Vein Images
            </h1>
            <p className="text-xs text-muted-foreground">
              alt + figcaption dla VenousInsufficiencyImage · 4 strony × 2 sloty
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
            >
              ← Panel
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {session.user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Wyloguj
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 md:px-8 space-y-6">
          {/* Search + slot filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj po stronie, page_key lub treści alt/caption…"
                aria-label="Wyszukiwarka rekordów vein-images"
                className="h-9 pl-8 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Wyczyść wyszukiwanie"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div
              role="radiogroup"
              aria-label="Filtr slotu"
              className="flex gap-1 rounded-lg border border-border/50 bg-card/60 p-1"
            >
              {(["all", "main", "perforator"] as const).map((opt) => {
                const isActive = opt === slotFilter;
                const label = opt === "all" ? "Wszystkie sloty" : opt === "main" ? "Główny" : "Perforator";
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setSlotFilter(opt)}
                    className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {isFilterActive && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span aria-live="polite">
                  {filteredPresets.length}/{VEIN_IMAGE_PAGE_PRESETS.length} stron
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => {
                    setSearchQuery("");
                    setSlotFilter("all");
                  }}
                >
                  Wyczyść filtry
                </Button>
              </div>
            )}
          </div>

          {/* Page tabs + viewport */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Strona"
              className="flex flex-wrap gap-1 rounded-lg border border-border/50 bg-card/60 p-1"
            >
              {filteredPresets.length === 0 ? (
                <span className="px-3 py-1.5 text-[12px] italic text-muted-foreground">
                  Brak stron pasujących do filtra
                </span>
              ) : (
                filteredPresets.map((page) => {
                  const isActive = page.key === activeKey;
                  const hasOverride = overrides.main || overrides.perforator;
                  return (
                    <button
                      key={page.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setActiveKey(page.key);
                        lastSeededKey.current = null;
                      }}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      {page.label}
                      {isActive && hasOverride && (
                        <Database className="w-3 h-3 opacity-70" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div
              role="radiogroup"
              aria-label="Viewport"
              className="flex gap-1 rounded-lg border border-border/50 bg-card/60 p-1"
            >
              {(Object.keys(VIEWPORTS) as ViewportMode[]).map((m) => {
                const isActive = m === viewport;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setViewport(m)}
                    className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {m === "mobile" ? "📱 Mobile" : "🖥️ Desktop"}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/*
                Filtry eksportu — pozwalają zawęzić co trafia do JSON/CSV.
                "Wszystkie" zachowuje dotychczasowe zachowanie. Kompaktowe
                Selecty wpasowują się w toolbar (te same h-8 co Button size="sm").
                Filename zawiera aktywne filtry (suffix), żeby user nie pomylił
                eksportów po nazwie pliku.
              */}
              <Select
                value={exportPageKey}
                onValueChange={(v) =>
                  setExportPageKey(v as "all" | VeinImagePageKey)
                }
              >
                <SelectTrigger
                  className="h-8 w-[150px] text-xs"
                  aria-label="Filtr eksportu: strona"
                  title="Eksportuj tylko wybraną stronę (page_key)"
                >
                  <SelectValue placeholder="Strona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie strony</SelectItem>
                  {VEIN_IMAGE_PAGE_PRESETS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={exportSlot}
                onValueChange={(v) => setExportSlot(v as "all" | VeinImageSlot)}
              >
                <SelectTrigger
                  className="h-8 w-[130px] text-xs"
                  aria-label="Filtr eksportu: slot"
                  title="Eksportuj tylko wybrany slot (main / perforator)"
                >
                  <SelectValue placeholder="Slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Oba sloty</SelectItem>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="perforator">perforator</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={exportJson}
                disabled={exporting !== null}
                title={`Pobierz overrides z bazy jako JSON (${exportFilterSummary()})`}
              >
                <FileJson className="w-3.5 h-3.5 mr-1" />
                {exporting === "json" ? "Eksport…" : "Export JSON"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyJsonToClipboard}
                disabled={exporting !== null}
                title={`Skopiuj JSON do schowka — ten sam payload co Export JSON (${exportFilterSummary()})`}
                aria-label="Kopiuj JSON do schowka"
              >
                {jsonCopied ? (
                  <Check className="w-3.5 h-3.5 mr-1 text-primary" aria-hidden="true" />
                ) : (
                  <ClipboardCopy className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                )}
                {exporting === "json-copy"
                  ? "Kopiowanie…"
                  : jsonCopied
                    ? "Skopiowano"
                    : "Kopiuj JSON"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={exporting !== null}
                title={`Pobierz overrides z bazy jako CSV — Excel-friendly (${exportFilterSummary()})`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                {exporting === "csv" ? "Eksport…" : "Export CSV"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCsvTemplate}
                title="Pobierz przykładowy plik CSV z nagłówkami (page_key, slot, alt, caption) gotowy do wypełnienia pod Import CSV"
                aria-label="Pobierz szablon CSV do importu"
              >
                <FileDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Szablon CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                title={`Hurtowo podmień alt/caption z pliku CSV. Akceptujemy nagłówki w PL/EN i z różnymi separatorami (np. „Page Key", „Strona", „page-key" → page_key).`}
              >
                <Upload className="w-3.5 h-3.5 mr-1" /> Import CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  // Reset wartości, żeby ten sam plik dało się wybrać ponownie po edycji.
                  e.target.value = "";
                }}
              />
              <span className="w-px h-6 bg-border/50 mx-1" aria-hidden />
              <Button
                variant="outline"
                size="sm"
                onClick={resetToProps}
                title="Cofnij draft do hardkodowanych propsów (tylko ta strona, lokalnie)"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset draft
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDb}
                title="Załaduj wartości aktualnie zapisane w bazie (tylko ta strona)"
              >
                <Database className="w-3.5 h-3.5 mr-1" /> Reset do bazy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={resetAllToDefaults}
                disabled={resettingAll}
                title="Usuń WSZYSTKIE overrides ze wszystkich stron — strony wrócą do wartości seedowych"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {resettingAll ? "Resetuję…" : "Reset wszystkich"}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
            {/* Live preview — Draft (live z edytora) lub CMS (świeżo z bazy po Save). */}
            <section
              aria-label="Podgląd renderu"
              className={`rounded-xl border bg-card/30 p-4 overflow-x-auto transition-all duration-500 ${
                flashOn
                  ? "border-emerald-500/60 ring-2 ring-emerald-500/30"
                  : "border-border/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <p className="text-[11px] text-muted-foreground font-mono">
                  {viewportConfig.label} · {active.route}
                </p>
                <div
                  className="inline-flex rounded-md border border-border/40 bg-background/60 p-0.5 text-[11px]"
                  role="tablist"
                  aria-label="Tryb podglądu"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewMode === "draft"}
                    onClick={() => setPreviewMode("draft")}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      previewMode === "draft"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Draft (live)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewMode === "cms"}
                    onClick={() => setPreviewMode("cms")}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      previewMode === "cms"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    CMS (z bazy)
                  </button>
                </div>
              </div>
              {lastSaved && lastSaved.pageKey === activeKey && (
                <p
                  className="text-[10px] text-emerald-400 font-mono mb-2"
                  aria-live="polite"
                >
                  ✓ Ostatni zapis: {lastSaved.slot === "main" ? "główny obraz" : "perforator"} ·{" "}
                  {new Date(lastSaved.at).toLocaleTimeString("pl-PL")}
                </p>
              )}
              <div
                className="mx-auto border border-border/40 rounded-lg bg-background overflow-hidden"
                style={{ width: viewportConfig.width, maxWidth: "100%" }}
              >
                <div className="p-4">
                  {previewMode === "draft" ? (
                    <VenousInsufficiencyImage
                      key={`draft-${active.key}-${viewport}`}
                      title={active.title}
                      subtitle={active.subtitle}
                      mainAlt={draft.mainAlt}
                      mainCaption={draft.mainCaption}
                      perforatorAlt={draft.perforatorAlt}
                      perforatorCaption={draft.perforatorCaption}
                    />
                  ) : (
                    <VenousInsufficiencyImage
                      // savedTick wymusza pełny remount → świeży render z CMS po każdym Save.
                      key={`cms-${active.key}-${viewport}-${savedTick}`}
                      pageKey={active.key}
                      title={active.title}
                      subtitle={active.subtitle}
                      mainAlt={active.mainAlt}
                      mainCaption={active.mainCaption}
                      perforatorAlt={active.perforatorAlt}
                      perforatorCaption={active.perforatorCaption}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Editor */}
            <aside aria-label="Edycja alt i figcaption" className="space-y-4">
              {visibleSlots.map((slot) => {
                const slotLabel =
                  slot === "main" ? "Główny obraz" : "Perforator";
                const altField = slot === "main" ? "mainAlt" : "perforatorAlt";
                const captionField =
                  slot === "main" ? "mainCaption" : "perforatorCaption";
                const altStats = stats[altField];
                const captionStats = stats[captionField];
                const isSaving = saving === slot;
                const dbRow =
                  slot === "main" ? overrides.main : overrides.perforator;
                const altInvalid = altStats.errors.length > 0;
                const captionInvalid = captionStats.errors.length > 0;
                const slotInvalid = altInvalid || captionInvalid;
                const altErrId = `${slot}-alt-err`;
                const captionErrId = `${slot}-caption-err`;
                return (
                  <div
                    key={slot}
                    className={`rounded-xl border p-4 space-y-3 transition-colors ${
                      slotInvalid
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-border/40 bg-card/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {slotLabel}
                      </h2>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          dbRow
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {dbRow ? "z CMS" : "z propsu"}
                      </span>
                    </div>

                    {/* Audit panel — kto i kiedy ostatnio edytował override w bazie. */}
                    {dbRow ? (
                      <div className="rounded-md border border-border/40 bg-background/40 px-2.5 py-2 grid gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5 text-foreground/85">
                          <User className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
                          <span className="font-mono truncate" title={dbRow.updated_by ?? "(brak adresu — system)"}>
                            {dbRow.updated_by ?? <em className="text-muted-foreground not-italic">system / brak adresu</em>}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
                          <time
                            dateTime={dbRow.updated_at}
                            title={new Date(dbRow.updated_at).toLocaleString("pl-PL", {
                              dateStyle: "full",
                              timeStyle: "medium",
                            })}
                          >
                            {formatRelativeTime(dbRow.updated_at)}
                            <span className="opacity-60 ml-1.5 font-mono">
                              ({new Date(dbRow.updated_at).toLocaleString("pl-PL", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })})
                            </span>
                          </time>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-border/40 px-2.5 py-2 text-[11px] text-muted-foreground italic">
                        Brak wpisu w bazie — pierwszy zapis utworzy nowy override.
                      </div>
                    )}

                    {/* Alt */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label
                          htmlFor={`${slot}-alt`}
                          className="text-[11px] font-medium text-foreground/80"
                        >
                          alt
                        </label>
                        <StatsBadge stats={altStats} />
                      </div>
                      <textarea
                        id={`${slot}-alt`}
                        value={draft[altField]}
                        onChange={(e) => updateDraft(altField, e.target.value)}
                        rows={4}
                        aria-invalid={altInvalid || undefined}
                        aria-describedby={altInvalid ? altErrId : undefined}
                        className={`w-full text-[12px] leading-relaxed rounded-md border bg-background/60 px-2 py-1.5 font-mono text-foreground/90 focus:outline-none focus:ring-2 transition-colors ${
                          altInvalid
                            ? "border-destructive/60 focus:ring-destructive/40"
                            : "border-border/50 focus:ring-primary/40"
                        }`}
                      />
                      <ErrorList errors={altStats.errors} id={altErrId} />
                    </div>

                    {/* Caption */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label
                          htmlFor={`${slot}-caption`}
                          className="text-[11px] font-medium text-foreground/80"
                        >
                          figcaption
                        </label>
                        <StatsBadge stats={captionStats} />
                      </div>
                      <textarea
                        id={`${slot}-caption`}
                        value={draft[captionField]}
                        onChange={(e) =>
                          updateDraft(captionField, e.target.value)
                        }
                        rows={2}
                        aria-invalid={captionInvalid || undefined}
                        aria-describedby={
                          captionInvalid ? captionErrId : undefined
                        }
                        className={`w-full text-[12px] leading-relaxed rounded-md border bg-background/60 px-2 py-1.5 font-mono text-foreground/90 focus:outline-none focus:ring-2 transition-colors ${
                          captionInvalid
                            ? "border-destructive/60 focus:ring-destructive/40"
                            : "border-border/50 focus:ring-primary/40"
                        }`}
                      />
                      <ErrorList
                        errors={captionStats.errors}
                        id={captionErrId}
                      />
                      {captionStats.segments && (
                        <SegmentList segments={captionStats.segments} />
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <HistoryPopover
                        pageKey={activeKey}
                        slot={slot}
                        onRestore={restoreFromHistory}
                        restoring={restoringSlot === `${activeKey}:${slot}`}
                      />
                      <Button
                        size="sm"
                        disabled={isSaving || slotInvalid}
                        onClick={() => saveSlot(slot)}
                        title={
                          slotInvalid
                            ? "Popraw błędy walidacji przed zapisem"
                            : "Zapisz do bazy"
                        }
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        {isSaving
                          ? "Zapisywanie…"
                          : slotInvalid
                            ? "Popraw błędy"
                            : "Zapisz"}
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground/80 mb-1">
                  Limity (egzekwowane przez bazę)
                </p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>
                    Alt: {ALT_MIN}–{ALT_BUDGET} znaków
                  </li>
                  <li>Caption: max {CAPTION_BUDGET} znaków całość</li>
                  <li>Segment „·": max {SEGMENT_BUDGET} znaków każdy</li>
                </ul>
                <p className="mt-2">
                  Po zapisie strony publiczne (EVLT, Mikroflebektomia,
                  Flebologia, Profilaktyka) odświeżą się automatycznie z cache.
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Dialog: preview importu CSV */}
      <Dialog
        open={importPreview !== null}
        onOpenChange={(open) => {
          if (!open && !importing) setImportPreview(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import CSV — preview
            </DialogTitle>
            <DialogDescription className="text-xs">
              Plik: <span className="font-mono">{importPreview?.fileName}</span> ·{" "}
              {importPreview ? (
                <>
                  do utworzenia: {importPreviewRows.filter((r) => r.status === "create").length} ·
                  do aktualizacji: {importPreviewRows.filter((r) => r.status === "update").length} ·
                  bez zmian: {importPreviewRows.filter((r) => r.status === "noop").length} ·
                  z błędami: {importPreviewRows.filter((r) => r.status === "error").length}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {/*
            Toolbar dialogu: przełącznik strategii dedupu duplikatów page_key+slot.
            Reaktywny — zmiana radio przelicza importPreviewRows przez useMemo,
            statusy wierszy odświeżają się natychmiast (np. duplikat z „error"
            staje się „noop" przy strategii „last").
          */}
          <div
            className="flex flex-wrap items-center gap-3 -mt-2 mb-1 rounded-md border border-border/40 bg-muted/20 px-3 py-2"
            role="radiogroup"
            aria-label="Strategia obsługi duplikatów page_key+slot"
          >
            <span className="text-[11px] font-sans uppercase tracking-[0.18em] text-muted-foreground">
              Duplikaty
            </span>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input
                type="radio"
                name="dedup-strategy"
                value="first"
                checked={dedupStrategy === "first"}
                onChange={() => setDedupStrategy("first")}
                className="accent-primary"
                aria-label="Pierwsze wystąpienie wygrywa"
              />
              <span>
                Pierwszy wygrywa{" "}
                <span className="text-muted-foreground">
                  (kolejne → błąd)
                </span>
              </span>
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input
                type="radio"
                name="dedup-strategy"
                value="last"
                checked={dedupStrategy === "last"}
                onChange={() => setDedupStrategy("last")}
                className="accent-primary"
                aria-label="Ostatni wpis wygrywa"
              />
              <span>
                Ostatni wygrywa{" "}
                <span className="text-muted-foreground">
                  (wcześniejsze → bez zmian)
                </span>
              </span>
            </label>
          </div>

          <div className="flex-1 overflow-auto -mx-6 px-6">
            <div className="space-y-2">
              {importPreviewRows.map((row) => {
                const statusColor = {
                  create: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                  update: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                  noop: "bg-muted/20 text-muted-foreground border-border/30",
                  error: "bg-destructive/10 text-destructive border-destructive/40",
                }[row.status];
                const statusIcon = {
                  create: <CheckCircle2 className="w-3 h-3" />,
                  update: <RotateCcw className="w-3 h-3" />,
                  noop: <Database className="w-3 h-3" />,
                  error: <AlertTriangle className="w-3 h-3" />,
                }[row.status];
                const statusLabel = {
                  create: "nowy",
                  update: "aktualizacja",
                  noop: "bez zmian",
                  error: "błąd",
                }[row.status];
                return (
                  <div
                    key={row.line}
                    className={`rounded-md border px-3 py-2 text-[11px] ${statusColor}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono opacity-60">L{row.line}</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider bg-background/40">
                          {statusIcon}
                          {statusLabel}
                        </span>
                        <span className="font-mono text-foreground/85">
                          {row.pageKey ?? "?"} / {row.slot ?? "?"}
                        </span>
                      </div>
                      <span className="font-mono opacity-60">
                        alt:{row.alt.length} · cap:{row.caption.length}
                      </span>
                    </div>
                    {row.errors.length > 0 && (
                      <ul className="mb-1 space-y-0.5">
                        {row.errors.map((e, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <FileWarning className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.status === "update" && (
                      <details className="mt-1">
                        <summary className="cursor-pointer opacity-70 hover:opacity-100 select-none">
                          pokaż diff
                        </summary>
                        <div className="mt-1 grid gap-1 font-mono text-[10px]">
                          <div className="rounded border border-border/30 bg-background/30 p-1.5">
                            <span className="opacity-60">stary alt:</span>{" "}
                            <span className="break-words">{row.currentAlt}</span>
                          </div>
                          <div className="rounded border border-border/30 bg-background/30 p-1.5">
                            <span className="opacity-60">nowy alt:</span>{" "}
                            <span className="break-words">{row.alt}</span>
                          </div>
                          <div className="rounded border border-border/30 bg-background/30 p-1.5">
                            <span className="opacity-60">stary caption:</span>{" "}
                            <span className="break-words">{row.currentCaption}</span>
                          </div>
                          <div className="rounded border border-border/30 bg-background/30 p-1.5">
                            <span className="opacity-60">nowy caption:</span>{" "}
                            <span className="break-words">{row.caption}</span>
                          </div>
                        </div>
                      </details>
                    )}
                    {(row.status === "create" || (row.status === "error" && !row.currentAlt)) && (
                      <details className="mt-1">
                        <summary className="cursor-pointer opacity-70 hover:opacity-100 select-none">
                          pokaż treść
                        </summary>
                        <div className="mt-1 grid gap-1 font-mono text-[10px]">
                          <div className="rounded border border-border/30 bg-background/30 p-1.5">
                            <span className="opacity-60">alt:</span>{" "}
                            <span className="break-words">{row.alt || <em className="opacity-50">(pusty)</em>}</span>
                          </div>
                          <div className="rounded border border-border/30 bg-background/30 p-1.5">
                            <span className="opacity-60">caption:</span>{" "}
                            <span className="break-words">{row.caption || <em className="opacity-50">(pusty)</em>}</span>
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportPreview(null)}
              disabled={importing}
            >
              Anuluj
            </Button>
            <Button
              size="sm"
              onClick={commitImport}
              disabled={
                importing ||
                !importPreview ||
                importPreviewRows.every((r) => r.status !== "create" && r.status !== "update")
              }
              title="Wykonaj upsert dla wierszy nowy/aktualizacja"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {importing
                ? "Importowanie…"
                : `Zatwierdź (${importPreviewRows.filter((r) => r.status === "create" || r.status === "update").length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminVeinImages;
