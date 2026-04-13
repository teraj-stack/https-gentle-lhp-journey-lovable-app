import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Stethoscope, Activity, CheckCircle2, ArrowRight } from "lucide-react";
import { StaggeredListItem } from "@/components/shared/StaggeredList";

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as const },
});

const services = [
  {
    icon: Stethoscope,
    title: "Proktologia Laserowa",
    desc: "Odzyskaj komfort bez bólu i bez cięć. Zabiegi laserowe pozwalają wrócić do domu tego samego dnia — bez szwów, bez stresu.",
    treatments: ["LHP – Hemoroidy", "FiLaC – Przetoki", "SiLaC – Torbiel pilonidalna", "Szczelina odbytu"],
    cta: "Poznaj metody leczenia",
    href: "/leczenie/lhp",
  },
  {
    icon: Activity,
    title: "Flebologia Laserowa",
    desc: "Lekkie nogi i pewność siebie. Precyzyjne zabiegi zamykające żyły laserowo — bez tradycyjnej chirurgii i długiej rekonwalescencji.",
    treatments: ["EVLT – Ablacja żylaków", "Skleroterapia żylaków", "CLaCS – Pajączki i teleangiektazje"],
    cta: "Poznaj rozwiązania naczyniowe",
    href: "/leczenie/evlt",
  },
];

const ServiceCards = () => (
  <section className="py-20 md:py-28">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <motion.div {...fadeUp} className="text-center mb-14">
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Obszary leczenia</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Zaawansowane leczenie laserowe</h2>
        <div className="premium-divider mb-6" />
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Łączymy najnowsze technologie z indywidualnym podejściem. Każdy zabieg wykonujemy w klinikach klasy premium z pełnym komfortem pacjenta.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        {services.map((s, i) => (
          <motion.div
            key={s.title}
            {...stagger(i)}
            className="glass-card p-8 md:p-10 rounded-2xl hover:shadow-lg transition-shadow group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-6">
              <s.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3 font-serif">{s.title}</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">{s.desc}</p>
            <ul className="space-y-2 mb-8">
              {s.treatments.map((t, i) => (
                <StaggeredListItem key={t} index={i} icon={<CheckCircle2 className="w-4 h-4 text-primary shrink-0" />} className="flex items-center gap-2 text-sm text-foreground">
                  {t}
                </StaggeredListItem>
              ))}
            </ul>
            <Button variant="outline" className="group-hover:border-primary group-hover:text-primary transition-colors" asChild>
              <Link to={s.href}>
                {s.cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ServiceCards;
