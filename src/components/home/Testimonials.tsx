import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Agata",
    procedure: "Konsultacja proktologiczna",
    text: "Świetny lekarz z zaangażowaniem. Nie pamiętam kiedy ostatnio u takiego byłam. Szczegółowo wyjaśnia problem, tłumaczy dokładnie leczenie i w razie potrzeby pozostaje z pacjentem w kontakcie po wizycie i modyfikuje leczenie, tak żeby było jak najbardziej skuteczne. W końcu śpię spokojnie, a to wszystko zasługa doktora, dziękuję ;)",
    rating: 5,
    source: "ZnanyLekarz.pl",
    date: "Styczeń 2026",
  },
  {
    name: "Igor S.",
    procedure: "Konsultacja chirurgiczna",
    text: "W bardzo trudnej dla mnie sytuacji – zarówno fizycznie, jak i psychicznie – doktor Bujok pozwolił mi poczuć spokój. Dzięki trafnej diagnozie i wsparciu poczułem, że jest jeszcze światło w tunelu. Z ogromnym zaangażowaniem podjął się mojego leczenia i nie pozwolił, by nawet najmniejsza dolegliwość została przeoczona.",
    rating: 5,
    source: "ZnanyLekarz.pl",
    date: "Maj 2025",
  },
  {
    name: "Marcin",
    procedure: "Konsultacja proktologiczna",
    text: "Pan Doktor rzeczowo wyjaśnia schorzenia, z zaangażowaniem. Pacjent może poczuć się zaopiekowany.",
    rating: 5,
    source: "ZnanyLekarz.pl",
    date: "Marzec 2026",
  },
  {
    name: "KK",
    procedure: "Konsultacja proktologiczna",
    text: "Dr przeprowadził wywiad i wszystko wyjaśnił. Poświęcił czas pacjentowi bez żadnego pośpiechu. Przedstawił odpowiednie metody leczenia.",
    rating: 5,
    source: "ZnanyLekarz.pl",
    date: "Luty 2026",
  },
  {
    name: "Wiktoria",
    procedure: "Konsultacja",
    text: "Polecam pana dra za ogromne zaangażowanie, szczegółowe wyjaśnienia oraz czas, który poświęcił podczas wizyty.",
    rating: 5,
    source: "ZnanyLekarz.pl",
    date: "Wrzesień 2025",
  },
  {
    name: "Beata",
    procedure: "Konsultacja proktologiczna",
    text: "Bardzo miły rzeczowy lekarz, szczegółowo wyjaśnia wszystko, polecam.",
    rating: 5,
    source: "ZnanyLekarz.pl",
    date: "Luty 2026",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
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
          Co mówią nasi pacjenci
        </h2>
        <div className="premium-divider mb-8" />

        {/* ZnanyLekarz rating widget */}
        <a
          href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-card border border-border rounded-full px-6 py-3 hover:border-primary/40 transition-colors group"
        >
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-primary text-primary" />
            ))}
          </div>
          <span className="text-2xl font-bold text-foreground">5.0</span>
          <span className="text-sm text-muted-foreground">/5</span>
          <div className="w-px h-5 bg-border" />
          <span className="text-sm text-muted-foreground">
            <strong className="text-foreground">312</strong> opinii
          </span>
          <div className="w-px h-5 bg-border" />
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
            ZnanyLekarz.pl →
          </span>
        </a>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as const }}
            className="glass-card rounded-2xl p-7 md:p-8 relative group flex flex-col"
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

            <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic flex-1">
              „{t.text}"
            </p>

            <div className="flex items-center gap-3 mt-auto">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {t.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.procedure} · {t.date}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.5 }} className="text-center mt-10">
        <a
          href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          Zobacz wszystkie opinie na ZnanyLekarz.pl →
        </a>
      </motion.div>
    </div>
  </section>
);

export default Testimonials;
