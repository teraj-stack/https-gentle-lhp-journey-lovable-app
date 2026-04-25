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

    it("source=undefined + lastChangeAt=valid: etykieta i badge nie renderują się", () => {
      // Ten sam kontrakt co dla `null`, ale dla `undefined` — symuluje
      // sytuację, gdy hook zwraca pole bez wartości (np. starsza wersja
      // kontraktu lub mock w teście ad-hoc). `isLastChangeVisible` traktuje
      // `undefined` tak samo defensywnie jak `null` (early-return na `=== null`
      // nie łapie `undefined`, ale dalej `visibility === source` daje `false`,
      // bo żaden visibility nie równa się `undefined`).
      mockLastChangeSource = undefined;
      mockLastChangeAt = FROZEN_NOW;

      renderPanel();

      const triggers = Array.from(
        document.querySelectorAll<HTMLElement>('span[tabindex="0"][title]'),
      );
      const sourceTrigger = triggers.find((el) =>
        (el.getAttribute("title") ?? "").startsWith("Źródło: "),
      );
      expect(sourceTrigger).toBeUndefined();

      expect(screen.queryByText("lokalnie")).not.toBeInTheDocument();
      expect(document.body.textContent ?? "").not.toMatch(/Źródło:\s*(null|undefined)/i);
    });

    it("source=null + lastChangeAt=null: cała sekcja „Ostatnia zmiana" nie renderuje się", () => {
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
});
