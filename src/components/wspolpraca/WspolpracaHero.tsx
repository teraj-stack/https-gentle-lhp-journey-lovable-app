import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const WspolpracaHero = () => (
  <ParallaxSection className="relative gradient-hero pt-32 pb-20 md:pt-40 md:pb-28">
    <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background/40" />
    <div className="relative max-w-4xl mx-auto px-4 md:px-8 text-center">
      <motion.div {...fadeUp}>
        <p className="text-sm font-sans uppercase tracking-[0.2em] text-primary mb-6">
          Współpraca B2B
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
          Zdefiniuj na nowo Luksus i&nbsp;Bezpieczeństwo w&nbsp;Swojej Klinice
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
          Wdróż autorski Projekt Laserowego Centrum Medycyny Estetycznej Regeneracyjnej
          w modelu Joint Venture.
        </p>
        <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
          <a href="#kontakt-b2b">
            Umów wirtualną kawę
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </motion.div>
    </div>
  </ParallaxSection>
);

export default WspolpracaHero;
