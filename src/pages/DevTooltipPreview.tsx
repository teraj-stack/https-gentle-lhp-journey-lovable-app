/**
 * Dev-only strona dla wizualnej regresji tooltipa „Ostatnia zmiana".
 *
 * Renderuje 6 statycznych wariantów side-by-side, każdy z `defaultOpen`,
 * tak żeby Playwright mógł zrobić `toHaveScreenshot` per kafelek bez
 * interakcji (hover/focus). Każdy kafelek dostaje unikalny `data-testid`
 * w postaci `tooltip-variant-{slug}` — spec wizualny używa tego do
 * lokalizacji elementów.
 *
 * UWAGI:
 *  - Strona jest świadomie LEKKA — żadnego Layout/Header/Footer, tylko
 *    czyste tło i siatka kafelków. Mniej zmiennych = mniej flaky baseline.
 *  - Wszystkie warianty czytają z `buildLastChangeTooltipModel` (single
 *    source of truth), więc snapshoty wizualne pokrywają faktyczny model,
 *    a nie zaślepkę inline.
 *  - Trasa zarejestrowana w `App.tsx` jako `/dev/tooltip-preview` —
 *    nieindeksowana (poza menu), wyłącznie do testów.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  buildLastChangeTooltipModel,
  type LastChangeTooltipModelInput,
} from "@/lib/lastChangeTooltipModel";

interface PreviewVariant {
  /** Slug do `data-testid` (np. „remote-full-pl"). */
  slug: string;
  /** Krótki tytuł kafelka pokazywany NAD tooltipem (poza screenshotem). */
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
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6"
    >
      <p className="text-xs font-mono text-muted-foreground">{variant.label}</p>

      {/*
        Kontener tooltipa ma stałą szerokość (260px), żeby długie wartości
        (np. preserve-newlines) konsekwentnie zawijały się tak samo na CI
        i lokalnie — to eliminuje flaky baseline od auto-sizingu.
      */}
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={model.ariaText}
            title={model.ariaText}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm"
          >
            Ostatnia zmiana
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={8}
          className="max-w-[260px] whitespace-pre-line"
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
        </TooltipContent>
      </Tooltip>
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
          Padding kafelków zapewnia, że TooltipContent (renderowany przez
          Radix portal) ma miejsce na rozwinięcie się pod triggerem bez
          nakładania się na sąsiednie kafelki.
        */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {VARIANTS.map((variant) => (
            <TooltipVariantTile key={variant.slug} variant={variant} />
          ))}
        </div>
      </div>
    </main>
  );
};

export default DevTooltipPreview;
