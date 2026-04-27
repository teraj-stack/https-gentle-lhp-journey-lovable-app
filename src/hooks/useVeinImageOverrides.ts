import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VeinImagePageKey =
  | "evlt"
  | "mikroflebektomia"
  | "flebologia"
  | "profilaktyka";

export type VeinImageSlot = "main" | "perforator";

export interface VeinImageOverride {
  id: string;
  page_key: VeinImagePageKey;
  slot: VeinImageSlot;
  alt: string;
  caption: string;
  updated_at: string;
  updated_by: string | null;
}

const QUERY_KEY = ["vein-image-overrides"] as const;

/**
 * Czyta wszystkie nadpisania alt/figcaption z tabeli vein_image_overrides.
 * Public-read RLS — działa anonimowo, więc strony publiczne mogą podmieniać
 * propsy bez logowania. Fallback (gdy zapytanie się nie powiedzie lub
 * tabela jest pusta) dostarcza komponent VenousInsufficiencyImage przez
 * swoje domyślne wartości propsów.
 */
export function useVeinImageOverrides() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<VeinImageOverride[]> => {
      const { data, error } = await supabase
        .from("vein_image_overrides")
        .select("*");
      if (error) throw error;
      return (data ?? []) as VeinImageOverride[];
    },
    // Cache długo — admin invalidates ręcznie po zapisie
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Zwraca parę nadpisań (main + perforator) dla danej strony.
 * Jeżeli wiersz nie istnieje, pole jest undefined — komponent
 * powinien wtedy użyć swojego prop default.
 */
export function useVeinImageOverridesForPage(pageKey: VeinImagePageKey) {
  const { data, ...rest } = useVeinImageOverrides();
  const main = data?.find((r) => r.page_key === pageKey && r.slot === "main");
  const perforator = data?.find(
    (r) => r.page_key === pageKey && r.slot === "perforator",
  );
  return { main, perforator, ...rest };
}

export const VEIN_IMAGE_QUERY_KEY = QUERY_KEY;
