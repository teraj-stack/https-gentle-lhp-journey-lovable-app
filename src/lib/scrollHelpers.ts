/**
 * Czysta funkcja licząca docelowy `window.scrollY` dla wiersza tabeli, tak żeby
 * wylądował w ŚRODKU bezpiecznej strefy (między dolną krawędzią sticky headera
 * a dnem viewportu). Wyciągnięta z `AdminSystemHealth.tsx` żeby dało się pokryć
 * testem jednostkowym (góra/środek/dół listy) bez uruchamiania całej strony.
 *
 * Reguły:
 * - safeAreaTop = headerH + buffer
 * - safeAreaBottom = viewportH - bottomBuffer
 * - jeśli wiersz wyższy niż safeArea → wyrównaj górę wiersza do safeAreaTop
 * - inaczej → wycentruj wiersz w safeArea
 * - gdy `force=false` i wiersz w pełni widoczny w bezpiecznej strefie → zwróć `null`
 *   (sygnał "pomiń scroll, nie szarp widokiem")
 */
export interface ScrollTargetInput {
  /** rect.top wiersza względem viewportu (px) */
  rectTop: number;
  /** wysokość wiersza (px) */
  rowHeight: number;
  /** aktualny window.scrollY (px) */
  scrollY: number;
  /** wysokość viewportu (px) */
  viewportHeight: number;
  /** wysokość sticky headera z CSS var --header-height (px) */
  headerHeight: number;
  /** wymusza scroll nawet gdy wiersz w pełni widoczny */
  force?: boolean;
  /** odstęp od dolnej krawędzi headera (default 16) */
  buffer?: number;
  /** odstęp od dna viewportu (default 24) */
  bottomBuffer?: number;
}

export function computeRowScrollTarget(input: ScrollTargetInput): number | null {
  const {
    rectTop,
    rowHeight,
    scrollY,
    viewportHeight,
    headerHeight,
    force = false,
    buffer = 16,
    bottomBuffer = 24,
  } = input;

  const safeAreaTop = headerHeight + buffer;
  const safeAreaHeight = Math.max(0, viewportHeight - safeAreaTop - bottomBuffer);
  const rectBottom = rectTop + rowHeight;

  if (!force) {
    const fullyVisible = rectTop >= safeAreaTop && rectBottom <= viewportHeight - bottomBuffer;
    if (fullyVisible) return null;
  }

  const desiredViewportTop =
    rowHeight >= safeAreaHeight
      ? safeAreaTop
      : safeAreaTop + (safeAreaHeight - rowHeight) / 2;

  const targetY = scrollY + rectTop - desiredViewportTop;
  return Math.max(0, targetY);
}
