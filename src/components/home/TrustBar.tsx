import { motion } from "framer-motion";
import { Shield, Award, Star, Users } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.12 },
});

const trustItems = [
  { icon: Shield, label: "Certyfikowane systemy laserowe", sub: "ELVeS · FiLaC · SiLaC" },
  { icon: Award, label: "Kliniki premium", sub: "Warszawa Wilanów · Siedlce" },
  { icon: Star, label: "Zweryfikowane opinie", sub: "4.9/5 – Google & ZnanyLekarz" },
  { icon: Users, label: "Doświadczony zespół", sub: "Autorskie szkolenia dla lekarzy" },
];

const TrustBar = () => (
  <section className="py-10 border-b border-border bg-card">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {trustItems.map((item, i) => (
          <motion.div key={item.label} {...stagger(i)} className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustBar;
