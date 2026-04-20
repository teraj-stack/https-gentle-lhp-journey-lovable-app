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
    queryKey: ["admin-bookings", filters.status, queryFrom, dateRange.to ?? null],
    queryFn: async (): Promise<Booking[]> => {
      let q = supabase
        .from("bookings")
        .select("*")
        .gte("appointment_date", queryFrom)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });
      if (dateRange.to) q = q.lte("appointment_date", dateRange.to);
      if (filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
    enabled: !authLoading && !!session,
  });

  // Location filter applied client-side (location is free-text; uses substring match
  // matching the same patterns as the cron edge function).
  const filteredBookings = useMemo(
    () => bookings.filter((b) => matchesLocation(b.location, filters.location)),
    [bookings, filters.location],
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
            <Button variant="ghost" size="sm" onClick={() => refetchBookings()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Odśwież
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Wyloguj
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
          <div className="flex items-center gap-6 mb-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Razem</p>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Oczekujące</p>
              <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
            </div>
          </div>

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
                    <TableHead className="hidden lg:table-cell">Zmiana statusu</TableHead>
                    <TableHead>Reminder</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => {
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
                  {bookings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Brak rezerwacji w ciągu ostatnich 30 dni.
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

const StatusChangeCell = ({
  changedAt,
  changedBy,
  tokens,
}: {
  changedAt: string | null;
  changedBy: string | null;
  tokens: ActionToken[];
}) => {
  // Real activity = tylko wpisy gdzie used_by_ua nie jest auto-invalidated (czyli klik użytkownika lub explicit POST)
  const realActions = tokens.filter(
    (t) => t.used_at && t.used_by_ua !== "auto-invalidated:sibling-action-used",
  );
  const totalIssued = tokens.length;
  const expiredUnused = tokens.filter(
    (t) => !t.used_at && new Date(t.expires_at).getTime() < Date.now(),
  ).length;

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
      {totalIssued > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 w-fit">
              <History className="w-3 h-3" />
              Historia ({realActions.length}/{totalIssued})
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Akcje recepcji z maila</p>
                <p className="text-[10px] text-muted-foreground">
                  {totalIssued} tokenów wystawionych · {realActions.length} kliknięć ·{" "}
                  {expiredUnused > 0 ? `${expiredUnused} wygasłych nieużytych` : "0 wygasłych"}
                </p>
              </div>
              {realActions.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MailX className="w-3.5 h-3.5" />
                  <span>Nikt nie kliknął w link z maila — status zmieniony ręcznie lub brak zmian.</span>
                </div>
              ) : (
                <ul className="space-y-2">
                  {realActions.map((t) => {
                    const meta = ACTION_META[t.action];
                    const Icon = meta.icon;
                    return (
                      <li key={t.id} className="border border-border rounded-md p-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Icon className={`w-3.5 h-3.5 ${meta.className}`} />
                          <span className="font-semibold text-foreground">{meta.label}</span>
                          <span className="text-muted-foreground ml-auto">{formatDateTime(t.used_at)}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <div>
                            <span className="font-semibold">Kto:</span>{" "}
                            {t.used_by_email ?? <em>nie podał maila</em>}
                          </div>
                          <div>
                            <span className="font-semibold">Wysłany do:</span> {t.recipient_email}
                          </div>
                          {t.used_by_ip && (
                            <div className="font-mono">
                              <span className="font-semibold not-italic">IP:</span> {t.used_by_ip}
                            </div>
                          )}
                          {t.used_by_ua && (
                            <div className="truncate" title={t.used_by_ua}>
                              <span className="font-semibold">UA:</span> {t.used_by_ua}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {tokens.some((t) => t.used_by_ua === "auto-invalidated:sibling-action-used") && (
                <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">
                  Pozostałe linki z tego maila zostały automatycznie unieważnione po pierwszej akcji.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default AdminBookings;
