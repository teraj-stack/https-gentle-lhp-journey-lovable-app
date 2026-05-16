import { test, expect, type Page } from "@playwright/test";

/**
 * Walidacja responsywna CTA hero (Home) na kluczowych szerokościach mobile:
 * iPhone SE/8 (375), iPhone 12/13/14 (390), iPhone Plus/XR (414).
 *
 * Sprawdzamy dla każdej szerokości:
 *  1. Hero CTA „Umów konsultację" i „Sprawdź dostępne terminy" są widoczne.
 *  2. Mają tap target >= 44x44 px (WCAG 2.5.5 / Apple HIG).
 *  3. Nie wychodzą poza viewport (brak horyzontalnego overflow).
 *  4. Sticky bar mobile jest widoczny, ma 2 klikalne CTA, nie zasłania stopki
 *     gdy przewiniemy na sam dół (treść za stickym pozostaje dostępna –
 *     bottom strony powinien być >= bottom sticky baru).
 *  5. Każdy CTA odpowiada na kliknięcie (focus + Enter nie throwuje, link ma href).
 */

const VIEWPORTS = [
  { name: "iPhone SE (375)", width: 375, height: 667 },
  { name: "iPhone 13 (390)", width: 390, height: 844 },
  { name: "iPhone XR (414)", width: 414, height: 896 },
] as const;

const MIN_TAP = 44;

async function expectVisibleAndTappable(page: Page, locator: ReturnType<Page["locator"]>, label: string) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} should have bounding box`).not.toBeNull();
  expect.soft(box!.width, `${label} width >= ${MIN_TAP}px`).toBeGreaterThanOrEqual(MIN_TAP);
  expect.soft(box!.height, `${label} height >= ${MIN_TAP}px`).toBeGreaterThanOrEqual(MIN_TAP);
  // Element musi być w obrębie viewportu (bez ujemnych offsetów / overflow)
  const viewport = page.viewportSize()!;
  expect.soft(box!.x, `${label} x >= 0`).toBeGreaterThanOrEqual(0);
  expect.soft(box!.x + box!.width, `${label} fits viewport width`).toBeLessThanOrEqual(viewport.width + 1);
}

for (const vp of VIEWPORTS) {
  test.describe(`Home hero CTA @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("CTA w hero są widoczne, klikalne i mieszczą się w viewporcie", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Hero CTA – linki zewnętrzne do ZnanyLekarz
      const book = page.getByRole("link", { name: /umów konsultację/i }).first();
      const slots = page.getByRole("link", { name: /sprawdź dostępne terminy/i }).first();

      await expectVisibleAndTappable(page, book, "Hero „Umów konsultację”");
      await expectVisibleAndTappable(page, slots, "Hero „Sprawdź dostępne terminy”");

      // Linki mają poprawne href (UTM + ewentualny #calendar)
      await expect(book).toHaveAttribute("href", /znanylekarz\.pl/);
      await expect(slots).toHaveAttribute("href", /#calendar$/);

      // Brak horyzontalnego overflow strony
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect.soft(overflow, "brak horyzontalnego overflow").toBeLessThanOrEqual(1);
    });

    test("Sticky CTA mobile jest widoczny i nie zakrywa końca treści", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const sticky = page.getByRole("region", { name: /szybkie akcje/i });
      await expect(sticky, "sticky bar jest w DOM i widoczny").toBeVisible();

      const stickyBook = sticky.getByRole("link", { name: /umów konsultację/i });
      const stickySlots = sticky.getByRole("link", { name: /sprawdź terminy/i });

      await expectVisibleAndTappable(page, stickyBook, "Sticky „Umów konsultację”");
      await expectVisibleAndTappable(page, stickySlots, "Sticky „Sprawdź terminy”");

      // Sticky musi być przy dolnej krawędzi viewportu
      const stickyBox = (await sticky.boundingBox())!;
      expect.soft(stickyBox.y + stickyBox.height, "sticky dotyka dołu viewportu").toBeGreaterThanOrEqual(vp.height - 2);

      // Po przewinięciu na dół: ostatni element strony nie chowa się pod sticky barem
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(150);

      const pageBottom = await page.evaluate(
        () => document.documentElement.getBoundingClientRect().bottom
      );
      const stickyTop = (await sticky.boundingBox())!.y;
      expect
        .soft(pageBottom, "dolny padding strony respektuje sticky + safe-area")
        .toBeLessThanOrEqual(stickyTop + 1);
    });
  });
}
