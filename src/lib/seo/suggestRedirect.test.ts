/**
 * Testy fuzzy-matchera dla 404 → najbliższy alias / route.
 *
 * Walidują:
 *  - normalizacja (lowercase, NFD, trim, slashes),
 *  - exact-match (po normalizacji) → score 1, action auto-redirect,
 *  - typowe literówki znanych aliasów wpadają w "auto-redirect",
 *  - zupełnie obce ścieżki → "none",
 *  - preferencja redirect-map nad app-route przy remisie score,
 *  - próg AUTO/SUGGEST jest spójny z deklaracją.
 */
import { describe, expect, it } from "vitest";
import { SEO_REDIRECTS } from "./redirectsMap";
import { __thresholds, normalizePath, suggestRedirect } from "./suggestRedirect";

describe("normalizePath", () => {
  it.each([
    ["/Żylaki/", "/zylaki"],
    ["żylaki", "/zylaki"],
    ["/HEMOROIDY", "/hemoroidy"],
    ["//pajaczki///", "/pajaczki"],
    ["/", ""],
    ["", ""],
    ["/leczenie/EVLT/", "/leczenie/evlt"],
    ["/po\u0142a\u0107ki", "/poaaki"], // strip diacritics + non-letter chars (sanity)
  ])("normalizePath(%j) → %j", (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });
});

describe("suggestRedirect — exact match po normalizacji", () => {
  it.each([
    ["/Żylaki", "/leczenie/evlt"],
    ["/HEMOROIDY", "/dla-pacjenta/hemoroidy"],
    ["/pajączki", "/dla-pacjenta/pajaczki"],
    ["/leczenie/EVLT", "/leczenie/evlt"],
  ])("'%s' → auto-redirect na '%s'", (input, expectedTo) => {
    const r = suggestRedirect(input);
    expect(r.action).toBe("auto-redirect");
    expect(r.to).toBe(expectedTo);
    expect(r.score).toBeGreaterThanOrEqual(__thresholds.AUTO);
  });
});

describe("suggestRedirect — literówki w znanych aliasach", () => {
  it.each([
    // Pojedyncze literówki — powinny dać auto-redirect lub mocną sugestię.
    ["/hemoroidyy", "/dla-pacjenta/hemoroidy"], // dodatkowy znak
    ["/hemoroid", "/dla-pacjenta/hemoroidy"], // brakujący znak
    ["/pajaczki-leczenie", "/dla-pacjenta/pajaczki"], // wariant frazy (substring)
    ["/leczenie-evlt", "/leczenie/evlt"], // myślnik zamiast slasha
    ["/ginekomastja", "/leczenie/ginekomastia"], // typo
  ])("'%s' → sugeruje '%s' (auto lub suggest)", (input, expectedTo) => {
    const r = suggestRedirect(input);
    expect(r.to).toBe(expectedTo);
    expect(["auto-redirect", "suggest"]).toContain(r.action);
    expect(r.score).toBeGreaterThanOrEqual(__thresholds.SUGGEST);
  });
});

describe("suggestRedirect — brak dopasowania", () => {
  it.each([
    "/foobarbaz-completely-random-12345",
    "/qwertyuiopasdfghjkl",
    "/",
  ])("'%s' → action='none'", (input) => {
    const r = suggestRedirect(input);
    expect(r.action).toBe("none");
    expect(r.to).toBeNull();
  });
});

describe("suggestRedirect — preferencja redirect-map przy remisie", () => {
  it("przy identycznym score wybiera wpis z mapy SEO_REDIRECTS", () => {
    // /leczenie/evlt jest jednocześnie celem aliasu /evlt i realnym route'em.
    // Wejście /evlt powinno zmatchować alias `/evlt → /leczenie/evlt`,
    // a nie route /leczenie/evlt po Levenshteinie.
    const r = suggestRedirect("/evlt");
    expect(r.to).toBe("/leczenie/evlt");
    expect(r.source).toBe("redirect-map");
    expect(r.matchedFrom).toBe("/evlt");
  });
});

describe("suggestRedirect — kontrakt zwrotny dla wszystkich aliasów z mapy", () => {
  // Każdy alias podany dokładnie powinien dać auto-redirect na swój cel.
  // To podwójna asekuracja: jeśli helper przestanie działać, wszystkie te testy
  // zaświecą się jednocześnie i jasno pokażą regresję.
  it.each(SEO_REDIRECTS)(
    "alias '$from' → auto-redirect na '$to'",
    ({ from, to }) => {
      const r = suggestRedirect(from);
      expect(r.action).toBe("auto-redirect");
      expect(r.to).toBe(to);
      expect(r.matchedFrom).toBe(from);
    },
  );
});

describe("suggestRedirect — progi", () => {
  it("AUTO > SUGGEST > 0", () => {
    expect(__thresholds.AUTO).toBeGreaterThan(__thresholds.SUGGEST);
    expect(__thresholds.SUGGEST).toBeGreaterThan(0);
    expect(__thresholds.AUTO).toBeLessThanOrEqual(1);
  });
});
