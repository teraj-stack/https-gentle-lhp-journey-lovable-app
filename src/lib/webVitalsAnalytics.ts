import { supabase } from "@/integrations/supabase/client";

export type MetricName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB" | "FONTS_READY";

export interface WebVitalRow {
  id: string;
  metric: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  path: string;
  navigation_type: string | null;
  connection: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface MetricSummary {
  metric: MetricName;
  p75: number | null;
  count: number;
  good: number;
  needsImprovement: number;
  poor: number;
  unit: "ms" | "score";
}

// Google Core Web Vitals thresholds (+ custom FONTS_READY)
export const CWV_THRESHOLDS: Record<MetricName, { good: number; poor: number; unit: "ms" | "score" }> = {
  LCP: { good: 2500, poor: 4000, unit: "ms" },
  INP: { good: 200, poor: 500, unit: "ms" },
  CLS: { good: 0.1, poor: 0.25, unit: "score" },
  FCP: { good: 1800, poor: 3000, unit: "ms" },
  TTFB: { good: 800, poor: 1800, unit: "ms" },
  FONTS_READY: { good: 1500, poor: 3000, unit: "ms" },
};


export function rateValue(metric: MetricName, value: number): "good" | "needs-improvement" | "poor" {
  const t = CWV_THRESHOLDS[metric];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function formatMetricValue(metric: MetricName, value: number | null): string {
  if (value === null) return "—";
  const unit = CWV_THRESHOLDS[metric].unit;
  if (unit === "score") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

export async function fetchRecentVitals(days: number, pathFilter?: string): Promise<WebVitalRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let q = supabase
    .from("web_vitals")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (pathFilter) q = q.eq("path", pathFilter);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WebVitalRow[];
}

export async function fetchVitalsRange(sinceISO: string, untilISO: string, metric?: MetricName): Promise<WebVitalRow[]> {
  let q = supabase
    .from("web_vitals")
    .select("*")
    .gte("created_at", sinceISO)
    .lte("created_at", untilISO)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (metric) q = q.eq("metric", metric);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WebVitalRow[];
}

/**
 * Public aggregate summary via SECURITY DEFINER RPC.
 * Safe to call anonymously; returns only aggregated counts and p75 (no raw rows, no user agents).
 */
export async function fetchPublicVitalsSummary(days: number): Promise<MetricSummary[]> {
  const { data: payload, error } = await supabase.functions.invoke<{ data?: unknown[] }>(
    `public-web-vitals-summary?days=${encodeURIComponent(String(days))}`,
    { method: "GET" },
  );
  if (error) throw error;
  const data = payload?.data ?? [];
  const byMetric = new Map<string, { p75: number | null; count: number; good: number; ni: number; poor: number }>();
  for (const row of (data ?? []) as Array<{ metric: string; p75: number | null; count: number | string; good: number | string; needs_improvement: number | string; poor: number | string }>) {
    byMetric.set(row.metric, {
      p75: row.p75 === null ? null : Number(row.p75),
      count: Number(row.count),
      good: Number(row.good),
      ni: Number(row.needs_improvement),
      poor: Number(row.poor),
    });
  }
  return (["LCP", "INP", "CLS", "FCP", "TTFB", "FONTS_READY"] as MetricName[]).map((metric) => {
    const r = byMetric.get(metric);
    return {
      metric,
      p75: r?.p75 ?? null,
      count: r?.count ?? 0,
      good: r?.good ?? 0,
      needsImprovement: r?.ni ?? 0,
      poor: r?.poor ?? 0,
      unit: CWV_THRESHOLDS[metric].unit,
    };
  });
}

export function summarize(rows: WebVitalRow[]): MetricSummary[] {
  const groups: Record<MetricName, WebVitalRow[]> = {
    LCP: [], INP: [], CLS: [], FCP: [], TTFB: [], FONTS_READY: [],
  };

  for (const r of rows) {
    if (groups[r.metric]) groups[r.metric].push(r);
  }
  return (Object.keys(groups) as MetricName[]).map((metric) => {
    const values = groups[metric].map((r) => Number(r.value));
    const p75 = percentile(values, 75);
    return {
      metric,
      p75,
      count: values.length,
      good: groups[metric].filter((r) => r.rating === "good").length,
      needsImprovement: groups[metric].filter((r) => r.rating === "needs-improvement").length,
      poor: groups[metric].filter((r) => r.rating === "poor").length,
      unit: CWV_THRESHOLDS[metric].unit,
    };
  });
}

export function summarizeByPath(rows: WebVitalRow[]): Map<string, MetricSummary[]> {
  const byPath = new Map<string, WebVitalRow[]>();
  for (const r of rows) {
    const arr = byPath.get(r.path) ?? [];
    arr.push(r);
    byPath.set(r.path, arr);
  }
  const result = new Map<string, MetricSummary[]>();
  for (const [path, arr] of byPath) result.set(path, summarize(arr));
  return result;
}
