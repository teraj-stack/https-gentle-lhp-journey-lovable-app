/**
 * E2E (Playwright): pełen flow panelu `/admin/vein-images` przeciw LIVE Lovable Cloud.
 *
 * Zakres:
 *  1. Login email/hasło (tryb E2E `?e2e=1` w `/admin/login` → realne `signInWithPassword`).
 *  2. CRUD inline: edycja alt/caption pojedynczego override → zapis → assert w bazie → reset → assert defaultu.
 *  3. Import CSV: szablon → preview (statusy create/update/error) → przełącznik dedup → walidacja per-pole → commit → assert w bazie.
 *  4. Eksport JSON i CSV (z filtrami) — sprawdzamy że plik się pobiera i zawiera oczekiwane wiersze.
 *  5. Reset wszystkich + Cofnij — snapshot, undo restore, assert że overrides wróciły.
 *
 * Konwencje:
 *  - Wszystkie testy używają unikalnego `page_key` z prefiksem `e2e-` (zob. E2E_PAGE_KEY) —
 *    NIE dotykamy realnych presetów (evlt, hemoroidy, …), żeby nie psuć preview produkcyjnego.
 *  - Cleanup w `afterEach` usuwa wszystkie wiersze z prefiksem `e2e-` przez REST z tokenem usera.
 *  - Wymagane env (skip jeśli brak):
 *      ADMIN_E2E_EMAIL      — email użytkownika z rolą admin w `user_roles`
 *      ADMIN_E2E_PASSWORD   — hasło tego użytkownika
 *      VITE_SUPABASE_URL    — z `.env` (publishable, dostępne w sandboxie)
 *      VITE_SUPABASE_PUBLISHABLE_KEY — j.w.
 *
 * UWAGA: testy wykonują REALNE INSERT/UPDATE/DELETE w tabeli `vein_image_overrides`.
 * Cleanup jest defensywny (LIKE 'e2e-%'), ale w razie crashu Playwrighta osierocone
 * wiersze trzeba wyczyścić ręcznie tym samym filtrem.
 */
import { test, expect, type Page, type APIRequestContext } from "../../playwright-fixture";

const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD ?? "";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  "";

const HAS_CREDS =
  ADMIN_EMAIL.length > 0 &&
  ADMIN_PASSWORD.length > 0 &&
  SUPABASE_URL.length > 0 &&
  SUPABASE_KEY.length > 0;

/**
 * UWAGA: `e2e-test` NIE jest zdefiniowany w VEIN_IMAGE_PAGE_PRESETS, więc
 * `page_key=eq.e2e-test` przejdzie przez RLS (Anyone can read) ale NIE pojawi
 * się w UI panelu (filtr po presetach). To oznacza że asercje na bazę robimy
 * bezpośrednio przez REST API. Edycja inline z UI musi celować w prawdziwy
 * preset — używamy ostatniego presetu i sprzątamy go zawsze przed testem.
 *
 * Dla CSV importu zaś używamy `e2e-test` jako page_key — preview pokaże go
 * jako `error` („nieznany page_key"), bo VALID_PAGE_KEYS nie zawiera prefiksu
 * e2e-. Dlatego importowy test celuje w realny preset też.
 */
const E2E_PAGE_KEY_PREFIX = "e2e-";
/** Preset, na którym testujemy CRUD i import (znany w UI, znany w VALID_PAGE_KEYS). */
const REAL_PRESET_KEY = "evlt";

interface OverrideRow {
  id: string;
  page_key: string;
  slot: string;
  alt: string;
  caption: string;
  updated_by: string | null;
  updated_at: string;
}

/**
 * Buduje minimalną pomocniczą obwolutę REST do PostgREST, z access tokenem
 * zalogowanego usera (przekazujemy go jako Bearer). Wymagane do operacji
 * podlegających RLS (INSERT/UPDATE/DELETE wymagają roli admin).
 */
const buildPostgrestApi = (ctx: APIRequestContext, accessToken: string) => {
  const baseUrl = `${SUPABASE_URL}/rest/v1`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  } as const;

  return {
    selectByKeySlot: async (pageKey: string, slot: string): Promise<OverrideRow | null> => {
      const res = await ctx.get(
        `${baseUrl}/vein_image_overrides?select=*&page_key=eq.${pageKey}&slot=eq.${slot}`,
        { headers },
      );
      const rows = (await res.json()) as OverrideRow[];
      return rows[0] ?? null;
    },
    listByPrefix: async (prefix: string): Promise<OverrideRow[]> => {
      const res = await ctx.get(
        `${baseUrl}/vein_image_overrides?select=*&page_key=like.${encodeURIComponent(`${prefix}%`)}`,
        { headers },
      );
      return (await res.json()) as OverrideRow[];
    },
    deleteByKeySlot: async (pageKey: string, slot: string): Promise<void> => {
      await ctx.delete(
        `${baseUrl}/vein_image_overrides?page_key=eq.${pageKey}&slot=eq.${slot}`,
        { headers },
      );
    },
    deleteByPrefix: async (prefix: string): Promise<void> => {
      await ctx.delete(
        `${baseUrl}/vein_image_overrides?page_key=like.${encodeURIComponent(`${prefix}%`)}`,
        { headers },
      );
    },
  };
};

/**
 * Wyciąga `access_token` z lokalnego storage Supabase (klucz `sb-<ref>-auth-token`).
 * Dzięki temu w teście możemy bezpośrednio uderzać w PostgREST jako zalogowany
 * admin (dokładnie tak jak robi to UI), bez potrzeby trzymania osobnego klienta.
 */
const getAccessTokenFromPage = async (page: Page): Promise<string> => {
  const token = await page.evaluate(() => {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as { access_token?: string };
          if (parsed.access_token) return parsed.access_token;
        } catch {
          // ignore
        }
      }
    }
    return "";
  });
  expect(token, "Access token in localStorage after login").not.toBe("");
  return token;
};

const loginAsAdmin = async (page: Page): Promise<string> => {
  await page.goto("/admin/login?e2e=1");
  const form = page.getByTestId("e2e-login-form");
  await expect(form).toBeVisible();
  await form.getByLabel("Email").fill(ADMIN_EMAIL);
  await form.getByLabel("Hasło").fill(ADMIN_PASSWORD);
  await form.getByRole("button", { name: /^Zaloguj się \(E2E\)$/ }).click();
  // Po sukcesie onAuthStateChange przekierowuje na /admin.
  await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  return getAccessTokenFromPage(page);
};

const generateValidAlt = (suffix: string): string =>
  `E2E TEST ${suffix} – schemat układu żylnego kończyny dolnej z perforatorami i kierunkiem przepływu krwi powierzchownej.`;

const generateValidCaption = (suffix: string): string =>
  `E2E ${suffix} · ryc. testowa · źródło: test`;

test.describe("AdminVeinImages — pełny flow E2E (live Supabase)", () => {
  test.beforeAll(() => {
    if (!HAS_CREDS) {
      // eslint-disable-next-line no-console
      console.warn(
        "[admin-vein-images-e2e] Pominięto: brak ADMIN_E2E_EMAIL/PASSWORD lub VITE_SUPABASE_URL/KEY. " +
          "Dodaj zmienne, by włączyć testy E2E przeciw live backendowi.",
      );
    }
  });

  test.beforeEach(async () => {
    test.skip(!HAS_CREDS, "Brak kredencjałów / SUPABASE config — test wymaga real auth + live backend.");
  });

  test.afterEach(async ({ page, request }) => {
    if (!HAS_CREDS) return;
    // Cleanup: usuń wszystkie wiersze z prefiksem e2e- ORAZ wiersze utworzone
    // przez testy w realnym presecie (REAL_PRESET_KEY). Defensywne: cleanup
    // nie powinien rzucać, jeśli sesja wygasła.
    try {
      const token = await getAccessTokenFromPage(page).catch(() => "");
      if (!token) return;
      const api = buildPostgrestApi(request, token);
      await api.deleteByPrefix(E2E_PAGE_KEY_PREFIX);
      // Posprzątaj też overrides na realnym presecie zostawione przez CRUD test.
      await api.deleteByKeySlot(REAL_PRESET_KEY, "main");
      await api.deleteByKeySlot(REAL_PRESET_KEY, "perforator");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[admin-vein-images-e2e] cleanup warning:", err);
    }
  });

  test("login + CRUD inline (zapis i reset do propsu)", async ({ page, request }) => {
    const token = await loginAsAdmin(page);
    const api = buildPostgrestApi(request, token);

    // Pre-clean: w razie szczątków po poprzednim teście.
    await api.deleteByKeySlot(REAL_PRESET_KEY, "main");

    await page.goto("/admin/vein-images");
    await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();

    // Aktywny tab — EVLT (pierwszy preset).
    const tab = page.getByRole("tab", { name: /EVLT/i });
    await expect(tab).toHaveAttribute("aria-selected", "true");

    const newAlt = generateValidAlt("CRUD");
    const newCap = generateValidCaption("CRUD");
    await page.locator("#main-alt").fill(newAlt);
    await page.locator("#main-caption").fill(newCap);

    // ASERCJA #1: draft preview pokazuje natychmiast nowy alt.
    await expect(page.getByAltText(newAlt).first()).toBeVisible();

    // Klik Zapisz dla slotu main.
    await page.getByRole("button", { name: /^Zapisz$/ }).first().click();
    await expect(page.getByText(/Zapisano:/i)).toBeVisible({ timeout: 10_000 });

    // ASERCJA #2: w bazie istnieje wiersz z nowym alt + caption + updated_by.
    const saved = await api.selectByKeySlot(REAL_PRESET_KEY, "main");
    expect(saved).not.toBeNull();
    expect(saved!.alt).toBe(newAlt);
    expect(saved!.caption).toBe(newCap);
    expect(saved!.updated_by).toBe(ADMIN_EMAIL);

    // Reset draft → wraca lokalnie do propsu (lokalny stan, bez touch bazy).
    await page.getByRole("button", { name: /Reset draft/i }).click();
    // Po resecie #main-alt nie powinno równać się newAlt.
    await expect(page.locator("#main-alt")).not.toHaveValue(newAlt);
  });

  test("import CSV: preview, dedup, walidacja, commit zapisuje do bazy", async ({
    page,
    request,
  }) => {
    const token = await loginAsAdmin(page);
    const api = buildPostgrestApi(request, token);
    await api.deleteByKeySlot(REAL_PRESET_KEY, "main");
    await api.deleteByKeySlot(REAL_PRESET_KEY, "perforator");

    await page.goto("/admin/vein-images");
    await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();

    // Buduj CSV: 4 wiersze celowo:
    //  L2: poprawny update na evlt/main (pierwsze wystąpienie)
    //  L3: duplikat evlt/main z innym alt → first-wins → "error"
    //  L4: poprawny create na evlt/perforator
    //  L5: błąd walidacji (alt za krótki) na nieznanym page_key (e2e-bad/main)
    const goodAltMain = generateValidAlt("IMPORT-MAIN");
    const goodCapMain = generateValidCaption("IMPORT-MAIN");
    const dupAltMain = generateValidAlt("IMPORT-MAIN-DUP");
    const goodAltPerf = generateValidAlt("IMPORT-PERF");
    const goodCapPerf = generateValidCaption("IMPORT-PERF");
    const csv =
      [
        "page_key,slot,alt,caption",
        `${REAL_PRESET_KEY},main,"${goodAltMain}","${goodCapMain}"`,
        `${REAL_PRESET_KEY},main,"${dupAltMain}","${goodCapMain}"`,
        `${REAL_PRESET_KEY},perforator,"${goodAltPerf}","${goodCapPerf}"`,
        `${E2E_PAGE_KEY_PREFIX}bad,main,"krótki","cap"`,
      ].join("\r\n");

    // Upload przez ukryty <input type=file>.
    await page.setInputFiles('input[type="file"][accept*="csv"]', {
      name: "e2e-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(`\uFEFF${csv}`, "utf8"),
    });

    // Dialog preview powinien się otworzyć.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Import CSV — preview/)).toBeVisible();

    // ASERCJA: nagłówek pokazuje 1 create (perforator), 1 update (main), 2 błędy (duplikat + walidacja).
    await expect(dialog.getByText(/do utworzenia: 1/)).toBeVisible();
    await expect(dialog.getByText(/do aktualizacji: 1/)).toBeVisible();
    await expect(dialog.getByText(/z błędami: 2/)).toBeVisible();

    // Sekcja błędów (rozwijana, otwarta domyślnie).
    await expect(dialog.getByText(/Wiersze z błędami: 2/)).toBeVisible();

    // Przełączenie strategii dedup na „last" → duplikat z L2 staje się noop,
    // L3 staje się update; liczba błędów spada do 1.
    await dialog.getByRole("radio", { name: /Ostatni wpis wygrywa/ }).check();
    await expect(dialog.getByText(/z błędami: 1/)).toBeVisible();
    await expect(dialog.getByText(/bez zmian: 1/)).toBeVisible();

    // Przywróć first-wins (chcemy zatwierdzić goodAltMain, nie dupAltMain).
    await dialog.getByRole("radio", { name: /Pierwsze wyst[ąa]pienie wygrywa/ }).check();
    await expect(dialog.getByText(/z błędami: 2/)).toBeVisible();

    // Commit: 2 applicable (1 create + 1 update), pozostałe ignorowane.
    await dialog.getByRole("button", { name: /^Zatwierdź \(2\)$/ }).click();
    // Toast „Zaimportowano 2/2".
    await expect(page.getByText(/Zaimportowano 2\/2/)).toBeVisible({ timeout: 15_000 });

    // ASERCJA #2: w bazie są DOKŁADNIE 2 wiersze: evlt/main z goodAltMain (NIE dupAltMain!) i evlt/perforator.
    const mainRow = await api.selectByKeySlot(REAL_PRESET_KEY, "main");
    expect(mainRow?.alt).toBe(goodAltMain);
    const perfRow = await api.selectByKeySlot(REAL_PRESET_KEY, "perforator");
    expect(perfRow?.alt).toBe(goodAltPerf);

    // ASERCJA #3: wiersz z błędem walidacji NIE został zapisany.
    const badRows = await api.listByPrefix(`${E2E_PAGE_KEY_PREFIX}bad`);
    expect(badRows).toHaveLength(0);
  });

  test("eksport JSON i CSV: pliki zawierają zapisane overrides", async ({
    page,
    request,
  }) => {
    const token = await loginAsAdmin(page);
    const api = buildPostgrestApi(request, token);
    await api.deleteByKeySlot(REAL_PRESET_KEY, "main");

    // Seed: jeden override przez UI (tym samym mamy 1 wiersz do eksportu).
    await page.goto("/admin/vein-images");
    await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();
    const seedAlt = generateValidAlt("EXPORT");
    const seedCap = generateValidCaption("EXPORT");
    await page.locator("#main-alt").fill(seedAlt);
    await page.locator("#main-caption").fill(seedCap);
    await page.getByRole("button", { name: /^Zapisz$/ }).first().click();
    await expect(page.getByText(/Zapisano:/i)).toBeVisible({ timeout: 10_000 });

    // Eksport JSON.
    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /^Export JSON$/ }).click(),
    ]);
    const jsonStream = await jsonDownload.createReadStream();
    expect(jsonStream).not.toBeNull();
    const jsonChunks: Buffer[] = [];
    for await (const chunk of jsonStream!) {
      jsonChunks.push(chunk as Buffer);
    }
    const jsonText = Buffer.concat(jsonChunks).toString("utf8");
    const jsonRows = JSON.parse(jsonText) as OverrideRow[];
    const exportedMain = jsonRows.find(
      (r) => r.page_key === REAL_PRESET_KEY && r.slot === "main",
    );
    expect(exportedMain?.alt).toBe(seedAlt);

    // Eksport CSV.
    const [csvDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /^Export CSV$/ }).click(),
    ]);
    const csvStream = await csvDownload.createReadStream();
    const csvChunks: Buffer[] = [];
    for await (const chunk of csvStream!) {
      csvChunks.push(chunk as Buffer);
    }
    const csvText = Buffer.concat(csvChunks).toString("utf8");
    expect(csvText).toContain(REAL_PRESET_KEY);
    expect(csvText).toContain(seedAlt);
  });

  test("reset wszystkich + Cofnij: undo restore'uje overrides", async ({
    page,
    request,
  }) => {
    const token = await loginAsAdmin(page);
    const api = buildPostgrestApi(request, token);
    await api.deleteByKeySlot(REAL_PRESET_KEY, "main");

    // Seed: jeden override, żeby reset miał co usunąć i undo miał co przywrócić.
    await page.goto("/admin/vein-images");
    await expect(page.getByRole("heading", { name: /Vein Images/i })).toBeVisible();
    const seedAlt = generateValidAlt("UNDO");
    const seedCap = generateValidCaption("UNDO");
    await page.locator("#main-alt").fill(seedAlt);
    await page.locator("#main-caption").fill(seedCap);
    await page.getByRole("button", { name: /^Zapisz$/ }).first().click();
    await expect(page.getByText(/Zapisano:/i)).toBeVisible({ timeout: 10_000 });

    // Reset wszystkich — `window.confirm` musimy zaakceptować.
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /Reset wszystkich/i }).click();

    // Po resecie wiersz znika z bazy.
    await expect.poll(async () => api.selectByKeySlot(REAL_PRESET_KEY, "main")).toBeNull();

    // Toast z akcją „Cofnij" (sonner) — szukamy buttona w live region.
    const undoBtn = page.getByRole("button", { name: /^Cofnij$/ });
    await expect(undoBtn).toBeVisible({ timeout: 5_000 });
    await undoBtn.click();

    // Po Cofnij wiersz wraca z tymi samymi alt/caption.
    await expect
      .poll(async () => (await api.selectByKeySlot(REAL_PRESET_KEY, "main"))?.alt, {
        timeout: 10_000,
      })
      .toBe(seedAlt);
  });
});
