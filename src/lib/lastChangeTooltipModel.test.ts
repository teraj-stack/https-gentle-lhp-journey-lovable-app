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
  getTimeLinePrefix,
  smoothTimeValue,
  TIME_LINE_PREFIX,
  validateLastChangeTooltipInput,
  type TimeValueFormat,
  type ValidationIssueCode,
} from "./lastChangeTooltipModel";
import { resolveLocale, SUPPORTED_LOCALES } from "./lastChangeTooltipContent";

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

    it("'compact': spacje wokół `,` i `:` → zwarte (zero przed, jedna po) w VIEW", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "24 kwietnia 2026 ,  12 : 34 : 56",
        relativeLabel: "ignored",
        format: "compact",
      });

      // Po compact: brak spacji przed `,`/`:`, dokładnie jedna po — to dotyczy
      // VIEW (i `timeValue`, który jest wartością widoczną).
      expect(model.timeValue).toBe("24 kwietnia 2026, 12: 34: 56");
      expect(model.timeLineForView).toBe(`Czas: ${model.timeValue}`);
      expect(model.timeValue).not.toMatch(/\s{2,}/);
      expect(model.timeValue).not.toMatch(/\s[,:]/);

      // KRYTYCZNE: A11Y używa ZAWSZE single-space (kontrakt
      // ariaText-no-extra-spaces) — niezależnie od `format`. Dlatego
      // a11y nie ma „compact-style" zachowania (żadnej spacji wokół `:` w 12:34:56).
      expect(model.timeLineForA11y).toBe("Czas: 24 kwietnia 2026 , 12 : 34 : 56");
    });

    it("'preserve-newlines': `\\n` zachowane TYLKO w VIEW; A11Y jest single-line", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "24   kwietnia 2026\n\n\n12:34:56\t\t(UTC)",
        relativeLabel: "ignored",
        format: "preserve-newlines",
      });

      // VIEW: wielokrotne `\n` → jeden, spacje/taby w linii → pojedyncza spacja.
      expect(model.timeValue).toBe("24 kwietnia 2026\n12:34:56 (UTC)");
      expect(model.timeLineForView).toBe(`Czas: ${model.timeValue}`);

      // A11Y: ZAWSZE single-line — wszystkie `\n` z fullDate stają się
      // pojedynczymi spacjami. To jest świadomy override kontraktu trybu,
      // żeby `aria-label` nigdy nie zawierał `\n` (pauza w screen readerze)
      // ani osieroconych pustych linii w `ariaText`.
      expect(model.timeLineForA11y).toBe("Czas: 24 kwietnia 2026 12:34:56 (UTC)");
      expect(model.timeLineForA11y).not.toMatch(/\n/);
    });

    it.each<TimeValueFormat>(["single-space", "compact", "preserve-newlines"])(
      "[%s] timeLineForA11y NIGDY nie zawiera `\\n` ani podwójnych spacji (gdy NIE fallback)",
      (format) => {
        const model = buildLastChangeTooltipModel({
          source: "remote",
          fullDate: "24 kwietnia 2026,  12:34\n56", // newline + podwójna spacja
          relativeLabel: "2 min temu",
          format,
        });

        expect(model.isRelativeFallback).toBe(false);
        expect(model.timeLineForA11y).not.toBeNull();

        const aria = model.timeLineForA11y!;
        // Kontrakt a11y, niezależny od `format`:
        //  - brak `\n`/`\r`/`\t`,
        //  - brak podwójnych spacji (single-space wszędzie),
        //  - prefiks „Czas: " obecny dokładnie raz, treść po nim niepusta.
        expect(aria, `[${format}] aria nie może mieć newline`).not.toMatch(/[\n\r\t]/);
        expect(aria, `[${format}] aria nie może mieć podwójnych spacji`).not.toMatch(/  +/);
        expect(aria.startsWith("Czas: "), `[${format}] prefiks`).toBe(true);
        expect(aria.slice("Czas: ".length).trim().length).toBeGreaterThan(0);
      },
    );

    it("[single-space] timeLineForView i timeLineForA11y są bytewise identyczne (gdy NIE fallback)", () => {
      // Tylko `single-space` daje pełny parytet view↔a11y (bo a11y też używa
      // single-space). Dla `compact` i `preserve-newlines` parytet jest
      // świadomie ZŁAMANY na rzecz bezpieczeństwa screen readera — pokrywają
      // to dedykowane testy powyżej.
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia 2026, 12:34:56",
        relativeLabel: "2 min temu",
        format: "single-space",
      });

      expect(model.isRelativeFallback).toBe(false);
      expect(model.timeLineForView).toBe(model.timeLineForA11y);
    });

    it.each<TimeValueFormat>(["single-space", "compact", "preserve-newlines"])(
      "[%s] przy fallbacku na relative: a11y kończy się ' (etykieta względna)' i jest single-line",
      (format) => {
        const model = buildLastChangeTooltipModel({
          source: "local",
          fullDate: "   ", // zmusza fallback
          relativeLabel: "2  minuty\ttemu",
          format,
        });

        expect(model.isRelativeFallback).toBe(true);
        expect(model.timeLineForA11y).not.toBeNull();
        const aria = model.timeLineForA11y!;

        // Sufiks fallbacku ZAWSZE doklejony w a11y.
        expect(aria.endsWith(" (etykieta względna)")).toBe(true);
        // A11Y single-line, niezależnie od format.
        expect(aria).not.toMatch(/[\n\r\t]/);
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

  /**
   * Centralizacja prefiksu „Czas: " — testy jednostkowe składania linii czasu.
   *
   * Wcześniej literał „Czas: " występował inline w dwóch miejscach helpera
   * (`timeLineForView` i pośrednio `timeLineForA11y` przez interpolację).
   * Po refactorze prefiks jest składany WYŁĄCZNIE w `composeTimeLine`,
   * a `TIME_LINE_PREFIX` jest jedyną stałą stringową — zerowe ryzyko
   * literówki ani zdublowanego prefiksu.
   *
   * Te testy zabezpieczają cztery kontrakty:
   *  1. Prefiks jest stałą wartością „Czas: " (z dokładnie jedną spacją).
   *  2. composeTimeLine zwraca null dla pustego/whitespace/non-string.
   *  3. composeTimeLine dodaje prefiks DOKŁADNIE RAZ (kontrola occurrence).
   *  4. composeTimeLine NIE wywołuje smoothTimeValue ponownie — wartość
   *     przekazana jako już wygładzona JEST UŻYTA 1:1 (bytewise).
   */
  describe("composeTimeLine — centralny składacz linii czasu", () => {
    it("TIME_LINE_PREFIX to dokładnie 'Czas: ' (z jedną spacją końcową)", () => {
      expect(TIME_LINE_PREFIX).toBe("Czas: ");
      expect(TIME_LINE_PREFIX.endsWith(" ")).toBe(true);
      expect(TIME_LINE_PREFIX.match(/ /g)?.length).toBe(1);
    });

    it.each([
      ["pusty string", ""],
      ["sam space", " "],
      ["wielokrotny whitespace", "   \t  "],
      ["sam newline", "\n"],
    ])("'%s' → null (brak treści, blokada osieroconego prefiksu)", (_label, input) => {
      expect(composeTimeLine(input)).toBeNull();
    });

    it.each([
      ["null", null],
      ["undefined", undefined],
      ["number", 12345],
      ["object", { foo: "bar" }],
    ])("non-string '%s' → null (defensywna obrona przed crashem)", (_label, input) => {
      expect(composeTimeLine(input as unknown as string)).toBeNull();
    });

    it("dodaje prefiks DOKŁADNIE RAZ — żadnego zdublowania", () => {
      const result = composeTimeLine("12:34:56");
      expect(result).toBe("Czas: 12:34:56");
      // Liczymy occurrence: dokładnie 1 wystąpienie „Czas:".
      expect(result?.match(/Czas:/g)?.length).toBe(1);
    });

    it("NIE wygładza wartości ponownie — przekazany string trafia 1:1 po prefiksie", () => {
      // Kontrakt: composeTimeLine ufa, że konsument już wywołał smoothTimeValue.
      // Surowy input z whitespace nie powinien być modyfikowany — tylko
      // kompletnie pusty/whitespace daje null. Tu mamy treść, więc 1:1.
      const result = composeTimeLine("12:34   56");
      expect(result).toBe("Czas: 12:34   56");
    });
  });

  /**
   * Snapshoty pełnego modelu — testy regresji wizualnej dla helpera.
   *
   * Snapshot łapie KAŻDĄ zmianę w sklejaniu pól (`timeLineForView`,
   * `timeLineForA11y`, `ariaText`, `timeLineHelpTitle`) bez konieczności
   * dopisywania osobnej asercji per pole. Jeśli ktoś przypadkiem zmieni
   * prefiks, dodawanie sufiksu „(etykieta względna)" albo separator linii
   * w ariaText — snapshot pęknie i jasno pokaże, co się zmieniło.
   *
   * Pokrywamy 7 wariantów wejścia obejmujących wszystkie ścieżki kodu:
   *  1. Happy path: remote + pełna data
   *  2. Local + pełna data
   *  3. Fallback na relativeLabel (full whitespace)
   *  4. Brak danych (null + null) — tylko 2 linie ariaText
   *  5. source=null + dane (bezpieczny fallback nagłówka)
   *  6. Format 'compact' (zwarte separatory)
   *  7. Format 'preserve-newlines' (wieloliniowy timeValue)
   */
  describe("snapshoty pełnego modelu dla wariantów wejścia", () => {
    it("[1] remote + pełna data — happy path", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia 2026, 12:34:56",
        relativeLabel: "2 minuty temu",
      });
      expect(model).toMatchSnapshot();
    });

    it("[2] local + pełna data — lokalny nagłówek + brak kwalifikatora a11y", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "24 kwietnia 2026, 12:34:56",
        relativeLabel: "2 minuty temu",
      });
      expect(model).toMatchSnapshot();
    });

    it("[3] fallback na relativeLabel — full=whitespace, sufiks „(etykieta względna)” w a11y", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "   \n\t  ",
        relativeLabel: "5 sekund temu",
      });
      expect(model).toMatchSnapshot();
    });

    it("[4] brak danych (null + null) — ariaText 2-liniowy, brak „Czas:”", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: null,
        relativeLabel: null,
      });
      expect(model).toMatchSnapshot();
    });

    it("[5] source=null + dane — nagłówek lokalny jako bezpieczny fallback", () => {
      const model = buildLastChangeTooltipModel({
        source: null,
        fullDate: "24 kwietnia 2026, 12:34:56",
        relativeLabel: "2 minuty temu",
      });
      expect(model).toMatchSnapshot();
    });

    it("[6] format='compact' — zwarte separatory wokół `,` i `:`", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia 2026 ,  12 : 34 : 56",
        relativeLabel: "ignored",
        format: "compact",
      });
      expect(model).toMatchSnapshot();
    });

    it("[7] format='preserve-newlines' — wieloliniowa wartość czasu zachowana", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "24 kwietnia 2026\n\n12:34:56",
        relativeLabel: "ignored",
        format: "preserve-newlines",
      });
      expect(model).toMatchSnapshot();
    });
  });
});

/**
 * I18N — tooltip „Ostatnia zmiana" obsługuje PL (default) i EN.
 *
 * Pokrywamy:
 *  1. `resolveLocale` — primary subtag, fallback do „pl" dla nieznanych.
 *  2. `getTimeLinePrefix` — prefiks „Czas: " / „Time: ".
 *  3. `composeTimeLine` z param `locale` — backward-compat (default PL).
 *  4. `buildLastChangeTooltipModel({ locale })` — pełny tooltip w EN:
 *     prefiks linii czasu, sufiks fallbacku, helpTitle, ariaHeading.
 *  5. Spójność: dla każdego locale ariaText nie miesza języków.
 */
describe("i18n — obsługa języków PL/EN w tooltipie Ostatnia zmiana", () => {
  describe("resolveLocale", () => {
    it.each([
      ["pl", "pl"],
      ["en", "en"],
      ["pl-PL", "pl"],
      ["en-US", "en"],
      ["en-GB", "en"],
      ["en_US", "en"], // underscore też jest separatorem
      ["EN", "en"], // case-insensitive
      ["Pl-pL", "pl"],
    ])("'%s' → '%s'", (input, expected) => {
      expect(resolveLocale(input)).toBe(expected);
    });

    it.each([
      [null],
      [undefined],
      [""],
      ["fr"],
      ["es-ES"],
      ["xx-YY"],
      [123 as unknown as string],
      [{} as unknown as string],
    ])("nieznane/niepoprawne wejście → fallback 'pl' (%s)", (input) => {
      expect(resolveLocale(input as string | null | undefined)).toBe("pl");
    });

    it("SUPPORTED_LOCALES eksportuje dokładnie obsługiwane języki", () => {
      expect([...SUPPORTED_LOCALES].sort()).toEqual(["de", "en", "it", "pl"]);
    });
  });

  describe("getTimeLinePrefix", () => {
    it("PL → 'Czas: ' (z dokładnie jedną spacją końcową)", () => {
      expect(getTimeLinePrefix("pl")).toBe("Czas: ");
    });

    it("EN → 'Time: ' (z dokładnie jedną spacją końcową)", () => {
      expect(getTimeLinePrefix("en")).toBe("Time: ");
    });

    it("DE → 'Zeit: '", () => {
      expect(getTimeLinePrefix("de")).toBe("Zeit: ");
      expect(getTimeLinePrefix("de-DE")).toBe("Zeit: ");
      expect(getTimeLinePrefix("de-AT")).toBe("Zeit: ");
    });

    it("IT → 'Ora: '", () => {
      expect(getTimeLinePrefix("it")).toBe("Ora: ");
      expect(getTimeLinePrefix("it-IT")).toBe("Ora: ");
      expect(getTimeLinePrefix("it-CH")).toBe("Ora: ");
    });

    it("default (bez argumentu) → PL (kompatybilność wsteczna)", () => {
      expect(getTimeLinePrefix()).toBe(TIME_LINE_PREFIX);
      expect(getTimeLinePrefix()).toBe("Czas: ");
    });

    it("BCP-47 z regionem działa: 'en-US' → 'Time: '", () => {
      expect(getTimeLinePrefix("en-US")).toBe("Time: ");
      expect(getTimeLinePrefix("pl-PL")).toBe("Czas: ");
    });

    it("nieznany język → fallback PL ('Czas: ')", () => {
      expect(getTimeLinePrefix("fr")).toBe("Czas: ");
      expect(getTimeLinePrefix("es-ES")).toBe("Czas: ");
    });
  });

  describe("composeTimeLine z parametrem locale", () => {
    it("PL: 'composeTimeLine(\"12:34\", \"pl\")' → 'Czas: 12:34'", () => {
      expect(composeTimeLine("12:34", "pl")).toBe("Czas: 12:34");
    });

    it("EN: 'composeTimeLine(\"12:34\", \"en\")' → 'Time: 12:34'", () => {
      expect(composeTimeLine("12:34", "en")).toBe("Time: 12:34");
    });

    it("default (bez locale) → PL — backward compat z istniejącymi wywołaniami", () => {
      expect(composeTimeLine("12:34")).toBe("Czas: 12:34");
    });

    it("pusty/whitespace → null niezależnie od locale", () => {
      for (const locale of ["pl", "en", "fr", undefined] as const) {
        expect(composeTimeLine("", locale as string)).toBeNull();
        expect(composeTimeLine("   ", locale as string)).toBeNull();
        expect(composeTimeLine("\n\t", locale as string)).toBeNull();
      }
    });
  });

  describe("buildLastChangeTooltipModel({ locale })", () => {
    it("EN + remote + pełna data: prefiks 'Time:', nagłówek 'Cross-tab synchronization'", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "April 24, 2026, 12:34:56",
        relativeLabel: "2 minutes ago",
        locale: "en",
      });

      expect(model.content.locale).toBe("en");
      expect(model.content.heading).toBe("Cross-tab synchronization");
      expect(model.content.ariaHeading).toBe("Source: Cross-tab synchronization");
      expect(model.content.description).toMatch(/another open tab/);
      expect(model.timeLineForView).toBe("Time: April 24, 2026, 12:34:56");
      expect(model.timeLineForA11y).toBe("Time: April 24, 2026, 12:34:56");
      expect(model.timeLineHelpTitle).toBeUndefined();
      // ariaText nie może mieć ŻADNEGO polskiego słowa.
      expect(model.ariaText).not.toMatch(/Czas:|Źródło:|karta|karcie|kartami/);
      expect(model.ariaText).toMatch(/^Source: Cross-tab synchronization\n/);
    });

    it("EN + local: aria-headingOverride 'My local action in this tab'", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "April 24, 2026",
        relativeLabel: "just now",
        locale: "en",
      });

      expect(model.content.heading).toBe("Local action in this tab");
      // Pierwszoosobowy override w aria-label, dokładnie jak w PL ("Moja…").
      expect(model.content.ariaHeading).toBe("Source: My local action in this tab");
      expect(model.content.description).toMatch(/Switch|Alt\+Shift\+A/);
    });

    it("EN + fallback na relative: sufiks '(relative label)' i help title po angielsku", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "",
        relativeLabel: "2 minutes ago",
        locale: "en",
      });

      expect(model.isRelativeFallback).toBe(true);
      expect(model.timeLineForView).toBe("Time: 2 minutes ago");
      expect(model.timeLineForA11y).toBe("Time: 2 minutes ago (relative label)");
      expect(model.timeLineHelpTitle).toBe(
        "Full date unavailable — showing a relative label.",
      );
      // Nie wolno wyciec polskiego sufiksu.
      expect(model.ariaText).not.toContain("(etykieta względna)");
      expect(model.ariaText).not.toContain("Pełna data niedostępna");
    });

    it("PL default (bez param locale) — pełna kompatybilność wsteczna", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia 2026, 12:34:56",
        relativeLabel: "2 minuty temu",
      });

      expect(model.content.locale).toBe("pl");
      expect(model.content.heading).toBe("Synchronizacja między kartami");
      expect(model.content.ariaHeading).toBe("Źródło: Synchronizacja między kartami");
      expect(model.timeLineForView).toBe("Czas: 24 kwietnia 2026, 12:34:56");
    });

    it("PL fallback dla relative — sufiks '(etykieta względna)' i polski help title", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "",
        relativeLabel: "2 minuty temu",
        locale: "pl",
      });

      expect(model.timeLineForA11y).toBe("Czas: 2 minuty temu (etykieta względna)");
      expect(model.timeLineHelpTitle).toBe(
        "Pełna data niedostępna — pokazujemy etykietę względną.",
      );
    });

    it("BCP-47 z regionem ('en-US') aktywuje EN", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "April 24",
        relativeLabel: "n/a",
        locale: "en-US",
      });

      expect(model.content.locale).toBe("en");
      expect(model.timeLineForView).toBe("Time: April 24");
    });

    it("nieznany locale ('fr') → fallback PL (default kliniki)", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia",
        relativeLabel: "2 minuty temu",
        locale: "fr",
      });

      expect(model.content.locale).toBe("pl");
      expect(model.content.heading).toBe("Synchronizacja między kartami");
      expect(model.timeLineForView).toBe("Czas: 24 kwietnia");
    });

    it("spójność: dla każdego locale ariaText nie miesza języków", () => {
      // Regression guard: nigdy nie powstanie tooltip typu
      // "Source: Cross-tab synchronization\n…\nCzas: 12:34" (PL prefiks
      // przykleił się do EN nagłówka).
      const FORBIDDEN_IN_EN = ["Czas:", "Źródło:", "karta", "karcie", "kartami"];
      const FORBIDDEN_IN_PL = ["Time:", "Source:", "Cross-tab", "Local action in"];

      const en = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "April 24",
        relativeLabel: "2 minutes ago",
        locale: "en",
      });
      for (const phrase of FORBIDDEN_IN_EN) {
        expect(en.ariaText, `EN ariaText nie może zawierać "${phrase}"`).not.toContain(phrase);
      }

      const pl = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia",
        relativeLabel: "2 minuty temu",
        locale: "pl",
      });
      for (const phrase of FORBIDDEN_IN_PL) {
        expect(pl.ariaText, `PL ariaText nie może zawierać "${phrase}"`).not.toContain(phrase);
      }
    });

    it("parytet view↔a11y w EN: prefiks i wartość są DOKŁADNIE te same w obu kanałach", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "April 24, 2026",
        relativeLabel: "2 minutes ago",
        locale: "en",
      });
      // timeLineForView nie ma sufiksu "(relative label)" (mamy pełną datę).
      expect(model.timeLineForView).toBe("Time: April 24, 2026");
      expect(model.timeLineForA11y).toBe("Time: April 24, 2026");
      expect(model.timeLineForA11y).toBe(model.timeLineForView);
    });
  });
});

/**
 * GUARD a11y — `ariaText` NIGDY nie może mieć:
 *  - pustych linii (regex `/\n\s*\n/`),
 *  - trailing/leading newline,
 *  - osieroconego prefiksu „Czas: " / „Time: " bez treści po,
 *  - wewnętrznego `\n` wprowadzonego przez `format: "preserve-newlines"`
 *    (kanały a11y MUSZĄ być single-line w wartości czasu, niezależnie od
 *    formatu wybranego dla widocznej linii).
 *
 * Te testy są ostatnim szczeblem obrony — pilnują kontraktu, na którym
 * polega screen reader (NVDA/JAWS/VoiceOver pauzują na każdym `\n`,
 * a osierocony prefiks „Czas: " bez wartości brzmi jak błąd UI).
 */
describe("ariaText guard — brak pustych linii i osieroconych prefiksów", () => {
  /**
   * Helper asercji — rzuca jeżeli `ariaText` narusza inwarianty.
   * Współdzielony przez wszystkie scenariusze tej sekcji.
   */
  const ALL_TIME_PREFIXES = ["Czas: ", "Time: ", "Zeit: ", "Ora: "] as const;
  type AnyTimePrefix = (typeof ALL_TIME_PREFIXES)[number];

  const assertAriaTextInvariants = (
    ariaText: string,
    {
      expectedTimePrefix,
    }: { expectedTimePrefix: AnyTimePrefix | null },
  ) => {
    // 1. Brak pustych linii (\n\n lub \n   \n).
    expect(ariaText, "ariaText nie może mieć pustych linii").not.toMatch(/\n\s*\n/);

    // 2. Brak trailing/leading whitespace (w tym `\n`).
    expect(ariaText).toBe(ariaText.trim());

    // 3. Każda linia po podziale na `\n` jest niepusta po trim.
    const lines = ariaText.split("\n");
    for (const [idx, line] of lines.entries()) {
      expect(
        line.trim().length,
        `linia ${idx} ("${line}") musi mieć treść po trim`,
      ).toBeGreaterThan(0);
    }

    // 4. Brak osieroconego prefiksu w żadnym wspieranym języku.
    for (const prefix of ALL_TIME_PREFIXES) {
      for (const [idx, line] of lines.entries()) {
        expect(
          line.trim() === prefix.trim(),
          `linia ${idx} ("${line}") nie może być osieroconym prefiksem "${prefix.trim()}"`,
        ).toBe(false);
        if (line.startsWith(prefix)) {
          expect(
            line.slice(prefix.length).trim().length,
            `linia ${idx} ma prefiks "${prefix.trim()}" — wymaga treści po nim`,
          ).toBeGreaterThan(0);
        }
      }
    }

    // 5. Jeżeli oczekujemy prefiksu — dokładnie jedna linia musi go zawierać.
    if (expectedTimePrefix !== null) {
      const matching = lines.filter((l) => l.startsWith(expectedTimePrefix));
      expect(
        matching.length,
        `dokładnie jedna linia musi zaczynać się od "${expectedTimePrefix}"`,
      ).toBe(1);
    }
  };

  describe("preserve-newlines — wartość czasu wieloliniowa", () => {
    it("PL: ariaText pozostaje single-line w linii czasu mimo \\n w fullDate", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "24 kwietnia 2026\n12:34:56",
        relativeLabel: null,
        locale: "pl",
        format: "preserve-newlines",
      });

      // Widoczna linia ZACHOWUJE newline (kontrakt preserve-newlines).
      expect(model.timeLineForView).toBe("Czas: 24 kwietnia 2026\n12:34:56");
      // A11y linia jest single-line (wymuszone w helperze).
      expect(model.timeLineForA11y).toBe("Czas: 24 kwietnia 2026 12:34:56");
      expect(model.ariaText.split("\n")).toHaveLength(3);

      assertAriaTextInvariants(model.ariaText, { expectedTimePrefix: "Czas: " });
    });

    it("EN: ariaText pozostaje single-line w linii czasu mimo \\n w fullDate", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "April 24, 2026\n12:34:56",
        relativeLabel: null,
        locale: "en",
        format: "preserve-newlines",
      });

      expect(model.timeLineForView).toBe("Time: April 24, 2026\n12:34:56");
      expect(model.timeLineForA11y).toBe("Time: April 24, 2026 12:34:56");
      expect(model.ariaText.split("\n")).toHaveLength(3);

      assertAriaTextInvariants(model.ariaText, { expectedTimePrefix: "Time: " });
    });

    it("preserve-newlines + relativeLabel z \\n: a11y jest single-line + sufiks", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: null,
        relativeLabel: "2 minuty\ntemu",
        locale: "pl",
        format: "preserve-newlines",
      });

      expect(model.isRelativeFallback).toBe(true);
      expect(model.timeLineForView).toBe("Czas: 2 minuty\ntemu");
      expect(model.timeLineForA11y).toBe("Czas: 2 minuty temu (etykieta względna)");
      expect(model.ariaText.split("\n")).toHaveLength(3);

      assertAriaTextInvariants(model.ariaText, { expectedTimePrefix: "Czas: " });
    });

    it("preserve-newlines z wieloma kolejnymi \\n: ariaText nie wprowadza pustych linii", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: "24 kwietnia\n\n\n2026\n\n12:34",
        relativeLabel: null,
        locale: "pl",
        format: "preserve-newlines",
      });

      expect(model.timeLineForView).toBe("Czas: 24 kwietnia\n2026\n12:34");
      expect(model.timeLineForA11y).toBe("Czas: 24 kwietnia 2026 12:34");

      assertAriaTextInvariants(model.ariaText, { expectedTimePrefix: "Czas: " });
    });

    it("preserve-newlines + brak danych: ariaText to 2 linie BEZ prefiksu „Czas:”", () => {
      const model = buildLastChangeTooltipModel({
        source: "local",
        fullDate: null,
        relativeLabel: null,
        locale: "pl",
        format: "preserve-newlines",
      });

      expect(model.shouldRenderTimeLine).toBe(false);
      expect(model.timeLineForA11y).toBeNull();
      expect(model.ariaText.split("\n")).toHaveLength(2);

      assertAriaTextInvariants(model.ariaText, { expectedTimePrefix: null });
    });

    it("preserve-newlines + fullDate=tylko-whitespace-z-newline: brak osieroconego prefiksu", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: "\n\n\t  \n",
        relativeLabel: null,
        locale: "pl",
        format: "preserve-newlines",
      });

      expect(model.shouldRenderTimeLine).toBe(false);
      expect(model.timeLineForView).toBeNull();
      expect(model.timeLineForA11y).toBeNull();
      expect(model.ariaText).not.toContain("Czas:");
      assertAriaTextInvariants(model.ariaText, { expectedTimePrefix: null });
    });
  });

  describe("inwarianty na macierzy format×locale×source×wejście", () => {
    /**
     * Macierz brute-force: każda kombinacja wejścia musi spełnić kontrakt.
     * Pilnuje, że żadna przyszła zmiana nie wprowadzi regresji w jakimkolwiek
     * trybie — bez konieczności pisania osobnego testu per kombinacja.
     */
    const FORMATS: TimeValueFormat[] = ["single-space", "compact", "preserve-newlines"];
    const SOURCES = ["remote", "local", null] as const;
    const FULL_DATES = [
      "24 kwietnia 2026, 12:34:56",
      "24 kwietnia 2026\n12:34:56",
      "  spacje  i\ttabulatory  ",
      null,
      "",
      "   ",
      "\n\n",
    ];
    const RELATIVES = ["5 sekund temu", "2 minuty\ntemu", null, ""];

    for (const format of FORMATS) {
      for (const locale of SUPPORTED_LOCALES) {
        for (const source of SOURCES) {
          for (const fullDate of FULL_DATES) {
            for (const relativeLabel of RELATIVES) {
              const label = `format=${format} locale=${locale} source=${source ?? "null"} fullDate=${JSON.stringify(fullDate)} relative=${JSON.stringify(relativeLabel)}`;
              it(`inwariant: ${label}`, () => {
                const model = buildLastChangeTooltipModel({
                  source,
                  fullDate,
                  relativeLabel,
                  locale,
                  format,
                });

                const expectedPrefix: AnyTimePrefix | null = !model.shouldRenderTimeLine
                  ? null
                  : locale === "en"
                    ? "Time: "
                    : locale === "de"
                      ? "Zeit: "
                      : locale === "it"
                        ? "Ora: "
                        : "Czas: ";

                assertAriaTextInvariants(model.ariaText, {
                  expectedTimePrefix: expectedPrefix,
                });
              });
            }
          }
        }
      }
    }
  });
});


describe("validateLastChangeTooltipInput — walidacja wejścia helpera", () => {
  /**
   * Kontrakt, który ten suite egzekwuje:
   *  1. Walidator NIGDY nie rzuca — UI musi pozostać stabilny dla każdego
   *     możliwego wejścia (null, undefined, prymityw, tablica, obiekt z
   *     polami złych typów).
   *  2. Każde odrzucenie pola jest raportowane jako issue z konkretnym
   *     `code`/`field` — pozwala dev-overlay/testom wykryć regresję
   *     konsumenta (np. hook zwraca `Date` zamiast string).
   *  3. Dla każdego niepoprawnego wejścia `buildLastChangeTooltipModel`
   *     zwraca KOMPLETNY, spójny model — bez `undefined`/`NaN`/exception
   *     w żadnym polu.
   */

  describe("całe wejście niepoprawnego typu — bezpieczny fallback", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["string", "remote"],
      ["number", 42],
      ["boolean", true],
      ["array", ["remote"]],
      ["function", () => {}],
    ])("%s → fallback do { source:null, fullDate:null, ... } + issue 'input-not-object'", (_label, raw) => {
      const result = validateLastChangeTooltipInput(raw);
      expect(result.value).toEqual({
        source: null,
        fullDate: null,
        relativeLabel: null,
        format: "single-space",
        locale: "pl",
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].field).toBe("input");
      expect(result.issues[0].code).toBe("input-not-object");
    });

    it("nawet dla null nie rzuca i model buildera jest kompletny", () => {
      expect(() => buildLastChangeTooltipModel(null as never)).not.toThrow();
      const model = buildLastChangeTooltipModel(null as never);
      // Pełny zestaw pól — żadne `undefined` poza opcjonalnym timeLineHelpTitle.
      expect(model.content).toBeDefined();
      expect(model.content.locale).toBe("pl");
      expect(model.timeValue).toBe("");
      expect(model.shouldRenderTimeLine).toBe(false);
      expect(model.timeLineForView).toBeNull();
      expect(model.timeLineForA11y).toBeNull();
      expect(model.ariaText.length).toBeGreaterThan(0);
      expect(model.ariaText).not.toContain("undefined");
      expect(model.ariaText).not.toContain("null");
    });
  });

  describe("pole 'source' — walidacja typu i wartości", () => {
    it("akceptuje 'remote', 'local', null, undefined", () => {
      expect(validateLastChangeTooltipInput({ source: "remote" }).issues).toHaveLength(0);
      expect(validateLastChangeTooltipInput({ source: "local" }).issues).toHaveLength(0);
      expect(validateLastChangeTooltipInput({ source: null }).issues).toHaveLength(0);
      expect(validateLastChangeTooltipInput({ source: undefined }).issues).toHaveLength(0);
    });

    it.each([
      ["number", 1, "source-invalid-type"],
      ["boolean", true, "source-invalid-type"],
      ["object", {}, "source-invalid-type"],
      ["array", [], "source-invalid-type"],
      ["nieznany string 'REMOTE'", "REMOTE", "source-invalid-value"],
      ["nieznany string ''", "", "source-invalid-value"],
      ["nieznany string 'unknown'", "unknown", "source-invalid-value"],
    ])("%s → fallback null + issue '%s'", (_l, source, expectedCode) => {
      const result = validateLastChangeTooltipInput({ source });
      expect(result.value.source).toBeNull();
      expect(result.issues.some((i) => i.field === "source" && i.code === expectedCode)).toBe(true);
    });
  });

  describe("pole 'fullDate' / 'relativeLabel' — walidacja typu", () => {
    it("akceptuje string, null, undefined (w tym pusty string)", () => {
      expect(validateLastChangeTooltipInput({ fullDate: "abc", relativeLabel: "x" }).issues).toHaveLength(0);
      expect(validateLastChangeTooltipInput({ fullDate: "", relativeLabel: "" }).issues).toHaveLength(0);
      expect(validateLastChangeTooltipInput({ fullDate: null, relativeLabel: null }).issues).toHaveLength(0);
    });

    it.each([
      ["number", 1234567890],
      ["boolean", false],
      ["object Date-like", { toISOString: () => "x" }],
      ["array", ["2026-04-24"]],
      ["NaN", Number.NaN],
    ])("fullDate jako %s → null + issue", (_l, fullDate) => {
      const result = validateLastChangeTooltipInput({ fullDate });
      expect(result.value.fullDate).toBeNull();
      expect(result.issues.some((i) => i.field === "fullDate" && i.code === "fullDate-invalid-type")).toBe(true);
    });

    it.each([
      ["number", 999],
      ["boolean", true],
      ["object", {}],
      ["array", []],
    ])("relativeLabel jako %s → null + issue", (_l, relativeLabel) => {
      const result = validateLastChangeTooltipInput({ relativeLabel });
      expect(result.value.relativeLabel).toBeNull();
      expect(result.issues.some((i) => i.field === "relativeLabel" && i.code === "relativeLabel-invalid-type")).toBe(true);
    });
  });

  describe("pole 'format' — walidacja typu i wartości", () => {
    it("akceptuje wszystkie TimeValueFormat oraz undefined", () => {
      const formats: TimeValueFormat[] = ["single-space", "compact", "preserve-newlines"];
      for (const format of formats) {
        const result = validateLastChangeTooltipInput({ format });
        expect(result.value.format).toBe(format);
        expect(result.issues).toHaveLength(0);
      }
      expect(validateLastChangeTooltipInput({ format: undefined }).value.format).toBe("single-space");
    });

    it.each([
      ["number", 1, "format-invalid-type"],
      ["boolean", false, "format-invalid-type"],
      ["object", {}, "format-invalid-type"],
      ["null", null, "format-invalid-type"],
      ["nieznany string 'pretty'", "pretty", "format-invalid-value"],
      ["nieznany string ''", "", "format-invalid-value"],
      ["case-mismatch 'Compact'", "Compact", "format-invalid-value"],
    ])("%s → fallback 'single-space' + issue '%s'", (_l, format, expectedCode) => {
      const result = validateLastChangeTooltipInput({ format });
      expect(result.value.format).toBe("single-space");
      expect(result.issues.some((i) => i.field === "format" && i.code === expectedCode)).toBe(true);
    });
  });

  describe("pole 'locale' — walidacja typu (resolveLocale dba o nieznane języki)", () => {
    it("akceptuje string, null, undefined", () => {
      expect(validateLastChangeTooltipInput({ locale: "pl" }).issues).toHaveLength(0);
      expect(validateLastChangeTooltipInput({ locale: "en-US" }).issues).toHaveLength(0);
      expect(validateLastChangeTooltipInput({ locale: "klingon" }).issues).toHaveLength(0);
      expect(validateLastChangeTooltipInput({ locale: null }).issues).toHaveLength(0);
      expect(validateLastChangeTooltipInput({ locale: undefined }).issues).toHaveLength(0);
    });

    it.each([
      ["number", 42],
      ["boolean", true],
      ["object", { lang: "pl" }],
      ["array", ["pl"]],
    ])("%s → fallback 'pl' + issue", (_l, locale) => {
      const result = validateLastChangeTooltipInput({ locale });
      expect(result.value.locale).toBe("pl");
      expect(result.issues.some((i) => i.field === "locale" && i.code === "locale-invalid-type")).toBe(true);
    });
  });

  describe("integracja: buildLastChangeTooltipModel z niepoprawnymi polami", () => {
    /**
     * Najtwardszy kontrakt: nawet gdy KAŻDE pole jest złego typu, builder
     * ZWRACA SPÓJNY MODEL (bez throw, bez NaN/undefined w wartościach,
     * z bezpiecznym ariaText i bez osieroconego prefiksu „Czas: ").
     */
    it("wszystkie pola złego typu → kompletny, bezpieczny model", () => {
      const evil = {
        source: 123,
        fullDate: { iso: "2026-04-24" },
        relativeLabel: ["a", "b"],
        format: "FANCY",
        locale: 999,
      } as unknown as Parameters<typeof buildLastChangeTooltipModel>[0];

      expect(() => buildLastChangeTooltipModel(evil)).not.toThrow();
      const model = buildLastChangeTooltipModel(evil);

      expect(model.content.locale).toBe("pl");
      expect(model.content.isRemote).toBe(false);
      expect(model.timeValue).toBe("");
      expect(model.shouldRenderTimeLine).toBe(false);
      expect(model.timeLineForView).toBeNull();
      expect(model.timeLineForA11y).toBeNull();
      expect(model.timeLineHelpTitle).toBeUndefined();
      expect(model.ariaText).not.toContain("Czas: \n");
      expect(model.ariaText).not.toMatch(/Czas:\s*$/);
      expect(model.ariaText).not.toMatch(/\n\s*\n/);
      expect(model.ariaText).not.toContain("undefined");
      expect(model.ariaText).not.toContain("[object Object]");
      expect(model.ariaText).not.toContain("NaN");
    });

    it("częściowo poprawne wejście (source ok, fullDate=number) → model używa relativeLabel", () => {
      const model = buildLastChangeTooltipModel({
        source: "remote",
        fullDate: 1234 as unknown as string,
        relativeLabel: "2 minuty temu",
      });
      expect(model.content.isRemote).toBe(true);
      expect(model.timeValue).toBe("2 minuty temu");
      expect(model.isRelativeFallback).toBe(true);
      expect(model.timeLineForView).toBe("Czas: 2 minuty temu");
      expect(model.timeLineForA11y).toBe("Czas: 2 minuty temu (etykieta względna)");
    });

    it("source niepoprawny string (np. 'REMOTE') → traktowany jak local", () => {
      const model = buildLastChangeTooltipModel({
        source: "REMOTE" as unknown as "remote",
        fullDate: "24 kwietnia 2026, 12:34",
        relativeLabel: null,
      });
      expect(model.content.isRemote).toBe(false);
      expect(model.timeValue).toBe("24 kwietnia 2026, 12:34");
      expect(model.shouldRenderTimeLine).toBe(true);
    });

    it("ariaText pozostaje bezpieczny (single-line, brak osieroconego prefiksu) dla wszystkich edge cases", () => {
      const cases: Array<Parameters<typeof buildLastChangeTooltipModel>[0]> = [
        null as never,
        undefined as never,
        {} as never,
        { source: 1 } as never,
        { source: "remote", fullDate: 0 as unknown as string, relativeLabel: 0 as unknown as string },
        { source: "local", fullDate: null, relativeLabel: undefined, format: "BAD" as never, locale: 7 as never },
      ];
      for (const input of cases) {
        const model = buildLastChangeTooltipModel(input);
        expect(model.ariaText).not.toMatch(/Czas:\s*$/);
        expect(model.ariaText).not.toMatch(/Time:\s*$/);
        expect(model.ariaText).not.toMatch(/\n\s*\n/);
        expect(model.ariaText.startsWith("\n")).toBe(false);
        expect(model.ariaText.endsWith("\n")).toBe(false);
        expect(model.ariaText).not.toContain("undefined");
        expect(model.ariaText).not.toContain("[object Object]");
      }
    });
  });

  describe("issue codes — wszystkie wartości typu są reachable", () => {
    /**
     * Meta-test: każda wartość `ValidationIssueCode` MUSI być produkowalna
     * przez walidator. Zapewnia, że nie zostawimy w typie martwego kodu po
     * refactorze.
     */
    it("każdy ValidationIssueCode jest produkowalny przez konkretne wejście", () => {
      const samples: Array<[ValidationIssueCode, unknown]> = [
        ["input-not-object", null],
        ["source-invalid-type", { source: 1 }],
        ["source-invalid-value", { source: "nope" }],
        ["fullDate-invalid-type", { fullDate: 1 }],
        ["relativeLabel-invalid-type", { relativeLabel: 1 }],
        ["format-invalid-type", { format: 1 }],
        ["format-invalid-value", { format: "nope" }],
        ["locale-invalid-type", { locale: 1 }],
      ];
      for (const [code, raw] of samples) {
        const result = validateLastChangeTooltipInput(raw);
        expect(result.issues.some((i) => i.code === code)).toBe(true);
      }
    });
  });
});
