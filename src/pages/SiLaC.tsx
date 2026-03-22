import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import SiLaCHero from "@/components/silac/SiLaCHero";
import SiLaCProcedure from "@/components/silac/SiLaCProcedure";
import SiLaCAdvantages from "@/components/silac/SiLaCAdvantages";
import SiLaCComparison from "@/components/silac/SiLaCComparison";
import SiLaCIndications from "@/components/silac/SiLaCIndications";
import SiLaCRecovery from "@/components/silac/SiLaCRecovery";
import SiLaCFAQ from "@/components/silac/SiLaCFAQ";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";

const silacSummary = [
  { label: "Nazwa metody", value: "SiLaC – Sinus Laser Closure" },
  { label: "Wskazania", value: "Torbiel pilonidalna (sinus pilonidalis)" },
  { label: "Czas zabiegu", value: "Ok. 30 minut" },
  { label: "Znieczulenie", value: "Miejscowe" },
  { label: "Hospitalizacja", value: "Brak — zabieg ambulatoryjny" },
  { label: "Ból pooperacyjny", value: "2–3 / 10 (minimalny)" },
  { label: "Powrót do pracy", value: "2–3 dni" },
  { label: "Pełna aktywność", value: "4–6 tygodni" },
  { label: "Rozmiar rany", value: "Nakłucie 2–3 mm" },
  { label: "Skuteczność", value: "Ok. 90%" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const SiLaC = () => (
  <div className="min-h-screen bg-background pt-20">
    <SiLaCHero />

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={[{ label: "Proktologia" }, { label: "Torbiel pilonidalna – SiLaC" }]} className="mb-4" />
      <SiLaCProcedure fadeUp={fadeUp} />
      <SiLaCAdvantages fadeUp={fadeUp} />
      <SiLaCComparison fadeUp={fadeUp} />
      <SiLaCIndications fadeUp={fadeUp} />
      <SiLaCRecovery fadeUp={fadeUp} />
      <SiLaCFAQ fadeUp={fadeUp} />

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
          <Link to="/kontakt">Umów konsultację</Link>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default SiLaC;
