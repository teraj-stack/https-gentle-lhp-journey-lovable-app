#!/usr/bin/env node
/**
 * CLI helper do ręcznego uruchamiania reset/seed/reset+seed poza Playwrightem.
 * Użycie:
 *   node scripts/e2e-seed-cli.mjs reset
 *   node scripts/e2e-seed-cli.mjs seed
 *   node scripts/e2e-seed-cli.mjs reset-and-seed
 *
 * Wymaga env: ADMIN_E2E_EMAIL, ADMIN_E2E_PASSWORD, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.
 * Plik fixture: tests/fixtures/vein-overrides.seed.json (override przez E2E_SEED_FIXTURE).
 *
 * Uruchamiamy przez tsx, żeby zaimportować TS-owy helper bez budowania.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const action = (process.argv[2] ?? "reset-and-seed").trim();
const allowed = new Set(["reset", "seed", "reset-and-seed"]);
if (!allowed.has(action)) {
  console.error(
    `[e2e-seed-cli] Nieznana akcja "${action}". Dozwolone: ${[...allowed].join(", ")}`,
  );
  process.exit(2);
}

const inlineScript = `
import { runReset, runSeed, runResetAndSeed } from "${resolve(
  __dirname,
  "../tests/e2e/_helpers/seed.ts",
).replace(/\\\\/g, "/")}";
const action = ${JSON.stringify(action)};
const fn = action === "reset" ? runReset : action === "seed" ? runSeed : runResetAndSeed;
fn().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
`;

const result = spawnSync(
  "npx",
  ["--yes", "tsx", "--eval", inlineScript],
  { stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
