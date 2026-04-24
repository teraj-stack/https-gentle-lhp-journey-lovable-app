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
  Eye,
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

// Map common Polish/diacritic chars to ASCII so the filename stays portable
// across operating systems and HTTP headers.
const DIACRITIC_MAP: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ż: "z", ź: "z",
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ż: "Z", Ź: "Z",
};
function asciiFold(s: string): string {
  return s.replace(/[ąćęłńóśżźĄĆĘŁŃÓŚŻŹ]/g, (ch) => DIACRITIC_MAP[ch] ?? ch);
}
function slugifyToken(raw: string, max: number): string {
  // Lower-case, fold diacritics, replace non-[a-z0-9] with hyphen,
  // collapse repeats, trim hyphens, then truncate.
  const cleaned = asciiFold(String(raw))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const safe = cleaned.length > 0 ? cleaned : "x";
  return safe.length > max ? safe.slice(0, max).replace(/-+$/g, "") : safe;
}
/**
 * Build a browser-safe PDF filename. Variable parts (category/status) are
 * length-capped so the final name stays well under common 200-char limits
 * even when filters are long. Always ends with ".pdf".
 */
function buildSafePdfFilename(parts: {
  stamp: string;
  category: string;          // e.g. "ALL" or "RLS,Realtime,Auth"
  statuses: string;          // e.g. "pass-warn-fail"
  pageSize: string;          // "A4" | "Letter"
  pageMargin?: string;       // "narrow" | "standard" | "wide"
  variant?: string;          // e.g. "server"
}): string {
  const stamp = parts.stamp.replace(/[^0-9-]/g, "").slice(0, 10) || "report";
  const cat = slugifyToken(parts.category, 24);
  const st = slugifyToken(parts.statuses, 16);
  const ps = slugifyToken(parts.pageSize, 8);
  const pm = parts.pageMargin ? `-${slugifyToken(parts.pageMargin, 10)}` : "";
  const variant = parts.variant ? `-${slugifyToken(parts.variant, 10)}` : "";
  const base = `cml-security-report-${stamp}-${cat}-${st}-${ps}${pm}${variant}`;
  // Hard cap on the stem (excl. extension) to stay safe across filesystems.
  const MAX_STEM = 120;
  const stem = base.length > MAX_STEM ? base.slice(0, MAX_STEM).replace(/-+$/g, "") : base;
  return `${stem}.pdf`;
}

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
  const [pdfPageSize, setPdfPageSize] = useState<"A4" | "Letter" | "Custom">(() => {
    if (typeof window === "undefined") return "A4";
    const saved = window.localStorage.getItem("cml.admin.pdfPageSize");
    return saved === "Letter" || saved === "A4" || saved === "Custom" ? saved : "A4";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("cml.admin.pdfPageSize", pdfPageSize);
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [pdfPageSize]);
  // Custom page size in millimetres (used only when pdfPageSize === "Custom").
  // Bounds intentionally match the edge function's CUSTOM_MM_MIN/MAX.
  const CUSTOM_MM_MIN = 50;
  const CUSTOM_MM_MAX = 1200;
  const [pdfCustomWidthMm, setPdfCustomWidthMm] = useState<string>(() => {
    if (typeof window === "undefined") return "210";
    return window.localStorage.getItem("cml.admin.pdfCustomWidthMm") ?? "210";
  });
  const [pdfCustomHeightMm, setPdfCustomHeightMm] = useState<string>(() => {
    if (typeof window === "undefined") return "297";
    return window.localStorage.getItem("cml.admin.pdfCustomHeightMm") ?? "297";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("cml.admin.pdfCustomWidthMm", pdfCustomWidthMm);
      window.localStorage.setItem("cml.admin.pdfCustomHeightMm", pdfCustomHeightMm);
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [pdfCustomWidthMm, pdfCustomHeightMm]);
  // User-defined favourites for custom page sizes. Persisted in localStorage as
  // a JSON array. Each entry is { id, name, width, height } in millimetres.
  type CustomPreset = { id: string; name: string; width: number; height: number };
  const PRESETS_STORAGE_KEY = "cml.admin.pdfCustomPresets";
  const PRESETS_MAX = 12;
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Defensive: filter to well-formed entries within the allowed range.
      return parsed
        .filter(
          (p): p is CustomPreset =>
            p &&
            typeof p.id === "string" &&
            typeof p.name === "string" &&
            typeof p.width === "number" &&
            typeof p.height === "number" &&
            p.width >= 50 && p.width <= 1200 &&
            p.height >= 50 && p.height <= 1200,
        )
        .slice(0, PRESETS_MAX);
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [customPresets]);
  const [presetNameDraft, setPresetNameDraft] = useState("");
  const applyPreset = useCallback((preset: CustomPreset) => {
    setPdfCustomWidthMm(String(preset.width));
    setPdfCustomHeightMm(String(preset.height));
  }, []);
  const deletePreset = useCallback((id: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);
  // Parse + validate the custom-size inputs once per render. Per-field details
  // (`widthError` / `heightError`) drive inline hints; `error` is the rolled-up
  // summary used as a fallback / aria-live message.
  type FieldIssue =
    | { kind: "empty" }
    | { kind: "nan"; raw: string }
    | { kind: "low"; value: number }
    | { kind: "high"; value: number };
  const validateField = (raw: string): { value: number; issue: FieldIssue | null } => {
    const trimmed = raw.trim();
    if (trimmed === "") return { value: NaN, issue: { kind: "empty" } };
    const n = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(n)) return { value: NaN, issue: { kind: "nan", raw: trimmed } };
    if (n < CUSTOM_MM_MIN) return { value: n, issue: { kind: "low", value: n } };
    if (n > CUSTOM_MM_MAX) return { value: n, issue: { kind: "high", value: n } };
    return { value: n, issue: null };
  };
  const formatMm = (n: number) =>
    Number.isFinite(n) ? `${Math.round(n * 10) / 10} mm` : "—";
  const describeIssue = (issue: FieldIssue, field: "Szerokość" | "Wysokość"): string => {
    switch (issue.kind) {
      case "empty":
        return `${field}: pole jest puste. Wpisz wartość ${CUSTOM_MM_MIN}–${CUSTOM_MM_MAX} mm.`;
      case "nan":
        return `${field}: „${issue.raw}" nie jest liczbą. Wpisz wartość ${CUSTOM_MM_MIN}–${CUSTOM_MM_MAX} mm.`;
      case "low":
        return `${field}: ${formatMm(issue.value)} jest poniżej minimum (${CUSTOM_MM_MIN} mm). Brakuje ${formatMm(CUSTOM_MM_MIN - issue.value)}.`;
      case "high":
        return `${field}: ${formatMm(issue.value)} przekracza maksimum (${CUSTOM_MM_MAX} mm) o ${formatMm(issue.value - CUSTOM_MM_MAX)}.`;
    }
  };
  // Live hint shown under each field as the user types. Returns a status
  // (`ok` / `warn` / `error`) plus a short message describing how the value
  // compares to the allowed range, without waiting for blur.
  type LiveHint = { tone: "ok" | "warn" | "error"; message: string };
  const describeFieldHint = (raw: string, field: "Szerokość" | "Wysokość"): LiveHint => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      return {
        tone: "warn",
        message: `Wpisz ${field.toLowerCase()} w zakresie ${CUSTOM_MM_MIN}–${CUSTOM_MM_MAX} mm.`,
      };
    }
    const n = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(n)) {
      return {
        tone: "error",
        message: `„${trimmed}" nie jest liczbą — użyj cyfr (np. 210 lub 210,5).`,
      };
    }
    if (n < CUSTOM_MM_MIN) {
      return {
        tone: "error",
        message: `${formatMm(n)} — za mało o ${formatMm(CUSTOM_MM_MIN - n)} (min. ${CUSTOM_MM_MIN} mm).`,
      };
    }
    if (n > CUSTOM_MM_MAX) {
      return {
        tone: "error",
        message: `${formatMm(n)} — za dużo o ${formatMm(n - CUSTOM_MM_MAX)} (maks. ${CUSTOM_MM_MAX} mm).`,
      };
    }
    // Valid — surface the parsed value plus how much headroom remains on each side.
    const toMin = n - CUSTOM_MM_MIN;
    const toMax = CUSTOM_MM_MAX - n;
    return {
      tone: "ok",
      message: `OK · ${formatMm(n)} (${formatMm(toMin)} nad min., ${formatMm(toMax)} pod maks.).`,
    };
  };
  const customSizeValidation = (() => {
    if (pdfPageSize !== "Custom") {
      return {
        ok: true as const,
        w: 0,
        h: 0,
        widthError: null as string | null,
        heightError: null as string | null,
        error: null as string | null,
      };
    }
    const wField = validateField(pdfCustomWidthMm);
    const hField = validateField(pdfCustomHeightMm);
    const widthError = wField.issue ? describeIssue(wField.issue, "Szerokość") : null;
    const heightError = hField.issue ? describeIssue(hField.issue, "Wysokość") : null;
    if (widthError || heightError) {
      // Summary: list both errors when both fail, otherwise the single failing field.
      const error = [widthError, heightError].filter(Boolean).join(" • ");
      return { ok: false as const, w: wField.value, h: hField.value, widthError, heightError, error };
    }
    return {
      ok: true as const,
      w: wField.value,
      h: hField.value,
      widthError: null,
      heightError: null,
      error: null,
    };
  })();
  // Save the current Custom dimensions as a named preset. Declared after
  // customSizeValidation so it can read the parsed/clamped values directly.
  const saveCurrentPreset = useCallback(() => {
    if (!customSizeValidation.ok) {
      toast.error("Wymiary muszą być prawidłowe, aby zapisać preset.");
      return;
    }
    const name = presetNameDraft.trim();
    if (!name) {
      toast.error("Podaj nazwę presetu.");
      return;
    }
    if (name.length > 40) {
      toast.error("Nazwa presetu może mieć maksymalnie 40 znaków.");
      return;
    }
    const w = Math.round(customSizeValidation.w * 10) / 10;
    const h = Math.round(customSizeValidation.h * 10) / 10;
    setCustomPresets((prev) => {
      // Replace by case-insensitive name match, otherwise append. Cap at PRESETS_MAX.
      const idx = prev.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
      const entry: CustomPreset = {
        id: idx >= 0 ? prev[idx].id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        width: w,
        height: h,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      if (prev.length >= PRESETS_MAX) {
        toast.error(`Limit presetów (${PRESETS_MAX}) osiągnięty. Usuń niepotrzebny, aby dodać nowy.`);
        return prev;
      }
      return [...prev, entry];
    });
    setPresetNameDraft("");
    toast.success(`Zapisano preset „${name}" (${w}×${h} mm).`);
  }, [customSizeValidation, presetNameDraft]);
  // Snap a possibly-invalid raw input to the nearest valid value in
  // [CUSTOM_MM_MIN, CUSTOM_MM_MAX]. Empty / non-numeric input snaps to the
  // minimum so the operator always lands on a usable value. Returns the
  // chosen number (rounded to 1 decimal) and a short reason for the toast.
  const snapToNearestValid = useCallback((raw: string): { value: number; reason: string } => {
    const trimmed = raw.trim();
    const n = Number(trimmed.replace(",", "."));
    if (trimmed === "" || !Number.isFinite(n)) {
      return { value: CUSTOM_MM_MIN, reason: `pole było puste — ustawiono minimum (${CUSTOM_MM_MIN} mm)` };
    }
    if (n < CUSTOM_MM_MIN) {
      return { value: CUSTOM_MM_MIN, reason: `${formatMm(n)} → ${CUSTOM_MM_MIN} mm (minimum)` };
    }
    if (n > CUSTOM_MM_MAX) {
      return { value: CUSTOM_MM_MAX, reason: `${formatMm(n)} → ${CUSTOM_MM_MAX} mm (maksimum)` };
    }
    const rounded = Math.round(n * 10) / 10;
    return { value: rounded, reason: `zaokrąglono do ${formatMm(rounded)}` };
  }, []);
  const snapWidth = useCallback(() => {
    const { value, reason } = snapToNearestValid(pdfCustomWidthMm);
    setPdfCustomWidthMm(String(value));
    toast.success(`Szerokość: ${reason}`);
  }, [pdfCustomWidthMm, snapToNearestValid]);
  const snapHeight = useCallback(() => {
    const { value, reason } = snapToNearestValid(pdfCustomHeightMm);
    setPdfCustomHeightMm(String(value));
    toast.success(`Wysokość: ${reason}`);
  }, [pdfCustomHeightMm, snapToNearestValid]);
  // Final pre-export validation: focuses + scrolls to the first invalid custom
  // size field and surfaces a toast that includes the entered value and the
  // exact allowed range. Returns `true` when the export may proceed.
  const runFinalCustomSizeCheck = useCallback((): boolean => {
    if (pdfPageSize !== "Custom") return true;
    if (customSizeValidation.ok) return true;
    const firstBadId = customSizeValidation.widthError
      ? "pdf-custom-w"
      : customSizeValidation.heightError
        ? "pdf-custom-h"
        : null;
    const firstBadLabel = customSizeValidation.widthError ? "Szerokość" : "Wysokość";
    const firstBadValue = customSizeValidation.widthError
      ? pdfCustomWidthMm
      : pdfCustomHeightMm;
    const detail = customSizeValidation.widthError ?? customSizeValidation.heightError ?? "";
    toast.error("Nie można wyeksportować — popraw wymiary strony", {
      description: `${firstBadLabel}: wpisano „${firstBadValue || "—"}", dozwolony zakres ${CUSTOM_MM_MIN}–${CUSTOM_MM_MAX} mm. ${detail}`,
    });
    if (firstBadId && typeof document !== "undefined") {
      const el = document.getElementById(firstBadId) as HTMLInputElement | null;
      if (el) {
        // Scroll into view, then focus + select so the operator can immediately retype.
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Defer focus until after the smooth scroll kicks off to avoid jump-cancel.
        window.setTimeout(() => {
          el.focus({ preventScroll: true });
          try { el.select(); } catch { /* number inputs may reject select() in some browsers */ }
        }, 120);
      }
    }
    return false;
  }, [pdfPageSize, customSizeValidation, pdfCustomWidthMm, pdfCustomHeightMm]);
  const [pdfPageMargin, setPdfPageMargin] = useState<"narrow" | "standard" | "wide">(() => {
    if (typeof window === "undefined") return "standard";
    const saved = window.localStorage.getItem("cml.admin.pdfPageMargin");
    return saved === "narrow" || saved === "wide" || saved === "standard" ? saved : "standard";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("cml.admin.pdfPageMargin", pdfPageMargin);
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [pdfPageMargin]);
  // "Rotate to fit": when on, swap width/height (portrait <-> landscape) iff
  // the rotated orientation increases usable text capacity per page. This is a
  // pure presentation flag — it never changes the user's stored width/height.
  const [pdfRotateToFit, setPdfRotateToFit] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("cml.admin.pdfRotateToFit") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("cml.admin.pdfRotateToFit", pdfRotateToFit ? "1" : "0");
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [pdfRotateToFit]);

  // Effective custom dimensions after applying the "Rotate to fit" toggle.
  // Heuristic: cards are wider than tall, so the page dimension that drives
  // capacity is *width* (more text per line). When rotation makes the page
  // wider, capacity grows roughly proportionally to the width gain. We swap
  // only when:
  //   • toggle is on, AND
  //   • the page is portrait (h > w), AND
  //   • the gain in usable width is meaningful (>=5%).
  // For A4/Letter the same logic applies using their standard mm sizes.
  const STANDARD_DIMS_MM: Record<"A4" | "Letter", { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    Letter: { width: 215.9, height: 279.4 },
  };
  const MARGIN_MM: Record<"narrow" | "standard" | "wide", number> = {
    narrow: 10,
    standard: 14,
    wide: 20,
  };
  type EffectiveDims = {
    width: number;
    height: number;
    rotated: boolean;
    usableWidthMm: number;
    usableHeightMm: number;
  };
  const computeEffectiveDims = useCallback(
    (
      size: "A4" | "Letter" | "Custom",
      customW: number,
      customH: number,
      margin: "narrow" | "standard" | "wide",
      rotateToFit: boolean,
    ): EffectiveDims => {
      const base =
        size === "Custom"
          ? { width: customW, height: customH }
          : STANDARD_DIMS_MM[size];
      const m = MARGIN_MM[margin];
      // Margin gets capped at 30% of the shorter edge in the edge function;
      // mirror that so the estimate matches the actual render.
      const cap = Math.min(base.width, base.height) * 0.3;
      const effM = Math.min(m, cap);
      const usableW = Math.max(1, base.width - 2 * effM);
      const usableH = Math.max(1, base.height - 2 * effM);
      // Decide whether to rotate. Only consider rotation for portrait pages.
      let rotated = false;
      if (rotateToFit && base.height > base.width) {
        const rotW = Math.max(1, base.height - 2 * effM);
        const rotH = Math.max(1, base.width - 2 * effM);
        // Capacity proxy: usableWidth * usableHeight (area of text region).
        // Rotation helps when area grows by >=5% (margins eat a bit asymmetrically
        // when the shorter edge changes, so a tiny gain isn't worth flipping).
        const gain = (rotW * rotH) / (usableW * usableH);
        // Width-driven gain (more chars/line) is the dominant win in practice;
        // require either a 5% area gain OR a 10% width gain.
        const widthGain = rotW / usableW;
        if (gain >= 1.05 || widthGain >= 1.1) rotated = true;
      }
      if (rotated) {
        return {
          width: base.height,
          height: base.width,
          rotated: true,
          usableWidthMm: base.height - 2 * effM,
          usableHeightMm: base.width - 2 * effM,
        };
      }
      return {
        width: base.width,
        height: base.height,
        rotated: false,
        usableWidthMm: usableW,
        usableHeightMm: usableH,
      };
    },
    [],
  );

  // Build the API payload fragment ({ pageSize, customPageSizeMm }) honouring
  // the rotate-to-fit toggle. When rotation is applied to a standard size
  // (A4/Letter), we send it as Custom with the swapped mm dimensions so the
  // edge function receives literal width/height rather than re-deriving them.
  const buildExportSizeArgs = useCallback(
    (
      size: "A4" | "Letter" | "Custom",
      customW: number,
      customH: number,
      margin: "narrow" | "standard" | "wide",
      rotateToFit: boolean,
    ): { pageSize: "A4" | "Letter" | "Custom"; customPageSizeMm?: { width: number; height: number } } => {
      const eff = computeEffectiveDims(size, customW, customH, margin, rotateToFit);
      if (!eff.rotated) {
        if (size === "Custom") {
          return { pageSize: "Custom", customPageSizeMm: { width: customW, height: customH } };
        }
        return { pageSize: size };
      }
      // Rotated → always send as Custom with the swapped dims.
      return { pageSize: "Custom", customPageSizeMm: { width: eff.width, height: eff.height } };
    },
    [computeEffectiveDims],
  );
  const [exportingServer, setExportingServer] = useState(false);
  const [serverPhase, setServerPhase] = useState<ServerExportPhase>("idle");
  // Server-side PDF preview (single-page sample) state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ size: string; margin: string; total: number } | null>(null);
  const togglePdfStatus = (s: DbStatus, checked: boolean) => {
    setPdfStatuses((prev) => (checked ? [...new Set([...prev, s])] : prev.filter((x) => x !== s)));
  };

  // Revoke any blob URL when preview modal closes / unmounts to avoid leaks.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  const exportPdf = useCallback((opts?: { statuses?: DbStatus[]; category?: Category | "ALL"; pageSize?: "A4" | "Letter" | "Custom" }) => {
    const allowedStatuses = new Set<DbStatus>(opts?.statuses && opts.statuses.length > 0 ? opts.statuses : STATUSES);
    const categoryFilter = opts?.category ?? "ALL";
    const pageSize = opts?.pageSize ?? "A4";
    if (rows.length === 0) {
      toast.error("Brak pozycji do eksportu");
      return;
    }
    try {
      // jsPDF doesn't support custom page sizes via this code path — fall back to A4.
      const jsPdfFormat = pageSize === "Letter" ? "letter" : "a4";
      const doc = new jsPDF({ unit: "pt", format: jsPdfFormat });
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
      const catSuffix = categoryFilter === "ALL" ? "all" : categoryFilter;
      const stSuffix = [...allowedStatuses].sort().join("-");
      doc.save(buildSafePdfFilename({ stamp, category: catSuffix, statuses: stSuffix, pageSize }));
      toast.success(`Raport PDF pobrany (${checks.length} pozycji)`);
    } catch (err) {
      toast.error(`Nie udalo sie wygenerowac PDF: ${err instanceof Error ? err.message : "blad"}`);
    }
  }, [rows, liveStatus, lastAuditAt]);

  // Server-side PDF export — same payload, rendered with pdf-lib for crisp wrapping.
  const exportPdfServer = useCallback(
    async (opts?: {
      statuses?: DbStatus[];
      category?: Category | "ALL";
      pageSize?: "A4" | "Letter" | "Custom";
      pageMargin?: "narrow" | "standard" | "wide";
      customPageSizeMm?: { width: number; height: number };
    }) => {
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
      const pageSize = opts?.pageSize ?? "A4";
      const pageMargin = opts?.pageMargin ?? "standard";
      const customPageSizeMm = opts?.customPageSizeMm;
      // Re-validate custom dims defensively (the dialog already blocks invalid
      // values, but a programmatic caller could still slip through).
      if (pageSize === "Custom") {
        const c = customPageSizeMm;
        const inRange = (n: unknown): n is number =>
          typeof n === "number" && Number.isFinite(n) && n >= 50 && n <= 1200;
        if (!c || !inRange(c.width) || !inRange(c.height)) {
          toast.error("Nieprawidłowe wymiary niestandardowej strony", {
            description: "Szerokość i wysokość muszą mieścić się w zakresie 50–1200 mm.",
          });
          return;
        }
      }
      const marginLabel = pageMargin === "narrow" ? "wąskie" : pageMargin === "wide" ? "szerokie" : "standardowe";
      const sizeLabel =
        pageSize === "Custom" && customPageSizeMm
          ? `Custom ${Math.round(customPageSizeMm.width)}×${Math.round(customPageSizeMm.height)}mm`
          : pageSize;
      const overall = counts.fail > 0 ? "WYMAGA UWAGI" : counts.warn > 0 ? "DO PRZEGLĄDU" : "ZIELONY";
      const filterLabel = `Filtr: ${categoryFilter === "ALL" ? "wszystkie kategorie" : categoryFilter} · statusy: ${[...allowedStatuses].map((s) => s.toUpperCase()).join("/")} · format: ${sizeLabel} · marginesy: ${marginLabel}`;
      const stamp = new Date().toISOString().slice(0, 10);
      const catSuffix = categoryFilter === "ALL" ? "all" : categoryFilter;
      const stSuffix = [...allowedStatuses].sort().join("-");
      const sizeFilenamePart =
        pageSize === "Custom" && customPageSizeMm
          ? `custom-${Math.round(customPageSizeMm.width)}x${Math.round(customPageSizeMm.height)}mm`
          : pageSize;
      const filename = buildSafePdfFilename({
        stamp,
        category: catSuffix,
        statuses: stSuffix,
        pageSize: sizeFilenamePart,
        pageMargin,
        variant: "server",
      });

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
            pageSize,
            pageMargin,
            ...(pageSize === "Custom" && customPageSizeMm ? { customPageSizeMm } : {}),
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

  // Server-side PDF preview — fetches a single-page sample using the same
  // payload + page settings, then opens it inline in a modal iframe.
  const previewPdfServer = useCallback(
    async (opts: {
      statuses: DbStatus[];
      category: Category | "ALL";
      pageSize: "A4" | "Letter" | "Custom";
      pageMargin: "narrow" | "standard" | "wide";
      customPageSizeMm?: { width: number; height: number };
    }) => {
      if (rows.length === 0) {
        toast.error("Brak pozycji do podglądu");
        return;
      }
      const allowedStatuses = new Set<DbStatus>(opts.statuses.length > 0 ? opts.statuses : STATUSES);
      const categoryFilter = opts.category;
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
        toast.error("Brak pozycji pasujących do filtra");
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
      const sizeLabel =
        opts.pageSize === "Custom" && opts.customPageSizeMm
          ? `Custom ${Math.round(opts.customPageSizeMm.width)}×${Math.round(opts.customPageSizeMm.height)}mm`
          : opts.pageSize;
      const marginLabel = opts.pageMargin === "narrow" ? "wąskie" : opts.pageMargin === "wide" ? "szerokie" : "standardowe";
      const filterLabel = `Filtr: ${categoryFilter === "ALL" ? "wszystkie kategorie" : categoryFilter} · statusy: ${[...allowedStatuses].map((s) => s.toUpperCase()).join("/")} · format: ${sizeLabel} · marginesy: ${marginLabel} · PODGLĄD`;

      // Reset previous preview before fetching a new one.
      setPreviewError(null);
      setPreviewMeta({ size: sizeLabel, margin: marginLabel, total: counts.total });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setPreviewOpen(true);
      setPreviewLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setPreviewError("Brak sesji — zaloguj się ponownie");
          return;
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const res = await fetch(`${supabaseUrl}/functions/v1/export-security-report-pdf`, {
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
            filename: "cml-security-report-preview.pdf",
            pageSize: opts.pageSize,
            pageMargin: opts.pageMargin,
            ...(opts.pageSize === "Custom" && opts.customPageSizeMm ? { customPageSizeMm: opts.customPageSizeMm } : {}),
            previewOnly: true,
          }),
        });
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          let msg = `HTTP ${res.status}`;
          try {
            const j = JSON.parse(raw);
            if (typeof j?.error === "string") msg = j.error;
          } catch {
            if (raw) msg = raw.slice(0, 200);
          }
          setPreviewError(msg);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : "Nieznany błąd");
      } finally {
        setPreviewLoading(false);
      }
    },
    [rows, liveStatus, lastAuditAt, previewUrl],
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
            <div className="space-y-2">
              <Label className="text-sm">Format strony</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Format strony PDF">
                {(["A4", "Letter", "Custom"] as const).map((sz) => {
                  const active = pdfPageSize === sz;
                  const hint = sz === "A4" ? "210×297mm" : sz === "Letter" ? "8.5×11in" : "własne wymiary";
                  return (
                    <Button
                      key={sz}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      role="radio"
                      aria-checked={active}
                      className="h-8 px-3 text-xs"
                      onClick={() => setPdfPageSize(sz)}
                    >
                      {sz}
                      <span className="ml-1.5 text-[10px] opacity-70 font-mono">{hint}</span>
                    </Button>
                  );
                })}
              </div>
              {pdfPageSize === "Custom" && (
                <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/20 p-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <Label htmlFor="pdf-custom-w" className="text-[11px] text-muted-foreground">
                          Szerokość (mm)
                        </Label>
                        <div className="flex items-baseline gap-1.5">
                          {customSizeValidation.widthError && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-5 px-1.5 text-[10px] leading-none"
                              onClick={snapWidth}
                              title={`Dopasuj do najbliższej dozwolonej wartości (${CUSTOM_MM_MIN}–${CUSTOM_MM_MAX} mm)`}
                            >
                              Dopasuj
                            </Button>
                          )}
                          <span
                            className="text-[10px] font-mono text-muted-foreground/80 tabular-nums"
                            aria-hidden="true"
                          >
                            {CUSTOM_MM_MIN}–{CUSTOM_MM_MAX}
                          </span>
                        </div>
                      </div>
                      <Input
                        id="pdf-custom-w"
                        type="number"
                        inputMode="decimal"
                        min={CUSTOM_MM_MIN}
                        max={CUSTOM_MM_MAX}
                        step={1}
                        placeholder={`${CUSTOM_MM_MIN}–${CUSTOM_MM_MAX}`}
                        value={pdfCustomWidthMm}
                        onChange={(e) => setPdfCustomWidthMm(e.target.value)}
                        className="h-8 text-sm"
                        aria-invalid={!!customSizeValidation.widthError}
                        aria-describedby="pdf-custom-w-hint pdf-custom-w-range"
                      />
                      <p
                        id="pdf-custom-w-range"
                        className="text-[10px] text-muted-foreground/80 leading-tight tabular-nums"
                      >
                        min {CUSTOM_MM_MIN} mm · maks {CUSTOM_MM_MAX} mm
                      </p>
                      {(() => {
                        const hint = describeFieldHint(pdfCustomWidthMm, "Szerokość");
                        const toneClass =
                          hint.tone === "ok"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : hint.tone === "warn"
                              ? "text-muted-foreground"
                              : "text-destructive";
                        return (
                          <p
                            id="pdf-custom-w-hint"
                            className={`text-[10px] leading-tight ${toneClass}`}
                            role={hint.tone === "error" ? "alert" : undefined}
                            aria-live="polite"
                          >
                            {hint.message}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <Label htmlFor="pdf-custom-h" className="text-[11px] text-muted-foreground">
                          Wysokość (mm)
                        </Label>
                        <div className="flex items-baseline gap-1.5">
                          {customSizeValidation.heightError && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-5 px-1.5 text-[10px] leading-none"
                              onClick={snapHeight}
                              title={`Dopasuj do najbliższej dozwolonej wartości (${CUSTOM_MM_MIN}–${CUSTOM_MM_MAX} mm)`}
                            >
                              Dopasuj
                            </Button>
                          )}
                          <span
                            className="text-[10px] font-mono text-muted-foreground/80 tabular-nums"
                            aria-hidden="true"
                          >
                            {CUSTOM_MM_MIN}–{CUSTOM_MM_MAX}
                          </span>
                        </div>
                      </div>
                      <Input
                        id="pdf-custom-h"
                        type="number"
                        inputMode="decimal"
                        min={CUSTOM_MM_MIN}
                        max={CUSTOM_MM_MAX}
                        step={1}
                        placeholder={`${CUSTOM_MM_MIN}–${CUSTOM_MM_MAX}`}
                        value={pdfCustomHeightMm}
                        onChange={(e) => setPdfCustomHeightMm(e.target.value)}
                        className="h-8 text-sm"
                        aria-invalid={!!customSizeValidation.heightError}
                        aria-describedby="pdf-custom-h-hint pdf-custom-h-range"
                      />
                      <p
                        id="pdf-custom-h-range"
                        className="text-[10px] text-muted-foreground/80 leading-tight tabular-nums"
                      >
                        min {CUSTOM_MM_MIN} mm · maks {CUSTOM_MM_MAX} mm
                      </p>
                      {(() => {
                        const hint = describeFieldHint(pdfCustomHeightMm, "Wysokość");
                        const toneClass =
                          hint.tone === "ok"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : hint.tone === "warn"
                              ? "text-muted-foreground"
                              : "text-destructive";
                        return (
                          <p
                            id="pdf-custom-h-hint"
                            className={`text-[10px] leading-tight ${toneClass}`}
                            role={hint.tone === "error" ? "alert" : undefined}
                            aria-live="polite"
                          >
                            {hint.message}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                      onClick={() => { setPdfCustomWidthMm("210"); setPdfCustomHeightMm("297"); }}>
                      A4 (210×297)
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                      onClick={() => { setPdfCustomWidthMm("148"); setPdfCustomHeightMm("210"); }}>
                      A5 (148×210)
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                      onClick={() => { setPdfCustomWidthMm("279"); setPdfCustomHeightMm("432"); }}>
                      Tabloid (279×432)
                    </Button>
                  </div>
                  {customSizeValidation.ok ? (
                    <p className="text-[11px] text-muted-foreground">
                      Dozwolony zakres: {CUSTOM_MM_MIN}–{CUSTOM_MM_MAX} mm. Eksport klienta używa A4.
                    </p>
                  ) : (
                    <p
                      className="text-[11px] text-muted-foreground"
                      aria-live="polite"
                    >
                      Popraw wskazane pole. Dozwolony zakres: {CUSTOM_MM_MIN}–{CUSTOM_MM_MAX} mm.
                    </p>
                  )}
                  {/* Saved presets: name + dimensions, click to apply, trash to delete. */}
                  <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="pdf-preset-name" className="text-[11px] text-muted-foreground">
                        Twoje presety {customPresets.length > 0 && (
                          <span className="ml-1 tabular-nums opacity-70">
                            ({customPresets.length}/{PRESETS_MAX})
                          </span>
                        )}
                      </Label>
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        id="pdf-preset-name"
                        type="text"
                        placeholder="Nazwa presetu (np. Plakat A3)"
                        value={presetNameDraft}
                        onChange={(e) => setPresetNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveCurrentPreset();
                          }
                        }}
                        maxLength={40}
                        className="h-7 text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1 shrink-0"
                        onClick={saveCurrentPreset}
                        disabled={
                          !customSizeValidation.ok ||
                          presetNameDraft.trim().length === 0
                        }
                        title="Zapisz aktualne wymiary jako preset"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                        Zapisz
                      </Button>
                    </div>
                    {customPresets.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/80">
                        Brak zapisanych presetów. Wpisz nazwę i kliknij „Zapisz", aby utrwalić aktualne wymiary.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {customPresets.map((preset) => {
                          const isActive =
                            customSizeValidation.ok &&
                            Math.abs(customSizeValidation.w - preset.width) < 0.05 &&
                            Math.abs(customSizeValidation.h - preset.height) < 0.05;
                          return (
                            <div
                              key={preset.id}
                              className={`group inline-flex items-center gap-1 rounded-md border ${
                                isActive
                                  ? "border-primary/50 bg-primary/10"
                                  : "border-border/60 bg-background/60"
                              } pl-2 pr-1 py-0.5 text-[10px]`}
                            >
                              <button
                                type="button"
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                onClick={() => applyPreset(preset)}
                                title={`Zastosuj ${preset.width}×${preset.height} mm`}
                              >
                                <span className="font-medium text-foreground/90 max-w-[110px] truncate">
                                  {preset.name}
                                </span>
                                <span className="font-mono tabular-nums opacity-70">
                                  {preset.width}×{preset.height}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="ml-0.5 p-0.5 rounded hover:bg-destructive/15 hover:text-destructive opacity-60 group-hover:opacity-100 transition"
                                onClick={() => deletePreset(preset.id)}
                                aria-label={`Usuń preset ${preset.name}`}
                                title="Usuń preset"
                              >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Łamanie wierszy dopasowuje się automatycznie do szerokości wybranego formatu.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Marginesy strony</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Marginesy strony PDF">
                {(
                  [
                    { key: "narrow", label: "Wąskie", hint: "~10mm" },
                    { key: "standard", label: "Standardowe", hint: "~14mm" },
                    { key: "wide", label: "Szerokie", hint: "~20mm" },
                  ] as const
                ).map((m) => {
                  const active = pdfPageMargin === m.key;
                  return (
                    <Button
                      key={m.key}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      role="radio"
                      aria-checked={active}
                      className="h-8 px-3 text-xs"
                      onClick={() => setPdfPageMargin(m.key)}
                    >
                      {m.label}
                      <span className="ml-1.5 text-[10px] opacity-70 font-mono">{m.hint}</span>
                    </Button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Łamanie wierszy uwzględnia szerokość marginesów — tekst nie jest przycinany.
              </p>
            </div>
            {(() => {
              // Usable content area panel: page dims minus capped margins.
              // Mirrors the edge-function logic (margin capped at 30% of shorter edge)
              // so the operator sees exactly what the renderer will produce.
              const customW = customSizeValidation.ok ? customSizeValidation.w : Number(pdfCustomWidthMm) || 0;
              const customH = customSizeValidation.ok ? customSizeValidation.h : Number(pdfCustomHeightMm) || 0;
              const baseW = pdfPageSize === "Custom" ? customW : STANDARD_DIMS_MM[pdfPageSize].width;
              const baseH = pdfPageSize === "Custom" ? customH : STANDARD_DIMS_MM[pdfPageSize].height;
              if (!baseW || !baseH) return null;
              const requestedM = MARGIN_MM[pdfPageMargin];
              const cap = Math.min(baseW, baseH) * 0.3;
              const effM = Math.min(requestedM, cap);
              const marginCapped = effM < requestedM - 0.05;
              const eff = computeEffectiveDims(pdfPageSize, customW, customH, pdfPageMargin, pdfRotateToFit);
              const pageArea = baseW * baseH;
              const usableArea = eff.usableWidthMm * eff.usableHeightMm;
              const usablePct = pageArea > 0 ? Math.round((usableArea / pageArea) * 100) : 0;
              const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
              return (
                <div className="space-y-1.5">
                  <Label className="text-sm">Obszar treści</Label>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                          {fmt(eff.usableWidthMm)}×{fmt(eff.usableHeightMm)} mm
                        </span>
                        {eff.rotated && (
                          <span className="text-[10px] uppercase tracking-wide text-emerald-500">
                            obrócone
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {usablePct}% strony
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Strona {fmt(baseW)}×{fmt(baseH)} mm · margines{" "}
                      <span className="tabular-nums">{fmt(effM)} mm</span>
                      {marginCapped && (
                        <span className="ml-1 text-amber-500">
                          (przycięty z {fmt(requestedM)} mm — limit 30% krótszej krawędzi)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })()}
            {(() => {
              // Show "Rotate to fit" only when rotation could realistically help
              // (i.e., the page is portrait). Square or landscape pages are skipped.
              const customW = customSizeValidation.ok ? customSizeValidation.w : Number(pdfCustomWidthMm) || 0;
              const customH = customSizeValidation.ok ? customSizeValidation.h : Number(pdfCustomHeightMm) || 0;
              const eff = computeEffectiveDims(pdfPageSize, customW, customH, pdfPageMargin, pdfRotateToFit);
              // Probe: would rotation actually be applied if toggled on right now?
              const probe = computeEffectiveDims(pdfPageSize, customW, customH, pdfPageMargin, true);
              const rotationHelpful = probe.rotated;
              const isPortrait =
                pdfPageSize === "Custom"
                  ? customH > customW
                  : true; // A4/Letter are portrait
              if (!isPortrait) return null;
              return (
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-2">
                    <span>Obróć aby zmieściło więcej</span>
                  </Label>
                  <label
                    htmlFor="pdf-rotate-to-fit"
                    className="flex items-start gap-2 cursor-pointer rounded-md border border-border/60 bg-muted/20 p-2.5"
                  >
                    <Checkbox
                      id="pdf-rotate-to-fit"
                      checked={pdfRotateToFit}
                      onCheckedChange={(c) => setPdfRotateToFit(c === true)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-foreground">
                        Automatyczna orientacja pozioma
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Zamienia szerokość i wysokość, gdy poziom faktycznie zwiększa pojemność strony.
                        {rotationHelpful ? (
                          <span className="ml-1 text-emerald-500">
                            Aktualnie: {Math.round(eff.usableWidthMm)}×{Math.round(eff.usableHeightMm)}mm{" "}
                            {eff.rotated ? "(obrócone)" : "(bez zmian)"}.
                          </span>
                        ) : (
                          <span className="ml-1 text-muted-foreground/80">
                            Dla aktualnych ustawień obrót nic nie da — opcja zostanie zignorowana.
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                </div>
              );
            })()}
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
              // Server layout (cards): ~3 checks / A4 page; Letter is ~6% shorter → ~2.85
              // Client layout (table):  ~4 checks / A4 page → ~3.78 on Letter
              // Wider margins reduce capacity slightly (cards have less vertical room
              // because content area shrinks). Narrow → +8%, wide → -8%.
              const marginFactor = pdfPageMargin === "narrow" ? 1.08 : pdfPageMargin === "wide" ? 0.92 : 1;
              // Rotate-to-fit boost: scale per-page capacity by the gain in usable
              // text area (ratio of effective area to standard portrait area).
              const customW = customSizeValidation.ok ? customSizeValidation.w : Number(pdfCustomWidthMm) || 0;
              const customH = customSizeValidation.ok ? customSizeValidation.h : Number(pdfCustomHeightMm) || 0;
              const baseEff = computeEffectiveDims(pdfPageSize, customW, customH, pdfPageMargin, false);
              const eff = computeEffectiveDims(pdfPageSize, customW, customH, pdfPageMargin, pdfRotateToFit);
              const rotateFactor =
                eff.rotated && baseEff.usableWidthMm > 0 && baseEff.usableHeightMm > 0
                  ? (eff.usableWidthMm * eff.usableHeightMm) /
                    (baseEff.usableWidthMm * baseEff.usableHeightMm)
                  : 1;
              const serverPerPage = (pdfPageSize === "A4" ? 3 : 2.85) * marginFactor * rotateFactor;
              const clientPerPage = pdfPageSize === "A4" ? 4 : 3.78;
              const estPages = Math.max(1, Math.ceil(filtered.length / serverPerPage));
              const estPagesClient = Math.max(1, Math.ceil(filtered.length / clientPerPage));
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
                        Szacowana objętość PDF: ~{estPages} {estPages === 1 ? "strona" : estPages < 5 ? "strony" : "stron"} {pdfPageSize}
                        {eff.rotated && (
                          <span className="ml-1 text-emerald-500">(orientacja pozioma)</span>
                        )}
                        <span className="text-muted-foreground/70"> (server) · ~{estPagesClient} (client)</span>
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
              onClick={() => {
                if (pdfStatuses.length === 0) {
                  toast.error("Wybierz przynajmniej jeden status");
                  return;
                }
                if (!runFinalCustomSizeCheck()) return;
                void previewPdfServer({
                  statuses: pdfStatuses,
                  category: pdfCategory,
                  pageMargin: pdfPageMargin,
                  ...buildExportSizeArgs(
                    pdfPageSize,
                    customSizeValidation.ok ? customSizeValidation.w : 0,
                    customSizeValidation.ok ? customSizeValidation.h : 0,
                    pdfPageMargin,
                    pdfRotateToFit,
                  ),
                });
              }}
              disabled={
                pdfStatuses.length === 0 ||
                exportingServer ||
                previewLoading ||
                (pdfPageSize === "Custom" && !customSizeValidation.ok)
              }
              title="Renderuje pierwszą stronę raportu na serwerze, w tym samym układzie co pełen PDF"
            >
              {previewLoading ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Podgląd…</>
              ) : (
                <><Eye className="w-4 h-4 mr-1" /> Podgląd (server)</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (pdfStatuses.length === 0) {
                  toast.error("Wybierz przynajmniej jeden status");
                  return;
                }
                if (!runFinalCustomSizeCheck()) return;
                await exportPdfServer({
                  statuses: pdfStatuses,
                  category: pdfCategory,
                  pageMargin: pdfPageMargin,
                  ...buildExportSizeArgs(
                    pdfPageSize,
                    customSizeValidation.ok ? customSizeValidation.w : 0,
                    customSizeValidation.ok ? customSizeValidation.h : 0,
                    pdfPageMargin,
                    pdfRotateToFit,
                  ),
                });
                if (!exportingServer) setPdfDialogOpen(false);
              }}
              disabled={
                pdfStatuses.length === 0 ||
                exportingServer ||
                (pdfPageSize === "Custom" && !customSizeValidation.ok)
              }
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
                exportPdf({ statuses: pdfStatuses, category: pdfCategory, pageSize: pdfPageSize });
              }}
              disabled={pdfStatuses.length === 0 || exportingServer}
            >
              <Download className="w-4 h-4 mr-1" /> Pobierz (client)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Server PDF preview (single-page sample) */}
      <Dialog
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) {
            // Free the blob URL when the user closes the preview.
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }
            setPreviewError(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> Podgląd raportu PDF (pierwsza strona)
            </DialogTitle>
            <DialogDescription>
              {previewMeta
                ? `Format: ${previewMeta.size} · marginesy: ${previewMeta.margin} · łącznie pozycji w pełnym raporcie: ${previewMeta.total}.`
                : "Renderowanie próbnej strony przy użyciu wybranych ustawień…"}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/20 overflow-hidden">
            {previewLoading ? (
              <div className="flex items-center justify-center gap-2 h-[60vh] text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Renderuję podgląd…
              </div>
            ) : previewError ? (
              <div className="flex flex-col items-center justify-center gap-2 h-[40vh] p-6 text-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <p className="text-sm text-destructive font-medium">Nie udało się wygenerować podglądu</p>
                <p className="text-xs text-muted-foreground break-words max-w-md">{previewError}</p>
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title="Podgląd PDF — pierwsza strona"
                className="w-full h-[70vh] bg-background"
              />
            ) : (
              <div className="h-[40vh]" />
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Zamknij</Button>
            <Button
              onClick={async () => {
                if (!runFinalCustomSizeCheck()) {
                  // Close the preview so the operator can see + fix the field highlighted in the export dialog.
                  setPreviewOpen(false);
                  return;
                }
                setPreviewOpen(false);
                await exportPdfServer({
                  statuses: pdfStatuses,
                  category: pdfCategory,
                  pageMargin: pdfPageMargin,
                  ...buildExportSizeArgs(
                    pdfPageSize,
                    customSizeValidation.ok ? customSizeValidation.w : 0,
                    customSizeValidation.ok ? customSizeValidation.h : 0,
                    pdfPageMargin,
                    pdfRotateToFit,
                  ),
                });
              }}
              disabled={
                !previewUrl ||
                exportingServer ||
                pdfStatuses.length === 0 ||
                (pdfPageSize === "Custom" && !customSizeValidation.ok)
              }
            >
              <Download className="w-4 h-4 mr-1" /> Pobierz pełen raport
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
