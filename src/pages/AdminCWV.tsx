import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import SeoHead from "@/components/shared/SeoHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ShieldAlert, RefreshCw, Download } from "lucide-react";
import {
  CWV_THRESHOLDS,
  fetchRecentVitals,
  formatMetricValue,
  summarize,
  summarizeByPath,
  type MetricName,
} from "@/lib/webVitalsAnalytics";
import FontsReadyTrendChart from "@/components/admin/FontsReadyTrendChart";

function RatingBadge({ p75, metric }: { p75: number | null; metric: MetricName }) {
  if (p75 === null) return <Badge variant="outline">—</Badge>;
  const t = CWV_THRESHOLDS[metric];
  if (p75 <= t.good) return <Badge className="bg-green-600/20 text-green-300">Dobry</Badge>;
  if (p75 <= t.poor) return <Badge className="bg-yellow-600/20 text-yellow-300">Do poprawy</Badge>;
  return <Badge className="bg-red-600/20 text-red-300">Słaby</Badge>;
}

export default function AdminCWV() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [days, setDays] = useState<1 | 7 | 28>(7);
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authLoading && !session) navigate("/admin/login");
  }, [authLoading, session, navigate]);

  const { data: rows, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-web-vitals", days],
    queryFn: () => fetchRecentVitals(days),
    enabled: !!session && isAdmin === true,
    staleTime: 60_000,
  });

  const summaries = useMemo(() => summarize(rows ?? []), [rows]);
  const byPath = useMemo(() => summarizeByPath(rows ?? []), [rows]);

  const topPaths = useMemo(() => {
    const entries = Array.from(byPath.entries()).map(([path, sums]) => {
      const lcp = sums.find((s) => s.metric === "LCP");
      const inp = sums.find((s) => s.metric === "INP");
      const cls = sums.find((s) => s.metric === "CLS");
      const totalCount = sums.reduce((sum, s) => sum + s.count, 0);
      return { path, totalCount, lcp, inp, cls };
    });
    return entries.sort((a, b) => b.totalCount - a.totalCount).slice(0, 25);
  }, [byPath]);

  const exportCsv = () => {
    if (!rows) return;
    const header = "metric,value,rating,path,created_at,navigation_type,connection\n";
    const body = rows.map((r) =>
      [r.metric, r.value, r.rating, JSON.stringify(r.path), r.created_at, r.navigation_type ?? "", r.connection ?? ""].join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `web-vitals-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || adminLoading) {
    return <main className="container mx-auto px-4 py-12">Ładowanie…</main>;
  }
  if (!isAdmin) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Brak dostępu</AlertTitle>
          <AlertDescription>Ta strona jest dostępna tylko dla administratorów.</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <>
      <SeoHead title="Admin · Core Web Vitals" description="Wewnętrzny panel monitorowania CWV" path="/admin/cwv" />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-2" />Panel admina</Link>
            </Button>
            <h1 className="font-serif text-3xl">Core Web Vitals — RUM</h1>
            <p className="text-sm text-muted-foreground">Pomiary w czasie rzeczywistym z web-vitals.js</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as 1 | 7 | 28)}>
              <TabsList>
                <TabsTrigger value="1">24h</TabsTrigger>
                <TabsTrigger value="7">7 dni</TabsTrigger>
                <TabsTrigger value="28">28 dni</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Odśwież
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows?.length}>
              <Download className="w-4 h-4 mr-2" />CSV
            </Button>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {summaries.map((s) => (
            <Card key={s.metric}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{s.metric}</CardTitle>
                  <RatingBadge p75={s.p75} metric={s.metric} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-serif">{formatMetricValue(s.metric, s.p75)}</div>
                <p className="text-xs text-muted-foreground">p75 · n={s.count}</p>
                <div className="flex gap-1 text-xs mt-2">
                  <span className="text-green-400">✓ {s.good}</span>
                  <span className="text-yellow-400">⚠ {s.needsImprovement}</span>
                  <span className="text-red-400">✕ {s.poor}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <FontsReadyTrendChart rows={rows ?? []} days={days} />

        <Card>
          <CardHeader>
            <CardTitle>Top ścieżki wg liczby pomiarów</CardTitle>
            <CardDescription>Kliknij metrykę „Słaby" żeby zidentyfikować regresję</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Ładowanie…</p>
            ) : topPaths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak danych za wybrany okres.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ścieżka</TableHead>
                    <TableHead className="text-right">Pomiary</TableHead>
                    <TableHead className="text-right">LCP p75</TableHead>
                    <TableHead className="text-right">INP p75</TableHead>
                    <TableHead className="text-right">CLS p75</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPaths.map((p) => (
                    <TableRow key={p.path}>
                      <TableCell className="font-mono text-xs">{p.path}</TableCell>
                      <TableCell className="text-right">{p.totalCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <RatingBadge p75={p.lcp?.p75 ?? null} metric="LCP" />
                          <span className="tabular-nums">{formatMetricValue("LCP", p.lcp?.p75 ?? null)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <RatingBadge p75={p.inp?.p75 ?? null} metric="INP" />
                          <span className="tabular-nums">{formatMetricValue("INP", p.inp?.p75 ?? null)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <RatingBadge p75={p.cls?.p75 ?? null} metric="CLS" />
                          <span className="tabular-nums">{formatMetricValue("CLS", p.cls?.p75 ?? null)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
