import { useEffect, useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, ShieldAlert, Mail, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";
import { format, subDays, subHours } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";

type EmailRow = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  pending: "secondary",
  dlq: "destructive",
  failed: "destructive",
  bounced: "destructive",
  complained: "destructive",
  suppressed: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  sent: "Wysłany",
  pending: "W kolejce",
  dlq: "DLQ (failed)",
  failed: "Niepowodzenie",
  bounced: "Odbity",
  complained: "Skarga",
  suppressed: "Suppressed",
};

type TimeRange = "24h" | "7d" | "30d" | "custom";
const PAGE_SIZE = 50;

const AdminEmailDashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [customStart, setCustomStart] = useState<Date | undefined>(subDays(new Date(), 7));
  const [customEnd, setCustomEnd] = useState<Date | undefined>(new Date());
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

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

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (timeRange === "24h") return { startDate: subHours(now, 24), endDate: now };
    if (timeRange === "7d") return { startDate: subDays(now, 7), endDate: now };
    if (timeRange === "30d") return { startDate: subDays(now, 30), endDate: now };
    return { startDate: customStart ?? subDays(now, 7), endDate: customEnd ?? now };
  }, [timeRange, customStart, customEnd]);

  // Reset paginacji przy zmianie filtrów
  useEffect(() => { setPage(0); }, [timeRange, customStart, customEnd, templateFilter, statusFilter]);

  // Fetch wszystkich rekordów w zakresie (do 5000 — wystarczy dla typowego volumenu)
  const { data: rawRows = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["email-send-log", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as EmailRow[];
    },
    enabled: !authLoading && !!session && isAdmin,
    refetchOnWindowFocus: false,
  });

  // Deduplikacja po message_id — najnowszy wpis per email
  const dedupedRows = useMemo(() => {
    const seen = new Map<string, EmailRow>();
    for (const row of rawRows) {
      const key = row.message_id ?? `__no_msg_id__${row.id}`;
      const existing = seen.get(key);
      if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
        seen.set(key, row);
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [rawRows]);

  // Wszystkie templatki dla dropdownu (z całego zakresu, przed filtrem)
  const templateNames = useMemo(() => {
    const set = new Set<string>();
    dedupedRows.forEach((r) => set.add(r.template_name));
    return Array.from(set).sort();
  }, [dedupedRows]);

  // Filtrowanie
  const filteredRows = useMemo(() => {
    return dedupedRows.filter((r) => {
      if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "failed") return r.status === "dlq" || r.status === "failed" || r.status === "bounced";
      return r.status === statusFilter;
    });
  }, [dedupedRows, templateFilter, statusFilter]);

  // Stats (na deduped, w zakresie + filtrach)
  const stats = useMemo(() => {
    const total = filteredRows.length;
    let sent = 0, failed = 0, suppressed = 0, pending = 0;
    for (const r of filteredRows) {
      if (r.status === "sent") sent++;
      else if (r.status === "dlq" || r.status === "failed" || r.status === "bounced") failed++;
      else if (r.status === "suppressed") suppressed++;
      else if (r.status === "pending") pending++;
    }
    return { total, sent, failed, suppressed, pending };
  }, [filteredRows]);

  // Alarm: DLQ w ostatnich 24h (niezależny od aktywnego filtra czasu)
  const { data: dlq24h = 0 } = useQuery({
    queryKey: ["email-dlq-24h"],
    queryFn: async () => {
      const since = subHours(new Date(), 24).toISOString();
      const { data, error } = await supabase
        .from("email_send_log")
        .select("message_id, id, status")
        .in("status", ["dlq", "failed", "bounced"])
        .gte("created_at", since)
        .limit(2000);
      if (error) throw error;
      // Dedup po message_id
      const seen = new Set<string>();
      (data ?? []).forEach((r: any) => seen.add(r.message_id ?? `__${r.id}`));
      return seen.size;
    },
    enabled: !authLoading && !!session && isAdmin,
    refetchInterval: 30_000,
  });

  // Paginacja
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!session) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Brak uprawnień</h1>
          <p className="text-muted-foreground text-sm">Twoje konto nie ma roli administratora.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>Wróć</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Email Dashboard — Admin" description="Monitoring wysyłki maili" path="/admin/email-dashboard" />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 py-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Panel
            </Button>
            <h1 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5" /> Email Dashboard
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("w-4 h-4 mr-1", isFetching && "animate-spin")} /> Odśwież
          </Button>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 md:px-8 space-y-6">
          {/* Alarm DLQ > 0 w 24h */}
          {dlq24h > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Niepowodzenia w ostatnich 24h</AlertTitle>
              <AlertDescription>
                <strong>{dlq24h}</strong>{" "}
                {dlq24h === 1 ? "wiadomość trafiła" : "wiadomości trafiło"} do DLQ / failed / bounced.
                Sprawdź toggle „Emails enabled" (Cloud → Emails) oraz error_message poniżej.
              </AlertDescription>
            </Alert>
          )}

          {/* Filtry */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                {/* Time range presets */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Zakres czasu</label>
                  <div className="flex gap-1">
                    {(["24h", "7d", "30d", "custom"] as TimeRange[]).map((r) => (
                      <Button
                        key={r}
                        variant={timeRange === r ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeRange(r)}
                      >
                        {r === "24h" ? "24h" : r === "7d" ? "7 dni" : r === "30d" ? "30 dni" : "Własny"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom date pickers */}
                {timeRange === "custom" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Od</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="justify-start font-normal">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {customStart ? format(customStart, "PP", { locale: pl }) : "Wybierz"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Do</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="justify-start font-normal">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {customEnd ? format(customEnd, "PP", { locale: pl }) : "Wybierz"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}

                {/* Template filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Szablon</label>
                  <Select value={templateFilter} onValueChange={setTemplateFilter}>
                    <SelectTrigger className="w-[220px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie szablony</SelectItem>
                      {templateNames.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status filter */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie statusy</SelectItem>
                      <SelectItem value="sent">Wysłane</SelectItem>
                      <SelectItem value="failed">Niepowodzenia (DLQ + failed + bounced)</SelectItem>
                      <SelectItem value="suppressed">Suppressed</SelectItem>
                      <SelectItem value="pending">W kolejce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Łącznie (unikalne)" value={stats.total} />
            <StatCard label="Wysłane" value={stats.sent} variant="success" />
            <StatCard label="Niepowodzenia" value={stats.failed} variant={stats.failed > 0 ? "danger" : "default"} />
            <StatCard label="Suppressed" value={stats.suppressed} variant="warning" />
            <StatCard label="W kolejce" value={stats.pending} />
          </div>

          {/* Email log table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log wysyłki</CardTitle>
              <CardDescription>
                {filteredRows.length === 0
                  ? "Brak wpisów dla wybranych filtrów."
                  : `Strona ${page + 1} z ${totalPages} • łącznie ${filteredRows.length} unikalnych wiadomości (deduplikacja po message_id).`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
                </div>
              ) : isError ? (
                <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Błąd ładowania."}</p>
              ) : (
                <>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Szablon</TableHead>
                          <TableHead>Odbiorca</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Błąd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-mono text-xs">{row.template_name}</TableCell>
                            <TableCell className="text-sm">{row.recipient_email}</TableCell>
                            <TableCell>
                              <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>
                                {STATUS_LABELS[row.status] ?? row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(row.created_at), "dd.MM HH:mm:ss", { locale: pl })}
                            </TableCell>
                            <TableCell className="text-xs text-destructive max-w-[280px] truncate" title={row.error_message ?? ""}>
                              {row.error_message ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {pagedRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Brak wpisów.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginacja */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Poprzednia
                      </Button>
                      <span className="text-sm text-muted-foreground">Strona {page + 1} / {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                        Następna <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

function StatCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "success" | "danger" | "warning" }) {
  const colorClass =
    variant === "success" ? "text-green-500" :
    variant === "danger" ? "text-destructive" :
    variant === "warning" ? "text-yellow-500" :
    "text-foreground";
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-2xl font-bold mt-1", colorClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default AdminEmailDashboard;
