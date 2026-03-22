import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import FiLaCHero from "@/components/filac/FiLaCHero";
import FiLaCProcedure from "@/components/filac/FiLaCProcedure";
import FiLaCAdvantages from "@/components/filac/FiLaCAdvantages";
import FiLaCComparison from "@/components/filac/FiLaCComparison";
import FiLaCIndications from "@/components/filac/FiLaCIndications";
import FiLaCRecovery from "@/components/filac/FiLaCRecovery";
import FiLaCFAQ from "@/components/filac/FiLaCFAQ";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";

const filacSummary = [
  { label: "Nazwa metody", value: "FiLaC – Fistula Laser Closure" },
  { label: "Wskazania", value: "Przetoki odbytu (proste i złożone)" },
  { label: "Czas zabiegu", value: "30–60 minut" },
  { label: "Znieczulenie", value: "Miejscowe lub krótka sedacja" },
  { label: "Hospitalizacja", value: "Brak — zabieg ambulatoryjny" },
  { label: "Ból pooperacyjny", value: "2–3 / 10 (minimalny)" },
  { label: "Powrót do pracy", value: "3–5 dni" },
  { label: "Pełna aktywność", value: "2–3 tygodnie" },
  { label: "Ochrona zwieraczy", value: "100% — brak nacięć mięśniowych" },
  { label: "Blizny", value: "Minimalne — nakłucie 2–3 mm" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const FiLaC = () => (
  <div className="min-h-screen bg-background pt-20">
    <FiLaCHero />

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={[{ label: "Proktologia" }, { label: "Przetoki – FiLaC" }]} className="mb-4" />
      <FiLaCProcedure fadeUp={fadeUp} />
      <FiLaCAdvantages fadeUp={fadeUp} />
      <FiLaCComparison fadeUp={fadeUp} />
      <FiLaCIndications fadeUp={fadeUp} />
      <FiLaCRecovery fadeUp={fadeUp} />
      <FiLaCFAQ fadeUp={fadeUp} />

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
          <Link to="/kontakt">Umów konsultację</Link>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default FiLaC;
