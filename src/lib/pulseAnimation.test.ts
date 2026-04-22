import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  applyPulseSequence,
  type PulsePrefs,
  type PulseTimerMap,
} from "./pulseAnimation";

// Regresja: obrys fokusowy MUSI pojawić się natychmiast po skoku i NIE wolno mu
// zniknąć przed czasem (1700ms pulse + afterglowMs + 100ms zapasu). Te testy
// pilnują kontraktu wizualnego — gdy ktoś podkręci timer/zrefaktoruje sekwencję,
// jeden z asertów wybuchnie zamiast cichej regresji w produkcji.
//
// jsdom nie odpala animacji CSS — testujemy klasy + CSS variables + cykl życia
// timerów. To wystarczy, bo same animacje są zdefiniowane w index.css i ich
// zachowanie zależy WYŁĄCZNIE od (a) obecności klas, (b) wartości CSS vars.

const DEFAULT_PREFS: PulsePrefs = {
  afterglowMs: 2400,
  ringWidthPx: 2,
  glowIntensity: 55,
};

function makeRow(): HTMLElement {
  const tr = document.createElement("tr");
  document.body.appendChild(tr);
  return tr;
}

describe("applyPulseSequence — regresja obrysu fokusowego po skoku", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  it("dodaje klasę animate-jump-pulse NATYCHMIAST po wywołaniu (obrys widoczny)", () => {
    const row = makeRow();
    applyPulseSequence(row, DEFAULT_PREFS, new WeakMap());
    // Bez postępu zegara — pulse musi być od razu aktywny.
    expect(row.classList.contains("animate-jump-pulse")).toBe(true);
  });

  it("ustawia wszystkie CSS variables sterujące keyframes (ring/glow/afterglow)", () => {
    const row = makeRow();
    applyPulseSequence(row, DEFAULT_PREFS, new WeakMap());
    // Te zmienne czytane są przez keyframes `jump-pulse-cfg` i `jump-afterglow-cfg`
    // w index.css przez var(...). Brak którejkolwiek = animacja nie wyrenderuje
    // konfigurowalnego obrysu (fallback do statycznych wartości z tailwind config).
    expect(row.style.getPropertyValue("--jump-ring-w")).toBe("2px");
    expect(row.style.getPropertyValue("--jump-glow-blur")).toBe("33px"); // 20 + 0.55*24 = 33.2 → 33
    expect(row.style.getPropertyValue("--jump-glow-spread")).toBe("6px"); // 2 + 0.55*8 = 6.4 → 6
    expect(row.style.getPropertyValue("--jump-glow-opacity")).toBe("0.55"); // 0.25 + 0.55*0.55 = 0.5525 → 0.55
    expect(row.style.getPropertyValue("--jump-afterglow-duration")).toBe("2400ms");
  });

  it("po 1700ms przełącza pulse → afterglow (płynna ciągłość obrysu, brak luki)", () => {
    const row = makeRow();
    applyPulseSequence(row, DEFAULT_PREFS, new WeakMap());

    // Tuż przed przełączeniem (1699ms) — wciąż pulse, jeszcze nie afterglow.
    vi.advanceTimersByTime(1699);
    expect(row.classList.contains("animate-jump-pulse")).toBe(true);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(false);

    // Dokładnie 1700ms — przełączenie. Pulse znika, afterglow startuje.
    vi.advanceTimersByTime(1);
    expect(row.classList.contains("animate-jump-pulse")).toBe(false);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(true);
  });

  it("obrys NIE znika przed czasem — afterglow trwa pełne afterglowMs po starcie", () => {
    const row = makeRow();
    applyPulseSequence(row, DEFAULT_PREFS, new WeakMap()); // afterglowMs=2400
    // Łączny budżet: 1700 (pulse) + 2400 (afterglow) + 100 (zapas) = 4200ms.

    // Tuż przed cleanup'em (4199ms) — afterglow MUSI być wciąż aktywny.
    vi.advanceTimersByTime(4199);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(true);
    // CSS vars też muszą być utrzymane przez cały czas trwania animacji.
    expect(row.style.getPropertyValue("--jump-ring-w")).toBe("2px");

    // Po 4200ms — cleanup. Klasy i CSS vars czyszczone.
    vi.advanceTimersByTime(1);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(false);
    expect(row.classList.contains("animate-jump-pulse")).toBe(false);
    expect(row.style.getPropertyValue("--jump-ring-w")).toBe("");
    expect(row.style.getPropertyValue("--jump-afterglow-duration")).toBe("");
  });

  it("custom afterglowMs (slider 6000) wydłuża widoczność obrysu proporcjonalnie", () => {
    const row = makeRow();
    applyPulseSequence(
      row,
      { ...DEFAULT_PREFS, afterglowMs: 6000 },
      new WeakMap(),
    );
    // Total: 1700 + 6000 + 100 = 7800ms.

    // Po 4000ms (gdzie default już byłby blisko końca) — wciąż aktywny.
    vi.advanceTimersByTime(4000);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(true);

    // Tuż przed końcem (7799ms) — wciąż widoczny.
    vi.advanceTimersByTime(3799);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(true);

    vi.advanceTimersByTime(1);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(false);
  });

  it("prefers-reduced-motion: reduce → pomija animację (zwraca null, klas nie dodaje)", () => {
    const row = makeRow();
    const handle = applyPulseSequence(row, DEFAULT_PREFS, new WeakMap(), {
      reducedMotion: true,
    });
    expect(handle).toBeNull();
    expect(row.classList.contains("animate-jump-pulse")).toBe(false);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(false);
    expect(row.style.getPropertyValue("--jump-ring-w")).toBe("");
  });

  it("HC: dodaje klasę jump-hc + ringWidth +2 (selektory .jump-hc.animate-jump-* w CSS)", () => {
    const row = makeRow();
    applyPulseSequence(row, DEFAULT_PREFS, new WeakMap(), { highContrast: true });
    expect(row.classList.contains("jump-hc")).toBe(true);
    // ringWidthPx=2 + HC=2 → 4px (grubszy obrys w trybie HC).
    expect(row.style.getPropertyValue("--jump-ring-w")).toBe("4px");
  });

  it("HC: cleanup usuwa klasę jump-hc razem z animate-jump-*", () => {
    const row = makeRow();
    applyPulseSequence(row, DEFAULT_PREFS, new WeakMap(), { highContrast: true });
    vi.advanceTimersByTime(1700 + DEFAULT_PREFS.afterglowMs + 100);
    expect(row.classList.contains("jump-hc")).toBe(false);
    expect(row.classList.contains("animate-jump-pulse")).toBe(false);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(false);
  });
});

describe("applyPulseSequence — szybki Next→Prev na ten sam wiersz (race timery)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  it("re-trigger w trakcie pulse'a anuluje stary cleanup i restartuje sekwencję", () => {
    const row = makeRow();
    const timers: PulseTimerMap = new WeakMap();

    applyPulseSequence(row, DEFAULT_PREFS, timers); // T=0
    vi.advanceTimersByTime(500); // jesteśmy w środku pulse'a

    // Drugi skok na ten sam wiersz — stary cleanup (zaplanowany na T=4200) MUSI
    // zostać anulowany, inaczej uciąłby drugą animację o ~500ms za wcześnie.
    applyPulseSequence(row, DEFAULT_PREFS, timers); // T=500 (nowy start)

    // Klasa pulse musi być aktywna (drugi pulse zaczął się od zera).
    expect(row.classList.contains("animate-jump-pulse")).toBe(true);

    // Stary cleanup byłby na T=4200 (4200 - 500 = 3700ms od teraz).
    // Po 3700ms NOWY pulse wciąż musi być żywy (jest 2200ms od restartu = wciąż w afterglow).
    vi.advanceTimersByTime(3700);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(true);

    // Pełny budżet od restartu = 4200ms (T=500 + 4200 = 4700). Po dodatkowych 500ms cleanup.
    vi.advanceTimersByTime(500);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(false);
  });

  it("re-trigger w trakcie afterglow'a też restartuje pełną sekwencję", () => {
    const row = makeRow();
    const timers: PulseTimerMap = new WeakMap();

    applyPulseSequence(row, DEFAULT_PREFS, timers);
    vi.advanceTimersByTime(2500); // pulse skończony, jesteśmy w afterglow (start: 1700)
    expect(row.classList.contains("animate-jump-afterglow")).toBe(true);

    applyPulseSequence(row, DEFAULT_PREFS, timers); // restart
    // Po restarcie znowu pulse, NIE afterglow.
    expect(row.classList.contains("animate-jump-pulse")).toBe(true);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(false);

    // Nowy budżet 4200ms — afterglow musi dotrwać do końca.
    vi.advanceTimersByTime(4199);
    expect(
      row.classList.contains("animate-jump-pulse") ||
        row.classList.contains("animate-jump-afterglow"),
    ).toBe(true);
  });

  it("re-trigger anuluje __afterglowTimer (przejście pulse→afterglow nie zaplanowane 2×)", () => {
    const row = makeRow();
    const timers: PulseTimerMap = new WeakMap();

    applyPulseSequence(row, DEFAULT_PREFS, timers);
    vi.advanceTimersByTime(800); // w trakcie pulse'a, przed planowanym przełączeniem (1700)
    applyPulseSequence(row, DEFAULT_PREFS, timers); // restart — stary __afterglowTimer musi zniknąć

    // Po 1700ms od pierwszego startu (czyli 900ms od restartu) — gdyby stary timer
    // nadal żył, dodałby afterglow ZA WCZEŚNIE i usunął pulse.
    vi.advanceTimersByTime(900);
    expect(row.classList.contains("animate-jump-pulse")).toBe(true);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(false);

    // Nowy timer zadziała na T=500+1700=2200 (czyli +1300ms od teraz).
    vi.advanceTimersByTime(800);
    expect(row.classList.contains("animate-jump-afterglow")).toBe(true);
  });
});

describe("applyPulseSequence — handle return value", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  it("zwraca handle z totalDurationMs odpowiadającym budżetowi (1700 + afterglow + 100)", () => {
    const row = makeRow();
    const handle = applyPulseSequence(row, DEFAULT_PREFS, new WeakMap());
    expect(handle).not.toBeNull();
    expect(handle!.totalDurationMs).toBe(4200); // 1700 + 2400 + 100

    const handle6s = applyPulseSequence(
      row,
      { ...DEFAULT_PREFS, afterglowMs: 6000 },
      new WeakMap(),
    );
    expect(handle6s!.totalDurationMs).toBe(7800);
  });

  it("zwraca dwa różne ID timerów (afterglow + cleanup)", () => {
    const row = makeRow();
    const handle = applyPulseSequence(row, DEFAULT_PREFS, new WeakMap());
    expect(handle!.afterglowTimerId).not.toBe(handle!.cleanupTimerId);
    expect(typeof handle!.afterglowTimerId).toBe("number");
    expect(typeof handle!.cleanupTimerId).toBe("number");
  });
});

describe("applyPulseSequence — preferencje stylu (slidery)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  it("glowIntensity=0 → minimalny halo (blur 20px, spread 2px, opacity 0.25)", () => {
    const row = makeRow();
    applyPulseSequence(
      row,
      { afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 0 },
      new WeakMap(),
    );
    expect(row.style.getPropertyValue("--jump-glow-blur")).toBe("20px");
    expect(row.style.getPropertyValue("--jump-glow-spread")).toBe("2px");
    expect(row.style.getPropertyValue("--jump-glow-opacity")).toBe("0.25");
  });

  it("glowIntensity=100 → maksymalny halo (blur 44px, spread 10px, opacity 0.80)", () => {
    const row = makeRow();
    applyPulseSequence(
      row,
      { afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 100 },
      new WeakMap(),
    );
    expect(row.style.getPropertyValue("--jump-glow-blur")).toBe("44px");
    expect(row.style.getPropertyValue("--jump-glow-spread")).toBe("10px");
    expect(row.style.getPropertyValue("--jump-glow-opacity")).toBe("0.80");
  });

  it("ringWidthPx=6 (max slider) → grubość 6px (HC=8px)", () => {
    const row = makeRow();
    applyPulseSequence(
      row,
      { afterglowMs: 2400, ringWidthPx: 6, glowIntensity: 55 },
      new WeakMap(),
    );
    expect(row.style.getPropertyValue("--jump-ring-w")).toBe("6px");

    const row2 = makeRow();
    applyPulseSequence(
      row2,
      { afterglowMs: 2400, ringWidthPx: 6, glowIntensity: 55 },
      new WeakMap(),
      { highContrast: true },
    );
    expect(row2.style.getPropertyValue("--jump-ring-w")).toBe("8px");
  });
});
