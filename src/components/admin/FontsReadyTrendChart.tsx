import { useMemo, useCallback } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { CWV_THRESHOLDS, percentile, type WebVitalRow } from "@/lib/webVitalsAnalytics";

interface Props {
  rows: WebVitalRow[];
  days: number;
}

type Bucket = { key: string; label: string; values: number[] };

function bucketRows(rows: WebVitalRow[], days: number): Bucket[] {
  const hourly = days <= 1;
  const filtered = rows.filter((r) => r.metric === "FONTS_READY");
  const map = new Map<string, Bucket>();
  for (const r of filtered) {
    const d = new Date(r.created_at);
    let key: string;
    let label: string;
    if (hourly) {
      d.setMinutes(0, 0, 0);
      key = d.toISOString();
      label = `${d.getHours().toString().padStart(2, "0")}:00`;
    } else {
      d.setHours(0, 0, 0, 0);
      key = d.toISOString().slice(0, 10);
      label = `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    }
    const b = map.get(key) ?? { key, label, values: [] };
    b.values.push(Number(r.value));
    map.set(key, b);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export default function FontsReadyTrendChart({ rows, days }: Props) {
  const data = useMemo(() => {
    return bucketRows(rows, days).map((b) => {
      const sorted = [...b.values].sort((a, z) => a - z);
      return {
        label: b.label,
        p90: percentile(b.values, 90),
        p75: percentile(b.values, 75),
        p50: percentile(b.values, 50),
        min: sorted.length ? sorted[0] : null,
        max: sorted.length ? sorted[sorted.length - 1] : null,
        count: b.values.length,
      };
    });
  }, [rows, days]);

  const t = CWV_THRESHOLDS.FONTS_READY;

  type Row = (typeof data)[number];
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ payload: Row }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const fmt = (v: number | null) => (v === null ? "—" : `${Math.round(v)} ms`);
    const rating =
      d.p75 === null ? "—" : d.p75 <= t.good ? "dobry" : d.p75 <= t.poor ? "do poprawy" : "słaby";
    return (
      <div
        className="rounded-md border bg-card text-foreground text-xs p-3 shadow-md"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div className="font-medium mb-2">{label} · n={d.count}</div>
        <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 tabular-nums">
          <span className="text-muted-foreground">p90</span><span>{fmt(d.p90)}</span>
          <span className="text-muted-foreground">p75</span><span>{fmt(d.p75)}</span>
          <span className="text-muted-foreground">mediana</span><span>{fmt(d.p50)}</span>
          <span className="text-muted-foreground">min</span><span>{fmt(d.min)}</span>
          <span className="text-muted-foreground">max</span><span>{fmt(d.max)}</span>
          <span className="text-muted-foreground">ocena (p75)</span><span>{rating}</span>
        </div>
      </div>
    );
  };

  return (
  const handleExportCsv = useCallback(() => {
    const header = ["bucket", "count", "min_ms", "p50_ms", "p75_ms", "p90_ms", "max_ms"];
    const escape = (v: string | number | null) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const d of data) {
      lines.push([
        d.label,
        d.count,
        d.min !== null ? Math.round(d.min) : "",
        d.p50 !== null ? Math.round(d.p50) : "",
        d.p75 !== null ? Math.round(d.p75) : "",
        d.p90 !== null ? Math.round(d.p90) : "",
        d.max !== null ? Math.round(d.max) : "",
      ].map(escape).join(","));
    }
    const csv = "\ufeff" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `fonts-ready-trend_${days}d_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, days]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>FONTS_READY — trend</CardTitle>
            <CardDescription>
              Czas do `document.fonts.ready` (p90 / p75 / mediana, min–max w tooltipie) — {days <= 1 ? "co godzinę" : "dziennie"}. Cel: p75 ≤ {t.good} ms.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={data.length === 0}
            className="shrink-0"
            aria-label="Eksportuj dane FONTS_READY do CSV"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Eksportuj CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak danych FONTS_READY w tym okresie.</p>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickFormatter={(v) => `${v} ms`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  y={t.good}
                  stroke="hsl(142 70% 45%)"
                  strokeDasharray="4 4"
                  label={{ value: `good ≤ ${t.good}`, fill: "hsl(142 70% 45%)", fontSize: 10, position: "insideTopRight" }}
                />
                <ReferenceLine
                  y={t.poor}
                  stroke="hsl(0 70% 55%)"
                  strokeDasharray="4 4"
                  label={{ value: `poor > ${t.poor}`, fill: "hsl(0 70% 55%)", fontSize: 10, position: "insideTopRight" }}
                />
                <Line
                  type="monotone"
                  dataKey="max"
                  name="max"
                  stroke="hsl(0 60% 60%)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="p90"
                  name="p90"
                  stroke="hsl(30 90% 55%)"
                  strokeWidth={1.75}
                  dot={{ r: 2 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="p75"
                  name="p75"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="p50"
                  name="mediana"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="min"
                  name="min"
                  stroke="hsl(142 50% 55%)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
