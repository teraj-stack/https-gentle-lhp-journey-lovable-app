import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HeroHome = () => (
  <section className="relative min-h-[90vh] flex items-center gradient-hero overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />

    <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-32 md:py-40">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="max-w-3xl"
      >
        <p className="text-muted-foreground text-sm font-sans uppercase tracking-[0.2em] mb-6">
          CML · Centrum Medycyny Laserowej
        </p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-2">
          Odzyskaj komfort.
        </h1>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-2 italic text-primary">
          Bezbolesne leczenie laserowe.
        </h1>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-8">
          Szybki powrót do aktywności.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
          Nowoczesna proktologia i flebologia laserowa w klinikach premium. 
          Wchodzisz spokojny, wychodzisz z rozwiązaniem — tego samego dnia.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <Link to="/kontakt">Umów Konsultację</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-6 text-base border-foreground/20 text-foreground hover:bg-foreground/10 hover:text-foreground rounded-sm uppercase tracking-wider"
            asChild
          >
            <Link to="/o-nas">Poznaj Dr. Bujoka</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HeroHome;
