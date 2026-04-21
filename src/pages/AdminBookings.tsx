import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  LogOut,
  ShieldAlert,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  History,
  PhoneCall,
  MailX,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";
import AdminBookingsFilters, {
  DEFAULT_FILTERS,
  filtersFromSearchParams,
  filtersToSearchParams,
  matchesLocation,
  resolveDateRange,
  type BookingFilters,
} from "@/components/admin/AdminBookingsFilters";

type Booking = {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  location: string;
  status: string;
  created_at: string;
  reminder_opt_out: boolean;
  status_changed_at: string | null;
  status_changed_by: string | null;
};

type ActionToken = {
  id: string;
  action: "confirm" | "cancel" | "needs_contact";
  recipient_email: string;
  used_at: string | null;
  used_by_email: string | null;
  used_by_ua: string | null;
  used_by_ip: string | null;
  expires_at: string;
  created_at: string;
};

type LogRow = {
  message_id: string | null;
  status: string;
  created_at: string;
};

type ReminderState = {
  status: "sent" | "pending" | "failed" | "none";
  sentAt: string | null;
};

type BookingReminders = {
  "24h": ReminderState;
  "2h": ReminderState;
};

type EmailBreakdown = Record<string, { sent: number; pending: number; failed: number; total: number }>;

type BookingEmailCounts = {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  breakdown: EmailBreakdown;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Oczekująca", className: "bg-muted text-muted-foreground" },
  confirmed: { label: "Potwierdzona", className: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Odwołana", className: "bg-destructive/20 text-destructive" },
  needs_contact: { label: "Wymaga kontaktu", className: "bg-amber-500/20 text-amber-400" },
  completed: { label: "Zakończona", className: "bg-primary/20 text-primary" },
};

function reduceLogStatus(rows: LogRow[]): ReminderState {
  if (rows.length === 0) return { status: "none", sentAt: null };
  // rows posortowane DESC po created_at — bierzemy najnowszy stan per message_id
  const latestPerMsg = new Map<string, LogRow>();
  for (const r of rows) {
    if (!r.message_id) continue;
    if (!latestPerMsg.has(r.message_id)) latestPerMsg.set(r.message_id, r);
  }
  const states = Array.from(latestPerMsg.values());
  const sent = states.find((s) => s.status === "sent");
  if (sent) return { status: "sent", sentAt: sent.created_at };
  const pending = states.find((s) => s.status === "pending");
  if (pending) return { status: "pending", sentAt: pending.created_at };
  const failed = states.find((s) => ["dlq", "failed", "bounced"].includes(s.status));
  if (failed) return { status: "failed", sentAt: failed.created_at };
  return { status: "none", sentAt: null };
}

const AdminBookings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [resendTarget, setResendTarget] = useState<{ booking: Booking; variant: "24h" | "2h" } | null>(null);

  // ---- Filters: source of truth = URL query params ----
  const filters: BookingFilters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );
  const setFilters = (next: BookingFilters) => {
    setSearchParams(filtersToSearchParams(next), { replace: true });
  };
  useEffect(() => {
    let isMounted = true;
    const apply = (next: Session | null) => {
      if (!isMounted) return;
      setSession(next);
      setAuthLoading(false);
      if (!next) navigate("/admin/login", { replace: true });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT") apply(null);
      else apply(next);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => apply(s));
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Realtime: subskrypcja na zmiany w `bookings` (INSERT/UPDATE/DELETE)
  // Każda zmiana → invalidate cache → useQuery automatycznie refetchuje (z aktualnymi filtrami).
  // Dodatkowo soft-toast dla nowych rezerwacji żeby admin to zauważył.
  const [realtimeReady, setRealtimeReady] = useState(false);
  useEffect(() => {
    if (authLoading || !session) return;
    const channel = supabase
      .channel("admin-bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
          if (payload.eventType === "INSERT") {
            const row = payload.new as { patient_name?: string; appointment_date?: string; appointment_time?: string };
            toast.success("Nowa rezerwacja", {
              description: `${row.patient_name ?? "Pacjent"} — ${row.appointment_date ?? ""} ${row.appointment_time ?? ""}`,
            });
          } else if (payload.eventType === "UPDATE") {
            const oldRow = payload.old as { status?: string } | null;
            const newRow = payload.new as { status?: string; patient_name?: string } | null;
            if (oldRow?.status && newRow?.status && oldRow.status !== newRow.status) {
              toast.message("Status zaktualizowany", {
                description: `${newRow.patient_name ?? "Pacjent"}: ${oldRow.status} → ${newRow.status}`,
              });
              // Status się zmienił — odśwież też historię tego bookingu
              queryClient.invalidateQueries({ queryKey: ["booking-status-history"] });
              queryClient.invalidateQueries({ queryKey: ["admin-bookings-action-tokens"] });
            }
          }
        },
      )
      .subscribe((status) => {
        setRealtimeReady(status === "SUBSCRIBED");
      });
    return () => {
      supabase.removeChannel(channel);
      setRealtimeReady(false);
    };
  }, [authLoading, session, queryClient]);

  // Date range from filters (preset → from/to). Cap floor at -30d to avoid huge scans.
  const dateRange = useMemo(() => resolveDateRange(filters), [filters]);
  const queryFrom = useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return dateRange.from && dateRange.from > cutoff ? dateRange.from : cutoff;
  }, [dateRange.from]);

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    isError,
    error,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["admin-bookings", filters.status, queryFrom, dateRange.to ?? null, filters.reminderOptOut],
    queryFn: async (): Promise<Booking[]> => {
      let q = supabase
        .from("bookings")
        .select("*")
        .gte("appointment_date", queryFrom)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });
      if (dateRange.to) q = q.lte("appointment_date", dateRange.to);
      if (filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.reminderOptOut === "active") q = q.eq("reminder_opt_out", false);
      else if (filters.reminderOptOut === "optedOut") q = q.eq("reminder_opt_out", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
    enabled: !authLoading && !!session,
  });

  // Location filter applied client-side (location is free-text; uses substring match
  // matching the same patterns as the cron edge function).
  // Closeout: dziś po 18:00 (Warsaw) — appointment_time >= "18:00".
  const filteredBookings = useMemo(
    () =>
      bookings.filter((b) => {
        if (!matchesLocation(b.location, filters.location)) return false;
        if (filters.closeout) {
          const t = (b.appointment_time ?? "").slice(0, 5);
          if (t < "18:00") return false;
        }
        return true;
      }),
    [bookings, filters.location, filters.closeout],
  );

  // Pobierz logi reminderów (jednym query) i mapuj per booking
  const { data: reminderMap = {} } = useQuery({
    queryKey: ["admin-bookings-reminders", bookings.map((b) => b.id).join(",")],
    enabled: bookings.length > 0,
    queryFn: async (): Promise<Record<string, BookingReminders>> => {
      // Wczytujemy wszystkie wpisy email_send_log dla template'ów reminder z ostatnich 60 dni
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("email_send_log")
        .select("message_id, status, created_at, template_name, metadata")
        .in("template_name", ["booking-reminder", "booking-reminder-2h"])
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const map: Record<string, BookingReminders> = {};
      for (const b of bookings) {
        const rows24 = (data ?? []).filter((r: any) => {
          const mid = r.message_id ?? "";
          return r.template_name === "booking-reminder" &&
            (mid.startsWith(`booking-reminder-${b.id}-${b.appointment_date}`) ||
              (r.metadata && (r.metadata as any).booking_id === b.id && (r.metadata as any).variant !== "2h"));
        }) as LogRow[];
        const rows2 = (data ?? []).filter((r: any) => {
          const mid = r.message_id ?? "";
          return r.template_name === "booking-reminder-2h" &&
            (mid.startsWith(`booking-reminder-2h-${b.id}-${b.appointment_date}`) ||
              (r.metadata && (r.metadata as any).booking_id === b.id && (r.metadata as any).variant === "2h"));
        }) as LogRow[];
        map[b.id] = {
          "24h": reduceLogStatus(rows24),
          "2h": reduceLogStatus(rows2),
        };
      }
      return map;
    },
  });

  // Historia tokenów akcji per rezerwacja (kto kliknął "Potwierdź/Odwołaj/Wymaga kontaktu")
  const { data: tokensMap = {} } = useQuery({
    queryKey: ["admin-bookings-action-tokens", bookings.map((b) => b.id).join(",")],
    enabled: bookings.length > 0,
    queryFn: async (): Promise<Record<string, ActionToken[]>> => {
      const ids = bookings.map((b) => b.id);
      const { data, error } = await supabase
        .from("booking_action_tokens")
        .select("id, action, recipient_email, used_at, used_by_email, used_by_ua, used_by_ip, expires_at, created_at, booking_id")
        .in("booking_id", ids)
        .order("used_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      const map: Record<string, ActionToken[]> = {};
      for (const row of (data ?? []) as Array<ActionToken & { booking_id: string }>) {
        if (!map[row.booking_id]) map[row.booking_id] = [];
        const { booking_id: _bid, ...rest } = row;
        map[row.booking_id].push(rest);
      }
      return map;
    },
  });

  // Suma maili per booking — łączny count z email_send_log (dedup po message_id),
  // rozbity per template_name. Liczone z dwóch źródeł:
  //   1) metadata->>booking_id (nowe maile od deploy 2026-04-20)
  //   2) idempotency_key matching pattern dla booking.id (dla starszych logów)
  const { data: emailCountMap = {} } = useQuery({
    queryKey: ["admin-bookings-email-counts", bookings.map((b) => b.id).join(",")],
    enabled: bookings.length > 0,
    queryFn: async (): Promise<Record<string, BookingEmailCounts>> => {
      const ids = bookings.map((b) => b.id);
      const sinceIso = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      const [byMeta, byTemplate] = await Promise.all([
        supabase
          .from("email_send_log")
          .select("message_id, status, created_at, template_name, metadata, recipient_email")
          .in("metadata->>booking_id", ids)
          .gte("created_at", sinceIso),
        // Fallback dla starych logów: szukamy po template_name + idempotency_key zawierającym booking.id
        supabase
          .from("email_send_log")
          .select("message_id, status, created_at, template_name, metadata, recipient_email")
          .gte("created_at", sinceIso)
          .in("template_name", [
            "booking-confirmation",
            "booking-notification",
            "booking-reminder",
            "booking-reminder-2h",
            "booking-status-update",
            "booking-no-show-check",
          ]),
      ]);
      if (byMeta.error) throw byMeta.error;
      if (byTemplate.error) throw byTemplate.error;

      type LogEntry = {
        message_id: string | null;
        status: string;
        created_at: string;
        template_name: string;
        metadata: Record<string, unknown> | null;
        recipient_email: string | null;
      };

      // Merge & dedupe (same row may appear in both queries)
      const seen = new Set<string>();
      const allRows: LogEntry[] = [];
      for (const row of [...(byMeta.data ?? []), ...(byTemplate.data ?? [])] as LogEntry[]) {
        const key = `${row.message_id ?? "?"}|${row.status}|${row.created_at}`;
        if (seen.has(key)) continue;
        seen.add(key);
        allRows.push(row);
      }

      // Group rows per booking_id (via metadata or idempotency_key pattern)
      const byBooking: Record<string, LogEntry[]> = {};
      for (const id of ids) byBooking[id] = [];
      for (const row of allRows) {
        const meta = row.metadata as Record<string, unknown> | null;
        const metaBookingId = meta?.booking_id;
        const idemKey = meta?.idempotency_key;
        let matchedId: string | null = null;
        if (typeof metaBookingId === "string" && byBooking[metaBookingId]) {
          matchedId = metaBookingId;
        } else if (typeof idemKey === "string") {
          for (const id of ids) {
            if (idemKey.includes(id)) {
              matchedId = id;
              break;
            }
          }
        }
        if (matchedId) byBooking[matchedId].push(row);
      }

      // Per booking: dedup po message_id (latest status), agregacja per template
      const result: Record<string, BookingEmailCounts> = {};
      for (const id of ids) {
        const rows = byBooking[id];
        rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestPerMsg = new Map<string, LogEntry>();
        const noMsgRows: LogEntry[] = [];
        for (const r of rows) {
          if (r.message_id) {
            if (!latestPerMsg.has(r.message_id)) latestPerMsg.set(r.message_id, r);
          } else {
            noMsgRows.push(r);
          }
        }
        const unique = [...latestPerMsg.values(), ...noMsgRows];
        const breakdown: EmailBreakdown = {};
        let total = 0, sent = 0, pending = 0, failed = 0;
        for (const r of unique) {
          if (!breakdown[r.template_name]) {
            breakdown[r.template_name] = { sent: 0, pending: 0, failed: 0, total: 0 };
          }
          breakdown[r.template_name].total += 1;
          total += 1;
          if (r.status === "sent") {
            breakdown[r.template_name].sent += 1;
            sent += 1;
          } else if (r.status === "pending") {
            breakdown[r.template_name].pending += 1;
            pending += 1;
          } else if (["dlq", "failed", "bounced", "complained", "suppressed"].includes(r.status)) {
            breakdown[r.template_name].failed += 1;
            failed += 1;
          }
        }
        result[id] = { total, sent, pending, failed, breakdown };
      }
      return result;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status, status_changed_by: session?.user.email ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Status zaktualizowany");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Nie udało się zmienić statusu");
    },
  });

  const toggleOptOut = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ reminder_opt_out: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success(vars.value ? "Reminder wyłączony" : "Reminder włączony");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Nie udało się zmienić opcji");
    },
  });

  const resendReminder = useMutation({
    mutationFn: async ({ bookingId, variant }: { bookingId: string; variant: "24h" | "2h" }) => {
      const { data, error } = await supabase.functions.invoke("resend-booking-reminder", {
        body: { bookingId, variant },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Reminder wysłany ponownie");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["admin-bookings-reminders"] });
      }, 2000);
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e?.message ?? "Nie udało się wysłać reminderu");
    },
    onSettled: () => setResendTarget(null),
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const totalCount = filteredBookings.length;
  const pendingCount = useMemo(
    () => filteredBookings.filter((b) => b.status === "pending").length,
    [filteredBookings],
  );

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" aria-label="Ładowanie" />
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
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Wyloguj
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Panel — Rezerwacje" description="Zarządzanie rezerwacjami wizyt" path="/admin/bookings" />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 py-4 md:px-8 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Panel</Link>
            </Button>
            <h1 className="text-xl font-bold font-serif text-foreground">Rezerwacje</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{session.user.email}</span>
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"
              title={realtimeReady ? "Realtime aktywny — zmiany pojawiają się automatycznie" : "Realtime nieaktywny — odśwież ręcznie"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${realtimeReady ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} aria-hidden />
              {realtimeReady ? "Live" : "Offline"}
            </span>
            <Button variant="ghost" size="sm" onClick={() => refetchBookings()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Odśwież
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Wyloguj
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
          <div className="flex items-center gap-6 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Razem</p>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Oczekujące</p>
              <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
            </div>
          </div>

          <AdminBookingsFilters
            filters={filters}
            onChange={setFilters}
            resultCount={filteredBookings.length}
          />

          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-border bg-card px-6 py-8 text-center space-y-3">
              <p className="text-foreground font-medium">Nie udało się wczytać rezerwacji.</p>
              <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Nieznany błąd"}</p>
              <Button variant="outline" size="sm" onClick={() => refetchBookings()}>Spróbuj ponownie</Button>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Termin</TableHead>
                    <TableHead>Pacjent</TableHead>
                    <TableHead className="hidden md:table-cell">Lokalizacja</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Historia</TableHead>
                    <TableHead>Reminder</TableHead>
                    <TableHead className="hidden xl:table-cell text-center">Maile</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((b) => {
                    const rem = reminderMap[b.id] ?? { "24h": { status: "none", sentAt: null }, "2h": { status: "none", sentAt: null } };
                    const statusInfo = STATUS_BADGE[b.status] ?? STATUS_BADGE.pending;
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="text-sm">
                          <div className="font-medium text-foreground">
                            {new Date(b.appointment_date).toLocaleDateString("pl-PL")}
                          </div>
                          <div className="text-muted-foreground text-xs">{b.appointment_time}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium text-foreground">{b.patient_name}</div>
                          <div className="text-muted-foreground text-xs">{b.patient_email}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[180px] truncate">
                          {b.location}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.className}`}>{statusInfo.label}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <StatusChangeCell
                            bookingId={b.id}
                            changedAt={b.status_changed_at}
                            changedBy={b.status_changed_by}
                            tokens={tokensMap[b.id] ?? []}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <ReminderBadge variant="24h" state={rem["24h"]} />
                            <ReminderBadge variant="2h" state={rem["2h"]} />
                            <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer mt-0.5" title="Pacjent nie chce dostawać przypomnień mailowych">
                              <Switch
                                checked={b.reminder_opt_out}
                                disabled={toggleOptOut.isPending}
                                onCheckedChange={(v) => toggleOptOut.mutate({ id: b.id, value: v })}
                                className="scale-75"
                              />
                              <span>opt-out</span>
                            </label>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-center">
                          <EmailCountCell counts={emailCountMap[b.id]} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {b.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Potwierdź"
                                  onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}
                                >
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Odwołaj"
                                  onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}
                                >
                                  <XCircle className="w-4 h-4 text-destructive" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title={b.reminder_opt_out ? "Pacjent wypisany z reminderów" : "Wyślij reminder 24h ponownie"}
                              disabled={b.reminder_opt_out}
                              onClick={() => setResendTarget({ booking: b, variant: "24h" })}
                            >
                              <Send className="w-4 h-4 text-primary" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredBookings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {bookings.length === 0
                          ? "Brak rezerwacji w wybranym zakresie dat i statusie."
                          : "Brak rezerwacji pasujących do wybranej lokalizacji."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </main>
      </div>

      <AlertDialog open={!!resendTarget} onOpenChange={(open) => !open && setResendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wysłać reminder ponownie?</AlertDialogTitle>
            <AlertDialogDescription>
              {resendTarget && (
                <>
                  Pacjent: <strong>{resendTarget.booking.patient_name}</strong> ({resendTarget.booking.patient_email})
                  <br />
                  Termin: {new Date(resendTarget.booking.appointment_date).toLocaleDateString("pl-PL")} {resendTarget.booking.appointment_time}
                  <br />
                  Wariant: {resendTarget.variant}
                  <br />
                  <span className="text-xs">Wysyłka pominie idempotency guard — pacjent dostanie kolejnego maila niezależnie od poprzednich.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={resendReminder.isPending}
              onClick={() => {
                if (resendTarget) {
                  resendReminder.mutate({ bookingId: resendTarget.booking.id, variant: resendTarget.variant });
                }
              }}
            >
              {resendReminder.isPending ? "Wysyłam…" : "Wyślij"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const ReminderBadge = ({ variant, state }: { variant: "24h" | "2h"; state: ReminderState }) => {
  const config = {
    sent: { icon: CheckCircle2, label: "wysłany", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    pending: { icon: Clock, label: "w kolejce", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    failed: { icon: XCircle, label: "błąd", className: "bg-destructive/20 text-destructive border-destructive/30" },
    none: { icon: Clock, label: "—", className: "bg-muted text-muted-foreground border-border" },
  }[state.status];
  const Icon = config.icon;
  const tooltip = state.sentAt ? new Date(state.sentAt).toLocaleString("pl-PL") : "brak";
  return (
    <Badge variant="outline" className={`${config.className} text-[10px] gap-1 px-1.5 py-0 font-normal w-fit`} title={tooltip}>
      <Icon className="w-3 h-3" />
      <span className="font-semibold">{variant}</span>
      <span>{config.label}</span>
    </Badge>
  );
};

const ACTION_META: Record<ActionToken["action"], { label: string; icon: typeof CheckCircle2; className: string }> = {
  confirm: { label: "Potwierdź", icon: CheckCircle2, className: "text-green-400" },
  cancel: { label: "Odwołaj", icon: XCircle, className: "text-destructive" },
  needs_contact: { label: "Wymaga kontaktu", icon: PhoneCall, className: "text-amber-400" },
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pl-PL"); } catch { return iso; }
};

interface StatusHistoryRow {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string | null;
  source: string;
  note: string | null;
}

const STATUS_HISTORY_LABEL: Record<string, string> = {
  pending: "Oczekująca",
  confirmed: "Potwierdzona",
  cancelled: "Odwołana",
  needs_contact: "Wymaga kontaktu",
  completed: "Zakończona",
};

const STATUS_HISTORY_TONE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
  needs_contact: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  completed: "bg-muted text-muted-foreground border-border",
};

const StatusChangeCell = ({
  bookingId,
  changedAt,
  changedBy,
  tokens,
}: {
  bookingId: string;
  changedAt: string | null;
  changedBy: string | null;
  tokens: ActionToken[];
}) => {
  const [open, setOpen] = useState(false);
  // Real activity = tylko wpisy gdzie used_by_ua nie jest auto-invalidated (czyli klik użytkownika lub explicit POST)
  const realActions = tokens.filter(
    (t) => t.used_at && t.used_by_ua !== "auto-invalidated:sibling-action-used",
  );
  const totalIssued = tokens.length;
  const expiredUnused = tokens.filter(
    (t) => !t.used_at && new Date(t.expires_at).getTime() < Date.now(),
  ).length;

  // Pobierz historię zmian statusu tylko gdy popover otwarty (lazy)
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["booking-status-history", bookingId],
    enabled: open,
    queryFn: async (): Promise<StatusHistoryRow[]> => {
      const { data, error } = await supabase
        .from("booking_status_history")
        .select("id, old_status, new_status, changed_at, changed_by, source, note")
        .eq("booking_id", bookingId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StatusHistoryRow[];
    },
    staleTime: 30_000,
  });

  // Zunifikowany timeline (status changes + token clicks), sortowane malejąco po dacie
  const timeline = useMemo(() => {
    type Item =
      | { kind: "status"; at: string; row: StatusHistoryRow }
      | { kind: "token"; at: string; token: ActionToken };
    const statusItems: Item[] = history.map((h) => ({ kind: "status", at: h.changed_at, row: h }));
    const tokenItems: Item[] = realActions.map((t) => ({ kind: "token", at: t.used_at as string, token: t }));
    return [...statusItems, ...tokenItems].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [history, realActions]);

  return (
    <div className="flex flex-col gap-1.5">
      {changedAt ? (
        <div className="text-xs">
          <div className="text-foreground">{formatDateTime(changedAt)}</div>
          <div className="text-muted-foreground truncate max-w-[180px]" title={changedBy ?? "—"}>
            {changedBy ?? "—"}
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">brak zmian</div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 w-fit">
            <History className="w-3 h-3" />
            Historia{totalIssued > 0 && ` (${realActions.length}/${totalIssued})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-96 max-h-[480px] overflow-y-auto">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Pełna historia rezerwacji</p>
              {totalIssued > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {totalIssued} tokenów wystawionych · {realActions.length} kliknięć ·{" "}
                  {expiredUnused > 0 ? `${expiredUnused} wygasłych nieużytych` : "0 wygasłych"}
                </p>
              )}
            </div>

            {historyLoading && (
              <p className="text-[11px] text-muted-foreground">Ładowanie historii…</p>
            )}

            {!historyLoading && timeline.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MailX className="w-3.5 h-3.5" />
                <span>Brak zarejestrowanych zdarzeń.</span>
              </div>
            )}

            {timeline.length > 0 && (
              <ol className="relative border-l border-border/60 ml-1.5 space-y-3">
                {timeline.map((item, idx) => (
                  <li key={`${item.kind}-${idx}-${item.at}`} className="pl-3 relative">
                    <span
                      className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                        item.kind === "status" ? "bg-primary" : "bg-sky-500"
                      }`}
                      aria-hidden
                    />
                    {item.kind === "status" ? (
                      <StatusHistoryEntry row={item.row} />
                    ) : (
                      <TokenHistoryEntry token={item.token} />
                    )}
                  </li>
                ))}
              </ol>
            )}

            {tokens.some((t) => t.used_by_ua === "auto-invalidated:sibling-action-used") && (
              <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">
                Pozostałe linki z tego maila zostały automatycznie unieważnione po pierwszej akcji.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const StatusHistoryEntry = ({ row }: { row: StatusHistoryRow }) => {
  const oldLabel = row.old_status ? STATUS_HISTORY_LABEL[row.old_status] ?? row.old_status : null;
  const newLabel = STATUS_HISTORY_LABEL[row.new_status] ?? row.new_status;
  const sourceLabel =
    row.source === "admin" ? "admin" : row.source === "patient_link" ? "link z maila" : "system";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
        {oldLabel && (
          <>
            <span className={`px-1.5 py-0.5 rounded border ${STATUS_HISTORY_TONE[row.old_status ?? ""] ?? ""}`}>
              {oldLabel}
            </span>
            <span className="text-muted-foreground">→</span>
          </>
        )}
        <span className={`px-1.5 py-0.5 rounded border ${STATUS_HISTORY_TONE[row.new_status] ?? ""}`}>
          {newLabel}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground">
        <span className="font-semibold">{sourceLabel}</span>
        {row.changed_by && <span> · {row.changed_by}</span>}
        <span> · {formatDateTime(row.changed_at)}</span>
      </div>
      {row.note && <p className="text-[10px] text-muted-foreground italic">{row.note}</p>}
    </div>
  );
};

const TokenHistoryEntry = ({ token }: { token: ActionToken }) => {
  const meta = ACTION_META[token.action];
  const Icon = meta.icon;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs">
        <Icon className={`w-3.5 h-3.5 ${meta.className}`} />
        <span className="font-semibold text-foreground">{meta.label}</span>
        <span className="text-muted-foreground ml-auto text-[10px]">{formatDateTime(token.used_at)}</span>
      </div>
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <div>
          <span className="font-semibold">Kto:</span>{" "}
          {token.used_by_email ?? <em>nie podał maila</em>}
        </div>
        <div>
          <span className="font-semibold">Wysłany do:</span> {token.recipient_email}
        </div>
        {token.used_by_ip && (
          <div className="font-mono">
            <span className="font-semibold not-italic">IP:</span> {token.used_by_ip}
          </div>
        )}
        {token.used_by_ua && (
          <div className="truncate" title={token.used_by_ua}>
            <span className="font-semibold">UA:</span> {token.used_by_ua}
          </div>
        )}
      </div>
    </div>
  );
};

const EMAIL_TEMPLATE_LABEL: Record<string, string> = {
  "booking-confirmation": "Potwierdzenie dla pacjenta",
  "booking-notification": "Powiadomienie do recepcji",
  "booking-reminder": "Reminder 24h",
  "booking-reminder-2h": "Reminder 2h",
  "booking-status-update": "Aktualizacja statusu",
  "booking-no-show-check": "Sprawdzenie no-show",
};

const EmailCountCell = ({ counts }: { counts: BookingEmailCounts | undefined }) => {
  if (!counts || counts.total === 0) {
    return (
      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <Mail className="w-3 h-3" />0
      </span>
    );
  }
  // Color tone based on dominant state
  const tone = counts.failed > 0
    ? "text-destructive border-destructive/40 bg-destructive/10"
    : counts.pending > 0
    ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
    : "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  const entries = Object.entries(counts.breakdown).sort((a, b) => b[1].total - a[1].total);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-6 px-2 text-[11px] gap-1 font-mono ${tone}`}
          title="Kliknij, aby zobaczyć rozbicie per szablon"
        >
          <Mail className="w-3 h-3" />
          {counts.total}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold text-foreground">Maile wysłane dla tej rezerwacji</p>
            <p className="text-[10px] text-muted-foreground">
              {counts.total} unikalnych · {counts.sent} dostarczonych
              {counts.pending > 0 && ` · ${counts.pending} w kolejce`}
              {counts.failed > 0 && ` · ${counts.failed} błędów`}
            </p>
          </div>
          <ul className="space-y-1.5 border-t border-border pt-2">
            {entries.map(([tpl, b]) => (
              <li key={tpl} className="text-[11px] flex items-center gap-2">
                <span className="flex-1 text-foreground truncate" title={tpl}>
                  {EMAIL_TEMPLATE_LABEL[tpl] ?? tpl}
                </span>
                <span className="font-mono text-muted-foreground">{b.total}</span>
                {b.sent > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono" title="dostarczone">
                    ✓{b.sent}
                  </span>
                )}
                {b.pending > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono" title="w kolejce">
                    ⧗{b.pending}
                  </span>
                )}
                {b.failed > 0 && (
                  <span className="text-[10px] text-destructive font-mono" title="błąd / odrzucony">
                    ✗{b.failed}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground italic border-t border-border pt-1.5">
            Liczone z email_send_log (180 dni). Dedup po message_id — jeden mail = jeden wpis.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdminBookings;
