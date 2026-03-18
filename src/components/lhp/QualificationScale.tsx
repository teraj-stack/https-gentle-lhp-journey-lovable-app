import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const stages = [
  { grade: "I°", label: "Idealne dla lasera", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/15", desc: "Guzki wewnętrzne, bez wypadania. Niemal natychmiastowa ulga." },
  { grade: "II°", label: "Idealne dla lasera", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/15", desc: "Guzki wypadają przy parciu, cofają się samoistnie." },
  { grade: "III°", label: "Moment krytyczny", icon: AlertTriangle, color: "text-primary", bg: "bg-primary/15", desc: "Guzki wypadają i wymagają ręcznego odprowadzenia. Laser wciąż jest metodą z wyboru." },
  { grade: "IV°", label: "Może być za późno", icon: XCircle, color: "text-destructive", bg: "bg-destructive/15", desc: "Guzki trwale na zewnątrz. Laser może być niewystarczający — konieczna klasyczna operacja." },
];

const QualificationScale = () => (
  <div className="grid sm:grid-cols-2 gap-4">
    {stages.map((s, i) => (
      <motion.div
        key={s.grade}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: i * 0.1 }}
        className="glass-card rounded-xl p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
            <s.icon className={`w-5 h-5 ${s.color}`} />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">{s.grade}</span>
            <p className={`text-xs font-semibold ${s.color}`}>{s.label}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
      </motion.div>
    ))}
  </div>
);

export default QualificationScale;
