import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, HeartHandshake, Sparkles, Zap, Heart, TrendingUp } from "lucide-react";

const scales = [
  {
    letter: "S",
    title: "Safety",
    subtitle: "Bezpieczeństwo",
    icon: Shield,
    description:
      "Każdy zabieg opiera się na rygorystycznych protokołach bezpieczeństwa. Stosujemy wyłącznie certyfikowane urządzenia laserowe i radiofrekwencyjne, a procedury wykonujemy w warunkach pełnej sterylności z ciągłym monitoringiem parametrów.",
  },
  {
    letter: "C",
    title: "Clinical Trust",
    subtitle: "Zaufanie kliniczne",
    icon: HeartHandshake,
    description:
      "Budujemy zaufanie poprzez transparentność — od pierwszej konsultacji po kontrolę pooperacyjną. Każda decyzja terapeutyczna jest oparta na Evidence-Based Medicine i omówiona z pacjentem przed podjęciem działania.",
  },
  {
    letter: "A",
    title: "Aesthetic",
    subtitle: "Estetyka",
    icon: Sparkles,
    description:
      "Pionierskie podejście łączące skuteczność leczniczą z doskonałym efektem estetycznym. Jako pierwszy w Polsce wprowadziliśmy zabiegi z zakresu proktologii estetycznej, przełamując tabu i wyznaczając nowe standardy.",
  },
  {
    letter: "L",
    title: "Lasers",
    subtitle: "Technologia laserowa",
    icon: Zap,
    description:
      "Najnowocześniejsze lasery diodowe, holmowe i erbowe pozwalają na precyzyjne, małoinwazyjne zabiegi — od leczenia hemoroidów (LHP) i przetok (FiLaC, SiLaC) po terapię żylaków (EVLT) i pajączków (CLaCS).",
  },
  {
    letter: "E",
    title: "Empathy",
    subtitle: "Empatia",
    icon: Heart,
    description:
      "Rozumiemy, że wizyta u proktologa czy flebologa wiąże się z lękiem i wstydem. Dlatego stawiamy na prehabilitację informacyjną — edukujemy, tłumaczymy i wspieramy na każdym etapie procesu leczenia.",
  },
  {
    letter: "S",
    title: "Scaling",
    subtitle: "Skalowanie",
    icon: TrendingUp,
    description:
      "Projekt S.C.A.L.E. to nie tylko klinika — to ekosystem szkoleniowy. Dzielimy się wiedzą z lekarzami w całej Polsce, rozwijając sieć placówek partnerskich i podnosząc standardy opieki ambulatoryjnej w skali kraju.",
  },
];

const ScalesCards = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
            Filozofia działania
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif">
            CML Centrum Medycyny Laserowej
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Sześć filarów, na których opiera się każda decyzja kliniczna i&nbsp;biznesowa w&nbsp;naszym ekosystemie.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {scales.map((item, i) => {
            const Icon = item.icon;
            const isExpanded = expandedIndex === i;

            return (
              <motion.button
                key={`${item.letter}-${item.title}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className={`
                  group relative text-left rounded-2xl p-5 md:p-6 transition-all duration-300
                  border cursor-pointer w-full
                  ${isExpanded
                    ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/5"
                    : "bg-card/60 border-border/60 hover:border-primary/30 hover:bg-card"
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`
                      flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                      transition-colors duration-300
                      ${isExpanded ? "bg-primary text-primary-foreground" : "bg-accent text-primary"}
                    `}
                  >
                    <span className="text-xl font-bold font-serif">{item.letter}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                  </div>

                  <Icon
                    className={`
                      w-5 h-5 flex-shrink-0 mt-0.5 transition-colors duration-300
                      ${isExpanded ? "text-primary" : "text-muted-foreground/50 group-hover:text-primary/60"}
                    `}
                  />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-border/40">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ScalesCards;
