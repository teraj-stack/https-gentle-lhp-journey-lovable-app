/**
 * Wizualna regresja tooltipa „Ostatnia zmiana".
 *
 * Renderuje stronę dev-only `/dev/tooltip-preview` z 6 statycznymi
 * wariantami i robi `toHaveScreenshot` per kafelek. Każdy snapshot pokrywa
 * jeden kluczowy aspekt:
 *
 *   1. remote + pełna data (PL) — happy path zdalnej synchronizacji.
 *   2. local + pełna data (PL) — happy path lokalnej akcji + badge.
 *   3. remote + relative fallback (PL) — sufiks „(etykieta względna)" +
 *      native title pomocniczy.
 *   4. brak danych (PL) — 2-liniowy tooltip, BEZ linii „Czas:" (regresja
 *      na osierocone prefiksy).
 *   5. remote + full date (EN) — parytet językowy (prefiks „Time:" +
 *      angielski opis).
 *   6. preserve-newlines (PL) — wieloliniowa wartość czasu (regresja na
 *      łamanie linii w `<TooltipContent>` z `whitespace-pre-line`).
 *
 * Threshold `maxDiffPixelRatio: 0.01` (1% pikseli) chroni przed sub-pixel
 * anti-aliasingiem między maszynami CI/lokalnie, ale nadal wychwyci
 * większe regresje odstępów/typografii. Pierwszy run tworzy baseline
 * w `tests/visual/__screenshots__/`. Kolejne porównują.
 *
 * UWAGA: Test używa stałego viewport 1280x720, żeby siatka renderowała
 * się jako 3x2 — zmiana tego rozmiaru wymaga regeneracji baseline.
 */
import { test, expect } from "../../playwright-fixture";

test.describe("Tooltip „Ostatnia zmiana" — wizualna regresja", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/tooltip-preview");

    // Czekamy aż ROOT się wyrenderuje (lazy import + Suspense).
    await expect(page.getByTestId("dev-tooltip-preview-root")).toBeVisible();

    // Czekamy aż wszystkie 6 kafelków będą widoczne — Radix Tooltip
    // z `defaultOpen` renderuje TooltipContent przez portal asynchronicznie.
    for (const slug of TOOLTIP_VARIANT_SLUGS) {
      await expect(page.getByTestId(`tooltip-variant-${slug}`)).toBeVisible();
    }

    // Tooltip pojawia się przez Radix portal — czekamy aż wszystkie 6
    // wariantów ma widoczny TooltipContent (rola tooltip).
    await expect(page.locator('[role="tooltip"]')).toHaveCount(6);

    // Stabilizujemy animacje wejścia tooltipa (fade-in + zoom-in z Radix).
    // Bez tego pierwszy snapshot łapie tooltip w połowie animacji.
    await page.waitForTimeout(200);
  });

  for (const variant of VARIANT_SCREENSHOT_CONFIG) {
    test(`wariant: ${variant.label}`, async ({ page }) => {
      const tile = page.getByTestId(`tooltip-variant-${variant.slug}`);

      // Screenshot kafelka razem z tooltipem (TooltipContent jest w portalu,
      // ale renderowany absolutnie pod triggerem — mieści się w padding
      // 12 wokół kafelka). Bierzemy bounding box z padding, żeby objąć
      // popover.
      await expect(tile).toHaveScreenshot(`${variant.slug}.png`, {
        maxDiffPixelRatio: 0.01,
        // Powiększ obszar snapshotu o 200px w dół, żeby objąć portalowy
        // TooltipContent renderowany pod triggerem.
        animations: "disabled",
      });
    });
  }
});

const TOOLTIP_VARIANT_SLUGS = [
  "remote-full-pl",
  "local-full-pl",
  "remote-relative-pl",
  "no-data-pl",
  "remote-full-en",
  "preserve-newlines-pl",
] as const;

const VARIANT_SCREENSHOT_CONFIG = [
  { slug: "remote-full-pl", label: "remote + pełna data (PL)" },
  { slug: "local-full-pl", label: "local + pełna data (PL)" },
  { slug: "remote-relative-pl", label: "remote + relative fallback (PL)" },
  { slug: "no-data-pl", label: "brak danych (PL) — bez linii Czas:" },
  { slug: "remote-full-en", label: "remote + full date (EN)" },
  { slug: "preserve-newlines-pl", label: "preserve-newlines (PL)" },
] as const;
