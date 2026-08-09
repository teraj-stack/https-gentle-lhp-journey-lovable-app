/**
 * JSON-LD validator for production pages.
 *
 * Renders selected routes via Playwright (Chromium headless),
 * extracts every <script type="application/ld+json"> block,
 * and validates required fields for MedicalWebPage, FAQPage and BreadcrumbList.
 *
 * Usage:
 *   node scripts/validate-jsonld.mjs                       # default: https://mcml.pro
 *   node scripts/validate-jsonld.mjs https://mcml.pro       # custom base
 *   BASE_URL=https://mcml.pro node scripts/validate-jsonld.mjs
 */
import { chromium } from "playwright";

const BASE_URL = (process.argv[2] || process.env.BASE_URL || "https://mcml.pro").replace(/\/$/, "");
const EXPECTED_DOMAIN = "https://mcml.pro";

const ROUTES = [
  { path: "/", label: "Home" },
  { path: "/leczenie/evlt", label: "EVLT" },
  { path: "/leczenie/filac", label: "FiLaC" },
  { path: "/dla-pacjenta/proktolog-faq", label: "ProktologFAQ" },
];

const REQUIRED = {
  MedicalWebPage: ["@context", "@type", "name", "description", "url", "author"],
  FAQPage: ["@context", "@type", "mainEntity"],
  BreadcrumbList: ["@context", "@type", "itemListElement"],
};

function flatten(node) {
  // JSON-LD blocks may be a single object, an array, or wrapped under @graph
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (node && typeof node === "object") {
    if (Array.isArray(node["@graph"])) return node["@graph"].flatMap(flatten);
    return [node];
  }
  return [];
}

function validateOne(schema) {
  const type = schema["@type"];
  const errors = [];
  const warnings = [];
  const required = REQUIRED[type];
  if (!required) return { type, errors, warnings, skipped: true };

  for (const field of required) {
    if (schema[field] === undefined || schema[field] === null || schema[field] === "") {
      errors.push(`missing required field: ${field}`);
    }
  }

  // Domain consistency check
  const urlFields = ["url", "@id", "mainEntityOfPage"];
  for (const f of urlFields) {
    const v = schema[f];
    if (typeof v === "string" && /^https?:\/\//.test(v) && !v.startsWith(EXPECTED_DOMAIN)) {
      warnings.push(`${f} uses unexpected domain: ${v}`);
    }
  }

  if (type === "FAQPage") {
    if (!Array.isArray(schema.mainEntity)) {
      errors.push("FAQPage.mainEntity must be an array");
    } else {
      schema.mainEntity.forEach((q, i) => {
        if (q["@type"] !== "Question") errors.push(`mainEntity[${i}] @type must be "Question"`);
        if (!q.name) errors.push(`mainEntity[${i}] missing "name"`);
        const a = q.acceptedAnswer;
        if (!a) errors.push(`mainEntity[${i}] missing "acceptedAnswer"`);
        else {
          if (a["@type"] !== "Answer") errors.push(`mainEntity[${i}].acceptedAnswer @type must be "Answer"`);
          if (!a.text) errors.push(`mainEntity[${i}].acceptedAnswer missing "text"`);
        }
      });
    }
  }

  if (type === "BreadcrumbList") {
    if (!Array.isArray(schema.itemListElement)) {
      errors.push("BreadcrumbList.itemListElement must be an array");
    } else {
      schema.itemListElement.forEach((it, i) => {
        if (it["@type"] !== "ListItem") errors.push(`itemListElement[${i}] @type must be "ListItem"`);
        if (typeof it.position !== "number") errors.push(`itemListElement[${i}] missing numeric "position"`);
        if (!it.name) errors.push(`itemListElement[${i}] missing "name"`);
        if (it.item && typeof it.item === "string" && !it.item.startsWith(EXPECTED_DOMAIN)) {
          warnings.push(`itemListElement[${i}].item uses unexpected domain: ${it.item}`);
        }
      });
    }
  }

  return { type, errors, warnings, skipped: false };
}

async function checkRoute(page, { path, label }) {
  const url = `${BASE_URL}${path}`;
  const result = { label, url, blocks: [], summary: { errors: 0, warnings: 0, schemas: 0 } };
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    // Give React a beat to inject FAQ/Breadcrumb schemas
    await page.waitForTimeout(800);
    const blocks = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
      nodes.map((n) => n.textContent || "")
    );
    for (const raw of blocks) {
      try {
        const parsed = JSON.parse(raw);
        for (const schema of flatten(parsed)) {
          const v = validateOne(schema);
          result.blocks.push(v);
          if (!v.skipped) {
            result.summary.schemas++;
            result.summary.errors += v.errors.length;
            result.summary.warnings += v.warnings.length;
          }
        }
      } catch (e) {
        result.blocks.push({ type: "ParseError", errors: [`invalid JSON: ${e.message}`], warnings: [] });
        result.summary.errors++;
      }
    }
  } catch (e) {
    result.blocks.push({ type: "NavigationError", errors: [e.message], warnings: [] });
    result.summary.errors++;
  }
  return result;
}

function fmt(result) {
  const out = [];
  out.push(`\n━━━ ${result.label}  →  ${result.url}`);
  out.push(`    schemas: ${result.summary.schemas}, errors: ${result.summary.errors}, warnings: ${result.summary.warnings}`);
  for (const b of result.blocks) {
    if (b.skipped) {
      out.push(`    · ${b.type} (skipped — no validation rules)`);
      continue;
    }
    const icon = b.errors.length ? "✗" : b.warnings.length ? "⚠" : "✓";
    out.push(`    ${icon} ${b.type}`);
    b.errors.forEach((e) => out.push(`        ERROR: ${e}`));
    b.warnings.forEach((w) => out.push(`        WARN:  ${w}`));
  }
  return out.join("\n");
}

(async () => {
  console.log(`\nValidating JSON-LD on ${BASE_URL}`);
  console.log(`Expected canonical domain: ${EXPECTED_DOMAIN}\n`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ userAgent: "JsonLdValidator/1.0 (+playwright)" });
  const results = [];
  for (const route of ROUTES) {
    process.stdout.write(`→ ${route.label}…`);
    const r = await checkRoute(page, route);
    process.stdout.write(` done (${r.summary.schemas} schemas, ${r.summary.errors}E/${r.summary.warnings}W)\n`);
    results.push(r);
  }
  await browser.close();

  console.log("\n=== DETAILED RESULTS ===");
  results.forEach((r) => console.log(fmt(r)));

  const totals = results.reduce(
    (acc, r) => ({
      schemas: acc.schemas + r.summary.schemas,
      errors: acc.errors + r.summary.errors,
      warnings: acc.warnings + r.summary.warnings,
    }),
    { schemas: 0, errors: 0, warnings: 0 }
  );
  console.log(`\n=== SUMMARY ===\nTotal schemas: ${totals.schemas}\nTotal errors:  ${totals.errors}\nTotal warns:   ${totals.warnings}`);
  process.exit(totals.errors > 0 ? 1 : 0);
})();
