import { motion } from "framer-motion";

const barAnim = (delay: number, width: string) => ({
  initial: { width: "0%" },
  whileInView: { width },
  viewport: { once: true },
  transition: { duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

const numberAnim = (delay: number) => ({
  initial: { opacity: 0, scale: 0.8 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true },
  transition: { duration: 0.5, delay: delay + 0.6 },
});

interface BarRowProps {
  label: string;
  laserValue: number;
  classicValue: number;
  max: number;
  unit: string;
  delay: number;
}

const BarRow = ({ label, laserValue, classicValue, max, unit, delay }: BarRowProps) => {
  const laserPct = `${(laserValue / max) * 100}%`;
  const classicPct = `${(classicValue / max) * 100}%`;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{label}</p>

      {/* Laser */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-primary font-medium w-20 shrink-0">Laser LHP</span>
        <div className="flex-1 h-8 rounded-full bg-muted overflow-hidden relative">
          <motion.div
            {...barAnim(delay, laserPct)}
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
          />
        </div>
        <motion.span {...numberAnim(delay)} className="text-sm font-bold text-primary w-16 text-right">
          {laserValue} {unit}
        </motion.span>
      </div>

      {/* Classic */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-destructive font-medium w-20 shrink-0">Klasyczna</span>
        <div className="flex-1 h-8 rounded-full bg-muted overflow-hidden relative">
          <motion.div
            {...barAnim(delay + 0.15, classicPct)}
            className="h-full rounded-full bg-gradient-to-r from-destructive to-destructive/70"
          />
        </div>
        <motion.span {...numberAnim(delay + 0.15)} className="text-sm font-bold text-destructive w-16 text-right">
          {classicValue} {unit}
        </motion.span>
      </div>
    </div>
  );
};

const ComparisonCharts = () => (
  <div className="space-y-10">
    <BarRow
      label="Poziom bólu pooperacyjnego (skala 0–10)"
      laserValue={2.5}
      classicValue={8.5}
      max={10}
      unit="/10"
      delay={0}
    />
    <BarRow
      label="Czas rekonwalescencji (dni)"
      laserValue={3}
      classicValue={25}
      max={30}
      unit="dni"
      delay={0.2}
    />
    <BarRow
      label="Czas zabiegu (minuty)"
      laserValue={30}
      classicValue={60}
      max={70}
      unit="min"
      delay={0.4}
    />
    <BarRow
      label="Całkowity koszt leczenia (zł)*"
      laserValue={4500}
      classicValue={8000}
      max={10000}
      unit="zł"
      delay={0.6}
    />
    <p className="text-[10px] text-muted-foreground/60 italic mt-2">
      * Szacunkowy koszt obejmuje zabieg, wizyty kontrolne i okres rekonwalescencji (utracone zarobki). Wartości orientacyjne.
    </p>
  </div>
);

export default ComparisonCharts;
