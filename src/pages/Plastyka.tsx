import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { ArrowRight, CheckCircle2, Clock, Shield, Sparkles, Heart } from "lucide-react";
import { StaggeredListItem } from "@/components/shared/StaggeredList";
import ParallaxSection from "@/components/ui/parallax-section";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";

import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import PreparationRecoveryCards from "@/components/shared/PreparationRecoveryCards";
import PreparationChecklistSection from "@/components/shared/PreparationChecklistSection";
import { preparationChecklists } from "@/content/procedures/preparationChecklists";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import RelatedLinks from "@/components/shared/RelatedLinks";

const plastykaSummary = [
  { label: "Przygotowanie", value: "Konsultacja proktologiczna, ocena zmian skórnych" },
  { label: "Czas trwania", value: "20–40 minut" },
  { label: "Znieczulenie", value: "Miejscowe (nasiękowe)" },
  { label: "Technika", value: "Laserowa korekta: precyzyjne usunięcie nadmiaru skóry laserem CO₂ lub diodowym. Laser jednocześnie tnie i koaguluje naczynia." },
  { label: "Rekonwalescencja", value: "Powrót do domu tego samego dnia. Dyskomfort przy siedzeniu przez ok. 7–10 dni. Wymagana szczególna higiena." },
  { label: "Efekty", value: "Usunięcie defektu kosmetycznego, wygładzenie okolicy odbytu, ułatwienie higieny intymnej" },
  { label: "Możliwe powikłania", value: "Ból w pierwszych dniach, niewielkie krwawienie, infekcja rany (przy braku higieny), obrzęk" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.12 },
});

const Plastyka = () => (
    <div className="min-h-screen pt-20">
      <SeoHead
        title="Plastyka odbytu w CML | Usuwanie fałdów | Warszawa"
        description="Laserowa plastyka odbytu usuwa naddatki skórne i poprawia estetykę okolicy — bez szwów. Szybki powrót do normalności. Umów konsultację w CML Warszawa."
        path="/leczenie/plastyka"
      />
      <MedicalWebPageSchema
        name="Plastyka odbytu – estetyka i komfort"
        description="Laserowa plastyka odbytu – usunięcie naddatków skórnych i poprawka estetyki. Precyzja lasera CO₂, szybkie gojenie."
        path="/leczenie/plastyka"
        specialty="Proctology"
      />
      <MedicalProcedureSchema
        name="Plastyka odbytu – estetyka i komfort"
        description="Laserowa korekta zmian skórnych okolicy odbytu: nadmierne fałdy, nierówności i defekty pooperacyjne."
        bodyLocation="Okolica odbytu"
        procedureType="Surgical"
        preparation="Konsultacja proktologiczna, ocena zmian skórnych"
        followup="Powrót do domu tego samego dnia. Dyskomfort przy siedzeniu przez ok. 7–10 dni. Wymagana szczególna higiena."
        howPerformed="Laserowa korekta: precyzyjne usunięcie nadmiaru skóry laserem CO₂ lub diodowym. Laser jednocześnie tnie i koaguluje naczynia."
        risks="Ból w pierwszych dniach, niewielkie krwawienie, infekcja rany (przy braku higieny), obrzęk"
        url="/leczenie/plastyka"
      />
    {/* Hero */}
    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-3xl">
          <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">Proktologia Estetyczna</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-6">
            Plastyka okolicy odbytu
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
            Estetyka i komfort — nowoczesna, laserowa korekta przywracająca naturalny wygląd i pewność siebie.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację Estetyczną</a>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    {/* Metrics */}
    <section className="py-10 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Clock, label: "10–20 minut", sub: "Czas trwania zabiegu" },
            { icon: Shield, label: "Znieczulenie miejscowe", sub: "Pełna bezbolesność" },
            { icon: Sparkles, label: "Laser", sub: "Precyzyjna korekta" },
            { icon: Heart, label: "Dyskrecja", sub: "Pełna poufność" },
          ].map((item, i) => (
            <motion.div key={item.label} {...stagger(i)} className="flex items-start gap-3">
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
      <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/plastyka"]} className="mb-4" />
      {/* Intro */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Estetyka i komfort w jednym zabiegu
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Współczesna proktologia to nie tylko leczenie chorób, ale także dbałość o komfort i samopoczucie pacjenta. Doskonale rozumiemy, że zdrowie to także poczucie pewności siebie we własnym ciele.
          </p>
          <p>
            Wielu pacjentów — a dotyczy to szczególnie młodych kobiet — zgłasza się do nas nie z powodu bólu, ale z powodu niechcianych zmian skórnych w okolicy odbytu. Tzw. fałdy brzeżne mogą być przyczyną frustracji, utrudniać higienę, a nawet obniżać jakość życia. W naszej klinice traktujemy ten problem z pełną powagą i dyskrecją.
          </p>
        </div>
      </motion.section>

      {/* Czym są fałdy */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Czym są fałdy brzeżne?
        </h2>
        <div className="glass-card p-8 rounded-2xl space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Fałdy brzeżne to luźne fragmenty skóry (anodermy) znajdujące się na zewnętrznym brzegu kanału odbytu. Przypominają niewielkie, miękkie guzki. Nie są chorobą samą w sobie, ale stanowią defekt kosmetyczny i funkcjonalny.
          </p>
          <p>
            Najczęstszą przyczyną jest przebyta zakrzepica brzeżna lub stany zapalne. Gwałtowne rozciągnięcie skóry (np. podczas ciąży, porodu lub silnego parcia) powoduje, że po ustąpieniu obrzęku tkanka nie wraca do pierwotnego kształtu.
          </p>
        </div>
      </motion.section>

      {/* Objawy */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Objawy, które skłaniają do zabiegu
        </h2>
        <ul className="space-y-3">
          {[
            "Wyczuwalny, miękki i zazwyczaj niebolesny guzek na zewnątrz odbytu",
            "Wystające fałdy skóry, których nie da się odprowadzić",
            "Trudności z utrzymaniem idealnej higieny",
            "Dyskomfort estetyczny i psychiczny",
          ].map((text, i) => (
            <StaggeredListItem key={text} index={i} icon={<CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />}>
              {text}
            </StaggeredListItem>
          ))}
        </ul>
      </motion.section>

      {/* Zabieg */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Na czym polega zabieg?
        </h2>
        <div className="glass-card p-8 rounded-2xl">
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: "Czas trwania", desc: "Zabieg zajmuje zazwyczaj 10–20 minut." },
              { title: "Znieczulenie", desc: "Stosujemy znieczulenie miejscowe zapewniające pełen komfort i bezbolesność." },
              { title: "Przebieg", desc: "Lekarz usuwa nadmiar tkanki przy użyciu lasera. Podczas prawidłowo wykonanej plastyki okolicy odbytu nigdy nie zakłada się szwów. Szwy w okolicy odbytu prowokują jedynie większe bliznowacenie i ból." },
              { title: "Efekt", desc: "Celem jest przywrócenie naturalnego wyglądu i funkcjonalności okolicy odbytu." },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Przygotowanie */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Przygotowanie do zabiegu
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed mb-6">
          <p>
            Choć sam zabieg jest krótki, odpowiednie przygotowanie organizmu przyspiesza gojenie i minimalizuje dolegliwości.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { step: "1", title: "Wsparcie diety (2 tygodnie przed)", desc: "Probiotyk CDS22-formula oraz specjalna mieszanka ziołowa poprawiająca florę bakteryjną jelit." },
            { step: "2", title: "Zmiana nawyków żywieniowych", desc: "Warzywa korzeniowe (marchew, seler, burak) oraz produkty kiszone (ogórki, zakwas buraczany)." },
            { step: "3", title: "Cel przygotowania", desc: "Regulacja rytmu wypróżnień i konsystencji stolca — kluczowe dla ochrony miejsca zabiegowego." },
          ].map((item) => (
            <div key={item.step} className="glass-card p-6 rounded-2xl flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <ProcedureSummaryTable rows={plastykaSummary} fadeUp={fadeUp} />

      

      <PreparationChecklistSection
        checklist={preparationChecklists.plastyka}
        pageUrl="https://mcml.pro/leczenie/plastyka"
      />

      <PreparationRecoveryCards
        procedureLabel="Plastyka okolicy odbytu — laserowo, bez szwów"
        preparationDescription="Leki, miękki stolec, higiena i wygodne ubranie. Krótka checklista przed laserową plastyką okolicy odbytu."
        preparationHref="/dla-pacjenta/przygotowanie-plastyka"
        recoveryDescription="Pierwsze dni po plastyce, pielęgnacja okolicy odbytu, kontrole gojenia i powrót do aktywności."
        recoveryHref="/dla-pacjenta/zalecenia-po-plastyce"
      />

      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <motion.section {...fadeUp} className="text-center py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-serif">
          Odzyskaj komfort i pewność siebie
        </h2>
        <p className="text-muted-foreground mb-8">
          Powrót do codziennych aktywności jest szybki, a wizyta kontrolna odbywa się po 10–14 dniach.
        </p>
        <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
            Umów Konsultację Estetyczną
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </motion.section>
    </div>
      <RelatedLinks path="/leczenie/plastyka" />

  </div>
);

export default Plastyka;
