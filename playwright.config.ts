import { createLovableConfig } from "lovable-agent-playwright-config/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default createLovableConfig({
  // Lifecycle: globalSetup czyści wiersze E2E (prefix `e2e-`) i wstawia baseline z
  // tests/fixtures/vein-overrides.seed.json. globalTeardown sprząta po runie.
  // Brak credów (ADMIN_E2E_EMAIL/PASSWORD) → warning + skip, run się nie wywala.
  globalSetup: resolve(__dirname, "tests/e2e/global-setup.ts"),
  globalTeardown: resolve(__dirname, "tests/e2e/global-teardown.ts"),
});
