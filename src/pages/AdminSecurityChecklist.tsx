import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  ArrowLeft,
  Clock,
  RefreshCw,
  Loader2,
  PlayCircle,
  Pencil,
  Plus,
  Trash2,
  ChevronDown,
  Copy,
  FileCode2,
  Download,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import SeoHead from "@/components/shared/SeoHead";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type ServerExportPhase = "idle" | "preparing" | "authenticating" | "uploading" | "generating" | "downloading" | "done";

const PHASE_META: Record<Exclude<ServerExportPhase, "idle">, { label: string; value: number }> = {
  preparing: { label: "Przygotowuję dane…", value: 15 },
  authenticating: { label: "Weryfikuję sesję…", value: 30 },
  uploading: { label: "Wysyłam zapytanie…", value: 45 },
  generating: { label: "Renderuję PDF na serwerze…", value: 70 },
  downloading: { label: "Pobieram plik…", value: 90 },
  done: { label: "Gotowe", value: 100 },
};

// Date of the last manual security review reflected in the checklist below.
// Update this whenever you re-verify policies or resolve new findings.
const LAST_SCAN_DATE = "2026-04-23";
// Number of days after which the checklist is considered "stale" and needs review.
const FRESHNESS_DAYS = 30;

type DbStatus = "pass" | "warn" | "fail";
type CheckStatus = DbStatus | "running" | "unknown";
type Category = "RLS" | "Realtime" | "Auth" | "Tokens";

type AuditResult = { status: DbStatus; detail?: string };

type PolicyRef = {
  name: string;
  table: string;
  sql?: string;
};

type ChecklistRow = {
  id: string;
  slug: string;
  category: Category;
  title: string;
  description: string;
  status: DbStatus;
  detail: string | null;
  sort_order: number;
  policies: PolicyRef[];
};

type DisplayCheck = ChecklistRow & {
  liveStatus: CheckStatus;
  liveDetail?: string;
  audit?: () => Promise<AuditResult>;
};

/**
 * Generic helper: a SELECT against an admin-only table should succeed for the
 * current admin session. Errors indicate misconfigured RLS for the admin path.
 */
async function probeAdminReadable(table: string): Promise<AuditResult> {
  const { error } = await supabase
    .from(table as never)
    .select("*", { count: "exact", head: true });
  if (error) {
    return { status: "fail", detail: `Admin SELECT na ${table} zwrócił błąd: ${error.message}` };
  }
  return { status: "pass", detail: `Admin SELECT na ${table} dozwolony (RLS OK).` };
}

// Map slug -> live audit probe. Items not in this map are "static" (no live check).
const AUDITS: Record<string, () => Promise<AuditResult>> = {
  "rls-bookings": () => probeAdminReadable("bookings"),
  "rls-user-roles": () => probeAdminReadable("user_roles"),
  "rls-tokens-action": () => probeAdminReadable("booking_action_tokens"),
  "rls-tokens-optout": () => probeAdminReadable("booking_reminder_opt_out_tokens"),
  "rls-status-history": () => probeAdminReadable("booking_status_history"),
  "rls-email-log": () => probeAdminReadable("email_send_log"),
  "rls-notification-recipients": () => probeAdminReadable("notification_recipients"),
  "rls-blog": () => probeAdminReadable("blog_posts"),
  "auth-rbac": async () => {
    const { data, error } = await supabase.rpc("has_role", { _role: "admin" });
    if (error) return { status: "fail", detail: `RPC has_role() błąd: ${error.message}` };
    if (data === true) return { status: "pass", detail: "has_role('admin') = true dla bieżącej sesji." };
    return { status: "warn", detail: "has_role('admin') zwróciło false — sesja nie jest adminem." };
  },
  "auth-rate-limit": async () => {
    const { error } = await supabase.rpc("check_and_increment_rate_limit", {
      p_endpoint: "self-audit-probe",
      p_ip: "0.0.0.0",
      p_max: 1_000_000,
      p_window_sec: 60,
    });
    if (error) return { status: "fail", detail: `RPC rate limiter błąd: ${error.message}` };
    return { status: "pass", detail: "RPC check_and_increment_rate_limit dostępne." };
  },
};

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
  running: {
    label: "Sprawdzanie…",
    icon: Loader2,
    className: "text-muted-foreground animate-spin",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  unknown: {
    label: "Brak audytu",
    icon: AlertTriangle,
    className: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

const CATEGORIES: Category[] = ["RLS", "Realtime", "Auth", "Tokens"];
const STATUSES: DbStatus[] = ["pass", "warn", "fail"];

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: ChecklistRow };

const emptyForm = {
  slug: "",
  category: "RLS" as Category,
  title: "",
  description: "",
  status: "pass" as DbStatus,
  detail: "",
  sort_order: 0,
  policiesJson: "[]",
};

function policiesToText(p: PolicyRef[]): string {
  return JSON.stringify(p, null, 2);
}

async function copyToClipboard(text: string, label = "Skopiowano") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Nie udało się skopiować");
  }
}

const AdminSecurityChecklist = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [liveStatus, setLiveStatus] = useState<Record<string, { status: CheckStatus; detail?: string }>>({});
  const [loadingRows, setLoadingRows] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [lastAuditAt, setLastAuditAt] = useState<Date | null>(null);

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ChecklistRow | null>(null);

  // PDF export filter dialog state
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfStatuses, setPdfStatuses] = useState<DbStatus[]>(["pass", "warn", "fail"]);
  const [pdfCategory, setPdfCategory] = useState<Category | "ALL">("ALL");
  const [exportingServer, setExportingServer] = useState(false);
  const [serverPhase, setServerPhase] = useState<ServerExportPhase>("idle");
  const togglePdfStatus = (s: DbStatus, checked: boolean) => {
    setPdfStatuses((prev) => (checked ? [...new Set([...prev, s])] : prev.filter((x) => x !== s)));
  };

  // Auth bootstrap
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

  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    const { data, error } = await supabase
      .from("security_checklist_items")
      .select("id, slug, category, title, description, status, detail, sort_order, policies")
      .order("sort_order", { ascending: true })
      .order("slug", { ascending: true });
    if (error) {
      toast.error(`Nie udało się załadować checklisty: ${error.message}`);
      setRows([]);
    } else {
      setRows(
        (data ?? []).map((r) => {
          const raw = r as { policies?: unknown } & Omit<ChecklistRow, "policies">;
          return {
            ...raw,
            policies: Array.isArray(raw.policies) ? (raw.policies as unknown as PolicyRef[]) : [],
          } satisfies ChecklistRow;
        }),
      );
    }
    setLoadingRows(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadRows();
  }, [isAdmin, loadRows]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const runSelfAudit = useCallback(async () => {
    setAuditing(true);
    const next: Record<string, { status: CheckStatus; detail?: string }> = {};
    rows.forEach((r) => {
      if (AUDITS[r.slug]) next[r.slug] = { status: "running" };
    });
    setLiveStatus(next);

    const results = await Promise.all(
      rows.map(async (r) => {
        const fn = AUDITS[r.slug];
        if (!fn) return { slug: r.slug, result: null as AuditResult | null };
        try {
          return { slug: r.slug, result: await fn() };
        } catch (err) {
          return {
            slug: r.slug,
            result: { status: "fail" as DbStatus, detail: `Wyjątek: ${err instanceof Error ? err.message : String(err)}` },
          };
        }
      }),
    );

    const final: Record<string, { status: CheckStatus; detail?: string }> = {};
    results.forEach(({ slug, result }) => {
      if (result) final[slug] = { status: result.status, detail: result.detail };
    });
    setLiveStatus(final);
    setLastAuditAt(new Date());
    setAuditing(false);

    const failed = results.filter((r) => r.result?.status === "fail").length;
    const warned = results.filter((r) => r.result?.status === "warn").length;
    if (failed > 0) toast.error(`Self-audit: ${failed} kontrol(i) krytycznych`);
    else if (warned > 0) toast.warning(`Self-audit: ${warned} ostrzeżeń`);
    else toast.success("Self-audit zakończony — wszystkie kontrole OK");
  }, [rows]);

  const exportPdf = useCallback((opts?: { statuses?: DbStatus[]; category?: Category | "ALL" }) => {
    const allowedStatuses = new Set<DbStatus>(opts?.statuses && opts.statuses.length > 0 ? opts.statuses : STATUSES);
    const categoryFilter = opts?.category ?? "ALL";
    if (rows.length === 0) {
      toast.error("Brak pozycji do eksportu");
      return;
    }
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const generatedAt = new Date();
      const lastScanLocal = new Date(LAST_SCAN_DATE);
      const daysSince = Math.floor((Date.now() - lastScanLocal.getTime()) / (1000 * 60 * 60 * 24));
      const formattedScan = lastScanLocal.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
      const dayLabelLocal = daysSince === 0 ? "dzisiaj" : daysSince === 1 ? "1 dzien temu" : `${daysSince} dni temu`;

      // Recompute display data locally so the PDF reflects what's on screen.
      const allChecks = rows.map((r) => {
        const live = liveStatus[r.slug];
        return {
          ...r,
          liveStatus: (live?.status ?? r.status) as CheckStatus,
          liveDetail: live?.detail,
        };
      });
      const checks = allChecks.filter((c) => {
        const statusOk = (c.liveStatus === "pass" || c.liveStatus === "warn" || c.liveStatus === "fail")
          ? allowedStatuses.has(c.liveStatus as DbStatus)
          : true; // include unknown/running rows defensively
        const categoryOk = categoryFilter === "ALL" || c.category === categoryFilter;
        return statusOk && categoryOk;
      });
      if (checks.length === 0) {
        toast.error("Brak pozycji pasujacych do filtra");
        return;
      }
      const pass = checks.filter((c) => c.liveStatus === "pass").length;
      const fail = checks.filter((c) => c.liveStatus === "fail").length;
      const warn = checks.filter((c) => c.liveStatus === "warn").length;
      const overall = fail > 0 ? "WYMAGA UWAGI" : warn > 0 ? "DO PRZEGLĄDU" : "ZIELONY";
      const filterLabel = `Filtr: ${categoryFilter === "ALL" ? "wszystkie kategorie" : categoryFilter} · statusy: ${[...allowedStatuses].map((s) => s.toUpperCase()).join("/")}`;

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Raport bezpieczenstwa — CML", margin, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Wygenerowano: ${generatedAt.toLocaleString("pl-PL")}`, margin, 68);
      doc.text(`Ostatni przeglad checklisty: ${formattedScan} (${dayLabelLocal})`, margin, 82);
      if (lastAuditAt) {
        doc.text(`Ostatni self-audit: ${lastAuditAt.toLocaleString("pl-PL")}`, margin, 96);
      }

      // Summary box
      const summaryY = lastAuditAt ? 116 : 102;
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, summaryY, pageWidth - margin * 2, 76, 6, 6, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 20);
      doc.text(`Status ogolny: ${overall}`, margin + 14, summaryY + 22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(
        `OK: ${pass}    Ostrzezenia: ${warn}    Krytyczne: ${fail}    Lacznie: ${checks.length} z ${allChecks.length}`,
        margin + 14,
        summaryY + 42,
      );
      doc.setTextColor(90, 90, 90);
      doc.setFontSize(9);
      doc.text(filterLabel, margin + 14, summaryY + 60);

      // Table
      const statusLabel = (s: CheckStatus) =>
        s === "pass" ? "OK" : s === "warn" ? "WARN" : s === "fail" ? "FAIL" : s === "running" ? "..." : "?";

      // Soft-wrap long unbroken tokens (e.g. SQL identifiers, URLs) so jspdf-autotable
      // can break them across lines instead of overflowing the cell.
      const softWrap = (text: string, max = 60): string =>
        text
          .split("\n")
          .map((line) =>
            line
              .split(" ")
              .map((token) => {
                if (token.length <= max) return token;
                const chunks: string[] = [];
                for (let i = 0; i < token.length; i += max) chunks.push(token.slice(i, i + max));
                return chunks.join("\n");
              })
              .join(" "),
          )
          .join("\n");

      const formatPoliciesText = (policies: PolicyRef[]) => {
        if (!policies || policies.length === 0) return "Brak powiazanych polityk RLS.";
        return policies
          .map((p, idx) => {
            const header = softWrap(`${idx + 1}. ${p.name}  [tabela: ${p.table}]`, 70);
            const sql = p.sql ? `\nSQL:\n${softWrap(p.sql, 70)}` : "";
            return `${header}${sql}`;
          })
          .join("\n\n");
      };

      autoTable(doc, {
        startY: summaryY + 100,
        margin: { left: margin, right: margin, bottom: 50 },
        head: [["#", "Kategoria", "Kontrola", "Status", "Szczegoly"]],
        body: checks.flatMap((c, i) => {
          const detailText = softWrap(c.liveDetail || c.detail || c.description, 80);
          const titleText = softWrap(c.title, 40);
          const policiesText = formatPoliciesText(c.policies);
          return [
            [
              String(i + 1),
              c.category,
              titleText,
              statusLabel(c.liveStatus),
              detailText,
            ],
            [
              { content: "", colSpan: 1, styles: { fillColor: [250, 250, 250] } },
              {
                content: `Powiazane polityki RLS (${c.policies?.length ?? 0}):\n\n${policiesText}`,
                colSpan: 4,
                styles: {
                  font: "courier",
                  fontSize: 7.5,
                  textColor: [40, 40, 40],
                  fillColor: [248, 248, 248],
                  cellPadding: { top: 8, right: 10, bottom: 10, left: 10 },
                  lineColor: [220, 220, 220],
                  lineWidth: 0.25,
                  minCellHeight: 24,
                },
              },
            ],
          ];
        }),
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
          valign: "top",
          overflow: "linebreak",
          lineColor: [225, 225, 225],
          lineWidth: 0.25,
          minCellHeight: 18,
        },
        headStyles: {
          fillColor: [33, 33, 33],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
        },
        bodyStyles: { textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: {
          0: { cellWidth: 22, halign: "right", textColor: [120, 120, 120] },
          1: { cellWidth: 58 },
          2: { cellWidth: 120, fontStyle: "bold" },
          3: { cellWidth: 46, halign: "center", fontStyle: "bold" },
          4: { cellWidth: "auto" },
        },
        rowPageBreak: "avoid",
        didParseCell: (data) => {
          // Status color only on the primary row (every even body row index: 0,2,4...).
          if (data.section === "body" && data.column.index === 3 && data.row.index % 2 === 0) {
            const checkIdx = data.row.index / 2;
            const raw = checks[checkIdx]?.liveStatus;
            if (raw === "pass") data.cell.styles.textColor = [21, 128, 61];
            else if (raw === "warn") data.cell.styles.textColor = [161, 98, 7];
            else if (raw === "fail") data.cell.styles.textColor = [185, 28, 28];
          }
        },
      });

      // Footer (page numbers)
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text(
          `CML — Security Report · str. ${p}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 20,
          { align: "center" },
        );
      }

      const stamp = generatedAt.toISOString().slice(0, 10);
      const catSuffix = categoryFilter === "ALL" ? "all" : categoryFilter.toLowerCase();
      const stSuffix = [...allowedStatuses].sort().join("-");
      doc.save(`cml-security-report-${stamp}-${catSuffix}-${stSuffix}.pdf`);
      toast.success(`Raport PDF pobrany (${checks.length} pozycji)`);
    } catch (err) {
      toast.error(`Nie udalo sie wygenerowac PDF: ${err instanceof Error ? err.message : "blad"}`);
    }
  }, [rows, liveStatus, lastAuditAt]);

  // Server-side PDF export — same payload, rendered with pdf-lib for crisp wrapping.
  const exportPdfServer = useCallback(
    async (opts?: { statuses?: DbStatus[]; category?: Category | "ALL" }) => {
      if (rows.length === 0) {
        toast.error("Brak pozycji do eksportu");
        return;
      }
      const allowedStatuses = new Set<DbStatus>(opts?.statuses && opts.statuses.length > 0 ? opts.statuses : STATUSES);
      const categoryFilter = opts?.category ?? "ALL";

      const allChecks = rows.map((r) => {
        const live = liveStatus[r.slug];
        return {
          slug: r.slug,
          category: r.category,
          title: r.title,
          description: r.description,
          detail: r.detail,
          policies: r.policies,
          status: (live?.status ?? r.status) as CheckStatus,
        };
      });
      const checks = allChecks.filter((c) => {
        const sOk = (c.status === "pass" || c.status === "warn" || c.status === "fail")
          ? allowedStatuses.has(c.status as DbStatus)
          : true;
        const cOk = categoryFilter === "ALL" || c.category === categoryFilter;
        return sOk && cOk;
      });
      if (checks.length === 0) {
        toast.error("Brak pozycji pasujacych do filtra");
        return;
      }
      const counts = {
        pass: checks.filter((c) => c.status === "pass").length,
        warn: checks.filter((c) => c.status === "warn").length,
        fail: checks.filter((c) => c.status === "fail").length,
        total: checks.length,
        allTotal: allChecks.length,
      };
      const overall = counts.fail > 0 ? "WYMAGA UWAGI" : counts.warn > 0 ? "DO PRZEGLĄDU" : "ZIELONY";
      const filterLabel = `Filtr: ${categoryFilter === "ALL" ? "wszystkie kategorie" : categoryFilter} · statusy: ${[...allowedStatuses].map((s) => s.toUpperCase()).join("/")}`;
      const stamp = new Date().toISOString().slice(0, 10);
      const catSuffix = categoryFilter === "ALL" ? "all" : categoryFilter.toLowerCase();
      const stSuffix = [...allowedStatuses].sort().join("-");
      const filename = `cml-security-report-${stamp}-${catSuffix}-${stSuffix}-server.pdf`;

      setExportingServer(true);
      setServerPhase("preparing");
      try {
        // tiny delay so the user sees the first phase even on fast networks
        await new Promise((r) => setTimeout(r, 120));
        setServerPhase("authenticating");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Brak sesji — zaloguj się ponownie");
          return;
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        setServerPhase("uploading");
        const fetchPromise = fetch(`${supabaseUrl}/functions/v1/export-security-report-pdf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: anonKey,
          },
          body: JSON.stringify({
            checks,
            meta: {
              generatedAt: new Date().toLocaleString("pl-PL"),
              lastScanDate: new Date(LAST_SCAN_DATE).toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" }),
              lastAuditAt: lastAuditAt ? lastAuditAt.toLocaleString("pl-PL") : null,
              filterLabel,
              overall,
              counts,
            },
            filename,
          }),
        });
        // promote to "generating" once request is in flight
        const generatingTimer = setTimeout(() => setServerPhase("generating"), 400);
        const res = await fetchPromise;
        clearTimeout(generatingTimer);
        if (!res.ok) {
          // Try to extract a meaningful message from the response body.
          // Supports: { error: "..." } | { error: { fieldErrors: {...} } } | { message: "..." } | plain text
          let title = `Eksport serwerowy nieudany (HTTP ${res.status})`;
          let description: string | undefined;
          const raw = await res.text().catch(() => "");
          if (raw) {
            try {
              const j = JSON.parse(raw);
              const errVal = j?.error ?? j?.message ?? j?.msg;
              if (typeof errVal === "string") {
                description = errVal;
              } else if (errVal && typeof errVal === "object") {
                // zod-style fieldErrors / formErrors
                const fieldErrors = (errVal as { fieldErrors?: Record<string, string[]> }).fieldErrors;
                const formErrors = (errVal as { formErrors?: string[] }).formErrors;
                const parts: string[] = [];
                if (formErrors?.length) parts.push(formErrors.join("; "));
                if (fieldErrors) {
                  for (const [field, msgs] of Object.entries(fieldErrors)) {
                    if (Array.isArray(msgs) && msgs.length) parts.push(`${field}: ${msgs.join(", ")}`);
                  }
                }
                description = parts.length ? parts.join(" • ") : JSON.stringify(errVal).slice(0, 400);
              }
            } catch {
              // not JSON — use raw text (trimmed)
              description = raw.trim().slice(0, 400);
            }
          }
          // Friendlier title for common auth statuses
          if (res.status === 401) title = "Brak autoryzacji — zaloguj się ponownie";
          else if (res.status === 403) title = "Brak uprawnień (wymagana rola admin)";
          else if (res.status === 400) title = "Nieprawidłowe dane wejściowe";
          else if (res.status === 429) title = "Zbyt wiele zapytań — spróbuj za chwilę";
          else if (res.status >= 500) title = `Błąd serwera (HTTP ${res.status})`;
          toast.error(title, description ? { description, duration: 8000 } : undefined);
          return;
        }
        setServerPhase("downloading");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setServerPhase("done");
        toast.success(`Raport PDF (server) pobrany — ${counts.total} pozycji`);
      } catch (err) {
        toast.error(`Eksport serwerowy nieudany: ${err instanceof Error ? err.message : "blad"}`);
      } finally {
        setExportingServer(false);
        // brief hold on "done" before resetting so user sees 100%
        setTimeout(() => setServerPhase("idle"), 600);
      }
    },
    [rows, liveStatus, lastAuditAt],
  );

  const openCreate = () => {
    setForm({ ...emptyForm, sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 10 });
    setEditor({ mode: "create" });
  };

  const openEdit = (row: ChecklistRow) => {
    setForm({
      slug: row.slug,
      category: row.category,
      title: row.title,
      description: row.description,
      status: row.status,
      detail: row.detail ?? "",
      sort_order: row.sort_order,
      policiesJson: policiesToText(row.policies),
    });
    setEditor({ mode: "edit", row });
  };

  const closeEditor = () => setEditor({ mode: "closed" });

  const submitForm = async () => {
    if (!form.slug.trim() || !form.title.trim() || !form.description.trim()) {
      toast.error("Slug, tytuł i opis są wymagane");
      return;
    }
    let parsedPolicies: PolicyRef[] = [];
    if (form.policiesJson.trim()) {
      try {
        const parsed = JSON.parse(form.policiesJson);
        if (!Array.isArray(parsed)) throw new Error("oczekiwana tablica");
        parsedPolicies = parsed.map((p: unknown) => {
          const obj = p as Partial<PolicyRef>;
          if (!obj.name || !obj.table) throw new Error("każda polityka wymaga 'name' i 'table'");
          return { name: String(obj.name), table: String(obj.table), sql: obj.sql ? String(obj.sql) : undefined };
        });
      } catch (err) {
        toast.error(`Polityki – błędny JSON: ${err instanceof Error ? err.message : "parse error"}`);
        return;
      }
    }
    setSaving(true);
    const payload = {
      slug: form.slug.trim(),
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      detail: form.detail.trim() || null,
      sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
      policies: parsedPolicies as unknown as never,
    };

    if (editor.mode === "create") {
      const { error } = await supabase.from("security_checklist_items").insert(payload);
      if (error) {
        toast.error(`Błąd zapisu: ${error.message}`);
        setSaving(false);
        return;
      }
      toast.success("Pozycja dodana");
    } else if (editor.mode === "edit") {
      const { error } = await supabase
        .from("security_checklist_items")
        .update(payload)
        .eq("id", editor.row.id);
      if (error) {
        toast.error(`Błąd zapisu: ${error.message}`);
        setSaving(false);
        return;
      }
      toast.success("Pozycja zaktualizowana");
    }
    setSaving(false);
    closeEditor();
    await loadRows();
  };

  const updateStatus = async (row: ChecklistRow, status: DbStatus) => {
    // Optimistic update.
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    const { error } = await supabase
      .from("security_checklist_items")
      .update({ status })
      .eq("id", row.id);
    if (error) {
      toast.error(`Nie udało się zmienić statusu: ${error.message}`);
      await loadRows();
    } else {
      toast.success(`Status: ${STATUS_META[status].label}`);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("security_checklist_items")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) {
      toast.error(`Błąd usuwania: ${error.message}`);
    } else {
      toast.success("Pozycja usunięta");
      await loadRows();
    }
    setConfirmDelete(null);
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

  // Build display checks: live status (when audit ran) takes precedence over DB status.
  const displayChecks: DisplayCheck[] = rows.map((r) => {
    const live = liveStatus[r.slug];
    return {
      ...r,
      audit: AUDITS[r.slug],
      liveStatus: live?.status ?? r.status,
      liveDetail: live?.detail,
    };
  });

  const passCount = displayChecks.filter((c) => c.liveStatus === "pass").length;
  const failCount = displayChecks.filter((c) => c.liveStatus === "fail").length;
  const totalCount = displayChecks.length;
  const allPass = totalCount > 0 && passCount === totalCount;

  const lastScan = new Date(LAST_SCAN_DATE);
  const daysSinceScan = Math.floor((Date.now() - lastScan.getTime()) / (1000 * 60 * 60 * 24));
  const isFresh = daysSinceScan <= FRESHNESS_DAYS;
  const formattedDate = lastScan.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
  const dayLabel = daysSinceScan === 0 ? "dzisiaj" : daysSinceScan === 1 ? "1 dzień temu" : `${daysSinceScan} dni temu`;
  const healthy = allPass && isFresh && failCount === 0;

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
          <Card className={healthy ? "border-emerald-500/40" : "border-yellow-500/40"}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-8 h-8 ${healthy ? "text-emerald-500" : "text-yellow-500"}`} />
                <div>
                  <CardTitle className="text-lg">
                    {healthy ? "Wszystkie kontrole przeszły" : allPass ? "Checklist wymaga odświeżenia" : "Wymaga uwagi"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {passCount} z {totalCount} kontroli OK
                    {failCount > 0 && ` · ${failCount} krytyczne`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-1" /> Nowa pozycja
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPdfDialogOpen(true)} disabled={rows.length === 0}>
                  <Download className="w-4 h-4 mr-1" /> Pobierz PDF
                </Button>
                <Button size="sm" variant="default" onClick={runSelfAudit} disabled={auditing || rows.length === 0}>
                  {auditing ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Audyt…</>
                  ) : (
                    <><PlayCircle className="w-4 h-4 mr-1" /> Self-audit</>
                  )}
                </Button>
                <Badge variant="outline" className={healthy ? STATUS_META.pass.badgeClass : STATUS_META.warn.badgeClass}>
                  {healthy ? "ZIELONY" : "DO PRZEGLĄDU"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-2 flex-wrap text-sm border-t border-border pt-4">
                <Clock className={`w-4 h-4 ${isFresh ? "text-muted-foreground" : "text-yellow-500"}`} aria-hidden />
                <span className="text-muted-foreground">Ostatni przegląd:</span>
                <span className="text-foreground font-medium">{formattedDate}</span>
                <span className="text-muted-foreground">({dayLabel})</span>
                <Badge variant="outline" className={`ml-auto ${isFresh ? STATUS_META.pass.badgeClass : STATUS_META.warn.badgeClass}`}>
                  {isFresh ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Aktualny</>
                  ) : (
                    <><RefreshCw className="w-3 h-3 mr-1" /> Wymaga przeglądu (&gt;{FRESHNESS_DAYS} dni)</>
                  )}
                </Badge>
              </div>
              {lastAuditAt && (
                <p className="text-xs text-muted-foreground">
                  Ostatni self-audit: {lastAuditAt.toLocaleString("pl-PL")}
                </p>
              )}
            </CardContent>
          </Card>

          {loadingRows ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayChecks.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                Brak pozycji. Dodaj pierwszą kontrolę przyciskiem „Nowa pozycja”.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {displayChecks.map((check) => {
                const meta = STATUS_META[check.liveStatus];
                const Icon = meta.icon;
                const detail = check.liveDetail ?? check.detail ?? undefined;
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
                            {!check.audit && (
                              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                                statyczny
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{check.description}</p>
                          {detail && (
                            <p className="text-xs text-muted-foreground/80 mt-2 italic">{detail}</p>
                          )}
                          {check.policies.length > 0 && (
                            <Collapsible className="mt-3">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  <FileCode2 className="w-3.5 h-3.5" />
                                  Powiązane polityki ({check.policies.length})
                                  <ChevronDown className="w-3.5 h-3.5 transition-transform data-[state=open]:rotate-180" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2 space-y-2">
                                {check.policies.map((p, idx) => (
                                  <div
                                    key={`${p.name}-${idx}`}
                                    className="rounded-md border border-border bg-muted/30 p-3 space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{p.table}</p>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-xs"
                                          onClick={() => copyToClipboard(p.name, "Skopiowano nazwę polityki")}
                                        >
                                          <Copy className="w-3 h-3 mr-1" /> Nazwa
                                        </Button>
                                        {p.sql && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => copyToClipboard(p.sql!, "Skopiowano SQL")}
                                          >
                                            <Copy className="w-3 h-3 mr-1" /> SQL
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    {p.sql && (
                                      <pre className="text-xs bg-background border border-border rounded p-2 overflow-x-auto font-mono text-muted-foreground whitespace-pre-wrap break-words">
                                        {p.sql}
                                      </pre>
                                    )}
                                  </div>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Select
                            value={check.status}
                            onValueChange={(v) => updateStatus(check, v as DbStatus)}
                          >
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(check)} aria-label="Edytuj">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(check)} aria-label="Usuń">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-4">
            Self-audit uruchamia żywe sondy RLS/RPC w bieżącej sesji admina. Kontrole oznaczone „statyczny”
            (np. Realtime) pochodzą z ręcznego przeglądu. Pełen audyt: panel Lovable Cloud → Security.
          </p>
        </main>
      </div>

      {/* Editor dialog */}
      <Dialog open={editor.mode !== "closed"} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editor.mode === "create" ? "Nowa pozycja checklisty" : "Edytuj pozycję"}
            </DialogTitle>
            <DialogDescription>
              Pola: kategoria, status oraz tekst widoczny administratorom na stronie /admin/security.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="rls-bookings"
                  disabled={editor.mode === "edit"}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sort">Kolejność</Label>
                <Input
                  id="sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kategoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as DbStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="title">Tytuł</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Opis</Label>
              <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="detail">Szczegóły (opcjonalne)</Label>
              <Textarea id="detail" rows={2} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="policies">Powiązane polityki (JSON)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() =>
                    setForm({
                      ...form,
                      policiesJson: policiesToText([
                        { name: "Admins can view X", table: "your_table", sql: "USING (has_role('admin'::app_role))" },
                      ]),
                    })
                  }
                >
                  Wstaw szablon
                </Button>
              </div>
              <Textarea
                id="policies"
                rows={6}
                value={form.policiesJson}
                onChange={(e) => setForm({ ...form, policiesJson: e.target.value })}
                placeholder='[{"name":"...","table":"...","sql":"..."}]'
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Tablica obiektów <code>{"{ name, table, sql? }"}</code>. Pokazują się jako linki + snippet SQL na karcie kontroli.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeEditor} disabled={saving}>Anuluj</Button>
            <Button onClick={submitForm} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editor.mode === "create" ? "Dodaj" : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF export filter dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eksport PDF — filtry</DialogTitle>
            <DialogDescription>
              Wybierz, które pozycje znajdą się w raporcie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Statusy do uwzględnienia</Label>
              <div className="space-y-2">
                {STATUSES.map((s) => {
                  const meta = STATUS_META[s];
                  const checked = pdfStatuses.includes(s);
                  return (
                    <label
                      key={s}
                      htmlFor={`pdf-status-${s}`}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <Checkbox
                        id={`pdf-status-${s}`}
                        checked={checked}
                        onCheckedChange={(c) => togglePdfStatus(s, c === true)}
                      />
                      <span className={meta.className}>{meta.label}</span>
                      <span className="text-xs text-muted-foreground uppercase">({s})</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setPdfStatuses(["pass", "warn", "fail"])}>
                  Wszystkie
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setPdfStatuses(["fail"])}>
                  Tylko FAIL
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setPdfStatuses(["warn", "fail"])}>
                  WARN + FAIL
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf-category" className="text-sm">Kategoria</Label>
              <Select value={pdfCategory} onValueChange={(v) => setPdfCategory(v as Category | "ALL")}>
                <SelectTrigger id="pdf-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Wszystkie kategorie</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const filtered = rows.filter((r) => {
                const live = liveStatus[r.slug]?.status ?? r.status;
                const sOk = (live === "pass" || live === "warn" || live === "fail")
                  ? pdfStatuses.includes(live as DbStatus)
                  : true;
                const cOk = pdfCategory === "ALL" || r.category === pdfCategory;
                return sOk && cOk;
              });
              const byStatus = { pass: 0, warn: 0, fail: 0 } as Record<DbStatus, number>;
              const byCategory = new Map<string, number>();
              for (const r of filtered) {
                const live = (liveStatus[r.slug]?.status ?? r.status) as DbStatus;
                if (live === "pass" || live === "warn" || live === "fail") byStatus[live]++;
                byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
              }
              // ~3 checks per A4 page in the server layout (card-based)
              const estPages = Math.max(1, Math.ceil(filtered.length / 3));
              const empty = filtered.length === 0;
              return (
                <div
                  className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">
                      Podgląd eksportu PDF
                    </span>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {filtered.length} / {rows.length} pozycji
                    </span>
                  </div>
                  {empty ? (
                    <p className="text-xs text-destructive">
                      Brak pozycji pasujących do wybranych filtrów — zmień status lub kategorię.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(["pass", "warn", "fail"] as DbStatus[]).map((s) => {
                          const meta = STATUS_META[s];
                          const count = byStatus[s];
                          const active = pdfStatuses.includes(s);
                          return (
                            <Badge
                              key={s}
                              variant="outline"
                              className={`text-[11px] font-mono ${active ? meta.badgeClass : "opacity-50"}`}
                              title={active ? `${count} × ${meta.label}` : `${meta.label} pominięte przez filtr`}
                            >
                              {s.toUpperCase()}: {active ? count : "—"}
                            </Badge>
                          );
                        })}
                      </div>
                      {pdfCategory === "ALL" && byCategory.size > 1 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {[...byCategory.entries()]
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, n]) => (
                              <span
                                key={cat}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40"
                              >
                                {cat}: {n}
                              </span>
                            ))}
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground pt-0.5">
                        Szacowana objętość PDF: ~{estPages} {estPages === 1 ? "strona" : estPages < 5 ? "strony" : "stron"} A4
                        <span className="text-muted-foreground/70"> (server) · ~{Math.max(1, Math.ceil(filtered.length / 4))} (client)</span>
                      </p>
                    </>
                  )}
                </div>
              );
            })()}
            {serverPhase !== "idle" && (
              <div
                className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3"
                role="status"
                aria-live="polite"
                aria-busy={exportingServer}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-foreground">
                    {serverPhase === "done" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    )}
                    {PHASE_META[serverPhase].label}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {PHASE_META[serverPhase].value}%
                  </span>
                </div>
                <Progress value={PHASE_META[serverPhase].value} className="h-1.5" />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setPdfDialogOpen(false)} disabled={exportingServer}>Anuluj</Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (pdfStatuses.length === 0) {
                  toast.error("Wybierz przynajmniej jeden status");
                  return;
                }
                await exportPdfServer({ statuses: pdfStatuses, category: pdfCategory });
                if (!exportingServer) setPdfDialogOpen(false);
              }}
              disabled={pdfStatuses.length === 0 || exportingServer}
              title="Renderuje PDF na serwerze (pdf-lib) — lepsze łamanie wierszy"
            >
              {exportingServer ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> {PHASE_META[serverPhase === "idle" ? "preparing" : serverPhase].label}</>
              ) : (
                <><Download className="w-4 h-4 mr-1" /> Pobierz (server)</>
              )}
            </Button>
            <Button
              onClick={() => {
                if (pdfStatuses.length === 0) {
                  toast.error("Wybierz przynajmniej jeden status");
                  return;
                }
                setPdfDialogOpen(false);
                exportPdf({ statuses: pdfStatuses, category: pdfCategory });
              }}
              disabled={pdfStatuses.length === 0 || exportingServer}
            >
              <Download className="w-4 h-4 mr-1" /> Pobierz (client)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć pozycję?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.title} — operacja nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminSecurityChecklist;
