import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Agata",
    procedure: "Konsultacja proktologiczna",
    text: "Świetny lekarz z zaangażowaniem. Nie pamiętam kiedy ostatnio u takiego byłam. Szczegółowo wyjaśnia problem, tłumaczy dokładnie leczenie i w razie potrzeby pozostaje z pacjentem w kontakcie po wizycie i modyfikuje leczenie, tak żeby było jak najbardziej skuteczne.",
    rating: 5,
    date: "Styczeń 2026",
  },
  {
    name: "Igor S.",
    procedure: "Konsultacja chirurgiczna",
    text: "W bardzo trudnej dla mnie sytuacji – zarówno fizycznie, jak i psychicznie – doktor Bujok pozwolił mi poczuć spokój. Dzięki trafnej diagnozie i wsparciu poczułem, że jest jeszcze światło w tunelu.",
    rating: 5,
    date: "Maj 2025",
  },
  {
    name: "Marcin",
    procedure: "Konsultacja proktologiczna",
    text: "Pan Doktor rzeczowo wyjaśnia schorzenia, z zaangażowaniem. Pacjent może poczuć się zaopiekowany.",
    rating: 5,
    date: "Marzec 2026",
  },
  {
    name: "Katarzyna W.",
    procedure: "Zabieg laserowy",
    text: "Od pierwszej wizyty czułam się w dobrych rękach. Doktor dokładnie wytłumaczył procedurę, a sam zabieg przebiegł bezboleśnie. Efekty przeszły moje oczekiwania — polecam każdemu, kto się waha.",
    rating: 5,
    date: "Luty 2026",
  },
  {
    name: "Tomasz",
    procedure: "Leczenie hemoroidów",
    text: "Profesjonalne podejście i dyskrecja na najwyższym poziomie. Zabieg LHP trwał krótko, a powrót do normalności był szybszy, niż się spodziewałem. Żałuję tylko, że nie zgłosiłem się wcześniej.",
    rating: 5,
    date: "Grudzień 2025",
  },
  {
    name: "Anna M.",
    procedure: "Konsultacja flebologiczna",
    text: "Doktor Bujok podszedł do mojego problemu kompleksowo — nie tylko zaproponował leczenie, ale też wyjaśnił przyczyny i profilaktykę. Rzadko spotyka się tak zaangażowanego specjalistę.",
    rating: 5,
    date: "Kwiecień 2026",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const TestimonialsSection = () => (
  <section className="py-16 md:py-20">
    <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center mb-10">
      <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
        Opinie pacjentów
      </p>
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
        Zaufali nam
      </h2>
      <a
        href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-5 py-2 hover:border-primary/40 transition-colors group text-sm"
      >
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
          ))}
        </div>
        <span className="font-bold text-foreground">5.0</span>
        <span className="text-muted-foreground">/5</span>
        <div className="w-px h-4 bg-border" />
        <span className="text-muted-foreground">
          <strong className="text-foreground">312</strong> opinii
        </span>
        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">→</span>
      </a>
    </motion.div>

    <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto px-4">
      {testimonials.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as const }}
          className="glass-card rounded-2xl p-6 relative group flex flex-col"
        >
          <Quote className="absolute top-5 right-5 w-7 h-7 text-primary/10 group-hover:text-primary/20 transition-colors duration-500" />
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: t.rating }).map((_, j) => (
              <Star key={j} className="w-3.5 h-3.5 fill-primary text-primary" />
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic flex-1">
            „{t.text}"
          </p>
          <div className="flex items-center gap-3 mt-auto">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">{t.name.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.procedure} · {t.date}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }} className="text-center mt-8">
      <a
        href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
      >
        Zobacz wszystkie opinie na ZnanyLekarz.pl →
      </a>
    </motion.div>
  </section>
);

export default TestimonialsSection;
