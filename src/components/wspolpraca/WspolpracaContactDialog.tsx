import { useState, useCallback } from "react";
import { z } from "zod";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import TurnstileWidget from "@/components/shared/TurnstileWidget";
import { Mail } from "lucide-react";

const schema = z.object({
  facility: z.string().trim().max(150, "Maks. 150 znaków").optional().or(z.literal("")),
  email: z.string().trim().email("Nieprawidłowy adres e-mail").max(255),
  message: z.string().trim().min(1, "Wiadomość jest wymagana").max(2000),
  consent: z.literal(true, { errorMap: () => ({ message: "Zgoda jest wymagana" }) }),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WspolpracaContactDialog = ({ open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [facility, setFacility] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleVerify = useCallback((t: string) => setTurnstileToken(t), []);
  const handleExpire = useCallback(() => setTurnstileToken(null), []);

  const reset = () => {
    setFacility("");
    setEmail("");
    setMessage("");
    setConsent(false);
    setErrors({});
    setTurnstileToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse({ facility, email, message, consent });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (!turnstileToken) {
      toast({
        title: "Weryfikacja",
        description: "Proszę potwierdzić, że nie jesteś botem.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data: verification } = await supabase.functions.invoke("verify-turnstile", {
        body: { token: turnstileToken },
      });
      if (!verification?.success) {
        toast({
          title: "Błąd weryfikacji",
          description: "Weryfikacja CAPTCHA nie powiodła się.",
          variant: "destructive",
        });
        setSending(false);
        setTurnstileToken(null);
        return;
      }
    } catch {
      toast({
        title: "Błąd",
        description: "Nie udało się zweryfikować CAPTCHA.",
        variant: "destructive",
      });
      setSending(false);
      return;
    }

    const id = crypto.randomUUID();
    const facilityValue = result.data.facility?.trim() || undefined;
    try {
      await Promise.all([
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "contact-confirmation",
            recipientEmail: result.data.email,
            idempotencyKey: `wspolpraca-b2b-confirm-${id}`,
            templateData: {
              name: facilityValue,
              subject: "Współpraca B2B – CML",
              message: result.data.message,
            },
          },
        }),
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "b2b-inquiry-notification",
            recipientEmail: "dr.bujok@cml.pl",
            idempotencyKey: `wspolpraca-b2b-notify-${id}`,
            templateData: {
              senderEmail: result.data.email,
              facility: facilityValue,
              message: result.data.message,
              source: "wspolpraca-b2b",
            },
          },
        }),
      ]);
    } catch (err) {
      console.error("Email send failed:", err);
    }

    setSending(false);
    reset();
    onOpenChange(false);
    toast({
      title: "Wiadomość wysłana",
      description: "Dziękujemy. Odezwiemy się w ciągu 24 godzin.",
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-3">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">Napisz do nas</DialogTitle>
          <DialogDescription>
            Krótka wiadomość wystarczy. Odpowiemy w ciągu 24 godzin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="b2b-facility">
              Nazwa placówki <span className="text-muted-foreground font-normal">(opcjonalne)</span>
            </Label>
            <Input
              id="b2b-facility"
              type="text"
              value={facility}
              onChange={(e) => {
                setFacility(e.target.value);
                setErrors((p) => ({ ...p, facility: "" }));
              }}
              placeholder="np. Klinika XYZ, Warszawa"
              autoComplete="organization"
              maxLength={150}
            />
            {errors.facility && <p className="text-xs text-destructive">{errors.facility}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b2b-email">E-mail</Label>
            <Input
              id="b2b-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((p) => ({ ...p, email: "" }));
              }}
              placeholder="twoj@email.pl"
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b2b-message">Wiadomość</Label>
            <Textarea
              id="b2b-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setErrors((p) => ({ ...p, message: "" }));
              }}
              placeholder="Krótko opisz, czego dotyczy współpraca..."
              rows={4}
            />
            {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="b2b-consent"
              checked={consent}
              onCheckedChange={(v) => {
                setConsent(v === true);
                setErrors((p) => ({ ...p, consent: "" }));
              }}
            />
            <Label htmlFor="b2b-consent" className="text-xs text-muted-foreground leading-relaxed font-normal">
              Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z{" "}
              <Link to="/polityka-prywatnosci" className="text-primary underline" target="_blank">
                Polityką Prywatności
              </Link>
              .
            </Label>
          </div>
          {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}

          <div className="flex justify-center pt-1">
            <TurnstileWidget onVerify={handleVerify} onExpire={handleExpire} />
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={sending}>
            {sending ? "Wysyłanie..." : "Wyślij wiadomość"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WspolpracaContactDialog;
