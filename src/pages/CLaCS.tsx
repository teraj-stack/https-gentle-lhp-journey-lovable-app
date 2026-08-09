import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";
import CLaCSFAQ from "@/components/clacs/CLaCSFAQ";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";

import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import PreparationRecoveryCards from "@/components/shared/PreparationRecoveryCards";
import PreparationChecklistSection from "@/components/shared/PreparationChecklistSection";
import { preparationChecklists } from "@/content/procedures/preparationChecklists";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import VeinAnatomyImage from "@/components/shared/VeinAnatomyImage";
import RelatedLinks from "@/components/shared/RelatedLinks";

const clacsSummary = [
  { label: "Przygotowanie", value: "Konsultacja flebologiczna, ocena zmian naczyniowych. Unikać opalania 2 tygodnie przed zabiegiem, bez kremów na nogi w dniu zabiegu." },
  { label: "Czas trwania", value: "15–30 minut" },
  { label: "Znieczulenie", value: "Kriochłodzenie (bez igły) — zabieg niemal bezbolesny" },
  { label: "Technika", value: "Potrójne działanie: kriochłodzenie obkurcza naczynie, laser przezskórny zamyka je od zewnątrz, mikroskleroterapia dopełnia zamknięcie." },
  { label: "Rekonwalescencja", value: "Natychmiastowy powrót do aktywności. Pończocha uciskowa wg zaleceń, filtr SPF 50+ przez 4–6 tygodni." },
  { label: "Efekty", value: "Trwałe zamknięcie pajączków, teleangiektazji i drobnych żyłek do 3 mm. Zwykle 1–3 sesje w zależności od rozległości." },
  { label: "Możliwe powikłania", value: "Przejściowe zaczerwienienie, drobne siniaki, przebarwienia (ustępują samoistnie)." },
  { label: "Cena", value: "od 500 zł — cena obejmuje zabieg i wszystkie wizyty kontrolne do czasu wygojenia" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const howItWorks = [
  { emoji: "❄️", title: "Crio — schładzanie skóry", desc: "Zimny strumień powietrza zmniejsza ból i obkurcza naczynie, zwiększając skuteczność zabiegu." },
  { emoji: "💡", title: "Laser — fotokoagulacja", desc: "Precyzyjny laser przezskórny zamyka naczynie od zewnątrz, bez nakłuwania skóry." },
  { emoji: "💉", title: "Skleroterapia — zamknięcie", desc: "Mikroiniekcja sklerosantu dopełnia zamknięcie naczynia, zapewniając trwały efekt." },
];

const advantages = [
  { emoji: "🎯", title: "Potrójne działanie", desc: "Połączenie trzech technik daje lepsze efekty niż każda metoda osobno." },
  { emoji: "😌", title: "Minimalny dyskomfort", desc: "Kriochłodzenie znacząco redukuje ból — zabieg jest niemal bezbolesny." },
  { emoji: "✨", title: "Efekt estetyczny", desc: "Doskonałe rezultaty w usuwaniu pajączków, teleangiektazji i drobnych żyłek." },
  { emoji: "⏱️", title: "Szybka sesja", desc: "Zabieg trwa 15–30 minut, bez rekonwalescencji — wracasz do aktywności od razu." },
];

const indications = [
  "Pajączki naczyniowe na nogach",
  "Teleangiektazje (rozszerzone drobne naczynka)",
  "Siateczki naczyniowe (reticular veins)",
  "Drobne żylaki do 3 mm średnicy",
  "Zmiany naczyniowe po przebytej ciąży",
];

const preparation = [
  { title: "Nie opalaj się", desc: "Skóra nie powinna być opalona — unikaj słońca i solarium 2 tygodnie przed zabiegiem." },
  { title: "Bez balsamów", desc: "W dniu zabiegu nie nakładaj kremów ani balsamów na nogi." },
  { title: "Luźne ubranie", desc: "Załóż wygodne, luźne spodnie — po zabiegu możemy zalecić pończochę uciskową." },
];

const afterCare = [
  { emoji: "🧦", title: "ZAKAZ noszenia pończochy uciskowej", desc: "noszenie pończochy po zabiegu CLaCS istotnie podnosi ryzyko zakażenia skóry" },
  { emoji: "🚶‍♀️", title: "Spaceruj", desc: "Lekki ruch po zabiegu wspomaga gojenie." },
  { emoji: "☀️", title: "Chroń skórę", desc: "Stosuj filtr SPF 50+ na leczone miejsca przez 4–6 tygodni." },
  { emoji: "🔥", title: "Unikaj gorąca", desc: "Bez sauny, gorących kąpieli i intensywnego wysiłku przez 2 tygodnie." },
];

const CLaCS = () => (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="CLaCS – Usuwanie pajączków naczyniowych"
      description="CLaCS (Crio Laser and Crio Sclerotherapy) – innowacyjne usuwanie pajączków żylnych w CML. Bez igieł, niemal bezbolesne."
      path="/leczenie/clacs"
    />
    <MedicalWebPageSchema
      name="CLaCS – Usuwanie pajączków naczyniowych"
      description="CLaCS (Crio Laser and Crio Sclerotherapy) – innowacyjne usuwanie pajączków żylnych. Bez igieł, niemal bezbolesne."
      path="/leczenie/clacs"
      specialty="Phlebology"
    />
    <MedicalProcedureSchema
      name="CLaCS – Crio Laser and Crio Sclerotherapy"
      description="Potrójne działanie: kriochłodzenie, laser przezskórny i mikroskleroterapia do usuwania pajączków i teleangiektazji."
      bodyLocation="Kończyny dolne — naczynia powierzchowne"
      procedureType="Noninvasive"
      preparation="Konsultacja flebologiczna, ocena zmian naczyniowych. Unikać opalania 2 tygodnie przed zabiegiem."
      followup="Natychmiastowy powrót do aktywności. Pończocha uciskowa wg zaleceń, filtr SPF 50+ przez 4–6 tygodni."
      howPerformed="Kriochłodzenie obkurcza naczynie, laser przezskórny zamyka je od zewnątrz, mikroskleroterapia dopełnia zamknięcie."
      risks="Przejściowe zaczerwienienie, drobne siniaki, przebarwienia (ustępują samoistnie)."
      url="/leczenie/clacs"
    />
    {/* Hero */}
    <ParallaxSection className="gradient-bg py-16 md:py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mx-auto text-center"
      >
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary-foreground/60 mb-4">
          Flebologia estetyczna
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          CLaCS — Pajączki i drobne naczynia
        </h1>
        <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Crio Laser and Crio Sclerotherapy — zaawansowana metoda łącząca trzy techniki w jednym zabiegu dla najlepszych efektów estetycznych.
        </p>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/clacs"]} className="mb-4" />

      {/* Anatomia naczyń — co celuje CLaCS */}
      <VeinAnatomyImage
        fadeUp={fadeUp}
        title="Co dokładnie zamyka CLaCS?"
        subtitle="Kriochłodzenie i laser obkurczają pajączek w skórze właściwej, a mikrodawka sklerosantu zamyka żyłę zasilającą — bez tego naczynka szybko wracają."
      />

      {/* Jak działa CLaCS */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Jak działa CLaCS?</h2>
        <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
          CLaCS łączy trzy synergiczne techniki w jednej sesji — kriochłodzenie, laser przezskórny i skleroterapię — zapewniając skuteczniejsze i komfortowe zamykanie drobnych naczyń.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {howItWorks.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="glass-card rounded-2xl p-6 text-center"
            >
              <div className="text-4xl mb-4">{item.emoji}</div>
              <h3 className="font-bold text-foreground text-base mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Zalety */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Dlaczego CLaCS?</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {advantages.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-card rounded-xl p-6 flex gap-4 items-start"
            >
              <div className="text-3xl shrink-0">{a.emoji}</div>
              <div>
                <h4 className="font-bold text-foreground text-sm mb-1">{a.title}</h4>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Wskazania */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Wskazania</h2>
        <p className="section-subtitle mb-10 text-center">
          CLaCS jest idealną metodą dla pacjentów z drobnymi zmianami naczyniowymi o charakterze estetycznym.
        </p>
        <div className="glass-card rounded-2xl p-8 max-w-2xl mx-auto">
          <ul className="space-y-3">
            {indications.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="flex items-center gap-3 text-sm text-foreground"
              >
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Przygotowanie */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Przygotowanie do zabiegu</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {preparation.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass-card rounded-xl p-6"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm mb-4">
                {i + 1}
              </div>
              <h4 className="font-bold text-foreground text-sm mb-2">{p.title}</h4>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Po zabiegu */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Po zabiegu</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {afterCare.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-card rounded-xl p-6 text-center"
            >
              <div className="text-3xl mb-3">{a.emoji}</div>
              <h4 className="font-bold text-foreground text-sm mb-1">{a.title}</h4>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* FAQ */}
      <CLaCSFAQ fadeUp={fadeUp} />
      <ProcedureSummaryTable rows={clacsSummary} fadeUp={fadeUp} />

      {/* E-book baner */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-10 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="w-24 sm:w-32 shrink-0">
            <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-accent-foreground/70 to-primary/80 shadow-xl flex flex-col items-center justify-center p-3 text-primary-foreground">
              <BookOpen className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-[10px] uppercase tracking-[0.15em] opacity-60 mb-1 font-sans">CML</p>
              <h3 className="text-[10px] font-bold text-center leading-snug font-serif">Odzyskaj beztroskę</h3>
              <div className="w-6 h-px bg-primary-foreground/30 my-2" />
              <p className="text-[9px] text-center opacity-70 font-sans">E-book PDF</p>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-foreground mb-2">Pajączki i naczynka — Przewodnik dla Pacjentki</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Skąd się biorą pajączki? Dlaczego ukrywanie jest niebezpieczne? Jak metoda CLaCS zamyka naczynka trwale i komfortowo? Przeczytaj nasz kompletny przewodnik.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/dla-pacjenta/pajaczki">
                  Czytaj online
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      

      <PreparationChecklistSection
        checklist={preparationChecklists.clacs}
        pageUrl="https://mcml.pro/leczenie/clacs"
      />

      <PreparationRecoveryCards
        procedureLabel="CLaCS — hybrydowe usuwanie pajączków"
        preparationDescription="Bez opalania, bez samoopalaczy, bez balsamów na nogach. Krótka lista zasad, które gwarantują czyste efekty fototermolizy."
        preparationHref="/dla-pacjenta/przygotowanie-clacs"
        recoveryDescription="Ochrona przed słońcem, pończocha uciskowa, kontrole — co robić w pierwszych 6 tygodniach po CLaCS."
        recoveryHref="/dla-pacjenta/zalecenia-po-clacs"
      />

      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">✨</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Odzyskaj piękne nogi</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          CLaCS to najnowocześniejsza metoda usuwania pajączków naczyniowych i drobnych żyłek. Umów się na konsultację.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów konsultację</a>
        </Button>
      </motion.section>
    </div>
      <RelatedLinks path="/leczenie/clacs" />

  </div>
);

export default CLaCS;
