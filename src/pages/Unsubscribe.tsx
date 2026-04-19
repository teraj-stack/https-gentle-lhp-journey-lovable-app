import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, MailX, ArrowLeft } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          return;
        }
        setStatus(
          data.valid === false && data.reason === "already_unsubscribed"
            ? "already"
            : "valid"
        );
      } catch {
        setStatus("error");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke(
        "handle-email-unsubscribe",
        { body: { token } }
      );
      setStatus(
        data?.success
          ? "success"
          : data?.reason === "already_unsubscribed"
            ? "already"
            : "error"
      );
    } catch {
      setStatus("error");
    }
    setProcessing(false);
  };

  return (
    <>
      <SeoHead
        title="Wypisanie z wiadomości e-mail | CML"
        description="Zarządzaj swoimi preferencjami komunikacji z Centrum Medycyny Laserowej."
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16 relative overflow-hidden">
        {/* Subtle gold radial glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(var(--primary) / 0.08) 0%, transparent 60%)",
          }}
          aria-hidden
        />

        <div className="relative w-full max-w-lg">
          {/* Brand mark */}
          <div className="text-center mb-8">
            <Link
              to="/"
              className="inline-block font-serif text-2xl tracking-[0.2em] text-primary hover:text-primary/80 transition-colors"
            >
              CML
            </Link>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-2">
              Centrum Medycyny Laserowej
            </p>
          </div>

          {/* Card */}
          <div className="relative border border-primary/20 bg-card/60 backdrop-blur-sm rounded-sm p-8 md:p-12 text-center space-y-6 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.25)]">
            {/* Corner accents */}
            <span className="absolute top-0 left-0 w-6 h-6 border-t border-l border-primary/60" aria-hidden />
            <span className="absolute top-0 right-0 w-6 h-6 border-t border-r border-primary/60" aria-hidden />
            <span className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-primary/60" aria-hidden />
            <span className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-primary/60" aria-hidden />

            {status === "loading" && (
              <>
                <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                <p className="text-muted-foreground italic font-serif text-lg">
                  Weryfikujemy Twój link…
                </p>
              </>
            )}

            {status === "valid" && (
              <>
                <div className="w-16 h-16 mx-auto rounded-full border border-primary/40 flex items-center justify-center">
                  <MailX className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-3">
                  <h1 className="font-serif text-3xl md:text-4xl text-foreground">
                    Wypisanie z wiadomości
                  </h1>
                  <div className="w-12 h-px bg-primary/60 mx-auto" />
                  <p className="text-muted-foreground leading-relaxed">
                    Czy na pewno chcesz zrezygnować z otrzymywania wiadomości e-mail
                    od Centrum Medycyny Laserowej? Nie będziemy już wysyłać
                    przypomnień ani komunikatów na ten adres.
                  </p>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleUnsubscribe}
                  disabled={processing}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Przetwarzanie…
                    </>
                  ) : (
                    "Potwierdź wypisanie"
                  )}
                </Button>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 mx-auto rounded-full border border-primary/40 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-3">
                  <h1 className="font-serif text-3xl md:text-4xl text-foreground">
                    Wypisano pomyślnie
                  </h1>
                  <div className="w-12 h-px bg-primary/60 mx-auto" />
                  <p className="text-muted-foreground leading-relaxed">
                    Twój adres e-mail został usunięty z naszej listy wysyłkowej.
                    Nie będziesz otrzymywać od nas dalszych wiadomości.
                  </p>
                  <p className="text-sm text-muted-foreground/80 italic font-serif pt-2">
                    Dziękujemy za zaufanie, jakim nas obdarzyłeś.
                  </p>
                </div>
              </>
            )}

            {status === "already" && (
              <>
                <div className="w-16 h-16 mx-auto rounded-full border border-muted-foreground/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  <h1 className="font-serif text-3xl md:text-4xl text-foreground">
                    Już wypisano
                  </h1>
                  <div className="w-12 h-px bg-primary/60 mx-auto" />
                  <p className="text-muted-foreground leading-relaxed">
                    Ten adres e-mail został już wcześniej usunięty z naszej listy
                    wysyłkowej.
                  </p>
                </div>
              </>
            )}

            {(status === "invalid" || status === "error") && (
              <>
                <div className="w-16 h-16 mx-auto rounded-full border border-destructive/40 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <div className="space-y-3">
                  <h1 className="font-serif text-3xl md:text-4xl text-foreground">
                    Nieprawidłowy link
                  </h1>
                  <div className="w-12 h-px bg-primary/60 mx-auto" />
                  <p className="text-muted-foreground leading-relaxed">
                    Ten link do wypisania jest nieprawidłowy lub wygasł. Jeśli
                    nadal chcesz zrezygnować z otrzymywania wiadomości,
                    skontaktuj się z nami bezpośrednio.
                  </p>
                </div>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to="/kontakt">Przejdź do kontaktu</Link>
                </Button>
              </>
            )}
          </div>

          {/* Back to home */}
          <div className="text-center mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Powrót do strony głównej
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Unsubscribe;
