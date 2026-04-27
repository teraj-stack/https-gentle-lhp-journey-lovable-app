/**
 * Test logiki zapisu nadpisania alt/caption (`performSaveSlot`)
 * + mapowania błędów (`describeSaveError`).
 *
 * Zakres:
 *  1. INSERT — gdy brak istniejącego wiersza (lookup → null), wywołujemy
 *     `.insert(payload)` z PEŁNYM payloadem (page_key, slot, alt, caption,
 *     updated_by) i zwracamy `{ updated: false }`. Cache react-query musi
 *     zostać unieważniony — to driver odświeżenia podglądu CMS.
 *  2. UPDATE — gdy lookup zwraca `{ id }`, wywołujemy
 *     `.update(payload).eq('id', existing.id)`. NIE wołamy `.insert()`.
 *  3. Błąd lookup → propagacja w górę, BRAK zapisu, BRAK invalidate.
 *  4. Błąd zapisu (np. trigger walidacji) → propagacja w górę, BRAK
 *     invalidate (cache nie może udawać, że dane się zmieniły).
 *  5. `describeSaveError` mapuje wiadomości triggera + kody Postgres
 *     (42501 RLS, 23505 unique) na czytelne tytuły/opisy. Każda gałąź ma
 *     przykład odpalający tylko ten regex/kod.
 *
 * Mock Supabase: minimalny chainable stub — `from(...)` zwraca obiekt
 * z `select/insert/update/eq/maybeSingle`. Pozwala śledzić argumenty
 * KAŻDEGO wywołania (vi.fn().mock.calls) bez rozjechania typów —
 * `performSaveSlot` przyjmuje `Pick<SupabaseClient, "from">` właśnie po to.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  performSaveSlot,
  describeSaveError,
  type SaveSlotDeps,
} from "@/lib/veinImageSave";

interface MockBuilderState {
  // Argumenty łańcucha select/.eq/.eq/.maybeSingle (lookup) — kolejność per from() call.
  lastSelect?: string;
  lastEqs: Array<[string, unknown]>;
  // Wartość zwracana przez maybeSingle (kontrola: czy update vs insert).
  maybeSingleResolved: { data: unknown; error: unknown };
  // Wartości zwracane przez update/insert (do testu błędów zapisu).
  updateResult: { error: unknown };
  insertResult: { error: unknown };
  // Spies — policzone osobno.
  selectSpy: ReturnType<typeof vi.fn>;
  insertSpy: ReturnType<typeof vi.fn>;
  updateSpy: ReturnType<typeof vi.fn>;
  eqSpy: ReturnType<typeof vi.fn>;
  maybeSingleSpy: ReturnType<typeof vi.fn>;
}

/**
 * Budowniczy mocka klienta Supabase. Każde `.from(table)` zwraca świeży
 * builder (mimo wspólnego `state`), ale wszystkie z tej samej iteracji
 * mają DOSTĘP do tych samych spies — testy mogą sprawdzić: "czy w ogóle
 * wywołano insert?" niezależnie od ile razy `from()` było wywołane.
 *
 * `from()` w produkcji jest wywoływane DWA razy: raz dla lookup
 * (.select.eq.eq.maybeSingle), raz dla zapisu (.insert(...) lub
 * .update(...).eq('id', ...)). Stąd builder zwraca:
 *  - .select() → builder z .eq/.maybeSingle
 *  - .insert() → Promise<{ error }>
 *  - .update() → builder z .eq() → Promise<{ error }>
 */
const buildMockSupabase = (state: MockBuilderState) => {
  const lookupBuilder = {
    select: state.selectSpy.mockImplementation((cols: string) => {
      state.lastSelect = cols;
      return lookupBuilder;
    }),
    eq: state.eqSpy.mockImplementation((col: string, val: unknown) => {
      state.lastEqs.push([col, val]);
      return lookupBuilder;
    }),
    maybeSingle: state.maybeSingleSpy.mockImplementation(async () => state.maybeSingleResolved),
    insert: state.insertSpy.mockImplementation(async () => state.insertResult),
    update: state.updateSpy.mockImplementation(() => updateBuilder),
  };
  // Update builder MUSI być oddzielny — `.update(payload).eq('id', x)`
  // zwraca thenable (await → { error }). Wykorzystujemy ten sam eqSpy
  // żeby test mógł zweryfikować argumenty obu .eq() w jednym snapshocie.
  const updateBuilder = {
    eq: vi.fn().mockImplementation(async (col: string, val: unknown) => {
      state.lastEqs.push([col, val]);
      return state.updateResult;
    }),
  };
  return {
    from: vi.fn().mockReturnValue(lookupBuilder),
  };
};

const buildState = (overrides: Partial<MockBuilderState> = {}): MockBuilderState => ({
  lastEqs: [],
  maybeSingleResolved: { data: null, error: null },
  updateResult: { error: null },
  insertResult: { error: null },
  selectSpy: vi.fn(),
  insertSpy: vi.fn(),
  updateSpy: vi.fn(),
  eqSpy: vi.fn(),
  maybeSingleSpy: vi.fn(),
  ...overrides,
});

const baseInput = {
  pageKey: "evlt" as const,
  slot: "main" as const,
  // Alt długości 80 — w realnym UI zawsze ≥60; tu nie wpływa na ścieżkę.
  alt: "Schemat układu żylnego kończyny dolnej z perforatorami i niewydolnością.",
  caption: "Kierunek przepływu · niewydolność",
  updatedBy: "admin@cml.pl",
};

const buildDeps = (supabase: ReturnType<typeof buildMockSupabase>) => {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);
  const deps: SaveSlotDeps & { invalidateQueries: typeof invalidateQueries } = {
    supabase: supabase as unknown as SaveSlotDeps["supabase"],
    queryClient: { invalidateQueries },
    invalidateQueries,
  };
  return deps;
};

describe("performSaveSlot", () => {
  let state: MockBuilderState;

  beforeEach(() => {
    state = buildState();
  });

  it("INSERT: brak istniejącego wiersza → wstawia pełny payload i invaliduje cache", async () => {
    state.maybeSingleResolved = { data: null, error: null };
    const supabase = buildMockSupabase(state);
    const deps = buildDeps(supabase);

    const result = await performSaveSlot(baseInput, deps);

    expect(result).toEqual({ updated: false });
    // Lookup po (page_key, slot)
    expect(state.lastSelect).toBe("id");
    expect(state.lastEqs[0]).toEqual(["page_key", "evlt"]);
    expect(state.lastEqs[1]).toEqual(["slot", "main"]);
    // Insert wywołany dokładnie raz, z PEŁNYM mapowaniem snake_case
    expect(state.insertSpy).toHaveBeenCalledTimes(1);
    expect(state.insertSpy).toHaveBeenCalledWith({
      page_key: "evlt",
      slot: "main",
      alt: baseInput.alt,
      caption: baseInput.caption,
      updated_by: "admin@cml.pl",
    });
    // Update NIE wywołany
    expect(state.updateSpy).not.toHaveBeenCalled();
    // Cache invalidation = driver odświeżenia podglądu CMS
    expect(deps.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(deps.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["vein-image-overrides"],
    });
  });

  it("UPDATE: istniejący wiersz → wywołuje update().eq('id', existing.id), NIE insert", async () => {
    state.maybeSingleResolved = { data: { id: "row-uuid-123" }, error: null };
    const supabase = buildMockSupabase(state);
    const deps = buildDeps(supabase);

    const result = await performSaveSlot(
      { ...baseInput, slot: "perforator", updatedBy: null },
      deps,
    );

    expect(result).toEqual({ updated: true });
    expect(state.updateSpy).toHaveBeenCalledTimes(1);
    expect(state.updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        page_key: "evlt",
        slot: "perforator",
        updated_by: null, // brak sesji admina dopuszczalny — w bazie nullable
      }),
    );
    expect(state.insertSpy).not.toHaveBeenCalled();
    // Ostatnie .eq() to to z update(...).eq('id', ...)
    expect(state.lastEqs.at(-1)).toEqual(["id", "row-uuid-123"]);
    expect(deps.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("Błąd lookup → propagacja, BRAK insert/update, BRAK invalidate", async () => {
    state.maybeSingleResolved = { data: null, error: { message: "boom" } };
    const supabase = buildMockSupabase(state);
    const deps = buildDeps(supabase);

    await expect(performSaveSlot(baseInput, deps)).rejects.toMatchObject({
      message: "boom",
    });
    expect(state.insertSpy).not.toHaveBeenCalled();
    expect(state.updateSpy).not.toHaveBeenCalled();
    expect(deps.invalidateQueries).not.toHaveBeenCalled();
  });

  it("Błąd zapisu (insert) → propagacja, cache NIE jest invalidowany", async () => {
    state.maybeSingleResolved = { data: null, error: null };
    state.insertResult = {
      error: { message: 'alt musi mieć 60-220 znaków (ma 12).', code: 'P0001' },
    };
    const supabase = buildMockSupabase(state);
    const deps = buildDeps(supabase);

    await expect(performSaveSlot(baseInput, deps)).rejects.toMatchObject({
      message: expect.stringContaining("alt musi mieć"),
    });
    // Insert był wywołany — to nie błąd lookup
    expect(state.insertSpy).toHaveBeenCalledTimes(1);
    // Cache pozostaje stary — UI nie pokaże fałszywego "zapisano"
    expect(deps.invalidateQueries).not.toHaveBeenCalled();
  });
});

describe("describeSaveError", () => {
  it("mapuje błąd alt z triggera na opis z limitami", () => {
    const out = describeSaveError(
      { message: "alt musi mieć 60-220 znaków (ma 50).", code: "P0001" },
      "main",
      "EVLT",
    );
    expect(out.title).toMatch(/alt.*EVLT.*główny obraz/i);
    expect(out.description).toMatch(/60.+220 znaków/);
  });

  it("mapuje błąd caption z triggera", () => {
    const out = describeSaveError(
      { message: "caption nie może przekraczać 110 znaków (ma 130)." },
      "perforator",
      "Mikroflebektomia",
    );
    expect(out.title).toMatch(/figcaption.*Mikroflebektomia.*perforator/i);
    expect(out.description).toMatch(/≤110 znaków/);
  });

  it("mapuje błąd segmentu z limitem 40", () => {
    const out = describeSaveError(
      { message: 'segment caption "bardzo długi tekst…" przekracza 40 znaków (ma 50)' },
      "main",
      "Flebologia",
    );
    expect(out.title).toMatch(/segment.*Flebologia/i);
    expect(out.description).toMatch(/≤40 znaków/);
  });

  it("rozpoznaje 42501 (RLS) → komunikat o uprawnieniach", () => {
    const out = describeSaveError(
      { message: "permission denied for table vein_image_overrides", code: "42501" },
      "main",
      "EVLT",
    );
    expect(out.title).toMatch(/Brak uprawnień/);
    expect(out.description).toMatch(/sesja|zaloguj/i);
  });

  it("rozpoznaje 23505 (unique) → komunikat o konflikcie", () => {
    const out = describeSaveError(
      { message: 'duplicate key value violates unique constraint', code: "23505" },
      "perforator",
      "Profilaktyka żylaków",
    );
    expect(out.title).toMatch(/Konflikt/);
    expect(out.description).toMatch(/page_key\+slot/);
  });

  it("fallback: nieznany błąd → ogólny tytuł z page+slot", () => {
    const out = describeSaveError(new Error("network down"), "main", "EVLT");
    expect(out.title).toMatch(/Nie udało się zapisać.*EVLT.*główny obraz/i);
    expect(out.description).toBe("network down");
  });
});
