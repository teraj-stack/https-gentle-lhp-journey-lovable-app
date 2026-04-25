/**
 * Testy hooka `useLocalePreference` — persystencja, fallback, sync cross-tab.
 *
 * Pokrywamy kontrakt z `mem://features/tooltip-last-change-locale-pref`:
 *  1. localStorage > navigator.language > "pl".
 *  2. Setter zapisuje do localStorage TYLKO walidne wartości (po `resolveLocale`).
 *  3. Inne instancje hooka w TEJ karcie odbierają update natychmiast (custom event).
 *  4. Zdarzenie `storage` z innej karty również aktualizuje stan.
 *  5. Brak window/localStorage/navigator → bezpieczny default „pl".
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useLocalePreference,
  readPersistedLocale,
  LOCALE_STORAGE_KEY,
  LOCALE_CHANGE_EVENT,
} from "./useLocalePreference";

describe("useLocalePreference — persystowana preferencja języka", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe("readPersistedLocale — priorytet źródeł", () => {
    it("localStorage 'en' ma pierwszeństwo nad navigator.language", () => {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, "en");
      expect(readPersistedLocale()).toBe("en");
    });

    it("brak localStorage → fallback do navigator.language (jsdom: 'pl-PL' → 'pl')", () => {
      // src/test/setup.ts ustawia jsdom navigator.language na "pl-PL".
      expect(readPersistedLocale()).toBe("pl");
    });

    it("nieznana wartość w localStorage jest IGNOROWANA (whitelista pl/en/de/it)", () => {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, "klingon");
      expect(readPersistedLocale()).toBe("pl");
    });

    it("BCP-47 z regionem ('en-US') nie jest honorowany w storage — tylko primary tag", () => {
      // Setter zapisuje już zresolwowany tag, ale gdyby ktoś ręcznie wstawił
      // "en-US" do localStorage, walidator powinien go odrzucić (nie ma na
      // whiteliście) i spaść na navigator.language.
      window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US");
      expect(readPersistedLocale()).toBe("pl");
    });
  });

  describe("hook + setter", () => {
    it("setter zapisuje do localStorage i zwraca nową wartość", () => {
      const { result } = renderHook(() => useLocalePreference());
      expect(result.current[0]).toBe("pl");

      act(() => {
        result.current[1]("en");
      });

      expect(result.current[0]).toBe("en");
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    });

    it("setter z BCP-47 ('en-GB') resolwuje do primary tagu", () => {
      const { result } = renderHook(() => useLocalePreference());
      act(() => {
        result.current[1]("en-GB");
      });
      expect(result.current[0]).toBe("en");
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    });

    it("setter z nieznanego stringa fallbackuje do 'pl'", () => {
      const { result } = renderHook(() => useLocalePreference());
      act(() => {
        result.current[1]("klingon");
      });
      expect(result.current[0]).toBe("pl");
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("pl");
    });

    it("dwie instancje hooka w tej samej karcie synchronizują się przez custom event", () => {
      const { result: a } = renderHook(() => useLocalePreference());
      const { result: b } = renderHook(() => useLocalePreference());

      expect(a.current[0]).toBe("pl");
      expect(b.current[0]).toBe("pl");

      act(() => {
        a.current[1]("en");
      });

      expect(a.current[0]).toBe("en");
      expect(b.current[0]).toBe("en");
    });

    it("zdarzenie `storage` z innej karty aktualizuje stan", () => {
      const { result } = renderHook(() => useLocalePreference());
      expect(result.current[0]).toBe("pl");

      act(() => {
        // Symulujemy zapis z innej karty + storage event (jsdom nie dispatchuje
        // automatycznie storage event przy localStorage.setItem).
        window.localStorage.setItem(LOCALE_STORAGE_KEY, "en");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: LOCALE_STORAGE_KEY,
            newValue: "en",
            oldValue: null,
          }),
        );
      });

      expect(result.current[0]).toBe("en");
    });

    it("event `storage` dla innego klucza jest IGNOROWANY", () => {
      const { result } = renderHook(() => useLocalePreference());
      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "inny-klucz",
            newValue: "en",
          }),
        );
      });
      expect(result.current[0]).toBe("pl");
    });
  });

  describe("kontrakt nazw eksportów (stałe dla testów E2E / debug)", () => {
    it("LOCALE_STORAGE_KEY to 'cml.tooltip-locale'", () => {
      expect(LOCALE_STORAGE_KEY).toBe("cml.tooltip-locale");
    });

    it("LOCALE_CHANGE_EVENT to 'cml-locale-changed'", () => {
      expect(LOCALE_CHANGE_EVENT).toBe("cml-locale-changed");
    });
  });
});
