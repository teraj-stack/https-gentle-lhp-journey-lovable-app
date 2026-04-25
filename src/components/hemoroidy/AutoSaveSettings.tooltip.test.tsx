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
// jeden mock obsłużył oba scenariusze (remote/local) bez resetu modułu.
let mockLastChangeSource: "remote" | "local" | null = null;
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
 * Trigger tooltipa to span z `cursor-help` i `tabIndex=0` zawierający
 * tekst „Ostatnia zmiana:”. Wybieramy go po roli "generic" + `title` >
 * pewniej: po obecności tekstu „Ostatnia zmiana:” i poszukujemy
 * najbliższego rodzica z `title` i `aria-label`.
 */
const findTriggerByLabel = (): HTMLElement => {
  // Trigger ma w sobie tekst „Ostatnia zmiana:”. `getByText` z funkcją
  // matchera obsługuje rozbity tekst (interpunkcja + <strong>).
  const labelNode = screen.getByText((_, node) => {
    if (!node) return false;
    const text = node.textContent ?? "";
    return text.startsWith("Ostatnia zmiana:");
  });
  // Trigger to span z tabIndex=0 i title — wspinamy się od tekstu.
  let current: HTMLElement | null = labelNode as HTMLElement;
  while (current && !current.hasAttribute("title")) {
    current = current.parentElement;
  }
  if (!current) {
    throw new Error("Nie znaleziono triggera tooltipa z atrybutem title");
  }
  return current;
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

  it("dla source='remote' aria-label i title zawierają „Synchronizacja między kartami”, () => {
    mockLastChangeSource = "remote";
    mockLastChangeAt = FROZEN_NOW;

    renderPanel();

    const trigger = findTriggerByLabel();
    const ariaLabel = trigger.getAttribute("aria-label") ?? "";
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

  it("dla source='local' aria-label i title zawierają „Moja lokalna akcja w tej karcie”, () => {
    mockLastChangeSource = "local";
    mockLastChangeAt = FROZEN_NOW;

    renderPanel();

    const trigger = findTriggerByLabel();
    const ariaLabel = trigger.getAttribute("aria-label") ?? "";
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

    let trigger = findTriggerByLabel();
    expect(trigger.getAttribute("aria-label") ?? "").toContain(
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

    trigger = findTriggerByLabel();
    const ariaLabel = trigger.getAttribute("aria-label") ?? "";
    expect(ariaLabel).toContain("Moja lokalna akcja w tej karcie");
    expect(ariaLabel).not.toContain("Synchronizacja między kartami");
  });

  it("aria-label NIGDY nie używa anglicyzmu „tab” — zawsze polskie „karta/karcie”, () => {
    // Reguła z `mem://design/ui-language-tab-vs-karta`: cały interfejs po
    // polsku mówi „karta”, nigdy „tab”/„cross-tab”/„local-tab”. Test pilnuje,
    // żeby copy w aria-label triggera było zgodne z badge'em i tooltipem
    // (wszystko korzysta z `getLastChangeTooltipContent`).
    for (const source of ["remote", "local"] as const) {
      mockLastChangeSource = source;
      mockLastChangeAt = FROZEN_NOW;
      const { unmount } = renderPanel();

      const trigger = findTriggerByLabel();
      const ariaLabel = trigger.getAttribute("aria-label") ?? "";

      // Nie pojawia się anglicyzm „tab” ani jego pochodne.
      expect(ariaLabel).not.toMatch(/\btab\b/i);
      expect(ariaLabel).not.toMatch(/cross-tab|within-tab|local-tab/i);
      // Pojawia się polski rdzeń „kart-/karc-” (karta/karty/kartami/karcie).
      expect(ariaLabel.toLowerCase()).toMatch(/\bkar[ct]/);

      unmount();
    }
  });
});
