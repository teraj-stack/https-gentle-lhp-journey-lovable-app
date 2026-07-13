import { test, expect, type Page } from "@playwright/test";

/**
 * Semantic structure audit — landmarks + heading hierarchy.
 *
 * axe-core already flags a few of these (`landmark-one-main`, `page-has-heading-one`,
 * `heading-order`) but silently for `moderate` impact by default. This spec makes
 * them hard requirements on every audited route, and asserts additional invariants:
 *
 *   1. Exactly one <main> landmark.
 *   2. Exactly one <h1>.
 *   3. Heading levels never skip downward (h1 → h3 is a fail; h3 → h2 is fine).
 *   4. A single top-level <header> and <footer> landmark.
 *
 * Route list is imported implicitly by mirroring tests/e2e/a11y-axe.spec.ts;
 * keep them in sync when adding new clinic-service pages.
 */

type Route = { path: string; label: string };

const ROUTES: Route[] = [
  { path: "/", label: "Home" },
  { path: "/o-nas", label: "About" },
  { path: "/kontakt", label: "Contact" },
  { path: "/cennik", label: "Pricing" },
  { path: "/wspolpraca", label: "B2B" },
  { path: "/dla-pacjenta", label: "For patient hub" },
  { path: "/leczenie/flebologia", label: "Phlebology hub" },
  { path: "/leczenie/proktologia", label: "Proctology hub" },
  { path: "/leczenie/evlt", label: "EVLT" },
  { path: "/leczenie/clacs", label: "CLaCS" },
  { path: "/leczenie/skleroterapia", label: "Sclerotherapy" },
  { path: "/leczenie/mikroflebektomia", label: "Microphlebectomy" },
  { path: "/leczenie/fototerapia", label: "Phototherapy" },
  { path: "/leczenie/lhp", label: "LHP" },
  { path: "/leczenie/filac", label: "FiLaC" },
  { path: "/leczenie/silac", label: "SiLaC" },
  { path: "/leczenie/szczelina", label: "Fissure" },
  { path: "/leczenie/plastyka", label: "Anal plasty" },
  { path: "/leczenie/anusitis", label: "Anusitis" },
  { path: "/leczenie/spazm-lonowoodbytniczy", label: "Puborectalis spasm" },
  { path: "/leczenie/ginekomastia", label: "Gynecomastia hub" },
  { path: "/leczenie/ginekomastia-gruczolowa", label: "Gynecomastia — glandular" },
  { path: "/leczenie/ginekomastia-tluszczowa", label: "Gynecomastia — fatty" },
  { path: "/leczenie/ginekomastia-mieszana", label: "Gynecomastia — mixed" },
  { path: "/blog", label: "Blog index" },
  { path: "/blog/jak-rozpoznac-hemoroidy", label: "Blog post" },
  { path: "/szukaj", label: "Search" },
];

async function auditStructure(page: Page, route: Route) {
  await page.goto(route.path, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const snapshot = await page.evaluate(() => {
    const mains = document.querySelectorAll("main");
    const headers = document.querySelectorAll("body > header, body > * > header");
    const footers = document.querySelectorAll("body > footer, body > * > footer");
    const h1s = document.querySelectorAll("h1");
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
      .filter((el) => {
        // Ignore visually-hidden headings only if they're display:none; sr-only headings
        // must still respect hierarchy since screen readers announce them.
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .map((el) => ({
        level: Number(el.tagName.substring(1)),
        text: (el.textContent || "").trim().slice(0, 80),
      }));
    return {
      mainCount: mains.length,
      h1Count: h1s.length,
      headerCount: headers.length,
      footerCount: footers.length,
      headings,
    };
  });

  // 1. Exactly one <main>.
  expect(snapshot.mainCount, `<main> count on ${route.path}`).toBe(1);

  // 2. Exactly one <h1>.
  expect(snapshot.h1Count, `<h1> count on ${route.path}`).toBe(1);

  // 3. No downward skips in heading levels.
  const skips: string[] = [];
  for (let i = 1; i < snapshot.headings.length; i++) {
    const prev = snapshot.headings[i - 1];
    const cur = snapshot.headings[i];
    if (cur.level > prev.level + 1) {
      skips.push(`h${prev.level} "${prev.text}" → h${cur.level} "${cur.text}"`);
    }
  }
  expect(skips, `Heading-level skips on ${route.path}`).toEqual([]);

  // 4. At most one top-level <header> and <footer>.
  expect(snapshot.headerCount, `<header> count on ${route.path}`).toBeLessThanOrEqual(1);
  expect(snapshot.footerCount, `<footer> count on ${route.path}`).toBeLessThanOrEqual(1);
}

test.describe("semantic structure — landmarks & heading hierarchy", () => {
  for (const route of ROUTES) {
    test(`${route.label} (${route.path})`, async ({ page }) => {
      await auditStructure(page, route);
    });
  }
});
