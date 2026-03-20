import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FiLaCHero from "@/components/filac/FiLaCHero";
import FiLaCProcedure from "@/components/filac/FiLaCProcedure";
import FiLaCAdvantages from "@/components/filac/FiLaCAdvantages";
import FiLaCComparison from "@/components/filac/FiLaCComparison";
import FiLaCIndications from "@/components/filac/FiLaCIndications";
import FiLaCRecovery from "@/components/filac/FiLaCRecovery";

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
      <FiLaCProcedure fadeUp={fadeUp} />
      <FiLaCAdvantages fadeUp={fadeUp} />
      <FiLaCComparison fadeUp={fadeUp} />
      <FiLaCIndications fadeUp={fadeUp} />
      <FiLaCRecovery fadeUp={fadeUp} />

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
