import { motion } from "framer-motion";
import { Shield, Zap, Home } from "lucide-react";

const steps = [
  {
    icon: Shield,
    title: "Krok 1: Przyjęcie i komfort",
    subtitle: "Zero stresu",
    desc: "Przychodzisz do kliniki o wyznaczonej godzinie. Nie musisz kłaść się do szpitala dzień wcześniej — to zabieg ambulatoryjny. Wykonywany jest w znieczuleniu miejscowym, więc nie czujesz bólu.",
  },
  {
    icon: Zap,
    title: "Krok 2: Działanie lasera",
    subtitle: "20–40 minut",
    desc: "Lekarz wprowadza cienkie włókno światłowodowe do wnętrza guzka. Precyzyjna wiązka lasera zamyka naczynia krwionośne — guzek obkurcza się i zanika. Błona śluzowa i zwieracze pozostają nienaruszone.",
  },
  {
    icon: Home,
    title: "Krok 3: Powrót do domu",
    subtitle: "Tego samego dnia",
    desc: "Wstajesz, ubierasz się i wracasz do domu o własnych siłach. Dyskomfort po zabiegu to 2–3/10, w porównaniu do 8–9/10 po klasycznej operacji. Wystarczą zwykłe leki przeciwbólowe.",
  },
];

const ProcedureSteps = () => (
  <div className="space-y-6">
    {steps.map((step, i) => (
      <motion.div
        key={step.title}
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: i * 0.15 }}
        className="glass-card rounded-xl p-6 flex gap-5 items-start"
      >
        <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <step.icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h4 className="font-bold text-foreground mb-0.5">{step.title}</h4>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">{step.subtitle}</p>
          <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
        </div>
      </motion.div>
    ))}

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="flex justify-center pt-2 opacity-80"
    >
      <video
        src="/videos/lhp-powrot.mov"
        autoPlay
        muted
        loop
        playsInline
        className="rounded-xl shadow-lg w-full max-w-sm"
      />
    </motion.div>
  </div>
);

export default ProcedureSteps;
