/**
 * Playwright globalTeardown — uruchamia się RAZ po całym runie.
 * Usuwa wszystkie wiersze E2E (prefix z fixture). Bez seedowania.
 */
import { runReset } from "./_helpers/seed";

export default async function globalTeardown(): Promise<void> {
  try {
    await runReset();
  } catch (err) {
    // Nie wywalamy całego runu na teardownie — logujemy, by nie ukrywać błędów testów.
    console.error("[e2e-global-teardown] Błąd cleanupu (ignorowany):", err);
  }
}
