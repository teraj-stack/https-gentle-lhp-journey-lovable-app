import { motion } from "framer-motion";

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface DonutProps {
  label: string;
  percentage: number;
  color: string;
  bgColor: string;
  delay: number;
}

const Donut = ({ label, percentage, color, bgColor, delay }: DonutProps) => {
  const strokeDashoffset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke={bgColor}
            strokeWidth="14"
          />
          <motion.circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            whileInView={{ strokeDashoffset }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: delay + 0.8 }}
        >
          <span className="text-3xl font-bold text-foreground">{percentage}%</span>
        </motion.div>
      </div>
      <p className="text-sm font-semibold text-foreground text-center">{label}</p>
    </div>
  );
};

const ReturnToWorkChart = () => (
  <div className="space-y-6">
    <p className="text-sm font-semibold text-foreground">
      Pacjenci wracający do pracy w ciągu 48 h
    </p>
    <div className="flex flex-wrap justify-center gap-12 md:gap-20">
      <Donut
        label="Laser LHP"
        percentage={92}
        color="hsl(var(--primary))"
        bgColor="hsl(var(--muted))"
        delay={0}
      />
      <Donut
        label="Metoda klasyczna"
        percentage={15}
        color="hsl(var(--destructive))"
        bgColor="hsl(var(--muted))"
        delay={0.2}
      />
    </div>
    <p className="text-[10px] text-muted-foreground/60 italic text-center">
      Dane orientacyjne na podstawie przeglądów piśmiennictwa (LHP / hemoroidektomia Milligan-Morgan).
    </p>
  </div>
);

export default ReturnToWorkChart;
