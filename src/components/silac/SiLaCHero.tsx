import { motion } from "framer-motion";

const SiLaCHero = () => (
  <section className="gradient-bg py-16 md:py-24 px-4">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto text-center"
    >
      <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary-foreground/80 mb-4">
        Chirurgia laserowa
      </p>
      <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
        SiLaC — Laserowe leczenie torbieli pilonidalnej
      </h1>
      <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
      <p className="text-primary-foreground/90 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
        Sinus Laser Closure — energia lasera 1470 nm zamyka zatokę pilonidalną od wewnątrz,
        eliminując konieczność rozległego wycięcia i długiej rekonwalescencji.
      </p>
      <div className="flex justify-center gap-4 md:gap-8 mt-8 px-4">
        <div className="text-center min-w-0">
          <p className="text-2xl md:text-3xl font-bold text-primary-foreground">90%</p>
          <p className="text-[10px] md:text-xs text-primary-foreground/80 mt-1">Skuteczność</p>
        </div>
        <div className="w-px bg-primary-foreground/20" />
        <div className="text-center min-w-0">
          <p className="text-2xl md:text-3xl font-bold text-primary-foreground">30 min</p>
          <p className="text-[10px] md:text-xs text-primary-foreground/80 mt-1">Czas zabiegu</p>
        </div>
        <div className="w-px bg-primary-foreground/20" />
        <div className="text-center min-w-0">
          <p className="text-2xl md:text-3xl font-bold text-primary-foreground">1470nm</p>
          <p className="text-[10px] md:text-xs text-primary-foreground/80 mt-1">Długość fali</p>
        </div>
      </div>
    </motion.div>
  </section>
);

export default SiLaCHero;
