import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        setStatus(data.valid === false && data.reason === "already_unsubscribed" ? "already" : "valid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      setStatus(data?.success ? "success" : data?.reason === "already_unsubscribed" ? "already" : "error");
    } catch { setStatus("error"); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 md:p-12 max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="text-muted-foreground">Weryfikacja…</p>
          </>
        )}
        {status === "valid" && (
          <>
            <MailX className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Wypisanie z e-maili</h1>
            <p className="text-muted-foreground">Czy na pewno chcesz się wypisać z naszych wiadomości e-mail?</p>
            <Button variant="hero" size="lg" onClick={handleUnsubscribe} disabled={processing} className="w-full">
              {processing ? "Przetwarzanie…" : "Potwierdź wypisanie"}
            </Button>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Wypisano pomyślnie</h1>
            <p className="text-muted-foreground">Nie będziesz już otrzymywać od nas wiadomości e-mail.</p>
          </>
        )}
        {status === "already" && (
          <>
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Już wypisano</h1>
            <p className="text-muted-foreground">Ten adres e-mail został już wcześniej wypisany.</p>
          </>
        )}
        {(status === "invalid" || status === "error") && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Nieprawidłowy link</h1>
            <p className="text-muted-foreground">Ten link do wypisania jest nieprawidłowy lub wygasł.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
