import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  LogOut,
  Plus,
  Trash2,
  Check,
  X,
  Pencil,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";
import type { Database } from "@/integrations/supabase/types";

type Recipient = Database["public"]["Tables"]["notification_recipients"]["Row"];
type RecipientRole = Database["public"]["Enums"]["notification_recipient_role"];

const ROLE_OPTIONS: { value: RecipientRole; label: string; className: string }[] = [
  { value: "reception", label: "Recepcja", className: "bg-blue-500/20 text-blue-300" },
  { value: "hq", label: "Biuro / HQ", className: "bg-amber-500/20 text-amber-300" },
  { value: "doctor", label: "Lekarz", className: "bg-emerald-500/20 text-emerald-300" },
];

const ROLE_LABEL: Record<RecipientRole, { label: string; className: string }> = {
  reception: { label: "Recepcja", className: "bg-blue-500/20 text-blue-300" },
  hq: { label: "Biuro / HQ", className: "bg-amber-500/20 text-amber-300" },
  doctor: { label: "Lekarz", className: "bg-emerald-500/20 text-emerald-300" },
};

// Mirror normalizacji z supabase/functions/on-booking-created/index.ts
function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizePattern(raw: string): string {
  return raw.trim().toLowerCase();
}

// Dla podglądu na liście — łączymy nową kolumnę location_match_patterns
// z legacy location_match (deduplikacja po lowercase).
function effectivePatterns(r: Recipient): string[] {
  const out = new Set<string>();
  if (Array.isArray(r.location_match_patterns)) {
    for (const p of r.location_match_patterns) {
      if (typeof p === "string" && p.trim().length > 0) {
        out.add(p.trim());
      }
    }
  }
  if (r.location_match && r.location_match.trim().length > 0) {
    out.add(r.location_match.trim());
  }
  return Array.from(out);
}

type EditState = {
  email: string;
  patterns: string[];
  patternDraft: string;
  location_label: string;
  notes: string;
};

const EMPTY_EDIT: EditState = {
  email: "",
  patterns: [],
  patternDraft: "",
  location_label: "",
  notes: "",
};

type NewRecipientState = {
  email: string;
  role: RecipientRole;
  patterns: string[];
  patternDraft: string;
  location_label: string;
  notes: string;
};

const EMPTY_NEW: NewRecipientState = {
  email: "",
  role: "reception",
  patterns: [],
  patternDraft: "",
  location_label: "",
  notes: "",
};

const AdminNotificationRecipients = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [filterRole, setFilterRole] = useState<RecipientRole | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(EMPTY_EDIT);
  const [deleteCandidate, setDeleteCandidate] = useState<Recipient | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newRecipient, setNewRecipient] = useState<NewRecipientState>(EMPTY_NEW);

  useEffect(() => {
    let isMounted = true;

    const apply = (next: Session | null) => {
      if (!isMounted) return;
      setSession(next);
      setAuthLoading(false);
      if (!next) navigate("/admin/login", { replace: true });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT") {
        apply(null);
        return;
      }
      apply(next);
    });

    supabase.auth.getSession().then(({ data: { session: cur } }) => apply(cur));

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const {
    data: recipients = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-notification-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_recipients")
        .select("*")
        .order("role", { ascending: true })
        .order("location_label", { ascending: true, nullsFirst: false })
        .order("email", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Recipient[];
    },
    enabled: !authLoading && !!session && isAdmin === true,
  });

  const filtered = useMemo(() => {
    if (filterRole === "all") return recipients;
    return recipients.filter((r) => r.role === filterRole);
  }, [recipients, filterRole]);

  const counts = useMemo(() => {
    const base: Record<RecipientRole | "all", number> = {
      all: recipients.length,
      reception: 0,
      hq: 0,
      doctor: 0,
    };
    for (const r of recipients) base[r.role] += 1;
    return base;
  }, [recipients]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      patch: Partial<Recipient>;
    }) => {
      const { error } = await supabase
        .from("notification_recipients")
        .update(payload.patch)
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notification-recipients"] });
      toast.success("Zapisano");
    },
    onError: (e) => {
      console.error(e);
      toast.error(`Nie udało się zapisać: ${e instanceof Error ? e.message : "błąd"}`);
    },
  });

  const insertMutation = useMutation({
    mutationFn: async () => {
      const email = newRecipient.email.trim().toLowerCase();
      if (!email || !email.includes("@")) {
        throw new Error("Podaj prawidłowy adres email");
      }
      const patterns = dedupePatterns([
        ...newRecipient.patterns,
        ...(newRecipient.patternDraft.trim() ? [newRecipient.patternDraft] : []),
      ]);
      // Trzymamy kompatybilność: location_match = pierwszy alias (legacy konsumenci),
      // location_match_patterns = pełna lista.
      const { error } = await supabase.from("notification_recipients").insert({
        email,
        role: newRecipient.role,
        location_match: patterns[0] ?? null,
        location_match_patterns: patterns,
        location_label: newRecipient.location_label.trim() || null,
        notes: newRecipient.notes.trim() || null,
        enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notification-recipients"] });
      toast.success("Dodano odbiorcę");
      setAddOpen(false);
      setNewRecipient(EMPTY_NEW);
    },
    onError: (e) => {
      console.error(e);
      toast.error(`Nie udało się dodać: ${e instanceof Error ? e.message : "błąd"}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_recipients")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notification-recipients"] });
      toast.success("Usunięto");
      setDeleteCandidate(null);
    },
    onError: (e) => {
      console.error(e);
      toast.error(`Nie udało się usunąć: ${e instanceof Error ? e.message : "błąd"}`);
    },
  });

  const startEdit = (r: Recipient) => {
    setEditingId(r.id);
    setEditState({
      email: r.email,
      patterns: effectivePatterns(r),
      patternDraft: "",
      location_label: r.location_label ?? "",
      notes: r.notes ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(EMPTY_EDIT);
  };

  const saveEdit = (id: string) => {
    const email = editState.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Podaj prawidłowy adres email");
      return;
    }
    const patterns = dedupePatterns([
      ...editState.patterns,
      ...(editState.patternDraft.trim() ? [editState.patternDraft] : []),
    ]);
    updateMutation.mutate({
      id,
      patch: {
        email,
        location_match: patterns[0] ?? null,
        location_match_patterns: patterns,
        location_label: editState.location_label.trim() || null,
        notes: editState.notes.trim() || null,
      },
    });
    setEditingId(null);
    setEditState(EMPTY_EDIT);
  };

  const toggleEnabled = (r: Recipient, value: boolean) => {
    updateMutation.mutate({ id: r.id, patch: { enabled: value } });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div
          className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"
          aria-label="Ładowanie panelu"
        />
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
          <p className="text-muted-foreground text-sm">
            Twoje konto nie ma roli administratora.
          </p>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Wyloguj
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title="Odbiorcy powiadomień — Panel admina"
        description="Zarządzanie odbiorcami powiadomień email z systemu rezerwacji"
        path="/admin/notification-recipients"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 py-4 md:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Panel
            </Button>
            <h1 className="text-lg md:text-xl font-bold font-serif text-foreground truncate">
              Odbiorcy powiadomień
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/bookings")}
              className="hidden md:inline-flex"
            >
              Rezerwacje
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {session.user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Wyloguj
            </Button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6 md:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filterRole === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRole("all")}
              >
                Wszyscy ({counts.all})
              </Button>
              {ROLE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={filterRole === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterRole(opt.value)}
                >
                  {opt.label} ({counts[opt.value]})
                </Button>
              ))}
            </div>
            <Button onClick={() => setAddOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Dodaj odbiorcę
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card/40 px-4 py-3 text-xs text-muted-foreground space-y-1.5">
            <p>
              <strong className="text-foreground">Aliasy lokalizacji</strong> —
              rezerwacja trafia do recepcji, jeśli pole{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px]">bookings.location</code>{" "}
              <em>zawiera</em> dowolny z aliasów (po normalizacji diakrytyków, lowercase).
            </p>
            <p>
              Jeden wpis może mieć wiele wariantów, np.{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px]">wilanow</code>,{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px]">branickiego</code>,{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px]">warszawa-wilanow</code>{" "}
              — wszystkie wskażą tę samą recepcję. Brak aliasów = wpis globalny (HQ / lekarz dostają każdą rezerwację).
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-border bg-card px-6 py-8 text-center space-y-3">
              <p className="text-foreground font-medium">Nie udało się wczytać odbiorców.</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Nieznany błąd."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Email</TableHead>
                    <TableHead>Rola</TableHead>
                    <TableHead className="min-w-[220px]">Aliasy lokalizacji</TableHead>
                    <TableHead className="min-w-[160px]">Etykieta lokalizacji</TableHead>
                    <TableHead className="min-w-[140px]">Notatki</TableHead>
                    <TableHead className="text-center">Aktywny</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const isEditing = editingId === r.id;
                    const patterns = effectivePatterns(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {isEditing ? (
                            <Input
                              value={editState.email}
                              onChange={(e) =>
                                setEditState((s) => ({ ...s, email: e.target.value }))
                              }
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm break-all">{r.email}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={ROLE_LABEL[r.role].className} variant="outline">
                            {ROLE_LABEL[r.role].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <PatternEditor
                              patterns={editState.patterns}
                              draft={editState.patternDraft}
                              onPatternsChange={(next) =>
                                setEditState((s) => ({ ...s, patterns: next }))
                              }
                              onDraftChange={(v) =>
                                setEditState((s) => ({ ...s, patternDraft: v }))
                              }
                            />
                          ) : patterns.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {patterns.map((p) => {
                                const hasDiacritics = stripDiacritics(p) !== p;
                                return (
                                  <span
                                    key={p}
                                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-muted rounded font-mono"
                                  >
                                    {p}
                                    {hasDiacritics && (
                                      <AlertTriangle
                                        className="w-3 h-3 text-amber-400"
                                        aria-label="Zawiera diakrytyki — działa, ale lepiej użyć ASCII"
                                      />
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              globalny
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {isEditing ? (
                            <Input
                              value={editState.location_label}
                              onChange={(e) =>
                                setEditState((s) => ({
                                  ...s,
                                  location_label: e.target.value,
                                }))
                              }
                              placeholder="np. Warszawa Wilanów"
                              className="h-8 text-sm"
                            />
                          ) : (
                            r.location_label ?? (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {isEditing ? (
                            <Input
                              value={editState.notes}
                              onChange={(e) =>
                                setEditState((s) => ({ ...s, notes: e.target.value }))
                              }
                              placeholder="opcjonalnie"
                              className="h-8 text-sm"
                            />
                          ) : r.notes ? (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {r.notes}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={r.enabled}
                            onCheckedChange={(v) => toggleEnabled(r, v)}
                            disabled={updateMutation.isPending}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => saveEdit(r.id)}
                                  title="Zapisz"
                                >
                                  <Check className="w-4 h-4 text-emerald-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={cancelEdit}
                                  title="Anuluj"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEdit(r)}
                                  title="Edytuj"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteCandidate(r)}
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
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-8"
                      >
                        {recipients.length === 0
                          ? "Brak odbiorców. Dodaj pierwszy wpis."
                          : "Brak wpisów dla wybranego filtra."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </main>
      </div>

      {/* Dodaj odbiorcę */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setNewRecipient(EMPTY_NEW);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nowy odbiorca powiadomień</DialogTitle>
            <DialogDescription>
              Recepcja otrzyma kopie rezerwacji dopasowane przez aliasy lokalizacji. HQ
              i lekarz dostają wszystkie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-email">Email *</Label>
              <Input
                id="new-email"
                type="email"
                value={newRecipient.email}
                onChange={(e) =>
                  setNewRecipient((s) => ({ ...s, email: e.target.value }))
                }
                placeholder="recepcja@cml.pl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-role">Rola *</Label>
              <Select
                value={newRecipient.role}
                onValueChange={(v: RecipientRole) =>
                  setNewRecipient((s) => ({ ...s, role: v }))
                }
              >
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Aliasy lokalizacji{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (puste = wpis globalny)
                </span>
              </Label>
              <PatternEditor
                patterns={newRecipient.patterns}
                draft={newRecipient.patternDraft}
                onPatternsChange={(next) =>
                  setNewRecipient((s) => ({ ...s, patterns: next }))
                }
                onDraftChange={(v) =>
                  setNewRecipient((s) => ({ ...s, patternDraft: v }))
                }
                placeholder="wilanow, branickiego, ..."
              />
              <p className="text-[11px] text-muted-foreground">
                Enter / przecinek dodaje alias. Diakrytyki są normalizowane przed
                porównaniem — preferuj formę ASCII.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-label">Etykieta lokalizacji</Label>
              <Input
                id="new-label"
                value={newRecipient.location_label}
                onChange={(e) =>
                  setNewRecipient((s) => ({ ...s, location_label: e.target.value }))
                }
                placeholder="Warszawa Wilanów"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-notes">Notatki</Label>
              <Input
                id="new-notes"
                value={newRecipient.notes}
                onChange={(e) =>
                  setNewRecipient((s) => ({ ...s, notes: e.target.value }))
                }
                placeholder="opcjonalnie"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false);
                setNewRecipient(EMPTY_NEW);
              }}
            >
              Anuluj
            </Button>
            <Button
              onClick={() => insertMutation.mutate()}
              disabled={insertMutation.isPending}
            >
              {insertMutation.isPending ? "Zapisywanie..." : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => !open && setDeleteCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć odbiorcę?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate ? (
                <>
                  Wpis <strong className="text-foreground">{deleteCandidate.email}</strong>{" "}
                  ({ROLE_LABEL[deleteCandidate.role].label}
                  {deleteCandidate.location_label
                    ? ` — ${deleteCandidate.location_label}`
                    : ""}
                  ) zostanie trwale usunięty. Nowe rezerwacje przestaną generować dla niego
                  powiadomienia. Operacja nieodwracalna.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCandidate && deleteMutation.mutate(deleteCandidate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function dedupePatterns(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const norm = normalizePattern(v);
    if (!norm) continue;
    const key = stripDiacritics(norm);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return out;
}

interface PatternEditorProps {
  patterns: string[];
  draft: string;
  onPatternsChange: (next: string[]) => void;
  onDraftChange: (value: string) => void;
  placeholder?: string;
}

function PatternEditor({
  patterns,
  draft,
  onPatternsChange,
  onDraftChange,
  placeholder = "dodaj alias…",
}: PatternEditorProps) {
  const commit = (raw: string) => {
    const cleaned = normalizePattern(raw);
    if (!cleaned) return;
    onPatternsChange(dedupePatterns([...patterns, cleaned]));
    onDraftChange("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && patterns.length > 0) {
      e.preventDefault();
      onPatternsChange(patterns.slice(0, -1));
    }
  };

  const removeAt = (index: number) => {
    onPatternsChange(patterns.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-9 px-2 py-1.5 rounded-md border border-input bg-background">
      {patterns.map((p, i) => {
        const hasDiacritics = stripDiacritics(p) !== p;
        return (
          <span
            key={`${p}-${i}`}
            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-muted rounded font-mono"
          >
            {p}
            {hasDiacritics && (
              <AlertTriangle
                className="w-3 h-3 text-amber-400"
                aria-label="Zawiera diakrytyki — działa, ale preferuj ASCII"
              />
            )}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="text-muted-foreground hover:text-destructive focus:outline-none"
              aria-label={`Usuń alias ${p}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}
      <input
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={patterns.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export default AdminNotificationRecipients;
