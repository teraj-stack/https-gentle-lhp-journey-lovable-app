import HeroSection from "@/components/lhp/HeroSection";
import ComparisonChart from "@/components/lhp/ComparisonChart";
import SurvivalKit from "@/components/lhp/SurvivalKit";
import DiscomfortChart from "@/components/lhp/DiscomfortChart";
import Timeline from "@/components/lhp/Timeline";
import CTASection from "@/components/lhp/CTASection";
import { motion } from "framer-motion";

const sectionAnim = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-20">
        {/* Section 1 */}
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

        {/* Section 2 */}
        <motion.section {...sectionAnim}>
          <h2 className="section-title mb-3">
            2. Rozbrojenie bomby: Pierwszy Stolec
          </h2>
          <p className="section-subtitle mb-8">
            Wiemy, że boisz się pierwszej wizyty w toalecie. Nie zostawimy Cię z tym samego. Przygotowaliśmy precyzyjny "Zestaw Ratunkowy", który zamienia wielką niewiadomą w zarządzalny proces.
          </p>
          <SurvivalKit />
        </motion.section>

        {/* Section 3 */}
        <motion.section {...sectionAnim}>
          <h2 className="section-title mb-3">
            3. Logistyka i Wolność: Oś Czasu
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

        {/* CTA */}
        <CTASection />

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-8 pb-4 border-t border-border">
          Opracowanie psychologiczno-medyczne | LHP System
        </footer>
      </div>
    </div>
  );
};

export default Index;
