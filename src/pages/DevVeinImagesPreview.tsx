/**
 * Dev-only strona podglądu alt + figcaption dla VenousInsufficiencyImage.
 *
 * Cel: jeden ekran, w którym redaktor / osoba pisząca treść może:
 *   1. Przełączyć się między 4 stronami (EVLT, Mikroflebektomia, Flebologia,
 *      Profilaktyka żylaków).
 *   2. Zobaczyć dokładnie, jak alt i figcaption renderują się przy szerokości
 *      mobile (375px) i desktop (1280px) — żeby od razu wychwycić ucięte
 *      słowa lub łamanie segmentów caption.
 *   3. Zobaczyć "raw" wartości alt/caption + statystyki długości pod budżet
 *      mobile (≤220 znaków alt, ≤110 znaków caption, ≤40 znaków per segment).
 *
 * Strona:
 *   - jest dev-only (gated `import.meta.env.DEV`); na produkcji 404.
 *   - NIE używa Layout/Header/Footer — minimalny chrome.
 *   - reużywa hooka useVeinImageOverridesForPage (CMS overrides, jeśli baza
 *     ma wpisy, zostaną pokazane zamiast hardkodowanych fallbacków — ten sam
 *     efekt jak na produkcji).
 *
 * Mobile preview = element z width:375px scalowany przez transform; layout
 * dziecka liczy się od 375px (kontener nie pozwala mu się rozjechać). To
 * pokazuje rzeczywiste łamanie tekstu na małym ekranie BEZ konieczności
 * zmiany devtoolsowego viewportu.
 */
import { useMemo, useState } from "react";
import VenousInsufficiencyImage from "@/components/shared/VenousInsufficiencyImage";
import type { VeinImagePageKey } from "@/hooks/useVeinImageOverrides";

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

/**
 * UWAGA: te wartości są SYNCHRONIZOWANE z propsami w plikach stron
 * (EVLT.tsx, Mikroflebektomia.tsx, Flebologia.tsx, ProfilaktykaZylakow.tsx).
 * Test `VenousInsufficiencyImage.altCaption.test.tsx` weryfikuje, że
 * stringi tutaj występują w plikach źródłowych — gdy się rozjedzie, test
 * faila i trzeba zsynchronizować obie strony.
 */
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

const ALT_BUDGET = 220;
const CAPTION_BUDGET = 110;
const SEGMENT_BUDGET = 40;

interface FieldStats {
  length: number;
  budget: number;
  overBudget: boolean;
  segments?: { text: string; length: number; overBudget: boolean }[];
}

const buildStats = (
  value: string,
  budget: number,
  isCaption: boolean,
): FieldStats => {
  const length = value.length;
  const stats: FieldStats = {
    length,
    budget,
    overBudget: length > budget,
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
  return stats;
};

const StatsBadge = ({ stats }: { stats: FieldStats }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono ${
      stats.overBudget
        ? "bg-destructive/15 text-destructive border border-destructive/30"
        : "bg-muted text-muted-foreground border border-border/40"
    }`}
  >
    {stats.length}/{stats.budget}
  </span>
);

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

type ViewportMode = "mobile" | "desktop";

const VIEWPORTS: Record<ViewportMode, { width: number; label: string }> = {
  mobile: { width: 375, label: "Mobile · 375px (iPhone)" },
  desktop: { width: 1280, label: "Desktop · 1280px" },
};

const DevVeinImagesPreview = () => {
  const [activeKey, setActiveKey] = useState<VeinImagePageKey>(PAGES[0]!.key);
  const [viewport, setViewport] = useState<ViewportMode>("mobile");

  const active = useMemo(
    () => PAGES.find((page) => page.key === activeKey) ?? PAGES[0]!,
    [activeKey],
  );

  const stats = useMemo(
    () => ({
      mainAlt: buildStats(active.mainAlt, ALT_BUDGET, false),
      mainCaption: buildStats(active.mainCaption, CAPTION_BUDGET, true),
      perforatorAlt: buildStats(active.perforatorAlt, ALT_BUDGET, false),
      perforatorCaption: buildStats(active.perforatorCaption, CAPTION_BUDGET, true),
    }),
    [active],
  );

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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-base font-bold">Vein Images — Preview</h1>
            <p className="text-[11px] text-muted-foreground">
              dev-only · {active.route}
            </p>
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
                  onClick={() => setActiveKey(page.key)}
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
            {(Object.keys(VIEWPORTS) as ViewportMode[]).map((mode) => {
              const isActive = mode === viewport;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setViewport(mode)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {mode === "mobile" ? "📱 Mobile" : "🖥️ Desktop"}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Live preview */}
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
              {/* Reużywamy realny komponent — to samo co na produkcji */}
              <VenousInsufficiencyImage
                key={`${active.key}-${viewport}`}
                pageKey={active.key}
                title={active.title}
                subtitle={active.subtitle}
                mainAlt={active.mainAlt}
                mainCaption={active.mainCaption}
                perforatorAlt={active.perforatorAlt}
                perforatorCaption={active.perforatorCaption}
              />
            </div>
          </div>
        </section>

        {/* Raw values + stats */}
        <aside
          aria-label="Wartości alt i figcaption"
          className="space-y-4 text-sm"
        >
          <div className="rounded-xl border border-border/40 bg-card/30 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Główny obraz · alt
              </h2>
              <StatsBadge stats={stats.mainAlt} />
            </div>
            <p className="text-[12px] leading-relaxed text-foreground/90 break-words">
              {active.mainAlt}
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/30 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Główny obraz · figcaption
              </h2>
              <StatsBadge stats={stats.mainCaption} />
            </div>
            <p className="text-[12px] leading-relaxed text-foreground/90 break-words">
              {active.mainCaption}
            </p>
            {stats.mainCaption.segments && (
              <SegmentList segments={stats.mainCaption.segments} />
            )}
          </div>

          <div className="rounded-xl border border-border/40 bg-card/30 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Perforator · alt
              </h2>
              <StatsBadge stats={stats.perforatorAlt} />
            </div>
            <p className="text-[12px] leading-relaxed text-foreground/90 break-words">
              {active.perforatorAlt}
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/30 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Perforator · figcaption
              </h2>
              <StatsBadge stats={stats.perforatorCaption} />
            </div>
            <p className="text-[12px] leading-relaxed text-foreground/90 break-words">
              {active.perforatorCaption}
            </p>
            {stats.perforatorCaption.segments && (
              <SegmentList segments={stats.perforatorCaption.segments} />
            )}
          </div>

          <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground/80 mb-1">
              Mobile budget
            </p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Alt: max {ALT_BUDGET} znaków</li>
              <li>Caption: max {CAPTION_BUDGET} znaków całość</li>
              <li>Segment „·": max {SEGMENT_BUDGET} znaków każdy</li>
            </ul>
            <p className="mt-2">
              Jeśli baza <code>vein_image_overrides</code> ma wpis dla tej
              strony, podgląd pokazuje wartości z bazy (override).
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default DevVeinImagesPreview;
