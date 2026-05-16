import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import drBujokImg from "@/assets/dr-bujok.webp";

const stagger = (delay = 0) => ({
  initial: { opacity: 0, y: 28, filter: "blur(5px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const DoctorSection = () => (
  <section className="py-20 md:py-28 bg-card">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div {...stagger(0.15)} className="flex justify-center lg:order-2">
          <div className="relative">
            <img
              src={drBujokImg}
              alt="Dr Jan Bujok – chirurg, proktolog, flebolog"
              className="w-72 md:w-80 aspect-[3/4] rounded-2xl object-cover shadow-2xl"
              loading="lazy"
            />
            <div className="absolute -bottom-4 -right-4 w-72 md:w-80 aspect-[3/4] rounded-2xl bg-primary/20 -z-10" />
          </div>
        </motion.div>

        <motion.div {...stagger(0)}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Twórca CML – Centrum Medycyny Laserowej</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Dr Jan Bujok
          </h2>
          <div className="premium-divider !mx-0 mb-8" />
          <p className="text-muted-foreground leading-relaxed mb-4">
            Specjalista chirurgii ogólnej, którego zawodową pasją są nowoczesne technologie stosowane w medycynie. Twórca Centrum Medycyny Laserowej — połączył wieloletnie doświadczenie chirurgiczne z głębokim zrozumieniem potrzeb pacjenta, budując nowy model opieki proktologicznej i flebologicznej w Polsce.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Dr Bujok nie tylko operuje — prowadzi autorskie szkolenia dla chirurgów i personelu medycznego z całego kraju. Jego filozofia opiera się na przekonaniu, że najlepsza technologia jest bezwartościowa bez empatii i partnerskiej relacji z pacjentem.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { num: "15+", label: "lat doświadczenia" },
              { num: "3000+", label: "zabiegów laserowych" },
              { num: "100+", label: "przeszkolonych lekarzy" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-accent/50">
                <p className="text-2xl font-bold text-primary font-serif">{stat.num}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
              <a
                href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
                target="_blank"
                rel="noopener noreferrer"
              >
                Umów konsultację
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-6 text-base" asChild>
              <a
                href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa#calendar"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sprawdź dostępne terminy
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/o-nas">
                Poznaj cały zespół
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default DoctorSection;
