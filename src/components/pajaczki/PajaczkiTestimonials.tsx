import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Katarzyna",
    text: "Po latach ukrywania nóg w końcu mogę nosić sukienki bez skrępowania. Zabieg był bezbolesny, a efekty widoczne już po kilku tygodniach.",
    rating: 5,
    date: "Marzec 2026",
  },
  {
    name: "Joanna",
    text: "Doktor dokładnie wyjaśnił, dlaczego kremy nie pomagały i co tak naprawdę dzieje się z moimi żyłami. Poczułam się zaopiekowana od pierwszej wizyty.",
    rating: 5,
    date: "Luty 2026",
  },
  {
    name: "Magdalena",
    text: "Bałam się, że zabieg będzie bolesny, ale metoda CLaCS okazała się naprawdę komfortowa. Teraz pakuję walizkę na urlop bez stresu!",
    rating: 5,
    date: "Styczeń 2026",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const PajaczkiTestimonials = () => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">
      Głos pacjentek, które odzyskały beztrosk&#x119;
    </h2>
    <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
      Autentyczne opinie z portalu ZnanyLekarz.pl
    </p>

    <div className="grid md:grid-cols-3 gap-6">
      {testimonials.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.12 }}
          className="glass-card rounded-2xl p-7 relative group flex flex-col"
        >
          <Quote className="absolute top-5 right-5 w-7 h-7 text-primary/15 group-hover:text-primary/25 transition-colors duration-500" />

          <div className="flex gap-0.5 mb-4">
            {Array.from({ length: t.rating }).map((_, j) => (
              <Star key={j} className="w-4 h-4 fill-primary text-primary" />
            ))}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic flex-1">
            „{t.text}"
          </p>

          <div className="flex items-center gap-3 mt-auto">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {t.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                Leczenie naczynek · {t.date}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    <div className="text-center mt-8">
      <a
        href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
      >
        Zobacz wszystkie opinie na ZnanyLekarz.pl →
      </a>
    </div>
  </motion.section>
);

export default PajaczkiTestimonials;
