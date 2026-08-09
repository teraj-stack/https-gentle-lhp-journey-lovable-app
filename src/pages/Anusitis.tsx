import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { ArrowRight, CheckCircle2, AlertTriangle, Pill, Shield } from "lucide-react";
import { StaggeredListItem } from "@/components/shared/StaggeredList";
import ParallaxSection from "@/components/ui/parallax-section";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";

import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import RelatedLinks from "@/components/shared/RelatedLinks";

const anusitisSummary = [
  { label: "Przygotowanie", value: "Badanie proktologiczne (anoskopia), wywiad w kierunku alergii, infekcji i chorób współistniejących." },
  { label: "Czas trwania", value: "Leczenie farmakologiczne — czas terapii indywidualny, zależny od przyczyny zapalenia." },
  { label: "Znieczulenie", value: "Nie dotyczy — leczenie zachowawcze (maści, czopki, leki doustne)." },
  { label: "Technika", value: "Farmakoterapia celowana w przyczynę zapalenia. Bez interwencji chirurgicznej." },
  { label: "Rekonwalescencja", value: "Brak okresu rekonwalescencji — leczenie ambulatoryjne, wizyty kontrolne wg zaleceń." },
  { label: "Efekty", value: "Ustąpienie świądu, pieczenia i sączenia. Zapobieganie powikłaniom (hemoroidy, szczelina, ropnie)." },
  { label: "Możliwe powikłania", value: "Charakter przewlekły — ryzyko nawrotów. Nieleczone zapalenie prowadzi do degradacji tkanek i poważniejszych patologii." },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const Anusitis = () => (
    <div className="min-h-screen pt-20">
      <SeoHead
        title="Zapalenie odbytu (anusitis) – diagnostyka i leczenie"
        description="Leczenie zapalenia odbytu w CML – diagnostyka przyczyn, farmakoterapia celowana. Ambulatoryjnie, bez chirurgii."
        path="/leczenie/anusitis"
      />
      <MedicalWebPageSchema
        name="Zapalenie odbytu (anusitis) – diagnostyka i leczenie"
        description="Leczenie zapalenia odbytu – diagnostyka przyczyn, farmakoterapia celowana. Ambulatoryjnie, bez chirurgii."
        path="/leczenie/anusitis"
        specialty="Proctology"
      />
      <MedicalProcedureSchema
        name="Zapalenie odbytu (anusitis) – diagnostyka i leczenie"
        description="Leczenie farmakologiczne zapalenia kanału odbytu. Celowana terapia przyczyny zapalenia, bez interwencji chirurgicznej."
        bodyLocation="Kanał odbytu"
        procedureType="Noninvasive"
        preparation="Badanie proktologiczne (anoskopia), wywiad w kierunku alergii, infekcji i chorób współistniejących."
        followup="Brak okresu rekonwalescencji — leczenie ambulatoryjne, wizyty kontrolne wg zaleceń."
        howPerformed="Farmakoterapia celowana w przyczynę zapalenia. Bez interwencji chirurgicznej."
        risks="Charakter przewlekły — ryzyko nawrotów. Nieleczone zapalenie prowadzi do degradacji tkanek."
        url="/leczenie/anusitis"
      />
    {/* Hero */}
    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="max-w-3xl">
          <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">Proktologia</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-6">
            Zapalenie odbytu (Anusitis)
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
            Skuteczne leczenie farmakologiczne świądu, pieczenia i dyskomfortu — zanim problem przerodzi się w poważniejsze powikłania.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
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
      <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/anusitis"]} className="mb-4" />
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
          ].map((text, i) => (
            <StaggeredListItem key={text} index={i} icon={<CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />}>
              {text}
            </StaggeredListItem>
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
            ].map((t, i) => (
              <StaggeredListItem key={t} index={i} icon={<CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />} className="flex items-start gap-2 text-sm text-foreground">
                {t}
              </StaggeredListItem>
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
            ].map((t, i) => (
              <StaggeredListItem key={t} index={i} icon={<AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />} className="flex items-start gap-2 text-sm text-foreground">
                {t}
              </StaggeredListItem>
              
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

      <ProcedureSummaryTable rows={anusitisSummary} fadeUp={fadeUp} />

      

      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <motion.section {...fadeUp} className="text-center py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-serif">
          Pozbądź się dyskomfortu
        </h2>
        <p className="text-muted-foreground mb-8">
          Wylecz zapalenie, zanim zmieni się w poważniejsze powikłania. Umów konsultację proktologiczną.
        </p>
        <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
            Umów Konsultację
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </motion.section>
    </div>
      <RelatedLinks path="/leczenie/anusitis" />

  </div>
);

export default Anusitis;
