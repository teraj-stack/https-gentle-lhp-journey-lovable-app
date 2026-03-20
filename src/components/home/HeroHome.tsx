import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-clinic.jpg";

const HeroHome = () => (
  <section className="relative min-h-[90vh] flex items-center overflow-hidden">
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${heroImage})` }}
    />
    <div className="absolute inset-0 bg-background/80" />

    <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-32 md:py-40 w-full">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="max-w-3xl"
      >
        <p className="text-muted-foreground text-sm font-sans uppercase tracking-[0.2em] mb-6">
          CML · Dr Jan Bujok
        </p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-2">
          Medycyna premium.
        </h1>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-2 italic text-primary">
          Nowoczesne technologie laserowe.
        </h1>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-8">
          Jeden standard.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
          Proktologia laserowa i flebologia — pod jedną marką,
          w jednym standardzie premium.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <Link to="/kontakt">Umów Konsultację</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-6 text-base rounded-sm uppercase tracking-wider"
            asChild
          >
            <Link to="/o-nas">Poznaj twórcę projektu</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HeroHome;
