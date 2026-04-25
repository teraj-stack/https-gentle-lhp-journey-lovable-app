#!/usr/bin/env node
/**
 * Build-time validation:
 * Each `ebmId` referenced in src/components/blog/RiskFactorsAccordion.tsx
 * (sources + comparison-table rows) must exist as a category `id` in
 * src/components/hemoroidy/EBMSourcesSection.tsx, otherwise the deep
 * link `/dla-pacjenta/ebm-hemoroidy#ebm-<id>` would scroll to nothing.
 *
 * Exits with code 1 on any mismatch and prints a clear, actionable error.
 *
 * Used by:
 *   - vite.config.ts  (buildStart hook — runs on `vite dev` and `vite build`)
 *   - vitest          (src/lib/ebmAnchors.test.ts — runs in CI)
 *   - manual:         `node scripts/validate-ebm-anchors.mjs`
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SOURCES_FILE = resolve(
  ROOT,
  "src/components/hemoroidy/EBMSourcesSection.tsx",
);
const ACCORDION_FILE = resolve(
  ROOT,
  "src/components/blog/RiskFactorsAccordion.tsx",
);

/** @typedef {{ id: string, line: number }} Hit */

/** @returns {Set<string>} */
function extractCategoryIds(filePath) {
  const text = readFileSync(filePath, "utf8");
  const ids = new Set();
  // Match the CATEGORIES array: each Category object has `id: "<slug>"`
  // We look for `id: "<slug>",` where slug is kebab/lowercase.
  const re = /^\s*id:\s*"([a-z0-9-]+)"\s*,/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

/** @returns {Hit[]} */
function extractEbmIdReferences(filePath) {
  const text = readFileSync(filePath, "utf8");
  const lines = text.split("\n");
  /** @type {Hit[]} */
  const hits = [];
  const re = /ebmId:\s*"([a-z0-9-]+)"/;
  lines.forEach((line, idx) => {
    const m = line.match(re);
    if (m) hits.push({ id: m[1], line: idx + 1 });
  });
  return hits;
}

export function validateEbmAnchors() {
  const validIds = extractCategoryIds(SOURCES_FILE);
  if (validIds.size === 0) {
    throw new Error(
      `[validate-ebm-anchors] Could not extract any category id from ${SOURCES_FILE}. ` +
        `Did the CATEGORIES array shape change? Check the regex in scripts/validate-ebm-anchors.mjs.`,
    );
  }

  const refs = extractEbmIdReferences(ACCORDION_FILE);
  const orphans = refs.filter((r) => !validIds.has(r.id));

  return {
    validIds: [...validIds].sort(),
    refsCount: refs.length,
    orphans,
  };
}

function formatReport({ validIds, refsCount, orphans }) {
  const header = `[validate-ebm-anchors] Checked ${refsCount} ebmId references against ${validIds.length} categories: ${validIds.join(", ")}`;
  if (orphans.length === 0) return `${header} ✓ all valid.`;

  const details = orphans
    .map(
      (o) =>
        `  - "${o.id}"  →  src/components/blog/RiskFactorsAccordion.tsx:${o.line}`,
    )
    .join("\n");

  return (
    `${header}\n` +
    `\n✗ Found ${orphans.length} orphan ebmId reference(s) — these will produce broken deep-links to /dla-pacjenta/ebm-hemoroidy#ebm-<id>:\n` +
    `${details}\n\n` +
    `Fix one of two ways:\n` +
    `  1) Rename the ebmId in RiskFactorsAccordion.tsx to one of: ${validIds.join(", ")}\n` +
    `  2) Add a new Category with matching id in src/components/hemoroidy/EBMSourcesSection.tsx (CATEGORIES array)\n`
  );
}

// CLI entrypoint — only when run directly (not when imported)
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("validate-ebm-anchors.mjs");

if (isDirectRun) {
  try {
    const result = validateEbmAnchors();
    const report = formatReport(result);
    if (result.orphans.length > 0) {
      console.error(report);
      process.exit(1);
    } else {
      console.log(report);
      process.exit(0);
    }
  } catch (err) {
    console.error(`[validate-ebm-anchors] FATAL: ${err.message}`);
    process.exit(2);
  }
}
