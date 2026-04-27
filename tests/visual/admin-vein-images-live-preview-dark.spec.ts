/**
 * Visual regression dla LIVE PREVIEW w `/admin/vein-images` — wariant DARK MODE.
 *
 * Bliźniak `admin-vein-images-live-preview.spec.ts`, ale przed każdym snapshotem
 * ustawiamy:
 *   - `<html class="dark">` (Tailwind `darkMode: "class"`),
 *   - `colorScheme: "dark"` na page (Playwright API), aby `prefers-color-scheme`
 *     w UI matchowało dark (sterowanie media query w komponentach typu sonner).
 *
 * UWAGA o intencji testu:
 *  Projekt obecnie nie definiuje osobnego bloku `.dark { ... }` w `index.css`
 *  (paleta `:root` jest już ciemna), więc snapshoty dark vs. light będą bardzo
 *  zbliżone wizualnie. Test ma jednak dwie konkretne wartości:
 *    1) Łapie regresje w MOMENCIE, gdy ktoś dorzuci reguły `.dark` lub utilities
 *       `dark:*` — natychmiast pojawi się diff w baseline'ach.
 *    2) Asercje anty-łamliwości layoutu (overflow-x, frame w viewporcie,
 *       figcaption nie obcięte) działają niezależnie od motywu i pełnią rolę
 *       smoke testu również dla przyszłej, pełnej palety dark.
 *
 * Viewporty i stany — identyczne jak w spec light, dla pełnej parytetu baseline'ów.
 *
 * Uruchamianie / aktualizacja baseline'u:
 *   bun run test:e2e -- tests/visual/admin-vein-images-live-preview-dark.spec.ts
 *   bun run test:e2e -- tests/visual/admin-vein-images-live-preview-dark.spec.ts --update-snapshots
 */
import { test, expect, type Page, type Route } from "../../playwright-fixture";

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

/**
 * Wymusza dark mode na poziomie dokumentu i prefers-color-scheme.
 * Trzymamy logikę w jednej funkcji, żeby nie rozjechała się z `useThemeVariant`
 * (który nasłuchuje klasy `.dark` na <html> + matchMedia).
 */
const forceDarkMode = async (page: Page): Promise<void> => {
  // 1) prefers-color-scheme: dark (wpływa na komponenty czytające matchMedia,
  //    np. sonner, oraz na wbudowane w przeglądarce style scrollbarów).
  await page.emulateMedia({ colorScheme: "dark" });
  // 2) Klasa `.dark` na <html> — Tailwind `darkMode: "class"` aktywuje
  //    wszystkie utilities `dark:*` i (gdyby istniał) blok `.dark { ... }`
  //    w index.css. Dodajemy też usunięcie ewentualnej klasy `.light`,
  //    aby logika w `useThemeVariant` jednoznacznie zwróciła "dark".
  await page.addInitScript(() => {
    const html = document.documentElement;
    html.classList.remove("light");
    html.classList.add("dark");
  });
  // Dla bezpieczeństwa — gdy strona zdążyła już się zhydratować zanim
  // initScript wszedł (np. cached SPA chunk), wymuszamy klasę po nawigacji.
  await page.evaluate(() => {
    const html = document.documentElement;
    html.classList.remove("light");
    html.classList.add("dark");
  }).catch(() => {
    /* page jeszcze nie ma kontekstu — initScript zadziała przy navigate */
  });
};

const longAlt = (suffix: string): string =>
  `VISUAL ${suffix} – schemat układu żylnego kończyny dolnej z perforatorami i kierunkiem przepływu krwi w naczyniach powierzchownych.`;

const longCaption = (suffix: string): string =>
  `VISUAL ${suffix} · podgląd renderu · ryc. snapshot`;

/**
 * Asercje anty-łamliwości layoutu — niezależne od motywu.
 * Identyczne jak w spec light, bo regresje overflow nie mają nic wspólnego
 * z paletą kolorów.
 */
const assertLayoutDoesNotBreak = async (page: Page, viewportWidth: number) => {
  const pageMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    pageMetrics.scrollWidth,
    `[dark] Strona nie powinna mieć horizontalnego scrolla (scrollW=${pageMetrics.scrollWidth} > clientW=${pageMetrics.clientWidth} przy viewport ${viewportWidth}px)`,
  ).toBeLessThanOrEqual(pageMetrics.clientWidth + 1);

  const frame = page.getByTestId("live-preview-frame");
  await expect(frame).toBeVisible();
  const box = await frame.boundingBox();
  expect(box, "[dark] live-preview-frame musi mieć boundingBox").not.toBeNull();
  if (box) {
    expect(
      box.x + box.width,
      `[dark] live-preview-frame wystaje poza viewport (right=${box.x + box.width}, vw=${viewportWidth})`,
    ).toBeLessThanOrEqual(viewportWidth + 1);
    expect(box.width, "[dark] live-preview-frame ma zerową szerokość").toBeGreaterThan(0);
  }

  const draftImg = page
    .getByTestId("live-preview-section")
    .locator("img")
    .first();
  await expect(draftImg).toBeVisible();
  const imgBox = await draftImg.boundingBox();
  expect(imgBox?.width ?? 0, "[dark] draft <img> ma zerową szerokość").toBeGreaterThan(0);
  expect(imgBox?.height ?? 0, "[dark] draft <img> ma zerową wysokość").toBeGreaterThan(0);
};

const assertCaptionNotClipped = async (page: Page) => {
  const captionsOverflow = await page
    .getByTestId("live-preview-section")
    .locator("figcaption")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        scrollW: n.scrollWidth,
        clientW: n.clientWidth,
        text: n.textContent?.slice(0, 40) ?? "",
      })),
    );
  for (const c of captionsOverflow) {
    expect(
      c.scrollW,
      `[dark] figcaption "${c.text}" obcięte: scrollW=${c.scrollW} > clientW=${c.clientW}`,
    ).toBeLessThanOrEqual(c.clientW + 1);
  }
};

/**
 * Sanity check: faktycznie jesteśmy w dark mode. Łapie regresje gdy ktoś
 * doda ThemeProvider który w starcie nadpisuje klasę z initScript.
 */
const assertDarkModeActive = async (page: Page) => {
  const isDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  expect(isDark, "<html> powinien mieć klasę .dark dla wariantu dark snapshot").toBe(true);
};

const VIEWPORTS = [
  { name: "small-mobile", width: 320, height: 568 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 720 },
] as const;

test.describe("AdminVeinImages — visual regression LIVE PREVIEW [DARK] (4 viewporty)", () => {
  test.beforeAll(() => {
    if (!HAS_CREDS) {
      // eslint-disable-next-line no-console
      console.warn(
        "[admin-vein-images-live-preview-dark-visual] Pominięto: brak ADMIN_E2E_EMAIL/PASSWORD. " +
          "Visual regression wymaga real auth (sesja admina).",
      );
    }
  });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} (${viewport.width}×${viewport.height}) [dark]: live preview snapshots + layout integrity`, async ({
      page,
    }) => {
      test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD — test wymaga real auth.");

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await forceDarkMode(page);
      await installEmptyOverridesMock(page);
      await loginAsAdmin(page);
      await page.goto("/admin/vein-images");
      await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();
      await assertDarkModeActive(page);

      const evltTab = page.getByRole("tab", { name: /EVLT/i });
      await expect(evltTab).toHaveAttribute("aria-selected", "true");

      const previewSection = page.getByTestId("live-preview-section");
      await expect(previewSection).toBeVisible();

      // === STATE A: pusty draft (po wejściu na panel) ===
      await assertLayoutDoesNotBreak(page, viewport.width);
      await expect(previewSection).toHaveScreenshot(
        `live-preview-${viewport.name}-dark-state-a-empty.png`,
        {
          maxDiffPixelRatio: 0.03,
          animations: "disabled",
        },
      );

      // === STATE B: po edycji alt głównego obrazu ===
      const altTextarea = page.locator("#main-alt");
      const newAlt = longAlt(viewport.name);
      await altTextarea.fill(newAlt);
      await expect(
        previewSection.locator(`img[alt="${newAlt}"]`).first(),
      ).toBeVisible();

      await assertLayoutDoesNotBreak(page, viewport.width);
      await expect(previewSection).toHaveScreenshot(
        `live-preview-${viewport.name}-dark-state-b-alt-edited.png`,
        {
          maxDiffPixelRatio: 0.03,
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

      await assertLayoutDoesNotBreak(page, viewport.width);
      await assertCaptionNotClipped(page);
      await expect(previewSection).toHaveScreenshot(
        `live-preview-${viewport.name}-dark-state-c-alt-and-caption.png`,
        {
          maxDiffPixelRatio: 0.03,
          animations: "disabled",
        },
      );
    });
  }
});
