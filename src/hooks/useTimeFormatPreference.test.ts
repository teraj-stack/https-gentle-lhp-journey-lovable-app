import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatFullTimestamp,
  formatTimestamp,
  isValidTimestamp,
  TIMESTAMP_FALLBACK_LABEL,
} from "./useTimeFormatPreference";

/**
 * Testy walidacji i ujednoliconego formatowania `lastChangeAt`.
 *
 * Cel: niezależnie od trybu (relative / clock / full) i niezależnie od źródła
 * timestampa (lokalny `Date.now()`, zdalny payload, persistowany w localStorage)
 * helpery muszą zwracać przewidywalny string. Brak walidacji skutkował kiedyś
 * pojawianiem się „Invalid Date" w UI po deserializacji starych payloadów.
 *
 * Czas zamrażamy w `beforeEach`, żeby wyniki dla trybu `relative` były powtarzalne.
 */

const FROZEN_NOW = new Date("2026-04-25T12:00:00Z").getTime();

describe("isValidTimestamp", () => {
  it("akceptuje dodatnie liczby skończone", () => {
    expect(isValidTimestamp(1)).toBe(true);
    expect(isValidTimestamp(Date.now())).toBe(true);
  });

  it("odrzuca null/undefined/string/object", () => {
    expect(isValidTimestamp(null)).toBe(false);
    expect(isValidTimestamp(undefined)).toBe(false);
    expect(isValidTimestamp("123")).toBe(false);
    expect(isValidTimestamp({})).toBe(false);
  });

  it("odrzuca NaN, Infinity, 0 i wartości ujemne", () => {
    expect(isValidTimestamp(NaN)).toBe(false);
    expect(isValidTimestamp(Infinity)).toBe(false);
    expect(isValidTimestamp(-Infinity)).toBe(false);
    expect(isValidTimestamp(0)).toBe(false);
    expect(isValidTimestamp(-1)).toBe(false);
  });
});

describe("formatTimestamp — walidacja wejścia", () => {
  it("zwraca fallback dla NaN niezależnie od trybu", () => {
    expect(formatTimestamp(NaN, "relative")).toBe(TIMESTAMP_FALLBACK_LABEL);
    expect(formatTimestamp(NaN, "clock")).toBe(TIMESTAMP_FALLBACK_LABEL);
    expect(formatTimestamp(NaN, "full")).toBe(TIMESTAMP_FALLBACK_LABEL);
  });

  it("zwraca fallback dla 0 i wartości ujemnych", () => {
    expect(formatTimestamp(0, "clock")).toBe(TIMESTAMP_FALLBACK_LABEL);
    expect(formatTimestamp(-1, "full")).toBe(TIMESTAMP_FALLBACK_LABEL);
  });

  it("traktuje nieznany tryb jak 'relative' (bezpieczny default)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
    // Tryb spoza unii — np. po deserializacji starszej wersji preferencji.
    const result = formatTimestamp(FROZEN_NOW - 30_000, "ancient" as never);
    expect(result).toBe("30 s temu");
    vi.useRealTimers();
  });
});

describe("formatTimestamp — tryb 'relative'", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("zwraca 'przed chwilą' dla różnicy <5s", () => {
    expect(formatTimestamp(FROZEN_NOW - 1_000, "relative")).toBe("przed chwilą");
    expect(formatTimestamp(FROZEN_NOW - 4_999, "relative")).toBe("przed chwilą");
  });

  it("formatuje sekundy/minuty/godziny zgodnie z progami", () => {
    expect(formatTimestamp(FROZEN_NOW - 30_000, "relative")).toBe("30 s temu");
    expect(formatTimestamp(FROZEN_NOW - 5 * 60_000, "relative")).toBe("5 min temu");
    expect(formatTimestamp(FROZEN_NOW - 3 * 3600_000, "relative")).toBe("3 h temu");
  });

  it("clampuje cofnięty zegar (timestamp z przyszłości) do 'przed chwilą'", () => {
    // Zegar systemowy cofnięty o 10 minut (np. NTP correction) — zamiast „—600 s temu"
    // powinniśmy pokazać neutralne „przed chwilą", żeby UI nie wyglądał na zepsuty.
    expect(formatTimestamp(FROZEN_NOW + 10 * 60_000, "relative")).toBe("przed chwilą");
  });
});

describe("formatTimestamp — tryb 'clock'", () => {
  it("renderuje samą godzinę w formacie HH:MM:SS pl-PL", () => {
    const ts = new Date("2026-04-25T08:09:07").getTime();
    const out = formatTimestamp(ts, "clock");
    // pl-PL używa dwukropków; sprawdzamy że to godzina z sekundami, a nie data.
    expect(out).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(out).not.toContain("Invalid");
  });
});

describe("formatFullTimestamp", () => {
  it("zwraca fallback dla niepoprawnego wejścia", () => {
    expect(formatFullTimestamp(NaN)).toBe(TIMESTAMP_FALLBACK_LABEL);
    expect(formatFullTimestamp(0)).toBe(TIMESTAMP_FALLBACK_LABEL);
  });

  it("renderuje pełną datę z miesiącem słownie i godziną HH:MM:SS", () => {
    const ts = new Date("2026-04-25T08:09:07").getTime();
    const out = formatFullTimestamp(ts);
    // Miesiąc słownie (pl-PL: „kwietnia"), rok 2026, godzina HH:MM:SS.
    expect(out).toContain("2026");
    expect(out.toLowerCase()).toContain("kwietnia");
    expect(out).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(out).not.toContain("Invalid");
  });

  it("formatTimestamp w trybie 'full' deleguje do formatFullTimestamp", () => {
    const ts = new Date("2026-04-25T08:09:07").getTime();
    expect(formatTimestamp(ts, "full")).toBe(formatFullTimestamp(ts));
  });
});
