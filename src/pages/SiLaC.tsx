import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { Button } from "@/components/ui/button";
import SiLaCHero from "@/components/silac/SiLaCHero";
import SiLaCProcedure from "@/components/silac/SiLaCProcedure";
import SiLaCAdvantages from "@/components/silac/SiLaCAdvantages";
import SiLaCComparison from "@/components/silac/SiLaCComparison";
import SiLaCIndications from "@/components/silac/SiLaCIndications";
import SiLaCRecovery from "@/components/silac/SiLaCRecovery";
import SiLaCFAQ from "@/components/silac/SiLaCFAQ";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import ProcedureDeepDive from "@/components/shared/ProcedureDeepDive";
import { silacDeepDive } from "@/content/procedures/silacDeepDive";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import PreparationRecoveryCards from "@/components/shared/PreparationRecoveryCards";
import PreparationChecklistSection from "@/components/shared/PreparationChecklistSection";
import { preparationChecklists } from "@/content/procedures/preparationChecklists";
import RelatedLinks from "@/components/shared/RelatedLinks";


const silacSummary = [
  { label: "Przygotowanie", value: "Badanie proktologiczne, ocena rozległości torbieli pilonidalnej. W niektórych przypadkach USG lub MRI." },
  { label: "Czas trwania", value: "Ok. 30 minut" },
  { label: "Znieczulenie", value: "Miejscowe" },
  { label: "Technika", value: "Przez nakłucie 2–3 mm wprowadza się sondę laserową, która od wewnątrz zamyka kanał torbieli energią lasera (SiLaC – Sinus Laser Closure). Bez wycinania tkanek." },
  { label: "Rekonwalescencja", value: "Powrót do pracy po 2–3 dniach. Pełna aktywność fizyczna po 4–6 tygodniach." },
  { label: "Efekty", value: "Skuteczność ok. 90%. Minimalna rana (nakłucie), brak rozległej blizny, zachowanie zdrowych tkanek." },
  { label: "Możliwe powikłania", value: "Niewielki ból pooperacyjny (2–3/10), przejściowy obrzęk, ryzyko nawrotu ok. 10%." },
  { label: "Cena", value: "8 000 zł — cena obejmuje zabieg i wszystkie wizyty kontrolne do czasu wygojenia" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const SiLaC = () => (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="SiLaC w CML | Leczenie torbieli pilonidalnej | Warszawa"
        description="SiLaC zamyka torbiel pilonidalną laserem przez nakłucie 2–3 mm, bez rozległej rany i blizny. Szybki powrót do normalności. Umów konsultację w CML. Zapraszamy."
        path="/leczenie/silac"
      />
      <MedicalWebPageSchema
        name="SiLaC – Laserowe leczenie torbieli pilonidalnej"
        description="SiLaC (Sinus Laser Closure) – laserowe zamykanie torbieli pilonidalnej. Mały otwór, szybkie gojenie."
        path="/leczenie/silac"
        specialty="Proctology"
      />
      <MedicalProcedureSchema
        name="SiLaC – Sinus Laser Closure"
        description="Laserowe leczenie torbieli pilonidalnej przez nakłucie 2–3 mm. Skuteczność ok. 90%, minimalna blizna."
        bodyLocation="Okolica kości krzyżowej"
        procedureType="Percutaneous"
        preparation="Badanie proktologiczne, ocena rozległości torbieli pilonidalnej. W niektórych przypadkach USG lub MRI."
        followup="Powrót do pracy po 2–3 dniach. Pełna aktywność fizyczna po 4–6 tygodniach."
        howPerformed="Przez nakłucie 2–3 mm wprowadza się sondę laserową, która od wewnątrz zamyka kanał torbieli energią lasera."
        risks="Niewielki ból pooperacyjny, przejściowy obrzęk, ryzyko nawrotu ok. 10%."
        url="/leczenie/silac"
      />
    <SiLaCHero />

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/silac"]} className="mb-4" />
      <SiLaCProcedure fadeUp={fadeUp} />
      <SiLaCAdvantages fadeUp={fadeUp} />
      <SiLaCComparison fadeUp={fadeUp} />
      <SiLaCIndications fadeUp={fadeUp} />
      <SiLaCRecovery fadeUp={fadeUp} />
      <ProcedureDeepDive content={silacDeepDive} fadeUp={fadeUp} />
      <SiLaCFAQ fadeUp={fadeUp} />
      <ProcedureSummaryTable rows={silacSummary} fadeUp={fadeUp} />

      <PreparationChecklistSection
        checklist={preparationChecklists.silac}
        pageUrl="https://mcml.pro/leczenie/silac"
      />

      <PreparationRecoveryCards
        procedureLabel="SiLaC — laserowe zamknięcie torbieli pilonidalnej"
        preparationDescription="Minimalistyczne przygotowanie: nawodnienie, czysta okolica zatoki, luźne ubranie. Zabieg trwa ok. 30 minut."
        preparationHref="/dla-pacjenta/przygotowanie-silac"
        recoveryDescription="Codzienna pielęgnacja zatoki, kontrole gojenia i powrót do aktywności po laserowym SiLaC."
        recoveryHref="/dla-pacjenta/zalecenia-po-silac"
      />

      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Torbiel pilonidalna — bez rozległej operacji
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          SiLaC to precyzyjne, oszczędzające leczenie laserowe torbieli pilonidalnej.
          Umów się na konsultację i sprawdź, czy kwalifikujesz się do zabiegu.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów konsultację</a>
        </Button>
      </motion.section>
    </div>
      <RelatedLinks path="/leczenie/silac" />

  </div>
);

export default SiLaC;
