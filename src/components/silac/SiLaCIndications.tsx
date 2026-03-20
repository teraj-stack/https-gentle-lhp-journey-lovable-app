import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const indications = [
  "Pierwotna torbiel pilonidalna (sinus pilonidalis)",
  "Nawrotowa torbiel pilonidalna po leczeniu chirurgicznym",
  "Przewlekła przetoka pilonidalna z nawracającymi ropniami",
  "Pacjenci preferujący minimalnie inwazyjne metody",
  "Osoby aktywne zawodowo wymagające szybkiego powrotu do pracy",
];

const contraindications = [
  "Ostry, nieodrenowany ropień pilonidalny (najpierw drenaż)",
  "Bardzo rozległa, wielokanałowa torbiel (wymaga indywidualnej oceny)",
  "Aktywne zakażenie skóry w okolicy zabiegu",
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const SiLaCIndications = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">Wskazania i przeciwwskazania</h2>
    <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <h3 className="font-bold text-foreground">Wskazania</h3>
        </div>
        <ul className="space-y-3">
          {indications.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="flex items-start gap-3 text-sm text-foreground"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-1.5" />
              {item}
            </motion.li>
          ))}
        </ul>
      </div>
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Przeciwwskazania względne</h3>
        </div>
        <ul className="space-y-3">
          {contraindications.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="flex items-start gap-3 text-sm text-foreground"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
              {item}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  </motion.section>
);

export default SiLaCIndications;
