import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadA11yConfig, classifyViolation } from "./a11y-config";

const REPORT_DIR = resolve(process.cwd(), "a11y-report");
mkdirSync(REPORT_DIR, { recursive: true });

function slugify(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "root";
}


/**
 * Automated a11y regression suite driven by axe-core.
 *
 * Rule policy lives in tests/e2e/a11y-config.json (schema next to it) so
 * whitelisting/blacklisting individual axe rules never requires touching this
 * file. Layered configuration:
 *
 *   1. tests/e2e/a11y-config.json          — committed defaults
 *   2. $A11Y_CONFIG (path to JSON)         — per-run override file
 *   3. $AXE_CRITICAL_RULES / _WARNING_RULES / _DISABLED_RULES (CSV env vars)
 *   4. $AXE_STRICT=1                       — promote minor+moderate to failing
 *
 * See classifyViolation() for precedence.
 */

const A11Y_CFG = loadA11yConfig();


type Route = { path: string; label: string };

const ROUTES: Route[] = [
  // Top-level
  { path: "/", label: "Home" },
  { path: "/o-nas", label: "About / clinic info" },
  { path: "/kontakt", label: "Contact / clinic locations" },
  { path: "/cennik", label: "Pricing" },
  { path: "/wspolpraca", label: "B2B cooperation" },
  { path: "/dla-pacjenta", label: "For patient hub" },

  // Hubs
  { path: "/leczenie/flebologia", label: "Phlebology hub" },
  { path: "/leczenie/proktologia", label: "Proctology hub" },

  // Phlebology procedures
  { path: "/leczenie/evlt", label: "EVLT" },
  { path: "/leczenie/clacs", label: "CLaCS" },
  { path: "/leczenie/skleroterapia", label: "Sclerotherapy" },
  { path: "/leczenie/mikroflebektomia", label: "Microphlebectomy" },
  { path: "/leczenie/fototerapia", label: "Phototherapy (PBM)" },

  // Proctology procedures
  { path: "/leczenie/lhp", label: "LHP hemorrhoids" },
  { path: "/leczenie/filac", label: "FiLaC fistulas" },
  { path: "/leczenie/silac", label: "SiLaC pilonidal sinus" },
  { path: "/leczenie/szczelina", label: "Anal fissure" },
  { path: "/leczenie/plastyka", label: "Anal plasty" },
  { path: "/leczenie/anusitis", label: "Anusitis" },
  { path: "/leczenie/spazm-lonowoodbytniczy", label: "Puborectalis spasm" },

  // Gynecomastia
  { path: "/leczenie/ginekomastia", label: "Gynecomastia hub" },
  { path: "/leczenie/ginekomastia-gruczolowa", label: "Gynecomastia — glandular" },
  { path: "/leczenie/ginekomastia-tluszczowa", label: "Gynecomastia — fatty" },
  { path: "/leczenie/ginekomastia-mieszana", label: "Gynecomastia — mixed" },

  // Content / discovery
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
    .withTags(A11Y_CFG.tags)
    .disableRules(A11Y_CFG.disabledRules)
    .analyze();

  const blocking = results.violations.filter(
    (v) => classifyViolation(v.id, v.impact, A11Y_CFG) === "blocking",
  );
  const advisory = results.violations.filter(
    (v) => classifyViolation(v.id, v.impact, A11Y_CFG) === "advisory",
  );

  if (advisory.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[axe] ${route.label} (${route.path}) — ${advisory.length} advisory finding(s):\n` +
        advisory
          .map(
            (v) =>
              `  • [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))` +
              (A11Y_CFG.warningRules.includes(v.id) ? " [config: warning]" : ""),
          )
          .join("\n"),
    );
  }

  const formatted = blocking.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    forcedCritical: A11Y_CFG.criticalRules.includes(v.id),
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
    config: {
      tags: A11Y_CFG.tags,
      disabledRules: A11Y_CFG.disabledRules,
      criticalRules: A11Y_CFG.criticalRules,
      warningRules: A11Y_CFG.warningRules,
      failImpacts: A11Y_CFG.failImpacts,
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

