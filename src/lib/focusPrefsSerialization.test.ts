import { describe, it, expect } from "vitest";
import {
  type FocusPrefs,
  sanitizeFocusPrefs,
  exportFocusPrefsToJson,
  importFocusPrefsFromJson,
  encodeFocusPrefsToFragment,
  decodeFocusPrefsFromFragment,
  extractFocusPrefsFromHash,
  buildFocusPrefsShareUrl,
} from "./focusPrefsSerialization";

const SAMPLE: FocusPrefs = {
  afterglowMs: 3200,
  ringWidthPx: 4,
  glowIntensity: 75,
};

describe("focusPrefsSerialization — sanitize", () => {
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
});

describe("focusPrefsSerialization — JSON export/import", () => {
  it("eksport zawiera version=1, exportedAt ISO i prefs", () => {
    const json = exportFocusPrefsToJson(SAMPLE, new Date("2026-01-15T10:00:00Z"));
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe("2026-01-15T10:00:00.000Z");
    expect(parsed.prefs).toEqual(SAMPLE);
  });

  it("round-trip JSON: export → import zwraca te same prefs", () => {
    const json = exportFocusPrefsToJson(SAMPLE);
    expect(importFocusPrefsFromJson(json)).toEqual(SAMPLE);
  });

  it("import akceptuje legacy format bez version/exportedAt (czysty obiekt prefs)", () => {
    const legacy = JSON.stringify({ afterglowMs: 1500, ringWidthPx: 3, glowIntensity: 40 });
    expect(importFocusPrefsFromJson(legacy)).toEqual({
      afterglowMs: 1500,
      ringWidthPx: 3,
      glowIntensity: 40,
    });
  });

  it("import sanityzuje wartości z pliku (np. ringWidth=999 → 6)", () => {
    const malicious = JSON.stringify({
      version: 1,
      exportedAt: "2026-01-01T00:00:00Z",
      prefs: { afterglowMs: -1, ringWidthPx: 999, glowIntensity: 50 },
    });
    expect(importFocusPrefsFromJson(malicious)).toEqual({
      afterglowMs: 800,
      ringWidthPx: 6,
      glowIntensity: 50,
    });
  });

  it("import rzuca dla niepoprawnego JSON", () => {
    expect(() => importFocusPrefsFromJson("{not json")).toThrow();
  });
});

describe("focusPrefsSerialization — URL fragment (base64url)", () => {
  it("encode → decode round-trip zwraca te same prefs", () => {
    const encoded = encodeFocusPrefsToFragment(SAMPLE);
    expect(decodeFocusPrefsFromFragment(encoded)).toEqual(SAMPLE);
  });

  it("encoded fragment jest URL-safe (bez =, +, /)", () => {
    const encoded = encodeFocusPrefsToFragment(SAMPLE);
    expect(encoded).not.toMatch(/[=+/]/);
  });

  it("decode zwraca null dla niepoprawnego base64/JSON", () => {
    expect(decodeFocusPrefsFromFragment("!!!not-base64!!!")).toBeNull();
    expect(decodeFocusPrefsFromFragment("Y29ycnVwdGVkLWpzb24")).toBeNull(); // valid b64, invalid JSON
  });

  it("decode sanityzuje wartości z fragmentu (atak przez ręczny URL)", () => {
    // Fragment ręcznie spreparowany z out-of-range glowIntensity=500.
    const malicious = encodeFocusPrefsToFragment({
      afterglowMs: 2400,
      ringWidthPx: 2,
      glowIntensity: 500 as unknown as number,
    });
    const decoded = decodeFocusPrefsFromFragment(malicious);
    expect(decoded?.glowIntensity).toBe(100);
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
    // Round-trip: wyciągnij hash i zdekoduj → te same prefs.
    const hash = url.slice(url.indexOf("#"));
    expect(extractFocusPrefsFromHash(hash)).toEqual(SAMPLE);
  });
});
