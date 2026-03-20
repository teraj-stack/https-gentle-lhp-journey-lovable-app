import { motion } from "framer-motion";

const FiLaCHero = () => (
  <section className="gradient-bg py-16 md:py-24 px-4">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto text-center"
    >
      <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary-foreground/60 mb-4">
        Proktologia laserowa
      </p>
      <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
        FiLaC — Laserowe zamykanie przetok
      </h1>
      <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
      <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
        Fistula Laser Closure — precyzyjna energia lasera 1470 nm zamyka kanał przetoki od wewnątrz, 
        chroniąc zwieracze i skracając rekonwalescencję do minimum.
      </p>
      <div className="flex justify-center gap-8 mt-8">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">93%</p>
          <p className="text-xs text-primary-foreground/60 mt-1">Skuteczność</p>
        </div>
        <div className="w-px bg-primary-foreground/20" />
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">100%</p>
          <p className="text-xs text-primary-foreground/60 mt-1">Ochrona zwieraczy</p>
        </div>
        <div className="w-px bg-primary-foreground/20" />
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">1470nm</p>
          <p className="text-xs text-primary-foreground/60 mt-1">Długość fali</p>
        </div>
      </div>
    </motion.div>
  </section>
);

export default FiLaCHero;
