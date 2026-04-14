import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
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
import { LogOut, ShieldAlert, ArrowLeft, XCircle, CheckCircle, Clock, Ban, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Oczekująca", className: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  confirmed: { label: "Potwierdzona", className: "bg-green-500/20 text-green-400", icon: CheckCircle },
  cancelled: { label: "Anulowana", className: "bg-red-500/20 text-red-400", icon: XCircle },
  completed: { label: "Zakończona", className: "bg-blue-500/20 text-blue-400", icon: Ban },
};

const statusOptions = Object.entries(statusConfig).map(([value, { label }]) => ({ value, label }));

const AdminBookings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let isMounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setAuthLoading(false);
      if (!nextSession) {
        navigate("/admin/login", { replace: true });
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => applySession(s));

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const { data: bookings = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-bookings", session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !authLoading && !!session,
    refetchOnMount: "always",
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Status zaktualizowany");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Nie udało się zmienić statusu");
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const handleExportCSV = () => {
    const headers = ["Pacjent", "E-mail", "Telefon", "Lokalizacja", "Data", "Godzina", "Status", "Wiadomość"];
    const rows = filteredBookings.map((b) => [
      b.patient_name,
      b.patient_email,
      b.patient_phone,
      b.location,
      b.appointment_date,
      b.appointment_time,
      statusConfig[b.status]?.label ?? b.status,
      b.message ?? "",
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rezerwacje_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Plik CSV został pobrany");
  };

  const handleExportXLSX = () => {
    const headers = ["Pacjent", "E-mail", "Telefon", "Lokalizacja", "Data", "Godzina", "Status", "Wiadomość"];
    const rows = filteredBookings.map((b) => [
      b.patient_name,
      b.patient_email,
      b.patient_phone,
      b.location,
      b.appointment_date,
      b.appointment_time,
      statusConfig[b.status]?.label ?? b.status,
      b.message ?? "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Column widths
    ws["!cols"] = [
      { wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 18 },
      { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rezerwacje");
    XLSX.writeFile(wb, `rezerwacje_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Plik Excel został pobrany");
  };

  const filteredBookings = statusFilter === "all"
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

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
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Wyloguj
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Panel administracyjny — Rezerwacje" description="Zarządzanie rezerwacjami wizyt" path="/admin/bookings" />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 py-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Blog
            </Button>
            <h1 className="text-xl font-bold font-serif text-foreground">Rezerwacje</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{session.user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Wyloguj
            </Button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8 md:px-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              Wizyty ({filteredBookings.length})
            </h2>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredBookings.length === 0}>
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportXLSX} disabled={filteredBookings.length === 0}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-background border-border">
                  <SelectValue placeholder="Filtruj status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-border bg-card px-6 py-8 text-center space-y-3">
              <p className="text-foreground font-medium">Nie udało się wczytać rezerwacji.</p>
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
                    <TableHead>Pacjent</TableHead>
                    <TableHead className="hidden md:table-cell">Kontakt</TableHead>
                    <TableHead>Lokalizacja</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Godz.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const cfg = statusConfig[booking.status] || statusConfig.pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium max-w-[150px] truncate">
                          {booking.patient_name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          <div>{booking.patient_email}</div>
                          <div>{booking.patient_phone}</div>
                        </TableCell>
                        <TableCell className="text-sm">{booking.location}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(booking.appointment_date + "T00:00:00").toLocaleDateString("pl-PL")}
                        </TableCell>
                        <TableCell className="text-sm">{booking.appointment_time}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${cfg.className} border-0 gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={booking.status}
                            onValueChange={(newStatus) =>
                              updateStatus.mutate({ id: booking.id, status: newStatus })
                            }
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs bg-background border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredBookings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Brak rezerwacji.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default AdminBookings;
