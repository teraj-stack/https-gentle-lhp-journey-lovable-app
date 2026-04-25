/**
 * Testy/scenariusze: tooltip „Ostatnia zmiana" pokazuje właściwy nagłówek
 * źródła w zależności od tego, czy zmiana przyszła z innej karty (sync), czy
 * była lokalną akcją w bieżącej karcie.
 *
 * Testujemy pure helper `getLastChangeTooltipContent`, który dostarcza treść
 * do Radix Tooltipa w `AutoSaveSettings.tsx` — dzięki temu pokrycie jest
 * stabilne (jsdom + Radix portal/hover są kruche), a regresje w copy
 * zostaną wyłapane natychmiast.
 *
 * Dodatkowo weryfikujemy, że zbudowany przez komponent łączny `tooltipText`
 * (nagłówek + opis + opcjonalny czas) zawiera nagłówek właściwego źródła —
 * to dokładnie ten string, który trafia do `aria-label` triggera tooltipa
 * i `title` (fallback dla touch).
 */
import { describe, it, expect } from "vitest";
import { getLastChangeTooltipContent } from "./lastChangeTooltipContent";

const buildTooltipText = (
  source: "remote" | "local" | null,
  fullDate?: string,
): string => {
  // Replikuje sklejanie z AutoSaveSettings.tsx (inline IIFE wewnątrz JSX)
  // żeby test pilnował, że końcowy tekst aria-label ma właściwy nagłówek.
  const tooltipContent = getLastChangeTooltipContent(source);
  return [
    tooltipContent.ariaHeading,
    tooltipContent.description,
    fullDate ? `Czas: ${fullDate}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

describe("getLastChangeTooltipContent — wybór nagłówka per źródło", () => {
  it("dla source 'remote' (sync między kartami) zwraca nagłówek o synchronizacji", () => {
    const content = getLastChangeTooltipContent("remote");

    expect(content.isRemote).toBe(true);
    expect(content.heading).toBe("Synchronizacja między kartami");
    expect(content.ariaHeading).toBe("Źródło: Synchronizacja między kartami");
    // Opis MUSI wskazywać mechanizm zdalny (BroadcastChannel/storage),
    // bo to klucz do odróżnienia od lokalnej akcji w UI bez kolorów.
    expect(content.description).toMatch(/innej.*karty/i);
    expect(content.description).toMatch(/BroadcastChannel|storage/);
  });

  it("dla source 'local' (moja akcja) zwraca nagłówek o lokalnej akcji", () => {
    const content = getLastChangeTooltipContent("local");

    expect(content.isRemote).toBe(false);
    expect(content.heading).toBe("Lokalna akcja w tej karcie");
    expect(content.ariaHeading).toBe("Źródło: Moja lokalna akcja w tej karcie");
    // Opis MUSI wskazywać mechanizm lokalny (Switch lub skrót Alt+Shift+A) —
    // dzięki temu screen reader dostaje pełny kontekst.
    expect(content.description).toMatch(/Switch|Alt\+Shift\+A/);
  });

  it("dla source null traktuje zmianę jak lokalną (neutralny placeholder)", () => {
    // null pojawia się przy pierwszym mount przed jakąkolwiek akcją.
    // Reguła zgodna z `getLastChangeLabelStyle` — żaden wariant tooltipa
    // nigdy nie powinien przypadkowo „udawać" zdalnej synchronizacji.
    const content = getLastChangeTooltipContent(null);

    expect(content.isRemote).toBe(false);
    expect(content.heading).toBe("Lokalna akcja w tej karcie");
  });

  it("nagłówki dla 'remote' i 'local' są różnymi stringami (kontrast w aria-label)", () => {
    // Regression guard: gdyby ktoś przez przypadek skopiował ten sam tekst
    // do obu wariantów, screen reader nie odróżniłby źródła zmiany.
    const remote = getLastChangeTooltipContent("remote");
    const local = getLastChangeTooltipContent("local");
    expect(remote.heading).not.toBe(local.heading);
    expect(remote.ariaHeading).not.toBe(local.ariaHeading);
    expect(remote.description).not.toBe(local.description);
  });
});

describe("tooltipText (aria-label triggera) — sklejanie nagłówek+opis+czas", () => {
  it("dla synchronizacji między kartami: zaczyna się od 'Źródło: Synchronizacja…' i zawiera czas", () => {
    const text = buildTooltipText("remote", "25 kwietnia 2026, 12:34:56");

    expect(text.startsWith("Źródło: Synchronizacja między kartami")).toBe(true);
    expect(text).toContain("Czas: 25 kwietnia 2026, 12:34:56");
    // NIE może zawierać nagłówka lokalnego — to klucz testu sprawdzającego
    // właściwy wariant nagłówka per scenariusz.
    expect(text).not.toContain("Lokalna akcja w tej karcie");
  });

  it("dla lokalnej akcji: zaczyna się od 'Źródło: Moja lokalna akcja…' i nie pokazuje syncu", () => {
    const text = buildTooltipText("local", "25 kwietnia 2026, 12:34:56");

    expect(text.startsWith("Źródło: Moja lokalna akcja w tej karcie")).toBe(true);
    expect(text).toContain("Czas: 25 kwietnia 2026, 12:34:56");
    expect(text).not.toContain("Synchronizacja między kartami");
  });

  it("pomija linię 'Czas:' gdy fullDate jest niedostępny (brak waliny timestampu)", () => {
    // Scenariusz: `lastChangeAt` istnieje, ale `formatFullTimestamp` zwrócił
    // fallback i komponent nie poda `fullDate` do tooltipa — tekst nie powinien
    // mieć osieroconej linii „Czas: ".
    const text = buildTooltipText("remote", undefined);

    expect(text).toContain("Źródło: Synchronizacja między kartami");
    expect(text).not.toContain("Czas:");
    // Dwie linie (nagłówek + opis), bez końcowej pustej linii „Czas:".
    expect(text.split("\n").length).toBe(2);
  });
});

describe("spójność języka — wszystkie user-facing stringi używają «karta», nie «tab»", () => {
  /**
   * Reguła z `mem://design`: cały interfejs po polsku mówi „karta(y)", nigdy
   * „tab(y)/tab-y/cross-tab/local-tab". Anglicyzmy zostawiamy WYŁĄCZNIE w
   * komentarzach kodu i identyfikatorach technicznych. Test pilnuje, żeby
   * helpery dostarczające copy do tooltipa, badge'a i aria-label nie
   * wprowadziły regresji typu „local-tab"/„cross-tab".
   */
  const FORBIDDEN_PATTERNS: ReadonlyArray<RegExp> = [
    /\btab\b/i, // pojedyncze słowo „tab"
    /\btab-?[a-z]+/i, // local-tab, cross-tab, tabach itp.
    /\bcross-tab\b/i,
    /\bwithin-tab\b/i,
  ];

  const userFacingFields: Array<keyof ReturnType<typeof getLastChangeTooltipContent>> = [
    "heading",
    "ariaHeading",
    "description",
  ];

  for (const source of ["remote", "local", null] as const) {
    it(`source=${source ?? "null"}: żadne pole user-facing nie zawiera anglicyzmu „tab"`, () => {
      const content = getLastChangeTooltipContent(source);
      for (const field of userFacingFields) {
        const value = content[field] as string;
        for (const pattern of FORBIDDEN_PATTERNS) {
          expect(
            value,
            `Pole „${field}" zawiera anglicyzm pasujący do ${pattern}: „${value}"`,
          ).not.toMatch(pattern);
        }
        // Pozytywny check: skoro wspominamy o miejscu zmiany, MUSI pojawić się
        // polskie słowo z rdzenia „kart-/karc-" (karta/karty/kartami/karcie/kartach).
        // Uwaga: po polsku „karta" w miejscowniku to „karcie" — stąd alternatywa [ct].
        expect(
          value.toLowerCase(),
          `Pole „${field}" powinno używać polskiego słowa „karta": „${value}"`,
        ).toMatch(/\bkar[ct]/);
      }
    });
  }
});

describe("getLastChangeTooltipContent — odporność na nietypowe wartości source", () => {
  /**
   * Sygnatura helpera jest zawężona do `"remote" | "local" | null`, ale w runtime
   * mogą trafić wartości spoza tej domeny:
   *  - `undefined` — np. gdy odbiorca odpakował payload z BroadcastChannel/storage,
   *    który nie miał pola `lastChangeSource` (back-compat ze starszą wersją hooka),
   *  - pusty string `""` — defensywnie po `JSON.parse` z uszkodzonego storage,
   *  - inne stringi (`"REMOTE"`, `"sync"`, `"unknown"`) — literówki w innych modułach,
   *  - typy nie-stringowe (`0`, `false`, obiekty) — zły mapping w testach E2E lub
   *    przyszły refactor, który zapomni zaktualizować type guard.
   *
   * **Reguła**: każda nieznana/niespodziewana wartość MUSI bezpiecznie zdegradować
   * do wariantu lokalnego (`isRemote: false`). Nigdy nie wolno przypadkiem pokazać
   * „Synchronizacja między kartami" dla zmiany, której pochodzenie nie jest
   * jednoznacznie potwierdzone jako `"remote"` — to byłoby mylące dla pacjenta
   * i zafałszowałoby kontekst zdarzenia.
   *
   * Helper realizuje tę regułę przez `source === "remote"` (strict equality):
   * cokolwiek nie jest dokładnie tym stringiem, idzie w fallback lokalny.
   */
  const REMOTE_HEADING = "Synchronizacja między kartami";
  const LOCAL_HEADING = "Lokalna akcja w tej karcie";

  // `undefined` — najczęstszy przypadek brakującego pola w payloadzie.
  it("undefined zwraca wariant lokalny (fallback bezpieczny)", () => {
    // Świadome rzutowanie — w produkcji TS to wyłapie, ale runtime może dostać undefined
    // (np. ze starego JSON-a w localStorage albo brakującego pola w BC payload).
    const content = getLastChangeTooltipContent(undefined as unknown as "remote" | "local" | null);

    expect(content.isRemote).toBe(false);
    expect(content.heading).toBe(LOCAL_HEADING);
    expect(content.ariaHeading).toBe("Źródło: Moja lokalna akcja w tej karcie");
    // KLUCZOWE: nie pokazujemy nagłówka zdalnego dla niejednoznacznego źródła.
    expect(content.heading).not.toBe(REMOTE_HEADING);
  });

  it("pusty string zwraca wariant lokalny", () => {
    const content = getLastChangeTooltipContent("" as unknown as "remote" | "local" | null);

    expect(content.isRemote).toBe(false);
    expect(content.heading).toBe(LOCAL_HEADING);
  });

  // Stringi „prawie remote" — typowe regresje przy refactorach (zła wielkość liter,
  // synonimy, literówki). Każdy MUSI iść w fallback, bo strict equality.
  it.each([
    ["REMOTE", "wielkie litery — case-sensitive equality"],
    ["Remote", "tytułowa wielkość liter"],
    ["remote ", "trailing whitespace (zła normalizacja przy parsowaniu JSON)"],
    [" remote", "leading whitespace"],
    ["sync", "synonim z innego modułu"],
    ["broadcast", "nazwa transportu zamiast źródła"],
    ["cross-tab", "anglicyzm techniczny"],
    ["unknown", "wartość-placeholder z niedokończonego refactoringu"],
  ])(
    "string '%s' (%s) → fallback lokalny",
    (badSource, _label) => {
      const content = getLastChangeTooltipContent(
        badSource as unknown as "remote" | "local" | null,
      );

      expect(content.isRemote).toBe(false);
      expect(content.heading).toBe(LOCAL_HEADING);
    },
  );

  // Typy nie-stringowe — defensywa przed złym mapowaniem w testach lub złym JSON-em.
  // Każdy MUSI iść w fallback, bo `=== "remote"` zwraca false dla każdego nie-stringu.
  it.each([
    [0, "liczba 0"],
    [1, "liczba 1"],
    [false, "boolean false"],
    [true, "boolean true"],
    [{}, "pusty obiekt"],
    [{ kind: "remote" }, "obiekt z polem kind"],
    [["remote"], "tablica ze stringiem"],
    [Symbol("remote"), "Symbol"],
  ])("typ %s (%s) → fallback lokalny", (badSource, _label) => {
    const content = getLastChangeTooltipContent(
      badSource as unknown as "remote" | "local" | null,
    );

    expect(content.isRemote).toBe(false);
    expect(content.heading).toBe(LOCAL_HEADING);
    expect(content.description).toMatch(/Switch|Alt\+Shift\+A/);
  });

  it("dokładnie 'remote' (strict equality) jest JEDYNYM wejściem dającym wariant zdalny", () => {
    // Pozytywny dual: pilnujemy, żeby fallback nie był nadgorliwy i NIE blokował
    // też prawidłowego stringu „remote". To regression guard na wypadek gdyby
    // ktoś dodał kiedyś normalizację typu `.toLowerCase()` i niechcący zepsuł case.
    const content = getLastChangeTooltipContent("remote");

    expect(content.isRemote).toBe(true);
    expect(content.heading).toBe(REMOTE_HEADING);
  });

  it("kształt zwracanego obiektu jest stabilny dla każdej wartości source", () => {
    // Wymagane pola muszą zawsze istnieć i być nie-pustymi stringami,
    // żeby `aria-label` w komponencie nie wyemitował pustego/undefined stringu
    // (screen reader przeczytałby wtedy nazwę elementu zamiast źródła zmiany).
    const inputs: Array<unknown> = [
      "remote",
      "local",
      null,
      undefined,
      "",
      "REMOTE",
      0,
      {},
      [],
    ];
    for (const raw of inputs) {
      const content = getLastChangeTooltipContent(
        raw as "remote" | "local" | null,
      );
      expect(typeof content.heading).toBe("string");
      expect(content.heading.length).toBeGreaterThan(0);
      expect(typeof content.ariaHeading).toBe("string");
      expect(content.ariaHeading.startsWith("Źródło: ")).toBe(true);
      expect(typeof content.description).toBe("string");
      expect(content.description.length).toBeGreaterThan(0);
      expect(typeof content.isRemote).toBe("boolean");
    }
  });
});
