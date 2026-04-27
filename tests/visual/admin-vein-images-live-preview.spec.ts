/**
 * Visual regression dla LIVE PREVIEW w `/admin/vein-images`.
 *
 * Cel:
 *  1. Snapshoty wizualne sekcji „Draft (live)" w 3 stanach:
 *       - state A: pusty draft (po wejściu na panel, mock zwraca [] z bazy)
 *       - state B: po edycji alt głównego obrazu (figcaption nietknięte)
 *       - state C: po edycji alt + caption (oba pola wypełnione)
 *  2. Assercje anty-łamliwości layoutu — niezależnie od snapshota:
 *       - sekcja preview NIE wywołuje horizontalnego scrolla na <html>
 *         (overflowX strony = clientWidth strony)
 *       - frame podglądu mieści się w bounding box viewportu (right ≤ vw)
 *       - <img> draft jest widoczny i ma niezerową szerokość renderu
 *       - <figcaption> draft (gdy uzupełniony) nie jest obcięty (scrollWidth ≤ clientWidth + 1px tolerancji)
 *
 * Viewporty (4 sztuki, snapowane do supportowanych przez Playwright):
 *   - 320×568  → small mobile (najmniejszy, łapie wczesne łamanie się textareas/preview)
 *   - 375×812  → standard mobile
 *   - 768×1024 → tablet portrait (zmiana grid `lg:grid-cols-[1fr_440px]` na single column)
 *   - 1280×720 → desktop (układ dwukolumnowy: preview + edytor obok)
 *
 * Mock REST: pusty (jak w `admin-vein-images-live-preview.spec.ts`) — żaden zapis nie idzie
 * do bazy. Dzięki temu test jest zielony przy każdym CI run i nie wymaga seed/cleanup.
 *
 * Snapshot tolerancje:
 *   maxDiffPixelRatio: 0.03 — sekcja zawiera SVG/raster `VenousInsufficiencyImage`
 *   z minimalnymi różnicami anti-aliasingu między uruchomieniami.
 *
 * Pierwszy run wygeneruje baseline (`*-snapshots/`). Kolejne runy porównują z baseline.
 * Aby zaktualizować po świadomej zmianie UI: `bun run test:e2e -- --update-snapshots`.
 */
import { test, expect, type Page, type Route } from "../../playwright-fixture";
import {
  assertLayoutDoesNotBreak,
  assertCaptionNotClipped,
  LIVE_PREVIEW_SNAPSHOT_DIFF_RATIO,
} from "./_helpers/livePreviewLayoutAssertions";

const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD ?? "";
const HAS_CREDS = ADMIN_EMAIL.length > 0 && ADMIN_PASSWORD.length > 0;

const SUPABASE_REST = /\/rest\/v1\/vein_image_overrides(\?.*)?$/;

const installEmptyOverridesMock = async (page: Page) => {
  await page.route(SUPABASE_REST, async (route: Route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-range": "0-0/0",
        },
        body: "[]",
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: "[]",
    });
  });
};

const loginAsAdmin = async (page: Page): Promise<void> => {
  await page.goto("/admin/login?e2e=1");
  const form = page.getByTestId("e2e-login-form");
  await expect(form).toBeVisible();
  await form.getByLabel("Email").fill(ADMIN_EMAIL);
  await form.getByLabel("Hasło").fill(ADMIN_PASSWORD);
  await form.getByRole("button", { name: /^Zaloguj się \(E2E\)$/ }).click();
  await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
};

const longAlt = (suffix: string): string =>
  `VISUAL ${suffix} – schemat układu żylnego kończyny dolnej z perforatorami i kierunkiem przepływu krwi w naczyniach powierzchownych.`;

const longCaption = (suffix: string): string =>
  `VISUAL ${suffix} · podgląd renderu · ryc. snapshot`;

// Asercje anty-łamliwości layoutu (overflow strony, frame w viewporcie, draft img)
// oraz asercja figcaption są wspólne dla light/dark — patrz `_helpers/livePreviewLayoutAssertions.ts`,
// gdzie zdefiniowano nazwane progi tolerancji (SUBPIXEL_ROUNDING_PX, HARD_OVERFLOW_CEILING_PX,
// VIEWPORT_FIT_TOLERANCE_PX, TEXT_OVERFLOW_TOLERANCE_PX) z dwustronnym sprawdzaniem
// (soft próg = sub-pixel noise OK, hard ceiling = realna regresja).


const VIEWPORTS = [
  { name: "small-mobile", width: 320, height: 568 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 720 },
] as const;

test.describe("AdminVeinImages — visual regression LIVE PREVIEW (4 viewporty)", () => {
  test.beforeAll(() => {
    if (!HAS_CREDS) {
      // eslint-disable-next-line no-console
      console.warn(
        "[admin-vein-images-live-preview-visual] Pominięto: brak ADMIN_E2E_EMAIL/PASSWORD. " +
          "Visual regression wymaga real auth (sesja admina).",
      );
    }
  });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} (${viewport.width}×${viewport.height}): live preview snapshots + layout integrity`, async ({
      page,
    }) => {
      test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD — test wymaga real auth.");

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installEmptyOverridesMock(page);
      await loginAsAdmin(page);
      await page.goto("/admin/vein-images");
      await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();

      // Default tab to EVLT.
      const evltTab = page.getByRole("tab", { name: /EVLT/i });
      await expect(evltTab).toHaveAttribute("aria-selected", "true");

      const previewSection = page.getByTestId("live-preview-section");
      await expect(previewSection).toBeVisible();

      // === STATE A: pusty draft (po wejściu na panel) ===
      await assertLayoutDoesNotBreak(page, viewport.width, "light");
      await expect(previewSection).toHaveScreenshot(
        `live-preview-${viewport.name}-state-a-empty.png`,
        {
          maxDiffPixelRatio: LIVE_PREVIEW_SNAPSHOT_DIFF_RATIO,
          animations: "disabled",
        },
      );

      // === STATE B: po edycji alt głównego obrazu ===
      const altTextarea = page.locator("#main-alt");
      const newAlt = longAlt(viewport.name);
      await altTextarea.fill(newAlt);
      // Czekamy na re-render preview z nowym alt.
      await expect(
        previewSection.locator(`img[alt="${newAlt}"]`).first(),
      ).toBeVisible();

      await assertLayoutDoesNotBreak(page, viewport.width, "light");
      await expect(previewSection).toHaveScreenshot(
        `live-preview-${viewport.name}-state-b-alt-edited.png`,
        {
          maxDiffPixelRatio: LIVE_PREVIEW_SNAPSHOT_DIFF_RATIO,
          animations: "disabled",
        },
      );

      // === STATE C: po edycji alt + caption ===
      const capTextarea = page.locator("#main-caption");
      const newCap = longCaption(viewport.name);
      await capTextarea.fill(newCap);
      await expect(
        previewSection.getByText(newCap, { exact: false }).first(),
      ).toBeVisible();

      await assertLayoutDoesNotBreak(page, viewport.width, "light");
      await assertCaptionNotClipped(page, "light");
      await expect(previewSection).toHaveScreenshot(
        `live-preview-${viewport.name}-state-c-alt-and-caption.png`,
        {
          maxDiffPixelRatio: LIVE_PREVIEW_SNAPSHOT_DIFF_RATIO,
          animations: "disabled",
        },
      );
    });
  }
});
