/**
 * Visual regression — wariant STABLE-AFTER-ANIMATION.
 *
 * Cel: oddzielne baseline'y, które są pobrane DOPIERO po pełnym ustabilizowaniu
 * sekcji `live-preview-section` — tj. po zakończeniu wszystkich aktywnych CSS
 * animacji i tranzycji w jej subtree. Komplementarne do:
 *   - `admin-vein-images-live-preview.spec.ts` (light, baseline szybki, polega
 *     na `animations: "disabled"` Playwrighta),
 *   - `admin-vein-images-live-preview-dark.spec.ts` (jw. dla dark mode).
 *
 * Dlaczego osobny spec, a nie modyfikacja istniejących:
 *  - Zachowujemy istniejące baseline'y bez ryzyka regresji "diff bez zmiany kodu".
 *  - Stable spec celowo ZWALNIA test (czeka na animacje), więc nie chcemy
 *    płacić tego kosztu w 2 × 4 viewporty × 3 stany = 24 snapshoty z light/dark.
 *  - Test deliberatnie WYTRIGGRUJE tranzycję flash (transition-all duration-500
 *    na sekcji po Save) i zweryfikuje że stabilizacja faktycznie działa.
 *
 * Dlaczego `animations: "disabled"` w Playwrighcie nie wystarcza:
 *  - Disable'uje CSS @keyframes (animate-spin, fade-in itp.) — przewija je
 *    do końca i zatrzymuje.
 *  - NIE wpływa na CSS `transition-*` triggered przez state change. Klasa
 *    `border-emerald-500/60 ring-2` dodana po Save uruchamia 500ms transition
 *    border-color/ring-color — Playwright tego nie zatrzyma.
 *  - Snapshot pobrany w 200ms tranzycji = inny kolor border niż w 400ms = flaky.
 *
 * Zakres (świadomie WĄSKI dla speed):
 *  - 2 viewporty (mobile 375 + desktop 1280) zamiast 4 — pokrywają najczęstsze
 *    layouty bez podwajania run time'u.
 *  - 2 stany: "stable-empty" (po wejściu, brak animacji) + "stable-after-flash"
 *    (po deliberatnym wytriggrowaniu flash transition).
 *  - Tylko light theme — flaky-from-animation problem nie jest zależny od palety.
 *
 * Aktualizacja baseline:
 *   bun run test:e2e -- tests/visual/admin-vein-images-live-preview-stable.spec.ts --update-snapshots
 */
import { test, expect, type Page, type Route } from "../../playwright-fixture";
import {
  assertLayoutDoesNotBreak,
  assertNoRunningAnimations,
  waitForAnimationsToSettle,
  ANIMATION_SETTLE_TIMEOUT_MS,
  LIVE_PREVIEW_SNAPSHOT_DIFF_RATIO,
} from "./_helpers/livePreviewLayoutAssertions";

const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD ?? "";
const HAS_CREDS = ADMIN_EMAIL.length > 0 && ADMIN_PASSWORD.length > 0;

const SUPABASE_REST = /\/rest\/v1\/vein_image_overrides(\?.*)?$/;

/**
 * Mock dla Save endpoint — zwraca 201 z fake'owym row'em, żeby w UI flash
 * po Save się odpalił (komponent dodaje klasę `border-emerald-500/60 ring-2`
 * po success'ie REST'a, i zdejmuje po ~1s — to JEST `transition-all
 * duration-500` które chcemy ustabilizować).
 */
const installMockWithSaveSupport = async (page: Page): Promise<void> => {
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
    if (method === "POST" || method === "PATCH") {
      // Echo z minimalnym shape'em — wystarczy żeby UI wszedł w success branch.
      const now = new Date().toISOString();
      await route.fulfill({
        status: 201,
        headers: {
          "content-type": "application/json",
          // Postgrest "Prefer: return=representation" zwraca array.
          "preference-applied": "return=representation",
        },
        body: JSON.stringify([
          {
            id: "mock-stable-spec",
            page_key: "evlt",
            slot: "main",
            alt_text: "stable-spec mock alt",
            caption_text: "stable-spec mock caption",
            updated_at: now,
            created_at: now,
          },
        ]),
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

const VIEWPORTS = [
  // Mobile portrait — najczęstszy real-user viewport, sprawdza single-column layout.
  { name: "mobile", width: 375, height: 812 },
  // Desktop — pełny dwukolumnowy układ preview + edytor.
  { name: "desktop", width: 1280, height: 720 },
] as const;

test.describe("AdminVeinImages — visual regression LIVE PREVIEW [STABLE-AFTER-ANIMATION]", () => {
  test.beforeAll(() => {
    if (!HAS_CREDS) {
      // eslint-disable-next-line no-console
      console.warn(
        "[admin-vein-images-live-preview-stable-visual] Pominięto: brak ADMIN_E2E_EMAIL/PASSWORD.",
      );
    }
  });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} (${viewport.width}×${viewport.height}) [stable]: snapshoty po settlement animacji`, async ({
      page,
    }) => {
      test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD — test wymaga real auth.");

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installMockWithSaveSupport(page);
      await loginAsAdmin(page);
      await page.goto("/admin/vein-images");
      await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();

      const previewSection = page.getByTestId("live-preview-section");
      await expect(previewSection).toBeVisible();

      // === STATE 1: stable-empty ===
      // Po wejściu na panel mogą jeszcze trwać `enter` animacje (fade-in/scale-in
      // 0.2-0.3s z tailwind config) zanim sekcja się wyrenderuje.
      // Czekamy aż wszystkie się zakończą — bez tego baseline ma "duch" stanu pre-animation.
      await waitForAnimationsToSettle(page, { timeoutMs: ANIMATION_SETTLE_TIMEOUT_MS });
      await assertNoRunningAnimations(page, "light");
      await assertLayoutDoesNotBreak(page, viewport.width, "light");

      await expect(previewSection).toHaveScreenshot(
        `live-preview-${viewport.name}-stable-empty.png`,
        {
          // `animations: "disabled"` zostawiamy jako defense-in-depth: gdyby
          // jakaś nowa animacja pojawiła się MIĘDZY waitForAnimationsToSettle
          // a momentem snapshota, Playwright ją zatrzyma na klatce końcowej.
          maxDiffPixelRatio: LIVE_PREVIEW_SNAPSHOT_DIFF_RATIO,
          animations: "disabled",
        },
      );

      // === STATE 2: stable-after-flash ===
      // Deliberatnie wywołujemy flash transition (transition-all duration-500
      // na live-preview-section + ring-2 ring-emerald-500/30 po success Save).
      // To DOKŁADNIE ten przypadek, dla którego istnieje ten spec — bez
      // waitForAnimationsToSettle baseline łapałby losową klatkę z trakcie
      // tranzycji border-color (200ms vs 400ms vs 480ms = 3 różne kolory).
      const altTextarea = page.locator("#main-alt");
      await altTextarea.fill(`stable spec ${viewport.name} — trigger flash`);

      // Klikamy Save dla głównego slota. Selektor po roli + nazwie żeby był
      // odporny na refactor klas CSS. Nazwa "Zapisz" znajduje się w UI obok
      // sekcji „Główny obraz" (slot main).
      const saveButton = page
        .getByRole("button", { name: /^Zapisz/i })
        .first();
      await saveButton.click();

      // Czekamy aż UI pokaże potwierdzenie zapisu (aria-live "Ostatni zapis: ...").
      // To gwarantuje że flash transition już się ROZPOCZĘŁA (klasa dodana).
      await expect(
        previewSection.getByText(/Ostatni zapis:/i).first(),
      ).toBeVisible({ timeout: 5_000 });

      // Teraz czekamy aż flash transition się skończy.
      // ANIMATION_SETTLE_TIMEOUT_MS = 1500 > 500ms transition + bufor.
      await waitForAnimationsToSettle(page, { timeoutMs: ANIMATION_SETTLE_TIMEOUT_MS });
      await assertNoRunningAnimations(page, "light");
      await assertLayoutDoesNotBreak(page, viewport.width, "light");

      await expect(previewSection).toHaveScreenshot(
        `live-preview-${viewport.name}-stable-after-flash.png`,
        {
          maxDiffPixelRatio: LIVE_PREVIEW_SNAPSHOT_DIFF_RATIO,
          animations: "disabled",
        },
      );
    });
  }
});
