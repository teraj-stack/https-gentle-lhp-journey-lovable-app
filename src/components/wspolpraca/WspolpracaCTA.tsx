import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const badges = [
  "Pełna autonomia operacyjna",
  "Zero biurokracji",
  "Darmowe szkolenia",
  "Evidence-Based Medicine",
];

const WspolpracaCTA = () => (
  <section id="kontakt-b2b" className="py-20 md:py-28 bg-card">
    <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
      <motion.div {...fadeUp}>
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Porozmawiajmy o współpracy
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Niezobowiązująca, 15-minutowa rozmowa z dr. Janem Bujokiem.
          Omówimy, jak model kooperacyjny CML może wzmocnić Twoją placówkę.
        </p>

        <blockquote className="border-l-2 border-primary/40 pl-4 my-8 text-sm italic text-muted-foreground max-w-lg mx-auto text-left">
          „Praca zespołu powinna zawsze obejmować wielkiego zawodnika,
          ale wielki zawodnik musi zawsze pracować."
        </blockquote>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
              Umów wirtualną kawę
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mt-12 text-xs text-muted-foreground">
          {badges.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              {t}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default WspolpracaCTA;
