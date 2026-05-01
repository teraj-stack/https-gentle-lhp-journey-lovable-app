/**
 * SeoRedirectAnalytics — sekcja w /admin/seo-redirects pokazująca, które stare
 * URL-e / literówki realnie generują ruch (ostatnie 30 dni).
 *
 * Źródło: tabela `seo_redirect_hits`, dedupowana po (session_id, kind, from_path)
 * przez `redirectLog.ts` przy zapisie. Tutaj pokazujemy:
 *   - TOP 20 ścieżek per typ (redirect / suggested / not_found)
 *   - Sumę hitów + unikalne sesje per ścieżka
 *   - Quick action „Dodaj jako redirect" — prefilluje formularz powyżej.
 *
 * Cel praktyczny: literówki z `not_found` z >3 sesjami = kandydaci do dopisania
 * jako alias w mapie SEO (zatrzymane porzucenie ruchu).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, ExternalLink, Plus, RefreshCw, TrendingUp } from "lucide-react";

interface HitRow {
  kind: "redirect" | "not_found" | "suggested";
  from_path: string;
  to_path: string | null;
  session_id: string | null;
  created_at: string;
}

interface AggregatedRow {
  from_path: string;
  /** Najczęstszy `to_path` (dla redirect/suggested). */
  top_to: string | null;
  hits: number;
  sessions: number;
  last_at: string;
}

interface Props {
  onUseAsRedirect?: (from: string, to: string) => void;
}

const SeoRedirectAnalytics = ({ onUseAsRedirect }: Props) => {
  const [activeTab, setActiveTab] = useState<"not_found" | "redirect" | "suggested">("not_found");

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["seo-redirect-hits"],
    queryFn: async (): Promise<HitRow[]> => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("seo_redirect_hits")
        .select("kind, from_path, to_path, session_id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as HitRow[];
    },
    staleTime: 60_000,
  });

  // Agregacja po `from_path` w ramach aktywnej zakładki.
  const aggregated = useMemo<AggregatedRow[]>(() => {
    const buckets = new Map<string, {
      hits: number;
      sessions: Set<string>;
      to_counts: Map<string, number>;
      last: string;
    }>();
    for (const r of rows) {
      if (r.kind !== activeTab) continue;
      const b = buckets.get(r.from_path) ?? {
        hits: 0,
        sessions: new Set<string>(),
        to_counts: new Map<string, number>(),
        last: r.created_at,
      };
      b.hits += 1;
      if (r.session_id) b.sessions.add(r.session_id);
      if (r.to_path) {
        b.to_counts.set(r.to_path, (b.to_counts.get(r.to_path) ?? 0) + 1);
      }
      if (r.created_at > b.last) b.last = r.created_at;
      buckets.set(r.from_path, b);
    }

    return Array.from(buckets.entries())
      .map(([from_path, b]) => {
        let top_to: string | null = null;
        let max = 0;
        for (const [to, count] of b.to_counts) {
          if (count > max) {
            max = count;
            top_to = to;
          }
        }
        return {
          from_path,
          top_to,
          hits: b.hits,
          sessions: b.sessions.size,
          last_at: b.last,
        };
      })
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 20);
  }, [rows, activeTab]);

  const totalsByKind = useMemo(() => {
    const t = { redirect: 0, not_found: 0, suggested: 0 };
    for (const r of rows) t[r.kind] += 1;
    return t;
  }, [rows]);

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return `${minutes} min temu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h temu`;
    const days = Math.floor(hours / 24);
    return `${days} dni temu`;
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Analityka trafień (ostatnie 30 dni)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Które stare URL-e i literówki naprawdę generują ruch. Dane dedupowane
            per sesja przeglądarki (sessionStorage).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Odśwież
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="not_found">
            404 / literówki <span className="ml-1 text-xs opacity-70">({totalsByKind.not_found})</span>
          </TabsTrigger>
          <TabsTrigger value="redirect">
            Aliasy SEO <span className="ml-1 text-xs opacity-70">({totalsByKind.redirect})</span>
          </TabsTrigger>
          <TabsTrigger value="suggested">
            Auto-fuzzy <span className="ml-1 text-xs opacity-70">({totalsByKind.suggested})</span>
          </TabsTrigger>
        </TabsList>

        {(["not_found", "redirect", "suggested"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Ładuję dane…</p>
            ) : aggregated.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Brak hitów w tej kategorii.
              </p>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ścieżka</TableHead>
                      {tab !== "not_found" && <TableHead className="hidden md:table-cell">Cel</TableHead>}
                      <TableHead className="text-right">Hity</TableHead>
                      <TableHead className="text-right">Sesje</TableHead>
                      <TableHead className="hidden sm:table-cell">Ostatnio</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregated.map((row) => (
                      <TableRow key={row.from_path}>
                        <TableCell className="font-mono text-xs break-all">
                          {row.from_path}
                        </TableCell>
                        {tab !== "not_found" && (
                          <TableCell className="hidden md:table-cell font-mono text-xs break-all text-muted-foreground">
                            {row.top_to ?? "—"}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-semibold">{row.hits}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.sessions}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {formatRelative(row.last_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(row.from_path, "_blank", "noopener")}
                              title="Otwórz w nowej karcie"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            {tab === "not_found" && onUseAsRedirect && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUseAsRedirect(row.from_path, "")}
                                title="Dodaj jako redirect"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Map
                              </Button>
                            )}
                            {tab === "suggested" && row.top_to && onUseAsRedirect && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUseAsRedirect(row.from_path, row.top_to!)}
                                title="Utwardź jako stały redirect"
                              >
                                <ArrowRight className="w-3.5 h-3.5 mr-1" /> Utwardź
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};

export default SeoRedirectAnalytics;
