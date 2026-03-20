import { motion } from "framer-motion";

const advantages = [
  { emoji: "🛡️", title: "100% ochrony zwieraczy", desc: "Laser działa wyłącznie wewnątrz kanału przetoki — mięśnie zwieracze pozostają całkowicie nienaruszone." },
  { emoji: "🎯", title: "93% skuteczności", desc: "Potwierdzona w badaniach klinicznych wysoka skuteczność zamykania przetok prostych i złożonych." },
  { emoji: "😌", title: "Minimalny ból", desc: "Dyskomfort po zabiegu oceniany na 2–3/10 w porównaniu do 7–9/10 po chirurgii klasycznej." },
  { emoji: "⏱️", title: "Szybki powrót", desc: "Powrót do pracy biurowej po 3–5 dniach. Pełna aktywność po 2–3 tygodniach zamiast 6–8 tygodni." },
  { emoji: "🏥", title: "Zabieg ambulatoryjny", desc: "Bez hospitalizacji — wracasz do domu tego samego dnia, o własnych siłach." },
  { emoji: "✨", title: "Doskonały efekt estetyczny", desc: "Brak rozległych ran i blizn. Minimalne ślady po zabiegu w porównaniu z klasycznym wycięciem." },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const FiLaCAdvantages = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">Dlaczego FiLaC?</h2>
    <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
      Laserowe zamykanie przetok to standard premium w proktologii — łączy wysoką skuteczność z maksymalną ochroną tkanek.
    </p>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {advantages.map((a, i) => (
        <motion.div
          key={a.title}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-xl p-6"
        >
          <div className="text-3xl mb-3">{a.emoji}</div>
          <h4 className="font-bold text-foreground text-sm mb-1.5">{a.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
        </motion.div>
      ))}
    </div>
  </motion.section>
);

export default FiLaCAdvantages;
