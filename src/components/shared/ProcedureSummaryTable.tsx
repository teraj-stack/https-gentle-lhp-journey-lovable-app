import { motion } from "framer-motion";

export interface ProcedureRow {
  label: string;
  value: string;
}

interface Props {
  title?: string;
  rows: ProcedureRow[];
  fadeUp?: Record<string, unknown>;
}

const ProcedureSummaryTable = ({ title = "Karta zabiegu", rows, fadeUp }: Props) => {
  const Wrapper = fadeUp ? motion.section : "section";
  const wrapperProps = fadeUp ? fadeUp : {};

  return (
    <Wrapper {...(wrapperProps as any)}>
      <h2 className="section-title mb-3 text-center">{title}</h2>
      <p className="section-subtitle mb-10 text-center">
        Najważniejsze informacje o zabiegu w jednym miejscu.
      </p>
      <div className="glass-card rounded-2xl overflow-hidden max-w-3xl mx-auto">
        <div className="grid grid-cols-[1fr_1.5fr] text-xs font-semibold uppercase tracking-wider border-b border-border">
          <div className="p-4 text-muted-foreground">Parametr</div>
          <div className="p-4 text-primary">Szczegóły</div>
        </div>
        {rows.map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className={`grid grid-cols-[1fr_1.5fr] text-sm ${i < rows.length - 1 ? "border-b border-border/50" : ""}`}
          >
            <div className="p-4 text-foreground font-medium">{row.label}</div>
            <div className="p-4 text-muted-foreground">{row.value}</div>
          </motion.div>
        ))}
      </div>
    </Wrapper>
  );
};

export default ProcedureSummaryTable;
