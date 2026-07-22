import { useMemo, useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Rocket, X, RefreshCw } from "lucide-react";
import { CWV_THRESHOLDS, percentile, fetchVitalsRange, type WebVitalRow } from "@/lib/webVitalsAnalytics";

const DEPLOY_STORAGE_KEY = "fontsReady.deployAt";
const RANGE_STORAGE_KEY = "fontsReady.range";
const SAVED_RANGES_KEY = "fontsReady.savedRanges";

type SavedRange = { id: string; name: string; from: string; to: string };

function loadSavedRanges(): SavedRange[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_RANGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r) => r && r.id && r.name && r.from && r.to) : [];
  } catch {
    return [];
  }
}

type Preset = "1" | "7" | "28" | "custom";

interface Props {
  rows?: WebVitalRow[];
  days?: number;
}

type Bucket = { key: string; label: string; values: number[] };

function bucketRows(rows: WebVitalRow[], hourly: boolean): Bucket[] {
  const filtered = rows.filter((r) => r.metric === "FONTS_READY");
  const map = new Map<string, Bucket>();
  for (const r of filtered) {
    const d = new Date(r.created_at);
    let key: string;
    let label: string;
    if (hourly) {
      d.setMinutes(0, 0, 0);
      key = d.toISOString();
      label = `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:00`;
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

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FontsReadyTrendChart({ rows: parentRows, days: parentDays = 7 }: Props) {
  // --- Range state (24h / 7 / 28 / custom) with localStorage persistence ---
  const [preset, setPreset] = useState<Preset>(() => {
    if (typeof window === "undefined") return String(parentDays) as Preset;
    const saved = window.localStorage.getItem(RANGE_STORAGE_KEY);
    if (saved === "1" || saved === "7" || saved === "28" || saved === "custom") return saved;
    return String(parentDays) as Preset;
  });
  const [customFrom, setCustomFrom] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(`${RANGE_STORAGE_KEY}.from`) ?? toLocalInputValue(new Date(Date.now() - 7 * 86400000));
  });
  const [customTo, setCustomTo] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(`${RANGE_STORAGE_KEY}.to`) ?? toLocalInputValue(new Date());
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RANGE_STORAGE_KEY, preset);
  }, [preset]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${RANGE_STORAGE_KEY}.from`, customFrom);
    window.localStorage.setItem(`${RANGE_STORAGE_KEY}.to`, customTo);
  }, [customFrom, customTo]);

  // --- Saved custom ranges (user-defined, separate from presets) ---
  const [savedRanges, setSavedRanges] = useState<SavedRange[]>(() => loadSavedRanges());
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SAVED_RANGES_KEY, JSON.stringify(savedRanges));
  }, [savedRanges]);

  const handleSaveRange = useCallback(() => {
    const name = saveName.trim();
    if (!name || !customFrom || !customTo) return;
    setSavedRanges((prev) => {
      const filtered = prev.filter((r) => r.name.toLowerCase() !== name.toLowerCase());
      return [
        ...filtered,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, from: customFrom, to: customTo },
      ];
    });
    setSaveName("");
  }, [saveName, customFrom, customTo]);

  const handleApplySavedRange = useCallback((r: SavedRange) => {
    setPreset("custom");
    setCustomFrom(r.from);
    setCustomTo(r.to);
  }, []);

  const handleDeleteSavedRange = useCallback((id: string) => {
    setSavedRanges((prev) => prev.filter((r) => r.id !== id));
  }, []);


  // Resolve current range window into [since, until] + hourly flag.
  const rangeWindow = useMemo(() => {
    const now = new Date();
    if (preset === "custom") {
      const from = customFrom ? new Date(customFrom) : null;
      const to = customTo ? new Date(customTo) : null;
      if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
        return null;
      }
      const spanMs = to.getTime() - from.getTime();
      return { since: from, until: to, hourly: spanMs <= 48 * 3600 * 1000, days: spanMs / 86400000 };
    }
    const days = Number(preset);
    const since = new Date(now.getTime() - days * 86400000);
    return { since, until: now, hourly: days <= 1, days };
  }, [preset, customFrom, customTo]);

  // Reuse parent rows only when the preset matches parent's global range and rows are provided.
  const canReuseParent =
    !!parentRows && preset !== "custom" && Number(preset) === parentDays;

  // --- Auto-refresh (0 = off, else ms) ---
  const AUTO_REFRESH_KEY = "fontsReady.autoRefreshMs";
  const [autoRefreshMs, setAutoRefreshMs] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const raw = Number(window.localStorage.getItem(AUTO_REFRESH_KEY));
    return [0, 30_000, 60_000, 300_000].includes(raw) ? raw : 0;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTO_REFRESH_KEY, String(autoRefreshMs));
  }, [autoRefreshMs]);

  const { data: fetchedRows, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: [
      "fonts-ready-range",
      preset,
      rangeWindow?.since.toISOString(),
      rangeWindow?.until.toISOString(),
    ],
    queryFn: () =>
      fetchVitalsRange(rangeWindow!.since.toISOString(), rangeWindow!.until.toISOString(), "FONTS_READY"),
    enabled: !canReuseParent && !!rangeWindow,
    staleTime: 60_000,
    refetchInterval: !canReuseParent && autoRefreshMs > 0 ? autoRefreshMs : false,
    refetchIntervalInBackground: false,
  });

  // Previous period window (same length, immediately before `since`).
  const prevWindow = useMemo(() => {
    if (!rangeWindow) return null;
    const spanMs = rangeWindow.until.getTime() - rangeWindow.since.getTime();
    return {
      since: new Date(rangeWindow.since.getTime() - spanMs),
      until: new Date(rangeWindow.since.getTime()),
    };
  }, [rangeWindow]);

  const [comparePrev, setComparePrev] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("fontsReady.comparePrev") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("fontsReady.comparePrev", comparePrev ? "1" : "0");
  }, [comparePrev]);

  const { data: prevRows, isFetching: isFetchingPrev } = useQuery({
    queryKey: [
      "fonts-ready-range-prev",
      prevWindow?.since.toISOString(),
      prevWindow?.until.toISOString(),
    ],
    queryFn: () =>
      fetchVitalsRange(prevWindow!.since.toISOString(), prevWindow!.until.toISOString(), "FONTS_READY"),
    enabled: comparePrev && !!prevWindow,
    staleTime: 60_000,
    refetchInterval: comparePrev && autoRefreshMs > 0 ? autoRefreshMs : false,
    refetchIntervalInBackground: false,
  });


  const rows: WebVitalRow[] = canReuseParent ? (parentRows ?? []) : (fetchedRows ?? []);
  const hourly = rangeWindow?.hourly ?? false;
  const rangeLabel =
    preset === "custom"
      ? rangeWindow
        ? `${rangeWindow.since.toLocaleString("pl-PL")} – ${rangeWindow.until.toLocaleString("pl-PL")}`
        : "wybierz poprawny zakres"
      : preset === "1"
        ? "ostatnie 24h"
        : `ostatnie ${preset} dni`;


  // Series visibility toggles (persisted).
  type SeriesKey = "p90" | "p75" | "p50" | "min" | "max" | "prev_p75";
  const SERIES_STORAGE_KEY = "fontsReady.visibleSeries";
  const DEFAULT_VISIBLE: Record<SeriesKey, boolean> = { p90: true, p75: true, p50: true, min: false, max: false, prev_p75: true };
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>(() => {
    if (typeof window === "undefined") return DEFAULT_VISIBLE;
    try {
      const raw = window.localStorage.getItem(SERIES_STORAGE_KEY);
      if (!raw) return DEFAULT_VISIBLE;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_VISIBLE, ...parsed };
    } catch {
      return DEFAULT_VISIBLE;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(visible));
  }, [visible]);
  const toggleSeries = (k: SeriesKey) => setVisible((v) => ({ ...v, [k]: !v[k] }));

  const SERIES_META: Array<{ key: SeriesKey; label: string; color: string }> = [
    { key: "max", label: "max", color: "hsl(0 60% 60%)" },
    { key: "p90", label: "p90", color: "hsl(30 90% 55%)" },
    { key: "p75", label: "p75", color: "hsl(var(--primary))" },
    { key: "p50", label: "mediana", color: "hsl(var(--muted-foreground))" },
    { key: "min", label: "min", color: "hsl(142 50% 55%)" },
  ];

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
    const buckets = bucketRows(rows, hourly).map((b) => {
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
        prev_p75: null as number | null,
        prev_p50: null as number | null,
        prev_count: 0,
      };
    });
    if (comparePrev && prevRows && prevRows.length > 0) {
      const prevBuckets = bucketRows(prevRows, hourly);
      // Align by index (same-length window → same bucket count expected).
      for (let i = 0; i < buckets.length && i < prevBuckets.length; i++) {
        const pb = prevBuckets[i];
        buckets[i].prev_p75 = percentile(pb.values, 75);
        buckets[i].prev_p50 = percentile(pb.values, 50);
        buckets[i].prev_count = pb.values.length;
      }
    }
    return buckets;
  }, [rows, hourly, comparePrev, prevRows]);

  // Aggregate p75 delta vs. previous period (same-length window).
  const prevDelta = useMemo(() => {
    if (!comparePrev || !prevRows) return null;
    const curr: number[] = [];
    const prev: number[] = [];
    for (const r of rows) if (r.metric === "FONTS_READY") curr.push(Number(r.value));
    for (const r of prevRows) if (r.metric === "FONTS_READY") prev.push(Number(r.value));
    if (curr.length === 0 || prev.length === 0) {
      return { currP75: curr.length ? percentile(curr, 75) : null, prevP75: prev.length ? percentile(prev, 75) : null, currCount: curr.length, prevCount: prev.length, delta: null as number | null };
    }
    const currP75 = percentile(curr, 75);
    const prevP75 = percentile(prev, 75);
    return { currP75, prevP75, currCount: curr.length, prevCount: prev.length, delta: currP75 - prevP75 };
  }, [comparePrev, prevRows, rows]);


  const t = CWV_THRESHOLDS.FONTS_READY;

  const deployDate = useMemo(() => (deployAt ? new Date(deployAt) : null), [deployAt]);
  const deployBucketLabel = useMemo(() => {
    if (!deployDate || Number.isNaN(deployDate.getTime()) || data.length === 0) return null;
    const key = bucketKeyForDate(deployDate, hourly);
    // exact match, otherwise first bucket >= key
    const exact = data.find((d) => d.key === key);
    if (exact) return exact.label;
    const after = data.find((d) => d.key >= key);
    return after?.label ?? null;
  }, [deployDate, data, hourly]);

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
          {comparePrev && (
            <>
              <span className="text-muted-foreground border-t pt-1 mt-1 col-span-2">poprzedni okres · n={d.prev_count}</span>
              <span className="text-muted-foreground">p75 prev</span><span>{fmt(d.prev_p75)}</span>
              <span className="text-muted-foreground">mediana prev</span><span>{fmt(d.prev_p50)}</span>
              {d.p75 !== null && d.prev_p75 !== null && (
                <>
                  <span className="text-muted-foreground">Δ p75</span>
                  <span className={d.p75 - d.prev_p75 < 0 ? "text-emerald-600 dark:text-emerald-400" : d.p75 - d.prev_p75 > 0 ? "text-red-600 dark:text-red-400" : ""}>
                    {d.p75 - d.prev_p75 > 0 ? "+" : ""}{Math.round(d.p75 - d.prev_p75)} ms
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const handleExportCsv = useCallback(() => {
    const header = ["bucket", "count", "min_ms", "p50_ms", "p75_ms", "p90_ms", "max_ms"];
    if (comparePrev) header.push("prev_count", "prev_p50_ms", "prev_p75_ms");
    const escape = (v: string | number | null) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const d of data) {
      const row: Array<string | number> = [
        d.label,
        d.count,
        d.min !== null ? Math.round(d.min) : "",
        d.p50 !== null ? Math.round(d.p50) : "",
        d.p75 !== null ? Math.round(d.p75) : "",
        d.p90 !== null ? Math.round(d.p90) : "",
        d.max !== null ? Math.round(d.max) : "",
      ];
      if (comparePrev) {
        row.push(
          d.prev_count,
          d.prev_p50 !== null ? Math.round(d.prev_p50) : "",
          d.prev_p75 !== null ? Math.round(d.prev_p75) : "",
        );
      }
      lines.push(row.map(escape).join(","));
    }
    const csv = "\ufeff" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    const rangeSlug = preset === "custom" ? "custom" : `${preset}d`;
    a.download = `fonts-ready-trend_${rangeSlug}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, preset, comparePrev]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>FONTS_READY — trend</CardTitle>
            <CardDescription>
              Czas do `document.fonts.ready` (p90 / p75 / mediana, min–max w tooltipie) — {hourly ? "co godzinę" : "dziennie"} · {rangeLabel}. Cel: p75 ≤ {t.good} ms.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              <Label htmlFor="fonts-ready-auto-refresh" className="sr-only">
                Automatyczne odświeżanie
              </Label>
              <select
                id="fonts-ready-auto-refresh"
                value={autoRefreshMs}
                onChange={(e) => setAutoRefreshMs(Number(e.target.value))}
                disabled={canReuseParent}
                aria-label="Interwał automatycznego odświeżania trendu FONTS_READY"
                title={
                  canReuseParent
                    ? "Auto-odświeżanie niedostępne dla presetów współdzielonych z rodzicem"
                    : "Automatyczne odświeżanie danych trendu"
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground disabled:opacity-50"
              >
                <option value={0}>Auto: wył.</option>
                <option value={30_000}>Auto: 30s</option>
                <option value={60_000}>Auto: 1 min</option>
                <option value={300_000}>Auto: 5 min</option>
              </select>
              {autoRefreshMs > 0 && !canReuseParent && (
                <span
                  className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                  aria-hidden="true"
                  title="Auto-odświeżanie aktywne"
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching || canReuseParent}
              aria-label={
                dataUpdatedAt
                  ? `Odśwież dane FONTS_READY. Ostatnia aktualizacja: ${new Date(dataUpdatedAt).toLocaleTimeString("pl-PL")}`
                  : "Odśwież dane FONTS_READY"
              }
              title={
                dataUpdatedAt
                  ? `Ostatnia aktualizacja: ${new Date(dataUpdatedAt).toLocaleTimeString("pl-PL")}`
                  : undefined
              }
              className="h-9 w-9"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={data.length === 0}
              aria-label="Eksportuj dane FONTS_READY do CSV"
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Eksportuj CSV
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Tabs value={preset} onValueChange={(v) => setPreset(v as Preset)}>
            <TabsList>
              <TabsTrigger value="1">24h</TabsTrigger>
              <TabsTrigger value="7">7 dni</TabsTrigger>
              <TabsTrigger value="28">28 dni</TabsTrigger>
              <TabsTrigger value="custom">Niestandardowy</TabsTrigger>
            </TabsList>
          </Tabs>
          {preset === "custom" && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="fonts-ready-from" className="text-xs text-muted-foreground">Od</Label>
                <Input
                  id="fonts-ready-from"
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-9 w-[220px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="fonts-ready-to" className="text-xs text-muted-foreground">Do</Label>
                <Input
                  id="fonts-ready-to"
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-9 w-[220px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="fonts-ready-save-name" className="text-xs text-muted-foreground">
                  Zapisz jako
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="fonts-ready-save-name"
                    type="text"
                    placeholder="np. Moje 10 dni"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveRange();
                      }
                    }}
                    className="h-9 w-[200px]"
                    maxLength={40}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveRange}
                    disabled={!saveName.trim() || !customFrom || !customTo}
                  >
                    Zapisz zakres
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        {savedRanges.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Moje zakresy:</span>
            {savedRanges.map((r) => {
              const active =
                preset === "custom" && customFrom === r.from && customTo === r.to;
              return (
                <div
                  key={r.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-foreground hover:bg-muted"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleApplySavedRange(r)}
                    className="font-medium"
                    aria-pressed={active}
                    aria-label={`Zastosuj zakres ${r.name}`}
                  >
                    {r.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedRange(r.id)}
                    aria-label={`Usuń zapisany zakres ${r.name}`}
                    className="ml-1 opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            variant={comparePrev ? "default" : "outline"}
            size="sm"
            onClick={() => setComparePrev((v) => !v)}
            aria-pressed={comparePrev}
            className="h-8"
          >
            {comparePrev ? "✓ " : ""}Porównaj z poprzednim okresem
          </Button>
          {comparePrev && prevWindow && (
            <span className="text-xs text-muted-foreground tabular-nums">
              poprzedni: {prevWindow.since.toLocaleString("pl-PL")} – {prevWindow.until.toLocaleString("pl-PL")}
              {isFetchingPrev ? " · ładowanie…" : ""}
            </span>
          )}
          {comparePrev && prevDelta && (
            <div className="flex flex-wrap gap-2 text-xs tabular-nums">
              <span className="rounded-md border px-2 py-1">
                <span className="text-muted-foreground">poprz. · </span>
                {prevDelta.prevP75 != null ? `p75 ${Math.round(prevDelta.prevP75)} ms · n=${prevDelta.prevCount}` : "brak danych"}
              </span>
              <span className="rounded-md border px-2 py-1">
                <span className="text-muted-foreground">bież. · </span>
                {prevDelta.currP75 != null ? `p75 ${Math.round(prevDelta.currP75)} ms · n=${prevDelta.currCount}` : "brak danych"}
              </span>
              {prevDelta.delta != null && (
                <span
                  className={`rounded-md border px-2 py-1 ${prevDelta.delta < 0 ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : prevDelta.delta > 0 ? "border-red-500/40 text-red-600 dark:text-red-400" : ""}`}
                >
                  Δ p75 vs poprz.: {prevDelta.delta > 0 ? "+" : ""}{Math.round(prevDelta.delta)} ms
                </span>
              )}
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
                {visible.max && (
                  <Line type="monotone" dataKey="max" name="max" stroke="hsl(0 60% 60%)" strokeWidth={1} strokeDasharray="2 4" dot={false} connectNulls isAnimationActive={false} />
                )}
                {visible.p90 && (
                  <Line type="monotone" dataKey="p90" name="p90" stroke="hsl(30 90% 55%)" strokeWidth={1.75} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
                )}
                {visible.p75 && (
                  <Line type="monotone" dataKey="p75" name="p75" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
                )}
                {visible.p50 && (
                  <Line type="monotone" dataKey="p50" name="mediana" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />
                )}
                {visible.min && (
                  <Line type="monotone" dataKey="min" name="min" stroke="hsl(142 50% 55%)" strokeWidth={1} strokeDasharray="2 4" dot={false} connectNulls isAnimationActive={false} />
                )}
                {comparePrev && visible.prev_p75 && (
                  <Line type="monotone" dataKey="prev_p75" name="p75 (poprz. okres)" stroke="hsl(280 70% 60%)" strokeWidth={1.75} strokeDasharray="5 3" dot={{ r: 2 }} connectNulls isAnimationActive={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Widoczność serii na wykresie">
              {SERIES_META.map((s) => {
                const on = visible[s.key];
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleSeries(s.key)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-opacity ${on ? "" : "opacity-40"}`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-3 rounded-sm"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                  </button>
                );
              })}
              {comparePrev && (
                <button
                  type="button"
                  onClick={() => toggleSeries("prev_p75")}
                  aria-pressed={visible.prev_p75}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-opacity ${visible.prev_p75 ? "" : "opacity-40"}`}
                >
                  <span aria-hidden="true" className="inline-block h-2.5 w-3 rounded-sm" style={{ backgroundColor: "hsl(280 70% 60%)" }} />
                  p75 (poprz. okres)
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
