import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
  { path: "/flebologia", label: "Phlebology hub" },
  { path: "/proktologia", label: "Proctology hub" },
  { path: "/blog", label: "Blog index" },
  { path: "/blog/jak-rozpoznac-hemoroidy", label: "Blog post" },
  { path: "/szukaj", label: "Search (empty)" },
  { path: "/szukaj?q=hemoroidy", label: "Search (with query)" },
];

async function runAxe(page: Page, route: Route) {
  await page.goto(route.path, { waitUntil: "networkidle" });
  // Give framer-motion entry animations a beat so DOM is settled.
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(300);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"])
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

  expect(formatted, `Accessibility violations on ${route.label} (${route.path})`).toEqual([]);
}

test.describe("axe-core a11y — public routes (desktop)", () => {
  for (const route of ROUTES) {
    test(`${route.label} (${route.path}) has no serious/critical a11y violations`, async ({ page }) => {
      await runAxe(page, route);
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
      await runAxe(page, route);
    });
  }
});

