import { motion } from "framer-motion";
import { Check } from "lucide-react";

type Props = {
  /** ISO daty (YYYY-MM-DD) ukończonych dni */
  completedDays: string[];
};

const easeOut = [0.16, 1, 0.3, 1] as const;
const DAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const last7Days = () => {
  const out: { iso: string; date: Date }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({ iso: toISO(d), date: d });
  }
  return out;
};

const StreakCalendar = ({ completedDays }: Props) => {
  const days = last7Days();
  const set = new Set(completedDays);
  const todayISO = toISO(new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
      className="inline-flex flex-col items-center gap-2"
      aria-label="Postęp z ostatnich 7 dni"
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-sans">
        Ostatnie 7 dni
      </p>
      <div className="flex items-end gap-2">
        {days.map(({ iso, date }, i) => {
          // weekday: getDay() → 0=Nd, 1=Pn, ... 6=So  → mapuj na Pn-pierwszy
          const wd = date.getDay();
          const label = DAY_LABELS[(wd + 6) % 7];
          const done = set.has(iso);
          const isToday = iso === todayISO;
          return (
            <div key={iso} className="flex flex-col items-center gap-1.5">
              <span
                className={`text-[10px] font-sans uppercase tracking-wider ${
                  isToday ? "text-primary font-semibold" : "text-muted-foreground/70"
                }`}
              >
                {label}
              </span>
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.35,
                  ease: easeOut,
                  delay: 0.15 + i * 0.04,
                }}
                className={[
                  "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                  done
                    ? "bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_10px_-2px_hsl(var(--primary)/0.6)]"
                    : "bg-muted/40 border border-border/60",
                  isToday && !done ? "ring-1 ring-primary/50" : "",
                  isToday && done ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background" : "",
                ].join(" ")}
                aria-label={
                  done
                    ? `${iso}: trening ukończony`
                    : `${iso}: brak treningu`
                }
                title={iso}
              >
                {done && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
              </motion.div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default StreakCalendar;
