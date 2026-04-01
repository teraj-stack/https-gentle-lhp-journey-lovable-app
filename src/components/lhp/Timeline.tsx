import { motion } from "framer-motion";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";

const steps = [
  { icon: "🛏️", title: "Dzień 0-3: Dom", desc: "Zabieg kilkadziesiąt minut. Tego samego dnia wracasz do łóżka. Dni 1-3 to kontrolowany dyskomfort, nie koszmar." },
  { icon: "💻", title: "Dzień 4-7: Praca", desc: "Przewidywany powrót do pracy biurowej (na poduszce ortopedycznej). Koniec z lękiem przed długim L4." },
  { icon: "🏃‍♂️", title: "Tydzień 2-4: Pełna Aktywność", desc: "Czas na powrót do pełnej aktywności, ulubionego sportu i pasji bez żadnych ograniczeń." },
];

const Timeline = () => (
  <div className="space-y-6">
    {steps.map((step, i) => (
      <motion.div
        key={step.title}
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: i * 0.15, duration: 0.5 }}
        className="flex gap-5 items-start"
      >
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-2xl">
          {step.icon}
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-lg">{step.title}</h4>
          <p className="text-muted-foreground text-sm leading-relaxed mt-1">{step.desc}</p>
        </div>
      </motion.div>
    ))}
    <RecoveryBoostBanner />
  </div>
);

export default Timeline;
