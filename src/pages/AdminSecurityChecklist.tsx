import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, LogOut, ArrowLeft, Clock, RefreshCw } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";

// Date of the last manual security review reflected in the checklist below.
// Update this whenever you re-verify policies or resolve new findings.
const LAST_SCAN_DATE = "2026-04-23";
// Number of days after which the checklist is considered "stale" and needs review.
const FRESHNESS_DAYS = 30;

type CheckStatus = "pass" | "warn" | "fail";

type SecurityCheck = {
  id: string;
  category: "RLS" | "Realtime" | "Auth" | "Tokens";
  title: string;
  description: string;
  status: CheckStatus;
  detail?: string;
};

// Reflects the current state of the database (manually curated, mirrors RLS
// policies and security findings as of last review). Update when policies change.
const checks: SecurityCheck[] = [
  {
    id: "rls-bookings",
    category: "RLS",
    title: "Tabela bookings — RLS aktywne",
    description: "SELECT/UPDATE/DELETE wyłącznie dla adminów; INSERT tylko service_role.",
    status: "pass",
    detail: "Polityki: 'Admins can view/update/delete bookings' + 'Service role can insert bookings'.",
  },
  {
    id: "rls-user-roles",
    category: "RLS",
    title: "Tabela user_roles — pełna ochrona",
    description: "Wszystkie operacje (SELECT/INSERT/UPDATE/DELETE) wymagają roli admin.",
    status: "pass",
    detail: "Polityka UPDATE dodana w ostatniej iteracji — uszczelniono wektor eskalacji uprawnień.",
  },
  {
    id: "rls-tokens-action",
    category: "Tokens",
    title: "booking_action_tokens — admin-only odczyt",
    description: "Tokeny akcji (potwierdź/anuluj) widoczne tylko dla adminów; pełen dostęp dla service_role.",
    status: "pass",
  },
  {
    id: "rls-tokens-optout",
    category: "Tokens",
    title: "booking_reminder_opt_out_tokens — admin-only odczyt",
    description: "Jednorazowe tokeny rezygnacji z reminderów chronione RLS.",
    status: "pass",
  },
  {
    id: "rls-status-history",
    category: "RLS",
    title: "booking_status_history — admin-only odczyt",
    description: "Historia zmian statusu rezerwacji widoczna wyłącznie dla adminów.",
    status: "pass",
  },
  {
    id: "rls-email-log",
    category: "RLS",
    title: "email_send_log — admin-only odczyt",
    description: "Logi wysyłki maili dostępne tylko dla adminów.",
    status: "pass",
  },
  {
    id: "rls-notification-recipients",
    category: "RLS",
    title: "notification_recipients — admin-only CRUD",
    description: "Pełen CRUD wymaga roli admin; service_role ma osobny pełen dostęp.",
    status: "pass",
  },
  {
    id: "rls-blog",
    category: "RLS",
    title: "blog_posts — publiczne tylko opublikowane",
    description: "Anon/authenticated widzą wpisy z published=true; modyfikacje wymagają admina.",
    status: "pass",
  },
  {
    id: "realtime-bookings",
    category: "Realtime",
    title: "Realtime bookings — egzekwuje RLS",
    description: "Subskrypcje używają postgres_changes (nie Broadcast), więc RLS źródła filtruje payloady na serwerze.",
    status: "pass",
    detail: "Tylko admini otrzymują live updaty. Finding 'bookings_realtime_no_rls' — zignorowany jako mitygowany.",
  },
  {
    id: "auth-rbac",
    category: "Auth",
    title: "RBAC przez has_role()",
    description: "Funkcja security definer has_role() zapobiega rekursji RLS i centralizuje sprawdzenie roli.",
    status: "pass",
  },
  {
    id: "auth-rate-limit",
    category: "Auth",
    title: "Rate limiting publicznych endpointów",
    description: "Edge functions chronione przez check_and_increment_rate_limit + Cloudflare Turnstile.",
    status: "pass",
  },
];

const STATUS_META: Record<CheckStatus, { label: string; icon: typeof CheckCircle2; className: string; badgeClass: string }> = {
  pass: {
    label: "OK",
    icon: CheckCircle2,
    className: "text-emerald-500",
    badgeClass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  },
  warn: {
    label: "Ostrzeżenie",
    icon: AlertTriangle,
    className: "text-yellow-500",
    badgeClass: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  },
  fail: {
    label: "Krytyczne",
    icon: ShieldAlert,
    className: "text-destructive",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

const AdminSecurityChecklist = () => {
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

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

  const passCount = checks.filter((c) => c.status === "pass").length;
  const totalCount = checks.length;
  const allPass = passCount === totalCount;

  return (
    <>
      <SeoHead title="Security Checklist — Admin" description="Status zabezpieczeń RLS i Realtime" path="/admin/security" />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 py-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Panel
            </Button>
            <h1 className="text-xl font-bold font-serif text-foreground">Security Checklist</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Wyloguj
          </Button>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 md:px-8 space-y-6">
          <Card className={allPass ? "border-emerald-500/40" : "border-yellow-500/40"}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-8 h-8 ${allPass ? "text-emerald-500" : "text-yellow-500"}`} />
                <div>
                  <CardTitle className="text-lg">
                    {allPass ? "Wszystkie kontrole przeszły" : "Wymaga uwagi"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {passCount} z {totalCount} kontroli OK
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={allPass ? STATUS_META.pass.badgeClass : STATUS_META.warn.badgeClass}>
                {allPass ? "ZIELONY" : "DO PRZEGLĄDU"}
              </Badge>
            </CardHeader>
          </Card>

          <div className="grid gap-3">
            {checks.map((check) => {
              const meta = STATUS_META[check.status];
              const Icon = meta.icon;
              return (
                <Card key={check.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${meta.className}`} aria-hidden />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-foreground">{check.title}</h3>
                          <Badge variant="outline" className="text-xs">{check.category}</Badge>
                          <Badge variant="outline" className={`text-xs ${meta.badgeClass}`}>
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{check.description}</p>
                        {check.detail && (
                          <p className="text-xs text-muted-foreground/80 mt-2 italic">{check.detail}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center pt-4">
            Status statyczny — odzwierciedla aktualny stan polityk RLS i findings z ostatniego skanu.
            Pełen audyt: panel Lovable Cloud → Security.
          </p>
        </main>
      </div>
    </>
  );
};

export default AdminSecurityChecklist;
