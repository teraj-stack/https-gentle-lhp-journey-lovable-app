import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const AboutCTA = () => (
  <section className="py-20 md:py-28">
    <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
      <motion.div {...fadeUp}>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Poznaj standardy, które kształtują nowoczesną medycynę
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-10">
          W gabinecie każdy pacjent otrzymuje czas, uwagę i&nbsp;poczucie bezpieczeństwa. Umów konsultację i&nbsp;przekonaj się, czym jest prawdziwie partnerska opieka medyczna oparta na edukacji i&nbsp;zaufaniu.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
              Umów Konsultację
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
          <Button variant="outline" size="lg" className="px-10 py-6 text-base" asChild>
            <Link to="/wspolpraca">
              Współpraca B2B
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default AboutCTA;
