import { motion } from "framer-motion";

const items = [
  { icon: "💊", title: "Precyzyjne Leki", desc: "Dedykowane środki łagodzące, dobrane tak, aby minimalizować skurcze i dyskomfort." },
  { icon: "🌿", title: "Dieta Bogatoresztkowa", desc: "Błonnik i odpowiednie nawodnienie gwarantują miękką konsystencję, eliminując tarcie." },
  { icon: "🚽", title: "Podnóżek Ergonomiczny", desc: "Fizjologiczna pozycja (kąt 35°) całkowicie zdejmuje napięcie z mięśni dna miednicy." },
];

const SurvivalKit = () => (
  <div className="grid md:grid-cols-3 gap-6">
    {items.map((item, i) => (
      <motion.div
        key={item.title}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: i * 0.15, duration: 0.5 }}
        className="glass-card p-6 rounded-2xl text-center"
      >
        <div className="text-4xl mb-4">{item.icon}</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
      </motion.div>
    ))}
  </div>
);

export default SurvivalKit;
