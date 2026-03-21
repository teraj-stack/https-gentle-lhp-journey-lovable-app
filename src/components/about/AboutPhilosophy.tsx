import { motion } from "framer-motion";
import { CheckCircle2, Award, Heart } from "lucide-react";

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

const pillars = [
  {
    icon: CheckCircle2,
    title: "Skuteczność",
    desc: "Stosujemy technologie małoinwazyjne — LHP, EVLT, skleroterapię — które optymalizują czas rekonwalescencji i pozwalają pacjentom wrócić do aktywności w 48–72 godziny.",
  },
  {
    icon: Heart,
    title: "Edukacja pacjenta",
    desc: "Ustandaryzowana preedukacja (e-booki, ikonografie) zdejmuje z pacjenta ciężar stresu i wstydu jeszcze przed wizytą. Świadomy pacjent to lepszy compliance i sprawniejsza konsultacja.",
  },
  {
    icon: Award,
    title: "Kooperacja interdyscyplinarna",
    desc: "Zintegrowany ekosystem partnerski umożliwia bezpieczne kierowanie pacjentów między specjalistami — na osi uroginekologia, fizjoterapia, proktologia — pod wspólnym, wysokim standardem.",
  },
];

const AboutPhilosophy = () => (
  <section className="py-20 md:py-28" style={{ background: "var(--gradient-warm)" }}>
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <motion.div {...fadeUp} className="text-center mb-14">
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Nasza Filozofia</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Trzy filary modelu MCPL
        </h2>
        <div className="premium-divider" />
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {pillars.map((item, i) => (
          <motion.div key={item.title} {...stagger(i)} className="glass-card p-8 rounded-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-6">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 font-serif">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default AboutPhilosophy;
