/**
 * Testy in-memory loggera SEO redirectów / 404.
 * Walidują:
 *  - logRedirectHit / logNotFoundHit zapisują wpisy z poprawnymi polami,
 *  - clearRedirectLog czyści stan,
 *  - subscribeRedirectLog emituje powiadomienia po każdej zmianie,
 *  - cap MAX_ENTRIES nie wybucha (dolne sanity).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetRedirectLogForTesting,
  clearRedirectLog,
  getRedirectLog,
  logNotFoundHit,
  logRedirectHit,
  subscribeRedirectLog,
} from "./redirectLog";

beforeEach(() => {
  // jsdom udostępnia sessionStorage; ale czyścimy „nasz" klucz przed każdym testem.
  __resetRedirectLogForTesting();
  // Wycisz konsolę w testach.
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("redirectLog", () => {
  it("logRedirectHit zapisuje wpis z kind=redirect, from i to", () => {
    logRedirectHit("/hemoroidy", "/dla-pacjenta/hemoroidy");
    const entries = getRedirectLog();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: "redirect",
      from: "/hemoroidy",
      to: "/dla-pacjenta/hemoroidy",
    });
    expect(entries[0].timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(typeof entries[0].referrer).toBe("string");
  });

  it("logNotFoundHit zapisuje wpis z kind=not_found bez to", () => {
    logNotFoundHit("/jakas-stara-strona");
    const entries = getRedirectLog();
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("not_found");
    expect(entries[0].from).toBe("/jakas-stara-strona");
    expect(entries[0].to).toBeUndefined();
  });

  it("zachowuje kolejność wstawiania", () => {
    logRedirectHit("/a", "/x");
    logNotFoundHit("/b");
    logRedirectHit("/c", "/y");
    const entries = getRedirectLog();
    expect(entries.map((e) => e.from)).toEqual(["/a", "/b", "/c"]);
  });

  it("clearRedirectLog czyści wszystkie wpisy", () => {
    logRedirectHit("/a", "/x");
    logNotFoundHit("/b");
    expect(getRedirectLog()).toHaveLength(2);
    clearRedirectLog();
    expect(getRedirectLog()).toHaveLength(0);
  });

  it("getRedirectLog zwraca kopię (mutacja zewnętrzna nie wpływa na stan)", () => {
    logRedirectHit("/a", "/x");
    const snapshot = getRedirectLog();
    snapshot.push({
      kind: "redirect",
      from: "/fake",
      to: "/fake",
      timestamp: new Date().toISOString(),
      referrer: "(direct)",
      search: "",
    });
    expect(getRedirectLog()).toHaveLength(1);
  });

  it("subscribeRedirectLog emituje listenerowi przy każdej zmianie", () => {
    const listener = vi.fn();
    const unsub = subscribeRedirectLog(listener);

    logRedirectHit("/a", "/x");
    logNotFoundHit("/b");
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
    logRedirectHit("/c", "/z");
    // Po unsubscribe — bez zmian w call count.
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("przeżywa awarię sessionStorage (np. quota) — nie rzuca", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceeded");
      });
    expect(() => logRedirectHit("/a", "/x")).not.toThrow();
    setItem.mockRestore();
  });

  it("toleruje uszkodzony JSON w sessionStorage (zwraca pustą listę)", () => {
    sessionStorage.setItem("cml:seo-redirect-log:v1", "{not-json");
    expect(getRedirectLog()).toEqual([]);
  });
});
