import { motion } from "framer-motion";
import {
  ShieldCheck,
  BookOpenCheck,
  Sparkles,
  Timer,
  HeartHandshake,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.15 },
});

const pillars = [
  {
    icon: ShieldCheck,
    title: "Medyczny Rygor i Absolutne Bezpieczeństwo",
    desc: "Gwarantujemy rygorystyczne standardy bezpieczeństwa — zyskujesz spokojną głowę, przez czynnego chirurga ogólnego. Oferujemy perfekcyjną znajomość anatomii i maksymalne wyciszenie. Zdejmujemy z Twojej placówki ryzyko powikłań, z którym boryka się standardowa medycyna estetyczna.",
    accent: "hsl(var(--primary))",
  },
  {
    icon: BookOpenCheck,
    title: "Filtr Edukacyjny",
    subtitle: "Koniec z roszczeniowym klientem",
    desc: "Zdejmujemy ciężar z Twojej recepcji. Zanim pacjentka usiądzie w fotelu, przechodzi przez nasz obowiązkowy proces edukacji (e-book). Znika lęk przed nieznanym. Próg Twojej kliniki przekracza wyciszony \u201EŚwiadomy Partner\u201D, a nie przestraszony klient.",
    accent: "hsl(var(--sage))",
  },
  {
    icon: Sparkles,
    title: "Synergia High-Tech i Czystego Surowca",
    desc: "Dajemy Twojej klinice bezkonkurencyjne USP (Unikalną Cechę Oferty). Łączymy najpotężniejszy park maszynowy na rynku (Fotona, platformy pikosekundowe, RF Secret) z bezkonserwantowym kremem, gwarantując jakość, która staje się definicją lokalnego luksusu.",
    accent: "hsl(var(--primary))",
  },
  {
    icon: Timer,
    title: "Szybki powrót do gry",
    subtitle: "Magnes na biznes",
    desc: "Rozwiązujemy największy ból zamożnych kobiet biznesu — wykluczenie społeczne. Nasz Projekt umożliwia powrót do pełnej decyzyjności zawodowej nierzadko już w 48 godzin. Klinika, która szanuje czas swoich pacjentów, automatycznie przyciąga najbardziej elitarny portfel klientów.",
    accent: "hsl(var(--sage))",
    badge: "48h",
  },
  {
    icon: HeartHandshake,
    title: "Holistyczny Rozkwit i Długoterminowa Lojalność",
    desc: "Nie sprzedajemy technologii — przygotowujemy pacjentki do ważnych wydarzeń w ich życiu, dbając o ich zdrowie psychiczne i społeczne. Kiedy kobieta rozkwita i czuje się u nas bezpiecznie, z pełnym zaufaniem pozwala objąć się długoterminową opieką w murach Twojej placówki.",
    accent: "hsl(var(--primary))",
  },
];

const WspolpracaPillars = () => (
  <section className="py-20 md:py-28">
    <div className="max-w-5xl mx-auto px-4 md:px-8">
      <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center mb-16">
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">
          5 filarów Projektu
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Poznaj 5 filarów, które podniosą prestiż Twojej placówki
        </h2>
        <div className="premium-divider mb-8" />
        <p className="text-muted-foreground leading-relaxed">
          Oferujemy partnerstwo, które odciąży Twój zespół i przyciągnie
          wyedukowanego, zamożnego pacjenta.
        </p>
      </motion.div>

      <div className="space-y-6">
        {pillars.map((pillar, i) => (
          <motion.div
            key={pillar.title}
            {...stagger(i)}
            className="relative glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start group hover:border-primary/30 transition-colors duration-500"
          >
            {/* Number */}
            <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center font-sans shadow-md z-10">
              {i + 1}
            </span>

            {/* Icon area */}
            <div className="relative shrink-0">
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${pillar.accent}15, ${pillar.accent}08)`,
                  border: `1px solid ${pillar.accent}25`,
                }}
              >
                <pillar.icon
                  className="w-8 h-8 md:w-10 md:h-10 transition-transform duration-500 group-hover:scale-110"
                  style={{ color: pillar.accent }}
                  strokeWidth={1.5}
                />
              </div>
              {pillar.badge && (
                <span
                  className="absolute -bottom-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground"
                >
                  {pillar.badge}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 font-sans leading-snug">
                {pillar.title}
              </h3>
              {pillar.subtitle && (
                <p className="text-xs uppercase tracking-widest text-primary/70 mb-2 font-sans">
                  {pillar.subtitle}
                </p>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pillar.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WspolpracaPillars;
