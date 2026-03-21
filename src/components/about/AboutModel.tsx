import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, BookOpen, Users, Award } from "lucide-react";

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

const highlights = [
  "Precyzyjna diagnostyka (USG Doppler, anoskopia)",
  "Innowacyjne terapie hybrydowe — laser, radiofrekwencja, CLaCS",
  "Prehabilitacja informacyjna — edukacja przed wizytą",
  "Kooperacja sieciowa i krzyżowe skierowania między specjalistami",
];

const cards = [
  { icon: Sparkles, title: "Proktologia Estetyczna", desc: "Pierwszy w Polsce" },
  { icon: BookOpen, title: "Preedukacja Pacjenta", desc: "Autorski e-book" },
  { icon: Users, title: "Szkolenia Lekarzy", desc: "100+ przeszkolonych" },
  { icon: Award, title: "Kliniki Premium", desc: "Wilanów · Siedlce" },
];

const AboutModel = () => (
  <section className="py-20 md:py-28">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div {...fadeUp}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Model Kooperacyjny</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Zintegrowana opieka medyczna
          </h2>
          <div className="premium-divider !mx-0 mb-8" />
          <p className="text-muted-foreground leading-relaxed mb-4">
            W modelu MCPL fundamentem nie jest wyłącznie wymiana technologiczna, ale ustandaryzowana edukacja pacjenta. Udostępnianie merytorycznej wiedzy przed przekroczeniem progu gabinetu pełni funkcję „prehabilitacji informacyjnej".
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Uświadomiony pacjent odczuwa mniejszy stres, co prowadzi do sprawniejszego wywiadu medycznego, wyższego poziomu współpracy oraz optymalizacji czasu konsultacji.
          </p>
          <ul className="space-y-3 mb-8">
            {highlights.map((text) => (
              <li key={text} className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                {text}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...fadeUp} className="grid grid-cols-2 gap-4">
          {cards.map((item, i) => (
            <motion.div key={item.title} {...stagger(i)} className="glass-card p-6 rounded-2xl text-center">
              <item.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default AboutModel;
