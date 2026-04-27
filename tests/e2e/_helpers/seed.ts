/**
 * Seed/cleanup helpery E2E dla `/admin/vein-images`.
 *
 * Strategia (zatwierdzona przez właściciela projektu):
 *  - Auth: sesja admina (signInWithPassword) — żadnego service-role keya w testach.
 *  - Lifecycle: globalSetup (raz: cleanup + seed z JSON) + globalTeardown (raz: cleanup).
 *  - Zakres: tylko wiersze z `page_key` zaczynającym się od `cleanupPrefix` (domyślnie "e2e-")
 *    z tabel `vein_image_overrides` i `vein_image_override_history` (history per override_id
 *    sprzątane kaskadowo na podstawie pobranych id z overrides przed deletem).
 *
 * UWAGA: bezpieczeństwo prefixu — nigdy nie czyścimy nic poza `e2e-*`. Jeśli ktoś
 * ustawi pusty prefix w fixture, helper rzuca błędem.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface SeedRow {
  page_key: string;
  slot: string;
  alt: string;
  caption: string;
}

export interface SeedFixture {
  cleanupPrefix: string;
  rows: SeedRow[];
}

export interface E2EConfig {
  email: string;
  password: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  fixturePath: string;
}

export const readEnvConfig = (): E2EConfig | null => {
  const email = process.env.ADMIN_E2E_EMAIL ?? "";
  const password = process.env.ADMIN_E2E_PASSWORD ?? "";
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "";
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "";
  const fixturePath =
    process.env.E2E_SEED_FIXTURE ??
    resolve(__dirname, "../../fixtures/vein-overrides.seed.json");

  if (!email || !password || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return { email, password, supabaseUrl, supabaseAnonKey, fixturePath };
};

export const loadFixture = (path: string): SeedFixture => {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<SeedFixture>;
  const prefix = (parsed.cleanupPrefix ?? "").trim();
  if (!prefix || prefix.length < 2) {
    throw new Error(
      `[e2e-seed] cleanupPrefix musi być niepustym ciągiem (≥2 znaki), aby uniknąć przypadkowego skasowania danych produkcyjnych. Otrzymano: "${prefix}".`,
    );
  }
  if (!Array.isArray(parsed.rows)) {
    throw new Error(`[e2e-seed] Fixture ${path} musi zawierać tablicę "rows".`);
  }
  for (const row of parsed.rows) {
    if (!row.page_key.startsWith(prefix)) {
      throw new Error(
        `[e2e-seed] Wiersz seed page_key="${row.page_key}" nie zaczyna się od cleanupPrefix="${prefix}". Wszystkie seedowane wiersze muszą używać prefixu, by były objęte cleanupem.`,
      );
    }
  }
  return { cleanupPrefix: prefix, rows: parsed.rows as SeedRow[] };
};

export const createAdminClient = async (
  cfg: E2EConfig,
): Promise<SupabaseClient> => {
  const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: cfg.email,
    password: cfg.password,
  });
  if (error) {
    throw new Error(
      `[e2e-seed] Logowanie admina nie powiodło się: ${error.message}`,
    );
  }
  return client;
};

export const cleanupByPrefix = async (
  client: SupabaseClient,
  prefix: string,
): Promise<{ overrides: number; history: number }> => {
  if (!prefix || prefix.length < 2) {
    throw new Error(`[e2e-seed] cleanupByPrefix: prefix nieprawidłowy ("${prefix}").`);
  }

  // 1) Pobierz id wszystkich overrides z prefixem (potrzebne do cleanupu history).
  const { data: rows, error: selErr } = await client
    .from("vein_image_overrides")
    .select("id")
    .like("page_key", `${prefix}%`);
  if (selErr) throw new Error(`[e2e-seed] select overrides: ${selErr.message}`);

  const ids = (rows ?? []).map((r) => r.id as string);

  // 2) History: po override_id (gdy istnieje) i dodatkowo po page_key (orphany).
  let historyDeleted = 0;
  if (ids.length > 0) {
    const { error: hErr, count } = await client
      .from("vein_image_override_history")
      .delete({ count: "exact" })
      .in("override_id", ids);
    if (hErr) throw new Error(`[e2e-seed] delete history (by id): ${hErr.message}`);
    historyDeleted += count ?? 0;
  }
  const { error: hErr2, count: hCount2 } = await client
    .from("vein_image_override_history")
    .delete({ count: "exact" })
    .like("page_key", `${prefix}%`);
  if (hErr2) throw new Error(`[e2e-seed] delete history (by prefix): ${hErr2.message}`);
  historyDeleted += hCount2 ?? 0;

  // 3) Overrides.
  const { error: oErr, count: oCount } = await client
    .from("vein_image_overrides")
    .delete({ count: "exact" })
    .like("page_key", `${prefix}%`);
  if (oErr) throw new Error(`[e2e-seed] delete overrides: ${oErr.message}`);

  return { overrides: oCount ?? 0, history: historyDeleted };
};

export const seedRows = async (
  client: SupabaseClient,
  rows: SeedRow[],
): Promise<number> => {
  if (rows.length === 0) return 0;
  const { error, count } = await client
    .from("vein_image_overrides")
    .insert(rows, { count: "exact" });
  if (error) throw new Error(`[e2e-seed] insert seed rows: ${error.message}`);
  return count ?? rows.length;
};

export const runReset = async (): Promise<void> => {
  const cfg = readEnvConfig();
  if (!cfg) {
    console.warn(
      "[e2e-seed] Pominięto reset — brak ADMIN_E2E_EMAIL/PASSWORD/VITE_SUPABASE_URL/KEY w env.",
    );
    return;
  }
  const fixture = loadFixture(cfg.fixturePath);
  const client = await createAdminClient(cfg);
  const result = await cleanupByPrefix(client, fixture.cleanupPrefix);
  console.log(
    `[e2e-seed] Reset OK — overrides usunięto: ${result.overrides}, history: ${result.history} (prefix="${fixture.cleanupPrefix}").`,
  );
  await client.auth.signOut().catch(() => {});
};

export const runSeed = async (): Promise<void> => {
  const cfg = readEnvConfig();
  if (!cfg) {
    console.warn(
      "[e2e-seed] Pominięto seed — brak ADMIN_E2E_EMAIL/PASSWORD/VITE_SUPABASE_URL/KEY w env.",
    );
    return;
  }
  const fixture = loadFixture(cfg.fixturePath);
  const client = await createAdminClient(cfg);
  const inserted = await seedRows(client, fixture.rows);
  console.log(
    `[e2e-seed] Seed OK — wstawiono ${inserted} wierszy z fixture (${cfg.fixturePath}).`,
  );
  await client.auth.signOut().catch(() => {});
};

export const runResetAndSeed = async (): Promise<void> => {
  const cfg = readEnvConfig();
  if (!cfg) {
    console.warn(
      "[e2e-seed] Pominięto reset+seed — brak ADMIN_E2E_EMAIL/PASSWORD/VITE_SUPABASE_URL/KEY w env.",
    );
    return;
  }
  const fixture = loadFixture(cfg.fixturePath);
  const client = await createAdminClient(cfg);
  const cleaned = await cleanupByPrefix(client, fixture.cleanupPrefix);
  const inserted = await seedRows(client, fixture.rows);
  console.log(
    `[e2e-seed] Reset+Seed OK — usunięto ${cleaned.overrides} overrides / ${cleaned.history} history, wstawiono ${inserted} (prefix="${fixture.cleanupPrefix}").`,
  );
  await client.auth.signOut().catch(() => {});
};
