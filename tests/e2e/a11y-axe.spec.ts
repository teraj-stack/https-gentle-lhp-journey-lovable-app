import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPORT_DIR = resolve(process.cwd(), "a11y-report");
mkdirSync(REPORT_DIR, { recursive: true });

function slugify(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "root";
}


/**
 * Automated a11y regression suite driven by axe-core.
 *
 * Scope: WCAG 2.0/2.1 A + AA rules on the key public routes. We intentionally
 * disable `color-contrast` because axe evaluates gradients/tokens differently
 * than Lighthouse (already covered by the Lighthouse CI accessibility budget)
 * and would produce noisy false positives against our design-system tokens.
 *
 * Any *serious* or *critical* violation fails the build. Minor/moderate
 * findings are printed to the console for triage but don't fail — flip
 * AXE_STRICT=1 to fail on those too.
 */

const STRICT = process.env.AXE_STRICT === "1";
const FAIL_IMPACTS = STRICT
  ? new Set(["minor", "moderate", "serious", "critical"])
  : new Set(["serious", "critical"]);

type Route = { path: string; label: string };

const ROUTES: Route[] = [
  { path: "/", label: "Home" },
  { path: "/kontakt", label: "Contact / clinic locations" },
  { path: "/o-nas", label: "About / clinic info" },
  { path: "/leczenie/flebologia", label: "Phlebology hub" },
  { path: "/leczenie/proktologia", label: "Proctology hub" },
  { path: "/blog", label: "Blog index" },
  { path: "/blog/jak-rozpoznac-hemoroidy", label: "Blog post" },
  { path: "/szukaj", label: "Search (empty)" },
  { path: "/szukaj?q=hemoroidy", label: "Search (with query)" },
];


async function runAxe(page: Page, route: Route, profile: "desktop" | "mobile" = "desktop") {
  await page.goto(route.path, { waitUntil: "networkidle" });
  // Give framer-motion entry animations a beat so DOM is settled.
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(300);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules([
      // Axe evaluates gradients/design-tokens differently than Lighthouse;
      // Lighthouse CI already gates contrast at 0.95 on the built app.
      "color-contrast",
      // Radix UI + React 18 useId() emit IDs like `:r4:` which are valid
      // per HTML5 but axe-core (4.12.x) still flags them via aria-controls.
      // Tracked upstream; not a real user-facing issue.
      "aria-valid-attr-value",
    ])
    .analyze();


  const blocking = results.violations.filter((v) => FAIL_IMPACTS.has(v.impact ?? ""));
  const advisory = results.violations.filter((v) => !FAIL_IMPACTS.has(v.impact ?? ""));

  if (advisory.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[axe] ${route.label} (${route.path}) — ${advisory.length} advisory finding(s):\n` +
        advisory.map((v) => `  • [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`).join("\n"),
    );
  }

  const formatted = blocking.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({ target: n.target, failureSummary: n.failureSummary })),
  }));

  // Persist full axe results (all violations, incl. advisory + passes count) for CI artifacts.
  const reportSlug = `${profile}-${slugify(route.path)}`;
  const payload = {
    profile,
    route: { path: route.path, label: route.label },
    url: page.url(),
    timestamp: new Date().toISOString(),
    summary: {
      violations: results.violations.length,
      blocking: blocking.length,
      advisory: advisory.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
    },
    violations: results.violations,
    incomplete: results.incomplete,
  };
  writeFileSync(resolve(REPORT_DIR, `${reportSlug}.json`), JSON.stringify(payload, null, 2));

  expect(formatted, `Accessibility violations on ${route.label} (${route.path})`).toEqual([]);
}


test.describe("axe-core a11y — public routes (desktop)", () => {
  for (const route of ROUTES) {
    test(`${route.label} (${route.path}) has no serious/critical a11y violations`, async ({ page }) => {
      await runAxe(page, route, "desktop");

    });
  }
});

/**
 * Mobile viewport profile — iPhone 13 dimensions (390×844, DPR 3), touch enabled.
 * Same axe ruleset as desktop; catches issues that only appear in the mobile
 * layout: burger menu, sticky CTA, collapsed nav, off-canvas drawers.
 */
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

test.describe("axe-core a11y — public routes (mobile 390×844)", () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  for (const route of ROUTES) {
    test(`[mobile] ${route.label} (${route.path}) has no serious/critical a11y violations`, async ({ page }) => {
      await runAxe(page, route, "mobile");
    });
  }
});

