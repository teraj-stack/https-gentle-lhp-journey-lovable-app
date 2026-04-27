/**
 * Dev-only strona podglądu + edycji alt + figcaption dla VenousInsufficiencyImage.
 *
 * Tryby:
 *   - VIEW: tylko podgląd, dane czytane z propsów źródłowych + ewentualne
 *     overrides z bazy `vein_image_overrides`.
 *   - EDIT: lokalne stany alt/caption są edytowalne; podgląd komponentu
 *     odświeża się natychmiast (controlled props). Bez round-trippu do bazy.
 *
 * Zapis do bazy:
 *   - Wymaga zalogowanego admina (RLS na `vein_image_overrides`).
 *   - Po zapisie: invalidacja React Query (klucz VEIN_IMAGE_QUERY_KEY) →
 *     wszystkie strony konsumujące hook się odświeżają, w tym ten panel.
 *   - Dla nieadminów / niezalogowanych: edycja działa lokalnie (preview-only),
 *     przycisk zapisu jest disabled z tooltipem.
 *
 * Reset:
 *   - „Reset do propsów" cofnie lokalne edycje do hardkodowanych wartości
 *     (snapshot z PAGES poniżej).
 *   - „Reset do bazy" załaduje aktualne wartości z bazy (lub propsy, jeśli
 *     baza pusta dla tej strony).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import VenousInsufficiencyImage from "@/components/shared/VenousInsufficiencyImage";
import {
  VEIN_IMAGE_QUERY_KEY,
  useVeinImageOverridesForPage,
  type VeinImagePageKey,
  type VeinImageSlot,
} from "@/hooks/useVeinImageOverrides";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PagePreset {
  key: VeinImagePageKey;
  label: string;
  route: string;
  title: string;
  subtitle: string;
  mainAlt: string;
  mainCaption: string;
  perforatorAlt: string;
  perforatorCaption: string;
}

const PAGES: readonly PagePreset[] = [
  {
    key: "evlt",
    label: "EVLT",
    route: "/leczenie/evlt",
    title: "Skąd biorą się żylaki — co dokładnie zamyka EVLT?",
    subtitle:
      "Żylak to nie problem skóry — to skutek niedomykalności zastawek głębiej w żyle. EVLT zamyka chory pień od środka, kierując krew do zdrowych naczyń.",
    mainAlt:
      "Schemat porównawczy zdrowej żyły i żylaka — niedomykalność zastawek w pniu żylnym powoduje refluks (cofanie krwi), który EVLT zamyka termicznie od środka",
    mainCaption: "Zdrowa zastawka · Refluks w pniu żylnym · Cel EVLT · Termiczne zamknięcie żyły",
    perforatorAlt:
      "Schemat niewydolnego perforatora — żyły łączącej układ głęboki z powierzchownym; jego refluks często współistnieje z niewydolnością pnia żylnego leczonego EVLT",
    perforatorCaption:
      "Niewydolny perforator · Współistnieje z refluksem pnia · Diagnostyka USG Doppler przed EVLT",
  },
  {
    key: "mikroflebektomia",
    label: "Mikroflebektomia",
    route: "/leczenie/mikroflebektomia",
    title: "Co dokładnie usuwa mikroflebektomia?",
    subtitle:
      '„Sznury" pod skórą to żylaki bocznic — żył, w których ścianki osłabły, zastawki przestały się domykać, a krew zaczęła się cofać. Mikroflebektomia usuwa je z drobnych nakłuć, bez nacinania skóry.',
    mainAlt:
      "Schemat porównawczy zdrowej żyły i żylakowatej bocznicy — poszerzone naczynie z niedomykalnością zastawek i refluksem (cofaniem krwi), które mikroflebektomia usuwa mechanicznie z mikronakłuć",
    mainCaption:
      "Zdrowa bocznica · Żylakowata bocznica · Refluks w bocznicy · Usunięcie z mikronakłuć",
    perforatorAlt:
      "Schemat niewydolnego perforatora — często zasila żylakowate bocznice usuwane mikroflebektomią; jego ocena USG Doppler decyduje o zakresie zabiegu",
    perforatorCaption:
      "Niewydolny perforator · Zasila żylakowatą bocznicę · Ocena USG Doppler przed zabiegiem",
  },
  {
    key: "flebologia",
    label: "Flebologia (niewydolność żylna)",
    route: "/leczenie/flebologia",
    title: "Mechanika żylaków — od zastawki do widocznego naczynia",
    subtitle:
      "Żylak to ostatni, najbardziej widoczny etap procesu, który zaczyna się głęboko w żyle. Schemat pokazuje, w którym momencie wkracza nowoczesna flebologia.",
    mainAlt:
      "Schemat mechaniki żylaków — niedomykalność zastawek w przewlekłej niewydolności żylnej powoduje refluks (cofanie krwi), poszerzenie naczynia i stan zapalny prowadzący do widocznych żylaków",
    mainCaption: "Zastawka · Refluks · Poszerzenie naczynia · Stan zapalny · Widoczny żylak",
    perforatorAlt:
      "Schemat niewydolnego perforatora — łącznika między układem głębokim a powierzchownym, którego refluks dociąża powierzchowne żyły i napędza powstawanie żylaków",
    perforatorCaption:
      "Niewydolny perforator · Dociąża układ powierzchowny · Punkt diagnostyki USG Doppler",
  },
  {
    key: "profilaktyka",
    label: "Profilaktyka żylaków",
    route: "/dla-pacjenta/profilaktyka-zylakow",
    title: "Co dokładnie chronisz, dbając o nogi",
    subtitle:
      "Profilaktyka opóźnia moment, w którym zdrowe zastawki zaczynają się rozszczelniać. Zobacz, jakiemu mechanizmowi zapobiega regularny ruch i kompresjoterapia.",
    mainAlt:
      "Schemat porównawczy zdrowej zastawki żylnej i niedomykalności zastawek prowadzącej do refluksu (cofania krwi) — proces, któremu zapobiega regularny ruch, kompresjoterapia i pielęgnacja nóg",
    mainCaption:
      "Zdrowa zastawka · Pierwsze rozszczelnienie · Refluks i stan zapalny · Etap, któremu zapobiegasz",
    perforatorAlt:
      "Schemat niewydolnego perforatora — pokazuje, dlaczego długie stanie i siedzenie obciąża układ żylny; czynnik ryzyka, który łagodzi aktywność i kompresjoterapia",
    perforatorCaption:
      "Niewydolny perforator · Obciążenie z długiego stania · Łagodzony ruchem i kompresją",
  },
] as const;

type ViewportMode = "mobile" | "desktop";
type Mode = "view" | "edit";

const ALT_MIN = 60;
const ALT_BUDGET = 220;
const CAPTION_BUDGET = 110;
const SEGMENT_BUDGET = 40;

// Empirycznie skalibrowane szerokości pojedynczego znaku (px) dla figcaption
// renderowanego klasą `text-[11px] sm:text-xs` w VenousInsufficiencyImage.
// Mobile używa text-[11px] (~6.2 px/zn), desktop sm:text-xs (~6.6 px/zn).
const CAPTION_CHAR_PX: Record<ViewportMode, number> = {
  mobile: 6.2,
  desktop: 6.6,
};
// Szerokość kolumny figcaption ≈ szerokość wewn. obrazka (kontener - padding).
// Mobile (375): 375 - 16*2 (px-4 outer) - 16*2 (p-4 inner) ≈ 311 px,
// minus px-1 figcaption ≈ 303. Desktop (1280) liczymy realistycznie dla
// obrazka 2-kolumnowego: ~ (1280 - 64 - 64) / 2 ≈ 576 px.
const CAPTION_COLUMN_PX: Record<ViewportMode, number> = {
  mobile: 303,
  desktop: 560,
};
// Linie figcaption — komfortowy próg czytelności na mobile.
const CAPTION_LINE_WARN: Record<ViewportMode, number> = {
  mobile: 3,
  desktop: 2,
};
// Średnio: czytelność spada gdy >18 słów / linijkę przy gęstym layoutcie.
const READING_WPM = 220;

interface ReadabilityHints {
  estimatedLines: number;
  linesWarn: boolean;
  longestSegmentPx: number;
  segmentTruncationRisk: boolean;
  readingSeconds: number;
  wordCount: number;
}

interface FieldStats {
  length: number;
  budget: number;
  overBudget: boolean;
  underMin?: boolean;
  segments?: { text: string; length: number; overBudget: boolean }[];
  readability?: ReadabilityHints;
}

const buildReadability = (
  value: string,
  viewport: ViewportMode,
  segments: { text: string; length: number }[] | undefined,
): ReadabilityHints => {
  const charPx = CAPTION_CHAR_PX[viewport];
  const columnPx = CAPTION_COLUMN_PX[viewport];
  const charsPerLine = Math.max(1, Math.floor(columnPx / charPx));
  const estimatedLines = Math.max(1, Math.ceil(value.length / charsPerLine));
  const longestSegmentLen = segments
    ? Math.max(0, ...segments.map((s) => s.length))
    : value.length;
  const longestSegmentPx = longestSegmentLen * charPx;
  // Ryzyko ucięcia: pojedynczy segment albo całe słowo nie mieści się w kolumnie.
  const longestWord = value
    .split(/\s+/)
    .reduce((max, w) => Math.max(max, w.length), 0);
  const segmentTruncationRisk =
    longestSegmentPx > columnPx || longestWord * charPx > columnPx;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const readingSeconds = Math.max(1, Math.round((wordCount / READING_WPM) * 60));
  return {
    estimatedLines,
    linesWarn: estimatedLines > CAPTION_LINE_WARN[viewport],
    longestSegmentPx: Math.round(longestSegmentPx),
    segmentTruncationRisk,
    readingSeconds,
    wordCount,
  };
};

const buildStats = (
  value: string,
  budget: number,
  isCaption: boolean,
  viewport: ViewportMode,
): FieldStats => {
  const length = value.length;
  const stats: FieldStats = {
    length,
    budget,
    overBudget: length > budget,
    underMin: !isCaption && length < ALT_MIN,
  };
  if (isCaption) {
    stats.segments = value.split("·").map((segment) => {
      const text = segment.trim();
      return {
        text,
        length: text.length,
        overBudget: text.length > SEGMENT_BUDGET,
      };
    });
  }
  stats.readability = buildReadability(value, viewport, stats.segments);
  return stats;
};

const StatsBadge = ({ stats }: { stats: FieldStats }) => {
  const hasError = stats.overBudget || stats.underMin;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono ${
        hasError
          ? "bg-destructive/15 text-destructive border border-destructive/30"
          : "bg-muted text-muted-foreground border border-border/40"
      }`}
      title={
        stats.underMin
          ? `Min ${ALT_MIN} znaków (alt)`
          : stats.overBudget
            ? `Max ${stats.budget} znaków`
            : ""
      }
    >
      {stats.length}/{stats.budget}
      {stats.underMin && " ↓"}
    </span>
  );
};

const SegmentList = ({ segments }: { segments: NonNullable<FieldStats["segments"]> }) => (
  <ul className="mt-2 grid gap-1 text-[11px]">
    {segments.map((segment, idx) => (
      <li
        key={`${segment.text}-${idx}`}
        className={`flex items-center justify-between gap-2 rounded border px-2 py-1 ${
          segment.overBudget
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border/30 bg-card/40 text-foreground/80"
        }`}
      >
        <span className="truncate font-mono">{segment.text}</span>
        <span className="font-mono shrink-0">
          {segment.length}/{SEGMENT_BUDGET}
        </span>
      </li>
    ))}
  </ul>
);

// (ViewportMode + Mode are declared above near the budget constants)

const VIEWPORTS: Record<ViewportMode, { width: number; label: string }> = {
  mobile: { width: 375, label: "Mobile · 375px (iPhone)" },
  desktop: { width: 1280, label: "Desktop · 1280px" },
};

interface DraftFields {
  mainAlt: string;
  mainCaption: string;
  perforatorAlt: string;
  perforatorCaption: string;
}

const presetToDraft = (preset: PagePreset): DraftFields => ({
  mainAlt: preset.mainAlt,
  mainCaption: preset.mainCaption,
  perforatorAlt: preset.perforatorAlt,
  perforatorCaption: preset.perforatorCaption,
});

const DevVeinImagesPreview = () => {
  const [activeKey, setActiveKey] = useState<VeinImagePageKey>(PAGES[0]!.key);
  const [viewport, setViewport] = useState<ViewportMode>("mobile");
  const [mode, setMode] = useState<Mode>("view");
  const [saving, setSaving] = useState<VeinImageSlot | null>(null);
  const queryClient = useQueryClient();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();

  const active = useMemo(
    () => PAGES.find((page) => page.key === activeKey) ?? PAGES[0]!,
    [activeKey],
  );

  // Drafts per page — zachowujemy edycje przy przełączaniu zakładek.
  const [drafts, setDrafts] = useState<Record<VeinImagePageKey, DraftFields>>(
    () =>
      PAGES.reduce(
        (acc, p) => {
          acc[p.key] = presetToDraft(p);
          return acc;
        },
        {} as Record<VeinImagePageKey, DraftFields>,
      ),
  );

  const draft = drafts[activeKey];

  // Hook do bazy — pokazuje aktualne overrides per page.
  const overrides = useVeinImageOverridesForPage(activeKey);
  const lastSeededKey = useRef<VeinImagePageKey | null>(null);

  // Gdy baza dostarczy override dla aktywnej strony, jednorazowo seedujemy
  // draft (tylko jeśli draft jest jeszcze równy hardkodowanemu presetowi).
  useEffect(() => {
    if (lastSeededKey.current === activeKey) return;
    if (!overrides.main && !overrides.perforator) return;
    const preset = PAGES.find((p) => p.key === activeKey);
    if (!preset) return;
    setDrafts((prev) => {
      const current = prev[activeKey];
      const isPristine =
        current.mainAlt === preset.mainAlt &&
        current.mainCaption === preset.mainCaption &&
        current.perforatorAlt === preset.perforatorAlt &&
        current.perforatorCaption === preset.perforatorCaption;
      if (!isPristine) return prev;
      return {
        ...prev,
        [activeKey]: {
          mainAlt: overrides.main?.alt ?? preset.mainAlt,
          mainCaption: overrides.main?.caption ?? preset.mainCaption,
          perforatorAlt: overrides.perforator?.alt ?? preset.perforatorAlt,
          perforatorCaption: overrides.perforator?.caption ?? preset.perforatorCaption,
        },
      };
    });
    lastSeededKey.current = activeKey;
  }, [activeKey, overrides.main, overrides.perforator]);

  const stats = useMemo(
    () => ({
      mainAlt: buildStats(draft.mainAlt, ALT_BUDGET, false, viewport),
      mainCaption: buildStats(draft.mainCaption, CAPTION_BUDGET, true, viewport),
      perforatorAlt: buildStats(draft.perforatorAlt, ALT_BUDGET, false, viewport),
      perforatorCaption: buildStats(draft.perforatorCaption, CAPTION_BUDGET, true, viewport),
    }),
    [draft, viewport],
  );

  const updateDraft = (field: keyof DraftFields, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [activeKey]: { ...prev[activeKey], [field]: value },
    }));
  };

  const resetToProps = () => {
    setDrafts((prev) => ({ ...prev, [activeKey]: presetToDraft(active) }));
    toast({ title: "Przywrócono propsy źródłowe", description: active.label });
  };

  const resetToDb = () => {
    const preset = active;
    setDrafts((prev) => ({
      ...prev,
      [activeKey]: {
        mainAlt: overrides.main?.alt ?? preset.mainAlt,
        mainCaption: overrides.main?.caption ?? preset.mainCaption,
        perforatorAlt: overrides.perforator?.alt ?? preset.perforatorAlt,
        perforatorCaption: overrides.perforator?.caption ?? preset.perforatorCaption,
      },
    }));
    toast({ title: "Załadowano wartości z bazy", description: active.label });
  };

  const saveSlot = async (slot: VeinImageSlot) => {
    if (!isAdmin) {
      toast({
        title: "Brak uprawnień",
        description: "Tylko admin może zapisywać overrides do bazy.",
        variant: "destructive",
      });
      return;
    }
    const altField = slot === "main" ? "mainAlt" : "perforatorAlt";
    const captionField = slot === "main" ? "mainCaption" : "perforatorCaption";
    const altValue = draft[altField];
    const captionValue = draft[captionField];
    const altStats = buildStats(altValue, ALT_BUDGET, false);
    const captionStats = buildStats(captionValue, CAPTION_BUDGET, true);
    if (
      altStats.overBudget ||
      altStats.underMin ||
      captionStats.overBudget ||
      captionStats.segments?.some((s) => s.overBudget)
    ) {
      toast({
        title: "Walidacja nie przeszła",
        description:
          "Sprawdź długości — alt 60-220, caption ≤110, segment ≤40 znaków.",
        variant: "destructive",
      });
      return;
    }
    setSaving(slot);
    try {
      const { data: existing, error: lookupError } = await supabase
        .from("vein_image_overrides")
        .select("id")
        .eq("page_key", activeKey)
        .eq("slot", slot)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const payload = {
        page_key: activeKey,
        slot,
        alt: altValue,
        caption: captionValue,
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

      await queryClient.invalidateQueries({ queryKey: VEIN_IMAGE_QUERY_KEY });
      toast({
        title: "Zapisano",
        description: `${active.label} · ${slot === "main" ? "główny obraz" : "perforator"}`,
      });
    } catch (err) {
      toast({
        title: "Błąd zapisu",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (!import.meta.env.DEV) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-background text-foreground">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-bold">404</h1>
          <p className="text-sm text-muted-foreground">
            Ta strona jest dostępna tylko w trybie deweloperskim.
          </p>
        </div>
      </main>
    );
  }

  const viewportConfig = VIEWPORTS[viewport];
  const isEdit = mode === "edit";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-base font-bold">Vein Images — Preview</h1>
            <p className="text-[11px] text-muted-foreground">
              dev-only · {active.route}
              {isAdmin === false && (
                <span className="ml-2 text-destructive/80">
                  · zaloguj się jako admin, żeby zapisywać do bazy
                </span>
              )}
            </p>
          </div>

          {/* Mode toggle */}
          <div
            role="radiogroup"
            aria-label="Tryb"
            className="flex gap-1 rounded-lg border border-border/40 bg-card/60 p-1"
          >
            {(["view", "edit"] as Mode[]).map((m) => {
              const isActive = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setMode(m)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {m === "view" ? "👁️ Podgląd" : "✏️ Edycja"}
                </button>
              );
            })}
          </div>

          {/* Page tabs */}
          <div
            role="tablist"
            aria-label="Strona"
            className="flex flex-wrap gap-1 rounded-lg border border-border/40 bg-card/60 p-1"
          >
            {PAGES.map((page) => {
              const isActive = page.key === activeKey;
              return (
                <button
                  key={page.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveKey(page.key);
                    lastSeededKey.current = null; // pozwól ponownie zaseedować z bazy
                  }}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {page.label}
                </button>
              );
            })}
          </div>

          {/* Viewport toggle */}
          <div
            role="radiogroup"
            aria-label="Viewport"
            className="flex gap-1 rounded-lg border border-border/40 bg-card/60 p-1"
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
        </div>

        {isEdit && (
          <div className="max-w-7xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetToProps}
              className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-border/40 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              ↺ Reset do propsów
            </button>
            <button
              type="button"
              onClick={resetToDb}
              className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-border/40 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              ↺ Reset do bazy
            </button>
            <span className="text-[11px] text-muted-foreground">
              Edycja jest live — podgląd po lewej aktualizuje się natychmiast.
            </span>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Live preview — KLUCZOWE: czyta DRAFT, nie pageKey, żeby override nie nadpisywał edycji. */}
        <section
          aria-label="Podgląd renderu"
          className="rounded-xl border border-border/40 bg-card/30 p-4 overflow-x-auto"
        >
          <p className="text-[11px] text-muted-foreground mb-3 font-mono">
            {viewportConfig.label}
          </p>
          <div
            className="mx-auto border border-border/40 rounded-lg bg-background overflow-hidden"
            style={{ width: viewportConfig.width, maxWidth: "100%" }}
          >
            <div className="p-4">
              <VenousInsufficiencyImage
                key={`${active.key}-${viewport}-${isEdit ? "edit" : "view"}`}
                /* W trybie EDIT NIE przekazujemy pageKey — komponent użyłby
                   wtedy bazy zamiast naszego draftu. W VIEW przekazujemy
                   pageKey, żeby zobaczyć stan produkcyjny (z bazą). */
                pageKey={isEdit ? undefined : active.key}
                title={active.title}
                subtitle={active.subtitle}
                mainAlt={draft.mainAlt}
                mainCaption={draft.mainCaption}
                perforatorAlt={draft.perforatorAlt}
                perforatorCaption={draft.perforatorCaption}
              />
            </div>
          </div>
        </section>

        {/* Editor / stats panel */}
        <aside
          aria-label="Wartości alt i figcaption"
          className="space-y-4 text-sm"
        >
          {(["main", "perforator"] as VeinImageSlot[]).map((slot) => {
            const slotLabel = slot === "main" ? "Główny obraz" : "Perforator";
            const altField = slot === "main" ? "mainAlt" : "perforatorAlt";
            const captionField =
              slot === "main" ? "mainCaption" : "perforatorCaption";
            const altStats = stats[altField];
            const captionStats = stats[captionField];
            const isSaving = saving === slot;
            return (
              <div
                key={slot}
                className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-3"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {slotLabel}
                </h2>

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
                  {isEdit ? (
                    <textarea
                      id={`${slot}-alt`}
                      value={draft[altField]}
                      onChange={(e) => updateDraft(altField, e.target.value)}
                      rows={4}
                      className="w-full text-[12px] leading-relaxed rounded-md border border-border/50 bg-background/60 px-2 py-1.5 font-mono text-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  ) : (
                    <p className="text-[12px] leading-relaxed text-foreground/90 break-words">
                      {draft[altField]}
                    </p>
                  )}
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
                  {isEdit ? (
                    <textarea
                      id={`${slot}-caption`}
                      value={draft[captionField]}
                      onChange={(e) => updateDraft(captionField, e.target.value)}
                      rows={2}
                      className="w-full text-[12px] leading-relaxed rounded-md border border-border/50 bg-background/60 px-2 py-1.5 font-mono text-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  ) : (
                    <p className="text-[12px] leading-relaxed text-foreground/90 break-words">
                      {draft[captionField]}
                    </p>
                  )}
                  {captionStats.segments && (
                    <SegmentList segments={captionStats.segments} />
                  )}
                </div>

                {isEdit && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {overrides.main || overrides.perforator
                        ? "Baza ma override — zapis go nadpisze."
                        : "Brak wpisu w bazie — zapis utworzy nowy."}
                    </span>
                    <button
                      type="button"
                      disabled={!isAdmin || isSaving}
                      onClick={() => saveSlot(slot)}
                      title={
                        !isAdmin
                          ? "Wymaga admina (Lovable Cloud RLS)"
                          : "Zapisz override do bazy"
                      }
                      className="px-3 py-1 text-[11px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Zapisywanie…" : "💾 Zapisz do bazy"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground/80 mb-1">
              Mobile budget
            </p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Alt: {ALT_MIN}-{ALT_BUDGET} znaków</li>
              <li>Caption: max {CAPTION_BUDGET} znaków całość</li>
              <li>Segment „·": max {SEGMENT_BUDGET} znaków każdy</li>
            </ul>
            <p className="mt-2">
              W trybie <strong>Edycja</strong> podgląd ignoruje bazę i pokazuje
              draft. W trybie <strong>Podgląd</strong> komponent czyta z bazy
              (jeśli istnieje override) — tak jak na produkcji.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default DevVeinImagesPreview;
