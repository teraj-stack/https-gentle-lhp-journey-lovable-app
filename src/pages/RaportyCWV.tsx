import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, Users, Activity } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CWV_THRESHOLDS,
  fetchPublicVitalsSummary,
  formatMetricValue,
  type MetricName,
  type MetricSummary,
} from "@/lib/webVitalsAnalytics";

function RatingBadge({ p75, metric }: { p75: number | null; metric: MetricName }) {
  if (p75 === null) return <Badge variant="outline">Brak danych</Badge>;
  const t = CWV_THRESHOLDS[metric];
  if (p75 <= t.good) return <Badge className="bg-green-600/20 text-green-300 border-green-600/40">Dobry</Badge>;
  if (p75 <= t.poor) return <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-600/40">Do poprawy</Badge>;
  return <Badge className="bg-red-600/20 text-red-300 border-red-600/40">Słaby</Badge>;
}

function MetricCard({ s }: { s: MetricSummary }) {
  const goodPct = s.count > 0 ? Math.round((s.good / s.count) * 100) : 0;
  const t = CWV_THRESHOLDS[s.metric];
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif">{s.metric}</CardTitle>
          <RatingBadge p75={s.p75} metric={s.metric} />
        </div>
        <CardDescription className="text-xs">
          Próg dobry ≤ {t.unit === "score" ? t.good.toFixed(2) : `${t.good} ms`} · słaby &gt; {t.unit === "score" ? t.poor.toFixed(2) : `${t.poor} ms`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-serif tracking-tight text-primary">
          {formatMetricValue(s.metric, s.p75)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">p75 · {s.count} pomiarów</p>
        <div className="mt-3 h-2 rounded-full overflow-hidden bg-muted flex">
          {s.count > 0 && (
            <>
              <div className="bg-green-500" style={{ width: `${(s.good / s.count) * 100}%` }} />
              <div className="bg-yellow-500" style={{ width: `${(s.needsImprovement / s.count) * 100}%` }} />
              <div className="bg-red-500" style={{ width: `${(s.poor / s.count) * 100}%` }} />
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{goodPct}% wizyt w normie</p>
      </CardContent>
    </Card>
  );
}

export default function RaportyCWV() {
  const [days, setDays] = useState<7 | 28>(7);
  const { data: summaries = [], isLoading, error } = useQuery({
    queryKey: ["public-web-vitals-summary", days],
    queryFn: () => fetchPublicVitalsSummary(days),
    staleTime: 5 * 60 * 1000,
  });

  const totalMeasurements = summaries.reduce((s, m) => s + m.count, 0);

  return (
    <>
      <SeoHead
        title="Raport Core Web Vitals · CML"
        description="Aktualne wyniki Core Web Vitals (LCP, INP, CLS) mierzone na podstawie prawdziwych wizyt użytkowników na mcml.pro."
        path="/raporty/cwv"
      />
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Powrót</Link>
        </Button>

        <header className="mb-8">
          <h1 className="font-serif text-4xl md:text-5xl mb-3">Wydajność strony · Core Web Vitals</h1>
          <p className="text-muted-foreground max-w-2xl">
            Metryki mierzone w czasie rzeczywistym z faktycznych wizyt na mcml.pro. Otwarte dane w duchu przejrzystości —
            standard Google dla oceny UX.
          </p>
        </header>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as 7 | 28)}>
            <TabsList>
              <TabsTrigger value="7">Ostatnie 7 dni</TabsTrigger>
              <TabsTrigger value="28">Ostatnie 28 dni</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {isLoading ? "Ładowanie…" : `${totalMeasurements.toLocaleString("pl-PL")} pomiarów`}
          </div>
        </div>

        {error && (
          <Card className="border-destructive/50 mb-6">
            <CardContent className="pt-6 text-sm text-destructive">
              Nie udało się załadować danych: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((s) => <MetricCard key={s.metric} s={s} />)}
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" />Co to jest CWV?</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Core Web Vitals to zestaw metryk Google mierzących szybkość ładowania (LCP), responsywność (INP)
              i stabilność wizualną (CLS) strony podczas rzeczywistego użytkowania.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Jak mierzymy?</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Biblioteka <code>web-vitals</code> zbiera dane w przeglądarce po każdej wizycie i wysyła je anonimowo
              (bez identyfikatorów użytkownika) do naszej bazy.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Wartość p75</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Percentyl 75 to standard Google — 75% wizyt miało wynik nie gorszy niż podana wartość.
              Wynik „Dobry" oznacza spełnienie progu p75 dla wszystkich metryk.
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
