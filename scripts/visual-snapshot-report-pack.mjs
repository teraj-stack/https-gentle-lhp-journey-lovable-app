#!/usr/bin/env node
/**
 * Pakuje wygenerowany raport wizualny (`test-results/visual-report/`) do
 * pojedynczego pliku ZIP, gotowego do uploadu jako artifact w CI
 * (np. GitHub Actions `actions/upload-artifact`).
 *
 * Co robi:
 *  - Sprawdza czy raport istnieje (uruchom najpierw `bun run test:visual:report`).
 *  - Tworzy `test-results/visual-report.zip` zawierający `index.html` + `assets/`.
 *  - Spawnuje systemowy `zip` (POSIX, dostępny na ubuntu-latest GH Actions
 *    runnerach domyślnie). Brak zależności npm — działa w czystym CI.
 *
 * Czemu osobny skrypt zamiast inline w pipeline:
 *  - DRY: lokalnie też chcesz móc spakować raport jednym poleceniem.
 *  - Atomowość: jeśli `zip` zawiedzie, exit code != 0 → CI step failnie czysto.
 *  - Walidacja: skrypt sprawdza obecność source dir i wypisuje czytelny błąd
 *    zamiast pozwolić `actions/upload-artifact` na zgłoszenie "no files found".
 *
 * Uruchamianie:
 *   bun run test:visual:report:pack
 *   node scripts/visual-snapshot-report-pack.mjs
 *   node scripts/visual-snapshot-report-pack.mjs --output=raport.zip
 *
 * Exit codes:
 *   0 — ZIP utworzony.
 *   2 — brak source dir (`test-results/visual-report/`) — uruchom najpierw report.
 *   3 — `zip` CLI niedostępny (user musi zainstalować — patrz komunikat).
 *   4 — `zip` zwrócił błąd (np. brak miejsca na dysku).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const REPORT_DIR = path.join(PROJECT_ROOT, "test-results", "visual-report");
const DEFAULT_OUTPUT = path.join(PROJECT_ROOT, "test-results", "visual-report.zip");

/**
 * Parser CLI: jedyna opcja to `--output=<path>` (alias `-o <path>`).
 */
const parseCliArgs = (argv) => {
  let output = DEFAULT_OUTPUT;
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--output=")) {
      output = path.resolve(PROJECT_ROOT, a.slice("--output=".length));
    } else if (a === "--output" || a === "-o") {
      const next = args[i + 1];
      if (next) {
        output = path.resolve(PROJECT_ROOT, next);
        i++;
      }
    }
  }
  return { output };
};

const exists = async (p) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  const { output } = parseCliArgs(process.argv);

  if (!(await exists(REPORT_DIR))) {
    console.error(
      `[visual-snapshot-report-pack] Nie znaleziono raportu: ${REPORT_DIR}\n` +
        `Uruchom najpierw: bun run test:visual:report (lub test:visual:live-preview).`,
    );
    process.exit(2);
  }
  if (!(await exists(path.join(REPORT_DIR, "index.html")))) {
    console.error(
      `[visual-snapshot-report-pack] Raport jest niekompletny — brak index.html w ${REPORT_DIR}.`,
    );
    process.exit(2);
  }

  // Usuń poprzedni ZIP, żeby `zip` nie dopisywał do starego archiwum.
  if (await exists(output)) await fs.rm(output);
  await fs.mkdir(path.dirname(output), { recursive: true });

  // Pakujemy ZAWARTOŚĆ visual-report/, nie sam katalog — żeby po unzipie
  // user dostał `index.html` + `assets/` w bieżącym folderze, bez dodatkowego
  // wrappera. To matche zachowaniu `actions/download-artifact` i ułatwia
  // hostowanie na GitHub Pages / Netlify drop.
  // `zip -r -q OUT . -i ...` wymaga cwd ustawionego na REPORT_DIR.
  const args = ["-r", "-q", output, "."];
  const child = spawn("zip", args, { cwd: REPORT_DIR, stdio: ["ignore", "inherit", "inherit"] });

  await new Promise((resolve, reject) => {
    child.on("error", (err) => {
      if (err.code === "ENOENT") {
        console.error(
          `[visual-snapshot-report-pack] Komenda 'zip' jest niedostępna w PATH.\n` +
            `  Linux:  apt-get install zip   (lub: nix-shell -p zip)\n` +
            `  macOS:  zip jest preinstalowany — sprawdź PATH\n` +
            `  CI:     ubuntu-latest ma zip preinstalowany (GitHub Actions)`,
        );
        process.exit(3);
      }
      reject(err);
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else {
        console.error(`[visual-snapshot-report-pack] 'zip' zakończył się kodem ${code}.`);
        process.exit(4);
      }
    });
  });

  const stat = await fs.stat(output);
  const sizeKb = (stat.size / 1024).toFixed(1);
  console.log(
    `[visual-snapshot-report-pack] ✓ Spakowano: ${path.relative(PROJECT_ROOT, output)} (${sizeKb} KB)`,
  );
};

main().catch((err) => {
  console.error("[visual-snapshot-report-pack] Błąd:", err);
  process.exit(1);
});
