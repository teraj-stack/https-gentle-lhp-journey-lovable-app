import { motion } from "framer-motion";
import { Clock, ShieldCheck, Network, GraduationCap } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.12 },
});

const advantages = [
  {
    icon: Clock,
    title: "Optymalizacja czasu",
    desc: "Preedukacja obniża stres pacjenta, ułatwiając i przyspieszając przepływ wizyt w harmonogramach lekarskich.",
  },
  {
    icon: ShieldCheck,
    title: "Chirurgia jednego dnia",
    desc: "Metody tkankowo-oszczędzające (LHP, EVLT, skleroterapia) wpisują się w najnowsze standardy bezpiecznej chirurgii krótkoterminowej.",
  },
  {
    icon: Network,
    title: "Synergia kompetencji",
    desc: "Współpraca sieciowa poszerza portfolio diagnostyczne, ułatwiając bezpieczne krzyżowe skierowania między specjalistami.",
  },
  {
    icon: GraduationCap,
    title: "Evidence-Based Medicine",
    desc: "Komunikacja oparta na faktach naukowych wzmacnia pozycję ośrodka jako placówki innowacyjnej i wiarygodnej.",
  },
];

const AboutAdvantages = () => (
  <section className="py-20 md:py-28 bg-card">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <motion.div {...fadeUp} className="text-center mb-14">
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Kluczowe Korzyści</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Dlaczego model kooperacyjny?
        </h2>
        <div className="premium-divider" />
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {advantages.map((item, i) => (
          <motion.div key={item.title} {...stagger(i)} className="glass-card p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-2 font-serif">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default AboutAdvantages;
