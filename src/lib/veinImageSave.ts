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
 * Reguły lustrują trigger `validate_vein_image_override`:
 *  - alt 60–220 znaków,
 *  - caption ≤ 110 znaków,
 *  - segment „·" ≤ 40 znaków,
 *  - 42501 = brak uprawnień (RLS),
 *  - 23505 = unique violation (page_key+slot kolizja).
 */
export function describeSaveError(
  err: unknown,
  slot: VeinImageSlot,
  pageLabel: string,
): DescribedError {
  // PostgrestError ma { message, code }; zwykły Error ma { message }.
  // Akceptujemy oba przez duck-typing — żaden test nie polega na klasach.
  const e = err as { message?: string; code?: string } | undefined;
  const raw = (e?.message ?? String(err)).trim();
  const ctx = `${pageLabel} · ${slot === "main" ? "główny obraz" : "perforator"}`;

  if (/alt musi mieć/i.test(raw)) {
    return {
      title: `Walidacja serwera odrzuciła alt (${ctx})`,
      description: `${raw} Wymóg: alt 60–220 znaków.`,
    };
  }
  if (/caption nie może przekraczać/i.test(raw)) {
    return {
      title: `Walidacja serwera odrzuciła figcaption (${ctx})`,
      description: `${raw} Wymóg: figcaption ≤110 znaków.`,
    };
  }
  if (/segment caption/i.test(raw)) {
    return {
      title: `Walidacja serwera odrzuciła segment figcaption (${ctx})`,
      description: `${raw} Wymóg: każdy segment oddzielony „·" ≤40 znaków.`,
    };
  }
  if (e?.code === "42501") {
    return {
      title: `Brak uprawnień do zapisu (${ctx})`,
      description: "Sesja admina wygasła lub konto utraciło rolę. Zaloguj się ponownie.",
    };
  }
  if (e?.code === "23505") {
    return {
      title: `Konflikt zapisu (${ctx})`,
      description: "Inny wpis dla tej kombinacji page_key+slot już istnieje.",
    };
  }
  return {
    title: `Nie udało się zapisać (${ctx})`,
    description: raw || "Nieznany błąd serwera.",
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
