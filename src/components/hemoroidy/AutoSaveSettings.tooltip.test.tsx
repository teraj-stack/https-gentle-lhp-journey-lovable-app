/**
 * Test integracyjny: `AutoSaveSettings` — tooltip „Ostatnia zmiana” pokazuje
 * właściwy nagłówek źródła zarówno w widzialnej etykiecie/badge'u, jak i w
 * `aria-label` (oraz natywnym `title` jako fallbacku dla touch).
 *
 * Strategia testowa:
 *  - Mockujemy `useAutoSave`, żeby deterministycznie sterować
 *    `lastChangeSource` (`"remote"` vs `"local"`) i `lastChangeAt`
 *    BEZ stymulowania BroadcastChannel/storage (w jsdom BC nie istnieje,
 *    a sterowanie przez storage event jest nondeterministyczne).
 *  - Weryfikujemy DOM po renderze:
 *      a) badge „lokalnie” pojawia się WYŁĄCZNIE dla local (regression guard
 *         na to, że zielony akcent nigdy nie zostanie błędnie pokazany dla
 *         remote, ani odwrotnie),
 *      b) `aria-label` triggera tooltipa zaczyna się od właściwego prefiksu
 *         „Źródło: …" — to jedyna informacja dostępna dla screen readerów
 *         i high-contrast mode, więc MUSI być spójna z wybranym źródłem,
 *      c) `title` triggera (fallback dla touch) zawiera ten sam prefiks,
 *      d) kontrakt cross-language: stringi user-facing używają polskiego
 *         „karta/karcie”, nigdy anglicyzmu „tab”.
 *
 * Świadomie NIE testujemy otwarcia popovera Radix przez hover — w jsdom
 * portal + delayDuration są kruche i powodują flakiness. Treść popovera
 * (heading/description) jest w 100% pokryta przez `lastChangeTooltipContent.test.ts`,
 * a tutaj pilnujemy WIDZIALNYCH atrybutów i elementów wokół Tooltipa.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

// Wartości stanu zwracane przez mock — zmieniamy między testami, żeby
// jeden mock obsłużył oba scenariusze (remote/local/null/undefined) bez resetu modułu.
// Typ rozszerzony o `undefined`, żeby symulować runtime'owy stan, w którym
// hook jeszcze nie zdążył ustawić `lastChangeSource` (np. tuż po mount,
// przed pierwszym storage/BroadcastChannel eventem).
let mockLastChangeSource: "remote" | "local" | null | undefined = null;
let mockLastChangeAt: number | null = null;
let mockEnabled = true;

vi.mock("@/hooks/useAutoSave", () => ({
  useAutoSave: () => ({
    enabled: mockEnabled,
    setEnabled: vi.fn(),
    isRemoteSyncing: false,
    lastRemoteSyncAt: mockLastChangeAt,
    tabLabel: "Karta test01",
    pingState: { isCollecting: false, pingId: null, responses: [], strategy: null },
    sendPing: vi.fn(async () => []),
    clearPing: vi.fn(),
    isBroadcastSupported: false,
    syncHistory: [],
    transport: "storage-fallback" as const,
    degradationInfo: null,
    degradationHistory: [],
    clearDegradationHistory: vi.fn(),
    simulateFallback: false,
    setSimulateFallback: vi.fn(),
    clearSyncHistory: vi.fn(),
    lastChangeSource: mockLastChangeSource,
    lastChangeAt: mockLastChangeAt,
  }),
}));

// Mockujemy toast, żeby render nie wybuchł na braku Toaster providera.
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

// Mockujemy `formatFullTimestamp`, żeby symulować scenariusze, w których
// pełna data NIE jest dostępna (zwraca pusty string / null / "—" fallback).
// W produkcji to się dzieje, gdy `isValidTimestamp` odrzuci wartość
// (NaN/Infinity/0/ujemna). Komponent ma wtedy spaść na `lastSyncLabel`
// (etykieta względna), żeby tooltip nigdy nie pokazywał osieroconej linii „Czas: ".
let mockFullTimestampReturn: string | null | undefined = "DEFAULT_FULL_TIMESTAMP";
vi.mock("@/hooks/useTimeFormatPreference", async () => {
  const actual = await vi.importActual<
    typeof import("@/hooks/useTimeFormatPreference")
  >("@/hooks/useTimeFormatPreference");
  return {
    ...actual,
    formatFullTimestamp: (ts: number) => {
      if (mockFullTimestampReturn === "DEFAULT_FULL_TIMESTAMP") {
        return actual.formatFullTimestamp(ts);
      }
      // Świadome rzutowanie: w produkcji helper zawsze zwraca string,
      // ale tu testujemy obronę komponentu przed null/undefined/"" wyciekiem.
      return mockFullTimestampReturn as unknown as string;
    },
  };
});

// Import PO `vi.mock`, żeby mocki zostały zaaplikowane.
import AutoSaveSettings from "./AutoSaveSettings";

const FROZEN_NOW = 1_700_000_000_000; // 2023-11-14T22:13:20Z

const renderPanel = () =>
  render(
    <TooltipProvider delayDuration={0}>
      <AutoSaveSettings />
    </TooltipProvider>,
  );

/**
 * Lokalizuje trigger tooltipa + zewnętrzny kontener z `aria-label`.
 * Komponent renderuje strukturę:
 *   <div aria-label={tooltipText} aria-live="polite" key={lastChangeAt}>
 *     <Tooltip>
 *       <TooltipTrigger asChild>
 *         <span title={tooltipText} tabIndex={0} class="cursor-help …">
 *           …
 *         </span>
 *       </TooltipTrigger>
 *     </Tooltip>
 *     <button …/>
 *   </div>
 *
 * `title` siedzi na samym triggerze (span), `aria-label` na zewnętrznym `div`
 * (wraz z `aria-live="polite"` — to pojedyncza, deklarująca źródło etykieta
 * dla screen readera, nie zduplikowana z triggerem). Zwracamy obie referencje,
 * żeby asercje sięgały po właściwy atrybut z właściwego węzła.
 */
const findLastChangeTooltip = (): { trigger: HTMLElement; container: HTMLElement } => {
  const triggers = Array.from(
    document.querySelectorAll<HTMLElement>('span[tabindex="0"][title]'),
  );
  const trigger = triggers.find((el) =>
    (el.getAttribute("title") ?? "").startsWith("Źródło: "),
  );
  if (!trigger) {
    throw new Error(
      "Nie znaleziono triggera tooltipa (span[tabindex=0][title^='Źródło: '])",
    );
  }
  // Wspinamy się do najbliższego elementu z aria-label — to jest kontener
  // owijający Tooltipa.
  let container: HTMLElement | null = trigger.parentElement;
  while (container && !container.hasAttribute("aria-label")) {
    container = container.parentElement;
  }
  if (!container) {
    throw new Error("Nie znaleziono kontenera z aria-label otaczającego trigger");
  }
  return { trigger, container };
};

describe("AutoSaveSettings — tooltip „Ostatnia zmiana” wybiera nagłówek per źródło", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FROZEN_NOW));
    // Reset stanu mocka przed każdym testem — defaultowo „brak zmiany”.
    mockLastChangeSource = null;
    mockLastChangeAt = null;
    mockEnabled = true;
    mockFullTimestampReturn = "DEFAULT_FULL_TIMESTAMP";
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("dla source='remote' aria-label i title zawierają „Synchronizacja między kartami”", () => {
    mockLastChangeSource = "remote";
    mockLastChangeAt = FROZEN_NOW;

    renderPanel();

    const { trigger, container } = findLastChangeTooltip();
    const ariaLabel = container.getAttribute("aria-label") ?? "";
    const title = trigger.getAttribute("title") ?? "";

    // Pierwsza linia obu atrybutów MUSI deklarować zdalne źródło.
    expect(ariaLabel.startsWith("Źródło: Synchronizacja między kartami")).toBe(true);
    expect(title.startsWith("Źródło: Synchronizacja między kartami")).toBe(true);
    // Anty-regresja: nigdy nie miesza wariantów.
    expect(ariaLabel).not.toContain("Lokalna akcja w tej karcie");
    expect(title).not.toContain("Lokalna akcja w tej karcie");
    // Badge „lokalnie” jest WYŁĄCZNIE dla local — przy remote nie istnieje.
    expect(screen.queryByText("lokalnie")).not.toBeInTheDocument();
  });

  it("dla source='local' aria-label i title zawierają „Moja lokalna akcja w tej karcie”", () => {
    mockLastChangeSource = "local";
    mockLastChangeAt = FROZEN_NOW;

    renderPanel();

    const { trigger, container } = findLastChangeTooltip();
    const ariaLabel = container.getAttribute("aria-label") ?? "";
    const title = trigger.getAttribute("title") ?? "";

    expect(ariaLabel.startsWith("Źródło: Moja lokalna akcja w tej karcie")).toBe(true);
    expect(title.startsWith("Źródło: Moja lokalna akcja w tej karcie")).toBe(true);
    expect(ariaLabel).not.toContain("Synchronizacja między kartami");
    expect(title).not.toContain("Synchronizacja między kartami");

    // Widzialny badge „lokalnie” musi się pokazać (visible regression guard
    // na styl + ml-1.5 spacing). aria-label badge'a też musi mówić o źródle.
    const badge = screen.getByText("lokalnie");
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute("aria-label")).toBe(
      "Źródło: Moja lokalna akcja w tej karcie",
    );
  });

  it("przełączenie remote → local (re-render) podmienia nagłówek w aria-label", () => {
    // Scenariusz: najpierw przyszła zmiana zdalna, po chwili pacjent
    // klika Switch lokalnie. Tooltip MUSI natychmiast przełączyć kontekst
    // — gdyby React cache'ował stary aria-label, screen reader czytałby
    // nieprawidłowe źródło.
    mockLastChangeSource = "remote";
    mockLastChangeAt = FROZEN_NOW;
    const { rerender } = renderPanel();

    let { trigger, container } = findLastChangeTooltip();
    expect(container.getAttribute("aria-label") ?? "").toContain(
      "Synchronizacja między kartami",
    );

    // Symulacja lokalnej akcji — zmieniamy stan mocka i wymuszamy re-render
    // przez nową instancję komponentu w tym samym providerze.
    mockLastChangeSource = "local";
    mockLastChangeAt = FROZEN_NOW + 1_000;
    rerender(
      <TooltipProvider delayDuration={0}>
        <AutoSaveSettings />
      </TooltipProvider>,
    );

    ({ trigger, container } = findLastChangeTooltip());
    const ariaLabel = container.getAttribute("aria-label") ?? "";
    expect(ariaLabel).toContain("Moja lokalna akcja w tej karcie");
    expect(ariaLabel).not.toContain("Synchronizacja między kartami");
  });

  it("aria-label NIGDY nie używa anglicyzmu „tab” — zawsze polskie „karta/karcie”", () => {
    // Reguła z `mem://design/ui-language-tab-vs-karta`: cały interfejs po
    // polsku mówi „karta”, nigdy „tab”/„cross-tab”/„local-tab”. Test pilnuje,
    // żeby copy w aria-label triggera było zgodne z badge'em i tooltipem
    // (wszystko korzysta z `getLastChangeTooltipContent`).
    for (const source of ["remote", "local"] as const) {
      mockLastChangeSource = source;
      mockLastChangeAt = FROZEN_NOW;
      const { unmount } = renderPanel();

      const { trigger, container } = findLastChangeTooltip();
      const ariaLabel = container.getAttribute("aria-label") ?? "";

      // Nie pojawia się anglicyzm „tab” ani jego pochodne.
      expect(ariaLabel).not.toMatch(/\btab\b/i);
      expect(ariaLabel).not.toMatch(/cross-tab|within-tab|local-tab/i);
      // Pojawia się polski rdzeń „kart-/karc-” (karta/karty/kartami/karcie).
      expect(ariaLabel.toLowerCase()).toMatch(/\bkar[ct]/);

      unmount();
    }
  });

  /**
   * Fallback dla nieustalonego źródła (`null` / `undefined`):
   *
   * `isLastChangeVisible(visibility, source)` defensywnie zwraca `false`, gdy
   * `source === null`. To celowy fallback bezpieczeństwa: dopóki hook nie
   * potwierdzi pochodzenia zmiany (remote vs local), etykieta „Ostatnia zmiana"
   * NIE renderuje się wcale — bo jakikolwiek nagłówek byłby zgadywaniem
   * (a fałszywe „Synchronizacja między kartami" wprowadzałoby pacjenta w błąd
   * o tym, gdzie powstała zmiana). To jest „poprawny fallback nagłówka":
   * brak triggera tooltipa zamiast triggera z niepewnym aria-label.
   *
   * Te testy pilnują kontraktu, żeby przyszłe zmiany hooka/komponentu nie
   * przepuściły np. „Źródło: undefined" do screen readera albo nie pokazały
   * badge'a „lokalnie" tylko dlatego, że `source !== "remote"`.
   */
  describe("fallback dla lastChangeSource=null/undefined", () => {
    it("source=null + lastChangeAt=valid: etykieta i badge nie renderują się", () => {
      // Klasyczny fresh mount: timestamp już istnieje (np. z poprzedniej sesji
      // przeczytany z localStorage), ale hook nie zdążył jeszcze zaklasyfikować
      // źródła. Etykieta MUSI być ukryta — bo nie wiemy, czy to zmiana zdalna
      // czy lokalna, więc aria-label byłby kłamstwem.
      mockLastChangeSource = null;
      mockLastChangeAt = FROZEN_NOW;

      renderPanel();

      // Brak triggera tooltipa z prefiksem „Źródło: ".
      const triggers = Array.from(
        document.querySelectorAll<HTMLElement>('span[tabindex="0"][title]'),
      );
      const sourceTrigger = triggers.find((el) =>
        (el.getAttribute("title") ?? "").startsWith("Źródło: "),
      );
      expect(sourceTrigger).toBeUndefined();

      // Badge „lokalnie" też nie istnieje — nie udajemy lokalnej akcji,
      // gdy źródło jest niepotwierdzone.
      expect(screen.queryByText("lokalnie")).not.toBeInTheDocument();

      // Globalne anty-regresje: nigdzie w DOM nie wycieka stringified `null`/`undefined`
      // („Źródło: null", „Źródło: undefined") — to byłaby wpadka serializacyjna.
      expect(document.body.textContent ?? "").not.toMatch(/Źródło:\s*(null|undefined)/i);
    });

    it("source=undefined + lastChangeAt=valid: tooltip i badge spadają na bezpieczny wariant LOCAL", () => {
      // Asymetria z `null`: `isLastChangeVisible` ma early-return tylko na
      // `source === null`, więc `undefined` przechodzi dalej i przy domyślnym
      // visibility=`both` etykieta JEST widoczna. W tej sytuacji nagłówek
      // musi spaść na bezpieczny wariant lokalny — nigdy nie udajemy
      // „Synchronizacji między kartami", bo to byłoby kłamstwo o pochodzeniu
      // zmiany. Odpowiada za to defensywny fallback w `getLastChangeTooltipContent`
      // (wszystko ≠ "remote" → wariant local), który tu właśnie weryfikujemy
      // end-to-end z DOM.
      mockLastChangeSource = undefined;
      mockLastChangeAt = FROZEN_NOW;

      renderPanel();

      const { trigger, container } = findLastChangeTooltip();
      const ariaLabel = container.getAttribute("aria-label") ?? "";
      const title = trigger.getAttribute("title") ?? "";

      // Fallback nagłówka: wariant lokalny, NIGDY remote.
      expect(ariaLabel.startsWith("Źródło: Moja lokalna akcja w tej karcie")).toBe(true);
      expect(title.startsWith("Źródło: Moja lokalna akcja w tej karcie")).toBe(true);
      expect(ariaLabel).not.toContain("Synchronizacja między kartami");
      expect(title).not.toContain("Synchronizacja między kartami");

      // Anty-regresja serializacji: nigdy do DOM nie wycieka „undefined"/„null"
      // jako część etykiety źródła.
      expect(document.body.textContent ?? "").not.toMatch(/Źródło:\s*(null|undefined)/i);

      // Badge „lokalnie" celowo NIE pojawia się dla `undefined` — `getLastChangeLabelStyle`
      // ma `showLocalSuffix: source === "local"`, więc tylko twardo potwierdzone
      // lokalne źródło dostaje widoczny badge. To kolejna warstwa ostrożności:
      // tooltip mówi „lokalna" jako bezpieczny fallback dla screen readera,
      // ale wizualny badge nie udaje pewności, której nie mamy.
      expect(screen.queryByText("lokalnie")).not.toBeInTheDocument();
    });

    it("source=null + lastChangeAt=null: cała sekcja „Ostatnia zmiana” nie renderuje się", () => {
      // Stan początkowy zaraz po pierwszym mount, zanim cokolwiek się
      // wydarzyło. Brak timestampu → `lastSyncLabel` jest null → cały
      // blok JSX pod `lastSyncLabel && showLastChangeLabel && (…)` jest
      // zwarty na false. Pilnujemy, żeby do DOM nie wyciekł żaden ślad
      // „Ostatnia zmiana:" (label) ani „Źródło:" (tooltip).
      mockLastChangeSource = null;
      mockLastChangeAt = null;

      renderPanel();

      expect(screen.queryByText(/Ostatnia zmiana:/)).not.toBeInTheDocument();
      expect(document.body.textContent ?? "").not.toContain("Źródło: ");
      expect(screen.queryByText("lokalnie")).not.toBeInTheDocument();
    });

    it("przejście null → 'remote' (re-render) ujawnia tooltip z właściwym nagłówkiem", () => {
      // Realistyczny przepływ: mount z `source=null` (etykieta ukryta),
      // potem hook ustala źródło na „remote" (np. po pierwszym storage event).
      // Tooltip MUSI pojawić się od razu z poprawnym aria-label, a nie
      // zostać w trybie ukrytym z poprzedniego renderu.
      mockLastChangeSource = null;
      mockLastChangeAt = null;
      const { rerender } = renderPanel();

      // Pre-warunek: nic nie ma.
      expect(document.body.textContent ?? "").not.toContain("Źródło: ");

      // Hook „dowiaduje się" o zdalnej zmianie.
      mockLastChangeSource = "remote";
      mockLastChangeAt = FROZEN_NOW;
      rerender(
        <TooltipProvider delayDuration={0}>
          <AutoSaveSettings />
        </TooltipProvider>,
      );

      const { container } = findLastChangeTooltip();
      const ariaLabel = container.getAttribute("aria-label") ?? "";
      expect(ariaLabel.startsWith("Źródło: Synchronizacja między kartami")).toBe(true);
    });
  });

  /**
   * Atrybuty dostępności triggera (a11y contract):
   *
   *  - `aria-label` (na zewnętrznym kontenerze) i `title` (na samym triggerze
   *    `<span tabindex=0>`) MUSZĄ deklarować dokładnie JEDNO źródło zmiany —
   *    nigdy nie mogą zawierać equivalentów obu wariantów jednocześnie
   *    (mieszany komunikat „Synchronizacja… + Lokalna…" zafałszowałby kontekst
   *    dla screen readera i pacjenta na touch).
   *  - Oba atrybuty MUSZĄ być spójne (ten sam prefiks „Źródło: …"), żeby
   *    użytkownik VO/NVDA/touch nie dostał sprzecznej informacji w zależności
   *    od kanału prezentacji.
   *  - `aria-live="polite"` na kontenerze pilnuje, że przełączenie źródła
   *    zostanie ogłoszone — to wymóg WCAG dla dynamicznego status text.
   *  - Trigger MUSI być fokusowalny (`tabindex=0`), bo tooltip Radix otwiera
   *    się też po `focus`, nie tylko hover — bez tego użytkownicy klawiatury
   *    nie zobaczyliby treści tooltipa.
   *  - `aria-label` musi być NIE-pusty i sensowny: pusty/whitespace-only
   *    label powoduje, że screen reader przeczyta tag elementu, nie kontekst.
   */
  describe("atrybuty a11y triggera (aria-label, title) — kontrakt spójności", () => {
    it.each([
      [
        "remote" as const,
        "Synchronizacja między kartami",
        "Lokalna akcja w tej karcie",
      ],
      [
        "local" as const,
        "Moja lokalna akcja w tej karcie",
        "Synchronizacja między kartami",
      ],
    ])(
      "source='%s': aria-label i title zawierają TYLKO `%s`, nigdy `%s`",
      (source, expectedHeading, forbiddenHeading) => {
        mockLastChangeSource = source;
        mockLastChangeAt = FROZEN_NOW;

        renderPanel();

        const { trigger, container } = findLastChangeTooltip();
        const ariaLabel = container.getAttribute("aria-label") ?? "";
        const title = trigger.getAttribute("title") ?? "";

        // Oba atrybuty zawierają nagłówek właściwego wariantu.
        expect(ariaLabel).toContain(expectedHeading);
        expect(title).toContain(expectedHeading);

        // KLUCZOWA anty-mieszanka: żaden atrybut NIE może zawierać nagłówka
        // przeciwnego wariantu — to byłby sprzeczny komunikat dla a11y.
        expect(ariaLabel).not.toContain(forbiddenHeading);
        expect(title).not.toContain(forbiddenHeading);

        // Anty-regresja: dokładnie JEDEN prefiks „Źródło: " w aria-label
        // (gdyby ktoś przez pomyłkę skleił dwa warianty, mielibyśmy 2).
        const sourceMatches = ariaLabel.match(/Źródło: /g) ?? [];
        expect(sourceMatches.length).toBe(1);
        const titleSourceMatches = title.match(/Źródło: /g) ?? [];
        expect(titleSourceMatches.length).toBe(1);
      },
    );

    it("aria-label i title triggera są dokładnie tym samym stringiem (spójność kanałów a11y)", () => {
      // Screen reader korzysta z aria-label, użytkownik touch widzi `title`
      // jako native tooltip systemu — oba MUSZĄ przekazywać tę samą treść,
      // inaczej dwa kanały dostępności rozjechałyby się i pacjent dostałby
      // sprzeczną informację o źródle zmiany.
      for (const source of ["remote", "local"] as const) {
        mockLastChangeSource = source;
        mockLastChangeAt = FROZEN_NOW;
        const { unmount } = renderPanel();

        const { trigger, container } = findLastChangeTooltip();
        const ariaLabel = container.getAttribute("aria-label") ?? "";
        const title = trigger.getAttribute("title") ?? "";

        expect(ariaLabel).toBe(title);

        unmount();
      }
    });

    it("aria-label jest niepustym, sensownym stringiem (nie whitespace, nie 'undefined'/'null')", () => {
      // Pusty/whitespace-only aria-label powoduje, że screen reader przeczyta
      // tag elementu (np. „div") zamiast kontekstu. Stringified `null`/`undefined`
      // to wpadka serializacyjna z złego template literal.
      for (const source of ["remote", "local"] as const) {
        mockLastChangeSource = source;
        mockLastChangeAt = FROZEN_NOW;
        const { unmount } = renderPanel();

        const { trigger, container } = findLastChangeTooltip();
        const ariaLabel = container.getAttribute("aria-label") ?? "";
        const title = trigger.getAttribute("title") ?? "";

        expect(ariaLabel.trim().length).toBeGreaterThan(0);
        expect(title.trim().length).toBeGreaterThan(0);
        // Brak literałów „undefined"/„null" w atrybutach (kontrakt serializacji).
        expect(ariaLabel).not.toMatch(/\b(undefined|null)\b/);
        expect(title).not.toMatch(/\b(undefined|null)\b/);

        unmount();
      }
    });

    it("kontener tooltipa ma aria-live='polite' (ogłaszanie zmian źródła)", () => {
      // WCAG: dynamiczny status text musi być w live region, żeby screen reader
      // ogłosił przełączenie źródła bez ponownego fokusu na trigger.
      mockLastChangeSource = "remote";
      mockLastChangeAt = FROZEN_NOW;
      renderPanel();

      const { container } = findLastChangeTooltip();
      expect(container.getAttribute("aria-live")).toBe("polite");
    });

    it("trigger jest fokusowalny (tabindex=0) — dostępny z klawiatury", () => {
      // Radix Tooltip otwiera się też na focus; bez tabindex=0 użytkownik
      // klawiatury nigdy nie zobaczyłby treści tooltipa.
      mockLastChangeSource = "local";
      mockLastChangeAt = FROZEN_NOW;
      renderPanel();

      const { trigger } = findLastChangeTooltip();
      expect(trigger.getAttribute("tabindex")).toBe("0");
    });

    it("aria-label i title nie zawierają HTML/encji — czysty plain text dla SR", () => {
      // Screen readery czytają aria-label dosłownie. Gdyby do stringu wyciekł
      // znacznik HTML albo encja (`&lt;`, `&amp;`), użytkownik usłyszałby
      // surowy markup zamiast komunikatu.
      for (const source of ["remote", "local"] as const) {
        mockLastChangeSource = source;
        mockLastChangeAt = FROZEN_NOW;
        const { unmount } = renderPanel();

        const { trigger, container } = findLastChangeTooltip();
        const ariaLabel = container.getAttribute("aria-label") ?? "";
        const title = trigger.getAttribute("title") ?? "";

        expect(ariaLabel).not.toMatch(/<[^>]+>/);
        expect(title).not.toMatch(/<[^>]+>/);
        expect(ariaLabel).not.toMatch(/&[a-z]+;|&#\d+;/i);
        expect(title).not.toMatch(/&[a-z]+;|&#\d+;/i);

        unmount();
      }
    });

    it("przejście remote → local: aria-label NIE zachowuje śladu poprzedniego nagłówka", () => {
      // Re-render musi w pełni podmienić atrybut, nie skleić starej wartości
      // z nową (regresja typu „Źródło: Synchronizacja… Źródło: Moja lokalna…"
      // gdyby ktoś użył mutacji zamiast nowego stringu).
      mockLastChangeSource = "remote";
      mockLastChangeAt = FROZEN_NOW;
      const { rerender } = renderPanel();

      mockLastChangeSource = "local";
      mockLastChangeAt = FROZEN_NOW + 5_000;
      rerender(
        <TooltipProvider delayDuration={0}>
          <AutoSaveSettings />
        </TooltipProvider>,
      );

      const { trigger, container } = findLastChangeTooltip();
      const ariaLabel = container.getAttribute("aria-label") ?? "";
      const title = trigger.getAttribute("title") ?? "";

      // Po przełączeniu obecny jest WYŁĄCZNIE nagłówek lokalny.
      expect(ariaLabel).toContain("Moja lokalna akcja w tej karcie");
      expect(title).toContain("Moja lokalna akcja w tej karcie");
      expect(ariaLabel).not.toContain("Synchronizacja między kartami");
      expect(title).not.toContain("Synchronizacja między kartami");

      // Dokładnie jeden prefiks „Źródło: " (brak konkatenacji starego stanu).
      expect((ariaLabel.match(/Źródło: /g) ?? []).length).toBe(1);
      expect((title.match(/Źródło: /g) ?? []).length).toBe(1);
    });
  });

  /**
   * Fallback dla niedostępnej pełnej daty (`lastSyncFullDate` puste/null/"—"):
   *
   * Komponent buduje linię czasu jako `tooltipTimeValue = lastSyncFullDate ?? lastSyncLabel`,
   * a następnie sklejony tooltipText filtruje przez `Boolean(line && line.trim())`.
   * Reguła: tooltip MUSI nadal pokazywać:
   *   1) czytelne źródło zmiany (nagłówek + opis),
   *   2) jakąś linię czasu (pełna data → względna etykieta),
   *   3) ZERO pustych linii ani osieroconego „Czas: " bez wartości.
   *
   * Te testy pilnują, żeby przyszłe zmiany formattera lub mapowania nie
   * przepuściły do DOM/aria-label artefaktów typu „Czas: ", "\n\n",
   * „Czas: null" albo trailing newline (screen reader przeczytałby pauzę
   * jako koniec wypowiedzi).
   */
  describe("fallback dla niedostępnego lastSyncFullDate (puste/null)", () => {
    /**
     * Pomocnik: zwraca wszystkie linie aria-label po splicie na "\n".
     * Pilnujemy, żeby żadna linia nie była pusta ani whitespace-only.
     */
    const getAriaLines = (ariaLabel: string): string[] => ariaLabel.split("\n");

    it.each([
      [null, "null (mapowanie zwróciło brak wartości)"],
      ["", "pusty string (zła ścieżka serializacji)"],
      [undefined, "undefined (helper nie zainicjalizował returna)"],
    ])(
      "lastSyncFullDate=%s (%s): tooltip nadal ma źródło + linię czasu (względna), bez pustych linii",
      (badValue, _label) => {
        mockLastChangeSource = "remote";
        mockLastChangeAt = FROZEN_NOW;
        mockFullTimestampReturn = badValue as string | null | undefined;

        renderPanel();

        const { trigger, container } = findLastChangeTooltip();
        const ariaLabel = container.getAttribute("aria-label") ?? "";
        const title = trigger.getAttribute("title") ?? "";

        // 1) Źródło zmiany (nagłówek + opis) zawsze widoczne.
        expect(ariaLabel).toContain("Źródło: Synchronizacja między kartami");
        expect(title).toContain("Źródło: Synchronizacja między kartami");

        // 2) Linia czasu obecna — spadła na `lastSyncLabel` (etykieta względna).
        //    Komponent renderuje „Czas: <coś niepustego>" oraz dokleja kwalifikator
        //    „(etykieta względna)" w kanale a11y, żeby screen reader miał kontekst,
        //    że to przybliżenie a nie precyzyjny stempel czasowy.
        expect(ariaLabel).toMatch(/Czas: \S.*\(etykieta względna\)/);
        expect(title).toMatch(/Czas: \S.*\(etykieta względna\)/);

        // 3) ZERO pustych linii ani trailing newline w aria-label.
        const lines = getAriaLines(ariaLabel);
        for (const line of lines) {
          expect(line.trim().length).toBeGreaterThan(0);
        }
        expect(ariaLabel).not.toMatch(/\n\n/);
        expect(ariaLabel.endsWith("\n")).toBe(false);
        expect(ariaLabel.startsWith("\n")).toBe(false);

        // 4) Anty-regresja serializacji: nigdzie nie wycieka „Czas: null/undefined/"".
        expect(ariaLabel).not.toMatch(/Czas:\s*$/m);
        expect(ariaLabel).not.toMatch(/Czas:\s*(null|undefined)/i);
        expect(title).not.toMatch(/Czas:\s*$/m);
      },
    );

    it("lastSyncFullDate='—' (TIMESTAMP_FALLBACK_LABEL): tooltip pokazuje fallback bez pustej linii", () => {
      // Realny scenariusz produkcyjny: `formatFullTimestamp` przy invalid
      // timestamp zwraca `TIMESTAMP_FALLBACK_LABEL = "—"`. To NIE jest pusty
      // string ani null — `??` przepuści tę wartość, więc linia czasu pokaże
      // dosłownie „Czas: —". Test pilnuje, że taka degradacja jest akceptowalna
      // (lepsza niż brak linii) i nie produkuje pustych linii w aria-label.
      mockLastChangeSource = "local";
      mockLastChangeAt = FROZEN_NOW;
      mockFullTimestampReturn = "—";

      renderPanel();

      const { container } = findLastChangeTooltip();
      const ariaLabel = container.getAttribute("aria-label") ?? "";

      // Źródło + linia czasu z fallback-glifem.
      expect(ariaLabel).toContain("Źródło: Moja lokalna akcja w tej karcie");
      expect(ariaLabel).toContain("Czas: —");

      // Brak pustych linii — każda linia ma realną treść.
      const lines = getAriaLines(ariaLabel);
      for (const line of lines) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
      expect(ariaLabel).not.toMatch(/\n\n/);
    });

    it("lastSyncFullDate=whitespace ('   '): linia czasu spada na względną etykietę", () => {
      // Defensywa: gdyby formatter zwrócił string z samymi spacjami, `filter`
      // w komponencie używa `Boolean(line && line.trim())` na całym wierszu
      // („Czas:    ") — czyli wiersz przejdzie filtr (bo „Czas: " jest niepuste).
      // To realna pułapka regresyjna: aria-label miałby „Czas: " bez wartości.
      // Pilnujemy, że kontrakt komponentu (teraz lub po refactorze) wyklucza
      // taką sytuację — albo whitespace przejdzie przez `??` (wtedy „Czas: " z
      // ogonem spacji jest nieakceptowalne), albo trzeba zrobić strict trim
      // przed budowaniem linii. Test służy jako alarm na regresję.
      mockLastChangeSource = "remote";
      mockLastChangeAt = FROZEN_NOW;
      mockFullTimestampReturn = "   ";

      renderPanel();

      const { container } = findLastChangeTooltip();
      const ariaLabel = container.getAttribute("aria-label") ?? "";

      // Źródło zawsze widoczne.
      expect(ariaLabel).toContain("Źródło: Synchronizacja między kartami");

      // KLUCZOWE: linia „Czas:" nie może kończyć się whitespace bez wartości.
      // Albo całej linii nie ma, albo ma realną wartość po dwukropku.
      const timeLine = ariaLabel
        .split("\n")
        .find((line) => line.startsWith("Czas:"));
      if (timeLine) {
        // Jeśli linia istnieje, MUSI mieć niepustą wartość po „Czas: ".
        expect(timeLine.replace(/^Czas:\s*/, "").trim().length).toBeGreaterThan(0);
      }

      // Brak pustych linii w całym aria-label.
      for (const line of ariaLabel.split("\n")) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    });

    it("lastSyncFullDate=null + brak źródła wciąż renderuje czytelny komunikat (źródło + czas)", () => {
      // Symulujemy worst case: brak pełnej daty + niejednoznaczne źródło
      // (`undefined`). Tooltip MUSI nadal mieć:
      //   - nagłówek (fallback na lokalny wariant z `getLastChangeTooltipContent`),
      //   - linię czasu z `lastSyncLabel` (względna etykieta),
      //   - ani jednej pustej linii.
      mockLastChangeSource = undefined;
      mockLastChangeAt = FROZEN_NOW;
      mockFullTimestampReturn = null;

      renderPanel();

      const { container } = findLastChangeTooltip();
      const ariaLabel = container.getAttribute("aria-label") ?? "";

      expect(ariaLabel).toContain("Źródło: Moja lokalna akcja w tej karcie");
      expect(ariaLabel).toMatch(/Czas: \S+/);
      expect(ariaLabel).not.toMatch(/\n\n/);
      expect(ariaLabel).not.toMatch(/Czas:\s*(null|undefined|)\s*$/m);
    });

    it("aria-label ma dokładnie 3 niepuste linie (nagłówek + opis + czas) gdy fallback działa", () => {
      // Strukturalna anty-regresja: kolejność i liczba linii musi być stabilna,
      // żeby screen reader miał deterministyczną prezentację. Gdyby przyszły
      // refactor dodał pustą linię między opisem a czasem, ten test natychmiast
      // wyłapie regresję.
      mockLastChangeSource = "local";
      mockLastChangeAt = FROZEN_NOW;
      mockFullTimestampReturn = ""; // pusty fullDate → spada na lastSyncLabel

      renderPanel();

      const { container } = findLastChangeTooltip();
      const ariaLabel = container.getAttribute("aria-label") ?? "";
      const lines = ariaLabel.split("\n");

      expect(lines.length).toBe(3);
      expect(lines[0]).toMatch(/^Źródło: /);
      expect(lines[1].length).toBeGreaterThan(0);
      expect(lines[2]).toMatch(/^Czas: \S+/);
    });

    it("aria-label dokleja '(etykieta względna)' TYLKO przy fallbacku — pełna data idzie bez sufiksu", () => {
      // Asymetryczna obecność kwalifikatora: chronimy screen reader przed
      // myleniem precyzyjnej daty z przybliżeniem. Gdy mamy pełny stempel
      // czasowy, sufiks NIE może się pojawić (byłby kłamstwem o naturze
      // wartości); gdy spadamy na etykietę względną, sufiks MUSI się pojawić.
      mockLastChangeSource = "remote";
      mockLastChangeAt = FROZEN_NOW;

      // Wariant A: pełna data dostępna → BEZ sufiksu.
      mockFullTimestampReturn = "DEFAULT_FULL_TIMESTAMP"; // realny formatter
      const { unmount } = renderPanel();
      const fullDateLabel =
        findLastChangeTooltip().container.getAttribute("aria-label") ?? "";
      expect(fullDateLabel).toMatch(/Czas: \S+/);
      expect(fullDateLabel).not.toContain("(etykieta względna)");
      unmount();

      // Wariant B: brak pełnej daty → fallback na lastSyncLabel + sufiks.
      mockFullTimestampReturn = null;
      renderPanel();
      const fallbackLabel =
        findLastChangeTooltip().container.getAttribute("aria-label") ?? "";
      const fallbackTitle =
        findLastChangeTooltip().trigger.getAttribute("title") ?? "";

      // Linia czasu zawiera realną wartość PRZED kwalifikatorem.
      expect(fallbackLabel).toMatch(/Czas: \S.+ \(etykieta względna\)$/m);
      expect(fallbackTitle).toMatch(/Czas: \S.+ \(etykieta względna\)$/m);

      // Sufiks jest w TEJ SAMEJ linii co „Czas: " (nie tworzy nowej linii) —
      // pilnujemy stabilnej liczby linii (nagłówek + opis + 1×czas).
      const lines = fallbackLabel.split("\n");
      expect(lines.length).toBe(3);
      expect(lines[2]).toMatch(/^Czas: .+\(etykieta względna\)$/);

      // Nigdy nie wycieka surowy „null"/„undefined" zamiast etykiety względnej.
      expect(fallbackLabel).not.toMatch(/Czas:\s*(null|undefined|\(etykieta)/);
    });
  });
});
