import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Network, GraduationCap, Clock, Shield, ArrowRight } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as const },
});

const benefits = [
  {
    icon: Network,
    title: "Model kooperacyjny",
    desc: "Zintegrowany ekosystem partnerski z krzyżowym kierowaniem pacjentów i wspólnymi standardami jakości.",
  },
  {
    icon: GraduationCap,
    title: "Preedukacja pacjenta",
    desc: "Gotowy system e-booków i materiałów, który skraca czas konsultacji i podnosi compliance.",
  },
  {
    icon: Clock,
    title: "Chirurgia jednego dnia",
    desc: "Technologie LHP, EVLT i FiLaC optymalizujące rotację sal zabiegowych i infrastrukturę łóżkową.",
  },
  {
    icon: Shield,
    title: "Pełna autonomia",
    desc: "Zachowujesz niezależność operacyjną. Zyskujesz sprawdzony model i prestiż sieci premium.",
  },
];

const B2BSection = () => (
  <section className="py-20 md:py-28" style={{ background: "var(--gradient-warm)" }}>
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="max-w-3xl mx-auto text-center mb-14">
        <motion.div {...fadeUp}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">
            Dla Lekarzy i Klinik Partnerskich
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Interdyscyplinarny standard, który optymalizuje procesy w Twojej placówce
          </h2>
          <div className="premium-divider mb-8" />
          <p className="text-muted-foreground leading-relaxed">
            Współczesna medycyna wymaga kooperacji. Nasz model partnerski łączy preedukację pacjenta,
            technologie małoinwazyjne i sprawdzoną ścieżkę operacyjną — gotową do wdrożenia w Twojej klinice.
          </p>
        </motion.div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
        {benefits.map((item, i) => (
          <motion.div key={item.title} {...stagger(i)} className="glass-card p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2 font-sans text-sm">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} className="text-center">
        <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
          <Link to="/wspolpraca">
            Poznaj model współpracy
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </motion.div>
    </div>
  </section>
);

export default B2BSection;
