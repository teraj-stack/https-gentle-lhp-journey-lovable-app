/**
 * Wizualna regresja tooltipa „Ostatnia zmiana".
 *
 * Renderuje stronę dev-only `/dev/tooltip-preview` z 6 statycznymi
 * wariantami i robi `toHaveScreenshot` per kafelek. Każdy snapshot pokrywa
 * jeden kluczowy aspekt:
 *
 *   1. remote + pełna data (PL) — happy path zdalnej synchronizacji.
 *   2. local + pełna data (PL) — happy path lokalnej akcji.
 *   3. remote + relative fallback (PL) — sufiks „(etykieta względna)" +
 *      native title pomocniczy.
 *   4. brak danych (PL) — 2-liniowy tooltip, BEZ linii „Czas:" (regresja
 *      na osierocone prefiksy).
 *   5. remote + full date (EN) — parytet językowy (prefiks „Time:" +
 *      angielski opis).
 *   6. preserve-newlines (PL) — wieloliniowa wartość czasu (regresja na
 *      łamanie linii w `whitespace-pre-line`).
 *
 * Threshold `maxDiffPixelRatio: 0.01` (1% pikseli) chroni przed sub-pixel
 * anti-aliasingiem między maszynami CI/lokalnie, ale nadal wychwyci
 * większe regresje odstępów/typografii.
 *
 * Pierwszy run: tworzy baseline w `tests/visual/__screenshots__/`.
 * Kolejne runy: porównują pixel-by-pixel z baseline.
 *
 * Aby zaktualizować baseline po świadomej zmianie wizualnej:
 *   `npx playwright test tests/visual/tooltip-last-change.spec.ts --update-snapshots`
 *
 * UWAGA: Test używa stałego viewport 1280x720, żeby siatka renderowała się
 * jako 3x2. Zmiana viewport wymaga regeneracji baseline.
 */
import { test, expect } from "../../playwright-fixture";

const VARIANTS = [
  { slug: "remote-full-pl", label: "remote + pełna data (PL)" },
  { slug: "local-full-pl", label: "local + pełna data (PL)" },
  { slug: "remote-relative-pl", label: "remote + relative fallback (PL)" },
  { slug: "no-data-pl", label: "brak danych (PL) — bez linii Czas:" },
  { slug: "remote-full-en", label: "remote + full date (EN)" },
  { slug: "preserve-newlines-pl", label: "preserve-newlines (PL)" },
] as const;

test.describe("Tooltip „Ostatnia zmiana" — wizualna regresja", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/tooltip-preview");

    // Czekamy aż root strony się wyrenderuje (lazy import + Suspense).
    await expect(page.getByTestId("dev-tooltip-preview-root")).toBeVisible();

    // Czekamy aż wszystkie 6 kafelków + ich wewnętrzne tooltipy są w DOM.
    // Bez tego pierwszy screenshot łapie kafelek przed dohydratacją React.
    for (const variant of VARIANTS) {
      await expect(
        page.getByTestId(`tooltip-variant-${variant.slug}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`tooltip-content-${variant.slug}`),
      ).toBeVisible();
    }

    // Czekamy na fonts.ready — typografia (Cormorant Garamond + Inter)
    // ładuje się asynchronicznie, a różnica fallback→target font da
    // 100% różnicę pikseli na całym tekście tooltipa.
    await page.evaluate(() => document.fonts.ready);
  });

  for (const variant of VARIANTS) {
    test(`wariant: ${variant.label}`, async ({ page }) => {
      const tile = page.getByTestId(`tooltip-variant-${variant.slug}`);

      // Snapshot kafelka — obejmuje trigger + statyczną replikę popovera
      // (oba renderowane wewnątrz `<TooltipVariantTile>`, NIE przez portal).
      await expect(tile).toHaveScreenshot(`${variant.slug}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });
  }
});
