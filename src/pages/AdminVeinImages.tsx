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
import VenousInsufficiencyImage from "@/components/shared/VenousInsufficiencyImage";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldAlert, Save, RotateCcw, Database, Download, FileJson, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";

const ALT_MIN = 60;
const ALT_BUDGET = 220;
const CAPTION_BUDGET = 110;
const SEGMENT_BUDGET = 40;

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

  const active = useMemo(
    () =>
      VEIN_IMAGE_PAGE_PRESETS.find((p) => p.key === activeKey) ??
      VEIN_IMAGE_PAGE_PRESETS[0]!,
    [activeKey],
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

      await queryClient.invalidateQueries({ queryKey: VEIN_IMAGE_QUERY_KEY });
      // Wymuś świeży render podglądu CMS i pokaż flash highlight.
      setSavedTick((t) => t + 1);
      setLastSaved({ at: Date.now(), slot, pageKey: activeKey });
      setPreviewMode("cms");
      toast.success(
        `Zapisano: ${active.label} · ${slot === "main" ? "główny obraz" : "perforator"} — podgląd odświeżony z bazy`,
      );
    } catch (err) {
      toast.error(
        `Błąd zapisu: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSaving(null);
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
          {/* Page tabs + viewport */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Strona"
              className="flex flex-wrap gap-1 rounded-lg border border-border/50 bg-card/60 p-1"
            >
              {VEIN_IMAGE_PAGE_PRESETS.map((page) => {
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
              })}
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

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToProps}
                title="Cofnij draft do hardkodowanych propsów"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset do propsów
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDb}
                title="Załaduj wartości aktualnie zapisane w bazie"
              >
                <Database className="w-3.5 h-3.5 mr-1" /> Reset do bazy
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
              {(["main", "perforator"] as VeinImageSlot[]).map((slot) => {
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

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {dbRow
                          ? `Ostatnia zmiana: ${new Date(dbRow.updated_at).toLocaleString("pl-PL")}${dbRow.updated_by ? ` · ${dbRow.updated_by}` : ""}`
                          : "Brak wpisu w bazie — zapis utworzy nowy."}
                      </span>
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
    </>
  );
};

export default AdminVeinImages;
