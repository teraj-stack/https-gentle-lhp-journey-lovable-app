import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { Button } from "@/components/ui/button";
import SkleroterapiaFAQ from "@/components/skleroterapia/SkleroterapiaFAQ";
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

const skleroterapiaSummary = [
  { label: "Przygotowanie", value: "USG Doppler żył" },
  { label: "Czas trwania", value: "20–40 minut" },
  { label: "Znieczulenie", value: "Nie jest wymagane (zabieg praktycznie bezbolesny)" },
  { label: "Technika", value: "Pod kontrolą USG lekarz wstrzykuje do żyły lek w formie gęstej pianki, powodując sklejenie i wchłonięcie naczynia." },
  { label: "Rekonwalescencja", value: "Natychmiastowy powrót do aktywności. Pończocha uciskowa przez 5–7 dni." },
  { label: "Efekty", value: "Zanik widocznych żylaków i żył siateczkowatych" },
  { label: "Możliwe powikłania", value: "Przebarwienia (brązowe paski), zgrubienia, siniaki w miejscu wkłucia" },
  { label: "Cena", value: "od 600 zł (1–2 ampułki) / od 1 500 zł (duże żylaki) — cena obejmuje zabieg i wszystkie wizyty kontrolne do czasu wygojenia" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const indications = [
  { emoji: "〰️", title: "Kręte żyły", desc: "Idealna tam, gdzie skomplikowany przebieg naczynia utrudnia zastosowanie innych technik zabiegowych." },
  { emoji: "🎯", title: "Trudne perforatory", desc: "Niezastąpiona w precyzyjnym zamykaniu głęboko położonych naczyń łączących (żył przeszywających)." },
  { emoji: "🔄", title: "Uzupełnienie EVLT", desc: "Doskonała jako zabieg uzupełniający po laserowej ablacji głównych pni żylnych." },
];

const stats = [
  { value: "20", unit: "min", desc: "Minimalny czas trwania niemal bezbolesnej procedury w klinice." },
  { value: "0", unit: "dni", desc: "Czasu spędzonego w łóżku. Wymagany jest natychmiastowy powrót do lekkiego ruchu." },
  { value: "100", unit: "%", desc: "Naszego skupienia na wykluczeniu przeciwwskazań i zapewnieniu bezpieczeństwa." },
];

const preparation = [
  { title: "Zrezygnuj z balsamów", desc: "Skóra musi być sucha i czysta dla precyzji lekarza." },
  { title: "Nie gól nóg", desc: "Unikaj depilacji tuż przed wizytą, aby zapobiec podrażnieniom." },
  { title: "Wybierz luźne ubranie", desc: "Po zabiegu nałożymy pończochę uciskową, luźne spodnie będą najwygodniejsze." },
];

const afterCare = [
  { emoji: "🧦", title: "Noś ucisk", desc: "Kluczowy element terapii wyznaczony przez lekarza." },
  { emoji: "🚶‍♀️", title: "Spaceruj", desc: "Codzienny ruch wspomaga krążenie." },
  { emoji: "🔥", title: "Unikaj gorąca", desc: "Zero sauny, gorących kąpieli i opalania przez kilka tygodni." },
  { emoji: "🏋️‍♀️", title: "Bez wysiłku", desc: "Odłóż ciężkie treningi siłowe na później." },
];

const contraindications = [
  "🤰 Ciąża i karmienie",
  "🩸 Zakrzepica żył głębokich",
  "🦠 Poważne infekcje",
  "⚠️ Uczulenie na sklerosant",
  "🦽 Ograniczenie poruszania się",
];

const Skleroterapia = () => {
  return (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="Skleroterapia w CML | Leczenie żylaków bez operacji"
        description="Skleroterapia piankowa zamyka żylaki i pajączki bez operacji i bez znieczulenia, w kilkanaście minut. Szybki powrót do normalności. Umów wizytę w CML."
        path="/leczenie/skleroterapia"
      />
      <MedicalWebPageSchema
        name="Skleroterapia piankowa żylaków"
        description="Skleroterapia piankowa – zamykanie żylaków bez operacji. Zabieg bezbolesny, natychmiastowy powrót do aktywności."
        path="/leczenie/skleroterapia"
        specialty="Phlebology"
      />
      <MedicalProcedureSchema
        name="Skleroterapia piankowa żylaków"
        description="Zamykanie żylakowatych naczyń za pomocą iniekcji pianki sklerotyzującej pod kontrolą USG."
        bodyLocation="Żyły kończyn dolnych"
        procedureType="Noninvasive"
        preparation="USG Doppler żył"
        followup="Natychmiastowy powrót do aktywności. Pończocha uciskowa przez 5–7 dni."
        howPerformed="Pod kontrolą USG lekarz wstrzykuje do żyły lek w formie gęstej pianki, powodując sklejenie i wchłonięcie naczynia."
        risks="Przebarwienia (brązowe paski), zgrubienia, siniaki w miejscu wkłucia"
        url="/leczenie/skleroterapia"
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
          Flebologia zabiegowa
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Skleroterapia żylaków
        </h1>
        <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Skuteczna metoda zamykania żylakowato zmienionych naczyń — precyzyjne podanie sklerosantu pod kontrolą USG eliminuje chore żyły bez nacięć.
        </p>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/skleroterapia"]} className="mb-4" />

      {/* Anatomia naczyń — co zamykamy sklerosantem */}
      <VeinAnatomyImage
        fadeUp={fadeUp}
        title="Co zamykamy podczas skleroterapii?"
        subtitle="Pianka sklerotyzująca trafia precyzyjnie do żyły zasilającej w skórze właściwej i głębszych żył siateczkowatych — zamknięcie samego pajączka bez źródła ciśnienia byłoby tylko kosmetyką."
      />

      {/* Wskazania */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Kiedy skleroterapia sprawdza się najlepiej?</h2>
        <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
          Skleroterapia jest „metodą z wyboru" w precyzyjnych zadaniach, gdzie inne techniki mogą napotykać trudności — szczególnie w leczeniu dużych, żylakowato zmienionych naczyń o skomplikowanym przebiegu.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {indications.map((item, i) => (
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

      {/* Skuteczność */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Skuteczność i Bezpieczeństwo</h2>
        <div className="glass-card rounded-2xl p-8 md:p-10 max-w-3xl mx-auto">
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
            Skleroterapia piankowa pod kontrolą USG jest skuteczną metodą zamykania dużych żylaków o krętym przebiegu. W połączeniu z EVLT tworzy kompleksowy plan leczenia, który pozwala zamknąć <span className="text-primary font-bold">zarówno główne pnie, jak i bocznice żylne</span>. Jako specjaliści dobieramy odpowiednią technikę do każdego naczynia.
          </p>
        </div>
      </motion.section>

      {/* Zabieg w liczbach */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Zabieg w liczbach</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {stats.map((s, i) => (
            <motion.div
              key={s.unit}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass-card rounded-2xl p-8 text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-1">
                {s.value}<span className="text-2xl text-primary/70">{s.unit}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Przygotowanie */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Jak przygotować się do zabiegu?</h2>
        <p className="section-subtitle mb-10 text-center">
          Przygotowanie jest bardzo proste i wymaga pamiętania tylko o trzech zasadach.
        </p>
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

      {/* Powrót do formy */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Powrót do formy</h2>
        <p className="section-subtitle mb-10 text-center">
          Nie potrzebujesz zwolnienia lekarskiego. Ruch jest wręcz wskazany!
        </p>
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

      {/* Przeciwwskazania */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Zdrowie przede wszystkim: Przeciwwskazania</h2>
        <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
          Istnieją sytuacje, w których dla Twojego dobra zalecimy inną metodę lub przesuniemy zabieg w czasie.
        </p>
        <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
          {contraindications.map((c, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="glass-card rounded-full px-5 py-3 text-sm text-foreground font-medium"
            >
              {c}
            </motion.span>
          ))}
        </div>
      </motion.section>

      {/* FAQ */}
      <SkleroterapiaFAQ fadeUp={fadeUp} />
      <ProcedureSummaryTable rows={skleroterapiaSummary} fadeUp={fadeUp} />

      

      <PreparationChecklistSection
        checklist={preparationChecklists.skleroterapia}
        pageUrl="https://mcml.pro/leczenie/skleroterapia"
      />

      <PreparationRecoveryCards
        procedureLabel="Skleroterapia żył"
        preparationDescription="Leki, nawodnienie, ochrona przed słońcem i pończocha uciskowa. Krótkie przygotowanie, duża skuteczność."
        preparationHref="/dla-pacjenta/przygotowanie-skleroterapia"
        recoveryDescription="Kompresjoterapia, aktywność, ochrona przed słońcem — co robić tuż po skleroterapii i w kolejnych tygodniach."
        recoveryHref="/dla-pacjenta/zalecenia-po-skleroterapii"
      />

      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">💉</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Pozbądź się żylaków</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Skleroterapia to bezpieczny sposób na zamknięcie żylakowato zmienionych naczyń. Umów się na konsultację.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów konsultację</a>
        </Button>
      </motion.section>
      <RelatedLinks path="/leczenie/skleroterapia" />
    </div>
  </div>
  );
};

export default Skleroterapia;
