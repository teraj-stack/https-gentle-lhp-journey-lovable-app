/**
 * Testy pure helpera `buildLastChangeTooltipModel` — single source of truth
 * dla treści tooltipa „Ostatnia zmiana" w panelu auto-zapisu.
 *
 * Cel pokrycia: pilnujemy, że WSZYSTKIE warunki renderowania (widoczny
 * `<TooltipContent>`, `aria-label`, `title`) są wyliczane w jednym miejscu
 * i nie mogą się rozjechać. Każda regresja w fallbacku (full date → relative
 * label → brak linii) zostanie wyłapana tutaj BEZ konieczności renderu
 * komponentu w jsdom.
 *
 * Komponent `AutoSaveSettings` ma osobne testy integracyjne sprawdzające
 * mapowanie pól modelu na DOM (aria-label/title/TooltipContent), ale logika
 * decyzyjna żyje TUTAJ.
 */
import { describe, it, expect } from "vitest";
import {
  buildLastChangeTooltipModel,
  smoothTimeValue,
} from "./lastChangeTooltipModel";

describe("smoothTimeValue — wygładzanie wartości czasu", () => {
  it("usuwa newline'y i tabulatory, kolapsuje spacje, trimuje krawędzie", () => {
    expect(smoothTimeValue("24 kwietnia\n2026")).toBe("24 kwietnia 2026");
    expect(smoothTimeValue("  24\tkwietnia   2026  ")).toBe("24 kwietnia 2026");
    expect(smoothTimeValue("a\r\nb")).toBe("a b");
  });

  it("zwraca pusty string dla null/undefined/non-string/whitespace-only", () => {
    expect(smoothTimeValue(null)).toBe("");
    expect(smoothTimeValue(undefined)).toBe("");
    expect(smoothTimeValue("")).toBe("");
    expect(smoothTimeValue("   ")).toBe("");
    expect(smoothTimeValue("\n\t\r")).toBe("");
    expect(smoothTimeValue(123 as unknown as string)).toBe("");
    expect(smoothTimeValue({} as unknown as string)).toBe("");
  });
});

describe("buildLastChangeTooltipModel — pełny model tooltipa", () => {
  describe("ścieżka happy: pełna data dostępna", () => {
    it("używa fullDate, NIE dokleja kwalifikatora '(etykieta względna)'", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia 2026, 12:34:56",
        relativeLabel: "2 minuty temu",
      });

      expect(model.timeValue).toBe("24 kwietnia 2026, 12:34:56");
      expect(model.isRelativeFallback).toBe(false);
      expect(model.shouldRenderTimeLine).toBe(true);
      expect(model.timeLineForView).toBe("Czas: 24 kwietnia 2026, 12:34:56");
      expect(model.timeLineForA11y).toBe("Czas: 24 kwietnia 2026, 12:34:56");
      expect(model.timeLineHelpTitle).toBeUndefined();
    });

    it("aria-label zawiera 3 linie: nagłówek + opis + czas, BEZ pustych linii", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "24 kwietnia 2026, 12:34:56",
        relativeLabel: "2 minuty temu",
      });

      const lines = model.ariaText.split("\n");
      expect(lines.length).toBe(3);
      expect(lines[0]).toBe("Źródło: Moja lokalna akcja w tej karcie");
      expect(lines[2]).toBe("Czas: 24 kwietnia 2026, 12:34:56");
      // Brak pustych/whitespace-only linii.
      for (const line of lines) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe("ścieżka fallback: pełna data niedostępna → etykieta względna", () => {
    it.each([
      [null, "null"],
      [undefined, "undefined"],
      ["", "pusty string"],
      ["   ", "whitespace-only"],
      ["\n\t", "newline+tab"],
    ])(
      "fullDate=%s (%s): spada na relativeLabel z kwalifikatorem (etykieta względna)",
      (badFullDate, _label) => {
        const model = buildLastChangeTooltipModel({
          source: "remote",
          fullDate: badFullDate as string | null | undefined,
          relativeLabel: "2 minuty temu",
        });

        expect(model.timeValue).toBe("2 minuty temu");
        expect(model.isRelativeFallback).toBe(true);
        expect(model.shouldRenderTimeLine).toBe(true);
        // Widoczny tooltip: BEZ kwalifikatora (jest w native title).
        expect(model.timeLineForView).toBe("Czas: 2 minuty temu");
        // a11y: Z kwalifikatorem.
        expect(model.timeLineForA11y).toBe("Czas: 2 minuty temu (etykieta względna)");
        expect(model.timeLineHelpTitle).toBe(
          "Pełna data niedostępna — pokazujemy etykietę względną.",
        );
        expect(model.ariaText).toContain("Czas: 2 minuty temu (etykieta względna)");
      },
    );

    it("fallback wygładza relativeLabel z newline'ami przed użyciem", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "",
        relativeLabel: "2 minuty\n\ttemu",
      });

      // Wygładzona wartość bez newline'ów.
      expect(model.timeValue).toBe("2 minuty temu");
      expect(model.timeLineForA11y).toBe("Czas: 2 minuty temu (etykieta względna)");
      // Brak fałszywej dodatkowej linii w aria-label.
      expect(model.ariaText).not.toMatch(/\n\n/);
      expect(model.ariaText.split("\n").length).toBe(3);
    });
  });

  describe("ścieżka degradacji: ani full ani relative nie ma sensownej wartości", () => {
    it.each([
      [null, null],
      [undefined, undefined],
      ["", ""],
      ["   ", "\n"],
      ["\t", null],
    ])(
      "fullDate=%s, relativeLabel=%s: linia czasu w ogóle NIE istnieje",
      (full, rel) => {
        const model = buildLastChangeTooltipModel({
          source: "remote",
          fullDate: full as string | null | undefined,
          relativeLabel: rel as string | null | undefined,
        });

        expect(model.timeValue).toBe("");
        expect(model.shouldRenderTimeLine).toBe(false);
        expect(model.timeLineForView).toBeNull();
        expect(model.timeLineForA11y).toBeNull();
        expect(model.timeLineHelpTitle).toBeUndefined();

        // aria-label ma tylko 2 linie (nagłówek + opis), BEZ trailing newline.
        const lines = model.ariaText.split("\n");
        expect(lines.length).toBe(2);
        expect(model.ariaText).not.toMatch(/Czas:/);
        expect(model.ariaText.endsWith("\n")).toBe(false);
      },
    );
  });

  describe("anty-rozjazd: aria-label ↔ widoczny TooltipContent czytają z tego samego modelu", () => {
    it("widoczna wartość (timeValue) jest IDENTYCZNA z wartością wstawioną do ariaText", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia 2026, 12:34:56",
        relativeLabel: "2 minuty temu",
      });

      // Widoczny tooltip pokaże `model.timeValue` w `<p>`.
      // aria-label MUSI zawierać dokładnie tę samą wartość po „Czas: ".
      expect(model.ariaText).toContain(`Czas: ${model.timeValue}`);
    });

    it("przy fallbacku aria-label ma kwalifikator, widoczny timeLineForView NIE — to kontrakt", () => {
      // Świadoma asymetria: widoczny tooltip ma natywny `title` (timeLineHelpTitle)
      // wyjaśniający fallback dla touch/hover, więc nie potrzebuje sufiksu w treści.
      // aria-label NIE ma natywnego title, więc kwalifikator musi być inline.
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: null,
        relativeLabel: "5 sekund temu",
      });

      expect(model.timeLineForView).toBe("Czas: 5 sekund temu");
      expect(model.timeLineForA11y).toBe("Czas: 5 sekund temu (etykieta względna)");
      // Native title rekompensuje brak inline kwalifikatora w widoku.
      expect(model.timeLineHelpTitle).toBeTruthy();
    });
  });

  describe("treść źródła: deleguje do getLastChangeTooltipContent", () => {
    it("source='remote' → content.isRemote=true + nagłówek synchronizacji", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "x",
        relativeLabel: "y",
      });
      expect(model.content.isRemote).toBe(true);
      expect(model.content.heading).toBe("Synchronizacja między kartami");
      expect(model.ariaText.startsWith("Źródło: Synchronizacja między kartami")).toBe(true);
    });

    it("source=null → content.isRemote=false + nagłówek lokalny (bezpieczny fallback)", () => {
      const model = buildLastChangeTooltipModel({
        source: null,
        fullDate: "x",
        relativeLabel: "y",
      });
      expect(model.content.isRemote).toBe(false);
      expect(model.content.heading).toBe("Lokalna akcja w tej karcie");
    });
  });
});
