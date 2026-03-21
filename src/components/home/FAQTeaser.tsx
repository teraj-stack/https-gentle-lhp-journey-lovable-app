import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as const },
});

const faqs = [
  { q: "Jak szybko wrócę do codziennej aktywności?", a: "Większość pacjentów wraca do codziennych aktywności w ciągu 1-3 dni. Praca biurowa jest możliwa zazwyczaj po 4-5 dniach." },
  { q: "Czy zabieg laserowy jest bolesny?", a: "Zabiegi wykonujemy w komfortowym znieczuleniu miejscowym. Pacjenci opisują odczucia jako minimalne — znacznie łagodniejsze niż w tradycyjnych metodach." },
  { q: "Dlaczego przygotowuję się przed wizytą?", a: "Nasz autorski przewodnik przygotowuje Cię do wizyty, redukuje niepewność i pozwala lekarzowi skupić się wyłącznie na Twoich indywidualnych potrzebach." },
];

const FAQTeaser = () => (
  <section className="py-20 md:py-28 bg-card">
    <div className="max-w-3xl mx-auto px-4 md:px-8">
      <motion.div {...fadeUp} className="text-center mb-12">
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">FAQ</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Najczęstsze pytania</h2>
        <div className="premium-divider" />
      </motion.div>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <motion.details
            key={i}
            {...stagger(i)}
            className="glass-card rounded-xl group"
          >
            <summary className="flex items-center justify-between p-5 cursor-pointer text-sm font-semibold text-foreground hover:text-primary transition-colors list-none font-sans">
              {faq.q}
              <span className="ml-4 text-muted-foreground group-open:rotate-45 transition-transform text-lg">+</span>
            </summary>
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
              {faq.a}
            </div>
          </motion.details>
        ))}
      </div>

      <motion.div {...fadeUp} className="text-center mt-10">
        <Button variant="outline" asChild>
          <Link to="/dla-pacjenta">
            Więcej pytań i odpowiedzi
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </motion.div>
    </div>
  </section>
);

export default FAQTeaser;
