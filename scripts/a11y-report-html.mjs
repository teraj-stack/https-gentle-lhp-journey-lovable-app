#!/usr/bin/env node
/**
 * Aggregates per-route axe JSON reports (written by tests/e2e/a11y-axe.spec.ts
 * to ./a11y-report/*.json) into a single browsable index.html so reviewers can
 * skim violations without unzipping raw JSON.
 *
 * Usage:  node scripts/a11y-report-html.mjs
 * Output: ./a11y-report/index.html
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve(process.cwd(), "a11y-report");
if (!existsSync(DIR)) {
  console.error(`[a11y-report] no ${DIR} directory — run npm run test:a11y first.`);
  process.exit(0);
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const reports = files
  .map((f) => {
    try { return JSON.parse(readFileSync(resolve(DIR, f), "utf8")); } catch { return null; }
  })
  .filter(Boolean)
  .sort((a, b) => (a.profile + a.route.path).localeCompare(b.profile + b.route.path));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const impactColor = { critical: "#b91c1c", serious: "#c2410c", moderate: "#a16207", minor: "#4b5563" };

const totals = reports.reduce(
  (acc, r) => {
    acc.blocking += r.summary.blocking;
    acc.advisory += r.summary.advisory;
    acc.violations += r.summary.violations;
    acc.passes += r.summary.passes;
    return acc;
  },
  { blocking: 0, advisory: 0, violations: 0, passes: 0 },
);

const rows = reports
  .map((r) => {
    const violations = (r.violations || [])
      .map(
        (v) => `
          <details class="v">
            <summary>
              <span class="badge" style="background:${impactColor[v.impact] || "#374151"}">${esc(v.impact || "n/a")}</span>
              <code>${esc(v.id)}</code> — ${esc(v.help)} <span class="count">(${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})</span>
              <a class="doclink" href="${esc(v.helpUrl)}" target="_blank" rel="noreferrer">docs ↗</a>
            </summary>
            <ul>
              ${v.nodes
                .map(
                  (n) => `<li>
                    <div><strong>target:</strong> <code>${esc((n.target || []).join(" "))}</code></div>
                    <pre>${esc(n.failureSummary || "")}</pre>
                    ${n.html ? `<pre class="html">${esc(n.html)}</pre>` : ""}
                  </li>`,
                )
                .join("")}
            </ul>
          </details>`,
      )
      .join("");

    const status = r.summary.blocking > 0 ? "FAIL" : r.summary.advisory > 0 ? "ADVISORY" : "PASS";
    const statusColor = status === "FAIL" ? "#b91c1c" : status === "ADVISORY" ? "#a16207" : "#166534";

    return `
      <section class="route">
        <header>
          <span class="status" style="background:${statusColor}">${status}</span>
          <span class="profile">${esc(r.profile)}</span>
          <h2><code>${esc(r.route.path)}</code></h2>
          <p class="label">${esc(r.route.label)}</p>
          <p class="summary">
            <strong>${r.summary.blocking}</strong> blocking ·
            <strong>${r.summary.advisory}</strong> advisory ·
            ${r.summary.passes} passes ·
            ${r.summary.incomplete} incomplete
          </p>
        </header>
        ${violations || `<p class="ok">No violations 🎉</p>`}
      </section>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>axe-core a11y report — ${reports.length} routes</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
  body { margin: 0; padding: 2rem; max-width: 1100px; margin-inline: auto; line-height: 1.5; }
  h1 { margin-top: 0; }
  .totals { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
  .totals div { padding: .75rem 1rem; border-radius: .5rem; background: #f3f4f6; }
  .totals strong { display: block; font-size: 1.5rem; }
  .route { border: 1px solid #e5e7eb; border-radius: .75rem; padding: 1rem 1.25rem; margin-bottom: 1rem; background: #fff; }
  .route header { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem 1rem; }
  .route h2 { margin: 0; font-size: 1rem; }
  .route .label { color: #6b7280; margin: 0; flex-basis: 100%; }
  .route .summary { margin: .25rem 0 .5rem; color: #374151; flex-basis: 100%; }
  .status, .badge, .profile { color: #fff; padding: .15rem .55rem; border-radius: 999px; font-size: .75rem; font-weight: 600; letter-spacing: .02em; }
  .profile { background: #1f2937; text-transform: uppercase; }
  .v { border-top: 1px dashed #e5e7eb; padding: .5rem 0; }
  .v summary { cursor: pointer; }
  .v code { background: #f3f4f6; padding: 0 .25rem; border-radius: .25rem; }
  .v .count { color: #6b7280; }
  .v .doclink { margin-left: .5rem; font-size: .75rem; }
  .v pre { background: #0f172a; color: #e2e8f0; padding: .5rem .75rem; border-radius: .5rem; overflow-x: auto; font-size: .8rem; }
  .v pre.html { background: #f1f5f9; color: #0f172a; }
  .ok { color: #166534; margin: .5rem 0 0; }
  @media (prefers-color-scheme: dark) {
    body { background: #0b0f14; color: #e5e7eb; }
    .route { background: #0f172a; border-color: #1f2937; }
    .totals div { background: #1f2937; }
    .v pre.html { background: #1f2937; color: #e5e7eb; }
  }
</style>
</head>
<body>
  <h1>axe-core accessibility report</h1>
  <p><small>Generated ${new Date().toISOString()} · ${reports.length} route runs</small></p>
  <div class="totals">
    <div><strong>${totals.blocking}</strong> blocking (serious/critical)</div>
    <div><strong>${totals.advisory}</strong> advisory (minor/moderate)</div>
    <div><strong>${totals.violations}</strong> total violations</div>
    <div><strong>${totals.passes}</strong> passing rules (sum)</div>
  </div>
  ${rows}
</body>
</html>`;

writeFileSync(resolve(DIR, "index.html"), html);
console.log(`[a11y-report] wrote ${resolve(DIR, "index.html")} (${reports.length} routes, ${totals.blocking} blocking, ${totals.advisory} advisory)`);
