import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    return bucketRows(rows, days).map((b) => ({
      label: b.label,
      p75: percentile(b.values, 75),
      p50: percentile(b.values, 50),
      count: b.values.length,
    }));
  }, [rows, days]);

  const t = CWV_THRESHOLDS.FONTS_READY;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>FONTS_READY — trend</CardTitle>
        <CardDescription>
          Czas do `document.fonts.ready` (p75 / mediana) — {days <= 1 ? "co godzinę" : "dziennie"}. Cel: p75 ≤ {t.good} ms.
        </CardDescription>
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number | null, name) =>
                    value === null ? ["—", name] : [`${Math.round(value)} ms`, name]
                  }
                />
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
