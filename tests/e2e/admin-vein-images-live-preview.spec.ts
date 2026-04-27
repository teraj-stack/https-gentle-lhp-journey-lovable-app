/**
 * E2E (Playwright): live preview reaktywności w `/admin/vein-images` w dwóch viewportach.
 *
 * Cel testu:
 *  Po KAŻDEJ zmianie pola alt lub caption w drafcie sekcja „Draft (live)"
 *  natychmiast (bez zapisu, bez round-tripa do bazy) renderuje nową treść
 *  w komponencie podglądu (VenousInsufficiencyImage) — tj. <img alt="…">
 *  oraz <figcaption> reaktywnie odzwierciedlają stan kontrolek.
 *
 * Dwa viewporty:
 *  - mobile  (375×812) — sprawdza, że stack pionowy też pokazuje preview od razu.
 *  - desktop (1280×720) — sprawdza, że layout dwukolumnowy nie ucina/cache'uje preview.
 *
 * Strategia:
 *  - Real auth (signInWithPassword przez tryb `?e2e=1`).
 *  - Mock PostgREST przez page.route — dzięki temu test NIE pisze do bazy
 *    i nie wymaga cleanup. Sprawdzamy WYŁĄCZNIE reaktywność UI, nie persystencję.
 *  - Sekwencja edit → assert na każdym z trzech etapów (alt#1, caption, alt#2).
 *
 * Uwaga: ten test celowo NIE klika „Zapisz" — chodzi o weryfikację draft
 * preview, nie persystencji. Pełen flow zapisu pokrywa
 * `admin-vein-images-e2e.spec.ts` (CRUD inline test).
 */
import { test, expect, type Page, type Route } from "../../playwright-fixture";

const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD ?? "";
const HAS_CREDS = ADMIN_EMAIL.length > 0 && ADMIN_PASSWORD.length > 0;

const SUPABASE_REST = /\/rest\/v1\/vein_image_overrides(\?.*)?$/;

/** Mock REST: wszystkie SELECT zwracają puste, write'y akceptujemy 200/201 (nieużywane w teście). */
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
    // POST/PATCH/DELETE — niepotrzebne w teście preview, ale na wypadek
    // gdyby autosave/diagnostyka coś wysłała, odpowiadamy neutralnie.
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
  `LIVE PREVIEW ${suffix} – schemat układu żylnego kończyny dolnej z perforatorami i kierunkiem przepływu krwi.`;

const caption = (suffix: string): string =>
  `LIVE ${suffix} · podgląd · ryc. testowa`;

test.describe("AdminVeinImages — live preview reaguje na każdą zmianę alt/caption", () => {
  test.beforeAll(() => {
    if (!HAS_CREDS) {
      // eslint-disable-next-line no-console
      console.warn(
        "[admin-vein-images-live-preview] Pominięto: brak ADMIN_E2E_EMAIL/PASSWORD. " +
          "Test wymaga real auth (sesja admina).",
      );
    }
  });

  for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "desktop", width: 1280, height: 720 },
  ] as const) {
    test(`${viewport.name} (${viewport.width}×${viewport.height}): alt i caption odświeżają draft preview po każdej edycji`, async ({
      page,
    }) => {
      test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD — test wymaga real auth.");

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installEmptyOverridesMock(page);
      await loginAsAdmin(page);
      await page.goto("/admin/vein-images");
      await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();

      // Tab EVLT (default).
      const tab = page.getByRole("tab", { name: /EVLT/i });
      await expect(tab).toHaveAttribute("aria-selected", "true");

      const altTextarea = page.locator("#main-alt");
      const capTextarea = page.locator("#main-caption");

      // === Etap 1: zmiana alt → preview <img alt> aktualizuje się natychmiast ===
      const alt1 = longAlt(`${viewport.name}-1`);
      await altTextarea.fill(alt1);
      await expect(page.getByAltText(alt1).first()).toBeVisible();

      // === Etap 2: zmiana caption → preview <figcaption> aktualizuje się natychmiast ===
      const cap1 = caption(`${viewport.name}-1`);
      await capTextarea.fill(cap1);
      // Preview musi pokazać caption tekstowo (występuje w draft <figcaption>).
      // Szukamy przez getByText z dokładnym dopasowaniem (substring).
      await expect(page.getByText(cap1, { exact: false }).first()).toBeVisible();
      // Alt z etapu 1 nadal widoczny (caption nie zerwał obrazu).
      await expect(page.getByAltText(alt1).first()).toBeVisible();

      // === Etap 3: druga zmiana alt → preview re-renderuje z nową wartością,
      // poprzedni alt znika z DOM (figcaption pozostaje bez zmian) ===
      const alt2 = longAlt(`${viewport.name}-2`);
      await altTextarea.fill(alt2);
      await expect(page.getByAltText(alt2).first()).toBeVisible();
      await expect(page.locator(`img[alt="${alt1}"]`)).toHaveCount(0);
      // Caption z etapu 2 wciąż widoczny — niezależny od alt.
      await expect(page.getByText(cap1, { exact: false }).first()).toBeVisible();

      // === Etap 4: druga zmiana caption → preview pokazuje nowy podpis,
      // poprzedni caption znika ===
      const cap2 = caption(`${viewport.name}-2`);
      await capTextarea.fill(cap2);
      await expect(page.getByText(cap2, { exact: false }).first()).toBeVisible();
      await expect(page.getByText(cap1, { exact: true })).toHaveCount(0);
      await expect(page.getByAltText(alt2).first()).toBeVisible();
    });
  }
});
