/**
 * Dev-only strona dla wizualnej regresji tooltipa „Ostatnia zmiana".
 *
 * Renderuje 6 statycznych wariantów side-by-side, każdy z `data-testid`,
 * tak żeby Playwright mógł zrobić `toHaveScreenshot` per kafelek.
 *
 * DLACZEGO NIE RADIX TOOLTIP?
 * ---------------------------
 * Radix `<Tooltip>` renderuje `<TooltipContent>` przez `Portal` do
 * `document.body` — popover NIE jest częścią poddrzewa kafelka, więc
 * `tile.screenshot()` w Playwright NIE złapałby treści tooltipa. Ponadto
 * Radix dodaje animacje wejścia (fade-in + zoom-in), które destabilizują
 * pierwszy frame screenshota.
 *
 * Zamiast tego renderujemy STATYCZNĄ replikę popovera (`role="tooltip"`,
 * te same klasy `bg-popover` + `border` co `<TooltipContent>`) inline pod
 * triggerem. Test wizualny weryfikuje:
 *   - poprawne odstępy/typografię z `buildLastChangeTooltipModel`,
 *   - łamanie linii dla `preserve-newlines`,
 *   - obecność/brak linii „Czas: …" dla wariantów bez danych,
 *   - parytet PL/EN.
 *
 * Test NIE weryfikuje animacji Radix ani pozycjonowania portalu (to
 * odpowiedzialność biblioteki — pokryta jej własnymi testami).
 *
 * Strona jest świadomie LEKKA — żadnego Layout/Header/Footer, tylko czyste
 * tło i siatka kafelków. Mniej zmiennych = mniej flaky baseline.
 */
import {
  buildLastChangeTooltipModel,
  type LastChangeTooltipModelInput,
} from "@/lib/lastChangeTooltipModel";

interface PreviewVariant {
  /** Slug do `data-testid` (np. „remote-full-pl"). */
  slug: string;
  /** Krótki tytuł kafelka pokazywany NAD tooltipem (poza screenshotem mogłoby być, ale i tak włączamy w snapshot). */
  label: string;
  input: LastChangeTooltipModelInput;
}

/**
 * 6 kluczowych wariantów (uzgodnione z użytkownikiem):
 *  1. remote + full PL — happy path zdalnej synchronizacji.
 *  2. local + full PL — happy path lokalnej akcji.
 *  3. remote + relative fallback PL — brak pełnej daty, sufiks „(etykieta względna)".
 *  4. brak danych PL — 2-liniowy tooltip bez „Czas:".
 *  5. remote + full EN — parytet językowy.
 *  6. preserve-newlines — wieloliniowa wartość czasu (test łamania linii).
 */
const VARIANTS: PreviewVariant[] = [
  {
    slug: "remote-full-pl",
    label: "1. remote + pełna data (PL)",
    input: {
      source: "remote",
      fullDate: "24 kwietnia 2026, 12:34:56",
      relativeLabel: "5 sekund temu",
      locale: "pl",
    },
  },
  {
    slug: "local-full-pl",
    label: "2. local + pełna data (PL)",
    input: {
      source: "local",
      fullDate: "24 kwietnia 2026, 12:34:56",
      relativeLabel: "przed chwilą",
      locale: "pl",
    },
  },
  {
    slug: "remote-relative-pl",
    label: "3. remote + relative fallback (PL)",
    input: {
      source: "remote",
      fullDate: null,
      relativeLabel: "5 sekund temu",
      locale: "pl",
    },
  },
  {
    slug: "no-data-pl",
    label: "4. brak danych (PL)",
    input: {
      source: "local",
      fullDate: null,
      relativeLabel: null,
      locale: "pl",
    },
  },
  {
    slug: "remote-full-en",
    label: "5. remote + full date (EN)",
    input: {
      source: "remote",
      fullDate: "April 24, 2026, 12:34:56",
      relativeLabel: "5 seconds ago",
      locale: "en",
    },
  },
  {
    slug: "preserve-newlines-pl",
    label: "6. preserve-newlines (PL)",
    input: {
      source: "local",
      fullDate: "24 kwietnia 2026\n12:34:56",
      relativeLabel: null,
      locale: "pl",
      format: "preserve-newlines",
    },
  },
];

const TooltipVariantTile = ({ variant }: { variant: PreviewVariant }) => {
  const model = buildLastChangeTooltipModel(variant.input);

  return (
    <div
      data-testid={`tooltip-variant-${variant.slug}`}
      className="flex flex-col items-stretch gap-3 rounded-lg border border-border bg-card p-6"
    >
      <p className="text-xs font-mono text-muted-foreground">{variant.label}</p>

      {/* Trigger — wizualnie identyczny z `<TooltipTrigger>` w realnym UI. */}
      <button
        type="button"
        aria-label={model.ariaText}
        title={model.ariaText}
        className="self-start rounded-md border border-border bg-background px-4 py-2 text-sm"
      >
        Ostatnia zmiana
      </button>

      {/*
        Statyczna replika popovera. Klasy SKOPIOWANE 1:1 z
        `src/components/ui/tooltip.tsx` (poza animacjami wejścia, których
        nie chcemy w screenshocie deterministycznym). Szerokość ograniczona
        do 260px, żeby zachowanie wrap było identyczne lokalnie i na CI.
      */}
      <div
        role="tooltip"
        data-testid={`tooltip-content-${variant.slug}`}
        className="z-50 max-w-[260px] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md whitespace-pre-line"
      >
        <div className="flex flex-col gap-1 text-left">
          <p className="font-semibold">{model.content.heading}</p>
          <p className="text-xs text-muted-foreground">
            {model.content.description}
          </p>
          {model.shouldRenderTimeLine && (
            <p
              className="text-xs font-mono"
              title={model.timeLineHelpTitle}
            >
              {model.timeLineForView}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const DevTooltipPreview = () => {
  return (
    <main
      data-testid="dev-tooltip-preview-root"
      className="min-h-screen bg-background p-8"
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 font-serif text-2xl">
          Tooltip „Ostatnia zmiana" — wizualne warianty
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Strona dev-only do wizualnej regresji (Playwright). 6 statycznych
          wariantów z otwartym tooltipem, gotowe do `toHaveScreenshot`.
        </p>

        {/*
          Siatka 3x2 na desktop (>=1024px), 2x3 na tablet, 1x6 na mobile.
          Test wizualny ustawia stały viewport (1280x720) — wymusza układ 3x2.
        */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {VARIANTS.map((variant) => (
            <TooltipVariantTile key={variant.slug} variant={variant} />
          ))}
        </div>
      </div>
    </main>
  );
};

export default DevTooltipPreview;
