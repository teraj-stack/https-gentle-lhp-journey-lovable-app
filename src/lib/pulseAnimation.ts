/**
 * DOM-side helper aplikujący sekwencję animacji „jump-pulse → jump-afterglow"
 * na elemencie wiersza po skoku nawigacji (Next/Prev/Enter/J/K).
 *
 * Wyciągnięte z `AdminSystemHealth.tsx#pulseRow` żeby pokryć testem jednostkowym
 * (scenariusze regresji obrysu fokusowego: czy ring pojawia się po skoku, czy
 * nie znika przed czasem, czy szybkie Next→Prev nie ucina drugiej animacji).
 *
 * Kontrakt:
 *  - Czyści poprzednie timery na elemencie (WeakMap + property `__afterglowTimer`)
 *    zanim ustawi nowe — szybki re-trigger zaczyna od czystej karty.
 *  - Wymusza force-reflow (`void el.offsetWidth`) przed dodaniem klasy żeby restart
 *    animacji zadziałał (CSS animation nie restartuje się przy ponownym dodaniu
 *    tej samej klasy bez reflow).
 *  - Sekwencja: `animate-jump-pulse` (1700ms) → `animate-jump-afterglow` (afterglowMs)
 *    → cleanup wszystkich klas i CSS vars (w sumie 1700 + afterglowMs + 100ms).
 *  - Respektuje `prefers-reduced-motion: reduce` — wtedy nic nie robi (zwraca null).
 *  - High-contrast: dodaje klasę `jump-hc` która aktywuje selektory
 *    `.jump-hc.animate-jump-*` w index.css (grubsze ringi + jaśniejsze halo).
 */

export interface PulsePrefs {
  /** Czas trwania afterglow w ms (slider 800–6000) */
  afterglowMs: number;
  /** Bazowa grubość ringa w px (slider 1–6); HC dodaje +2 */
  ringWidthPx: number;
  /** Intensywność halo 0–100 (mapowana na blur 20–44px, spread 2–10px, opacity 0.25–0.80) */
  glowIntensity: number;
}

export interface PulseRowOptions {
  /** Włącza warianty HC (klasa `jump-hc` + ringWidth+2) */
  highContrast?: boolean;
  /** Czy `prefers-reduced-motion: reduce` jest aktywny — wtedy pomijamy animację */
  reducedMotion?: boolean;
}

export interface PulseHandle {
  /** Timer ID dla przejścia pulse→afterglow (1700ms) */
  afterglowTimerId: number;
  /** Timer ID dla finalnego cleanup (1700 + afterglowMs + 100ms) */
  cleanupTimerId: number;
  /** Łączny czas trwania sekwencji od T0 do cleanup (ms) */
  totalDurationMs: number;
}

/**
 * Mapa per-element trzymająca cleanup-timer poprzedniego pulse'u — szybki Next→Prev
 * na ten sam wiersz musi anulować stary cleanup zanim ustawi nowy, inaczej
 * stary timeout uciąłby nową animację o pozostałe ms.
 *
 * Eksportowana jako helper (nie singleton modułu) żeby `AdminSystemHealth.tsx`
 * mógł trzymać własną instancję przez `useRef<WeakMap>` (per-mount lifecycle).
 */
export type PulseTimerMap = WeakMap<HTMLElement, number>;

/**
 * Aplikuje pełną sekwencję pulse → afterglow → cleanup na elemencie.
 * Zwraca `null` gdy pominięte (reduced-motion), inaczej handle z timerami i totalem.
 *
 * Wstrzykiwane zależności (`setTimeout`/`clearTimeout`) ułatwiają testowanie z fake timers
 * — w produkcji wołamy z `window.setTimeout`/`window.clearTimeout`.
 */
export function applyPulseSequence(
  el: HTMLElement,
  prefs: PulsePrefs,
  pulseTimers: PulseTimerMap,
  opts: PulseRowOptions = {},
  schedule: {
    setTimeout: (fn: () => void, ms: number) => number;
    clearTimeout: (id: number) => void;
  } = {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  },
): PulseHandle | null {
  if (opts.reducedMotion) return null;

  // 1) Anuluj poprzedni cleanup-timer (jeśli był) — zapobiega ucięciu nowej animacji.
  const prevCleanup = pulseTimers.get(el);
  if (prevCleanup !== undefined) {
    schedule.clearTimeout(prevCleanup);
    pulseTimers.delete(el);
  }
  // 2) Anuluj poprzedni afterglow-timer (osobny, trzymany jako property na elemencie).
  const elWithTimer = el as HTMLElement & { __afterglowTimer?: number };
  if (elWithTimer.__afterglowTimer !== undefined) {
    schedule.clearTimeout(elWithTimer.__afterglowTimer);
    delete elWithTimer.__afterglowTimer;
  }

  // 3) Reset wszystkich klas animacji (idempotentny start od zera).
  el.classList.remove("animate-jump-pulse", "animate-jump-afterglow", "jump-hc");

  // 4) HC marker — selektory `.jump-hc.animate-jump-*` w index.css czytają to.
  if (opts.highContrast) {
    el.classList.add("jump-hc");
  }

  // 5) Aplikuj preferencje stylu jako CSS custom properties — keyframes czytają je przez var().
  const ringW = opts.highContrast ? prefs.ringWidthPx + 2 : prefs.ringWidthPx;
  const glow = prefs.glowIntensity / 100;
  el.style.setProperty("--jump-ring-w", `${ringW}px`);
  el.style.setProperty("--jump-glow-blur", `${Math.round(20 + glow * 24)}px`);
  el.style.setProperty("--jump-glow-spread", `${Math.round(2 + glow * 8)}px`);
  el.style.setProperty("--jump-glow-opacity", (0.25 + glow * 0.55).toFixed(2));
  el.style.setProperty("--jump-afterglow-duration", `${prefs.afterglowMs}ms`);

  // 6) Force reflow + start pulse'u.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  void el.offsetWidth;
  el.classList.add("animate-jump-pulse");

  // 7) Po 1700ms (lekkie nakładanie z końcem pulse'a) → przełącz na afterglow.
  const afterglowTimerId = schedule.setTimeout(() => {
    el.classList.remove("animate-jump-pulse");
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    void el.offsetWidth;
    el.classList.add("animate-jump-afterglow");
  }, 1700);
  elWithTimer.__afterglowTimer = afterglowTimerId;

  // 8) Cleanup po pełnej sekwencji (1700 pulse + afterglow + 100ms zapasu).
  const totalDurationMs = 1700 + prefs.afterglowMs + 100;
  const cleanupTimerId = schedule.setTimeout(() => {
    el.classList.remove(
      "animate-jump-pulse",
      "animate-jump-afterglow",
      "jump-hc",
    );
    el.style.removeProperty("--jump-ring-w");
    el.style.removeProperty("--jump-glow-blur");
    el.style.removeProperty("--jump-glow-spread");
    el.style.removeProperty("--jump-glow-opacity");
    el.style.removeProperty("--jump-afterglow-duration");
    pulseTimers.delete(el);
    delete elWithTimer.__afterglowTimer;
  }, totalDurationMs);
  pulseTimers.set(el, cleanupTimerId);

  return { afterglowTimerId, cleanupTimerId, totalDurationMs };
}
