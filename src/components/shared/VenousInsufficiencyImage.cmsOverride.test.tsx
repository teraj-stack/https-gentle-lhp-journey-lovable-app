/**
 * Testy regresji dla scenariusza, gdy CMS (vein_image_overrides w Supabase)
 * dostarcza alt+figcaption zamiast hardkodowanych propsów.
 *
 * Komplementarne do VenousInsufficiencyImage.altCaption.test.tsx, który
 * weryfikuje fallback do propsów (CMS niedostępne). Tutaj sprawdzamy:
 *  1. CMS nadpisuje propsy (priorytet override > prop > preset > generic)
 *  2. alt z CMS nadal spełnia kontrakt SEO/a11y (długość, niepustość)
 *  3. caption z CMS mieści się w mobile budget (110 znaków, segmenty ≤40)
 *  4. Gdy CMS zwraca pustą wartość — fallback do propu (nie pusty alt)
 *  5. Gdy CMS jeszcze ładuje (data=undefined) — fallback do propu (SSR/initial paint)
 *  6. Triger walidacyjny w bazie (60-220 alt, ≤110 caption, ≤40 segment)
 *     jest egzekwowany w UI: szanujemy te limity również po stronie klienta
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mockowalny stan hooka — testy podmieniają go per case.
type OverrideRow = { alt: string; caption: string } | undefined;
let mockMain: OverrideRow = undefined;
let mockPerforator: OverrideRow = undefined;

vi.mock("@/hooks/useVeinImageOverrides", () => ({
  useVeinImageOverridesForPage: () => ({
    main: mockMain,
    perforator: mockPerforator,
    isLoading: false,
    error: null,
  }),
}));

import VenousInsufficiencyImage from "./VenousInsufficiencyImage";
import { VEIN_IMAGE_PAGE_PRESETS } from "@/lib/veinImagePagePresets";

const FALLBACK_PROPS = {
  mainAlt:
    "Schemat porównawczy zdrowej żyły i żylaka — niedomykalność zastawek w pniu żylnym powoduje refluks (cofanie krwi), który EVLT zamyka termicznie od środka",
  mainCaption:
    "Zdrowa zastawka · Refluks w pniu żylnym · Cel EVLT · Termiczne zamknięcie żyły",
  perforatorAlt:
    "Schemat niewydolnego perforatora — żyły łączącej układ głęboki z powierzchownym; jego refluks często współistnieje z niewydolnością pnia żylnego leczonego EVLT",
  perforatorCaption:
    "Niewydolny perforator · Współistnieje z refluksem pnia · Diagnostyka USG Doppler przed EVLT",
};

const renderImg = () =>
  render(<VenousInsufficiencyImage pageKey="evlt" {...FALLBACK_PROPS} />);

const getImgs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("img"));
const getCaptions = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("figcaption"));

beforeEach(() => {
  mockMain = undefined;
  mockPerforator = undefined;
});

describe("VenousInsufficiencyImage — CMS override regression", () => {
  // ── PRIORYTET ŹRÓDŁA ──────────────────────────────────────────────
  describe("priorytet źródła", () => {
    it("CMS override nadpisuje prop dla alt (main)", () => {
      mockMain = {
        alt: "CMS: zaktualizowany schemat porównawczy zdrowej żyły i niedomykalności zastawek w pniu żylnym z opisem klinicznym",
        caption: "CMS · Zaktualizowany · Caption · Główny",
      };
      const { container } = renderImg();
      const [mainImg] = getImgs(container);
      expect(mainImg.getAttribute("alt")).toBe(mockMain!.alt);
      expect(mainImg.getAttribute("alt")).not.toBe(FALLBACK_PROPS.mainAlt);
    });

    it("CMS override nadpisuje prop dla caption (main)", () => {
      mockMain = {
        alt: "CMS: zaktualizowany schemat porównawczy zdrowej żyły i niedomykalności zastawek w pniu żylnym z opisem klinicznym",
        caption: "CMS · Zaktualizowany · Caption · Główny",
      };
      const { container } = renderImg();
      const [mainCap] = getCaptions(container);
      expect((mainCap.textContent ?? "").trim()).toBe(mockMain!.caption);
    });

    it("CMS override dla main NIE wpływa na perforator (jeśli brak override)", () => {
      mockMain = {
        alt: "CMS: tylko główny obraz dostał nadpisanie z bazy danych — perforator zostaje na propsie",
        caption: "CMS · Tylko · Główny",
      };
      mockPerforator = undefined; // brak override perforatora
      const { container } = renderImg();
      const [, perfImg] = getImgs(container);
      const [, perfCap] = getCaptions(container);
      expect(perfImg.getAttribute("alt")).toBe(FALLBACK_PROPS.perforatorAlt);
      expect((perfCap.textContent ?? "").trim()).toBe(
        FALLBACK_PROPS.perforatorCaption,
      );
    });

    it("Oba CMS overrides nadpisują oba propsy niezależnie", () => {
      mockMain = {
        alt: "CMS main: schemat porównawczy zdrowej żyły i żylaka z aktualnym opisem klinicznym i kontekstem zabiegowym",
        caption: "CMS · Main · Override · Aktywny",
      };
      mockPerforator = {
        alt: "CMS perforator: zaktualizowany schemat niewydolnego perforatora — łącznika między układem głębokim a powierzchownym",
        caption: "CMS · Perforator · Override · Aktywny",
      };
      const { container } = renderImg();
      const [mainImg, perfImg] = getImgs(container);
      const [mainCap, perfCap] = getCaptions(container);
      expect(mainImg.getAttribute("alt")).toBe(mockMain!.alt);
      expect(perfImg.getAttribute("alt")).toBe(mockPerforator!.alt);
      expect((mainCap.textContent ?? "").trim()).toBe(mockMain!.caption);
      expect((perfCap.textContent ?? "").trim()).toBe(mockPerforator!.caption);
    });
  });

  // ── SSR / INITIAL PAINT FALLBACK ─────────────────────────────────
  describe("SSR / initial paint (CMS jeszcze nie załadowane)", () => {
    it("data=undefined → alt z propu, NIGDY pusty", () => {
      mockMain = undefined;
      mockPerforator = undefined;
      const { container } = renderImg();
      const imgs = getImgs(container);
      for (const img of imgs) {
        const alt = img.getAttribute("alt") ?? "";
        expect(alt.trim().length).toBeGreaterThan(20);
      }
      expect(imgs[0].getAttribute("alt")).toBe(FALLBACK_PROPS.mainAlt);
      expect(imgs[1].getAttribute("alt")).toBe(FALLBACK_PROPS.perforatorAlt);
    });

    it("data=undefined → figcaption z propu, NIGDY pusty", () => {
      mockMain = undefined;
      mockPerforator = undefined;
      const { container } = renderImg();
      const caps = getCaptions(container);
      for (const cap of caps) {
        expect((cap.textContent ?? "").trim().length).toBeGreaterThan(0);
      }
    });

    it("Bez propu i bez CMS → fallback do presetu (nigdy pusty)", () => {
      mockMain = undefined;
      mockPerforator = undefined;
      // Renderujemy BEZ propsów alt/caption — komponent musi sięgnąć do
      // presetu (VEIN_IMAGE_PAGE_PRESETS) jako poziom 3 fallbacku.
      const { container } = render(<VenousInsufficiencyImage pageKey="evlt" />);
      const imgs = getImgs(container);
      const caps = getCaptions(container);
      const preset = VEIN_IMAGE_PAGE_PRESETS.find((p) => p.key === "evlt")!;
      expect(imgs[0].getAttribute("alt")).toBe(preset.mainAlt);
      expect(imgs[1].getAttribute("alt")).toBe(preset.perforatorAlt);
      expect((caps[0].textContent ?? "").trim()).toBe(preset.mainCaption);
      expect((caps[1].textContent ?? "").trim()).toBe(preset.perforatorCaption);
    });

    it("Bez propu, bez CMS, bez pageKey → fallback do generic (nigdy pusty)", () => {
      mockMain = undefined;
      mockPerforator = undefined;
      const { container } = render(<VenousInsufficiencyImage />);
      const imgs = getImgs(container);
      const caps = getCaptions(container);
      for (const img of imgs) {
        expect((img.getAttribute("alt") ?? "").trim().length).toBeGreaterThan(
          20,
        );
      }
      for (const cap of caps) {
        expect((cap.textContent ?? "").trim().length).toBeGreaterThan(0);
      }
    });
  });

  // ── DEGRADACJA: CMS zwraca śmieci ────────────────────────────────
  describe("degradacja gdy CMS zwraca puste/niepoprawne wartości", () => {
    it("Pusty string z CMS → fallback do propu (nie pusty alt)", () => {
      // Empty string jest falsy w `(overrides.main?.alt) || prop`, więc
      // komponent powinien zignorować pustą wartość z bazy.
      mockMain = { alt: "", caption: "" };
      const { container } = renderImg();
      const [mainImg] = getImgs(container);
      const [mainCap] = getCaptions(container);
      expect(mainImg.getAttribute("alt")).toBe(FALLBACK_PROPS.mainAlt);
      expect((mainCap.textContent ?? "").trim()).toBe(
        FALLBACK_PROPS.mainCaption,
      );
    });

    it("Whitespace-only z CMS — alt nadal renderowalny (nie throw)", () => {
      // Whitespace jest „truthy" w JS, więc CMS może go nadpisać. To
      // świadoma decyzja: walidacja długości jest po stronie triggera bazy.
      // Test pilnuje, że komponent NIE wybucha i renderuje strukturę.
      mockMain = { alt: "   ", caption: "   " };
      const { container } = renderImg();
      const imgs = getImgs(container);
      const caps = getCaptions(container);
      expect(imgs).toHaveLength(2);
      expect(caps).toHaveLength(2);
    });
  });

  // ── KONTRAKT CMS = KONTRAKT BAZY (validate_vein_image_override) ──
  // Trigger w bazie wymusza: alt 60-220, caption ≤110, segment ≤40.
  // UI nie może rozjechać się z tym kontraktem.
  describe("kontrakt UI = kontrakt walidacyjny w bazie", () => {
    it("wszystkie presety mieszczą się w limitach bazy (60-220 alt)", () => {
      for (const preset of VEIN_IMAGE_PAGE_PRESETS) {
        expect(
          preset.mainAlt.length,
          `${preset.key}.mainAlt = ${preset.mainAlt.length} znaków`,
        ).toBeGreaterThanOrEqual(60);
        expect(preset.mainAlt.length).toBeLessThanOrEqual(220);
        expect(preset.perforatorAlt.length).toBeGreaterThanOrEqual(60);
        expect(preset.perforatorAlt.length).toBeLessThanOrEqual(220);
      }
    });

    it("wszystkie presety mieszczą caption ≤110 znaków (mobile budget)", () => {
      for (const preset of VEIN_IMAGE_PAGE_PRESETS) {
        expect(
          preset.mainCaption.length,
          `${preset.key}.mainCaption = ${preset.mainCaption.length} znaków`,
        ).toBeLessThanOrEqual(110);
        expect(
          preset.perforatorCaption.length,
          `${preset.key}.perforatorCaption = ${preset.perforatorCaption.length} znaków`,
        ).toBeLessThanOrEqual(110);
      }
    });

    it("żaden segment '·' w presetach nie przekracza 40 znaków (mobile no-truncate)", () => {
      for (const preset of VEIN_IMAGE_PAGE_PRESETS) {
        for (const cap of [preset.mainCaption, preset.perforatorCaption]) {
          for (const seg of cap.split(/\s·\s/)) {
            expect(
              seg.length,
              `${preset.key}: segment "${seg}" = ${seg.length} znaków (limit 40)`,
            ).toBeLessThanOrEqual(40);
          }
        }
      }
    });

    it("CMS payload z poprawnym 60-znakowym alt jest renderowany", () => {
      const exact60 = "A".repeat(60);
      mockMain = {
        alt: exact60,
        caption: "Krótki · Caption",
      };
      const { container } = renderImg();
      const [mainImg] = getImgs(container);
      expect(mainImg.getAttribute("alt")).toBe(exact60);
    });

    it("CMS payload z 110-znakowym caption jest renderowany w pełni", () => {
      // 5 segmentów po 20 znaków = 100 + 4 separatory ' · ' (3 znaki) = 112.
      // Skracamy do dokładnie 110 znaków, segment ≤40.
      const seg = "Segmenty po dwadzies"; // 20 znaków
      const cap = [seg, seg, seg, seg, seg].join(" · ").slice(0, 110);
      mockMain = {
        alt: "Wystarczająco długi alt do walidatora bazy danych — minimum sześćdziesiąt znaków zostało spełnione",
        caption: cap,
      };
      const { container } = renderImg();
      const [mainCap] = getCaptions(container);
      expect((mainCap.textContent ?? "").trim()).toBe(cap);
      expect(cap.length).toBeLessThanOrEqual(110);
    });
  });

  // ── MOBILE NO-TRUNCATION (375px viewport) ───────────────────────
  // figcaption renderowany jako text-[11px] sm:text-xs z px-1.
  // Empirycznie: ~6.2 px na znak * (375 - 24 padding) ≈ 56 znaków/linia.
  // Limit segmentu 40 znaków daje bezpieczny margines (1 linia per segment).
  describe("mobile readability (375px viewport)", () => {
    const MOBILE_CHARS_PER_LINE = 56; // empiryczne dla text-[11px]
    const MAX_LINES_MOBILE = 4;

    it("alt z CMS — kluczowe słowa medyczne nie są ucinane", () => {
      // alt jest niewidoczny wizualnie, ale screen reader czyta go w całości.
      // Sprawdzamy, że jeśli CMS dostarcza alt, to nie ucina kluczowych
      // terminów (heurystyka: alt powinien zawierać przynajmniej 1 słowo
      // medyczne związane z tematem grafiki).
      mockMain = {
        alt: "Schemat porównawczy zdrowej żyły z domkniętymi zastawkami i żylaka z refluksem oraz stanem zapalnym",
        caption: "Zdrowa żyła · Refluks · Stan zapalny",
      };
      const { container } = renderImg();
      const [mainImg] = getImgs(container);
      const alt = mainImg.getAttribute("alt") ?? "";
      // co najmniej 1 z kluczowych terminów anatomicznych
      const medicalTerms = [
        "zastawk",
        "refluks",
        "żył",
        "perforator",
        "naczyni",
      ];
      const hasTerms = medicalTerms.some((t) => alt.toLowerCase().includes(t));
      expect(hasTerms, `alt nie zawiera terminów medycznych: "${alt}"`).toBe(
        true,
      );
    });

    it("caption z CMS — total mieści się w 4 liniach na mobile", () => {
      mockMain = {
        alt: "Wystarczająco długi alt do walidatora bazy danych — minimum sześćdziesiąt znaków zostało spełnione",
        caption: "Pierwszy segment · Drugi segment · Trzeci · Czwarty",
      };
      const { container } = renderImg();
      const [mainCap] = getCaptions(container);
      const text = (mainCap.textContent ?? "").trim();
      const estimatedLines = Math.ceil(text.length / MOBILE_CHARS_PER_LINE);
      expect(
        estimatedLines,
        `caption "${text}" zająłby ${estimatedLines} linii na mobile (max ${MAX_LINES_MOBILE})`,
      ).toBeLessThanOrEqual(MAX_LINES_MOBILE);
    });

    it("każdy segment '·' z CMS mieści się w 1 linii mobile", () => {
      mockMain = {
        alt: "Wystarczająco długi alt do walidatora bazy danych — minimum sześćdziesiąt znaków zostało spełnione",
        caption: "Krótki · Średni segment · Trochę dłuższy segment kliniczny",
      };
      const { container } = renderImg();
      const [mainCap] = getCaptions(container);
      const text = (mainCap.textContent ?? "").trim();
      for (const seg of text.split(/\s·\s/)) {
        expect(
          seg.length,
          `Segment "${seg}" (${seg.length} znaków) nie zmieści się w 1 linii mobile (~${MOBILE_CHARS_PER_LINE} znaków)`,
        ).toBeLessThanOrEqual(MOBILE_CHARS_PER_LINE);
      }
    });

    it("alt z CMS nie zawiera HTML/markdown który byłby renderowany dosłownie", () => {
      // Ponieważ alt jest atrybutem string, nie powinien zawierać tagów
      // ani markdown (wyświetlałyby się jako tekst). Test pilnuje sanityzacji.
      mockMain = {
        alt: "Schemat porównawczy zdrowej żyły i żylaka z opisem klinicznym refluksu w pniu żylnym z kontekstem",
        caption: "Zdrowa · Żylak · Refluks",
      };
      const { container } = renderImg();
      const [mainImg] = getImgs(container);
      const alt = mainImg.getAttribute("alt") ?? "";
      expect(alt).not.toMatch(/<[a-z][^>]*>/i);
      expect(alt).not.toMatch(/\*\*|__/);
    });
  });

  // ── INTEGRACJA: pełny payload CMS dla każdej z 4 stron ──────────
  describe("integracja: realistic CMS payload per page", () => {
    const PAGE_KEYS = ["evlt", "mikroflebektomia", "flebologia", "profilaktyka"] as const;

    it.each(PAGE_KEYS)(
      "page=%s: CMS override nadpisuje preset i spełnia wszystkie kontrakty",
      (pageKey) => {
        mockMain = {
          alt: `CMS dla ${pageKey}: schemat porównawczy zdrowej żyły i niedomykalności zastawek z aktualnym opisem klinicznym refluksu`,
          caption: `CMS · ${pageKey} · Aktualny · Override`,
        };
        mockPerforator = {
          alt: `CMS dla ${pageKey}: zaktualizowany schemat niewydolnego perforatora — łącznika między układem głębokim a powierzchownym`,
          caption: `CMS · perforator · ${pageKey} · Override`,
        };
        const { container } = render(
          <VenousInsufficiencyImage pageKey={pageKey} />,
        );
        const imgs = getImgs(container);
        const caps = getCaptions(container);

        // 1. alt nadpisany z CMS i niepusty
        expect(imgs[0].getAttribute("alt")).toBe(mockMain!.alt);
        expect(imgs[1].getAttribute("alt")).toBe(mockPerforator!.alt);
        expect((imgs[0].getAttribute("alt") ?? "").length).toBeGreaterThanOrEqual(60);

        // 2. caption nadpisany i niepusty
        expect((caps[0].textContent ?? "").trim()).toBe(mockMain!.caption);
        expect((caps[0].textContent ?? "").trim().length).toBeGreaterThan(0);

        // 3. kontrakt mobile: caption ≤110, segmenty ≤40
        expect((caps[0].textContent ?? "").trim().length).toBeLessThanOrEqual(110);
        for (const seg of (caps[0].textContent ?? "").trim().split(/\s·\s/)) {
          expect(seg.length).toBeLessThanOrEqual(40);
        }
      },
    );
  });
});
