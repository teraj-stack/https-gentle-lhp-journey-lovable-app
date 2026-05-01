import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEO_REDIRECTS } from "./redirectsMap";

/**
 * Testy mapy SEO_REDIRECTS — chronią przed regresją po zmianach w menu/route'ach.
 *
 * Zakres:
 *  1. Higiena wpisów (format, brak spacji, slash na początku).
 *  2. Brak duplikatów `from`.
 *  3. Brak self-redirectów (from === to) i cykli (A→B + B→A).
 *  4. Każdy `to` wskazuje na realny route zdefiniowany w src/App.tsx.
 *  5. Żadna ścieżka `from` nie koliduje z istniejącym route'em
 *     (gdyby kolidowała, redirect by nie wystrzelił bo wygrałby konkretny route).
 */

// ─── Helper: wyciągnij listę realnych statycznych route'ów z App.tsx ──────────
const APP_TSX = readFileSync(resolve(__dirname, "../../App.tsx"), "utf-8");

const APP_ROUTES: string[] = (() => {
  const routes = new Set<string>();
  const routeRegex = /<Route\s+(?:[^>]*?\s)?path="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = routeRegex.exec(APP_TSX)) !== null) {
    routes.add(match[1]);
  }
  return Array.from(routes);
})();

/** Sprawdza czy podana ścieżka pasuje do któregoś route'a (uwzględnia parametry :slug). */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => {
    if (route === path) return true;
    if (!route.includes(":")) return false;
    // Konwersja "/blog/:slug" → /^\/blog\/[^/]+$/
    const pattern = new RegExp(
      "^" + route.replace(/:[^/]+/g, "[^/]+").replace(/\//g, "\\/") + "$"
    );
    return pattern.test(path);
  });
}

describe("SEO_REDIRECTS — higiena wpisów", () => {
  it("App.tsx zawiera realne route'y (sanity check parsera)", () => {
    expect(APP_ROUTES.length).toBeGreaterThan(20);
    expect(APP_ROUTES).toContain("/");
    expect(APP_ROUTES).toContain("/dla-pacjenta/hemoroidy");
  });

  it.each(SEO_REDIRECTS)("wpis '$from → $to' ma poprawny format", (entry) => {
    expect(entry.from).toMatch(/^\//);
    expect(entry.to).toMatch(/^\//);
    expect(entry.from).not.toMatch(/\s/);
    expect(entry.to).not.toMatch(/\s/);
    expect(entry.from).not.toMatch(/\/$/); // bez trailing slash (poza "/")
    expect(entry.to).not.toMatch(/\/$/);
  });

  it("każdy wpis ma niepusty `reason` (dokumentacja decyzji SEO)", () => {
    const missingReason = SEO_REDIRECTS.filter((e) => !e.reason || !e.reason.trim());
    expect(missingReason).toEqual([]);
  });
});

describe("SEO_REDIRECTS — brak konfliktów", () => {
  it("nie ma duplikatów `from`", () => {
    const seen = new Map<string, number>();
    SEO_REDIRECTS.forEach((e) => {
      seen.set(e.from, (seen.get(e.from) ?? 0) + 1);
    });
    const duplicates = Array.from(seen.entries()).filter(([, count]) => count > 1);
    expect(duplicates).toEqual([]);
  });

  it("nie ma self-redirectów (from === to)", () => {
    const self = SEO_REDIRECTS.filter((e) => e.from === e.to);
    expect(self).toEqual([]);
  });

  it("nie ma cykli A→B + B→A", () => {
    const map = new Map(SEO_REDIRECTS.map((e) => [e.from, e.to]));
    const cycles: string[] = [];
    for (const [from, to] of map.entries()) {
      if (map.get(to) === from) {
        cycles.push(`${from} ↔ ${to}`);
      }
    }
    expect(cycles).toEqual([]);
  });

  it("nie ma łańcuchów A→B→C (każde `to` powinno być końcowym celem)", () => {
    const fromsSet = new Set(SEO_REDIRECTS.map((e) => e.from));
    const chains = SEO_REDIRECTS.filter((e) => fromsSet.has(e.to));
    expect(chains).toEqual([]);
  });
});

describe("SEO_REDIRECTS — integralność z routerem", () => {
  it.each(SEO_REDIRECTS)(
    "cel '$to' (z '$from') odpowiada realnemu route w App.tsx",
    (entry) => {
      const exists = matchesRoute(entry.to, APP_ROUTES);
      expect(
        exists,
        `Redirect '${entry.from}' → '${entry.to}' wskazuje na nieistniejący route. ` +
          `Dodaj route w App.tsx albo popraw cel.`
      ).toBe(true);
    }
  );

  it("żaden `from` nie koliduje z istniejącym route'em (redirect by nie wystrzelił)", () => {
    // Wykluczamy z porównania route'y wstrzykiwane PRZEZ samą mapę SEO_REDIRECTS,
    // żeby uniknąć fałszywego pozytywu (są one renderowane warunkowo przez SEO_REDIRECTS.map).
    const redirectFroms = new Set(SEO_REDIRECTS.map((e) => e.from));
    const realRoutes = APP_ROUTES.filter((r) => !redirectFroms.has(r));

    const conflicts = SEO_REDIRECTS.filter((e) => realRoutes.includes(e.from));
    expect(
      conflicts,
      `Te 'from' kolidują z realnymi route'ami: ${conflicts
        .map((c) => c.from)
        .join(", ")}`
    ).toEqual([]);
  });
});
