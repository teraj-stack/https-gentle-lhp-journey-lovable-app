/**
 * Wspólne progi tolerancji + asercje layoutu dla testów visual regression
 * sekcji „Live preview" w `/admin/vein-images`.
 *
 * Cel modułu:
 *  - Trzymać WSZYSTKIE progi pikselowe w jednym miejscu (single source of truth),
 *    żeby spec light i spec dark nie rozjechały się przy tuningu.
 *  - Eksportować nazwane stałe (zamiast magic numbers `+ 1`), aby w komunikatach
 *    błędów było widać DLACZEGO dany próg istnieje (sub-pixel rounding,
 *    fractional viewport, scroll gutter).
 *  - Zapewnić zarówno DOLNY (sanity), jak i GÓRNY (false-positive guard) próg
 *    tolerancji — overflow ≤ N px jest OK, overflow > N px = realna regresja.
 *
 * Skala tolerancji — empirycznie dobrana pod silniki Playwrighta (Chromium,
 * WebKit, Firefox) na devicePixelRatio 1×–3× i fractional zoom CI runnerów.
 *
 * UWAGA: Górne progi (HARD_*) są CELOWO konserwatywne. Jeśli trzeba je
 * podnieść, znaczy to że pojawiła się REALNA regresja w UI, nie noise.
 */
import { expect, type Page } from "../../playwright-fixture";

// ============================================================================
// PROGI TOLERANCJI
// ============================================================================

/**
 * Tolerancja sub-pixel rounding dla DOM box metrics (scrollWidth/clientWidth,
 * boundingBox.x/width). Browser engines różnie zaokrąglają fractional CSS px
 * do device px — różnica do 1 px jest matematycznie nieuniknionym noise'em.
 *
 * Zastosowanie: porównania scrollWidth ≤ clientWidth, frame.right ≤ viewport.
 */
export const SUBPIXEL_ROUNDING_PX = 1;

/**
 * Górny próg overflow horyzontalnego strony, powyżej którego uznajemy
 * że to NIE jest sub-pixel noise tylko realna regresja (np. element wyleciał
 * poza container, missing `min-w-0`, długi tekst bez `truncate`).
 *
 * 4 px = pokrywa: 1px DOM rounding + 1px scrollbar gutter compensation
 * + 2px buffer na CI runnery z fractional DPR (np. headless 1.25×).
 *
 * Powyżej tej wartości test failuje TWARDO, nawet jeśli `+ SUBPIXEL_ROUNDING_PX`
 * by „przepuściło" — chronimy się przed cichym akumulowaniem regresji.
 */
export const HARD_OVERFLOW_CEILING_PX = 4;

/**
 * Tolerancja dla bbox elementów względem viewportu (frame.right ≤ vw).
 * Większa niż SUBPIXEL bo viewport size sam może być fractional w headless mode
 * (Chromium na Linuxie raportuje 1280.5 dla `setViewportSize({width: 1280})`
 * przy DPR 1.25×).
 */
export const VIEWPORT_FIT_TOLERANCE_PX = 2;

/**
 * Tolerancja dla figcaption/text overflow (scrollWidth - clientWidth).
 * Tekst z font-feature-settings (kerning, ligatury) może mieć fractional
 * advance width — daje 1–2px sub-pixel rzeczywiście wyrenderowanego glifu
 * przy końcu linii, mimo że logicznie się mieści.
 */
export const TEXT_OVERFLOW_TOLERANCE_PX = 2;

/**
 * Minimalna szerokość/wysokość renderu draftu, którą uznajemy za „element
 * faktycznie istnieje". 1 px = element nie jest collapsed do zera (regresja
 * `display: none` lub `width: 0`), ale tolerujemy wczesne layout passes.
 */
export const MIN_RENDERED_DIMENSION_PX = 1;

/**
 * Snapshot pixel diff tolerance dla LIVE PREVIEW.
 * 0.03 = 3% pikseli może się różnić — uwzględnia anti-aliasing SVG ikon
 * `VenousInsufficiencyImage` + cursor blink artifacts w textareach.
 *
 * Eksportowany żeby spec light/dark używał TEJ SAMEJ wartości.
 */
export const LIVE_PREVIEW_SNAPSHOT_DIFF_RATIO = 0.03;

// ============================================================================
// ASERCJE
// ============================================================================

/**
 * Asercja: brak horizontalnego scrolla na <html>, z DWUSTRONNYM progiem.
 *
 * - Dolny (soft): scrollWidth ≤ clientWidth + SUBPIXEL_ROUNDING_PX → pass.
 * - Górny (hard): overflow > HARD_OVERFLOW_CEILING_PX → fail z osobnym
 *   komunikatem wskazującym na realną regresję.
 *
 * Dwa progi pozwalają odróżnić noise od regresji w komunikacie błędu — łatwiej
 * zdecydować czy trzeba debugować CSS czy podnieść tolerancję.
 */
export const assertNoHorizontalOverflow = async (
  page: Page,
  viewportWidth: number,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  const overflow = scrollWidth - clientWidth;

  // Najpierw twardy ceiling — jeśli przekroczone, to PEWNA regresja.
  expect(
    overflow,
    `[${themeLabel}] HARD overflow regression: page scrollW=${scrollWidth} ` +
      `przekracza clientW=${clientWidth} o ${overflow}px ` +
      `(twardy próg = ${HARD_OVERFLOW_CEILING_PX}px). ` +
      `Sub-pixel rounding nie tłumaczy tej różnicy — sprawdź czy nie ma elementu ` +
      `wystającego poza container (brakujący min-w-0, długi tekst bez truncate, ` +
      `fixed-width child w flex/grid). Viewport: ${viewportWidth}px.`,
  ).toBeLessThanOrEqual(HARD_OVERFLOW_CEILING_PX);

  // Soft próg — sub-pixel rounding tolerated.
  expect(
    scrollWidth,
    `[${themeLabel}] Strona ma horizontalny scroll: scrollW=${scrollWidth} > ` +
      `clientW=${clientWidth} + ${SUBPIXEL_ROUNDING_PX}px tolerancji ` +
      `(viewport ${viewportWidth}px).`,
  ).toBeLessThanOrEqual(clientWidth + SUBPIXEL_ROUNDING_PX);
};

/**
 * Asercja: live-preview-frame mieści się w viewporcie horyzontalnie
 * i ma niezerowy bounding box.
 */
export const assertFrameFitsViewport = async (
  page: Page,
  viewportWidth: number,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  const frame = page.getByTestId("live-preview-frame");
  await expect(frame).toBeVisible();
  const box = await frame.boundingBox();
  expect(box, `[${themeLabel}] live-preview-frame musi mieć boundingBox`).not.toBeNull();
  if (!box) return;

  const right = box.x + box.width;
  const overflow = right - viewportWidth;

  // Hard ceiling — jeśli frame wystaje znacząco, to bug w grid/responsive layout.
  expect(
    overflow,
    `[${themeLabel}] HARD frame overflow regression: live-preview-frame ` +
      `prawą krawędzią (right=${right.toFixed(2)}) przekracza viewport ` +
      `(vw=${viewportWidth}) o ${overflow.toFixed(2)}px ` +
      `(twardy próg = ${HARD_OVERFLOW_CEILING_PX}px). ` +
      `Najczęstsza przyczyna: grid template z fixed `lg:grid-cols-[1fr_440px]` ` +
      `nie przełącza się na single column w danym breakpoincie.`,
  ).toBeLessThanOrEqual(HARD_OVERFLOW_CEILING_PX);

  // Soft próg — fractional viewport / DPR rounding.
  expect(
    right,
    `[${themeLabel}] live-preview-frame wystaje poza viewport ` +
      `(right=${right.toFixed(2)}, vw=${viewportWidth}, ` +
      `tolerancja=${VIEWPORT_FIT_TOLERANCE_PX}px).`,
  ).toBeLessThanOrEqual(viewportWidth + VIEWPORT_FIT_TOLERANCE_PX);

  expect(
    box.width,
    `[${themeLabel}] live-preview-frame ma podejrzanie małą szerokość ` +
      `(${box.width}px ≤ ${MIN_RENDERED_DIMENSION_PX}px) — ` +
      `prawdopodobnie collapsed do zera.`,
  ).toBeGreaterThan(MIN_RENDERED_DIMENSION_PX);
};

/**
 * Asercja: pierwszy <img> w live-preview-section jest widoczny i wyrenderowany.
 */
export const assertDraftImageRendered = async (
  page: Page,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  const draftImg = page
    .getByTestId("live-preview-section")
    .locator("img")
    .first();
  await expect(draftImg).toBeVisible();
  const imgBox = await draftImg.boundingBox();

  expect(
    imgBox?.width ?? 0,
    `[${themeLabel}] draft <img> ma za małą szerokość ` +
      `(${imgBox?.width ?? 0}px ≤ ${MIN_RENDERED_DIMENSION_PX}px) — ` +
      `regresja: img collapsed lub src failed to load.`,
  ).toBeGreaterThan(MIN_RENDERED_DIMENSION_PX);

  expect(
    imgBox?.height ?? 0,
    `[${themeLabel}] draft <img> ma za małą wysokość ` +
      `(${imgBox?.height ?? 0}px ≤ ${MIN_RENDERED_DIMENSION_PX}px) — ` +
      `regresja: brakuje aspect-ratio lub natural dimensions z src.`,
  ).toBeGreaterThan(MIN_RENDERED_DIMENSION_PX);
};

/**
 * Composite: wszystkie 3 powyższe asercje w jednym wywołaniu.
 * Wygodne dla spec'ów, które historycznie miały jeden helper `assertLayoutDoesNotBreak`.
 */
export const assertLayoutDoesNotBreak = async (
  page: Page,
  viewportWidth: number,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  await assertNoHorizontalOverflow(page, viewportWidth, themeLabel);
  await assertFrameFitsViewport(page, viewportWidth, themeLabel);
  await assertDraftImageRendered(page, themeLabel);
};

/**
 * Asercja: figcaption nie jest obcięty horyzontalnie.
 *
 * Dwustopniowy próg analogiczny do overflow strony:
 *  - soft (TEXT_OVERFLOW_TOLERANCE_PX) — sub-pixel glyph advance,
 *  - hard (HARD_OVERFLOW_CEILING_PX) — realne ucięcie tekstu (overflow: hidden
 *    + text-overflow: clip bez ellipsis).
 */
export const assertCaptionNotClipped = async (
  page: Page,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  const captionsOverflow = await page
    .getByTestId("live-preview-section")
    .locator("figcaption")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        scrollW: n.scrollWidth,
        clientW: n.clientWidth,
        text: n.textContent?.slice(0, 40) ?? "",
      })),
    );

  for (const c of captionsOverflow) {
    const overflow = c.scrollW - c.clientW;

    // Hard ceiling — realne ucięcie tekstu.
    expect(
      overflow,
      `[${themeLabel}] HARD caption clipping: figcaption "${c.text}" ` +
        `wystaje o ${overflow}px (scrollW=${c.scrollW}, clientW=${c.clientW}, ` +
        `twardy próg = ${HARD_OVERFLOW_CEILING_PX}px). ` +
        `Tekst jest realnie ucinany — sprawdź word-break, hyphens, max-width.`,
    ).toBeLessThanOrEqual(HARD_OVERFLOW_CEILING_PX);

    // Soft próg — sub-pixel glyph advance.
    expect(
      c.scrollW,
      `[${themeLabel}] figcaption "${c.text}" obcięte: ` +
        `scrollW=${c.scrollW} > clientW=${c.clientW} + ${TEXT_OVERFLOW_TOLERANCE_PX}px tolerancji.`,
    ).toBeLessThanOrEqual(c.clientW + TEXT_OVERFLOW_TOLERANCE_PX);
  }
};
