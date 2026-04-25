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

  /**
   * Pełna macierz znaków whitespace + edge cases które realnie wychodziły
   * z formatterów (Intl.DateTimeFormat na różnych OS po lokalizacji liczb).
   * Każdy z tych przypadków MUSI:
   *  - zostać sprowadzony do pojedynczych spacji w środku (nigdy do "\n"),
   *  - zwrócić pusty string, jeżeli po wygładzeniu nie zostaje treści
   *    (kontrakt z konsumentem: pusty string blokuje renderowanie linii „Czas:").
   */
  describe("pełna macierz separatorów whitespace", () => {
    it.each([
      ["pojedynczy \\n", "12:34\n56"],
      ["pojedynczy \\r", "12:34\r56"],
      ["pojedynczy \\t", "12:34\t56"],
      ["mieszanka \\r\\n\\t", "12:34\r\n\t56"],
      ["wielokrotne \\n\\n\\n", "12:34\n\n\n56"],
      ["wielokrotne \\t\\t", "12:34\t\t56"],
      ["spacje wokół \\n", "12:34   \n   56"],
      ["mieszane: początek+środek+koniec", "\n  12:34\t\t56  \r\n"],
    ])("%s → kolapsuje do pojedynczej spacji ('12:34 56')", (_label, input) => {
      expect(smoothTimeValue(input)).toBe("12:34 56");
    });

    it("nie zostawia trailing/leading newline ani spacji po wygładzeniu", () => {
      const out = smoothTimeValue("\n\n  abc\t\tdef  \r\n");
      expect(out).toBe("abc def");
      expect(out.startsWith(" ")).toBe(false);
      expect(out.endsWith(" ")).toBe(false);
      expect(out).not.toContain("\n");
      expect(out).not.toContain("\t");
      expect(out).not.toContain("\r");
    });

    it("nie wstawia podwójnych spacji nawet przy ekstremalnym vandalizmie whitespace", () => {
      const input = "a" + " ".repeat(50) + "\n".repeat(20) + "\t".repeat(15) + "b";
      const out = smoothTimeValue(input);
      expect(out).toBe("a b");
      expect(out).not.toMatch(/ {2}/);
    });

    it("realne dane Intl.DateTimeFormat z polskimi przecinkami + \\n są wygładzane", () => {
      // Realny przypadek z Chrome/Safari: localized timestamp z miękkim wrapem.
      const input = "24 kwietnia 2026,\n12:34:56";
      expect(smoothTimeValue(input)).toBe("24 kwietnia 2026, 12:34:56");
    });
  });

  describe("kontrakt pustego stringu — blokowanie linii „Czas:”", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["pusty string", ""],
      ["pojedyncza spacja", " "],
      ["wielokrotne spacje", "          "],
      ["sam \\n", "\n"],
      ["sam \\r", "\r"],
      ["sam \\t", "\t"],
      ["mieszanka samych whitespace", " \n\r\t \n\t "],
    ])("%s → zwraca '' (kontrakt blokady „Czas:”)", (_label, input) => {
      expect(smoothTimeValue(input as string | null | undefined)).toBe("");
    });

    it("integracja z modelem: gdy smoothTimeValue → '', NIE pojawia się prefiks „Czas:”", () => {
      // Krytyczny kontrakt z konsumentem: pusty wynik smoothTimeValue MUSI
      // skutkować `shouldRenderTimeLine === false` i `timeLineForView === null`.
      // Bez tego widoczny tooltip miałby osierocony „Czas: " bez wartości.
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "  \n\t  ", // sam whitespace
        relativeLabel: "\n\n",  // też sam whitespace
      });

      expect(model.timeValue).toBe("");
      expect(model.shouldRenderTimeLine).toBe(false);
      expect(model.timeLineForView).toBeNull();
      expect(model.timeLineForA11y).toBeNull();
      expect(model.ariaText).not.toContain("Czas:");
      expect(model.ariaText).not.toMatch(/Czas:\s*$/m);
    });

    it("integracja z modelem: tylko fullDate whitespace → fallback na relativeLabel z prefiksem „Czas:”", () => {
      // Asymetria: sam fullDate jest wygładzony do "", ale relativeLabel ma
      // realną wartość → linia „Czas:" MUSI się pojawić (z fallbackiem).
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "\n\t  \r",
        relativeLabel: "2 minuty temu",
      });

      expect(model.timeValue).toBe("2 minuty temu");
      expect(model.isRelativeFallback).toBe(true);
      expect(model.shouldRenderTimeLine).toBe(true);
      expect(model.timeLineForView).toBe("Czas: 2 minuty temu");
      // a11y dokleja kwalifikator (etykieta względna).
      expect(model.timeLineForA11y).toBe("Czas: 2 minuty temu (etykieta względna)");
    });

    it("integracja z modelem: oba pola undefined → ariaText to TYLKO heading + opis, bez czasu", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: undefined,
        relativeLabel: undefined,
      });

      expect(model.timeValue).toBe("");
      expect(model.shouldRenderTimeLine).toBe(false);

      // ariaText nie kończy się żadnym whitespace, nie ma „Czas:" w środku.
      expect(model.ariaText).not.toContain("Czas:");
      expect(model.ariaText.endsWith("\n")).toBe(false);
      expect(model.ariaText.startsWith("\n")).toBe(false);
      // Brak pustych linii w środku.
      expect(model.ariaText).not.toMatch(/\n\s*\n/);
      // Składa się dokładnie z ariaHeading + description (2 linie).
      expect(model.ariaText.split("\n").length).toBe(2);
    });

    it("po wygładzeniu fullDate=' x ' (1 znak po trimie) — linia „Czas: x” się pojawia", () => {
      // Sanity check granicy: jeden niepusty znak wystarcza do renderowania.
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "   x   ",
        relativeLabel: "ignored",
      });

      expect(model.timeValue).toBe("x");
      expect(model.shouldRenderTimeLine).toBe(true);
      expect(model.timeLineForView).toBe("Czas: x");
      expect(model.isRelativeFallback).toBe(false);
    });
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
