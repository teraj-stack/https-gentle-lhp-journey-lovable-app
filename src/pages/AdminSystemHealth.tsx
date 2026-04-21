import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, ShieldAlert, Activity, AlertTriangle, RefreshCw, Ban, Webhook, Repeat, Filter, X, Eye, Download, ArrowDownWideNarrow, ArrowUpWideNarrow, Locate } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SeoHead from "@/components/shared/SeoHead";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";

// Próg alarmu dla webhooka on-booking-created — przekroczenie sygnalizuje
// pętlę webhooków DB lub atak floodowy. 60/60s to limit per IP, więc 50
// odrzuceń w 15 min oznacza wyraźny zewnętrzny abuse (jedyny "klient"
// w normalnym ruchu to outbound IP Supabase z webhookiem na INSERT).
const BOOKING_WEBHOOK_DENIED_THRESHOLD = 50;

// Próg alarmu dla retry'ów wewnętrznego webhooka DB (UA Deno/*) w oknie 1h.
// Supabase webhook po 429 retry-uje z exponential backoff, więc 30 retry'ów
// Deno/* w 1h to silny sygnał pętli (UPDATE → INSERT loop) lub spike'a
// importu, który zalał shared rate limit.
const BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD = 30;

type AbuseRow = {
  ip: string;
  failure_count: number;
  invalid_token_count: number;
  rate_limited_count: number;
  expired_count: number;
  already_used_count: number;
  first_seen: string;
  last_seen: string;
  endpoints: string[];
  last_user_agent: string | null;
};

type FailureRow = {
  id: string;
  endpoint: string;
  reason: string;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type RateLimitedIp = {
  endpoint: string;
  ip: string;
  denied: number;
  hits: number;
  windows: number;
  last_window: string;
};

const REASON_LABELS: Record<string, string> = {
  invalid_token: "Nieprawidłowy token",
  rate_limited: "Rate-limit (429)",
  expired: "Token wygasł",
  already_used: "Token już użyty",
  rate_limit_failopen: "RL fail-open (DB error)",
  unauthorized: "Brak autoryzacji",
  invalid_payload: "Nieprawidłowy payload",
};

const REASON_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  invalid_token: "destructive",
  rate_limited: "destructive",
  expired: "secondary",
  already_used: "outline",
  rate_limit_failopen: "destructive",
  unauthorized: "secondary",
  invalid_payload: "outline",
};

// Pola podświetlane w widoku metadanych — szybciej rzuca się w oczy
// przy analizie ataku/pętli (retry-after, podgląd tokenu, metoda HTTP).
const HIGHLIGHTED_METADATA_KEYS = new Set(["retryAfterSec", "tokenPreview", "method"]);

const MetadataView = ({ data }: { data: Record<string, unknown> }) => {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <span className="text-muted-foreground italic">{"{}"}</span>;
  }
  return (
    <div className="space-y-0.5">
      {entries.map(([key, value]) => {
        const isHighlighted = HIGHLIGHTED_METADATA_KEYS.has(key);
        const rendered =
          typeof value === "string" ? `"${value}"` : JSON.stringify(value, null, 2);
        return (
          <div
            key={key}
            className={
              isHighlighted
                ? "rounded bg-primary/15 border border-primary/30 px-1.5 py-0.5 -mx-0.5"
                : "px-1.5 py-0.5"
            }
          >
            <span className={isHighlighted ? "text-primary font-semibold" : "text-muted-foreground"}>
              {key}
            </span>
            <span className="text-muted-foreground">: </span>
            <span className={isHighlighted ? "text-foreground font-semibold" : "text-foreground/90"}>
              {rendered}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const AdminSystemHealth = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [retryFilterIp, setRetryFilterIp] = useState("");
  const [retryFilterUa, setRetryFilterUa] = useState("");
  const [retryDenoOnly, setRetryDenoOnly] = useState(false);
  // Modal inspekcji konkretnej kombinacji IP+UA. null = zamknięty.
  const [inspectSource, setInspectSource] = useState<{ ip: string; ua: string } | null>(null);
  // Filtr tekstowy w modalu — szuka substringa w JSON metadata (case-insensitive).
  const [inspectQuery, setInspectQuery] = useState("");
  // Kierunek sortowania w modalu: desc = najnowsze pierwsze (domyślnie).
  const [inspectSort, setInspectSort] = useState<"desc" | "asc">("desc");
  // Klucz aktualnie podświetlonego wiersza w tabeli źródeł (po "Pokaż w tabeli" z modala).
  const [highlightedRowKey, setHighlightedRowKey] = useState<string | null>(null);

  // Auto-fade highlightu wiersza po 3s — żeby nie zostawiać trwałego kolorowego rzędu.
  useEffect(() => {
    if (!highlightedRowKey) return;
    const t = window.setTimeout(() => setHighlightedRowKey(null), 3000);
    return () => window.clearTimeout(t);
  }, [highlightedRowKey]);

  // Zamyka modal i przewija/podświetla wiersz w tabeli źródeł dla wskazanej kombinacji IP+UA.
  // Czeka jeden frame, żeby DOM zdążył odmontować dialog i przywrócić scroll body.
  const revealRowInTable = (ip: string, ua: string) => {
    const key = `${ip}::${ua}`;
    // Wyczyść filtry, jeśli przez nie wiersz jest poza listą — inaczej scroll trafi w pustkę.
    if (retryFilterIp.trim()) setRetryFilterIp("");
    if (retryFilterUa.trim()) setRetryFilterUa("");
    if (retryDenoOnly && !/^Deno\//i.test(ua)) setRetryDenoOnly(false);
    setInspectSource(null);
    setInspectQuery("");
    setInspectSort("desc");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-retry-row-key="${CSS.escape(key)}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedRowKey(key);
        }
      });
    });
  };

  useEffect(() => {
    let isMounted = true;
    const apply = (s: Session | null) => {
      if (!isMounted) return;
      setSession(s);
      setAuthLoading(false);
      if (!s) navigate("/admin/login", { replace: true });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    supabase.auth.getSession().then(({ data: { session: s } }) => apply(s));
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, [navigate]);

  const enabled = !authLoading && !!session && !adminLoading && isAdmin;

  const { data: abuseIps = [], isLoading: abuseLoading, refetch: refetchAbuse, dataUpdatedAt: abuseUpdated } = useQuery({
    queryKey: ["admin-abuse-ips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recent_token_abuse_ips" as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as AbuseRow[];
    },
    enabled,
    refetchInterval: 30_000,
  });

  const { data: recentFailures = [], isLoading: failuresLoading, refetch: refetchFailures } = useQuery({
    queryKey: ["admin-token-failures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_validation_failures" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as FailureRow[];
    },
    enabled,
    refetchInterval: 30_000,
  });

  const { data: rateLimitedIps = [], isLoading: rateLimitedLoading, refetch: refetchRateLimited, dataUpdatedAt: rateLimitedUpdated } = useQuery({
    queryKey: ["admin-rate-limited-ips"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_rate_limited_ips" as never, { p_limit: 10 } as never);
      if (error) throw error;
      return (data ?? []) as unknown as RateLimitedIp[];
    },
    enabled,
    refetchInterval: 30_000,
  });

  // 15-minutowy licznik odrzuceń webhooka on-booking-created.
  // Liczymy wpisy reason=rate_limited z ostatnich 15 min — to bezpośredni
  // sygnał, że ktoś (lub pętla DB-webhook) bombarduje endpoint.
  const { data: bookingWebhookDenied = 0, dataUpdatedAt: webhookUpdated } = useQuery({
    queryKey: ["admin-booking-webhook-denied-15m"],
    queryFn: async () => {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("token_validation_failures" as never)
        .select("id", { count: "exact", head: true })
        .eq("endpoint", "on-booking-created")
        .eq("reason", "rate_limited")
        .gte("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
    enabled,
    refetchInterval: 30_000,
  });

  // Retry webhooka DB → 429 dla on-booking-created.
  // Sygnał = wpisy reason='rate_limited' z UA "Deno/*" (Supabase webhook
  // delivery używa Deno fetch). Każdy taki wpis to próba ponowienia, którą
  // Supabase wykonuje z exponential backoff. Pokazujemy 3 okna (1h/6h/24h)
  // + breakdown per IP/UA, żeby od razu widzieć czy to jednorazowy spike,
  // czy stały szum (sygnał do podniesienia limitu lub zbadania pętli).
  type WebhookRetryRow = {
    id: string;
    ip: string | null;
    user_agent: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  };
  const { data: webhookRetries = [], isLoading: retriesLoading, dataUpdatedAt: retriesUpdated } = useQuery({
    queryKey: ["admin-booking-webhook-retries-24h"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("token_validation_failures" as never)
        .select("id, ip, user_agent, metadata, created_at")
        .eq("endpoint", "on-booking-created")
        .eq("reason", "rate_limited")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as WebhookRetryRow[];
    },
    enabled,
    refetchInterval: 60_000,
  });

  const webhookRetryStats = useMemo(() => {
    const now = Date.now();
    const buckets = { last1h: 0, last6h: 0, last24h: webhookRetries.length };
    const perSource = new Map<string, { ip: string; ua: string; count: number; last: string; maxRetryAfter: number }>();
    const perIp = new Map<string, number>();
    let denoOnly = 0;
    let denoLast1h = 0;
    // Statystyki retry-after z metadanych. Liczymy tylko wpisy z dodatnią
    // wartością — 0/null oznacza brak retry_after w odpowiedzi (np. fail-open
    // lub stary log bez metadanych).
    let retryAfterSum = 0;
    let retryAfterMax = 0;
    let retryAfterCount = 0;
    for (const r of webhookRetries) {
      const ageMs = now - new Date(r.created_at).getTime();
      const ua = r.user_agent ?? "—";
      const isDeno = /^Deno\//i.test(ua);
      if (ageMs <= 60 * 60 * 1000) {
        buckets.last1h += 1;
        if (isDeno) denoLast1h += 1;
      }
      if (ageMs <= 6 * 60 * 60 * 1000) buckets.last6h += 1;
      if (isDeno) denoOnly += 1;
      const ipKey = r.ip ?? "—";
      perIp.set(ipKey, (perIp.get(ipKey) ?? 0) + 1);
      const key = `${ipKey}::${ua}`;
      const retryAfter = typeof r.metadata?.retryAfterSec === "number" ? (r.metadata.retryAfterSec as number) : 0;
      if (retryAfter > 0) {
        retryAfterSum += retryAfter;
        retryAfterCount += 1;
        if (retryAfter > retryAfterMax) retryAfterMax = retryAfter;
      }
      const existing = perSource.get(key);
      if (existing) {
        existing.count += 1;
        if (retryAfter > existing.maxRetryAfter) existing.maxRetryAfter = retryAfter;
      } else {
        perSource.set(key, { ip: ipKey, ua, count: 1, last: r.created_at, maxRetryAfter: retryAfter });
      }
    }
    const sources = Array.from(perSource.values()).sort((a, b) => b.count - a.count);
    // Top IP po liczbie retry'ów (niezależnie od UA — łapie też przypadek,
    // gdy ten sam IP używa różnych UA).
    let topIp: string | null = null;
    let topIpCount = 0;
    for (const [ip, count] of perIp.entries()) {
      if (count > topIpCount) {
        topIp = ip;
        topIpCount = count;
      }
    }
    const topIpShare = buckets.last24h > 0 ? (topIpCount / buckets.last24h) * 100 : 0;
    const uniqueIps = perIp.size;
    const avgRetryAfter = retryAfterCount > 0 ? retryAfterSum / retryAfterCount : 0;
    return {
      ...buckets,
      denoOnly,
      denoLast1h,
      sources,
      topIp,
      topIpCount,
      topIpShare,
      uniqueIps,
      avgRetryAfter,
      maxRetryAfter: retryAfterMax,
      retryAfterSampleCount: retryAfterCount,
    };
  }, [webhookRetries]);

  // Filtrowanie tabeli retry'ów po IP / UA + przełącznik "tylko Deno/*".
  // Filtrujemy po stronie klienta — w 24h oknie mamy max ~1000 wpisów, a po
  // agregacji (perSource) zwykle <50 wierszy, więc nie ma sensu round-tripować
  // do bazy. Limit prezentacji: 50 wierszy (nawet bez filtra).
  const filteredRetrySources = useMemo(() => {
    const ipQ = retryFilterIp.trim().toLowerCase();
    const uaQ = retryFilterUa.trim().toLowerCase();
    return webhookRetryStats.sources
      .filter((s) => {
        if (retryDenoOnly && !/^Deno\//i.test(s.ua)) return false;
        if (ipQ && !s.ip.toLowerCase().includes(ipQ)) return false;
        if (uaQ && !s.ua.toLowerCase().includes(uaQ)) return false;
        return true;
      })
      .slice(0, 50);
  }, [webhookRetryStats.sources, retryFilterIp, retryFilterUa, retryDenoOnly]);

  const retryFiltersActive = retryDenoOnly || retryFilterIp.trim() !== "" || retryFilterUa.trim() !== "";

  // Rekordy filtrowane do modala inspekcji (wybrane IP + UA, max 50 ostatnich).
  const inspectRecords = useMemo(() => {
    if (!inspectSource) return [];
    return webhookRetries
      .filter((r) => (r.ip ?? "—") === inspectSource.ip && (r.user_agent ?? "—") === inspectSource.ua)
      .slice(0, 50);
  }, [inspectSource, webhookRetries]);

  // Wynik wyszukiwania w modalu — substring w stringified metadata (case-insensitive),
  // z sortowaniem po created_at (desc=najnowsze, asc=najstarsze).
  const inspectFilteredRecords = useMemo(() => {
    const q = inspectQuery.trim().toLowerCase();
    const filtered = q
      ? inspectRecords.filter((r) => {
          try {
            return JSON.stringify(r.metadata ?? {}).toLowerCase().includes(q);
          } catch {
            return false;
          }
        })
      : inspectRecords;
    // inspectRecords już przychodzi w kolejności DESC z query, więc dla "desc" zostawiamy,
    // a dla "asc" tworzymy odwróconą kopię (nie mutujemy oryginału).
    return inspectSort === "asc" ? [...filtered].reverse() : filtered;
  }, [inspectRecords, inspectQuery, inspectSort]);

  // Trend retry'ów per godzina, ostatnie 24h. Dwie serie: deno (wewnętrzny
  // webhook DB) i other (ruch zewnętrzny / boty). Każdy bucket = pełna
  // godzina kalendarzowa (lokalna), wstecz od "teraz". Dzięki stałej liczbie
  // 24 punktów wykres jest stabilny niezależnie od wolumenu danych.
  const retryTrend = useMemo(() => {
    const now = new Date();
    const hourMs = 60 * 60 * 1000;
    // Bucket startuje na pełnej godzinie. Tworzymy 24 backety: [now-23h, …, now].
    const startHour = new Date(now);
    startHour.setMinutes(0, 0, 0);
    const buckets: { ts: number; label: string; deno: number; other: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const ts = startHour.getTime() - i * hourMs;
      const d = new Date(ts);
      buckets.push({
        ts,
        label: `${String(d.getHours()).padStart(2, "0")}:00`,
        deno: 0,
        other: 0,
      });
    }
    for (const r of webhookRetries) {
      const t = new Date(r.created_at).getTime();
      const idx = Math.floor((t - buckets[0].ts) / hourMs);
      if (idx < 0 || idx >= buckets.length) continue;
      const ua = r.user_agent ?? "";
      if (/^Deno\//i.test(ua)) buckets[idx].deno += 1;
      else buckets[idx].other += 1;
    }
    return buckets;
  }, [webhookRetries]);

  const retryTrendHasData = useMemo(
    () => retryTrend.some((b) => b.deno > 0 || b.other > 0),
    [retryTrend],
  );

  // Toast tylko przy WEJŚCIU w stan przekroczenia (nie przy każdym refetchu).
  const wasOverThreshold = useMemo(() => ({ value: false }), []);
  useEffect(() => {
    if (bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD && !wasOverThreshold.value) {
      wasOverThreshold.value = true;
      toast.error("Webhook on-booking-created: nadużycie!", {
        description: `${bookingWebhookDenied} odrzuceń w ostatnich 15 min (próg: ${BOOKING_WEBHOOK_DENIED_THRESHOLD}).`,
        duration: 10_000,
      });
    } else if (bookingWebhookDenied < BOOKING_WEBHOOK_DENIED_THRESHOLD) {
      wasOverThreshold.value = false;
    }
  }, [bookingWebhookDenied, wasOverThreshold]);

  // Toast dla retry'ów Deno/* (wewnętrzny webhook DB) w 1h — edge-triggered.
  const wasOverDenoRetryThreshold = useMemo(() => ({ value: false }), []);
  useEffect(() => {
    if (
      webhookRetryStats.denoLast1h >= BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD &&
      !wasOverDenoRetryThreshold.value
    ) {
      wasOverDenoRetryThreshold.value = true;
      toast.error("Retry webhooka DB: pętla lub spike!", {
        description: `${webhookRetryStats.denoLast1h} retry'ów Deno/* w ostatniej 1h dla on-booking-created (próg: ${BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD}). Sprawdź konfigurację webhooka DB i logi.`,
        duration: 12_000,
      });
    } else if (webhookRetryStats.denoLast1h < BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD) {
      wasOverDenoRetryThreshold.value = false;
    }
  }, [webhookRetryStats.denoLast1h, wasOverDenoRetryThreshold]);

  const stats = useMemo(() => {
    const total = recentFailures.length;
    const last24h = recentFailures.filter(
      (f) => new Date(f.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
    ).length;
    const uniqueIps = new Set(recentFailures.map((f) => f.ip).filter(Boolean)).size;
    return { total, last24h, uniqueIps };
  }, [recentFailures]);

  if (authLoading || adminLoading) {
    return <div className="container mx-auto p-8 text-muted-foreground">Ładowanie…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8 max-w-md">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Brak uprawnień</AlertTitle>
          <AlertDescription>Ta strona wymaga roli administratora.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title="System Health — Admin"
        description="Monitoring podejrzanych prób użycia tokenów rezerwacji."
        path="/admin/system-health"
      />
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
            </Button>
            <h1 className="text-2xl md:text-3xl font-display flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" /> System Health
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchAbuse(); refetchFailures(); refetchRateLimited(); }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Odśwież
          </Button>
        </div>

        {/* BOOKING WEBHOOK ALERT — przyciągająca uwagę kafelka u góry, pulsująca przy przekroczeniu progu. */}
        <Card
          className={
            bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD
              ? "mb-8 border-destructive ring-2 ring-destructive/40 animate-pulse"
              : "mb-8 border-border"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook
                className={
                  bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD
                    ? "h-5 w-5 text-destructive"
                    : "h-5 w-5 text-primary"
                }
              />
              Webhook on-booking-created — odrzucenia 15 min
              {bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD && (
                <Badge variant="destructive" className="ml-2">ALERT</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Liczba wpisów <code className="text-xs">reason=rate_limited</code> dla endpointu{" "}
              <code className="text-xs">on-booking-created</code> z ostatnich 15 minut. Próg alarmu:{" "}
              <strong>{BOOKING_WEBHOOK_DENIED_THRESHOLD}</strong>. Auto-refresh 30s. Aktualizacja:{" "}
              {webhookUpdated ? formatDistanceToNow(new Date(webhookUpdated), { addSuffix: true, locale: pl }) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span
                className={
                  bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD
                    ? "text-5xl font-bold text-destructive"
                    : "text-5xl font-bold text-foreground"
                }
              >
                {bookingWebhookDenied}
              </span>
              <span className="text-muted-foreground text-sm">odrzuceń / 15 min</span>
            </div>
            {bookingWebhookDenied >= BOOKING_WEBHOOK_DENIED_THRESHOLD ? (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Możliwa pętla webhooków lub flood</AlertTitle>
                <AlertDescription>
                  Próg <strong>{BOOKING_WEBHOOK_DENIED_THRESHOLD}/15min</strong> przekroczony. Sprawdź:
                  <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                    <li>Logi <code>on-booking-created</code> — czy lecą prawdziwe insertowane bookingi?</li>
                    <li>Tabela <code>bookings</code> — czy nie ma masowego importu?</li>
                    <li>Konfiguracja webhooka DB — czy nie jest zapętlona (UPDATE → INSERT)?</li>
                  </ol>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">
                ✓ W normie — webhook DB zazwyczaj generuje 1 request na booking.
              </p>
            )}
          </CardContent>
        </Card>

        {/* BOOKING WEBHOOK RETRIES — historia retry'ów Supabase webhooka DB.
            Supabase delivery retry-uje 429 z exponential backoff; każdy taki
            retry ląduje tu jako reason='rate_limited' z UA "Deno/...". */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Retry webhooka DB → 429 (on-booking-created)
            </CardTitle>
            <CardDescription>
              Liczba odrzuceń webhooka Supabase (UA <code className="text-xs">Deno/*</code>) w oknach 1h / 6h / 24h.
              Każdy wpis to próba ponowienia, którą Supabase wykonuje z exponential backoff po otrzymaniu HTTP 429.
              Ostatnia aktualizacja:{" "}
              {retriesUpdated ? formatDistanceToNow(new Date(retriesUpdated), { addSuffix: true, locale: pl }) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {retriesLoading ? (
              <p className="text-muted-foreground">Ładowanie…</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div
                    className={
                      webhookRetryStats.denoLast1h >= BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD
                        ? "rounded-lg border-2 border-destructive p-3 ring-2 ring-destructive/30 animate-pulse"
                        : "rounded-lg border border-border p-3"
                    }
                  >
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Ostatnia 1h
                      {webhookRetryStats.denoLast1h >= BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD && (
                        <Badge variant="destructive" className="ml-1 text-[10px] py-0 h-4">ALERT</Badge>
                      )}
                    </p>
                    <p
                      className={
                        webhookRetryStats.denoLast1h >= BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD
                          ? "text-2xl font-bold text-destructive"
                          : "text-2xl font-bold"
                      }
                    >
                      {webhookRetryStats.last1h}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Deno/*: <strong>{webhookRetryStats.denoLast1h}</strong> / próg {BOOKING_WEBHOOK_DENO_RETRY_1H_THRESHOLD}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Ostatnie 6h</p>
                    <p className="text-2xl font-bold">{webhookRetryStats.last6h}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Ostatnie 24h</p>
                    <p className="text-2xl font-bold">{webhookRetryStats.last24h}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Z czego z UA <code>Deno/*</code> (wewnętrzny webhook):{" "}
                  <Badge variant="secondary">{webhookRetryStats.denoOnly} / {webhookRetryStats.last24h}</Badge>
                  {" "}— pozostałe to ruch zewnętrzny / boty.
                </p>

                {/* Karta podsumowania: koncentracja źródeł + retry-after.
                    Wysoki topIpShare (>70%) = pojedynczy abuser / pętla.
                    Wysoki avgRetryAfter = klient odbija się o pełne okno
                    rate-limitu (60s), czyli realnie czeka maksymalnie długo. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div
                    className={
                      webhookRetryStats.topIpShare >= 70 && webhookRetryStats.last24h > 0
                        ? "rounded-lg border-2 border-destructive/60 p-4 bg-destructive/5"
                        : "rounded-lg border border-border p-4 bg-card/40"
                    }
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Ban
                        className={
                          webhookRetryStats.topIpShare >= 70 && webhookRetryStats.last24h > 0
                            ? "h-4 w-4 text-destructive"
                            : "h-4 w-4 text-muted-foreground"
                        }
                      />
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Koncentracja źródeł
                      </p>
                    </div>
                    {webhookRetryStats.last24h === 0 ? (
                      <p className="text-sm text-muted-foreground">Brak danych w 24h.</p>
                    ) : (
                      <>
                        <p
                          className={
                            webhookRetryStats.topIpShare >= 70
                              ? "text-3xl font-bold text-destructive"
                              : "text-3xl font-bold text-foreground"
                          }
                        >
                          {webhookRetryStats.topIpShare.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          retry'ów z jednego IP{" "}
                          <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">
                            {webhookRetryStats.topIp ?? "—"}
                          </code>{" "}
                          (<strong>{webhookRetryStats.topIpCount}</strong> / {webhookRetryStats.last24h})
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Unikalne IP w 24h: <strong>{webhookRetryStats.uniqueIps}</strong>
                          {webhookRetryStats.topIpShare >= 70 && (
                            <span className="text-destructive ml-2">⚠ Wysoka koncentracja — sprawdź źródło.</span>
                          )}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="rounded-lg border border-border p-4 bg-card/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Retry-after (z metadanych)
                      </p>
                    </div>
                    {webhookRetryStats.retryAfterSampleCount === 0 ? (
                      <p className="text-sm text-muted-foreground">Brak metadanych retry-after.</p>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-foreground">
                          {webhookRetryStats.avgRetryAfter.toFixed(1)}
                          <span className="text-sm font-normal text-muted-foreground ml-1">s średnio</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Maksymalny: <strong>{webhookRetryStats.maxRetryAfter}s</strong>{" "}
                          (próbka: {webhookRetryStats.retryAfterSampleCount} / {webhookRetryStats.last24h})
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {webhookRetryStats.avgRetryAfter >= 45 ? (
                            <span className="text-destructive">
                              ⚠ Klienci czekają prawie pełne okno (60s) — limit jest stale wysycony.
                            </span>
                          ) : webhookRetryStats.avgRetryAfter >= 20 ? (
                            <>Średnie obciążenie — okno rate-limitu często aktywne.</>
                          ) : (
                            <>Niski czas czekania — pojedyncze odrzucenia.</>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Trend retry'ów per godzina, ostatnie 24h.
                    Stacked area: Deno/* (wewnętrzny webhook) vs pozostałe. */}
                <div className="rounded-lg border border-border p-3 mb-4 bg-card/40">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Trend retry'ów (24h, per godzina)
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-destructive" />
                        Deno/* (webhook DB)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
                        Pozostałe
                      </span>
                    </div>
                  </div>
                  {retryTrendHasData ? (
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={retryTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="retryDeno" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.55} />
                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="retryOther" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          interval={3}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                          width={28}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                          formatter={(v: number, name) => [v, name === "deno" ? "Deno/*" : "Pozostałe"]}
                          labelFormatter={(l) => `Godz. ${l}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="deno"
                          stackId="1"
                          stroke="hsl(var(--destructive))"
                          fill="url(#retryDeno)"
                          strokeWidth={1.5}
                        />
                        <Area
                          type="monotone"
                          dataKey="other"
                          stackId="1"
                          stroke="hsl(var(--primary))"
                          fill="url(#retryOther)"
                          strokeWidth={1.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[140px] text-xs text-muted-foreground">
                      ✓ Brak retry'ów w ostatnich 24h — wykres pusty.
                    </div>
                  )}
                </div>

                {webhookRetryStats.sources.length === 0 ? (
                  <p className="text-muted-foreground py-2 text-sm">
                    ✓ Brak retry'ów w ostatnich 24h.
                  </p>
                ) : (
                  <>
                    {/* Filtry tabeli retry'ów */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 p-3 rounded-lg border border-border bg-muted/30">
                      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Filtr IP (substring)…"
                        value={retryFilterIp}
                        onChange={(e) => setRetryFilterIp(e.target.value)}
                        className="h-8 w-full sm:w-44 font-mono text-xs"
                      />
                      <Input
                        placeholder="Filtr User-Agent (substring)…"
                        value={retryFilterUa}
                        onChange={(e) => setRetryFilterUa(e.target.value)}
                        className="h-8 w-full sm:w-64 font-mono text-xs"
                      />
                      <Toggle
                        size="sm"
                        pressed={retryDenoOnly}
                        onPressedChange={setRetryDenoOnly}
                        aria-label="Pokaż tylko webhook DB (Deno/*)"
                        className="h-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Webhook className="h-3.5 w-3.5 mr-1.5" />
                        Tylko webhook DB (Deno/*)
                      </Toggle>
                      {retryFiltersActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setRetryFilterIp("");
                            setRetryFilterUa("");
                            setRetryDenoOnly(false);
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Wyczyść
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {filteredRetrySources.length} / {webhookRetryStats.sources.length} źródeł
                      </span>
                    </div>

                    {filteredRetrySources.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-sm text-center">
                        Brak wyników dla aktywnych filtrów.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>IP</TableHead>
                              <TableHead>User-Agent</TableHead>
                              <TableHead>Liczba retry</TableHead>
                              <TableHead>Max retry-after (s)</TableHead>
                              <TableHead>Ostatni</TableHead>
                              <TableHead className="w-[80px] text-right">Akcje</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRetrySources.map((s) => {
                              const isDeno = /^Deno\//i.test(s.ua);
                              return (
                                <TableRow
                                  key={`${s.ip}::${s.ua}`}
                                  data-retry-row-key={`${s.ip}::${s.ua}`}
                                  className={
                                    highlightedRowKey === `${s.ip}::${s.ua}`
                                      ? "bg-primary/15 ring-2 ring-primary/40 transition-colors"
                                      : "transition-colors"
                                  }
                                >
                                  <TableCell className="font-mono text-xs">{s.ip}</TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {isDeno ? (
                                      <Badge variant="secondary" className="mr-2">webhook DB</Badge>
                                    ) : null}
                                    {s.ua}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={s.count >= 50 ? "destructive" : "outline"}>{s.count}</Badge>
                                  </TableCell>
                                  <TableCell className="text-xs">{s.maxRetryAfter || "—"}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(s.last), { addSuffix: true, locale: pl })}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => setInspectSource({ ip: s.ip, ua: s.ua })}
                                      title="Pokaż surowe rekordy z metadata"
                                    >
                                      <Eye className="h-3.5 w-3.5 mr-1" />
                                      <span className="text-xs">Szczegóły</span>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Wpisy w bazie (ostatnie 100)</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Z ostatnich 24h</CardDescription>
              <CardTitle className="text-3xl">{stats.last24h}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unikalne IP</CardDescription>
              <CardTitle className="text-3xl">{stats.uniqueIps}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* ABUSE ALERT */}
        <Card className="mb-8 border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Podejrzane IP (≥10 nieudanych prób w ostatnich 10 minutach)
            </CardTitle>
            <CardDescription>
              Próg detekcji brute-force. Auto-refresh co 30s. Ostatnia aktualizacja:{" "}
              {abuseUpdated ? formatDistanceToNow(new Date(abuseUpdated), { addSuffix: true, locale: pl }) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {abuseLoading ? (
              <p className="text-muted-foreground">Ładowanie…</p>
            ) : abuseIps.length === 0 ? (
              <p className="text-muted-foreground py-4">
                ✓ Brak podejrzanej aktywności. Żadne IP nie przekroczyło progu 10 prób / 10 min.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP</TableHead>
                      <TableHead>Łącznie</TableHead>
                      <TableHead>Invalid</TableHead>
                      <TableHead>Rate-lim</TableHead>
                      <TableHead>Expired</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Pierwszy</TableHead>
                      <TableHead>Ostatni</TableHead>
                      <TableHead>User-Agent (ostatni)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abuseIps.map((row) => (
                      <TableRow key={row.ip}>
                        <TableCell className="font-mono text-sm">{row.ip}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{row.failure_count}</Badge>
                        </TableCell>
                        <TableCell>{row.invalid_token_count}</TableCell>
                        <TableCell>{row.rate_limited_count}</TableCell>
                        <TableCell>{row.expired_count}</TableCell>
                        <TableCell>{row.already_used_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(row.first_seen), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(row.last_seen), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={row.last_user_agent ?? ""}>
                          {row.last_user_agent ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TOP RATE-LIMITED IPs */}
        <Card className="mb-8 border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Top rate-limited IP (aktywne nadużycia)
            </CardTitle>
            <CardDescription>
              Agregat z <code className="text-xs">rate_limit_buckets</code> — IP × endpoint, których count w jakimkolwiek oknie przekroczył limit.
              "Denied" = liczba odrzuconych requestów (count − limit). Niezależne od <code className="text-xs">token_validation_failures</code>.
              Auto-refresh 30s. Aktualizacja:{" "}
              {rateLimitedUpdated ? formatDistanceToNow(new Date(rateLimitedUpdated), { addSuffix: true, locale: pl }) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rateLimitedLoading ? (
              <p className="text-muted-foreground">Ładowanie…</p>
            ) : rateLimitedIps.length === 0 ? (
              <p className="text-muted-foreground py-4">
                ✓ Żadne IP nie przekracza obecnie limitu rate-limit.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Denied</TableHead>
                      <TableHead>Hits (total)</TableHead>
                      <TableHead>Okien</TableHead>
                      <TableHead>Ostatnie okno</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateLimitedIps.map((row) => (
                      <TableRow key={`${row.endpoint}::${row.ip}`}>
                        <TableCell className="font-mono text-sm">{row.ip}</TableCell>
                        <TableCell className="font-mono text-xs">{row.endpoint}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{row.denied}</Badge>
                        </TableCell>
                        <TableCell>{row.hits}</TableCell>
                        <TableCell>{row.windows}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(row.last_window), { addSuffix: true, locale: pl })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT FAILURES */}
        <Card>
          <CardHeader>
            <CardTitle>Ostatnie 100 nieudanych prób</CardTitle>
            <CardDescription>Pełen log z tabeli token_validation_failures (auto-refresh 30s).</CardDescription>
          </CardHeader>
          <CardContent>
            {failuresLoading ? (
              <p className="text-muted-foreground">Ładowanie…</p>
            ) : recentFailures.length === 0 ? (
              <p className="text-muted-foreground py-4">Brak wpisów.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kiedy</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Powód</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>User-Agent</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentFailures.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{f.endpoint}</TableCell>
                        <TableCell>
                          <Badge variant={REASON_VARIANT[f.reason] ?? "outline"}>
                            {REASON_LABELS[f.reason] ?? f.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{f.ip ?? "—"}</TableCell>
                        <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground" title={f.user_agent ?? ""}>
                          {f.user_agent ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground font-mono" title={f.metadata ? JSON.stringify(f.metadata) : ""}>
                          {f.metadata ? JSON.stringify(f.metadata) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal inspekcji surowych rekordów dla wybranego IP+UA. */}
      <Dialog
        open={!!inspectSource}
        onOpenChange={(open) => {
          if (!open) {
            setInspectSource(null);
            setInspectQuery("");
            setInspectSort("desc");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Surowe rekordy retry'ów
              </DialogTitle>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    if (!inspectSource) return;
                    revealRowInTable(inspectSource.ip, inspectSource.ua);
                  }}
                  title="Zamknij modal i przewiń do wiersza w tabeli źródeł"
                >
                  <Locate className="h-3.5 w-3.5" />
                  Pokaż w tabeli
                </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 shrink-0"
                
                onClick={() => {
                  if (!inspectSource || inspectFilteredRecords.length === 0) return;
                  // Eksport tylko aktualnie wyświetlanych rekordów (po filtrach IP+UA + tekst).
                  const payload = {
                    exportedAt: new Date().toISOString(),
                    endpoint: "on-booking-created",
                    source: { ip: inspectSource.ip, userAgent: inspectSource.ua },
                    query: inspectQuery.trim() || null,
                    count: inspectFilteredRecords.length,
                    records: inspectFilteredRecords,
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const safeIp = inspectSource.ip.replace(/[^a-z0-9.-]/gi, "_");
                  const ts = new Date().toISOString().replace(/[:.]/g, "-");
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `retry-records_${safeIp}_${ts}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success(`Wyeksportowano ${inspectFilteredRecords.length} rekordów`);
                }}
                disabled={inspectFilteredRecords.length === 0}
                title="Pobierz aktualnie wyświetlane rekordy jako JSON"
              >
                <Download className="h-3.5 w-3.5" />
                Eksportuj
              </Button>
              </div>
            </div>
            <DialogDescription asChild>
              <div className="text-xs space-y-1">
                {inspectSource && (
                  <>
                    <div>
                      Endpoint <code>on-booking-created</code> · IP{" "}
                      <code className="font-mono">{inspectSource.ip}</code>
                    </div>
                    <div>
                      UA <code className="font-mono break-all">{inspectSource.ua}</code>
                    </div>
                    <div>
                      Pokazuję <strong>{inspectFilteredRecords.length}</strong> z {inspectRecords.length} (max 50 najnowszych, window 24h).
                    </div>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          {inspectRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Brak rekordów dla tej kombinacji w ostatnich 24h.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={inspectQuery}
                    onChange={(e) => setInspectQuery(e.target.value)}
                    placeholder="Filtruj po metadata (np. tokenPreview, method, fragment ID)…"
                    className="h-8 pl-8 pr-8 text-xs"
                  />
                  {inspectQuery && (
                    <button
                      type="button"
                      onClick={() => setInspectQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Wyczyść filtr"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 shrink-0 text-xs"
                  onClick={() => setInspectSort((s) => (s === "desc" ? "asc" : "desc"))}
                  title={inspectSort === "desc" ? "Pokaż najstarsze pierwsze" : "Pokaż najnowsze pierwsze"}
                >
                  {inspectSort === "desc" ? (
                    <>
                      <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                      Najnowsze
                    </>
                  ) : (
                    <>
                      <ArrowUpWideNarrow className="h-3.5 w-3.5" />
                      Najstarsze
                    </>
                  )}
                </Button>
              </div>
              {inspectFilteredRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Brak rekordów pasujących do „{inspectQuery}”.
                </p>
              ) : (
                <ScrollArea className="flex-1 -mx-6 px-6 max-h-[55vh]">
                  <div className="space-y-2 py-2">
                    {inspectFilteredRecords.map((r) => {
                      const retryAfter =
                        typeof r.metadata?.retryAfterSec === "number"
                          ? (r.metadata.retryAfterSec as number)
                          : null;
                      return (
                        <div key={r.id} className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-muted-foreground">
                              {new Date(r.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "medium" })}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: pl })}
                            </span>
                          </div>
                          {retryAfter !== null && (
                            <Badge variant="outline" className="text-[10px]">
                              retry-after: {retryAfter}s
                            </Badge>
                          )}
                          <div className="font-mono text-[11px] bg-background border border-border rounded p-2 overflow-x-auto">
                            <MetadataView data={r.metadata ?? {}} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSystemHealth;
