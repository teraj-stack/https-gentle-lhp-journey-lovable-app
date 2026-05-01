import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SeoRedirect from "./SeoRedirect";

/**
 * Testy DOM-side dla SeoRedirect.
 *
 * Sprawdzane gwarancje:
 *   - canonical absolutny + na cel,
 *   - meta refresh 0s + na cel,
 *   - noindex w 3 wariantach (robots, googlebot, bingbot) z noarchive,
 *   - og:url i twitter:url przepięte na cel,
 *   - cleanup po unmount (żaden tag nie wycieka),
 *   - obrona przed self-redirect (from === to → no-op + warning).
 */

const TARGET = "/dla-pacjenta/hemoroidy";
const SOURCE = "/hemoroidy";
const ABSOLUTE_TARGET = `https://bestcml.io${TARGET}`;

function renderRedirect(from = SOURCE, to = TARGET) {
  // CELOWO bez Route dla `to` — chcemy żeby SeoRedirect pozostał zamontowany
  // (Navigate nie znajdzie celu, ale tagi w head już zostały zapisane synchronicznie).
  return render(
    <MemoryRouter initialEntries={[from]}>
      <Routes>
        <Route path={from} element={<SeoRedirect to={to} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("SeoRedirect — manipulacja <head>", () => {
  beforeEach(() => {
    // Wyczyść <head> ze śladów po poprzednich testach (jsdom dzieli document)
    document.head
      .querySelectorAll(
        'link[rel="canonical"], meta[http-equiv="refresh"], meta[name="robots"], meta[name="googlebot"], meta[name="bingbot"], meta[property="og:url"], meta[name="twitter:url"]'
      )
      .forEach((el) => el.remove());
  });

  afterEach(() => {
    cleanup();
  });

  it("ustawia canonical na absolutny URL celu", () => {
    renderRedirect();
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical?.getAttribute("href")).toBe(ABSOLUTE_TARGET);
  });

  it("ustawia meta refresh 0s na absolutny URL celu", () => {
    renderRedirect();
    const refresh = document.head.querySelector('meta[http-equiv="refresh"]');
    expect(refresh).not.toBeNull();
    expect(refresh?.getAttribute("content")).toBe(`0;url=${ABSOLUTE_TARGET}`);
  });

  it.each([
    ['meta[name="robots"]', "robots"],
    ['meta[name="googlebot"]', "googlebot"],
    ['meta[name="bingbot"]', "bingbot"],
  ])("ustawia noindex+follow+noarchive na %s", (selector) => {
    renderRedirect();
    const meta = document.head.querySelector(selector);
    expect(meta).not.toBeNull();
    const content = meta?.getAttribute("content") ?? "";
    expect(content).toMatch(/noindex/);
    expect(content).toMatch(/follow/);
    expect(content).toMatch(/noarchive/);
  });

  it("przepina og:url na absolutny URL celu", () => {
    renderRedirect();
    const og = document.head.querySelector('meta[property="og:url"]');
    expect(og?.getAttribute("content")).toBe(ABSOLUTE_TARGET);
  });

  it("przepina twitter:url na absolutny URL celu", () => {
    renderRedirect();
    const tw = document.head.querySelector('meta[name="twitter:url"]');
    expect(tw?.getAttribute("content")).toBe(ABSOLUTE_TARGET);
  });

  it("po unmount usuwa wszystkie utworzone tagi (no leak)", () => {
    const { unmount } = renderRedirect();
    expect(document.head.querySelector('link[rel="canonical"]')).not.toBeNull();
    unmount();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[http-equiv="refresh"]')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.head.querySelector('meta[name="googlebot"]')).toBeNull();
    expect(document.head.querySelector('meta[name="bingbot"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
    expect(document.head.querySelector('meta[name="twitter:url"]')).toBeNull();
  });

  it("po unmount przywraca poprzednią wartość istniejącego canonical", () => {
    const original = document.createElement("link");
    original.setAttribute("rel", "canonical");
    original.setAttribute("href", "https://bestcml.io/poprzedni");
    document.head.appendChild(original);

    const { unmount } = renderRedirect();
    // Podczas mountowania href powinien być zmieniony na cel
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      ABSOLUTE_TARGET
    );

    unmount();
    // Po unmount: tag istnieje, href przywrócony
    const restored = document.head.querySelector('link[rel="canonical"]');
    expect(restored).not.toBeNull();
    expect(restored?.getAttribute("href")).toBe("https://bestcml.io/poprzedni");

    restored?.remove();
  });

  it("blokuje self-redirect (from === to) — nie modyfikuje head, loguje warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={["/petla"]}>
        <Routes>
          <Route path="/petla" element={<SeoRedirect to="/petla" />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[http-equiv="refresh"]')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("from === to"));
    warn.mockRestore();
  });

  it("akceptuje absolutny URL jako cel (nie dokleja BASE_URL)", () => {
    render(
      <MemoryRouter initialEntries={["/zewnetrzny"]}>
        <Routes>
          <Route
            path="/zewnetrzny"
            element={<SeoRedirect to="https://example.com/landing" />}
          />
        </Routes>
      </MemoryRouter>
    );
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://example.com/landing"
    );
  });
});
