import { describe, it, expect } from "vitest";
import { getLastChangeLabelStyle } from "./lastChangeLabelStyle";
import { isLastChangeVisible } from "@/hooks/useLastChangeVisibility";

describe("getLastChangeLabelStyle — kolorowanie etykiety „Ostatnia zmiana:”", () => {
  it("zdalna świeża synchronizacja: mocny zielony + spinner", () => {
    const s = getLastChangeLabelStyle("remote", true);
    expect(s.isRemote).toBe(true);
    expect(s.showLocalSuffix).toBe(false);
    expect(s.containerClass).toBe("text-emerald-400");
    expect(s.iconClass).toContain("animate-spin");
    expect(s.iconClass).toContain("text-emerald-400");
    expect(s.strongClass).toBe("text-emerald-400");
  });

  it("zdalna stara synchronizacja: przygaszony zielony, brak spinnera", () => {
    const s = getLastChangeLabelStyle("remote", false);
    expect(s.isRemote).toBe(true);
    expect(s.containerClass).toBe("text-emerald-500/80");
    expect(s.iconClass).not.toContain("animate-spin");
    expect(s.iconClass).toBe("text-emerald-500/80");
    expect(s.strongClass).toBe("text-emerald-400");
  });

  it("lokalne kliknięcie: neutralny kolor i sufiks „(lokalnie)”", () => {
    const s = getLastChangeLabelStyle("local", false);
    expect(s.isRemote).toBe(false);
    expect(s.showLocalSuffix).toBe(true);
    expect(s.containerClass).toBe("text-muted-foreground");
    expect(s.strongClass).toBe("text-foreground");
    // brak akcentu emerald w żadnej klasie
    expect(s.containerClass).not.toMatch(/emerald/);
    expect(s.iconClass).not.toMatch(/emerald/);
    expect(s.strongClass).not.toMatch(/emerald/);
  });

  it("lokalne kliknięcie ignoruje flagę isRemoteSyncing (defensywnie)", () => {
    // Gdyby UI błędnie przekazało true przy local — nadal nie kolorujemy na zielono.
    const s = getLastChangeLabelStyle("local", true);
    expect(s.isRemote).toBe(false);
    expect(s.containerClass).toBe("text-muted-foreground");
    expect(s.iconClass).not.toContain("animate-spin");
  });

  it("brak źródła (null): traktujemy jak neutralny, bez sufiksu „(lokalnie)”", () => {
    const s = getLastChangeLabelStyle(null, false);
    expect(s.isRemote).toBe(false);
    expect(s.showLocalSuffix).toBe(false);
    expect(s.containerClass).toBe("text-muted-foreground");
  });
});

describe("isLastChangeVisible — matryca widoczności × źródło", () => {
  it("tryb „off” ukrywa wszystko", () => {
    expect(isLastChangeVisible("off", "remote")).toBe(false);
    expect(isLastChangeVisible("off", "local")).toBe(false);
    expect(isLastChangeVisible("off", null)).toBe(false);
  });

  it("tryb „both” pokazuje remote i local, ale nie null", () => {
    expect(isLastChangeVisible("both", "remote")).toBe(true);
    expect(isLastChangeVisible("both", "local")).toBe(true);
    expect(isLastChangeVisible("both", null)).toBe(false);
  });

  it("tryb „remote” pokazuje tylko zdalne", () => {
    expect(isLastChangeVisible("remote", "remote")).toBe(true);
    expect(isLastChangeVisible("remote", "local")).toBe(false);
    expect(isLastChangeVisible("remote", null)).toBe(false);
  });

  it("tryb „local” pokazuje tylko lokalne", () => {
    expect(isLastChangeVisible("local", "local")).toBe(true);
    expect(isLastChangeVisible("local", "remote")).toBe(false);
    expect(isLastChangeVisible("local", null)).toBe(false);
  });
});
