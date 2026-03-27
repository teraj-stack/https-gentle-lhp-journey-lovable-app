import { useCountUp } from "@/hooks/useCountUp";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Zap, Clock, TrendingDown, Heart } from "lucide-react";

interface StatProps {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  delay: number;
  decimals?: number;
}

const AnimatedStat = ({ icon, value, suffix, label, delay, decimals = 0 }: StatProps) => {
  const { ref, value: animatedValue } = useCountUp({ end: value, delay, decimals, duration: 1.8 });

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-1">
        {icon}
      </div>
      <p className="text-3xl md:text-4xl font-bold text-foreground">
        <span ref={ref}>{animatedValue}</span>
        <span className="text-primary">{suffix}</span>
      </p>
      <p className="text-xs text-muted-foreground max-w-[140px]">{label}</p>
    </div>
  );
};

const StatsCountUp = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="glass-card rounded-2xl p-8 md:p-10"
    >
      <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-8 text-center">
        Laser LHP w liczbach
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
        <AnimatedStat
          icon={<TrendingDown className="w-6 h-6 text-primary" />}
          value={92}
          suffix="%"
          label="Pacjentów wraca do pracy w 48h"
          delay={0}
        />
        <AnimatedStat
          icon={<Zap className="w-6 h-6 text-primary" />}
          value={2.5}
          suffix="/10"
          label="Średni poziom bólu po zabiegu"
          delay={0.15}
          decimals={1}
        />
        <AnimatedStat
          icon={<Clock className="w-6 h-6 text-primary" />}
          value={30}
          suffix="'"
          label="Średni czas trwania zabiegu"
          delay={0.3}
        />
        <AnimatedStat
          icon={<Heart className="w-6 h-6 text-primary" />}
          value={95}
          suffix="%"
          label="Poziom satysfakcji pacjentów"
          delay={0.45}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/60 italic text-center mt-6">
        Dane orientacyjne na podstawie przeglądów piśmiennictwa i ankiet pacjentów.
      </p>
    </motion.div>
  );
};

export default StatsCountUp;
