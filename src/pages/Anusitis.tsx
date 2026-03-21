import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { ArrowRight, CheckCircle2, AlertTriangle, Pill, Shield } from "lucide-react";
import ParallaxSection from "@/components/ui/parallax-section";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const Anusitis = () => (
  <div className="min-h-screen pt-20">
    {/* Hero */}
    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="max-w-3xl">
          <p className="text-primary-foreground/60 text-sm font-sans uppercase tracking-[0.2em] mb-6">Proktologia</p>
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-[1.1] mb-6">
            Zapalenie odbytu (Anusitis)
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed max-w-2xl mb-10">
            Skuteczne leczenie farmakologiczne świądu, pieczenia i dyskomfortu — zanim problem przerodzi się w poważniejsze powikłania.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <Link to="/kontakt">Umów Konsultację</Link>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    {/* Metrics */}
    <section className="py-10 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Pill, label: "Leczenie farmakologiczne", sub: "Maści, czopki, leki doustne" },
            { icon: Shield, label: "Profilaktyka powikłań", sub: "Zapobieganie hemoroidom" },
            { icon: AlertTriangle, label: "Nie bagatelizuj", sub: "Charakter przewlekły" },
          ].map((item, i) => (
            <motion.div key={item.label} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.12 }} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 space-y-20">
      <Breadcrumbs items={[{ label: "Proktologia" }, { label: "Zapalenie odbytu" }]} className="mb-4" />
      {/* Co to jest */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Czym jest zapalenie kanału odbytu?
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Anusitis, czyli zapalenie kanału odbytu, to jedna z najczęstszych, a zarazem najczęściej bagatelizowanych dolegliwości proktologicznych. Często towarzyszy innym chorobom, takim jak hemoroidy czy szczelina odbytu, będąc niejednokrotnie pierwotną przyczyną ich powstania.
          </p>
          <p>
            Przez lata dolegliwość funkcjonowała pod potoczną nazwą „zespół mokrego odbytu". Dziś wiemy, że problem leży głębiej — w mechanizmach immunologicznych i stanie zapalnym tkanek.
          </p>
        </div>
      </motion.section>

      {/* Objawy */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Objawy, które powinny Cię zaniepokoić
        </h2>
        <ul className="space-y-3">
          {[
            "Uporczywy świąd okolic odbytu",
            "Pieczenie, szczypanie lub ból",
            "Uczucie wilgoci — sączenie się wydzieliny zapalnej",
            "Ślady krwi na papierze toaletowym",
          ].map((text) => (
            <li key={text} className="flex items-start gap-3 text-sm text-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              {text}
            </li>
          ))}
        </ul>
      </motion.section>

      {/* Przyczyny */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Przyczyny zapalenia
        </h2>
        <div className="glass-card p-8 rounded-2xl">
          <p className="text-muted-foreground leading-relaxed mb-4">
            Anusitis to niejednorodna grupa schorzeń. To, co odczuwasz jako świąd, jest najczęściej objawem innej patologii. Najczęstsze przyczyny to:
          </p>
          <ul className="space-y-2">
            {[
              "Infekcje (bakteryjne, grzybicze, wirusowe)",
              "Reakcje alergiczne (kosmetyki, papier toaletowy, środki piorące)",
              "Choroby autoimmunologiczne",
              "Stan po radioterapii",
              "Nadwrażliwość kontaktowa",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Powikłania */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Dlaczego nie wolno bagatelizować?
        </h2>
        <div className="glass-card p-8 rounded-2xl border-l-4 border-primary">
          <p className="text-muted-foreground leading-relaxed mb-4">
            Choroba ma charakter przewlekły — okresy zaostrzeń przeplatają się z okresami ulgi. Nieleczony, przewlekły stan zapalny prowadzi do degradacji włókien kolagenowych. Konsekwencje to:
          </p>
          <ul className="space-y-2">
            {[
              "Powstanie hemoroidów (nadmierne rozciągnięcie osłabionej anodermy)",
              "Szczelina odbytu (zwiotczała skóra łatwiej pęka)",
              "Ropnie i przetoki (w stanach ostrego zapalenia)",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Leczenie */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Jak wygląda leczenie?
        </h2>
        <div className="glass-card p-8 rounded-2xl">
          <p className="text-muted-foreground leading-relaxed mb-4">
            Dobra wiadomość — w przypadku Anusitis leczenie ogranicza się zazwyczaj do farmakoterapii. Kluczem jest dobranie odpowiednich leków (maści, czopki, leki doustne) celujących w przyczynę zapalenia.
          </p>
          <p className="text-foreground font-semibold text-sm">
            Prawidłowo poprowadzona terapia pozwala uniknąć powikłań i konieczności interwencji chirurgicznej w przyszłości.
          </p>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section {...fadeUp} className="text-center py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-serif">
          Pozbądź się dyskomfortu
        </h2>
        <p className="text-muted-foreground mb-8">
          Wylecz zapalenie, zanim zmieni się w poważniejsze powikłania. Umów konsultację proktologiczną.
        </p>
        <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
          <Link to="/kontakt">
            Umów Konsultację
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default Anusitis;
