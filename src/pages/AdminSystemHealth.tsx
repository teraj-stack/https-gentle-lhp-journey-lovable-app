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
import { ArrowLeft, ShieldAlert, Activity, AlertTriangle, RefreshCw, Ban } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

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
};

const REASON_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  invalid_token: "destructive",
  rate_limited: "destructive",
  expired: "secondary",
  already_used: "outline",
};

const AdminSystemHealth = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();

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
            onClick={() => { refetchAbuse(); refetchFailures(); }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Odśwież
          </Button>
        </div>

        {/* Stats cards */}
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
    </>
  );
};

export default AdminSystemHealth;
