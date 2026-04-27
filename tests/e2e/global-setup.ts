/**
 * Playwright globalSetup — uruchamia się RAZ przed całym runem.
 * Czyści wszystkie wiersze z `cleanupPrefix` (np. "e2e-") i wstawia deterministyczny
 * baseline z `tests/fixtures/vein-overrides.seed.json`.
 *
 * Brak credów (ADMIN_E2E_EMAIL/PASSWORD lub VITE_SUPABASE_URL/KEY) → setup loguje
 * ostrzeżenie i kończy się sukcesem; testy które wymagają auth same się skipują.
 */
import { runResetAndSeed } from "./_helpers/seed";

export default async function globalSetup(): Promise<void> {
  try {
    await runResetAndSeed();
  } catch (err) {
    console.error("[e2e-global-setup] Błąd seed/cleanup:", err);
    throw err;
  }
}
