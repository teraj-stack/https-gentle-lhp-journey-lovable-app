import { describe, it, expect } from "vitest";
import { computeRowScrollTarget } from "./scrollHelpers";

// Regresja przesuwu wierszy pod sticky headerem (--header-height).
// Scenariusz bazowy: viewport 800px, header 80px, row 40px.
// safeAreaTop = 80 + 16 = 96
// safeAreaBottom = 800 - 24 = 776
// safeAreaHeight = 776 - 96 = 680
// desiredViewportTop (centered) = 96 + (680 - 40) / 2 = 416
const BASE = {
  rowHeight: 40,
  viewportHeight: 800,
  headerHeight: 80,
};

describe("computeRowScrollTarget — przesuw pod sticky headerem", () => {
  it("wiersz na GÓRZE listy (schowany pod headerem) → scrolluje w górę żeby wycentrować", () => {
    // Wiersz tuż pod headerem, częściowo zasłonięty (rectTop=50 < safeAreaTop=96)
    // Strona przewinięta na sam początek (scrollY=0)
    const target = computeRowScrollTarget({
      ...BASE,
      rectTop: 50,
      scrollY: 0,
    });
    // targetY = 0 + 50 - 416 = -366 → clamp do 0
    expect(target).toBe(0);
  });

  it("wiersz w ŚRODKU listy (poniżej viewport) → scrolluje w dół do środka safe-area", () => {
    // Wiersz daleko poniżej widocznego obszaru (rectTop=1500), strona już trochę przewinięta
    const target = computeRowScrollTarget({
      ...BASE,
      rectTop: 1500,
      scrollY: 200,
    });
    // targetY = 200 + 1500 - 416 = 1284
    expect(target).toBe(1284);
  });

  it("wiersz na DOLE listy (wysoko nad viewportem po scrollu) → scrolluje w górę", () => {
    // Wiersz powyżej widocznego obszaru (rectTop=-300), strona głęboko przewinięta
    const target = computeRowScrollTarget({
      ...BASE,
      rectTop: -300,
      scrollY: 5000,
    });
    // targetY = 5000 + (-300) - 416 = 4284
    expect(target).toBe(4284);
  });

  it("wiersz JUŻ W PEŁNI WIDOCZNY w bezpiecznej strefie + force=false → zwraca null (pomiń scroll)", () => {
    // rectTop=200, rectBottom=240, oba w przedziale [96, 776]
    const target = computeRowScrollTarget({
      ...BASE,
      rectTop: 200,
      scrollY: 100,
      force: false,
    });
    expect(target).toBeNull();
  });

  it("wiersz w pełni widoczny + force=true → i tak scrolluje (intencja usera Next/Prev/Enter)", () => {
    const target = computeRowScrollTarget({
      ...BASE,
      rectTop: 200,
      scrollY: 100,
      force: true,
    });
    // targetY = 100 + 200 - 416 = -116 → clamp do 0
    expect(target).toBe(0);
  });

  it("wiersz CZĘŚCIOWO ZASŁONIĘTY przez header (rectTop pod safeAreaTop) → scrolluje mimo force=false", () => {
    // rectTop=90, safeAreaTop=96 → fullyVisible=false → scroll
    const target = computeRowScrollTarget({
      ...BASE,
      rectTop: 90,
      scrollY: 1000,
      force: false,
    });
    // targetY = 1000 + 90 - 416 = 674
    expect(target).toBe(674);
  });

  it("wiersz CZĘŚCIOWO PONIŻEJ dolnej krawędzi → scrolluje mimo force=false", () => {
    // rectBottom=780 > viewportHeight - bottomBuffer = 776 → fullyVisible=false
    const target = computeRowScrollTarget({
      ...BASE,
      rectTop: 740,
      scrollY: 500,
      force: false,
    });
    // targetY = 500 + 740 - 416 = 824
    expect(target).toBe(824);
  });

  it("wiersz WYŻSZY niż safe-area → wyrównuje górę wiersza do safeAreaTop (a nie centruje)", () => {
    // safeAreaHeight = 680, rowHeight = 700 → desiredViewportTop = safeAreaTop = 96
    const target = computeRowScrollTarget({
      ...BASE,
      rowHeight: 700,
      rectTop: 1000,
      scrollY: 0,
    });
    // targetY = 0 + 1000 - 96 = 904
    expect(target).toBe(904);
  });

  it("respektuje custom buffer i bottomBuffer", () => {
    // buffer=0, bottomBuffer=0 → safeAreaTop=80, safeAreaHeight=720, desiredViewportTop=80+(720-40)/2=420
    const target = computeRowScrollTarget({
      ...BASE,
      rectTop: 1000,
      scrollY: 0,
      buffer: 0,
      bottomBuffer: 0,
      force: true,
    });
    // targetY = 0 + 1000 - 420 = 580
    expect(target).toBe(580);
  });
});
