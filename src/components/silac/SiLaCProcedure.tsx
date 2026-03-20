import { motion } from "framer-motion";
import { Search, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Diagnostyka i przygotowanie",
    desc: "Ocena rozległości zatoki pilonidalnej — badanie kliniczne i USG tkanek miękkich. Usunięcie włosów z okolicy i oczyszczenie kanału.",
  },
  {
    icon: ArrowRight,
    step: "02",
    title: "Wprowadzenie sondy laserowej",
    desc: "Przez niewielki otwór w skórze wprowadzamy cienkie włókno światłowodowe lasera 1470 nm do wnętrza zatoki pilonidalnej.",
  },
  {
    icon: Zap,
    step: "03",
    title: "Ablacja laserowa",
    desc: "Kontrolowane wycofywanie włókna z jednoczesną emisją energii laserowej. Ściany zatoki ulegają obkurczeniu i zamknięciu — bez wycięcia tkanek.",
  },
  {
    icon: CheckCircle2,
    step: "04",
    title: "Zamknięcie i gojenie",
    desc: "Minimalne szwy na skórze. Zatoka zarasta naturalnie w ciągu 4–6 tygodni. Blizna jest niemal niewidoczna.",
  },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const SiLaCProcedure = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">Jak przebiega zabieg?</h2>
    <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
      Cztery precyzyjne etapy — od diagnostyki po zamknięcie zatoki. Cały zabieg trwa 20–40 minut w znieczuleniu miejscowym.
    </p>
    <div className="grid sm:grid-cols-2 gap-6">
      {steps.map((s, i) => (
        <motion.div
          key={s.step}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-xl p-6 flex gap-5 items-start"
        >
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[10px] font-bold text-primary text-center mt-1.5 tracking-widest">{s.step}</p>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-1">{s.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.section>
);

export default SiLaCProcedure;
