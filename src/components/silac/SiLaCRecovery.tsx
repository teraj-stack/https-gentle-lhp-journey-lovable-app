import { motion } from "framer-motion";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";

const timeline = [
  { icon: "🛏️", period: "Dzień 0–1", title: "Odpoczynek", desc: "Zabieg ambulatoryjny — wracasz do domu tego samego dnia. Łagodny dyskomfort w okolicy kości ogonowej kontrolowany lekami przeciwbólowymi." },
  { icon: "💻", period: "Dzień 2–3", title: "Powrót do pracy", desc: "Większość pacjentów wraca do pracy biurowej. Zalecana poduszka odciążająca i unikanie długiego siedzenia." },
  { icon: "🚶", period: "Tydzień 2–3", title: "Normalna aktywność", desc: "Stopniowy powrót do pełnej aktywności. Kontrola gojenia u lekarza. Higiena okolicy z użyciem prysznica." },
  { icon: "🏃", period: "Tydzień 4–6", title: "Pełna sprawność", desc: "Zatoka zarasta. Powrót do sportu i aktywności fizycznej bez ograniczeń. Mała blizna staje się praktycznie niewidoczna." },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const SiLaCRecovery = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">Rekonwalescencja</h2>
    <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
      Dzięki minimalnej inwazyjności SiLaC, powrót do normalnego życia następuje wielokrotnie szybciej niż po klasycznym wycięciu.
    </p>
    <div className="space-y-5 max-w-2xl mx-auto">
      {timeline.map((step, i) => (
        <motion.div
          key={step.period}
          initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-5 items-start"
        >
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-2xl">
            {step.icon}
          </div>
          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-0.5">{step.period}</p>
            <h4 className="font-bold text-foreground text-lg">{step.title}</h4>
            <p className="text-muted-foreground text-sm leading-relaxed mt-1">{step.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.section>
);

export default SiLaCRecovery;
