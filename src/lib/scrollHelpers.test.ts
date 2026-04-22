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

// ============================================================
// Macierz różnych wysokości nagłówka × bufer 16/24px (defaults)
// ============================================================
// Każdy case liczy ręcznie oczekiwany targetY i porównuje z helperem.
// Wzór:
//   safeAreaTop = headerH + 16
//   safeAreaBottom = vh - 24
//   safeAreaHeight = safeAreaBottom - safeAreaTop = vh - headerH - 40
//   desiredViewportTop = safeAreaTop + (safeAreaHeight - rowH) / 2  (gdy rowH < safeAreaHeight)
//   targetY = max(0, scrollY + rectTop - desiredViewportTop)
//
// Sprawdzamy:
// 1) Każda headerH daje sensowny offset (wiersz wyląduje w środku safe-area)
// 2) Sticky header wyższy → targetY mniejszy (wiersz musi wjechać niżej w viewport)
// 3) Bufer 16/24 jest faktycznie respektowany (nie kleimy do krawędzi headera)

interface MatrixCase {
  name: string;
  headerHeight: number;
  viewportHeight: number;
  rowHeight: number;
  rectTop: number;
  scrollY: number;
  expectedTargetY: number;
  expectedDesiredViewportTop: number; // do dokumentacji wyniku w nazwie testu
}

const matrix: MatrixCase[] = [
  // headerHeight = 0 (brak sticky header — edge case np. mobile po hide-on-scroll)
  // safeAreaTop=16, safeAreaHeight=800-0-40=760, desired=16+(760-40)/2=376
  // targetY = 0 + 1000 - 376 = 624
  {
    name: "headerH=0 (no sticky) → wiersz centrowany w viewport z minimalnym top buffer 16",
    headerHeight: 0,
    viewportHeight: 800,
    rowHeight: 40,
    rectTop: 1000,
    scrollY: 0,
    expectedTargetY: 624,
    expectedDesiredViewportTop: 376,
  },
  // headerHeight = 64 (mały header, np. compact desktop)
  // safeAreaTop=80, safeAreaHeight=800-64-40=696, desired=80+(696-40)/2=80+328=408
  // targetY = 0 + 1000 - 408 = 592
  {
    name: "headerH=64 (compact) → desired=408, targetY uwzględnia +16 bufer",
    headerHeight: 64,
    viewportHeight: 800,
    rowHeight: 40,
    rectTop: 1000,
    scrollY: 0,
    expectedTargetY: 592,
    expectedDesiredViewportTop: 408,
  },
  // headerHeight = 80 (default w komponencie — fallback gdy CSS var brak)
  // safeAreaTop=96, safeAreaHeight=800-80-40=680, desired=96+(680-40)/2=96+320=416
  // targetY = 0 + 1000 - 416 = 584
  {
    name: "headerH=80 (default fallback) → desired=416",
    headerHeight: 80,
    viewportHeight: 800,
    rowHeight: 40,
    rectTop: 1000,
    scrollY: 0,
    expectedTargetY: 584,
    expectedDesiredViewportTop: 416,
  },
  // headerHeight = 120 (wysoki header desktop z search bar)
  // safeAreaTop=136, safeAreaHeight=800-120-40=640, desired=136+(640-40)/2=136+300=436
  // targetY = 0 + 1000 - 436 = 564
  {
    name: "headerH=120 (tall desktop) → wyższy header = niższy targetY (wiersz wjeżdża niżej)",
    headerHeight: 120,
    viewportHeight: 800,
    rowHeight: 40,
    rectTop: 1000,
    scrollY: 0,
    expectedTargetY: 564,
    expectedDesiredViewportTop: 436,
  },
  // headerHeight = 200 (very tall, np. mega-menu open)
  // safeAreaTop=216, safeAreaHeight=800-200-40=560, desired=216+(560-40)/2=216+260=476
  // targetY = 0 + 1000 - 476 = 524
  {
    name: "headerH=200 (mega-menu open) → desired=476",
    headerHeight: 200,
    viewportHeight: 800,
    rowHeight: 40,
    rectTop: 1000,
    scrollY: 0,
    expectedTargetY: 524,
    expectedDesiredViewportTop: 476,
  },
];

describe("computeRowScrollTarget — macierz różnych wysokości headera (bufer default 16/24)", () => {
  for (const c of matrix) {
    it(c.name, () => {
      const target = computeRowScrollTarget({
        rectTop: c.rectTop,
        rowHeight: c.rowHeight,
        scrollY: c.scrollY,
        viewportHeight: c.viewportHeight,
        headerHeight: c.headerHeight,
        force: true,
      });
      expect(target).toBe(c.expectedTargetY);
      // Dodatkowa walidacja: rectTop wiersza po scrollu = desiredViewportTop ±0
      // (po wykonaniu window.scrollTo(target), nowy rectTop = oldRectTop - (target - scrollY))
      const newRectTop = c.rectTop - (c.expectedTargetY - c.scrollY);
      expect(newRectTop).toBe(c.expectedDesiredViewportTop);
    });
  }

  it("wyższy header → mniejszy targetY (monotonicznie) — wiersz musi wjechać niżej w viewport", () => {
    const targets = [0, 64, 80, 120, 200].map((h) =>
      computeRowScrollTarget({
        rectTop: 1000,
        rowHeight: 40,
        scrollY: 0,
        viewportHeight: 800,
        headerHeight: h,
        force: true,
      })
    );
    // Każdy kolejny targetY powinien być mniejszy (wyższy header = mniejszy scroll)
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i]).toBeLessThan(targets[i - 1]!);
    }
  });

  it("bufer 16 jest faktycznie zachowany — wiersz nigdy nie ląduje przylegając do dolnej krawędzi headera", () => {
    // Dla headerH=80, jeśli wiersz wyląduje na safeAreaTop=96, znaczy że bufer 16 zachowany.
    // Sprawdzamy małą rowH (10px) — powinna wycentrować się powyżej safeAreaTop+(safeAreaHeight-rowH)/2.
    const headerH = 80;
    const target = computeRowScrollTarget({
      rectTop: 1000,
      rowHeight: 10,
      scrollY: 0,
      viewportHeight: 800,
      headerHeight: headerH,
      force: true,
    });
    // safeAreaTop=96, safeAreaHeight=720, desired=96+(720-10)/2=96+355=451
    // newRectTop po scrollu = 1000 - (target - 0) = 1000 - target
    const newRectTop = 1000 - (target ?? 0);
    expect(newRectTop).toBe(451);
    // KEY ASSERTION: newRectTop > headerH + 16 (bufer respektowany)
    expect(newRectTop).toBeGreaterThanOrEqual(headerH + 16);
  });

  it("bufer 16 zachowany dla małego viewportu — krytyczny case mobile", () => {
    // Mobile portrait 360x640, header 56
    // safeAreaTop=72, safeAreaHeight=640-56-40=544, rowH=40, desired=72+(544-40)/2=72+252=324
    const target = computeRowScrollTarget({
      rectTop: 500,
      rowHeight: 40,
      scrollY: 100,
      viewportHeight: 640,
      headerHeight: 56,
      force: true,
    });
    expect(target).toBe(100 + 500 - 324); // 276
    const newRectTop = 500 - (target! - 100);
    expect(newRectTop).toBe(324);
    expect(newRectTop).toBeGreaterThanOrEqual(56 + 16); // bufer respektowany
  });
});
