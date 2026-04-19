import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Phone, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SeoHead from "@/components/shared/SeoHead";

type ActionType = "confirm" | "cancel" | "needs_contact";

interface TokenInfo {
  valid: boolean;
  reason: string | null;
  action: ActionType;
  targetStatus: "confirmed" | "cancelled" | "needs_contact";
  recipientEmail: string;
  usedAt: string | null;
  usedByEmail: string | null;
  booking: {
    id: string;
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    location: string;
    currentStatus: string;
  };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/update-booking-status`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const ACTION_META: Record<ActionType, { label: string; icon: typeof CheckCircle2; tone: string; cta: string; resultLabel: string }> = {
  confirm: {
    label: "Potwierdź wizytę",
    icon: CheckCircle2,
    tone: "text-primary",
    cta: "Potwierdzam wizytę",
    resultLabel: "Wizyta potwierdzona",
  },
  cancel: {
    label: "Odwołaj wizytę",
    icon: XCircle,
    tone: "text-destructive",
    cta: "Odwołuję wizytę",
    resultLabel: "Wizyta odwołana",
  },
  needs_contact: {
    label: "Wymaga kontaktu z pacjentem",
    icon: Phone,
    tone: "text-primary",
    cta: "Oznacz jako wymaga kontaktu",
    resultLabel: "Oznaczono — wymaga kontaktu",
  },
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

const BookingAction = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ status: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedByEmail, setConfirmedByEmail] = useState("");

  // Walidacja tokena na mount.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadError("Brak tokena w adresie URL.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: { apikey: ANON_KEY },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data?.error ?? `Błąd ${res.status}`);
        } else {
          setInfo(data);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const meta = useMemo(() => (info ? ACTION_META[info.action] : null), [info]);

  const handleSubmit = async () => {
    if (!info) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          token,
          confirmedByEmail: confirmedByEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.error ?? `Błąd ${res.status}`);
      } else {
        setDone({ status: data.newStatus });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // === Loading ===
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Weryfikacja linku akcji…</span>
        </div>
      </div>
    );
  }

  // === Error / invalid token ===
  if (loadError || !info) {
    return (
      <Wrapper title="Link nieprawidłowy">
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm text-foreground">
            <p className="font-medium mb-1">Nie udało się zweryfikować linku</p>
            <p className="text-muted-foreground">{loadError ?? "Token nie istnieje."}</p>
          </div>
        </div>
      </Wrapper>
    );
  }

  // === Token expired / used ===
  if (!info.valid) {
    const reasonLabel =
      info.reason === "expired"
        ? "Link wygasł (linki ważne 7 dni)."
        : info.reason === "already_used"
        ? `Ten link został już użyty${info.usedByEmail ? ` przez ${info.usedByEmail}` : ""}.`
        : "Link nieprawidłowy.";
    return (
      <Wrapper title="Link już użyty lub wygasł">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-1 text-foreground">{reasonLabel}</p>
            <p className="text-muted-foreground">
              Aktualny status rezerwacji: <strong>{info.booking.currentStatus}</strong>.
              Aby ponownie zmienić status, zaloguj się do panelu administracyjnego.
            </p>
          </div>
        </div>
        <BookingSummary info={info} />
      </Wrapper>
    );
  }

  // === Success — akcja wykonana ===
  if (done) {
    const Icon = meta?.icon ?? CheckCircle2;
    return (
      <Wrapper title={meta?.resultLabel ?? "Status zmieniony"}>
        <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4">
          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${meta?.tone ?? ""}`} />
          <div className="text-sm">
            <p className="font-medium mb-1 text-foreground">
              Status rezerwacji zmieniony na: <strong>{done.status}</strong>
            </p>
            <p className="text-muted-foreground">
              Pacjent otrzymał e-mail z informacją. Link został unieważniony — pozostałe
              przyciski w mailu również przestały działać.
            </p>
          </div>
        </div>
        <BookingSummary info={info} />
      </Wrapper>
    );
  }

  // === Confirmation form ===
  const Icon = meta?.icon ?? CheckCircle2;
  return (
    <Wrapper title="Potwierdzenie akcji recepcji">
      <div className={`flex items-start gap-3 rounded-lg border border-border bg-card p-4`}>
        <Icon className={`w-6 h-6 mt-0.5 shrink-0 ${meta?.tone}`} />
        <div className="text-sm">
          <p className="font-medium mb-1 text-foreground">{meta?.label}</p>
          <p className="text-muted-foreground">
            Po potwierdzeniu status rezerwacji zostanie zmieniony, a pacjent otrzyma
            e-mail z informacją. Tej akcji nie można cofnąć przez ten link.
          </p>
        </div>
      </div>

      <BookingSummary info={info} />

      <div className="space-y-2">
        <Label htmlFor="confirmedByEmail" className="text-sm">
          Twój e-mail (opcjonalnie, do audytu)
        </Label>
        <Input
          id="confirmedByEmail"
          type="email"
          placeholder={info.recipientEmail}
          value={confirmedByEmail}
          onChange={(e) => setConfirmedByEmail(e.target.value)}
          disabled={submitting}
        />
        <p className="text-xs text-muted-foreground">
          Jeśli zostawisz puste, zapiszemy adres odbiorcy maila ({info.recipientEmail}).
        </p>
      </div>

      {submitError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <span className="text-foreground">{submitError}</span>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={submitting} size="lg" className="w-full">
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Zapisywanie…
          </>
        ) : (
          meta?.cta ?? "Potwierdź"
        )}
      </Button>
    </Wrapper>
  );
};

// --- Layout helpers ---

const Wrapper = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <>
    <SeoHead title={title} description="Strona akcji recepcji dla rezerwacji wizyt." path="/booking-action" />
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-12 md:py-20">
      <div className="w-full max-w-lg space-y-5">
        <header className="space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">
            CML — akcja recepcji
          </p>
          <h1 className="text-2xl md:text-3xl font-serif text-foreground">{title}</h1>
        </header>
        {children}
      </div>
    </div>
  </>
);

const BookingSummary = ({ info }: { info: TokenInfo }) => (
  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Rezerwacja
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      <div>
        <p className="text-xs text-muted-foreground">Pacjent</p>
        <p className="text-foreground font-medium">{info.booking.patientName}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Lokalizacja</p>
        <p className="text-foreground font-medium">{info.booking.location}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Data</p>
        <p className="text-foreground font-medium">{formatDate(info.booking.appointmentDate)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Godzina</p>
        <p className="text-foreground font-medium">{info.booking.appointmentTime}</p>
      </div>
      <div className="sm:col-span-2">
        <p className="text-xs text-muted-foreground">Aktualny status</p>
        <p className="text-foreground font-medium">{info.booking.currentStatus}</p>
      </div>
    </div>
  </div>
);

export default BookingAction;
