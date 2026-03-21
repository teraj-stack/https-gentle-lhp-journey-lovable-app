import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";

const AboutHero = () => (
  <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute inset-0 bg-background/40" />
    </div>
    <div className="relative max-w-7xl mx-auto px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="max-w-3xl"
      >
        <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">
          O Nas
        </p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-6">
          Ewolucja opieki ambulatoryjnej
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
          Centrum Medycyny Laserowej to interdyscyplinarny ekosystem partnerski, w&nbsp;którym nowoczesna technologia, edukacja pacjenta i&nbsp;empatia tworzą nowy standard opieki proktologicznej i&nbsp;flebologicznej w&nbsp;Polsce.
        </p>
      </motion.div>
    </div>
  </section>
);

export default AboutHero;
