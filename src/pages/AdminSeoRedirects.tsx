/**
 * /admin/seo-redirects — panel zarządzania mapą przekierowań SEO.
 *
 * Funkcje:
 *  1. Lista WSZYSTKICH wpisów: kod (read-only) + DB (CRUD) z badge'ami origin.
 *  2. Dodawanie / edycja / usuwanie wpisów DB (tylko admin).
 *  3. Inline „Sprawdź" — symuluje wejście pacjenta otwierając alias w nowej karcie.
 *  4. „Skopiuj jako kod" — wkleja `{ from, to, reason }` do schowka, gotowe do
 *     dopisania w `redirectsMap.ts` (gdy chcesz utwardzić DB→kod).
 *  5. Nadpisywanie aliasów z kodu (DB ma pierwszeństwo).
 *
 * Bezpieczeństwo: RBAC po stronie DB (RLS) + dodatkowy gate `useIsAdmin`.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  X,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";
import { SEO_REDIRECTS, type SeoRedirectEntry } from "@/lib/seo/redirectsMap";
import { mergeRedirects, type MergedRedirect } from "@/hooks/useMergedRedirects";

interface DbRow {
  id: string;
  from_path: string;
  to_path: string;
  reason: string | null;
  is_active: boolean;
  updated_at: string;
}

const AdminSeoRedirects = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Form state — jedna linia formularza dla create/edit (inline modal nie potrzebny przy CRUD admin).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ from_path: "", to_path: "", reason: "", is_active: true });
  const [search, setSearch] = useState("");

  // ── Auth gate ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const apply = (s: Session | null) => {
      if (!isMounted) return;
      setSession(s);
      setAuthLoading(false);
      if (!s) navigate("/admin/login", { replace: true });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, s) => apply(s),
    );
    supabase.auth.getSession().then(({ data: { session: s } }) => apply(s));
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // ── Load DB rows (admin → wszystkie, włącznie z is_active=false) ──────────
  const { data: dbRows = [], isLoading } = useQuery({
    queryKey: ["admin-seo-redirects", session?.user.id],
    queryFn: async (): Promise<DbRow[]> => {
      const { data, error } = await supabase
        .from("seo_redirects")
        .select("id, from_path, to_path, reason, is_active, updated_at")
        .order("from_path", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !authLoading && !!session && isAdmin,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: async (input: typeof form & { id?: string }) => {
      const payload = {
        from_path: input.from_path.trim(),
        to_path: input.to_path.trim(),
        reason: input.reason.trim() || null,
        is_active: input.is_active,
      };
      if (input.id) {
        const { error } = await supabase
          .from("seo_redirects")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
        return "updated";
      }
      const { error } = await supabase.from("seo_redirects").insert({
        ...payload,
        created_by: session?.user.id ?? null,
      });
      if (error) throw error;
      return "created";
    },
    onSuccess: (kind) => {
      toast.success(kind === "updated" ? "Zaktualizowano przekierowanie" : "Dodano przekierowanie");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-seo-redirects"] });
      queryClient.invalidateQueries({ queryKey: ["seo-redirects-runtime"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seo_redirects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usunięto przekierowanie");
      queryClient.invalidateQueries({ queryKey: ["admin-seo-redirects"] });
      queryClient.invalidateQueries({ queryKey: ["seo-redirects-runtime"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("seo_redirects")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seo-redirects"] });
      queryClient.invalidateQueries({ queryKey: ["seo-redirects-runtime"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Merge widoku (kod + DB) ──────────────────────────────────────────────
  const merged = useMemo<MergedRedirect[]>(
    () =>
      mergeRedirects(
        SEO_REDIRECTS as readonly SeoRedirectEntry[],
        dbRows.filter((r) => r.is_active).map((r) => ({
          id: r.id,
          from_path: r.from_path,
          to_path: r.to_path,
          reason: r.reason,
        })),
      ),
    [dbRows],
  );

  // Doklej wpisy NIEAKTYWNE z DB jako osobny wiersz (admin musi je widzieć).
  const inactiveDbRows = useMemo(() => dbRows.filter((r) => !r.is_active), [dbRows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return merged;
    const q = search.toLowerCase();
    return merged.filter(
      (m) =>
        m.from.toLowerCase().includes(q) ||
        m.to.toLowerCase().includes(q) ||
        (m.reason ?? "").toLowerCase().includes(q),
    );
  }, [merged, search]);

  function resetForm() {
    setEditingId(null);
    setForm({ from_path: "", to_path: "", reason: "", is_active: true });
  }

  function startEdit(row: DbRow) {
    setEditingId(row.id);
    setForm({
      from_path: row.from_path,
      to_path: row.to_path,
      reason: row.reason ?? "",
      is_active: row.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function copyAsCode(entry: { from: string; to: string; reason?: string | null }) {
    const reasonStr = entry.reason ? `, reason: ${JSON.stringify(entry.reason)}` : "";
    const tpl = `  { from: ${JSON.stringify(entry.from)}, to: ${JSON.stringify(entry.to)}${reasonStr} },`;
    navigator.clipboard?.writeText(tpl).then(() => toast.success("Skopiowano do schowka"));
  }

  function previewRedirect(from: string) {
    // Otwórz w nowej karcie — żeby admin nie tracił kontekstu panelu.
    window.open(from, "_blank", "noopener");
  }

  // ── Gate UI ───────────────────────────────────────────────────────────────
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Brak uprawnień</h1>
          <p className="text-muted-foreground">Ta sekcja jest dostępna wyłącznie dla administratorów.</p>
          <Button variant="outline" onClick={() => navigate("/admin")}>Wróć do panelu</Button>
        </div>
      </div>
    );
  }

  const codeOnlyCount = merged.filter((m) => m.origin === "code").length;
  const dbOverrideCount = merged.filter((m) => m.origin === "db-override").length;
  const dbOnlyCount = merged.filter((m) => m.origin === "db").length;

  return (
    <div className="min-h-screen bg-background">
      <SeoHead title="SEO Redirects · Admin" description="Zarządzanie mapą przekierowań SEO" path="/admin/seo-redirects" noindex />

      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Panel
            </Button>
            <h1 className="text-xl font-bold font-serif">SEO Redirects</h1>
          </div>
          <div className="text-sm text-muted-foreground hidden md:flex gap-3">
            <span>Kod: <strong>{codeOnlyCount}</strong></span>
            <span>DB: <strong>{dbOnlyCount}</strong></span>
            <span>Override: <strong>{dbOverrideCount}</strong></span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── Formularz create/edit ─────────────────────────────────────── */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edytuj przekierowanie" : "Dodaj nowe przekierowanie"}
            </h2>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" /> Anuluj
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3 space-y-1">
              <Label htmlFor="from_path">From (stary URL)</Label>
              <Input
                id="from_path"
                value={form.from_path}
                onChange={(e) => setForm((f) => ({ ...f, from_path: e.target.value }))}
                placeholder="/stary-slug"
                className="font-mono text-sm"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label htmlFor="to_path">To (nowy URL)</Label>
              <Input
                id="to_path"
                value={form.to_path}
                onChange={(e) => setForm((f) => ({ ...f, to_path: e.target.value }))}
                placeholder="/leczenie/evlt"
                className="font-mono text-sm"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label htmlFor="reason">Powód (opcjonalnie)</Label>
              <Input
                id="reason"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Stary slug WordPress / kampania Ads"
              />
            </div>
            <div className="md:col-span-1 flex flex-col items-start gap-1">
              <Label htmlFor="active" className="text-xs">Aktywny</Label>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))}
              />
            </div>
            <div className="md:col-span-1">
              <Button
                onClick={() => upsertMutation.mutate({ ...form, id: editingId ?? undefined })}
                disabled={!form.from_path || !form.to_path || upsertMutation.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" /> {editingId ? "Zapisz" : "Dodaj"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Wpisy z DB nadpisują te z kodu (`redirectsMap.ts`) o tym samym <code>from</code>.
            Nowe wpisy DB zaczynają działać dla wszystkich użytkowników w ciągu max 60 sekund (cache).
          </p>
        </section>

        {/* ── Filtr ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po from / to / powodzie…"
            className="max-w-md"
          />
          <span className="text-sm text-muted-foreground">{filtered.length} wpisów</span>
        </div>

        {/* ── Tabela merged ────────────────────────────────────────────── */}
        <section className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="hidden lg:table-cell">Powód</TableHead>
                <TableHead>Źródło</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Ładowanie…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Brak wpisów pasujących do filtra.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((m) => {
                const dbRow = m.dbId ? dbRows.find((r) => r.id === m.dbId) : null;
                return (
                  <TableRow key={m.from}>
                    <TableCell className="font-mono text-xs">{m.from}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{m.to}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-xs truncate">
                      {m.reason ?? "—"}
                    </TableCell>
                    <TableCell>
                      <OriginBadge origin={m.origin} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => previewRedirect(m.from)}
                          title="Otwórz alias w nowej karcie (test redirect)"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyAsCode(m)}
                          title="Skopiuj jako wpis do redirectsMap.ts"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {dbRow && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(dbRow)}
                              title="Edytuj"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Usunąć wpis ${dbRow.from_path}?`)) {
                                  deleteMutation.mutate(dbRow.id);
                                }
                              }}
                              title="Usuń"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>

        {/* ── Nieaktywne wpisy z DB (admin-only widok) ─────────────────── */}
        {inactiveDbRows.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Nieaktywne wpisy DB ({inactiveDbRows.length})
            </h2>
            <div className="rounded-lg border border-dashed border-border overflow-hidden opacity-75">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveDbRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.from_path}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.to_path}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={r.is_active}
                            onCheckedChange={(c) =>
                              toggleActiveMutation.mutate({ id: r.id, is_active: c })
                            }
                          />
                          <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Usunąć wpis ${r.from_path}?`)) {
                                deleteMutation.mutate(r.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        <p className="text-xs text-muted-foreground">
          Zobacz też: <a href="/dev/seo-redirects" className="underline">/dev/seo-redirects</a> — diagnostyka trafień i 404 w bieżącej sesji.
        </p>
      </main>
    </div>
  );
};

const OriginBadge = ({ origin }: { origin: MergedRedirect["origin"] }) => {
  const map = {
    code: { label: "kod", cls: "bg-muted text-muted-foreground border-border" },
    db: { label: "DB", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    "db-override": {
      label: "DB ↻ kod",
      cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
  } as const;
  const v = map[origin];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${v.cls}`}>
      {v.label}
    </span>
  );
};

export default AdminSeoRedirects;
