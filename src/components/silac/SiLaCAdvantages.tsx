import { motion } from "framer-motion";

const advantages = [
  { emoji: "🎯", title: "90% skuteczności", desc: "Potwierdzona w badaniach klinicznych wysoka skuteczność zamykania zatoki pilonidalnej, porównywalna z klasycznym wycięciem." },
  { emoji: "✨", title: "Minimalna blizna", desc: "Zamiast rozległej rany pooperacyjnej — drobny ślad po nakłuciu. Doskonały efekt estetyczny w delikatnej okolicy." },
  { emoji: "😌", title: "Minimalny ból", desc: "Dyskomfort po zabiegu oceniany na 2–3/10. Wystarczą zwykłe leki przeciwbólowe zamiast silnych opioidów." },
  { emoji: "⏱️", title: "Szybki powrót do pracy", desc: "Powrót do pracy biurowej po 2–3 dniach zamiast 2–4 tygodni po klasycznej operacji z otwartym gojeniem." },
  { emoji: "🏥", title: "Zabieg ambulatoryjny", desc: "Bez hospitalizacji — znieczulenie miejscowe, 30 minut zabiegu, tego samego dnia wracasz do domu." },
  { emoji: "🔄", title: "Powtarzalność", desc: "W razie nawrotu zabieg można bezpiecznie powtórzyć bez zwiększonego ryzyka powikłań czy rozległych blizn." },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const SiLaCAdvantages = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">Dlaczego SiLaC?</h2>
    <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
      Laserowe zamykanie zatoki pilonidalnej to nowoczesna alternatywa dla rozległego wycięcia chirurgicznego.
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

export default SiLaCAdvantages;
