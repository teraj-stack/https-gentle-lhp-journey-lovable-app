/**
 * Test jednostkowy: weryfikuje, że `toggle()` (eksportowany jako `setEnabled`
 * z hooka `useAutoSave`) ustawia:
 *  - `lastChangeSource` na `"local"` (nie `"remote"` — to ważne dla logiki
 *    kolorowania etykiety „Ostatnia zmiana"; zielony akcent rezerwujemy
 *    WYŁĄCZNIE dla synchronizacji między kartami),
 *  - `lastChangeAt` na aktualny timestamp (Date.now() w momencie wywołania).
 *
 * Używamy `vi.useFakeTimers()` + `vi.setSystemTime()` żeby `Date.now()` był
 * deterministyczny i porównanie było dokładne, a nie „blisko".
 *
 * Uwaga: hook używa BroadcastChannel + localStorage. jsdom nie ma BC z definicji,
 * więc hook wystartuje w trybie storage-fallback — to OK dla tego testu, bo
 * `toggle()` ustawia source/at PRZED próbą BC postMessage, więc fallback
 * nie wpływa na testowane pola.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "./useAutoSave";

const STORAGE_KEY = "cml.hemoroidy.autosave.v1";
const DEGRADATION_HISTORY_KEY = "cml.autosave.degradation-history.v1";
const FROZEN_NOW = 1_700_000_000_000; // 2023-11-14T22:13:20Z — czytelna stała

describe("useAutoSave – toggle() ustawia lastChangeSource i lastChangeAt", () => {
  beforeEach(() => {
    // Czyścimy klucze, żeby kolejne testy nie dziedziczyły poprzedniego stanu
    // (auto-zapis ON/OFF lub historia degradacji api-missing).
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(DEGRADATION_HISTORY_KEY);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FROZEN_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(DEGRADATION_HISTORY_KEY);
  });

  it("po mount: lastChangeSource === null, lastChangeAt === null", () => {
    const { result } = renderHook(() => useAutoSave());
    expect(result.current.lastChangeSource).toBeNull();
    expect(result.current.lastChangeAt).toBeNull();
  });

  it("toggle(true) ustawia source na 'local' i timestamp na Date.now()", () => {
    const { result } = renderHook(() => useAutoSave());

    act(() => {
      result.current.setEnabled(true);
    });

    expect(result.current.lastChangeSource).toBe("local");
    expect(result.current.lastChangeAt).toBe(FROZEN_NOW);
    expect(result.current.enabled).toBe(true);
  });

  it("toggle(false) też ustawia source na 'local' (kierunek toggle bez znaczenia)", () => {
    const { result } = renderHook(() => useAutoSave());

    act(() => {
      result.current.setEnabled(true);
    });
    // Przesuwamy zegar, żeby drugi toggle miał inny timestamp niż pierwszy
    // — to chroni przed false-positive (gdyby setLastChangeAt nie odpaliło
    // przy drugim wywołaniu, test wciąż przeszedłby z FROZEN_NOW).
    const LATER = FROZEN_NOW + 5_000;
    vi.setSystemTime(new Date(LATER));

    act(() => {
      result.current.setEnabled(false);
    });

    expect(result.current.lastChangeSource).toBe("local");
    expect(result.current.lastChangeAt).toBe(LATER);
    expect(result.current.enabled).toBe(false);
  });

  it("kolejne toggle aktualizuje lastChangeAt do najnowszego Date.now()", () => {
    const { result } = renderHook(() => useAutoSave());

    act(() => {
      result.current.setEnabled(true);
    });
    const firstAt = result.current.lastChangeAt;
    expect(firstAt).toBe(FROZEN_NOW);

    const NEXT = FROZEN_NOW + 1_234;
    vi.setSystemTime(new Date(NEXT));

    act(() => {
      result.current.setEnabled(false);
    });

    expect(result.current.lastChangeAt).toBe(NEXT);
    expect(result.current.lastChangeAt).not.toBe(firstAt);
    // Source nadal 'local' — ważne, żeby nie pomylić z 'remote'.
    expect(result.current.lastChangeSource).toBe("local");
  });
});
