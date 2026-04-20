import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, User, Mail, Cog, Link2, CheckCircle2, XCircle, PhoneCall, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  bookingId: string;
  /** Optional last known status change for compact summary in trigger button */
  lastChangedAt?: string | null;
  lastChangedBy?: string | null;
}

interface HistoryRow {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string | null;
  source: string;
  note: string | null;
}

interface TokenRow {
  id: string;
  action: "confirm" | "cancel" | "needs_contact";
  recipient_email: string;
  used_at: string | null;
  used_by_email: string | null;
  used_by_ip: string | null;
  expires_at: string;
  created_at: string;
}

type TimelineEvent =
  | {
      kind: "status";
      at: string;
      oldStatus: string | null;
      newStatus: string;
      changedBy: string | null;
      source: string;
      note: string | null;
    }
  | {
      kind: "token_used";
      at: string;
      action: TokenRow["action"];
      usedByEmail: string | null;
      usedByIp: string | null;
      recipientEmail: string;
    };

const STATUS_LABEL: Record<string, string> = {
  pending: "Oczekująca",
  confirmed: "Potwierdzona",
  cancelled: "Odwołana",
  needs_contact: "Wymaga kontaktu",
  completed: "Zakończona",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
  needs_contact: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  completed: "bg-muted text-muted-foreground border-border",
};

const ACTION_LABEL: Record<TokenRow["action"], string> = {
  confirm: "Potwierdzenie z maila",
  cancel: "Odwołanie z maila",
  needs_contact: "Oznaczono „wymaga kontaktu” z maila",
};

const ACTION_ICON: Record<TokenRow["action"], typeof CheckCircle2> = {
  confirm: CheckCircle2,
  cancel: XCircle,
  needs_contact: PhoneCall,
};

function formatPL(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shortRelative(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diffMs / 86_400_000);
    if (days <= 0) return "dziś";
    if (days === 1) return "wczoraj";
    if (days < 7) return `${days} dni temu`;
    if (days < 30) return `${Math.floor(days / 7)} tyg. temu`;
    return `${Math.floor(days / 30)} mies. temu`;
  } catch {
    return "";
  }
}

const SourceIcon = ({ source }: { source: string }) => {
  if (source === "admin") return <User className="w-3 h-3" aria-label="admin" />;
  if (source === "patient_link") return <Link2 className="w-3 h-3" aria-label="link z maila" />;
  return <Cog className="w-3 h-3" aria-label="system" />;
};

const BookingStatusHistoryPopover = ({ bookingId, lastChangedAt, lastChangedBy }: Props) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking-history", bookingId],
    queryFn: async () => {
      const [historyRes, tokensRes] = await Promise.all([
        supabase
          .from("booking_status_history")
          .select("*")
          .eq("booking_id", bookingId)
          .order("changed_at", { ascending: false }),
        supabase
          .from("booking_action_tokens")
          .select("id, action, recipient_email, used_at, used_by_email, used_by_ip, expires_at, created_at")
          .eq("booking_id", bookingId)
          .not("used_at", "is", null)
          .order("used_at", { ascending: false }),
      ]);
      if (historyRes.error) throw historyRes.error;
      if (tokensRes.error) throw tokensRes.error;
      return {
        history: (historyRes.data ?? []) as HistoryRow[],
        tokens: (tokensRes.data ?? []) as TokenRow[],
      };
    },
    staleTime: 30_000,
  });

  const events = useMemo<TimelineEvent[]>(() => {
    if (!data) return [];
    const statusEvents: TimelineEvent[] = data.history.map((h) => ({
      kind: "status",
      at: h.changed_at,
      oldStatus: h.old_status,
      newStatus: h.new_status,
      changedBy: h.changed_by,
      source: h.source,
      note: h.note,
    }));
    const tokenEvents: TimelineEvent[] = data.tokens
      .filter((t) => t.used_at)
      .map((t) => ({
        kind: "token_used",
        at: t.used_at as string,
        action: t.action,
        usedByEmail: t.used_by_email,
        usedByIp: t.used_by_ip,
        recipientEmail: t.recipient_email,
      }));
    return [...statusEvents, ...tokenEvents].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [data]);

  const triggerHint = lastChangedAt
    ? `${shortRelative(lastChangedAt)}${lastChangedBy ? ` • ${lastChangedBy}` : ""}`
    : "—";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 -ml-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="w-3.5 h-3.5 mr-1.5" />
          <span className="hidden xl:inline">{triggerHint}</span>
          <span className="xl:hidden">Historia</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="border-b border-border px-4 py-2.5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Historia zmian statusu
          </p>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-4">
          {isLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 animate-pulse" /> Ładowanie historii…
            </p>
          )}
          {isError && (
            <p className="text-xs text-destructive">Nie udało się załadować historii.</p>
          )}
          {!isLoading && !isError && events.length === 0 && (
            <p className="text-xs text-muted-foreground">Brak zdarzeń w historii.</p>
          )}

          {events.length > 0 && (
            <ol className="relative border-l border-border/60 ml-2 space-y-4">
              {events.map((ev, i) => (
                <li key={`${ev.kind}-${i}-${ev.at}`} className="pl-4 relative">
                  <span
                    className={cn(
                      "absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-background",
                      ev.kind === "status" ? "bg-primary" : "bg-sky-500",
                    )}
                    aria-hidden
                  />
                  <TimelineItem event={ev} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const TimelineItem = ({ event }: { event: TimelineEvent }) => {
  if (event.kind === "status") {
    const newLabel = STATUS_LABEL[event.newStatus] ?? event.newStatus;
    const oldLabel = event.oldStatus
      ? STATUS_LABEL[event.oldStatus] ?? event.oldStatus
      : null;
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {oldLabel && (
            <>
              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", STATUS_TONE[event.oldStatus ?? ""])}>
                {oldLabel}
              </Badge>
              <span className="text-muted-foreground text-xs">→</span>
            </>
          )}
          <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", STATUS_TONE[event.newStatus])}>
            {newLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <SourceIcon source={event.source} />
          <span>
            {event.changedBy ?? (event.source === "system" ? "system" : "—")}
          </span>
          <span>•</span>
          <time>{formatPL(event.at)}</time>
        </div>
        {event.note && (
          <p className="text-[11px] text-muted-foreground italic">{event.note}</p>
        )}
      </div>
    );
  }

  // token_used event
  const Icon = ACTION_ICON[event.action];
  const label = ACTION_LABEL[event.action];
  const who = event.usedByEmail || event.recipientEmail;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-foreground">
        <Icon className="w-3.5 h-3.5 text-sky-400" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
        <Mail className="w-3 h-3" />
        <span>{who}</span>
        {event.usedByIp && (
          <>
            <span>•</span>
            <span className="font-mono text-[10px]">{event.usedByIp}</span>
          </>
        )}
        <span>•</span>
        <time>{formatPL(event.at)}</time>
      </div>
    </div>
  );
};

export default BookingStatusHistoryPopover;
