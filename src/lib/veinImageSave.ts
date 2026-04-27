/**
 * Czysta logika zapisu nadpisania alt/caption dla pojedynczego slotu
 * (`vein_image_overrides`). Wydzielona z `AdminVeinImages.tsx` żeby:
 *
 *  1. dało się ją testować w Vitest BEZ mountowania całego panelu admin
 *     (auth bootstrap, react-query, navigate, layout — niepotrzebne tutaj),
 *  2. UI pozostał cienkim adapterem nad jednym wejściem/wyjściem,
 *  3. mapowanie błędów serwerowych miało jedno źródło prawdy
 *     (mirror walidacji triggera `validate_vein_image_override`).
 *
 * Kontrakt: funkcja wywołuje albo `update(... ).eq('id', existing.id)` gdy
 * wiersz już istnieje, albo `insert(payload)` w przeciwnym razie. Payload
 * zawsze niesie `page_key`, `slot`, `alt`, `caption`, `updated_by`. Po
 * pomyślnym zapisie cache react-query (`VEIN_IMAGE_QUERY_KEY`) jest
 * inwalidowany — to wymusza re-render podglądu CMS.
 */
import type { QueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VEIN_IMAGE_QUERY_KEY, type VeinImagePageKey, type VeinImageSlot } from "@/hooks/useVeinImageOverrides";

export interface SaveSlotInput {
  pageKey: VeinImagePageKey;
  slot: VeinImageSlot;
  alt: string;
  caption: string;
  updatedBy: string | null;
}

export interface SaveSlotDeps {
  // Generic param: w produkcji to klient z @/integrations/supabase/client
  // (typowany na Database). W teście podajemy minimalny mock z jedyną
  // metodą `from(...)` → łańcuch select/.eq/.maybeSingle albo .insert/.update.
  supabase: Pick<SupabaseClient, "from">;
  queryClient: Pick<QueryClient, "invalidateQueries">;
}

export interface SaveSlotResult {
  /** Czy wykonano UPDATE (true) czy INSERT (false). Test używa do dowodu ścieżki. */
  updated: boolean;
}

/** Reprezentacja błędu z trigger'a / Postgres'a — match na message zwracanym przez Supabase. */
export interface DescribedError {
  title: string;
  description: string;
}

/**
 * Mapuje błąd `PostgrestError | Error | unknown` na komunikat dla UI.
 * Reguły lustrują trigger `validate_vein_image_override` + typowe błędy RLS/unique:
 *  - 42501 / "row-level security" → brak uprawnień,
 *  - 23505 / "duplicate key|unique constraint" → konflikt,
 *  - "alt musi mieć" → walidacja długości alt (60–220),
 *  - "caption nie może przekraczać" → walidacja długości caption (≤110),
 *  - "segment caption" → segment „·" >40 znaków.
 *
 * Trigger po stronie Postgres rzuca po polsku — message zwykle jest gotowy
 * do pokazania, helper dorzuca nagłówek i kontekst (page · slot).
 */
export function describeSaveError(
  err: unknown,
  slot: VeinImageSlot,
  pageLabel: string,
): DescribedError {
  const slotLabel = slot === "main" ? "główny obraz" : "perforator";
  const ctx = `${pageLabel} · ${slotLabel}`;
  const e = err as { message?: string; code?: string; details?: string } | null;
  const raw = (e?.message ?? String(err)).trim();
  const code = e?.code;

  if (code === "42501" || /row-level security/i.test(raw)) {
    return {
      title: `Brak uprawnień (${ctx})`,
      description: "Twoje konto nie ma roli admina dla tej tabeli. Zaloguj się ponownie lub poproś o uprawnienia.",
    };
  }
  if (code === "23505" || /duplicate key|unique constraint/i.test(raw)) {
    return {
      title: `Konflikt: wpis już istnieje (${ctx})`,
      description: "Inna sesja zapisała ten sam slot. Odśwież stronę i spróbuj ponownie.",
    };
  }
  if (/alt musi mieć/i.test(raw)) {
    return {
      title: `Walidacja serwera odrzuciła alt (${ctx})`,
      description: `${raw} Wymóg: alt 60–220 znaków.`,
    };
  }
  if (/caption nie może przekraczać/i.test(raw)) {
    return {
      title: `Walidacja serwera odrzuciła caption (${ctx})`,
      description: `${raw} Wymóg: caption ≤110 znaków.`,
    };
  }
  if (/segment caption/i.test(raw)) {
    return {
      title: `Za długi segment "·" w caption (${ctx})`,
      description: `${raw} Wymóg: każdy segment oddzielony „ · " ≤40 znaków.`,
    };
  }
  return {
    title: `Błąd zapisu (${ctx})`,
    description: raw || "Nieznany błąd serwera. Sprawdź połączenie i spróbuj ponownie.",
  };
}

/**
 * Wykonuje pełny cykl zapisu jednego slotu:
 *  1. lookup po (page_key, slot) → decyduje update vs insert,
 *  2. zapis,
 *  3. invalidate query cache.
 *
 * Rzuca dalej każdy `error` z Supabase; UI łapie i podaje do `describeSaveError`.
 */
export async function performSaveSlot(
  input: SaveSlotInput,
  deps: SaveSlotDeps,
): Promise<SaveSlotResult> {
  const { supabase, queryClient } = deps;

  const lookup = await supabase
    .from("vein_image_overrides")
    .select("id")
    .eq("page_key", input.pageKey)
    .eq("slot", input.slot)
    .maybeSingle();
  if (lookup.error) throw lookup.error;

  const payload = {
    page_key: input.pageKey,
    slot: input.slot,
    alt: input.alt,
    caption: input.caption,
    updated_by: input.updatedBy,
  };

  let updated = false;
  if (lookup.data) {
    const { error } = await supabase
      .from("vein_image_overrides")
      .update(payload)
      .eq("id", (lookup.data as { id: string }).id);
    if (error) throw error;
    updated = true;
  } else {
    const { error } = await supabase
      .from("vein_image_overrides")
      .insert(payload);
    if (error) throw error;
  }

  await queryClient.invalidateQueries({ queryKey: VEIN_IMAGE_QUERY_KEY });
  return { updated };
}
