/**
 * Subtelne fanfary milestone — generowane przez Web Audio API.
 * Brak zewnętrznych assetów, brak kosztów. Krótka triada C-E-G + delikatny shimmer.
 *
 * Toggle wyciszenia trzymany w localStorage (klucz: cml-workout-fanfare-v1).
 * Wartość: "on" (default) | "off".
 */

const STORAGE_KEY = "cml-workout-fanfare-v1";

export const isFanfareEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    // domyślnie ON — gdy null/undefined zwróć true
    return v !== "off";
  } catch {
    return true;
  }
};

export const setFanfareEnabled = (enabled: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // ignore quota errors
  }
};

type Note = { freq: number; start: number; duration: number; gain?: number };

/** Subtelna triada wznosząca C5-E5-G5-C6 z delikatnym shimmer. */
export const playMilestoneFanfare = () => {
  if (typeof window === "undefined") return;
  if (!isFanfareEnabled()) return;

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  let ctx: AudioContext;
  try {
    ctx = new AudioCtx();
  } catch {
    return;
  }

  // Master gain — bardzo subtelne (premium, nie krzykliwe)
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  // Lekki low-pass dla cieplejszego brzmienia
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 4200;
  filter.Q.value = 0.7;
  filter.connect(master);

  const now = ctx.currentTime;

  // Triada wznosząca C5-E5-G5 + akcent C6
  const notes: Note[] = [
    { freq: 523.25, start: 0.0, duration: 0.55, gain: 0.55 }, // C5
    { freq: 659.25, start: 0.09, duration: 0.55, gain: 0.55 }, // E5
    { freq: 783.99, start: 0.18, duration: 0.6, gain: 0.6 }, // G5
    { freq: 1046.5, start: 0.32, duration: 0.85, gain: 0.65 }, // C6 — kulminacja
  ];

  notes.forEach(({ freq, start, duration, gain = 0.5 }) => {
    // Sinusoida — czysty, premium ton
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    // Druga oktawa subtelnie z przodu — bogatsza barwa
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = freq * 2;

    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0, now + start);
    noteGain.gain.linearRampToValueAtTime(gain, now + start + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(
      0.001,
      now + start + duration,
    );

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0, now + start);
    harmonicGain.gain.linearRampToValueAtTime(gain * 0.18, now + start + 0.04);
    harmonicGain.gain.exponentialRampToValueAtTime(
      0.001,
      now + start + duration,
    );

    osc.connect(noteGain);
    osc2.connect(harmonicGain);
    noteGain.connect(filter);
    harmonicGain.connect(filter);

    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
    osc2.start(now + start);
    osc2.stop(now + start + duration + 0.05);
  });

  // Shimmer — wysokie pasemka jak iskierki (3 krótkie pingi)
  [1568, 2093, 2637].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const start = 0.45 + i * 0.08;
    g.gain.setValueAtTime(0, now + start);
    g.gain.linearRampToValueAtTime(0.12, now + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + start + 0.35);
    osc.connect(g);
    g.connect(master);
    osc.start(now + start);
    osc.stop(now + start + 0.4);
  });

  // Auto-close kontekstu po wybrzmieniu
  window.setTimeout(() => {
    ctx.close().catch(() => {});
  }, 1800);
};
