import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock CMS hook — testy weryfikują domyślne propsy/fallbacki, nie CMS.
vi.mock("@/hooks/useVeinImageOverrides", () => ({
  useVeinImageOverridesForPage: () => ({
    main: undefined,
    perforator: undefined,
    isLoading: false,
    error: null,
  }),
}));

import VenousInsufficiencyImage from "./VenousInsufficiencyImage";

/**
 * Per-page propsy używane na 4 stronach, na których osadzony jest
 * VenousInsufficiencyImage. Trzymamy je tu jako single source of truth
 * dla testów — jeżeli na którejkolwiek stronie zmienisz alt/caption,
 * zaktualizuj również ten obiekt (i odwrotnie).
 *
 * Strony:
 *  - /leczenie/evlt              (EVLT.tsx)
 *  - /leczenie/mikroflebektomia  (Mikroflebektomia.tsx)
 *  - /leczenie/flebologia        (Flebologia.tsx — „niewydolność żylna / żylaki")
 *  - /dla-pacjenta/profilaktyka-zylakow (ProfilaktykaZylakow.tsx)
 */
const PAGE_PROPS = {
  evlt: {
    title: "Skąd biorą się żylaki — co dokładnie zamyka EVLT?",
    mainAlt:
      "Schemat porównawczy zdrowej żyły i żylaka — pokazuje refluks krwi przez niedomykające się zastawki w pniu odpiszczelowym/odstrzałkowym, który EVLT zamyka termicznie od środka",
    mainCaption:
      "Zdrowa zastawka · Refluks w pniu żylnym · Cel EVLT · Termiczne zamknięcie żyły",
    perforatorAlt:
      "Schemat niewydolnego perforatora — żyły łączącej układ głęboki z powierzchownym; jego refluks często współistnieje z niewydolnością pnia leczonego EVLT",
    perforatorCaption:
      "Niewydolny perforator · Często współistnieje z refluksem pnia · Diagnostyka USG Doppler przed EVLT",
  },
  mikroflebektomia: {
    title: "Co dokładnie usuwa mikroflebektomia?",
    mainAlt:
      "Schemat porównawczy zdrowej żyły i żylakowatej bocznicy — poszerzone naczynie z niedomykającymi się zastawkami i cofającą się krwią, które mikroflebektomia usuwa mechanicznie z mikronakłuć",
    mainCaption:
      "Zdrowa bocznica · Żylakowata bocznica · Cel mikroflebektomii · Usunięcie z mikronakłuć",
    perforatorAlt:
      "Schemat niewydolnego perforatora — często zasila żylakowate bocznice usuwane mikroflebektomią; jego ocena USG Doppler decyduje o zakresie zabiegu",
    perforatorCaption:
      "Niewydolny perforator · Zasilacz żylakowatej bocznicy · Ocena USG Doppler przed zabiegiem",
  },
  flebologia: {
    title: "Mechanika żylaków — od zastawki do widocznego naczynia",
    mainAlt:
      "Schemat mechaniki żylaków — zdrowe zastawki kontra niedomykające się zastawki w przewlekłej niewydolności żylnej; refluks, poszerzenie naczynia i stan zapalny prowadzące do widocznych żylaków",
    mainCaption:
      "Zastawka · Refluks · Poszerzenie naczynia · Stan zapalny · Widoczny żylak",
    perforatorAlt:
      "Schemat niewydolnego perforatora — łącznika między układem głębokim a powierzchownym, którego refluks dociąża powierzchowne żyły i napędza powstawanie żylaków",
    perforatorCaption:
      "Niewydolny perforator · Dociąża układ powierzchowny · Punkt diagnostyki USG Doppler",
  },
  profilaktyka: {
    title: "Co dokładnie chronisz, dbając o nogi",
    mainAlt:
      "Schemat porównawczy zdrowej zastawki żylnej i niedomykającej się zastawki — proces, któremu zapobiega regularny ruch, kompresjoterapia i pielęgnacja nóg",
    mainCaption:
      "Zdrowa zastawka · Pierwsze rozszczelnienie · Refluks i stan zapalny · Etap, któremu zapobiegasz",
    perforatorAlt:
      "Schemat niewydolnego perforatora — pokazuje, dlaczego długie stanie i siedzenie obciąża układ żylny; czynnik ryzyka, który łagodzi aktywność i kompresjoterapia",
    perforatorCaption:
      "Niewydolny perforator · Obciążenie z długiego stania · Łagodzony ruchem i kompresją",
  },
} as const;

type PageKey = keyof typeof PAGE_PROPS;
const PAGES = Object.keys(PAGE_PROPS) as PageKey[];

describe("VenousInsufficiencyImage — per-page alt & figcaption", () => {
  describe.each(PAGES)("page: %s", (page) => {
    const props = PAGE_PROPS[page];

    it("renders dokładnie 2 obrazy (zastawki + perforator)", () => {
      const { container } = render(<VenousInsufficiencyImage {...props} />);
      const imgs = container.querySelectorAll("img");
      expect(imgs).toHaveLength(2);
    });

    it("każdy <img> ma niepusty, sensowny alt", () => {
      const { container } = render(<VenousInsufficiencyImage {...props} />);
      const imgs = Array.from(container.querySelectorAll("img"));
      for (const img of imgs) {
        const alt = img.getAttribute("alt") ?? "";
        expect(alt.trim().length).toBeGreaterThan(20);
      }
    });

    it("alt głównego i alt perforatora są różne", () => {
      const { container } = render(<VenousInsufficiencyImage {...props} />);
      const [mainImg, perfImg] = Array.from(container.querySelectorAll("img"));
      expect(mainImg.getAttribute("alt")).not.toBe(perfImg.getAttribute("alt"));
    });

    it("każdy <figcaption> jest niepusty", () => {
      const { container } = render(<VenousInsufficiencyImage {...props} />);
      const captions = Array.from(container.querySelectorAll("figcaption"));
      expect(captions).toHaveLength(2);
      for (const cap of captions) {
        expect((cap.textContent ?? "").trim().length).toBeGreaterThan(0);
      }
    });

    it("figcaption główny i perforatora są różne", () => {
      const { container } = render(<VenousInsufficiencyImage {...props} />);
      const [mainCap, perfCap] = Array.from(
        container.querySelectorAll("figcaption"),
      );
      expect((mainCap.textContent ?? "").trim()).not.toBe(
        (perfCap.textContent ?? "").trim(),
      );
    });

    // ── MOBILE READABILITY GUARDS ──────────────────────────────────────
    // Caption renderowany jest jako text-[11px] na 375px (px-1).
    // Empirycznie segment dłuższy niż ~40 znaków zaczyna się dziwnie
    // łamać na małym viewport. Total > 110 znaków daje 4+ linie
    // — strona robi się zbyt „gadatliwa" pod obrazem.
    it("każdy figcaption mieści się w mobile budget (≤110 znaków total)", () => {
      const { mainCaption, perforatorCaption } = props;
      expect(mainCaption.length).toBeLessThanOrEqual(110);
      expect(perforatorCaption.length).toBeLessThanOrEqual(110);
    });

    it("żaden segment '·' figcaption nie przekracza 40 znaków", () => {
      const { mainCaption, perforatorCaption } = props;
      for (const cap of [mainCaption, perforatorCaption]) {
        const segments = cap.split(/\s·\s/);
        for (const seg of segments) {
          expect(
            seg.length,
            `Segment "${seg}" w "${cap}" ma ${seg.length} znaków (limit 40 dla mobile)`,
          ).toBeLessThanOrEqual(40);
        }
      }
    });

    it("każdy alt jest opisowy ale nie przekracza 220 znaków", () => {
      const { mainAlt, perforatorAlt } = props;
      // dolna granica: alt musi być opisowy dla SEO/dostępności
      expect(mainAlt.length).toBeGreaterThanOrEqual(60);
      expect(perforatorAlt.length).toBeGreaterThanOrEqual(60);
      // górna granica: zbyt długi alt jest pomijany przez screen readery
      expect(mainAlt.length).toBeLessThanOrEqual(220);
      expect(perforatorAlt.length).toBeLessThanOrEqual(220);
    });
  });

  it("alt głównego obrazu jest UNIKALNY na wszystkich 4 stronach", () => {
    const alts = PAGES.map((p) => PAGE_PROPS[p].mainAlt);
    expect(new Set(alts).size).toBe(alts.length);
  });

  it("alt perforatora jest UNIKALNY na wszystkich 4 stronach", () => {
    const alts = PAGES.map((p) => PAGE_PROPS[p].perforatorAlt);
    expect(new Set(alts).size).toBe(alts.length);
  });

  it("figcaption głównego obrazu jest UNIKALNY na wszystkich 4 stronach", () => {
    const caps = PAGES.map((p) => PAGE_PROPS[p].mainCaption);
    expect(new Set(caps).size).toBe(caps.length);
  });

  it("figcaption perforatora jest UNIKALNY na wszystkich 4 stronach", () => {
    const caps = PAGES.map((p) => PAGE_PROPS[p].perforatorCaption);
    expect(new Set(caps).size).toBe(caps.length);
  });

  it("propsy w teście są zsynchronizowane z faktycznymi stronami (smoke-check źródeł)", async () => {
    // Lekki guard: jeżeli ktoś zmieni alt/caption w stronie i nie zaktualizuje
    // PAGE_PROPS, ten test to wyłapie. Czytamy źródła stron i sprawdzamy,
    // że każdy mainAlt/perforatorAlt/*Caption pojawia się w odpowiednim pliku.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const root = path.resolve(__dirname, "../../..");

    const fileMap: Record<PageKey, string> = {
      evlt: "src/pages/EVLT.tsx",
      mikroflebektomia: "src/pages/Mikroflebektomia.tsx",
      flebologia: "src/pages/Flebologia.tsx",
      profilaktyka: "src/pages/ProfilaktykaZylakow.tsx",
    };

    for (const page of PAGES) {
      const src = await fs.readFile(
        path.join(root, fileMap[page]),
        "utf8",
      );
      const p = PAGE_PROPS[page];
      for (const value of [
        p.mainAlt,
        p.mainCaption,
        p.perforatorAlt,
        p.perforatorCaption,
      ]) {
        expect(
          src.includes(value),
          `Brak w ${fileMap[page]}: "${value.slice(0, 60)}…"`,
        ).toBe(true);
      }
    }
  });
});
