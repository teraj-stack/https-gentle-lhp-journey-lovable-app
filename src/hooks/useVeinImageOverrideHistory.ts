import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VeinImagePageKey, VeinImageSlot } from "./useVeinImageOverrides";

export interface VeinImageOverrideHistoryRow {
  id: string;
  override_id: string | null;
  page_key: VeinImagePageKey;
  slot: VeinImageSlot;
  alt: string;
  caption: string;
  updated_by: string | null;
  recorded_at: string;
  action: "insert" | "update" | "delete";
}

export const VEIN_IMAGE_HISTORY_QUERY_KEY = ["vein-image-override-history"] as const;

/**
 * Pobiera historię wersji alt/caption dla pojedynczego (page_key, slot).
 * Najnowsze pierwsze. Limit 50 — wystarczająco dla typowego edytora,
 * a chroni przed wyciekiem pamięci przy długiej historii.
 */
export function useVeinImageOverrideHistory(
  pageKey: VeinImagePageKey,
  slot: VeinImageSlot,
  enabled = true,
) {
  return useQuery({
    queryKey: [...VEIN_IMAGE_HISTORY_QUERY_KEY, pageKey, slot],
    enabled,
    queryFn: async (): Promise<VeinImageOverrideHistoryRow[]> => {
      const { data, error } = await supabase
        .from("vein_image_override_history")
        .select("*")
        .eq("page_key", pageKey)
        .eq("slot", slot)
        .order("recorded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as VeinImageOverrideHistoryRow[];
    },
    staleTime: 30 * 1000,
  });
}
