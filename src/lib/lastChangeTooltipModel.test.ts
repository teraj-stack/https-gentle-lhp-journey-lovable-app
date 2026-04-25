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
  composeTimeLine,
  smoothTimeValue,
  TIME_LINE_PREFIX,
  type TimeValueFormat,
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

  /**
   * Kontrakt obronny: konsumenci helpera (formattery dat, hooki realtime,
   * stare odczyty z localStorage) MOGĄ przekazać `lastSyncFullDate`
   * lub `lastSyncLabel` jako:
   *   - null / undefined           (brak danych — sytuacja typowa po freshu),
   *   - "" / "   " / "\n\t"        (pusty fallback z formatera),
   *   - liczba / boolean / obiekt  (bug w upstream serializacji JSON),
   *   - NaN / Infinity             (pomyłka z `new Date(x).getTime()`),
   *   - tablica / funkcja / Symbol (pomyłka typowa z dynamicznym propem).
   *
   * Helper MUSI w każdym z tych przypadków:
   *   1. NIE rzucić wyjątku (smoothTimeValue zwraca "" dla non-string),
   *   2. NIE zrenderować linii „Czas:" (shouldRenderTimeLine === false,
   *      timeLineForView === null, timeLineForA11y === null),
   *   3. NIE zostawić pustej trzeciej linii w ariaText (pozostaje 2 linie:
   *      Źródło + opis),
   *   4. NIE wystawić timeLineHelpTitle (undefined — nie ma czego tłumaczyć).
   *
   * Bez tej obrony screen reader przeczytałby „Czas:" jako osierocony
   * prefiks, a JSX wyrenderowałby pusty `<span>` w widocznym tooltipie.
   */
  describe("bezpieczny fallback: lastSyncFullDate/lastSyncLabel jako null/undefined/non-string", () => {
    /**
     * Kompaktowa asercja kontraktu „pusty fallback bez Czas:".
     * Wyciągnięta, żeby każdy `it.each` case był jednolinijkowy
     * i regresja od razu pokazała, KTÓRY input zepsuł kontrakt.
     */
    const expectSafeEmptyFallback = (
      model: ReturnType<typeof buildLastChangeTooltipModel>,
    ) => {
      expect(model.timeValue).toBe("");
      expect(model.shouldRenderTimeLine).toBe(false);
      expect(model.timeLineForView).toBeNull();
      expect(model.timeLineForA11y).toBeNull();
      expect(model.timeLineHelpTitle).toBeUndefined();
      expect(model.isRelativeFallback).toBe(false);
      expect(model.ariaText).not.toContain("Czas:");
      // Dokładnie 2 linie: nagłówek źródła + opis. Brak osieroconej linii czasu.
      expect(model.ariaText.split("\n")).toHaveLength(2);
      // Żaden artefakt JSON.stringify (np. „[object Object]") nie wycieka.
      expect(model.ariaText).not.toMatch(/\[object\s+\w+\]/i);
      expect(model.ariaText).not.toMatch(/\bNaN\b|\bInfinity\b|\bundefined\b|\bnull\b/);
    };

    it.each([
      ["null + null", null, null],
      ["undefined + undefined", undefined, undefined],
      ["null + undefined", null, undefined],
      ["undefined + null", undefined, null],
      ['"" + ""', "", ""],
      ['"   " + "\\n\\t"', "   ", "\n\t"],
      ["null + ''", null, ""],
      ["undefined + '   '", undefined, "   "],
    ])(
      "%s: tooltip pokazuje pusty fallback bez „Czas:”",
      (_label, fullDate, relativeLabel) => {
        const model = buildLastChangeTooltipModel({
          source: "local",
          fullDate: fullDate as string | null | undefined,
          relativeLabel: relativeLabel as string | null | undefined,
        });
        expectSafeEmptyFallback(model);
        // Sanity: treść źródła wciąż się buduje (komponent musi pokazać heading/desc).
        expect(model.content.heading).toBe("Lokalna akcja w tej karcie");
      },
    );

    it.each([
      ["number 0", 0, 0],
      ["number 1700000000000 (timestamp ms)", 1_700_000_000_000, 1_700_000_000_000],
      ["NaN", Number.NaN, Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
      ["boolean true/false", true, false],
      ["obiekt Date (przekazany surowo zamiast .toLocaleString())", new Date("2026-04-25"), new Date()],
      ["plain object", { iso: "2026-04-25" }, { label: "5 min temu" }],
      ["tablica", ["2026", "04", "25"], ["5", "min"]],
      ["funkcja", () => "2026-04-25", () => "5 min temu"],
    ])(
      "%s: non-string upstream → pusty fallback bez „Czas:” i bez wyjątku",
      (_label, fullDate, relativeLabel) => {
        const model = buildLastChangeTooltipModel({
          source: "remote",
          fullDate: fullDate as unknown as string,
          relativeLabel: relativeLabel as unknown as string,
        });
        expectSafeEmptyFallback(model);
        // Sanity dla source='remote' — heading musi się przełączyć mimo śmieciowego inputu.
        expect(model.content.heading).toBe("Synchronizacja między kartami");
      },
    );

    it("Symbol jako wejście NIE crashuje (Symbol→string konwersja jest illegal w JS)", () => {
      // Symbol w template stringu rzuciłby TypeError; smoothTimeValue robi
      // strict typeof === 'string', więc Symbol nigdy nie dociera do interpolacji.
      const sym = Symbol("dirty");
      expect(() =>
        buildLastChangeTooltipModel({
          source: "local",
          fullDate: sym as unknown as string,
          relativeLabel: sym as unknown as string,
        }),
      ).not.toThrow();

      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: sym as unknown as string,
        relativeLabel: sym as unknown as string,
      });
      expectSafeEmptyFallback(model);
    });

    it("mieszane: non-string fullDate + valid relativeLabel → fallback na relative (z kwalifikatorem)", () => {
      // Asymetryczny case: upstream rozsypał tylko jedno pole. Helper MUSI
      // wyciągnąć drugie i zaznaczyć w a11y, że to przybliżenie.
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: 12345 as unknown as string,
        relativeLabel: "2 minuty temu",
      });

      expect(model.timeValue).toBe("2 minuty temu");
      expect(model.isRelativeFallback).toBe(true);
      expect(model.shouldRenderTimeLine).toBe(true);
      expect(model.timeLineForView).toBe("Czas: 2 minuty temu");
      expect(model.timeLineForA11y).toBe("Czas: 2 minuty temu (etykieta względna)");
      expect(model.timeLineHelpTitle).toBeTruthy();
      expect(model.ariaText).toContain("Czas: 2 minuty temu (etykieta względna)");
    });

    it("mieszane: valid fullDate + non-string relativeLabel → używa fullDate (bez kwalifikatora)", () => {
      // Symetryczna obrona: zaśmiecony relativeLabel nie może popsuć ścieżki
      // głównej, gdy fullDate jest poprawne.
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia 2026, 12:34:56",
        relativeLabel: { broken: true } as unknown as string,
      });

      expect(model.timeValue).toBe("24 kwietnia 2026, 12:34:56");
      expect(model.isRelativeFallback).toBe(false);
      expect(model.timeLineForView).toBe("Czas: 24 kwietnia 2026, 12:34:56");
      expect(model.timeLineForA11y).toBe("Czas: 24 kwietnia 2026, 12:34:56");
      expect(model.timeLineHelpTitle).toBeUndefined();
    });
  });

  /**
   * Opcja `format` (TimeValueFormat). Trzy kontrakty obronne:
   *
   *  1. KOMPATYBILNOŚĆ: brak parametru `format` MUSI dawać identyczny wynik
   *     jak jawne `"single-space"` (default zachowania historycznego). Każda
   *     regresja w defaulcie zepsuje wszystkie istniejące wywołania w
   *     `AutoSaveSettings.tsx`.
   *  2. PARYTET KANAŁÓW: `timeLineForView` i `timeLineForA11y` (po usunięciu
   *     opcjonalnego sufiksu „(etykieta względna)") MUSZĄ zawierać DOKŁADNIE
   *     ten sam string. To jest egzekwowane dla każdego trybu formatu —
   *     niemożliwe jest, żeby widoczny tooltip pokazał wartość A, a screen
   *     reader przeczytał wartość B.
   *  3. SEMANTYKA TRYBÓW: każdy tryb realizuje swój kontrakt na czytelnym
   *     przykładzie (single-space → kolaps spacji, compact → zwarte
   *     separatory, preserve-newlines → zachowane `\n`).
   */
  describe("opcja `format`: parytet view↔a11y dla każdego trybu", () => {
    it("brak `format` === jawne 'single-space' (kompatybilność wsteczna)", () => {
      const input = {
        source: "remote" as const,
        fullDate: "  24  kwietnia\n2026,\t12:34:56  ",
        relativeLabel: "2  minuty\ttemu",
      };
      const defaultModel = buildLastChangeTooltipModel(input);
      const explicitModel = buildLastChangeTooltipModel({
        ...input,
        format: "single-space",
      });

      expect(defaultModel.timeValue).toBe(explicitModel.timeValue);
      expect(defaultModel.timeLineForView).toBe(explicitModel.timeLineForView);
      expect(defaultModel.timeLineForA11y).toBe(explicitModel.timeLineForA11y);
      expect(defaultModel.ariaText).toBe(explicitModel.ariaText);
    });

    it("'single-space': wielokrotne spacje/`\\n`/`\\t` → pojedyncza spacja w obu kanałach", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24   kwietnia\n2026,\t\t12:34:56",
        relativeLabel: "ignored",
        format: "single-space",
      });

      expect(model.timeValue).toBe("24 kwietnia 2026, 12:34:56");
      expect(model.timeLineForView).toBe("Czas: 24 kwietnia 2026, 12:34:56");
      // a11y bez sufiksu (bo używamy fullDate, nie relative) === view
      expect(model.timeLineForA11y).toBe(model.timeLineForView);
      expect(model.timeValue).not.toMatch(/\s{2,}/);
      expect(model.timeValue).not.toMatch(/[\n\r\t]/);
    });

    it("'compact': spacje wokół `,` i `:` → zwarte (zero przed, jedna po)", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "24 kwietnia 2026 ,  12 : 34 : 56",
        relativeLabel: "ignored",
        format: "compact",
      });

      // Po compact: brak spacji przed `,`/`:`, dokładnie jedna po.
      expect(model.timeValue).toBe("24 kwietnia 2026, 12: 34: 56");
      expect(model.timeLineForView).toBe(`Czas: ${model.timeValue}`);
      expect(model.timeLineForA11y).toBe(model.timeLineForView);
      // Brak osieroconych podwójnych spacji.
      expect(model.timeValue).not.toMatch(/\s{2,}/);
      // Brak spacji TUŻ przed `,` lub `:` (kontrakt trybu compact).
      expect(model.timeValue).not.toMatch(/\s[,:]/);
    });

    it("'preserve-newlines': `\\n` zachowane jako separator linii, ale spacje skompresowane", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "24   kwietnia 2026\n\n\n12:34:56\t\t(UTC)",
        relativeLabel: "ignored",
        format: "preserve-newlines",
      });

      // Wielokrotne `\n` → jeden, spacje/taby w linii → pojedyncza spacja.
      expect(model.timeValue).toBe("24 kwietnia 2026\n12:34:56 (UTC)");
      expect(model.timeLineForView).toBe(`Czas: ${model.timeValue}`);
      // KRYTYCZNE: a11y też dostaje TĘ SAMĄ wartość (bez sufiksu, bo full).
      // Mimo że tryb wieloliniowy nie jest zalecany dla a11y, parytet z view
      // MUSI być zachowany — komponent decyduje, którego trybu użyć.
      expect(model.timeLineForA11y).toBe(model.timeLineForView);
    });

    it.each<TimeValueFormat>(["single-space", "compact", "preserve-newlines"])(
      "[%s] timeLineForView i timeLineForA11y są bytewise identyczne (gdy NIE fallback)",
      (format) => {
        const model = buildLastChangeTooltipModel({
          source: "remote",
          fullDate: "24 kwietnia 2026, 12:34:56",
          relativeLabel: "2 min temu",
          format,
        });

        expect(model.isRelativeFallback).toBe(false);
        expect(model.timeLineForView).not.toBeNull();
        expect(model.timeLineForA11y).not.toBeNull();

        // Bytewise equality — żaden tryb nie może wstrzyknąć dodatkowego
        // znaku do view ani do a11y, gdy nie używamy relativeLabel.
        const view = model.timeLineForView!;
        const aria = model.timeLineForA11y!;
        expect(view.length).toBe(aria.length);
        for (let i = 0; i < view.length; i++) {
          expect(view.charCodeAt(i), `[${format}] char @${i}`).toBe(
            aria.charCodeAt(i),
          );
        }
      },
    );

    it.each<TimeValueFormat>(["single-space", "compact", "preserve-newlines"])(
      "[%s] przy fallbacku na relative: a11y = view + ' (etykieta względna)' (różnica TYLKO w sufiksie)",
      (format) => {
        const model = buildLastChangeTooltipModel({
          source: "local",
          fullDate: "   ", // zmusza fallback
          relativeLabel: "2  minuty\ttemu",
          format,
        });

        expect(model.isRelativeFallback).toBe(true);
        // Prefiks „Czas: <wartość>" identyczny — różnica TYLKO w sufiksie.
        expect(model.timeLineForA11y).toBe(
          `${model.timeLineForView} (etykieta względna)`,
        );
        // Wartość czasu po wygładzeniu — żadnych podwójnych spacji.
        expect(model.timeValue).not.toMatch(/  +/);
      },
    );

    it.each<TimeValueFormat>(["single-space", "compact", "preserve-newlines"])(
      "[%s] non-string upstream → pusty fallback bez „Czas:” (kontrakt obronny niezależny od trybu)",
      (format) => {
        const model = buildLastChangeTooltipModel({
          source: "local",
          fullDate: 12345 as unknown as string,
          relativeLabel: null,
          format,
        });

        expect(model.timeValue).toBe("");
        expect(model.shouldRenderTimeLine).toBe(false);
        expect(model.timeLineForView).toBeNull();
        expect(model.timeLineForA11y).toBeNull();
        expect(model.ariaText).not.toContain("Czas:");
      },
    );
  });
});
