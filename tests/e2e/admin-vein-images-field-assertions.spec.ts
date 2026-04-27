/**
 * E2E (Playwright): asercje konkretnych pól UI + obsługa błędów zapisu w `/admin/vein-images`.
 *
 * Cel:
 *  Część A — KONKRETNE POLA UI:
 *    1. Nagłówek live preview pokazuje `active.route` (`/leczenie/evlt`) — odpowiednik page_key.
 *    2. Aktywna karta (tab) ma label „EVLT" → pośrednio identyfikuje page_key.
 *    3. Toast po zapisie zawiera nazwę zakładki ORAZ slot ("główny obraz" / "perforator").
 *    4. Po zapisie:
 *         - badge „✓ Ostatni zapis: <slot> · <czas>" pokazuje DOKŁADNIE zapisany slot,
 *         - draft preview <img alt> i <figcaption> mają DOKŁADNIE wpisane wartości,
 *         - po przełączeniu na „CMS (z bazy)" panel pokazuje TĘ SAMĄ treść (round-trip).
 *
 *  Część B — OBSŁUGA BŁĘDÓW ZAPISU:
 *    1. Walidacja klienta: zbyt krótki alt → przycisk Save jest DISABLED, label „Popraw błędy",
 *       komunikat błędu widoczny pod textarea. Próba kliknięcia nic nie zmienia w bazie.
 *    2. Błąd serwera 500: mock REST zwraca 500 na PATCH/POST → toast „Błąd zapisu (...)".
 *    3. Walidacja serwera (alt za krótki przepuszczony przez klienta — symulujemy 400 z message
 *       "alt musi mieć 60-220 znaków") → toast „Walidacja serwera odrzuciła alt (...)" z
 *       wymogiem długości w opisie (zgodnie z `describeSaveError`).
 *    4. Błąd RLS (42501) → toast „Brak uprawnień (...)".
 *
 * Strategia:
 *  - Real auth (signInWithPassword przez `?e2e=1`) — prawdziwa sesja admina, prawdziwe localStorage.
 *  - REST PostgREST MOCKOWANY (page.route) — full kontrola nad statusami i payloadami błędów.
 *    Dzięki temu nie polegamy na sieci ani stanie bazy dla scenariuszy negatywnych.
 *  - Brak realnych zapisów do bazy → brak cleanup'u potrzebnego.
 *
 * Wymagane env: ADMIN_E2E_EMAIL, ADMIN_E2E_PASSWORD. Bez nich test się skipuje.
 */
import { test, expect, type Page, type Route } from "../../playwright-fixture";

const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD ?? "";
const HAS_CREDS = ADMIN_EMAIL.length > 0 && ADMIN_PASSWORD.length > 0;

const SUPABASE_REST = /\/rest\/v1\/vein_image_overrides(\?.*)?$/;

interface MockOverrideRow {
  id: string;
  page_key: string;
  slot: string;
  alt: string;
  caption: string;
  updated_by: string | null;
  updated_at: string;
}

interface MockStore {
  rows: MockOverrideRow[];
  /** Wymusza odpowiedź błędną dla następnego POST/PATCH. Reset po użyciu. */
  failNextWrite: null | { status: number; body: unknown };
}

const installRestMock = async (page: Page, store: MockStore) => {
  await page.route(SUPABASE_REST, async (route: Route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();

    if (method === "GET") {
      const u = new URL(url);
      const pk = u.searchParams.get("page_key");
      const sl = u.searchParams.get("slot");
      let rows = store.rows;
      if (pk?.startsWith("eq.")) rows = rows.filter((r) => r.page_key === pk.slice(3));
      if (sl?.startsWith("eq.")) rows = rows.filter((r) => r.slot === sl.slice(3));
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-range": `0-${rows.length}/${rows.length}`,
        },
        body: JSON.stringify(rows),
      });
      return;
    }

    if (method === "POST" || method === "PATCH") {
      // Sprawdź wymuszony błąd (np. dla scenariusza negatywnego).
      if (store.failNextWrite) {
        const fail = store.failNextWrite;
        store.failNextWrite = null;
        await route.fulfill({
          status: fail.status,
          headers: { "content-type": "application/json" },
          body: typeof fail.body === "string" ? fail.body : JSON.stringify(fail.body),
        });
        return;
      }

      if (method === "POST") {
        const body = req.postDataJSON() as Partial<MockOverrideRow> | Partial<MockOverrideRow>[];
        const arr = Array.isArray(body) ? body : [body];
        const inserted: MockOverrideRow[] = arr.map((b, i) => ({
          id: `mock-${Date.now()}-${i}`,
          page_key: String(b.page_key),
          slot: String(b.slot),
          alt: String(b.alt ?? ""),
          caption: String(b.caption ?? ""),
          updated_by: (b.updated_by as string | null) ?? null,
          updated_at: new Date().toISOString(),
        }));
        store.rows.push(...inserted);
        await route.fulfill({
          status: 201,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(inserted),
        });
        return;
      }

      // PATCH
      const u = new URL(url);
      const idEq = u.searchParams.get("id");
      const id = idEq?.startsWith("eq.") ? idEq.slice(3) : null;
      const body = req.postDataJSON() as Partial<MockOverrideRow>;
      let updated: MockOverrideRow | null = null;
      store.rows = store.rows.map((r) => {
        if (r.id === id) {
          updated = { ...r, ...body, updated_at: new Date().toISOString() };
          return updated;
        }
        return r;
      });
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updated ? [updated] : []),
      });
      return;
    }

    if (method === "DELETE") {
      await route.fulfill({
        status: 204,
        headers: { "content-type": "application/json" },
        body: "",
      });
      return;
    }

    await route.continue();
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

const validAlt = (suffix: string): string =>
  `FIELD ${suffix} – schemat układu żylnego kończyny dolnej z zaznaczonymi perforatorami i kierunkiem przepływu krwi powierzchownej.`;

const validCaption = (suffix: string): string =>
  `FIELD ${suffix} · podgląd · ryc. testowa`;

test.describe("AdminVeinImages — asercje pól UI + obsługa błędów zapisu", () => {
  test.beforeAll(() => {
    if (!HAS_CREDS) {
      // eslint-disable-next-line no-console
      console.warn(
        "[admin-vein-images-field-assertions] Pominięto: brak ADMIN_E2E_EMAIL/PASSWORD.",
      );
    }
  });

  // ===========================================================================
  // CZĘŚĆ A — konkretne pola UI po zapisie.
  // ===========================================================================
  test("A1: page_key (route), slot, alt, caption są dokładnie odzwierciedlone w UI po zapisie", async ({
    page,
  }) => {
    test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD.");

    const store: MockStore = { rows: [], failNextWrite: null };
    await installRestMock(page, store);
    await loginAsAdmin(page);
    await page.goto("/admin/vein-images");
    await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();

    // --- ASERCJA #1: aktywna zakładka „EVLT" identyfikuje page_key ---
    const evltTab = page.getByRole("tab", { name: /^EVLT$/i });
    await expect(evltTab).toHaveAttribute("aria-selected", "true");

    // --- ASERCJA #2: nagłówek preview pokazuje route /leczenie/evlt (= page_key evlt) ---
    const previewSection = page.getByTestId("live-preview-section");
    await expect(previewSection).toBeVisible();
    await expect(previewSection.getByText("/leczenie/evlt")).toBeVisible();

    // --- Wpisz alt + caption dla slotu MAIN i zapisz ---
    const newAlt = validAlt("MAIN");
    const newCap = validCaption("MAIN");
    await page.locator("#main-alt").fill(newAlt);
    await page.locator("#main-caption").fill(newCap);

    // ASERCJA #3: draft preview ma DOKŁADNIE ten alt jako atrybut <img alt>.
    await expect(
      previewSection.locator(`img[alt="${newAlt}"]`).first(),
    ).toBeVisible();

    // ASERCJA #4: draft preview <figcaption> zawiera DOKŁADNIE wpisany caption.
    await expect(
      previewSection.locator("figcaption").filter({ hasText: newCap }).first(),
    ).toBeVisible();

    // Klik Zapisz dla slotu MAIN.
    await page.getByRole("button", { name: /^Zapisz$/ }).first().click();

    // --- ASERCJA #5: toast pokazuje DOKŁADNIE: zakładkę (EVLT) + slot (główny obraz) ---
    await expect(
      page.getByText(/Zapisano:.*EVLT.*główny obraz/i),
    ).toBeVisible({ timeout: 10_000 });

    // --- ASERCJA #6: badge „✓ Ostatni zapis" pokazuje DOKŁADNIE slot „główny obraz" ---
    const lastSavedBadge = previewSection.getByText(/✓ Ostatni zapis:\s*główny obraz/);
    await expect(lastSavedBadge).toBeVisible();
    // Slot „perforator" NIE może występować w badge (asercja negatywna).
    await expect(
      previewSection.getByText(/✓ Ostatni zapis:\s*perforator/),
    ).toHaveCount(0);

    // --- ASERCJA #7: w mockowanym store wiersz ma DOKŁADNIE wpisane wartości ---
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].page_key).toBe("evlt");
    expect(store.rows[0].slot).toBe("main");
    expect(store.rows[0].alt).toBe(newAlt);
    expect(store.rows[0].caption).toBe(newCap);
    expect(store.rows[0].updated_by).toBe(ADMIN_EMAIL);

    // --- ASERCJA #8: po przełączeniu na „CMS (z bazy)" preview pokazuje
    // TĘ SAMĄ treść z mocka (round-trip GET → render) ---
    await page.getByRole("tab", { name: /CMS \(z bazy\)/ }).click();
    await expect(
      previewSection.locator(`img[alt="${newAlt}"]`).first(),
    ).toBeVisible();
    await expect(
      previewSection.locator("figcaption").filter({ hasText: newCap }).first(),
    ).toBeVisible();
  });

  test("A2: zapis slotu PERFORATOR pokazuje w badge i toaście DOKŁADNIE „perforator" (nie „główny obraz")", async ({
    page,
  }) => {
    test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD.");

    const store: MockStore = { rows: [], failNextWrite: null };
    await installRestMock(page, store);
    await loginAsAdmin(page);
    await page.goto("/admin/vein-images");
    await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();

    const newAlt = validAlt("PERF");
    const newCap = validCaption("PERF");
    await page.locator("#perforator-alt").fill(newAlt);
    await page.locator("#perforator-caption").fill(newCap);

    // Drugi przycisk „Zapisz" = slot perforator (kolejność DOM: main, perforator).
    const saveButtons = page.getByRole("button", { name: /^Zapisz$/ });
    await expect(saveButtons).toHaveCount(2);
    await saveButtons.nth(1).click();

    await expect(
      page.getByText(/Zapisano:.*EVLT.*perforator/i),
    ).toBeVisible({ timeout: 10_000 });

    const previewSection = page.getByTestId("live-preview-section");
    await expect(
      previewSection.getByText(/✓ Ostatni zapis:\s*perforator/),
    ).toBeVisible();
    await expect(
      previewSection.getByText(/✓ Ostatni zapis:\s*główny obraz/),
    ).toHaveCount(0);

    expect(store.rows[0].slot).toBe("perforator");
    expect(store.rows[0].page_key).toBe("evlt");
    expect(store.rows[0].alt).toBe(newAlt);
    expect(store.rows[0].caption).toBe(newCap);
  });

  // ===========================================================================
  // CZĘŚĆ B — obsługa błędów zapisu.
  // ===========================================================================

  test("B1: walidacja klienta (alt za krótki) → przycisk DISABLED z labelem „Popraw błędy", brak requestu do bazy", async ({
    page,
  }) => {
    test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD.");

    const store: MockStore = { rows: [], failNextWrite: null };
    let writeRequestCount = 0;
    await page.route(SUPABASE_REST, async (route: Route) => {
      const m = route.request().method();
      if (m === "POST" || m === "PATCH") {
        writeRequestCount += 1;
      }
      // Reszta routingu (GET/DELETE) → pusty mock.
      if (m === "GET") {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json", "content-range": "0-0/0" },
          body: "[]",
        });
        return;
      }
      await route.fulfill({ status: 200, body: "[]" });
    });

    await loginAsAdmin(page);
    await page.goto("/admin/vein-images");
    await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();

    // Wpisz JAWNIE za krótki alt (poniżej 60 znaków) → walidacja klienta blokuje.
    await page.locator("#main-alt").fill("za krótki alt");
    await page.locator("#main-caption").fill("ok caption");

    const mainSave = page.getByRole("button", { name: /^Popraw błędy$/ }).first();
    await expect(mainSave).toBeVisible();
    await expect(mainSave).toBeDisabled();

    // Komunikat błędu walidacji widoczny pod textarea („min. 60", „60–220" itp.).
    const altErr = page.locator("#main-alt-error, [id$='-alt-error'], [aria-live]").first();
    await expect(altErr).toBeVisible();

    // Wymusza klik (force) — i tak nic nie powinno polecieć do sieci, bo button jest disabled
    // (Playwright odmówi kliku non-force; force=true klika przez disabled by potwierdzić brak
    // efektu).
    await mainSave.click({ force: true }).catch(() => {});

    // ASERCJA: ZERO requestów write do PostgREST.
    expect(writeRequestCount).toBe(0);
    // Store pusty.
    expect(store.rows).toHaveLength(0);
  });

  test("B2: błąd serwera 500 → toast „Błąd zapisu" z opisem", async ({ page }) => {
    test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD.");

    const store: MockStore = {
      rows: [],
      failNextWrite: { status: 500, body: { message: "Internal Server Error" } },
    };
    await installRestMock(page, store);
    await loginAsAdmin(page);
    await page.goto("/admin/vein-images");
    await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();

    await page.locator("#main-alt").fill(validAlt("SERVER-500"));
    await page.locator("#main-caption").fill(validCaption("SERVER-500"));
    await page.getByRole("button", { name: /^Zapisz$/ }).first().click();

    // Toast „Błąd zapisu (EVLT · główny obraz)" — describeSaveError fallback.
    await expect(
      page.getByText(/Błąd zapisu \(EVLT · główny obraz\)/i),
    ).toBeVisible({ timeout: 10_000 });
    // Brak toasta „Zapisano".
    await expect(page.getByText(/^Zapisano:/i)).toHaveCount(0);
    // Store pusty — nic nie zostało zapisane.
    expect(store.rows).toHaveLength(0);
  });

  test("B3: walidacja serwera (alt 60-220) → toast „Walidacja serwera odrzuciła alt" z wymogiem", async ({
    page,
  }) => {
    test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD.");

    const store: MockStore = {
      rows: [],
      failNextWrite: {
        status: 400,
        // PostgREST zwraca message w polu `message` lub `details`.
        body: { message: "alt musi mieć 60-220 znaków (ma 12).", code: "P0001" },
      },
    };
    await installRestMock(page, store);
    await loginAsAdmin(page);
    await page.goto("/admin/vein-images");

    await page.locator("#main-alt").fill(validAlt("SERVER-VALID"));
    await page.locator("#main-caption").fill(validCaption("SERVER-VALID"));
    await page.getByRole("button", { name: /^Zapisz$/ }).first().click();

    // Toast „Walidacja serwera odrzuciła alt (EVLT · główny obraz)".
    await expect(
      page.getByText(/Walidacja serwera odrzuciła alt \(EVLT · główny obraz\)/i),
    ).toBeVisible({ timeout: 10_000 });
    // Opis zawiera wymóg długości.
    await expect(page.getByText(/Wymóg: alt 60[–-]220 znaków\./i)).toBeVisible();
    expect(store.rows).toHaveLength(0);
  });

  test("B4: błąd RLS (42501) → toast „Brak uprawnień" z prośbą o ponowne logowanie", async ({
    page,
  }) => {
    test.skip(!HAS_CREDS, "Brak ADMIN_E2E_EMAIL/PASSWORD.");

    const store: MockStore = {
      rows: [],
      failNextWrite: {
        status: 401,
        body: { message: "new row violates row-level security policy", code: "42501" },
      },
    };
    await installRestMock(page, store);
    await loginAsAdmin(page);
    await page.goto("/admin/vein-images");

    await page.locator("#main-alt").fill(validAlt("RLS"));
    await page.locator("#main-caption").fill(validCaption("RLS"));
    await page.getByRole("button", { name: /^Zapisz$/ }).first().click();

    await expect(
      page.getByText(/Brak uprawnień \(EVLT · główny obraz\)/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Twoje konto nie ma roli admina/i),
    ).toBeVisible();
    expect(store.rows).toHaveLength(0);
  });
});
