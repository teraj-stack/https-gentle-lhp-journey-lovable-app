import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEO_REDIRECTS } from "@/lib/seo/redirectsMap";

/**
 * Sitemap & robots — guard przed regresją SEO.
 *
 * Reguły:
 *  1. Sitemap NIE może zawierać żadnego `from` z SEO_REDIRECTS (to są aliasy, nie kanoniczne URL-e).
 *  2. Sitemap NIE może zawierać ścieżek admin/dev/jednorazowych (booking-action, unsubscribe, reminder-opt-out).
 *  3. robots.txt MUSI mieć `Disallow:` dla /admin/ i /dev/ pod User-agent: *.
 *  4. robots.txt MUSI deklarować przynajmniej jeden Sitemap.
 */

const ROOT = resolve(__dirname, "../../..");
const SITEMAP = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");
const ROBOTS = readFileSync(resolve(ROOT, "public/robots.txt"), "utf-8");

const SITEMAP_URLS: string[] = (() => {
  const urls: string[] = [];
  const re = /<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(SITEMAP)) !== null) urls.push(m[1] === "" ? "/" : m[1]);
  return urls;
})();

describe("sitemap.xml — integralność z SEO_REDIRECTS", () => {
  it("zawiera jakiekolwiek URL-e (sanity check parsera)", () => {
    expect(SITEMAP_URLS.length).toBeGreaterThan(10);
    expect(SITEMAP_URLS).toContain("/");
  });

  it("nie zawiera żadnego aliasu z SEO_REDIRECTS jako kanonicznego URL-a", () => {
    const redirectFroms = new Set(SEO_REDIRECTS.map((e) => e.from));
    const leaked = SITEMAP_URLS.filter((u) => redirectFroms.has(u));
    expect(
      leaked,
      `Te aliasy NIE powinny być w sitemap (są w redirectsMap jako 'from'): ${leaked.join(", ")}`
    ).toEqual([]);
  });

  it("nie zawiera ścieżek admin/dev ani jednorazowych akcji z e-maili", () => {
    const forbiddenPrefixes = ["/admin", "/dev/"];
    const forbiddenExact = ["/booking-action", "/unsubscribe", "/reminder-opt-out"];
    const leaked = SITEMAP_URLS.filter(
      (u) => forbiddenPrefixes.some((p) => u.startsWith(p)) || forbiddenExact.includes(u)
    );
    expect(leaked).toEqual([]);
  });
});

describe("robots.txt — polityka indeksowania", () => {
  it("blokuje /admin/ i /dev/ dla User-agent: *", () => {
    // Wyciągnij blok dla "User-agent: *"
    const wildcardBlock = ROBOTS.split(/^User-agent:\s*/m)
      .find((b) => b.startsWith("*"))
      ?.split(/^User-agent:/m)[0] ?? "";
    expect(wildcardBlock).toMatch(/Disallow:\s*\/admin\//);
    expect(wildcardBlock).toMatch(/Disallow:\s*\/dev\//);
  });

  it("deklaruje co najmniej jeden Sitemap", () => {
    expect(ROBOTS).toMatch(/^Sitemap:\s*https?:\/\/.+/m);
  });

  it("blokuje aliasy /hemoroidy, /pajaczki, /zylaki dla Googlebota (crawl budget)", () => {
    const googleBlock = ROBOTS.split(/^User-agent:\s*/m)
      .find((b) => b.startsWith("Googlebot"))
      ?.split(/^User-agent:/m)[0] ?? "";
    expect(googleBlock).toMatch(/Disallow:\s*\/hemoroidy\$/);
    expect(googleBlock).toMatch(/Disallow:\s*\/pajaczki\$/);
    expect(googleBlock).toMatch(/Disallow:\s*\/zylaki\$/);
  });
});
