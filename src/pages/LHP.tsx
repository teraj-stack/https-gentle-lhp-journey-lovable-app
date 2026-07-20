import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import HeroSection from "@/components/lhp/HeroSection";
import ComparisonChart from "@/components/lhp/ComparisonChart";
import SurvivalKit from "@/components/lhp/SurvivalKit";
import DiscomfortChart from "@/components/lhp/DiscomfortChart";
import Timeline from "@/components/lhp/Timeline";
import ProcedureSteps from "@/components/lhp/ProcedureSteps";
import QualificationScale from "@/components/lhp/QualificationScale";
import EbookBanner from "@/components/shared/EbookBanner";
import CTASection from "@/components/lhp/CTASection";
import LHPFAQ from "@/components/lhp/LHPFAQ";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import { motion } from "framer-motion";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import PreparationRecoveryCards from "@/components/shared/PreparationRecoveryCards";

const lhpSummary = [
  { label: "Przygotowanie", value: "Badanie proktologiczne (anoskopia), ocena stopnia zaawansowania choroby" },
  { label: "Czas trwania", value: "Od 20 minut do 1 godziny" },
  { label: "Znieczulenie", value: "Miejscowe lub ogólne (krótkie dożylne), zależnie od preferencji pacjenta" },
  { label: "Technika", value: "Bez wycinania — laser obkurcza guzek od wewnątrz. Energia powoduje koagulację naczyń zasilających hemoroid." },
  { label: "Rekonwalescencja", value: "Powrót do domu tego samego dnia. Dieta bogata w błonnik, nawadnianie, unikanie wysiłku przez kilka dni." },
  { label: "Efekty", value: "Znaczne zmniejszenie lub całkowite usunięcie hemoroidów, ustąpienie krwawienia i bólu. Brak blizn." },
  { label: "Możliwe powikłania", value: "Przejściowy obrzęk, niewielkie krwawienie, dyskomfort. Minimalne ryzyko nietrzymania stolca." },
  { label: "Cena", value: "od 4 500 zł — cena obejmuje zabieg i wszystkie wizyty kontrolne do czasu wygojenia" },
];

const sectionAnim = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const LHP = () => {
  return (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="LHP – Laserowe leczenie hemoroidów"
        description="Laserowa plastyka hemoroidów (LHP) w CML. Bez skalpela, krótka rekonwalescencja. Umów konsultację w Warszawie Wilanów."
        path="/leczenie/lhp"
      />
      <MedicalWebPageSchema
        name="LHP – Laserowe leczenie hemoroidów"
        description="Laserowa plastyka hemoroidów (LHP) w CML. Bez skalpela, krótka rekonwalescencja."
        path="/leczenie/lhp"
        specialty="Proctology"
      />
      <MedicalProcedureSchema
        name="LHP – Laserowa plastyka hemoroidów"
        description="Minimalnie inwazyjna metoda leczenia hemoroidów laserem diodowym. Energia lasera obkurcza guzek od wewnątrz, bez wycinania tkanek."
        bodyLocation="Kanał odbytu"
        procedureType="Percutaneous"
        preparation="Badanie proktologiczne (anoskopia), ocena stopnia zaawansowania choroby"
        followup="Powrót do domu tego samego dnia. Dieta bogata w błonnik, nawadnianie, unikanie wysiłku przez kilka dni."
        howPerformed="Bez wycinania — laser obkurcza guzek od wewnątrz. Energia powoduje koagulację naczyń zasilających hemoroid."
        risks="Przejściowy obrzęk, niewielkie krwawienie, dyskomfort. Minimalne ryzyko nietrzymania stolca."
        url="/leczenie/lhp"
      />
      <HeroSection />

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-20">
        <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/lhp"]} className="mb-8" />
        <motion.section {...sectionAnim}>
          <h2 className="section-title mb-3">
            1. Demitologizacja: Koniec z mitem "rzezi"
          </h2>
          <p className="section-subtitle mb-8">
            W LHP nie ma chirurgicznego cięcia na zewnątrz. Laser delikatnie obkurcza guzek od wewnątrz. Efekt? Brak otwartych ran, pełna ochrona zwieraczy i ułamek bólu, o którym czytałeś na starych forach.
          </p>
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
              Porównanie czasu wykluczenia (L4)
            </h3>
            <ComparisonChart />
          </div>
        </motion.section>

        <motion.section {...sectionAnim}>
          <h2 className="section-title mb-3">
            2. Jak wygląda zabieg? Krok po kroku
          </h2>
          <p className="section-subtitle mb-8">
            Cała procedura trwa 20–40 minut — krócej niż odcinek serialu. Przeprowadzamy Cię przez proces, abyś dokładnie wiedział, czego się spodziewać.
          </p>
          <ProcedureSteps />
        </motion.section>

        <motion.section {...sectionAnim}>
          <h2 className="section-title mb-3">
            3. Rozbrojenie bomby: Pierwszy Stolec
          </h2>
          <p className="section-subtitle mb-8">
            Wiemy, że boisz się pierwszej wizyty w toalecie. Nie zostawimy Cię z tym samego. Przygotowaliśmy precyzyjny "Zestaw Ratunkowy", który zamienia wielką niewiadomą w zarządzalny proces.
          </p>
          <SurvivalKit />
        </motion.section>

        <motion.section {...sectionAnim}>
          <h2 className="section-title mb-3">
            4. Logistyka i Wolność: Oś Czasu
          </h2>
          <p className="section-subtitle mb-8">
            Kluczowe dla osób z branży IT, kierowców i aktywnych zawodowo. Zobacz, jak przewidywalny jest Twój powrót do życia i pełnych dochodów.
          </p>
          <div className="glass-card p-6 rounded-2xl mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
              Trajektoria spadku dyskomfortu po LHP
            </h3>
            <DiscomfortChart />
          </div>
          <Timeline />
        </motion.section>

        <motion.section {...sectionAnim}>
          <h2 className="section-title mb-3">
            5. Czy kwalifikujesz się do zabiegu?
          </h2>
          <p className="section-subtitle mb-8">
            Skuteczność lasera zależy od stopnia zaawansowania. Czas działa na Twoją niekorzyść — każdy miesiąc zwlekania przybliża Cię do momentu, w którym laser może być już za późno.
          </p>
          <QualificationScale />
        </motion.section>

        <LHPFAQ fadeUp={sectionAnim} />

        <ProcedureSummaryTable rows={lhpSummary} fadeUp={sectionAnim} />

        <PreparationRecoveryCards
          procedureLabel="LHP — laserowe leczenie hemoroidów"
          preparationDescription="Krótka checklista: leki, dieta z błonnikiem, miękki stolec i wygodne ubranie. 5 minut na przeczytanie, dużo komfortu w dniu zabiegu."
          preparationHref="/dla-pacjenta/przygotowanie-lhp"
          recoveryDescription="Pierwsze dni po LHP, pielęgnacja, „zestaw ratunkowy” na pierwszy stolec i powrót do aktywności bez stresu."
          recoveryHref="/dla-pacjenta/zalecenia-po-lhp"
        />

        <RecoveryBoostBanner />

        <EbookBanner />

        <TestimonialsSection />

        <CTASection />
      </div>
    </div>
  );
};

export default LHP;
