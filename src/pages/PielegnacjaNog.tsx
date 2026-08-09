import { useEffect } from "react";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import {
  Clock, Droplets, Sun, ThermometerSnowflake, ShieldAlert,
  CheckCircle2, AlertTriangle, Hand, CalendarDays, Shirt,
  ArrowRight
} from "lucide-react";
import { StaggeredListItem } from "@/components/shared/StaggeredList";
import { Button } from "@/components/ui/button";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import PostOpExercises from "@/components/profilaktyka/PostOpExercises";

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 30, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true },
  transition: { duration: 0.7, ease: easeOut },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { ...fadeUp.transition, delay: i * 0.1 },
});

const timelineSteps = [
  {
    time: "Kilka godzin po zabiegu",
    text: 'Pierwsza warstwa kremu łagodzącego \u2014 gdy skóra "oddała ciepło".',
    tip: "Lekkie pieczenie? Schłodź czystym, chłodnym okładem przed nałożeniem.",
  },
  {
    time: "Dni 1–10",
    text: "Krem z arniką i witaminą K 2–3× dziennie (rano, po południu, wieczorem).",
    tip: null,
  },
  {
    time: "Codziennie rano",
    text: "Filtr SPF 50 na odsłonięte nogi — ochrona przed przebarwieniami i gwarancja zdrowej skóry. Zdrowa skóra nie ulega przebarwieniom. Światło słoneczne w zakresie od światła żółtego do bliskiej podczerwieni stymuluje odporność, kolagen, napina skórę i chroni przed cellulitem.",
    tip: null,
  },
];

const goldenRules = [
  {
    icon: ThermometerSnowflake,
    title: "Unikaj gorąca",
    desc: "Gorące kąpiele i sauna rozszerzają naczynia krwionośne.",
    duration: "2 tygodnie",
  },
  {
    icon: Hand,
    title: "Delikatne osuszanie",
    desc: "Przykładaj ręcznik — nie pocieraj. Unikaj peelingów.",
    duration: "2 tygodnie",
  },
  {
    icon: Sun,
    title: "Chroń przed UV",
    desc: "Słońce i solarium to najczęstsza przyczyna ciemnych plamek po laserze.",
    duration: "min. 4 tygodnie",
  },
  {
    icon: Shirt,
    title: "Luźne ubrania",
    desc: "Ciasne jeansy drażnią skórę mechanicznie. Wybieraj luźne spodnie.",
    duration: "2 tygodnie",
  },
];

const normalSymptoms = [
  "Lekki obrzęk i zaczerwienienie (2–3 dni)",
  "Małe siniaki lub drobne strupki w miejscu strzału lasera",
  "Uczucie lekkiego swędzenia podczas gojenia",
];

const warnSymptoms = [
  "Pęcherze wypełnione płynem",
  "Nagły, silny ból lub duży, gorący obrzęk całej nogi",
  "Silne pieczenie nieustępujące po lekach i chłodzeniu",
];

const PielegnacjaNog = () => {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: "Pielęgnacja nóg po zabiegu laserowym Nd:YAG",
      description: "Instrukcja prawidłowej pielęgnacji nóg po zabiegu laserem Nd:YAG. Oś czasu aplikacji kremu z witaminą K i arniką, zasady ochrony UV oraz objawy wymagające kontaktu z lekarzem.",
      url: "https://mcml.pro/dla-pacjenta/pielegnacja-nog",
      lastReviewed: "2025-01-01",
      medicalAudience: {
        "@type": "PatientAudience",
        audienceType: "Patient",
      },
      mainContentOfPage: {
        "@type": "WebPageElement",
        cssSelector: ".glass-card",
      },
      specialty: {
        "@type": "MedicalSpecialty",
        name: "Dermatology",
      },
      about: {
        "@type": "MedicalProcedure",
        name: "Laser Nd:YAG do naczyniaków",
        procedureType: "https://schema.org/NoninvasiveProcedure",
        followup: "Aplikacja kremu z witaminą K i arniką, ochrona SPF 50, unikanie gorąca i UV przez min. 2–4 tygodnie.",
      },
      author: {
        "@type": "Physician",
        name: "lek. med. Jan Bujok",
        medicalSpecialty: "Phlebology",
      },
      publisher: {
        "@type": "MedicalClinic",
        name: "CML – Centrum Medycyny Laserowej",
        url: "https://mcml.pro",
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-medical-webpage", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="Pielęgnacja nóg po zabiegu laserowym – instrukcja"
      description="Jak prawidłowo pielęgnować nogi po zabiegu laserem Nd:YAG. Oś czasu aplikacji kremu, złote zasady bezpieczeństwa i objawy wymagające kontaktu z lekarzem."
      path="/dla-pacjenta/pielegnacja-nog"
    />

    {/* Hero */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      <div className="relative max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-sm font-sans uppercase tracking-[0.2em] text-primary mb-4"
        >
          Instrukcja pielęgnacji
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4"
        >
          Pielęgnacja nóg
          <br />
          <span className="text-primary italic">po zabiegu laserowym</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg text-muted-foreground max-w-2xl mx-auto font-serif italic"
        >
          Metoda Nd:YAG · Krem z witaminą K, arniką i pantenolem · SPF 50
        </motion.p>
      </div>
    </section>

    <div className="max-w-4xl mx-auto px-4 pb-20 space-y-20">
      <Breadcrumbs items={BREADCRUMBS_MAP["/dla-pacjenta/pielegnacja-nog"]} className="mb-4" />

      {/* Kluczowa zasada */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-10 border-l-4 border-primary">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Hand className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Klucz do sukcesu: wklepuj, nie wcieraj
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Naczynka są teraz w fazie obkurczania i zamykania. Krem nakładaj <strong className="text-foreground">opuszkami palców, delikatnie go wklepując</strong>. Pod żadnym pozorem nie masuj nóg — tarcie może spowodować ponowne otwarcie naczyń.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Timeline */}
      <section className="space-y-6">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">Oś czasu</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Kiedy i jak aplikować?</h2>
          <div className="premium-divider mb-2" />
        </motion.div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-primary/20 hidden md:block" />

          <div className="space-y-6">
            {timelineSteps.map((step, i) => (
              <motion.div
                key={i}
                {...stagger(i)}
                className="glass-card rounded-xl p-6 md:pl-16 relative"
              >
                <div className="hidden md:flex absolute left-3 top-6 w-7 h-7 rounded-full bg-primary text-primary-foreground items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-primary md:hidden" />
                  <span className="text-xs font-sans uppercase tracking-widest text-primary font-semibold">
                    {step.time}
                  </span>
                </div>
                <p className="text-foreground font-medium">{step.text}</p>
                {step.tip && (
                  <p className="text-sm text-muted-foreground mt-2 italic">💡 {step.tip}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Golden Rules */}
      <section className="space-y-6">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">Zasady bezpieczeństwa</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">4 złote zasady</h2>
          <div className="premium-divider mb-2" />
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {goldenRules.map((rule, i) => (
            <motion.div
              key={rule.title}
              {...stagger(i)}
              className="glass-card rounded-xl p-6 group hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <rule.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{rule.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{rule.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    <CalendarDays className="w-3 h-3" />
                    {rule.duration}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Symptoms comparison */}
      <section className="space-y-6">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">Kontrola objawów</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Co jest normalne?</h2>
          <div className="premium-divider mb-2" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Normal */}
          <motion.div {...fadeUp} className="glass-card rounded-xl p-6 border-t-4 border-green-500/60">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="font-bold text-foreground">Normalne objawy</h3>
            </div>
            <ul className="space-y-3">
              {normalSymptoms.map((s, i) => (
                <StaggeredListItem key={i} index={i} icon={<span className="text-green-500 mt-0.5 shrink-0">✓</span>} className="flex items-start gap-2 text-sm text-muted-foreground">
                  {s}
                </StaggeredListItem>
              ))}
            </ul>
          </motion.div>

          {/* Warning */}
          <motion.div {...fadeUp} className="glass-card rounded-xl p-6 border-t-4 border-red-500/60">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-foreground">Skontaktuj się z gabinetem</h3>
            </div>
            <ul className="space-y-3">
              {warnSymptoms.map((s, i) => (
                <StaggeredListItem key={i} index={i} icon={<span className="text-red-500 mt-0.5 shrink-0">⚠</span>} className="flex items-start gap-2 text-sm text-muted-foreground">
                  {s}
                </StaggeredListItem>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.p {...fadeUp} className="text-center text-muted-foreground font-serif italic text-sm max-w-lg mx-auto">
          Cierpliwość to Twój najlepszy sprzymierzeniec — naczynka potrzebują czasu, aby całkowicie się wchłonąć.
        </motion.p>
      </section>

      <PostOpExercises />

      <TestimonialsSection />

      {/* Cross-link: Profilaktyka żylaków */}
      <motion.section {...fadeUp}>
        <a
          href="/dla-pacjenta/profilaktyka-zylakow"
          className="group block rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-6 md:p-8 hover:border-primary/40 hover:from-primary/10 transition-all max-w-3xl mx-auto"
        >
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-4xl shrink-0">🛡️</div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs uppercase tracking-widest text-primary/70 mb-1">Strefa Pacjenta</p>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                Jak na co dzień zapobiegać nawrotom?
              </h3>
              <p className="text-sm text-muted-foreground">
                Czynniki ryzyka, sygnały ostrzegawcze i 6 filarów codziennej profilaktyki żylaków.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-primary shrink-0 transition-transform group-hover:translate-x-1" />
          </div>
        </a>
      </motion.section>

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🩺</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Masz pytania?</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Chcesz dobrać konkretne preparaty z apteki dopasowane do Twojego przypadku?
          Umów się na konsultację kontrolną.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
            Umów konsultację
          </a>
        </Button>
      </motion.section>
    </div>
  </div>
  );
};

export default PielegnacjaNog;
