import { motion } from "framer-motion";

const HeroSection = () => (
  <section className="gradient-bg py-16 md:py-24 px-4">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="max-w-3xl mx-auto text-center"
    >
      <div className="text-5xl mb-6">⚕️</div>
      <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
        Zabieg LHP: Powrót do normalności krok po kroku
      </h1>
      <p className="text-xl md:text-2xl font-semibold text-primary-foreground/90 mb-4">
        Czego (NIE) musisz się bać?
      </p>
      <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
        Ta infografika została stworzona dla Twojego spokoju. Zdejmujemy tabu, obniżamy lęk i zastępujemy medyczny żargon przewidywalnym planem. Zrób zrzut ekranu i analizuj w bezpiecznej przestrzeni.
      </p>
    </motion.div>
  </section>
);

export default HeroSection;
