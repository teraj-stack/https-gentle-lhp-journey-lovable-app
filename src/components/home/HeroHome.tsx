import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-clinic.webp";


// Preload hero image as soon as module loads
const preloadLink = document.createElement("link");
preloadLink.rel = "preload";
preloadLink.as = "image";
preloadLink.href = heroImage;
document.head.appendChild(preloadLink);

const HeroHome = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.6, 0.8]);

  return (
    <section ref={sectionRef} className="relative min-h-[90vh] flex items-center overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
        style={{ backgroundImage: `url(${heroImage})`, y: bgY }}
      />
      <motion.div className="absolute inset-0 bg-background" style={{ opacity: overlayOpacity }} />

    <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-32 md:py-40 w-full flex flex-col md:flex-row items-center gap-12 md:gap-20">
      <motion.div
        initial={{ opacity: 0, y: 40, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl flex-1"
        style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
      >
        <p className="text-foreground/50 text-sm font-sans uppercase tracking-[0.25em] mb-6" style={{ textShadow: "none" }}>
          CML · Dr Jan Bujok
        </p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-3">
          Medycyna premium.
        </h1>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-3 italic text-primary drop-shadow-lg">
          Nowoczesne technologie laserowe.
        </h1>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-10">
          Jeden standard.
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-foreground/60 leading-relaxed max-w-2xl mb-12 font-serif italic"
          style={{ textShadow: "none" }}
        >
          Proktologia laserowa i flebologia — pod jedną marką,
          w jednym standardzie premium.
        </motion.p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
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

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="hidden lg:flex items-center justify-center flex-shrink-0"
      >
        <img
          src={logoImage}
          alt="Bujok Medical logo"
          className="w-52 xl:w-64 rounded-2xl opacity-90 -mt-5"
        />
      </motion.div>
    </div>
    </section>
  );
};

export default HeroHome;
