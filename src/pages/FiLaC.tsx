import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { Button } from "@/components/ui/button";
import FiLaCHero from "@/components/filac/FiLaCHero";
import FiLaCProcedure from "@/components/filac/FiLaCProcedure";
import FiLaCAdvantages from "@/components/filac/FiLaCAdvantages";
import FiLaCComparison from "@/components/filac/FiLaCComparison";
import FiLaCIndications from "@/components/filac/FiLaCIndications";
import FiLaCFistulaTypes from "@/components/filac/FiLaCFistulaTypes";
import FiLaCRecovery from "@/components/filac/FiLaCRecovery";
import FiLaCFAQ from "@/components/filac/FiLaCFAQ";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import PreparationRecoveryCards from "@/components/shared/PreparationRecoveryCards";


const filacSummary = [
  { label: "Przygotowanie", value: "Diagnostyka obrazowa (USG transrektalne lub MRI miednicy) — dokładne zmapowanie kanału przetoki" },
  { label: "Czas trwania", value: "30–60 minut" },
  { label: "Znieczulenie", value: "Miejscowe, podpajęczynówkowe lub krótkie dożylne (zależnie od złożoności)" },
  { label: "Technika", value: "Elastyczny światłowód laserowy wprowadzany do kanału przetoki zamyka go od wewnątrz — bez rozcinania zwieraczy." },
  { label: "Rekonwalescencja", value: "Szybki powrót do aktywności (kilka dni). Ból pooperacyjny minimalny vs klasyczne operacje." },
  { label: "Efekty", value: "Trwałe zamknięcie kanału przetoki przy zachowaniu pełnego trzymania stolca i gazów" },
  { label: "Możliwe powikłania", value: "Ropień w miejscu po przetoce, nawrót przetoki, przejściowy wyciek wydzieliny" },
  { label: "Cena", value: "od 4 300 zł — cena obejmuje zabieg i wszystkie wizyty kontrolne do czasu wygojenia" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const FiLaC = () => (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="FiLaC – Laserowe leczenie przetok odbytu"
        description="FiLaC (Fistula Laser Closure) – zamykanie przetok laserem w CML. Minimalnie inwazyjne, ochrona zwieraczy. Warszawa."
        path="/leczenie/filac"
      />
      <MedicalWebPageSchema
        name="FiLaC – Laserowe leczenie przetok odbytu"
        description="FiLaC (Fistula Laser Closure) – zamykanie przetok laserem. Minimalnie inwazyjne, ochrona zwieraczy."
        path="/leczenie/filac"
        specialty="Proctology"
      />
      <MedicalProcedureSchema
        name="FiLaC – Fistula Laser Closure"
        description="Laserowe zamykanie przetok odbytu od wewnątrz, bez rozcinania zwieraczy. Zachowuje pełne trzymanie stolca."
        bodyLocation="Kanał odbytu – przetoka"
        procedureType="Percutaneous"
        preparation="Diagnostyka obrazowa (USG transrektalne lub MRI miednicy) — dokładne zmapowanie kanału przetoki"
        followup="Szybki powrót do aktywności (kilka dni). Ból pooperacyjny minimalny vs klasyczne operacje."
        howPerformed="Elastyczny światłowód laserowy wprowadzany do kanału przetoki zamyka go od wewnątrz — bez rozcinania zwieraczy."
        risks="Ropień w miejscu po przetoce, nawrót przetoki, przejściowy wyciek wydzieliny"
        url="/leczenie/filac"
      />
    <FiLaCHero />

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/filac"]} className="mb-4" />
      <FiLaCProcedure fadeUp={fadeUp} />
      <FiLaCAdvantages fadeUp={fadeUp} />
      <FiLaCComparison fadeUp={fadeUp} />
      <FiLaCIndications fadeUp={fadeUp} />
      <FiLaCFistulaTypes fadeUp={fadeUp} />
      <FiLaCRecovery fadeUp={fadeUp} />
      <FiLaCFAQ fadeUp={fadeUp} />
      <ProcedureSummaryTable rows={filacSummary} fadeUp={fadeUp} />

      <PreparationRecoveryCards
        procedureLabel="FiLaC — laserowe zamknięcie przetoki"
        preparationDescription="Leki, dieta z błonnikiem, miękki stolec i higiena okolicy. Kilka kroków, które zwiększają skuteczność i komfort zabiegu."
        preparationHref="/dla-pacjenta/przygotowanie-filac"
        recoveryDescription="Pielęgnacja po FiLaC, pierwsze stolce, kontrole gojenia i powrót do aktywności — bez stresu, ze wsparciem zespołu."
        recoveryHref="/dla-pacjenta/zalecenia-po-filac"
      />

      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Przetoka nie musi oznaczać klasycznej operacji
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          FiLaC to precyzyjne, oszczędzające leczenie laserowe przetok odbytu. 
          Umów się na konsultację i sprawdź, czy kwalifikujesz się do zabiegu.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów konsultację</a>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default FiLaC;
