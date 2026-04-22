import { describe, it, expect } from "vitest";
import {
  type FocusPrefs,
  type FocusPrefsByVariant,
  sanitizeFocusPrefs,
  sanitizeFocusPrefsByVariant,
  exportFocusPrefsToJson,
  importFocusPrefsFromJson,
  encodeFocusPrefsToFragment,
  decodeFocusPrefsFromFragment,
  extractFocusPrefsFromHash,
  buildFocusPrefsShareUrl,
  getDefaultFocusPrefsByVariant,
} from "./focusPrefsSerialization";

const SAMPLE_PREFS: FocusPrefs = {
  afterglowMs: 3200,
  ringWidthPx: 4,
  glowIntensity: 75,
};

const SAMPLE: FocusPrefsByVariant = {
  light: { afterglowMs: 1800, ringWidthPx: 2, glowIntensity: 45 },
  dark: { afterglowMs: 2800, ringWidthPx: 3, glowIntensity: 65 },
  hc: { afterglowMs: 4200, ringWidthPx: 5, glowIntensity: 90 },
};

describe("focusPrefsSerialization — sanitizeFocusPrefs (single)", () => {
  it("clampuje wartości spoza zakresów do min/max", () => {
    const out = sanitizeFocusPrefs({
      afterglowMs: 99999,
      ringWidthPx: -10,
      glowIntensity: 250,
    });
    expect(out).toEqual({ afterglowMs: 6000, ringWidthPx: 1, glowIntensity: 100 });
  });

  it("używa defaultów dla brakujących/NaN/string-nie-liczbowych pól", () => {
    const out = sanitizeFocusPrefs({ afterglowMs: "not-a-number" });
    expect(out).toEqual({ afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 55 });
  });

  it("zwraca defaulty dla null/undefined/non-object", () => {
    expect(sanitizeFocusPrefs(null)).toEqual({ afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 55 });
    expect(sanitizeFocusPrefs(undefined)).toEqual({ afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 55 });
    expect(sanitizeFocusPrefs("string")).toEqual({ afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 55 });
  });

  it("akceptuje custom fallback (per-variant defaults)", () => {
    const out = sanitizeFocusPrefs({}, { afterglowMs: 5000, ringWidthPx: 3, glowIntensity: 90 });
    expect(out).toEqual({ afterglowMs: 5000, ringWidthPx: 3, glowIntensity: 90 });
  });
});

describe("focusPrefsSerialization — sanitizeFocusPrefsByVariant (per-variant)", () => {
  it("zwraca pełne defaults dla null/undefined/non-object", () => {
    const defaults = getDefaultFocusPrefsByVariant();
    expect(sanitizeFocusPrefsByVariant(null)).toEqual(defaults);
    expect(sanitizeFocusPrefsByVariant(undefined)).toEqual(defaults);
    expect(sanitizeFocusPrefsByVariant(42)).toEqual(defaults);
  });

  it("legacy v1 (pojedynczy obiekt prefs) replikuje wartości do wszystkich 3 wariantów", () => {
    const legacy = { afterglowMs: 1500, ringWidthPx: 3, glowIntensity: 40 };
    const out = sanitizeFocusPrefsByVariant(legacy);
    expect(out.light).toEqual(legacy);
    expect(out.dark).toEqual(legacy);
    expect(out.hc).toEqual(legacy);
  });

  it("v2 z pełnymi 3 wariantami zachowuje wszystkie osobno", () => {
    const out = sanitizeFocusPrefsByVariant(SAMPLE);
    expect(out).toEqual(SAMPLE);
  });

  it("v2 z brakującymi wariantami uzupełnia defaultami per-variant", () => {
    const partial = { dark: { afterglowMs: 5000, ringWidthPx: 3, glowIntensity: 70 } };
    const out = sanitizeFocusPrefsByVariant(partial);
    expect(out.dark).toEqual(partial.dark);
    expect(out.light).toEqual({ afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 55 });
    // HC ma wyższe defaulty niż light/dark (a11y).
    expect(out.hc).toEqual({ afterglowMs: 3200, ringWidthPx: 4, glowIntensity: 80 });
  });

  it("HC default jest mocniejszy niż light/dark (grubszy ring + dłuższy afterglow + mocniejszy glow)", () => {
    const defaults = getDefaultFocusPrefsByVariant();
    expect(defaults.hc.ringWidthPx).toBeGreaterThan(defaults.light.ringWidthPx);
    expect(defaults.hc.afterglowMs).toBeGreaterThan(defaults.light.afterglowMs);
    expect(defaults.hc.glowIntensity).toBeGreaterThan(defaults.light.glowIntensity);
  });

  it("clampuje wartości out-of-range w każdym wariancie niezależnie", () => {
    const malicious = {
      light: { afterglowMs: 100 }, // poniżej min 800
      dark: { ringWidthPx: 999 }, // powyżej max 6
      hc: { glowIntensity: -50 }, // poniżej min 0
    };
    const out = sanitizeFocusPrefsByVariant(malicious);
    expect(out.light.afterglowMs).toBe(800);
    expect(out.dark.ringWidthPx).toBe(6);
    expect(out.hc.glowIntensity).toBe(0);
  });
});

describe("focusPrefsSerialization — JSON export/import (v2)", () => {
  it("eksport zawiera version=2, exportedAt ISO i variants", () => {
    const json = exportFocusPrefsToJson(SAMPLE, new Date("2026-01-15T10:00:00Z"));
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(2);
    expect(parsed.exportedAt).toBe("2026-01-15T10:00:00.000Z");
    expect(parsed.variants).toEqual(SAMPLE);
  });

  it("round-trip JSON v2: export → import zwraca te same prefs per variant", () => {
    const json = exportFocusPrefsToJson(SAMPLE);
    expect(importFocusPrefsFromJson(json)).toEqual(SAMPLE);
  });

  it("import akceptuje legacy v1 (single prefs) i replikuje do 3 wariantów", () => {
    const v1 = JSON.stringify({
      version: 1,
      exportedAt: "2026-01-01T00:00:00Z",
      prefs: SAMPLE_PREFS,
    });
    const out = importFocusPrefsFromJson(v1);
    expect(out.light).toEqual(SAMPLE_PREFS);
    expect(out.dark).toEqual(SAMPLE_PREFS);
    expect(out.hc).toEqual(SAMPLE_PREFS);
  });

  it("import akceptuje legacy plain object (bez version/wrappera)", () => {
    const plain = JSON.stringify(SAMPLE_PREFS);
    const out = importFocusPrefsFromJson(plain);
    expect(out.light).toEqual(SAMPLE_PREFS);
    expect(out.dark).toEqual(SAMPLE_PREFS);
    expect(out.hc).toEqual(SAMPLE_PREFS);
  });

  it("import sanityzuje wartości w każdym wariancie (np. hc.ringWidth=999 → 6)", () => {
    const malicious = JSON.stringify({
      version: 2,
      exportedAt: "2026-01-01T00:00:00Z",
      variants: {
        light: { afterglowMs: -1, ringWidthPx: 2, glowIntensity: 50 },
        dark: { afterglowMs: 2400, ringWidthPx: 999, glowIntensity: 50 },
        hc: { afterglowMs: 99999, ringWidthPx: 4, glowIntensity: 50 },
      },
    });
    const out = importFocusPrefsFromJson(malicious);
    expect(out.light.afterglowMs).toBe(800);
    expect(out.dark.ringWidthPx).toBe(6);
    expect(out.hc.afterglowMs).toBe(6000);
  });

  it("import rzuca dla niepoprawnego JSON", () => {
    expect(() => importFocusPrefsFromJson("{not json")).toThrow();
  });
});

describe("focusPrefsSerialization — URL fragment (base64url)", () => {
  it("encode → decode round-trip zwraca te same prefs per-variant", () => {
    const encoded = encodeFocusPrefsToFragment(SAMPLE);
    expect(decodeFocusPrefsFromFragment(encoded)).toEqual(SAMPLE);
  });

  it("encoded fragment jest URL-safe (bez =, +, /)", () => {
    const encoded = encodeFocusPrefsToFragment(SAMPLE);
    expect(encoded).not.toMatch(/[=+/]/);
  });

  it("compact format daje krótszy fragment niż verbose JSON", () => {
    // Compact { v:2, l:[a,r,g], d:[…], h:[…] } powinno być wyraźnie krótsze
    // niż { light: {afterglowMs:…, ringWidthPx:…, glowIntensity:…}, … }.
    const encoded = encodeFocusPrefsToFragment(SAMPLE);
    const verbose = btoa(JSON.stringify({ version: 2, variants: SAMPLE }));
    expect(encoded.length).toBeLessThan(verbose.length);
  });

  it("decode zwraca defaults dla niepoprawnego base64/JSON", () => {
    expect(decodeFocusPrefsFromFragment("!!!not-base64!!!")).toBeNull();
    expect(decodeFocusPrefsFromFragment("Y29ycnVwdGVkLWpzb24")).toBeNull();
  });

  it("decode sanityzuje wartości z fragmentu (atak przez ręczny URL)", () => {
    // Spreparowany compact fragment z out-of-range glowIntensity=500 dla HC.
    const malicious = encodeFocusPrefsToFragment({
      light: SAMPLE.light,
      dark: SAMPLE.dark,
      hc: { afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 500 as unknown as number },
    });
    const decoded = decodeFocusPrefsFromFragment(malicious);
    expect(decoded?.hc.glowIntensity).toBe(100);
  });

  it("decode akceptuje legacy v1 fragment (replikuje do 3 wariantów)", () => {
    // Stary link wygenerowany przez v1 = czysty obiekt FocusPrefs w base64.
    const legacyEncoded = btoa(JSON.stringify(SAMPLE_PREFS))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = decodeFocusPrefsFromFragment(legacyEncoded);
    expect(decoded?.light).toEqual(SAMPLE_PREFS);
    expect(decoded?.dark).toEqual(SAMPLE_PREFS);
    expect(decoded?.hc).toEqual(SAMPLE_PREFS);
  });
});

describe("focusPrefsSerialization — extractFocusPrefsFromHash", () => {
  it("ekstraktuje z samodzielnego #focus-prefs=...", () => {
    const encoded = encodeFocusPrefsToFragment(SAMPLE);
    expect(extractFocusPrefsFromHash(`#focus-prefs=${encoded}`)).toEqual(SAMPLE);
  });

  it("ekstraktuje z połączonego hasha #other=1&focus-prefs=...", () => {
    const encoded = encodeFocusPrefsToFragment(SAMPLE);
    expect(extractFocusPrefsFromHash(`#other=1&focus-prefs=${encoded}`)).toEqual(SAMPLE);
  });

  it("zwraca null dla pustego hasha lub bez klucza focus-prefs", () => {
    expect(extractFocusPrefsFromHash("")).toBeNull();
    expect(extractFocusPrefsFromHash("#section-id")).toBeNull();
    expect(extractFocusPrefsFromHash("#x=1&y=2")).toBeNull();
  });

  it("zwraca null gdy klucz jest, ale wartość uszkodzona", () => {
    expect(extractFocusPrefsFromHash("#focus-prefs=garbage!!!")).toBeNull();
  });
});

describe("focusPrefsSerialization — buildFocusPrefsShareUrl", () => {
  it("zachowuje path+search i nadpisuje istniejący hash", () => {
    const url = buildFocusPrefsShareUrl(SAMPLE, "https://example.com/admin?tab=2#old-hash");
    expect(url).toMatch(/^https:\/\/example\.com\/admin\?tab=2#focus-prefs=/);
    expect(url).not.toContain("old-hash");
  });

  it("dokleja fragment do URL bez wcześniejszego hasha", () => {
    const url = buildFocusPrefsShareUrl(SAMPLE, "https://example.com/admin");
    expect(url).toMatch(/^https:\/\/example\.com\/admin#focus-prefs=/);
    const hash = url.slice(url.indexOf("#"));
    expect(extractFocusPrefsFromHash(hash)).toEqual(SAMPLE);
  });
});
