/**
 * Subtelne fanfary milestone — generowane przez Web Audio API.
 * Brak zewnętrznych assetów. Cztery warianty z rosnącą intensywnością:
 *
 *   7   → "Tydzień konsekwencji"  — czysta triada wznosząca + lekki shimmer
 *  14   → "Dwa tygodnie nawyku"   — + bas (C4), pełniejsza barwa, dłuższe wybrzmienie
 *  30   → "Miesiąc dyscypliny"    — + 5-nutowy arpeggio i akord sus→maj, kaskada shimmer
 * 100   → "Setka — elita"          — pełna triumfalna fanfara: oktawy basu, dwa fan-fanfare hity, długi ogon
 *
 * Toggle wyciszenia trzymany w localStorage (klucz: cml-workout-fanfare-v1).
 */

const STORAGE_KEY = "cml-workout-fanfare-v1";

export const isFanfareEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
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

type OscType = OscillatorType;
type Note = {
  freq: number;
  start: number;
  duration: number;
  gain?: number;
  type?: OscType;
  /** Subtelna druga oktawa (triangle) dla bogatszej barwy */
  withHarmonic?: boolean;
};

type FanfareSpec = {
  master: number; // główny gain (0..1) — ostrożnie, sumują się oscylatory
  filterFreq: number; // low-pass cutoff
  notes: Note[];
  /** Pingi shimmer: [freq, startOffset] */
  shimmer: Array<{ freq: number; start: number; gain?: number; duration?: number }>;
  /** Bas (głęboka stopa) — opcjonalnie */
  bass?: Note[];
  /** Czas zamknięcia kontekstu (sekundy) */
  closeAfterSec: number;
};

// ===== Pomocnicze nuty (Hz) =====
const C4 = 261.63;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880.0;
const B5 = 987.77;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;
const C7 = 2093.0;

const SPECS: Record<7 | 14 | 30 | 100, FanfareSpec> = {
  // ── 7 dni — baseline (zachowane oryginalne brzmienie) ─────────────
  7: {
    master: 0.18,
    filterFreq: 4200,
    notes: [
      { freq: C5, start: 0.0, duration: 0.55, gain: 0.55, withHarmonic: true },
      { freq: E5, start: 0.09, duration: 0.55, gain: 0.55, withHarmonic: true },
      { freq: G5, start: 0.18, duration: 0.6, gain: 0.6, withHarmonic: true },
      { freq: C6, start: 0.32, duration: 0.85, gain: 0.65, withHarmonic: true },
    ],
    shimmer: [
      { freq: G6, start: 0.45, gain: 0.12, duration: 0.35 },
      { freq: C7, start: 0.53, gain: 0.12, duration: 0.35 },
      { freq: 2637, start: 0.61, gain: 0.12, duration: 0.35 },
    ],
    closeAfterSec: 1.8,
  },

  // ── 14 dni — + bas, dłuższe wybrzmienie, pełniejsza końcówka ─────
  14: {
    master: 0.2,
    filterFreq: 4600,
    bass: [
      { freq: C4, start: 0.0, duration: 1.4, gain: 0.45, type: "sine" },
    ],
    notes: [
      { freq: C5, start: 0.0, duration: 0.6, gain: 0.55, withHarmonic: true },
      { freq: E5, start: 0.1, duration: 0.6, gain: 0.55, withHarmonic: true },
      { freq: G5, start: 0.2, duration: 0.65, gain: 0.6, withHarmonic: true },
      { freq: C6, start: 0.34, duration: 1.0, gain: 0.7, withHarmonic: true },
      { freq: E6, start: 0.42, duration: 0.95, gain: 0.5, withHarmonic: false },
    ],
    shimmer: [
      { freq: G6, start: 0.5, gain: 0.13, duration: 0.4 },
      { freq: C7, start: 0.6, gain: 0.13, duration: 0.4 },
      { freq: 2637, start: 0.7, gain: 0.12, duration: 0.4 },
      { freq: 3136, start: 0.8, gain: 0.1, duration: 0.4 },
    ],
    closeAfterSec: 2.2,
  },

  // ── 30 dni — arpeggio 5-nut + akord sus→maj + kaskada shimmer ────
  30: {
    master: 0.22,
    filterFreq: 5200,
    bass: [
      { freq: C4, start: 0.0, duration: 1.8, gain: 0.5, type: "sine" },
      { freq: G5 / 2 /* G4 */, start: 0.55, duration: 1.3, gain: 0.32, type: "sine" },
    ],
    notes: [
      // Wznoszące arpeggio
      { freq: C5, start: 0.0, duration: 0.45, gain: 0.55, withHarmonic: true },
      { freq: E5, start: 0.1, duration: 0.45, gain: 0.55, withHarmonic: true },
      { freq: G5, start: 0.2, duration: 0.45, gain: 0.6, withHarmonic: true },
      { freq: C6, start: 0.3, duration: 0.5, gain: 0.65, withHarmonic: true },
      { freq: E6, start: 0.4, duration: 0.55, gain: 0.6, withHarmonic: true },
      // Sus4 → maj resolution na końcu
      { freq: A5, start: 0.7, duration: 0.55, gain: 0.45, withHarmonic: false },
      { freq: G5, start: 0.95, duration: 1.1, gain: 0.55, withHarmonic: true },
      { freq: C6, start: 0.95, duration: 1.1, gain: 0.55, withHarmonic: true },
      { freq: E6, start: 0.95, duration: 1.1, gain: 0.55, withHarmonic: true },
    ],
    shimmer: [
      { freq: G6, start: 0.55, gain: 0.13, duration: 0.45 },
      { freq: C7, start: 0.65, gain: 0.13, duration: 0.45 },
      { freq: 2637, start: 0.75, gain: 0.13, duration: 0.45 },
      { freq: 3136, start: 0.85, gain: 0.12, duration: 0.45 },
      { freq: 3520, start: 0.95, gain: 0.1, duration: 0.5 },
      { freq: 4186, start: 1.05, gain: 0.08, duration: 0.55 },
    ],
    closeAfterSec: 2.8,
  },

  // ── 100 dni — pełna kulminacja: dwa hity fanfary + długi ogon ────
  100: {
    master: 0.24,
    filterFreq: 6000,
    bass: [
      // Oktawy basu (C3 + C4) — fundament
      { freq: C4 / 2, start: 0.0, duration: 2.6, gain: 0.5, type: "sine" },
      { freq: C4, start: 0.0, duration: 2.6, gain: 0.4, type: "sine" },
      // Dominantowy push przed kulminacją
      { freq: G5 / 2, start: 0.85, duration: 0.5, gain: 0.45, type: "sine" },
      // Powrót na tonikę
      { freq: C4, start: 1.4, duration: 1.6, gain: 0.45, type: "sine" },
    ],
    notes: [
      // Pierwsza fanfara — wznosząca
      { freq: C5, start: 0.0, duration: 0.35, gain: 0.55, withHarmonic: true },
      { freq: E5, start: 0.1, duration: 0.35, gain: 0.55, withHarmonic: true },
      { freq: G5, start: 0.2, duration: 0.4, gain: 0.6, withHarmonic: true },
      { freq: C6, start: 0.3, duration: 0.5, gain: 0.7, withHarmonic: true },
      { freq: E6, start: 0.4, duration: 0.55, gain: 0.65, withHarmonic: true },
      { freq: G6, start: 0.5, duration: 0.6, gain: 0.55, withHarmonic: false },
      // Druga fanfara (hit) — pełny akord majorowy z B5 (leading tone)
      { freq: B5, start: 0.95, duration: 0.4, gain: 0.45, withHarmonic: false },
      { freq: C6, start: 1.25, duration: 1.4, gain: 0.7, withHarmonic: true },
      { freq: E6, start: 1.25, duration: 1.4, gain: 0.6, withHarmonic: true },
      { freq: G6, start: 1.25, duration: 1.4, gain: 0.5, withHarmonic: false },
      { freq: C7, start: 1.32, duration: 1.3, gain: 0.45, withHarmonic: false },
    ],
    shimmer: [
      // Dwie kaskady shimmer (pierwsza i druga fanfara)
      { freq: G6, start: 0.55, gain: 0.13, duration: 0.4 },
      { freq: C7, start: 0.63, gain: 0.13, duration: 0.4 },
      { freq: 2637, start: 0.71, gain: 0.13, duration: 0.4 },
      { freq: 3136, start: 0.79, gain: 0.11, duration: 0.4 },
      // Druga kaskada
      { freq: G6, start: 1.4, gain: 0.13, duration: 0.55 },
      { freq: C7, start: 1.5, gain: 0.13, duration: 0.55 },
      { freq: 2637, start: 1.6, gain: 0.13, duration: 0.55 },
      { freq: 3136, start: 1.7, gain: 0.12, duration: 0.55 },
      { freq: 3520, start: 1.8, gain: 0.1, duration: 0.6 },
      { freq: 4186, start: 1.9, gain: 0.08, duration: 0.7 },
      { freq: 5274, start: 2.0, gain: 0.06, duration: 0.8 },
    ],
    closeAfterSec: 3.6,
  },
};

const isMilestone = (n: number): n is 7 | 14 | 30 | 100 =>
  n === 7 || n === 14 || n === 30 || n === 100;

/**
 * Odtwórz fanfarę odpowiadającą danemu milestone.
 * Domyślnie 7-dniowy wariant (subtelny baseline) — używany też do podglądu w UI.
 */
export const playMilestoneFanfare = (milestone?: number) => {
  if (typeof window === "undefined") return;
  if (!isFanfareEnabled()) return;

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  const spec: FanfareSpec = milestone && isMilestone(milestone) ? SPECS[milestone] : SPECS[7];

  let ctx: AudioContext;
  try {
    ctx = new AudioCtx();
  } catch {
    return;
  }

  // Master gain
  const master = ctx.createGain();
  master.gain.value = spec.master;
  master.connect(ctx.destination);

  // Low-pass dla cieplejszego brzmienia
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = spec.filterFreq;
  filter.Q.value = 0.7;
  filter.connect(master);

  const now = ctx.currentTime;

  const scheduleNote = (
    { freq, start, duration, gain = 0.5, type = "sine", withHarmonic = false }: Note,
    bus: AudioNode,
  ) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0, now + start);
    noteGain.gain.linearRampToValueAtTime(gain, now + start + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    osc.connect(noteGain);
    noteGain.connect(bus);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);

    if (withHarmonic) {
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.value = freq * 2;
      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0, now + start);
      harmonicGain.gain.linearRampToValueAtTime(gain * 0.18, now + start + 0.04);
      harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc2.connect(harmonicGain);
      harmonicGain.connect(bus);
      osc2.start(now + start);
      osc2.stop(now + start + duration + 0.05);
    }
  };

  // Bas (jeśli jest) — przez filtr, z lekkim podbiciem niskich
  if (spec.bass) {
    spec.bass.forEach((n) => scheduleNote({ ...n, type: n.type ?? "sine" }, filter));
  }

  // Główne nuty — przez filtr
  spec.notes.forEach((n) => scheduleNote(n, filter));

  // Shimmer — bezpośrednio do master (jasne, bez low-passa)
  spec.shimmer.forEach(({ freq, start, gain = 0.12, duration = 0.35 }) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now + start);
    g.gain.linearRampToValueAtTime(gain, now + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  });

  // Auto-close kontekstu po wybrzmieniu
  window.setTimeout(() => {
    ctx.close().catch(() => {});
  }, spec.closeAfterSec * 1000);
};
