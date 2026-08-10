/**
 * Hook ładujący dynamiczne aliasy SEO z DB i mergujący z hardcoded SEO_REDIRECTS.
 *
 * Strategia:
 *  - DB (`seo_redirects` gdzie `is_active=true`) ma PIERWSZEŃSTWO per `from`.
 *    Pozwala admin nadpisać ustawienia z kodu bez deploya (np. szybko zmienić cel).
 *  - Wpisy z kodu, których DB nie nadpisuje, są zachowane (zero ryzyka regresji
 *     po awarii/dropie tabeli — strona pracuje na fallback z kodu).
 *  - Cache 60s (TanStack Query). Na wystartowaniu UI od razu otrzymuje listę
 *     hardcoded z kodu jako `placeholderData`, tak żeby `<Route>` nie czekał na sieć.
 */
import { useQuery } from "@tanstack/react-query";
// UWAGA: klient backendu jest importowany dynamicznie wewnątrz `fetchActiveDbRedirects`.
// Ten hook renderuje się na KAŻDEJ podstronie (mapa przekierowań), a statyczny import
// wciągał ~46 kB gzip supabase-js do bundla wejściowego, opóźniając LCP.
import {
  SEO_REDIRECTS,
  type SeoRedirectEntry,
} from "@/lib/seo/redirectsMap";

export interface MergedRedirect extends SeoRedirectEntry {
  /** Skąd pochodzi wpis. */
  origin: "code" | "db" | "db-override";
  /** ID rekordu w DB (jeśli z DB). */
  dbId?: string;
}

const QUERY_KEY = ["seo-redirects-runtime"] as const;

async function fetchActiveDbRedirects(): Promise<
  Array<{ id: string; from_path: string; to_path: string; reason: string | null }>
> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("seo_redirects")
    .select("id, from_path, to_path, reason")
    .eq("is_active", true);
  if (error) throw error;
  return data ?? [];
}

/**
 * Czyste mergowanie — testowalne w izolacji.
 * Eksportowane, żeby `App.tsx` mógł użyć w czasie pierwszego renderu z pustym DB.
 */
export function mergeRedirects(
  codeEntries: readonly SeoRedirectEntry[],
  dbEntries: ReadonlyArray<{ id: string; from_path: string; to_path: string; reason: string | null }>,
): MergedRedirect[] {
  const dbByFrom = new Map(dbEntries.map((d) => [d.from_path, d]));
  const seen = new Set<string>();
  const out: MergedRedirect[] = [];

  // 1. DB najpierw — pełna kontrola adminów.
  for (const d of dbEntries) {
    seen.add(d.from_path);
    const codeMatch = codeEntries.find((c) => c.from === d.from_path);
    out.push({
      from: d.from_path,
      to: d.to_path,
      reason: d.reason ?? undefined,
      origin: codeMatch ? "db-override" : "db",
      dbId: d.id,
    });
  }

  // 2. Kod — wpisy nieobjęte przez DB.
  for (const c of codeEntries) {
    if (seen.has(c.from)) continue;
    out.push({ ...c, origin: "code" });
  }

  // Sanity: drop ewentualne kolizje from (Map gwarantuje unikalność DB,
  // a kod jest filtrowany przez `seen`). Wystarczy posortować dla deterministycznego renderu.
  return out.sort((a, b) => a.from.localeCompare(b.from));
}

export function useMergedRedirects() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const dbEntries = await fetchActiveDbRedirects();
      return mergeRedirects(SEO_REDIRECTS, dbEntries);
    },
    // Gdy network jeszcze nie zwrócił, zwracamy hardcoded mapę — `<Route>` działa od razu.
    placeholderData: () =>
      mergeRedirects(SEO_REDIRECTS, []),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
