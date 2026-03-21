import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Anna K.",
    procedure: "Zabieg LHP",
    text: "Byłam przerażona wizją operacji. Dzięki metodzie laserowej wróciłam do pracy po 3 dniach. Żałuję, że nie zdecydowałam się wcześniej.",
    rating: 5,
  },
  {
    name: "Marek W.",
    procedure: "EVLT żylaków",
    text: "Profesjonalne podejście od pierwszej konsultacji. Zabieg trwał godzinę, a ja tego samego dnia wróciłam do domu. Polecam każdemu.",
    rating: 5,
  },
  {
    name: "Katarzyna S.",
    procedure: "Skleroterapia",
    text: "Pajączki na nogach kompleksowały mnie latami. Po dwóch sesjach skleroterapii skóra wygląda pięknie. Wreszcie mogę nosić sukienki bez stresu.",
    rating: 5,
  },
  {
    name: "Tomasz R.",
    procedure: "Zabieg FiLaC",
    text: "Miałem problem z przetoką od dwóch lat. Laser rozwiązał sprawę w jeden dzień — bez bólu, bez ran, bez długiego L4. Rewelacja.",
    rating: 5,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const Testimonials = () => (
  <section className="py-20 md:py-28 bg-card/50">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto text-center mb-14"
      >
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">
          Opinie pacjentów
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Zaufali nam — i opowiedzieli o tym
        </h2>
        <div className="premium-divider" />
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.12 }}
            className="glass-card rounded-2xl p-7 md:p-8 relative group"
          >
            <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/15 group-hover:text-primary/25 transition-colors duration-500" />

            <div className="flex gap-1 mb-4">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star
                  key={j}
                  className="w-4 h-4 fill-primary text-primary"
                />
              ))}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">
              „{t.text}"
            </p>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {t.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.procedure}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
