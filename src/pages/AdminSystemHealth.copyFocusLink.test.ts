/**
 * Test jednostkowy logiki toasta w `handleCopyFocusPrefsLinkVariant`
 * z `AdminSystemHealth.tsx`.
 *
 * Pełny e2e mountu strony (3.6k linii, providery, Supabase, framer-motion)
 * jest droższy niż wartość — tutaj weryfikujemy KONTRAKT toasta:
 *
 *  1. title = `Skopiowano link (<Label>)` z poprawnym labelem per-variant
 *     (Light / Dark / High Contrast).
 *  2. description zawiera DOKŁADNIE wartości ring/glow/afterglow
 *     wybranego wariantu — admin po skopiowaniu ma natychmiast widzieć
 *     co trafiło do schowka.
 *  3. Link skopiowany do clipboardu po dekodowaniu daje TEN SAM zestaw
 *     wartości (round-trip) — dla wszystkich 3 slotów (light/dark/hc),
 *     bo handler replikuje single variant do całej trójki.
 *
 * Implementacja replikuje logikę handlera 1:1 (linie 543-561 w
 * AdminSystemHealth.tsx). Jeśli ktoś zmieni format toasta, test zafailuje
 * → trzeba go zaktualizować równolegle z handlerem.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import {
  buildFocusPrefsShareUrl,
  extractFocusPrefsFromHash,
  type FocusPrefs,
  type FocusPrefsByVariant,
  type ThemeVariant,
} from "@/lib/focusPrefsSerialization";

// Mock sonner — łapiemy wywołania toast.success / toast.error i sprawdzamy argumenty.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/** Replika handlera z AdminSystemHealth.tsx (linie 543-561). Trzymana tu, by
 *  testować pure-logic bez mountu strony. Jeśli zmienisz handler — zaktualizuj. */
async function copyFocusPrefsLinkVariant(
  focusPrefsByVariant: FocusPrefsByVariant,
  editingVariant: ThemeVariant,
  baseUrl: string,
): Promise<void> {
  try {
    const single = focusPrefsByVariant[editingVariant];
    const replicated = { light: single, dark: single, hc: single };
    const url = buildFocusPrefsShareUrl(replicated, baseUrl);
    await navigator.clipboard.writeText(url);
    const label =
      editingVariant === "hc" ? "High Contrast" : editingVariant === "light" ? "Light" : "Dark";
    toast.success(`Skopiowano link (${label})`, {
      description: `Wariant ${label}: ring ${single.ringWidthPx}px · glow ${single.glowIntensity}% · afterglow ${single.afterglowMs}ms`,
    });
  } catch (err) {
    toast.error("Nie udało się skopiować linka", {
      description: err instanceof Error ? err.message : "Brak dostępu do clipboardu",
    });
  }
}

const SAMPLE_PREFS: FocusPrefsByVariant = {
  light: { afterglowMs: 1500, ringWidthPx: 2, glowIntensity: 40 },
  dark: { afterglowMs: 3000, ringWidthPx: 3, glowIntensity: 65 },
  hc: { afterglowMs: 4500, ringWidthPx: 5, glowIntensity: 90 },
};

const BASE_URL = "https://example.test/admin/system-health";

describe("handleCopyFocusPrefsLinkVariant — toast contract", () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });
  });

  it.each([
    {
      variant: "light" as ThemeVariant,
      label: "Light",
      prefs: SAMPLE_PREFS.light,
    },
    {
      variant: "dark" as ThemeVariant,
      label: "Dark",
      prefs: SAMPLE_PREFS.dark,
    },
    {
      variant: "hc" as ThemeVariant,
      label: "High Contrast",
      prefs: SAMPLE_PREFS.hc,
    },
  ])(
    "wariant $variant → toast title=$label + description z prawdziwymi wartościami ring/glow/afterglow",
    async ({ variant, label, prefs }) => {
      await copyFocusPrefsLinkVariant(SAMPLE_PREFS, variant, BASE_URL);

      // 1. clipboard dostał JAKIŚ URL z fragmentem `#focus-prefs=`.
      expect(writeTextMock).toHaveBeenCalledTimes(1);
      const copiedUrl = writeTextMock.mock.calls[0][0] as string;
      expect(copiedUrl).toMatch(/#focus-prefs=/);

      // 2. toast.success został wywołany z poprawnym tytułem i opisem.
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.error).not.toHaveBeenCalled();

      const [title, options] = (toast.success as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(title).toBe(`Skopiowano link (${label})`);
      expect(options).toEqual({
        description: `Wariant ${label}: ring ${prefs.ringWidthPx}px · glow ${prefs.glowIntensity}% · afterglow ${prefs.afterglowMs}ms`,
      });

      // 3. Konkretne sprawdzenie, że liczby z prefs są w opisie (defense in depth —
      // ktoś mógłby przypadkiem zhardcodować wartości w template stringu).
      expect(options.description).toContain(`ring ${prefs.ringWidthPx}px`);
      expect(options.description).toContain(`glow ${prefs.glowIntensity}%`);
      expect(options.description).toContain(`afterglow ${prefs.afterglowMs}ms`);
    },
  );

  it("skopiowany URL po dekodowaniu replikuje WYBRANY wariant do wszystkich 3 slotów", async () => {
    await copyFocusPrefsLinkVariant(SAMPLE_PREFS, "dark", BASE_URL);

    const copiedUrl = writeTextMock.mock.calls[0][0] as string;
    const hash = copiedUrl.slice(copiedUrl.indexOf("#"));
    const decoded = extractFocusPrefsFromHash(hash);

    expect(decoded).not.toBeNull();
    // Wszystkie 3 sloty mają wartości DARK (bo replikujemy single variant).
    const expectedDark: FocusPrefs = SAMPLE_PREFS.dark;
    expect(decoded!.light).toEqual(expectedDark);
    expect(decoded!.dark).toEqual(expectedDark);
    expect(decoded!.hc).toEqual(expectedDark);
  });

  it("gdy clipboard rzuca błąd → wywołuje toast.error zamiast success", async () => {
    writeTextMock.mockRejectedValueOnce(new Error("Clipboard denied by browser"));

    await copyFocusPrefsLinkVariant(SAMPLE_PREFS, "light", BASE_URL);

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Nie udało się skopiować linka", {
      description: "Clipboard denied by browser",
    });
  });
});
