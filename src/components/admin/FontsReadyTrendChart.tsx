import { useMemo, useCallback, useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Rocket, X } from "lucide-react";
import { CWV_THRESHOLDS, percentile, type WebVitalRow } from "@/lib/webVitalsAnalytics";

const DEPLOY_STORAGE_KEY = "fontsReady.deployAt";

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

function bucketKeyForDate(d: Date, hourly: boolean): string {
  const c = new Date(d);
  if (hourly) {
    c.setMinutes(0, 0, 0);
    return c.toISOString();
  }
  c.setHours(0, 0, 0, 0);
  return c.toISOString().slice(0, 10);
}

export default function FontsReadyTrendChart({ rows, days }: Props) {
  const [deployAt, setDeployAt] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(DEPLOY_STORAGE_KEY) ?? "";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (deployAt) window.localStorage.setItem(DEPLOY_STORAGE_KEY, deployAt);
    else window.localStorage.removeItem(DEPLOY_STORAGE_KEY);
  }, [deployAt]);

  const data = useMemo(() => {
    return bucketRows(rows, days).map((b) => {
      const sorted = [...b.values].sort((a, z) => a - z);
      return {
        key: b.key,
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

  const deployDate = useMemo(() => (deployAt ? new Date(deployAt) : null), [deployAt]);
  const deployBucketLabel = useMemo(() => {
    if (!deployDate || Number.isNaN(deployDate.getTime()) || data.length === 0) return null;
    const key = bucketKeyForDate(deployDate, days <= 1);
    // exact match, otherwise first bucket >= key
    const exact = data.find((d) => d.key === key);
    if (exact) return exact.label;
    const after = data.find((d) => d.key >= key);
    return after?.label ?? null;
  }, [deployDate, data, days]);

  const comparison = useMemo(() => {
    if (!deployDate || Number.isNaN(deployDate.getTime())) return null;
    const before: number[] = [];
    const after: number[] = [];
    for (const r of rows) {
      if (r.metric !== "FONTS_READY") continue;
      const v = Number(r.value);
      if (!Number.isFinite(v)) continue;
      const ts = new Date(r.created_at).getTime();
      if (ts < deployDate.getTime()) before.push(v);
      else after.push(v);
    }
    const summarize = (arr: number[]) =>
      arr.length === 0
        ? null
        : {
            count: arr.length,
            p75: percentile(arr, 75),
            p50: percentile(arr, 50),
          };
    return { before: summarize(before), after: summarize(after) };
  }, [rows, deployDate]);



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
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="fonts-ready-deploy" className="text-xs text-muted-foreground">
              Data wdrożenia (porównanie przed/po)
            </Label>
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="fonts-ready-deploy"
                type="datetime-local"
                value={deployAt}
                onChange={(e) => setDeployAt(e.target.value)}
                className="h-9 w-[220px]"
              />
              {deployAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeployAt("")}
                  aria-label="Wyczyść datę wdrożenia"
                  className="h-9"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
          {comparison && (comparison.before || comparison.after) && (
            <div className="flex flex-wrap gap-2 text-xs tabular-nums">
              <span className="rounded-md border px-2 py-1">
                <span className="text-muted-foreground">przed · </span>
                {comparison.before
                  ? `p75 ${Math.round(comparison.before.p75 ?? 0)} ms · med ${Math.round(comparison.before.p50 ?? 0)} ms · n=${comparison.before.count}`
                  : "brak danych"}
              </span>
              <span className="rounded-md border px-2 py-1">
                <span className="text-muted-foreground">po · </span>
                {comparison.after
                  ? `p75 ${Math.round(comparison.after.p75 ?? 0)} ms · med ${Math.round(comparison.after.p50 ?? 0)} ms · n=${comparison.after.count}`
                  : "brak danych"}
              </span>
              {comparison.before?.p75 != null && comparison.after?.p75 != null && (() => {
                const delta = (comparison.after.p75 as number) - (comparison.before.p75 as number);
                const better = delta < 0;
                return (
                  <span
                    className={`rounded-md border px-2 py-1 ${better ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : delta > 0 ? "border-red-500/40 text-red-600 dark:text-red-400" : ""}`}
                  >
                    Δ p75: {delta > 0 ? "+" : ""}{Math.round(delta)} ms
                  </span>
                );
              })()}
            </div>
          )}
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
                {deployBucketLabel && data.length > 0 && (
                  <ReferenceArea
                    x1={deployBucketLabel}
                    x2={data[data.length - 1].label}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.06}
                    ifOverflow="extendDomain"
                  />
                )}
                {deployBucketLabel && (
                  <ReferenceLine
                    x={deployBucketLabel}
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    label={{ value: "deploy", fill: "hsl(var(--primary))", fontSize: 10, position: "top" }}
                  />
                )}
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
