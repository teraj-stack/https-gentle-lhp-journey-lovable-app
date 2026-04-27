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
      `Najczęstsza przyczyna: grid template z fixed kolumną (np. ` +
      `lg:grid-cols-[1fr_440px]) nie przełącza się na single column w danym breakpoincie.`,
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

// ============================================================================
// PROGI A11Y
// ============================================================================

/**
 * Minimalny rozmiar touch target dla WCAG 2.5.8 (Target Size — Minimum, Level AA).
 * Specyfikacja mówi 24×24 CSS px, mierząc bbox elementu interaktywnego.
 *
 * Stosujemy do tab buttons w sekcji „Tryb podglądu" (Draft / CMS) — to jedyne
 * interaktywne elementy w obrębie `live-preview-section` na małych ekranach.
 *
 * UWAGA: WCAG 2.2 podnosi do 24px tylko jeśli element nie jest w „inline text",
 * nie ma „equivalent" alternatywy itp. Dla prostoty trzymamy twardy próg 24px
 * dla wszystkich tabów — jeśli regresja go obniży, mamy realny problem na mobile.
 */
export const MIN_TOUCH_TARGET_PX = 24;

/**
 * Maksymalna szerokość viewportu, dla której uruchamiamy ostrzejsze asercje
 * touch target (małe ekrany — telefony portrait). Powyżej tej wartości
 * zakładamy że user ma wskaźnik precyzyjny (mysz/trackpad/tablet z rysikiem)
 * i mniejsze targety są akceptowalne.
 *
 * 600px = standardowy breakpoint między „phone" a „tablet" w MD/Tailwind sm.
 */
export const SMALL_SCREEN_MAX_WIDTH_PX = 600;

// ============================================================================
// ASERCJE A11Y
// ============================================================================

/**
 * Asercja: każdy `<img>` w sekcji draftu ma niepuste, sensowne `alt`.
 *
 * - `alt=""` jest DOZWOLONE dla obrazów dekoracyjnych przez WCAG, ale dla
 *   draftu w panelu CMS pusty alt = regresja edytora (user nie widzi co edytuje).
 * - Trim'ujemy whitespace, bo `alt="   "` to to samo co pusty z punktu widzenia AT.
 * - Asercja działa tylko na widocznych <img> — element ukryty (display:none) nie
 *   wpływa na czytniki ekranu.
 */
export const assertDraftImagesHaveAlt = async (
  page: Page,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  const imageInfo = await page
    .getByTestId("live-preview-section")
    .locator("img")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => {
          // Pomijamy ukryte obrazy — nie są w accessibility tree.
          const style = window.getComputedStyle(n);
          return style.display !== "none" && style.visibility !== "hidden";
        })
        .map((n) => ({
          alt: n.getAttribute("alt"),
          src: n.getAttribute("src")?.slice(0, 60) ?? "(brak src)",
          // role=presentation/none to świadome wycofanie obrazu z a11y tree —
          // wtedy alt może być pusty.
          role: n.getAttribute("role"),
          ariaHidden: n.getAttribute("aria-hidden") === "true",
        })),
    );

  expect(
    imageInfo.length,
    `[${themeLabel}] live-preview-section nie zawiera ŻADNEGO widocznego <img> — ` +
      `regresja: draft image nie został wyrenderowany.`,
  ).toBeGreaterThan(0);

  for (const img of imageInfo) {
    // Obrazy świadomie wycofane z a11y tree mogą mieć pusty alt.
    if (img.role === "presentation" || img.role === "none" || img.ariaHidden) continue;

    expect(
      img.alt,
      `[${themeLabel}] <img src="${img.src}…"> nie ma atrybutu alt. ` +
        `WCAG 1.1.1 wymaga alt="" (dekoracyjny) LUB opisowego tekstu. ` +
        `Brak atrybutu = regresja accessibility.`,
    ).not.toBeNull();

    const altTrimmed = (img.alt ?? "").trim();
    expect(
      altTrimmed.length,
      `[${themeLabel}] <img src="${img.src}…"> ma pusty/whitespace alt ("${img.alt}"). ` +
        `Dla draftu w CMS oczekujemy opisowego tekstu — pusty alt to regresja UX edytora.`,
    ).toBeGreaterThan(0);
  }
};

/**
 * Asercja: sekcja `live-preview-section` ma accessible name (aria-label / aria-labelledby).
 * Bez nazwy sekcja jest „landmark" bez etykiety i czytniki ją pomijają.
 */
export const assertPreviewSectionHasAccessibleName = async (
  page: Page,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  const accInfo = await page
    .getByTestId("live-preview-section")
    .evaluate((n) => ({
      ariaLabel: n.getAttribute("aria-label"),
      ariaLabelledby: n.getAttribute("aria-labelledby"),
      tagName: n.tagName.toLowerCase(),
    }));

  const hasName =
    (accInfo.ariaLabel?.trim().length ?? 0) > 0 ||
    (accInfo.ariaLabelledby?.trim().length ?? 0) > 0;

  expect(
    hasName,
    `[${themeLabel}] <${accInfo.tagName} data-testid="live-preview-section"> ` +
      `nie ma accessible name (aria-label ani aria-labelledby). ` +
      `Sekcje/landmarks bez nazwy są pomijane przez czytniki ekranu.`,
  ).toBe(true);
};

/**
 * Asercja focus state na kontrolkach „Tryb podglądu" (Draft/CMS taby).
 *
 * Sprawdza:
 *  1) Każdy tab daje się sfokusować (`page.locator(...).focus()` → activeElement).
 *  2) Po focusie ma WIDOCZNY indicator: outline o niezerowej szerokości
 *     LUB box-shadow inny niż "none" LUB ring (Tailwind `focus-visible:ring-*`).
 *     Łapie regresje typu `outline: none` bez zastępstwa.
 *  3) Tab kluczem klawiatury przeniesie focus między tabami (sequential focus
 *     navigation działa — element jest w tab order, nie ma `tabindex="-1"`).
 */
export const assertPreviewTabsHaveFocusState = async (
  page: Page,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  const tabs = page
    .getByTestId("live-preview-section")
    .getByRole("tab");

  const tabCount = await tabs.count();
  expect(
    tabCount,
    `[${themeLabel}] Oczekiwano ≥2 role="tab" w live-preview-section ` +
      `(Draft + CMS), znaleziono ${tabCount}.`,
  ).toBeGreaterThanOrEqual(2);

  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const tabText = (await tab.textContent())?.trim() ?? `tab[${i}]`;

    // 1) Focus.
    await tab.focus();
    const isFocused = await tab.evaluate((el) => el === document.activeElement);
    expect(
      isFocused,
      `[${themeLabel}] tab "${tabText}" nie przyjął focusu po .focus() — ` +
        `prawdopodobnie ma tabindex="-1" lub disabled bez wizualnej informacji.`,
    ).toBe(true);

    // 2) Wizualny indicator focusa.
    const focusVisuals = await tab.evaluate((el) => {
      const style = window.getComputedStyle(el);
      // outline-style: none + outline-width: 0 = brak outline.
      const outlineWidth = parseFloat(style.outlineWidth) || 0;
      const outlineStyle = style.outlineStyle;
      const hasOutline = outlineStyle !== "none" && outlineWidth > 0;
      // box-shadow: "none" gdy brak; cokolwiek innego = ring/glow indicator.
      const boxShadow = style.boxShadow;
      const hasBoxShadow = boxShadow !== "none" && boxShadow.length > 0;
      return { outlineWidth, outlineStyle, boxShadow, hasOutline, hasBoxShadow };
    });

    const hasFocusIndicator = focusVisuals.hasOutline || focusVisuals.hasBoxShadow;
    expect(
      hasFocusIndicator,
      `[${themeLabel}] tab "${tabText}" w stanie :focus nie ma żadnego ` +
        `wizualnego indicatora (outline=${focusVisuals.outlineStyle}/` +
        `${focusVisuals.outlineWidth}px, box-shadow="${focusVisuals.boxShadow}"). ` +
        `WCAG 2.4.7 (Focus Visible) wymaga widocznego wskaźnika focusa — ` +
        `regresja: ktoś dodał \`outline: none\` bez zastępstwa.`,
    ).toBe(true);
  }

  // 3) Sequential focus navigation — Tab key przesuwa focus na NEXT tab.
  // Cofamy się na pierwszy tab, naciskamy Tab, sprawdzamy że focus poszedł dalej.
  await tabs.first().focus();
  const firstActive = await page.evaluate(
    () => document.activeElement?.textContent?.trim() ?? "",
  );
  await page.keyboard.press("Tab");
  const afterTabActive = await page.evaluate(
    () => document.activeElement?.textContent?.trim() ?? "",
  );
  // Nie sprawdzamy że focus poszedł na drugi tab konkretnie (między tabami
  // mogą być inne focusable elementy w przyszłości) — sprawdzamy że focus
  // w ogóle SIĘ PRZESUNĄŁ (sequential nav działa).
  expect(
    afterTabActive,
    `[${themeLabel}] Tab key nie przesunął focusa z "${firstActive}" — ` +
      `pierwszy tab prawdopodobnie wypadł z tab order.`,
  ).not.toBe(firstActive);
};

/**
 * Asercja minimalnego rozmiaru touch target dla tabów na MAŁYCH EKRANACH.
 *
 * - WCAG 2.5.8 (AA): bbox ≥ 24×24 CSS px.
 * - Wykonywana TYLKO gdy `viewportWidth ≤ SMALL_SCREEN_MAX_WIDTH_PX` (≤600px).
 *   Na desktop/tablet ten próg jest mniej krytyczny (precyzyjny wskaźnik),
 *   więc nie zaśmiecamy logu nadmiarowymi asercjami.
 *
 * Zwraca wcześnie (no-op) dla viewportów > 600px.
 */
export const assertTouchTargetsOnSmallScreens = async (
  page: Page,
  viewportWidth: number,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  if (viewportWidth > SMALL_SCREEN_MAX_WIDTH_PX) return;

  const tabs = page
    .getByTestId("live-preview-section")
    .getByRole("tab");
  const tabCount = await tabs.count();

  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const tabText = (await tab.textContent())?.trim() ?? `tab[${i}]`;
    const box = await tab.boundingBox();
    expect(
      box,
      `[${themeLabel}] tab "${tabText}" nie ma boundingBox — ` +
        `prawdopodobnie display:none lub poza viewportem.`,
    ).not.toBeNull();
    if (!box) continue;

    expect(
      box.width,
      `[${themeLabel}] tab "${tabText}" ma szerokość ${box.width.toFixed(1)}px ` +
        `< ${MIN_TOUCH_TARGET_PX}px (WCAG 2.5.8). ` +
        `Viewport ${viewportWidth}px — small screen, target za mały na tap'a palcem.`,
    ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);

    expect(
      box.height,
      `[${themeLabel}] tab "${tabText}" ma wysokość ${box.height.toFixed(1)}px ` +
        `< ${MIN_TOUCH_TARGET_PX}px (WCAG 2.5.8). ` +
        `Viewport ${viewportWidth}px — small screen, target za niski na tap'a palcem.`,
    ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
  }
};

/**
 * Composite a11y assertion — wywołuje wszystkie powyższe w jednym miejscu.
 * Używaj w spec'ach jako pojedynczego punktu wejścia, żeby nowe asercje
 * automatycznie dołączały się do istniejących testów.
 */
export const assertDraftA11y = async (
  page: Page,
  viewportWidth: number,
  themeLabel: "light" | "dark" = "light",
): Promise<void> => {
  await assertPreviewSectionHasAccessibleName(page, themeLabel);
  await assertDraftImagesHaveAlt(page, themeLabel);
  await assertPreviewTabsHaveFocusState(page, themeLabel);
  await assertTouchTargetsOnSmallScreens(page, viewportWidth, themeLabel);
};

// ============================================================================
// STABILIZACJA SNAPSHOTÓW — czekanie na zakończenie animacji/tranzycji
// ============================================================================

/**
 * Domyślny timeout (ms) dla `waitForAnimationsToSettle`. Najdłuższa znana
 * tranzycja w `live-preview-section` to `transition-all duration-500` na
 * sekcji (flash po Save). Dajemy 2× zapas + bufor na fonts/layout settle.
 */
export const ANIMATION_SETTLE_TIMEOUT_MS = 1500;

/**
 * Mała pauza po settlement, żeby dać requestAnimationFrame flush + paint commit.
 * 2 frames @ 60fps = ~33ms. Konieczne, bo `getAnimations().finished` rozwiązuje
 * się ZARAZ po ostatnim tick'u animacji, ale composite może być jeszcze pending.
 */
export const POST_SETTLE_PAINT_BUFFER_MS = 50;

/**
 * Czeka aż WSZYSTKIE aktywne animacje i tranzycje CSS w obrębie sekcji
 * `live-preview-section` (z subtree) zakończą się.
 *
 * Dlaczego nie tylko `animations: "disabled"` w `toHaveScreenshot`:
 *  - Playwrightowy `animations: "disabled"` zatrzymuje CSS `@keyframes`
 *    i przewija je do końca, ale NIE wpływa na `transition-*` property
 *    triggered by state change (np. `border-color` po dodaniu klasy).
 *  - Sekcja live-preview ma `transition-all duration-500` — flash po Save
 *    może być w trakcie kiedy snapshot się odpala = flaky baseline.
 *
 * Implementacja:
 *  - `Element.getAnimations({ subtree: true })` zwraca WSZYSTKIE Animation
 *    objects (CSS animation + CSS transition + WAAPI) w drzewie.
 *  - Każdy ma `.finished` Promise, który resolve'uje się gdy animacja
 *    naturalnie się skończy lub jest sfinalizowana.
 *  - `Promise.allSettled` — używamy zamiast `Promise.all`, bo Animation
 *    może być cancelled (rejection); chcemy poczekać na "settled" niezależnie
 *    od reason.
 *  - Cały await jest opakowany w `Promise.race` z timeoutem — żeby NIGDY
 *    nie zawiesić testu jeśli ktoś dorzuci `animation-iteration-count: infinite`
 *    bez `animations: "disabled"` w innym miejscu.
 *
 * Defensywne fallbacki: jeśli `Element.getAnimations` nie istnieje (stara
 * przeglądarka), zwraca natychmiast — API jest w Chromium/Firefox/WebKit
 * od 2020+, więc fallback raczej nie wystrzeli na CI.
 */
export const waitForAnimationsToSettle = async (
  page: Page,
  options: { timeoutMs?: number; selector?: string } = {},
): Promise<void> => {
  const timeoutMs = options.timeoutMs ?? ANIMATION_SETTLE_TIMEOUT_MS;
  const selector = options.selector ?? '[data-testid="live-preview-section"]';

  await page.evaluate(
    async ({ sel, t }) => {
      const root = document.querySelector(sel);
      if (!root) return;
      const elWithGetAnimations = root as Element & {
        getAnimations?: (opts?: { subtree?: boolean }) => Animation[];
      };
      if (typeof elWithGetAnimations.getAnimations !== "function") return;

      const animations = elWithGetAnimations.getAnimations({ subtree: true });
      if (animations.length === 0) return;

      const allFinished = Promise.allSettled(animations.map((a) => a.finished));
      const timeout = new Promise<void>((resolve) => {
        // Po timeoucie kończymy await — kolejna asercja w spec może wykryć
        // realny problem (np. infinite animation), ale snapshot się nie zawiesi.
        window.setTimeout(() => resolve(), t);
      });
      await Promise.race([allFinished, timeout]);

      // Po settlement — 2× rAF żeby pozwolić browserowi commit'ować paint.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    },
    { sel: selector, t: timeoutMs },
  );

  // Mały JS-side bufor na composite layer flush (poza requestAnimationFrame
  // jest jeszcze browser compositor — 50ms to bezpieczna heurystyka).
  await page.waitForTimeout(POST_SETTLE_PAINT_BUFFER_MS);
};

/**
 * Sanity check: po `waitForAnimationsToSettle` faktycznie nie ma już
 * running animations w sekcji preview. Używaj w spec'ach gdy chcesz mieć
 * pewność że stabilizacja zadziałała (np. po deliberatnym wytriggrowaniu
 * tranzycji typu flash po Save).
 *
 * Liczy tylko animacje w stanie `"running"` — `"finished"` i `"paused"`
 * (np. po `animations: "disabled"`) NIE liczą się jako problem.
 */
export const assertNoRunningAnimations = async (
  page: Page,
  themeLabel: "light" | "dark" = "light",
  selector: string = '[data-testid="live-preview-section"]',
): Promise<void> => {
  const runningCount = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return 0;
    const elWithGetAnimations = root as Element & {
      getAnimations?: (opts?: { subtree?: boolean }) => Animation[];
    };
    if (typeof elWithGetAnimations.getAnimations !== "function") return 0;
    return elWithGetAnimations
      .getAnimations({ subtree: true })
      .filter((a) => a.playState === "running").length;
  }, selector);

  expect(
    runningCount,
    `[${themeLabel}] live-preview-section nadal ma ${runningCount} działającą ` +
      `animację/tranzycję po waitForAnimationsToSettle. Snapshot byłby flaky. ` +
      `Sprawdź czy nie ma \`animation-iteration-count: infinite\` lub bardzo długiej tranzycji ` +
      `(> ANIMATION_SETTLE_TIMEOUT_MS = ${ANIMATION_SETTLE_TIMEOUT_MS}ms).`,
  ).toBe(0);
};

