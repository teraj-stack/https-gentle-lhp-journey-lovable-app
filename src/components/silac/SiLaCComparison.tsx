import { motion } from "framer-motion";

const rows = [
  { label: "Ból pooperacyjny", silac: "2–3 / 10", classic: "6–8 / 10" },
  { label: "Hospitalizacja", silac: "Brak", classic: "1–2 dni" },
  { label: "Powrót do pracy", silac: "2–3 dni", classic: "2–4 tygodnie" },
  { label: "Pełna aktywność", silac: "2–3 tygodnie", classic: "4–8 tygodni" },
  { label: "Rozmiar rany", silac: "Nakłucie 2–3 mm", classic: "Rana 5–10 cm" },
  { label: "Gojenie", silac: "Pierwotne (4–6 tyg.)", classic: "Wtórne (8–16 tyg.)" },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const SiLaCComparison = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">SiLaC vs chirurgia klasyczna</h2>
    <p className="section-subtitle mb-10 text-center">
      Porównanie kluczowych parametrów — laser oferuje dramatycznie krótszą rekonwalescencję i lepszy efekt estetyczny.
    </p>
    <div className="glass-card rounded-2xl overflow-hidden max-w-3xl mx-auto">
      <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider border-b border-border">
        <div className="p-4 text-muted-foreground">Parametr</div>
        <div className="p-4 text-primary text-center">SiLaC</div>
        <div className="p-4 text-muted-foreground text-center">Chirurgia</div>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          className={`grid grid-cols-3 text-sm ${i < rows.length - 1 ? "border-b border-border/50" : ""}`}
        >
          <div className="p-4 text-foreground font-medium">{row.label}</div>
          <div className="p-4 text-primary text-center font-semibold">{row.silac}</div>
          <div className="p-4 text-muted-foreground text-center">{row.classic}</div>
        </motion.div>
      ))}
    </div>
  </motion.section>
);

export default SiLaCComparison;
