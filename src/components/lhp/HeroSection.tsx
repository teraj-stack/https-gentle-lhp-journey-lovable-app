import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";

const HeroSection = () => (
  <ParallaxSection className="gradient-bg py-16 md:py-24 px-4">
    <motion.div
      initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto text-center"
    >
      <div className="text-5xl mb-6">⚕️</div>
      <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
        Hemoroidy — leczenie laserem w Warszawie: zabieg LHP krok po kroku
      </h1>
      <p className="text-xl md:text-2xl font-semibold text-primary-foreground/90 mb-4">
        Czego (NIE) musisz się bać?
      </p>
      <p className="text-primary-foreground/90 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
        Jeśli szukasz sposobu, jak przy hemoroidach szybko opanować ból i wrócić do normalnego życia — ta strona prowadzi Cię przez cały zabieg LHP. Zdejmujemy tabu, obniżamy lęk i zastępujemy medyczny żargon przewidywalnym planem.
      </p>
    </motion.div>
  </ParallaxSection>
);

export default HeroSection;
