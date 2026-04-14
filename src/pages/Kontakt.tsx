import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { z } from "zod";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";

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
});

const locations = [
  {
    name: "Warszawa Wilanów",
    address: "Adama Branickiego 10/U6, 02-972 Warszawa",
    phone: "+48 22 123 45 67",
    email: "warszawa@cml.pl",
    hours: "Pon–Pt: 8:00–18:00",
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2447.8!2d21.0365!3d52.1645!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47192d5c8b2e5b3f%3A0x0!2zQWRhbWEgQnJhbmlja2llZ28gMTAsIFdhcnN6YXdh!5e0!3m2!1spl!2spl!4v1700000000000",
  },
  {
    name: "Beauty & Mind Siedlce",
    address: "ul. Brzeska 125, 08-110 Siedlce",
    phone: "+48 25 632 00 00",
    email: "siedlce@cml.pl",
    hours: "Pon–Pt: 8:00–20:00",
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2440.0!2d22.283!3d52.1676!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4718ed53bb8a9e23%3A0x1!2sBrzeska%20125%2C%2008-110%20Siedlce!5e0!3m2!1spl!2spl!4v1700000000000",
  },
  {
    name: "IP Cliniq – Rzeszów",
    address: "al. Rejtana 53, IV piętro, 35-326 Rzeszów",
    phone: "+48 507 025 840",
    email: "recepcja@ipcliniq.pl",
    hours: "Pon–Pt: 8:00–20:00, Sb: 8:00–16:00",
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2560.0!2d21.9984!3d50.0307!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x473cfae3cc14d449%3A0x1!2sal.%20Rejtana%2053%2C%2035-326%20Rzesz%C3%B3w!5e0!3m2!1spl!2spl!4v1700000000000",
  },
  {
    name: "Fimedica – Warszawa",
    address: "ul. Giełdowa 5, Warszawa",
    phone: "",
    email: "",
    hours: "",
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2443.0!2d20.9850!3d52.2300!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x471ecb0e2e0c6d3f%3A0x1!2sGie%C5%82dowa%205%2C%20Warszawa!5e0!3m2!1spl!2spl!4v1700000000000",
  },
];

const Kontakt = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setSending(true);
    const id = crypto.randomUUID();
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'contact-confirmation',
          recipientEmail: result.data.email,
          idempotencyKey: `contact-confirm-${id}`,
          templateData: { name: result.data.name },
        },
      });
    } catch (err) {
      console.error('Email send failed:', err);
    }
    setSending(false);
    setForm({ name: "", email: "", phone: "", message: "" });
    toast({ title: "Wiadomość wysłana", description: "Odezwiemy się w ciągu 24 godzin." });
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="Kontakt – umów wizytę"
        description="Skontaktuj się z CML. Przyjmujemy w Warszawie Wilanów i Siedlcach. Umów wizytę proktologiczną lub flebologiczną."
        path="/kontakt"
      />
      <MedicalWebPageSchema
        name="Kontakt – CML Centrum Medycyny Laserowej"
        description="Skontaktuj się z CML. Przyjmujemy w Warszawie Wilanów i Siedlcach. Umów wizytę proktologiczną lub flebologiczną."
        path="/kontakt"
      />
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
            Przyjmujemy w trzech lokalizacjach. Wybierz wygodne miejsce i skontaktuj się z nami.
          </p>
        </motion.div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-16 space-y-24">
        <Breadcrumbs items={[{ label: "Kontakt" }]} className="mb-4" />
        {/* Lokalizacje */}
        <motion.section {...fadeUp}>
          <h2 className="section-title mb-10 text-center">Nasze lokalizacje</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {locations.map((loc, i) => (
              <motion.div
                key={loc.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="glass-card rounded-2xl overflow-hidden"
              >
                <div className="h-52 w-full">
                  <iframe
                    src={loc.mapSrc}
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Mapa — ${loc.name}`}
                  />
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-foreground">{loc.name}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {loc.address}
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone className="w-4 h-4 text-primary shrink-0" />
                      <a href={`tel:${loc.phone.replace(/\s/g, "")}`} className="hover:text-primary transition-colors">
                        {loc.phone}
                      </a>
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
                </div>
              </motion.div>
            ))}
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
            <Button variant="hero" size="lg" type="submit" className="w-full" disabled={sending}>
              {sending ? "Wysyłanie…" : "Wyślij wiadomość"}
            </Button>
          </form>
        </motion.section>
      </div>
    </div>
  );
};

export default Kontakt;
