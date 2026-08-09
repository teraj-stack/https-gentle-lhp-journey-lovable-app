import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Clock, Mail, ExternalLink } from "lucide-react";
import branickiegoImg from "@/assets/locations/branickiego.webp";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import ClinicJsonLd from "@/components/shared/ClinicJsonLd";

import TurnstileWidget from "@/components/shared/TurnstileWidget";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const contactSchema = z.object({
  name: z.string().trim().min(1, "Imię jest wymagane").max(100),
  email: z.string().trim().email("Nieprawidłowy adres e-mail").max(255),
  phone: z.string().trim().min(1, "Telefon jest wymagany").max(20),
  message: z.string().trim().min(1, "Wiadomość jest wymagana").max(2000),
  consent: z.literal(true, { errorMap: () => ({ message: "Zgoda jest wymagana" }) }),
});

const locations = [
  {
    name: "Warszawa Wilanów",
    address: "Adama Branickiego 10/U6, 02-972 Warszawa",
    phone: "+48 510 432 361",
    email: "warszawa@cml.pl",
    hours: "Pon–Pt: 12:00–20:00",
    image: branickiegoImg,
    mapsUrl: "https://maps.google.com/?q=Adama+Branickiego+10,+02-972+Warszawa",
  },
];

const Kontakt = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse({ ...form, consent });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (!turnstileToken) {
      toast({ title: "Weryfikacja", description: "Proszę potwierdzić, że nie jesteś botem.", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-contact-form', {
        body: {
          formType: 'contact',
          turnstileToken,
          name: result.data.name,
          email: result.data.email,
          phone: result.data.phone,
          message: result.data.message,
          source: 'kontakt',
        },
      });
      if (error || !data?.success) {
        toast({
          title: 'Błąd wysyłki',
          description: 'Nie udało się wysłać wiadomości. Spróbuj ponownie.',
          variant: 'destructive',
        });
        setSending(false);
        setTurnstileToken(null);
        return;
      }
    } catch (err) {
      console.error('Contact form submit failed:', err);
      toast({
        title: 'Błąd wysyłki',
        description: 'Nie udało się wysłać wiadomości. Spróbuj ponownie.',
        variant: 'destructive',
      });
      setSending(false);
      setTurnstileToken(null);
      return;
    }
    setSending(false);
    setForm({ name: "", email: "", phone: "", message: "" });
    setConsent(false);
    setTurnstileToken(null);
    toast({ title: "Wiadomość wysłana", description: "Odezwiemy się w ciągu 24 godzin." });
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="Kontakt – umów wizytę"
        description="Skontaktuj się z CML. Przyjmujemy w Warszawie Wilanów, ul. Branickiego 10/U6. Umów wizytę proktologiczną lub flebologiczną."
        path="/kontakt"
      />
      <MedicalWebPageSchema
        name="Kontakt – CML Centrum Medycyny Laserowej"
        description="Skontaktuj się z CML. Przyjmujemy w Warszawie Wilanów, ul. Branickiego 10/U6. Umów wizytę proktologiczną lub flebologiczną."
        path="/kontakt"
      />
      <ClinicJsonLd />
      {/* Hero */}
      <section className="gradient-bg py-16 md:py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary-foreground/60 mb-4">
            Kontakt
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
            Umów wizytę lub zadaj pytanie
          </h1>
          <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
          <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Przyjmujemy w Warszawie na Wilanowie, przy ul. Branickiego 10/U6. Napisz lub zadzwoń — pomożemy dobrać termin.
          </p>
        </motion.div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-16 space-y-24">
        <Breadcrumbs items={BREADCRUMBS_MAP["/kontakt"]} className="mb-4" />
        {/* Lokalizacje */}
        <motion.section {...fadeUp}>
          <h2 className="section-title mb-10 text-center">Nasza lokalizacja</h2>
          <div className="flex justify-center">
            {locations.map((loc, i) => (
              <motion.div
                key={loc.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="glass-card rounded-2xl overflow-hidden group"
              >
                <div className="h-52 w-full overflow-hidden">
                  <img
                    src={loc.image}
                    alt={`Wnętrze kliniki — ${loc.name}`}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-foreground">{loc.name}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {loc.address}
                    </div>
                    <div className="flex items-start gap-3 text-muted-foreground">
                      <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        {(Array.isArray(loc.phone) ? loc.phone : [loc.phone]).map((p) => (
                          <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-primary transition-colors">
                            {p}
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Mail className="w-4 h-4 text-primary shrink-0" />
                      <a href={`mailto:${loc.email}`} className="hover:text-primary transition-colors">
                        {loc.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      {loc.hours}
                    </div>
                  </div>
                  <a
                    href={loc.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Nawiguj w Google Maps
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Rezerwacja przez kliniki partnerskie */}
        <motion.section {...fadeUp}>
          <h2 className="section-title mb-3 text-center">Zarezerwuj wizytę</h2>
          <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
            Zapisy pacjentów dr. Jana Bujoka prowadzi osobiście jego partnerka i asystentka. Skontaktuj się bezpośrednio — pomożemy dobrać dogodny termin.
          </p>
          <div className="flex justify-center max-w-3xl mx-auto">
            {locations.map((loc) => (
              <div key={loc.name} className="glass-card rounded-2xl p-6 text-center space-y-3">
                <h3 className="text-lg font-bold text-foreground">{loc.name}</h3>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 text-primary" />
                  <div className="flex flex-col">
                    {(Array.isArray(loc.phone) ? loc.phone : [loc.phone]).map((p) => (
                      <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-primary transition-colors">
                        {p}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  {loc.hours}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8 px-4">
            <Button variant="hero" size="lg" asChild className="w-full sm:w-auto">
              <a
                href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Umów wizytę przez ZnanyLekarz.pl</span>
                <span className="sm:hidden">Umów wizytę — ZnanyLekarz</span>
              </a>
            </Button>
          </div>
        </motion.section>

        {/* Formularz */}
        <motion.section {...fadeUp}>
          <h2 className="section-title mb-3 text-center">Napisz do nas</h2>
          <p className="section-subtitle mb-10 text-center">
            Odpowiemy w ciągu 24 godzin roboczych
          </p>
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 md:p-10 max-w-2xl mx-auto space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground text-sm">Imię i nazwisko</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jan Kowalski"
                  className="bg-background border-border"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground text-sm">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+48 600 000 000"
                  className="bg-background border-border"
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground text-sm">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jan@example.com"
                className="bg-background border-border"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="text-foreground text-sm">Wiadomość</Label>
              <Textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Opisz swój problem lub zadaj pytanie…"
                rows={5}
                className="bg-background border-border resize-none"
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => {
                  setConsent(checked === true);
                  setErrors((prev) => ({ ...prev, consent: "" }));
                }}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="consent" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                  Wyrażam zgodę na przetwarzanie moich danych osobowych w celu odpowiedzi na przesłane zapytanie, zgodnie z{" "}
                  <a href="/polityka-prywatnosci" className="text-primary hover:text-primary/80 underline" target="_blank">
                    Polityką Prywatności
                  </a>.
                </Label>
                {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}
              </div>
            </div>
            <TurnstileWidget
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              className="flex justify-center"
            />
            <Button variant="hero" size="lg" type="submit" className="w-full" disabled={sending || !turnstileToken}>
              {sending ? "Wysyłanie…" : "Wyślij wiadomość"}
            </Button>
          </form>
        </motion.section>
      </div>
    </div>
  );
};

export default Kontakt;
