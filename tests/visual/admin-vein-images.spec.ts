/**
 * E2E (Playwright): panel `/admin/vein-images`.
 *
 * Cele testu:
 *  1. Sprawdzić że edycja draftu od razu jest widoczna w „Draft (live)"
 *     preview na mobile (375×812) i desktop (1280×720).
 *  2. Sprawdzić że klik „Zapisz" emituje request do Supabase z poprawnym
 *     payloadem `vein_image_overrides` (page_key, slot, alt, caption,
 *     updated_by) i że po sukcesie podgląd „CMS (z bazy)" pokazuje nową
 *     treść.
 *  3. Snapshot wizualny — po jednym screenshot per viewport jako baseline
 *     regresji layoutu obu trybów preview.
 *
 * Architektura testu (zgodna z wybraną opcją „Hybryda: real auth + mock zapisu"):
 *  - Auth: prawdziwy `supabase.auth.signInWithPassword` przez stronę
 *    `/admin/login`. Wymaga env `ADMIN_E2E_EMAIL` + `ADMIN_E2E_PASSWORD`.
 *    Bez tych zmiennych test jest świadomie SKIPOWANY z czytelnym
 *    komunikatem — nie udajemy zielonego, gdy nie mamy uprawnień do
 *    realnej sesji RLS-admin.
 *  - Zapis: PRZECHWYTYWANY przez `page.route` na endpointach REST
 *    Supabase (`/rest/v1/vein_image_overrides*`). Dzięki temu:
 *      a) test NIE pisze do prod tabeli (nie zostawia śmieci),
 *      b) odpowiedzi są deterministyczne (lookup → null → INSERT, potem
 *         lookup → istnieje → UPDATE).
 *  - GET listy `vein_image_overrides` zwracamy pusty na starcie, żeby
 *    panel pokazał wszystkie sloty jako „z propsu" — sterujemy stanem
 *    początkowym, niezależnie od bieżącej zawartości bazy.
 *
 * Uwaga snapshot: maxDiffPixelRatio: 0.02 — luźniejsze niż tooltip
 * (który ma stałą siatkę 6 kafelków). Tu mamy realny komponent z
 * obrazami SVG/raster, więc minimalne różnice anti-aliasingu między
 * uruchomieniami są oczekiwane.
 */
import { test, expect, type Page, type Route } from "../../playwright-fixture";

const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD ?? "";
const HAS_CREDS = ADMIN_EMAIL.length > 0 && ADMIN_PASSWORD.length > 0;

const SUPABASE_REST = /\/rest\/v1\/vein_image_overrides(\?.*)?$/;

/**
 * Stan mocka dla bieżącego testu — jedyna zmienna współdzielona między
 * route handlerami (lookup → insert → ponowny lookup).
 *
 * `existingRows` reprezentuje aktualną zawartość tabeli. Lookup `select=id`
 * zwraca pierwszy match po `page_key` + `slot`. INSERT/UPDATE dopisuje/podmienia.
 */
interface OverrideRow {
  id: string;
  page_key: string;
  slot: string;
  alt: string;
  caption: string;
  updated_by: string | null;
  updated_at: string;
}

const installSupabaseMock = async (page: Page, store: { rows: OverrideRow[]; writes: Array<{ method: string; body: unknown }> }) => {
  await page.route(SUPABASE_REST, async (route: Route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();
    // PostgREST SELECT: GET /rest/v1/vein_image_overrides?select=...&page_key=eq.X&slot=eq.Y
    if (method === "GET") {
      const u = new URL(url);
      const pageKeyEq = u.searchParams.get("page_key");
      const slotEq = u.searchParams.get("slot");
      let rows = store.rows;
      if (pageKeyEq?.startsWith("eq.")) {
        const want = pageKeyEq.slice(3);
        rows = rows.filter((r) => r.page_key === want);
      }
      if (slotEq?.startsWith("eq.")) {
        const want = slotEq.slice(3);
        rows = rows.filter((r) => r.slot === want);
      }
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json", "content-range": `0-${rows.length}/${rows.length}` },
        body: JSON.stringify(rows),
      });
      return;
    }
    if (method === "POST") {
      // INSERT
      const body = req.postDataJSON() as Partial<OverrideRow> | Partial<OverrideRow>[];
      const arr = Array.isArray(body) ? body : [body];
      const inserted: OverrideRow[] = arr.map((b, i) => ({
        id: `mock-${Date.now()}-${i}`,
        page_key: String(b.page_key),
        slot: String(b.slot),
        alt: String(b.alt ?? ""),
        caption: String(b.caption ?? ""),
        updated_by: (b.updated_by as string | null) ?? null,
        updated_at: new Date().toISOString(),
      }));
      store.rows.push(...inserted);
      store.writes.push({ method: "POST", body: arr });
      await route.fulfill({
        status: 201,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(inserted),
      });
      return;
    }
    if (method === "PATCH") {
      // UPDATE: PATCH /rest/v1/vein_image_overrides?id=eq.X
      const u = new URL(url);
      const idEq = u.searchParams.get("id");
      const id = idEq?.startsWith("eq.") ? idEq.slice(3) : null;
      const body = req.postDataJSON() as Partial<OverrideRow>;
      let updated: OverrideRow | null = null;
      store.rows = store.rows.map((r) => {
        if (r.id === id) {
          updated = { ...r, ...body, updated_at: new Date().toISOString() };
          return updated;
        }
        return r;
      });
      store.writes.push({ method: "PATCH", body });
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updated ? [updated] : []),
      });
      return;
    }
    await route.continue();
  });
};

test.describe("AdminVeinImages — live preview + zapis (mobile/desktop)", () => {
  test.beforeAll(() => {
    if (!HAS_CREDS) {
      // eslint-disable-next-line no-console
      console.warn(
        "[admin-vein-images.spec] Pominięto: brak ADMIN_E2E_EMAIL/ADMIN_E2E_PASSWORD w env. " +
          "Test wymaga prawdziwej sesji admina (RLS). Dodaj te zmienne, by włączyć E2E.",
      );
    }
  });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!HAS_CREDS, "Brak kredencjałów ADMIN_E2E_EMAIL/PASSWORD — test wymaga real auth.");

    const store = { rows: [] as OverrideRow[], writes: [] as Array<{ method: string; body: unknown }> };
    await installSupabaseMock(page, store);
    // Udostępniamy store dla asercji w teście przez window.
    await page.exposeBinding("__veinStore", () => store);

    // Real auth: logujemy się przez UI /admin/login (strona przejrzyście
    // pokazuje że to prawdziwa ścieżka, nie obejście). Po sukcesie
    // przekierowanie na /admin → ręcznie nawigujemy do /admin/vein-images.
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/hasło|password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /zaloguj/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
    await page.goto("/admin/vein-images");
    // Czekamy aż główny header panelu się wyrenderuje (lazy import + auth bootstrap).
    await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();
  });

  for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "desktop", width: 1280, height: 720 },
  ] as const) {
    test(`${viewport.name}: edycja draftu, zapis i CMS preview`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Wybieramy zakładkę EVLT (default — pierwszy preset).
      const evltTab = page.getByRole("tab", { name: /EVLT/i });
      await expect(evltTab).toHaveAttribute("aria-selected", "true");

      // Edytujemy alt głównego obrazu w drafcie. Nowa treść celowo długa,
      // żeby przeszła walidację serwerową (≥60 znaków).
      const newAlt =
        "TEST E2E – schemat układu żylnego kończyny dolnej z zaznaczonymi perforatorami i kierunkiem przepływu krwi.";
      const altTextarea = page.locator("#main-alt");
      await altTextarea.fill(newAlt);

      // ASERCJA #1: Draft preview (live) zawiera nowy alt natychmiast po
      // edycji — bez zapisu, bez round-tripa do bazy.
      const draftImg = page.getByAltText(newAlt).first();
      await expect(draftImg).toBeVisible();

      // Klik Zapisz dla slotu „main".
      const saveBtn = page.getByRole("button", { name: /^Zapisz$/i }).first();
      await saveBtn.click();

      // Czekamy aż toast „Zapisano" się pojawi — to sygnał że performSaveSlot
      // zakończył się sukcesem (mock zwrócił 201).
      await expect(page.getByText(/Zapisano:.*EVLT.*główny obraz/i)).toBeVisible({ timeout: 10_000 });

      // ASERCJA #2: do mocka poszedł INSERT z poprawnym payloadem.
      const writes = await page.evaluate(() => (window as unknown as { __veinStore: () => { writes: Array<{ method: string; body: unknown }> } }).__veinStore().writes);
      expect(writes.length).toBeGreaterThanOrEqual(1);
      const insert = writes.find((w) => w.method === "POST");
      expect(insert).toBeTruthy();
      const insertedRow = (Array.isArray(insert!.body) ? insert!.body[0] : insert!.body) as Record<string, unknown>;
      expect(insertedRow.page_key).toBe("evlt");
      expect(insertedRow.slot).toBe("main");
      expect(insertedRow.alt).toBe(newAlt);
      // updated_by = email zalogowanego admina (z prawdziwej sesji).
      expect(insertedRow.updated_by).toBe(ADMIN_EMAIL);

      // ASERCJA #3: po zapisie panel automatycznie przełącza na tab „CMS (z bazy)"
      // i remountuje VenousInsufficiencyImage z fresh CMS data → ten sam alt
      // jest widoczny też w trybie CMS (dwa <img alt> z tym tekstem na stronie).
      await expect(page.getByText(/CMS \(z bazy\)/)).toBeVisible();
      // Liczymy ile razy alt występuje — preview jest jednym <img>, ale draft
      // textarea też zawiera tekst. Filtrujemy po roli image/alt attr.
      const cmsImg = page.locator(`img[alt="${newAlt}"]`);
      await expect(cmsImg).toHaveCount(1);

      // ASERCJA #4 (snapshot): jeden screenshot referencyjny per viewport.
      // Łapie regresje layoutu preview (margin/padding/flex/grid breakpoints).
      const previewSection = page.getByRole("region", { name: /podgląd|preview/i }).first();
      // Fallback: jeśli sekcja nie ma aria-label, screenshotujemy <main>.
      const target = (await previewSection.count()) > 0 ? previewSection : page.locator("main");
      await expect(target).toHaveScreenshot(`admin-vein-images-${viewport.name}.png`, {
        maxDiffPixelRatio: 0.02,
        animations: "disabled",
      });
    });
  }
});
