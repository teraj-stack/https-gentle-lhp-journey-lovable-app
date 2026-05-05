/**
 * Integration tests for `scripts/export-cloudflare-redirects.mjs`:
 * weryfikują tryb `--verify-run=<id>` oraz post-export `--strict`
 * (oba mają zwracać exit 0 przy spójnych artefaktach i exit 1 przy
 * jakimkolwiek pliku bez `run_id` w treści).
 *
 * Test odpala skrypt jako subprocess (Node) — nie importuje go, bo
 * skrypt natychmiast wywołuje pipeline na top-levelu.
 */
import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { resolve, join } from "node:path";

const SCRIPT = resolve(__dirname, "../../scripts/export-cloudflare-redirects.mjs");
const RUNS_DIR = "/mnt/documents/cloudflare-runs";

// Wszystkie tymczasowe katalogi run_id muszą zawierać ten prefix, żeby
// afterAll mógł je sprzątnąć bez ryzyka uderzenia w realny artefakt.
const TMP_PREFIX = "vitest-verify-";
const created: string[] = [];

function makeRunDir(slug: string): { runId: string; runDir: string } {
  const runId = `${TMP_PREFIX}${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUNS_DIR, runId);
  mkdirSync(runDir, { recursive: true });
  created.push(runDir);
  return { runId, runDir };
}

function writeArtifact(runDir: string, name: string, content: string) {
  writeFileSync(join(runDir, name), content, "utf8");
}

function runScript(args: string[]) {
  return spawnSync("node", [SCRIPT, ...args], {
    encoding: "utf8",
    timeout: 30_000,
  });
}

// Pełna walidacja kształtu run_id-verification.json — wspólna dla obu trybów
// (verify-run i post-export). Sprawdza schema_version, kind, mode, run_id,
// run_dir, generated_at (ISO 8601), stats (arytmetyka spójna, ratio w [0,1]),
// kształt każdej pozycji w `files[]` i `mismatches[]` oraz cross-spójność
// (mismatches.length === stats.mismatched, files z ok=false === mismatches).
type FileEntry = { key?: string; path: string; ok: boolean; reason?: string };
type MismatchEntry = { key?: string; path: string; error?: string };
type VerificationReport = {
  schema_version: number;
  kind: string;
  mode: string;
  run_id: string;
  run_dir: string;
  generated_at: string;
  stats: {
    checked: number;
    ok: number;
    mismatched: number;
    consistency_ratio: number;
  };
  mismatches: MismatchEntry[];
  files: FileEntry[];
};

function assertVerificationReportShape(
  report: VerificationReport,
  expected: { runId: string; mode: "verify-run" | "post-export"; runDir?: string },
) {
  // Top-level metadata.
  expect(report.schema_version).toBe(1);
  expect(report.kind).toBe("run_id-verification");
  expect(report.mode).toBe(expected.mode);
  expect(report.run_id).toBe(expected.runId);
  expect(typeof report.run_dir).toBe("string");
  expect(report.run_dir.length).toBeGreaterThan(0);
  if (expected.runDir) expect(report.run_dir).toBe(expected.runDir);
  expect(typeof report.generated_at).toBe("string");
  expect(Number.isFinite(Date.parse(report.generated_at))).toBe(true);
  expect(new Date(report.generated_at).toISOString()).toBe(report.generated_at);

  // Stats — typy + arytmetyka.
  const { stats } = report;
  expect(typeof stats.checked).toBe("number");
  expect(typeof stats.ok).toBe("number");
  expect(typeof stats.mismatched).toBe("number");
  expect(typeof stats.consistency_ratio).toBe("number");
  expect(stats.checked).toBeGreaterThanOrEqual(0);
  expect(stats.ok).toBeGreaterThanOrEqual(0);
  expect(stats.mismatched).toBeGreaterThanOrEqual(0);
  expect(stats.ok + stats.mismatched).toBe(stats.checked);
  expect(stats.consistency_ratio).toBeGreaterThanOrEqual(0);
  expect(stats.consistency_ratio).toBeLessThanOrEqual(1);
  if (stats.checked > 0) {
    expect(stats.consistency_ratio).toBeCloseTo(stats.ok / stats.checked, 6);
  }

  // Listy.
  expect(Array.isArray(report.files)).toBe(true);
  expect(Array.isArray(report.mismatches)).toBe(true);
  expect(report.files.length).toBe(stats.checked);
  expect(report.mismatches.length).toBe(stats.mismatched);

  // Per-file shape + cross-spójność (ok=false ↔ obecne w mismatches po path).
  const mismatchPaths = new Set(report.mismatches.map((m) => m.path));
  for (const f of report.files) {
    expect(typeof f.path).toBe("string");
    expect(f.path.length).toBeGreaterThan(0);
    expect(typeof f.ok).toBe("boolean");
    if (f.ok) {
      expect(f.reason).toBeUndefined();
      expect(mismatchPaths.has(f.path)).toBe(false);
    } else {
      expect(typeof f.reason).toBe("string");
      expect((f.reason ?? "").length).toBeGreaterThan(0);
      expect(mismatchPaths.has(f.path)).toBe(true);
    }
  }

  // Per-mismatch shape.
  for (const m of report.mismatches) {
    expect(typeof m.path).toBe("string");
    expect(m.path.length).toBeGreaterThan(0);
    if (m.error !== undefined) expect(typeof m.error).toBe("string");
  }
}

afterAll(() => {
  for (const dir of created) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe("export-cloudflare-redirects --verify-run", () => {
  it("exit 0 gdy wszystkie artefakty zawierają ten sam run_id", () => {
    const { runId, runDir } = makeRunDir("ok");
    writeArtifact(
      runDir,
      "manifest.json",
      JSON.stringify({
        run_id: runId,
        artifacts: { run_dir: runDir },
      }),
    );
    writeArtifact(runDir, "run.log", `line one run_id=${runId}\nline two\n`);
    writeArtifact(runDir, "rules.txt", `# run_id: ${runId}\nfrom,to\n`);

    const res = runScript([`--verify-run=${runId}`]);
    expect(res.status, res.stderr || res.stdout).toBe(0);
    expect(res.stdout).toContain("run_id consistency OK");

    const reportPath = join(runDir, "run_id-verification.json");
    expect(existsSync(reportPath)).toBe(true);
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
    assertVerificationReportShape(report, { runId, mode: "verify-run", runDir });
    expect(report.stats.mismatched).toBe(0);
    expect(report.stats.checked).toBeGreaterThanOrEqual(3);
    expect(report.stats.consistency_ratio).toBe(1);
  });

  it("exit 1 gdy choć jeden artefakt ma inny / brak run_id", () => {
    const { runId, runDir } = makeRunDir("mismatch");
    writeArtifact(
      runDir,
      "manifest.json",
      JSON.stringify({ run_id: runId, artifacts: { run_dir: runDir } }),
    );
    writeArtifact(runDir, "good.log", `entry run_id=${runId}\n`);
    // Plik z innym run_id — symuluje wyciek z innego przebiegu.
    writeArtifact(runDir, "stale.csv", `source,target,run_id\n/a,/b,OTHER-RUN-ID\n`);

    const res = runScript([`--verify-run=${runId}`]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("run_id mismatch");
    expect(res.stderr).toContain("stale.csv");

    const report = JSON.parse(
      readFileSync(join(runDir, "run_id-verification.json"), "utf8"),
    ) as VerificationReport;
    assertVerificationReportShape(report, { runId, mode: "verify-run", runDir });
    expect(report.stats.mismatched).toBe(1);
    expect(report.stats.checked).toBeGreaterThanOrEqual(3);
    expect(report.mismatches.some((m) => m.path.endsWith("stale.csv"))).toBe(true);
    expect(report.stats.consistency_ratio).toBeLessThan(1);
    expect(report.stats.consistency_ratio).toBeGreaterThan(0);
    // Plik bez run_id musi mieć ok=false z konkretnym powodem.
    const stale = report.files.find((f) => f.path.endsWith("stale.csv"));
    expect(stale).toBeDefined();
    expect(stale!.ok).toBe(false);
    expect(stale!.reason).toMatch(/run_id/i);
  });

  it("exit 1 gdy katalog cloudflare-runs/<id>/ nie istnieje", () => {
    const res = runScript([`--verify-run=${TMP_PREFIX}does-not-exist-xyz`]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("katalog nie istnieje");
  });

  it("exit 1 gdy --verify-run nie ma wartości", () => {
    const res = runScript(["--verify-run"]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("wymaga wartości");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Post-export --strict: pełny pipeline eksportu zapisuje artefakty do
// /mnt/documents/ a następnie sprawdza spójność run_id we wszystkich plikach
// z manifest.artifacts. W trybie --strict każda niezgodność → exit 1.
//
// Aby zasymulować niespójność bez ręcznej manipulacji plikami w trakcie
// działania skryptu, używamy test-only env CF_TEST_CORRUPT_ARTIFACT=<key>,
// który nadpisuje wskazany artefakt treścią bez RUN_ID tuż przed walidacją.
//
// Te testy NIE używają sieci (brak --upload / --clear) — eksport tylko
// czyta src/lib/seo/redirectsMap.ts i pisze pliki na dysk. Snapshot/restore
// współdzielonych artefaktów chroni inne testy/realne raporty przed
// pozostawieniem skorumpowanej zawartości.
// ──────────────────────────────────────────────────────────────────────────

const SHARED_ARTIFACTS = [
  "/mnt/documents/cloudflare-bulk-redirects.csv",
  "/mnt/documents/cloudflare-bulk-redirects.json",
  "/mnt/documents/cloudflare-redirects-simple.csv",
  "/mnt/documents/cloudflare-redirects.txt",
];

function snapshotSharedArtifacts(): Map<string, string | null> {
  const snap = new Map<string, string | null>();
  for (const p of SHARED_ARTIFACTS) {
    snap.set(p, existsSync(p) ? readFileSync(p, "utf8") : null);
  }
  return snap;
}

function restoreSharedArtifacts(snap: Map<string, string | null>) {
  for (const [p, content] of snap) {
    if (content === null) {
      if (existsSync(p)) rmSync(p, { force: true });
    } else {
      writeFileSync(p, content, "utf8");
    }
  }
}

function runExport(env: Record<string, string>, extraArgs: string[] = []) {
  return spawnSync("node", [SCRIPT, ...extraArgs], {
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, ...env },
  });
}

describe("export-cloudflare-redirects post-export --strict", () => {
  it("exit 0 gdy wszystkie artefakty mają spójny run_id (--strict, czysty eksport)", () => {
    const runId = `${TMP_PREFIX}strict-ok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    created.push(join(RUNS_DIR, runId));
    const snap = snapshotSharedArtifacts();
    try {
      const res = runExport({ CF_RUN_ID: runId }, ["--strict"]);
      expect(res.status, res.stderr || res.stdout).toBe(0);
      expect(res.stdout).toContain("run_id consistency");
      expect(res.stdout).not.toContain("run_id mismatch");

      const reportPath = join(RUNS_DIR, runId, "run_id-verification.json");
      expect(existsSync(reportPath)).toBe(true);
      const report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
      assertVerificationReportShape(report, { runId, mode: "post-export" });
      expect(report.stats.mismatched).toBe(0);
      expect(report.stats.consistency_ratio).toBe(1);
      expect(report.stats.checked).toBeGreaterThan(0);
      expect(report.mismatches).toEqual([]);
      // Wszystkie pliki muszą mieć ok=true (a więc i brak `reason`).
      expect(report.files.every((f) => f.ok === true)).toBe(true);
    } finally {
      restoreSharedArtifacts(snap);
    }
  });

  it("exit 1 gdy --strict + artefakt z niespójnym run_id (CF_TEST_CORRUPT_ARTIFACT=txt)", () => {
    const runId = `${TMP_PREFIX}strict-bad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    created.push(join(RUNS_DIR, runId));
    const snap = snapshotSharedArtifacts();
    try {
      const res = runExport(
        { CF_RUN_ID: runId, CF_TEST_CORRUPT_ARTIFACT: "txt" },
        ["--strict"],
      );
      expect(res.status).toBe(1);
      expect(res.stderr).toContain("run_id mismatch");
      expect(res.stderr).toContain("--strict");

      const report = JSON.parse(
        readFileSync(join(RUNS_DIR, runId, "run_id-verification.json"), "utf8"),
      ) as VerificationReport;
      assertVerificationReportShape(report, { runId, mode: "post-export" });
      expect(report.stats.mismatched).toBeGreaterThanOrEqual(1);
      expect(report.stats.consistency_ratio).toBeLessThan(1);
      // Niespójność musi pochodzić z `txt` (CF_TEST_CORRUPT_ARTIFACT=txt).
      expect(report.mismatches.some((m) => m.key === "txt")).toBe(true);
      const txtFile = report.files.find((f) => f.key === "txt");
      expect(txtFile).toBeDefined();
      expect(txtFile!.ok).toBe(false);
      expect(txtFile!.reason).toMatch(/run_id/i);
    } finally {
      restoreSharedArtifacts(snap);
    }
  });

  it("exit 0 BEZ --strict mimo niespójności (--strict eskaluje, brak --strict nie)", () => {
    const runId = `${TMP_PREFIX}nostrict-bad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    created.push(join(RUNS_DIR, runId));
    const snap = snapshotSharedArtifacts();
    try {
      const res = runExport({
        CF_RUN_ID: runId,
        CF_TEST_CORRUPT_ARTIFACT: "txt",
      });
      expect(res.status, res.stderr || res.stdout).toBe(0);
      expect(res.stderr).toContain("run_id mismatch");
      // Brak komunikatu o eskalacji do exit 1 (specyficzny dla --strict).
      expect(res.stderr).not.toContain("--strict: kończę");

      const report = JSON.parse(
        readFileSync(join(RUNS_DIR, runId, "run_id-verification.json"), "utf8"),
      ) as VerificationReport;
      assertVerificationReportShape(report, { runId, mode: "post-export" });
      expect(report.stats.mismatched).toBeGreaterThanOrEqual(1);
      expect(report.mismatches.some((m) => m.key === "txt")).toBe(true);
    } finally {
      restoreSharedArtifacts(snap);
    }
  });
});
