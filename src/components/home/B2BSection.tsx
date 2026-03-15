import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Heart, Award, ArrowRight } from "lucide-react";

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

const B2BSection = () => (
  <section className="py-20 md:py-28" style={{ background: "var(--gradient-warm)" }}>
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div {...fadeUp}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Dla Lekarzy i Klinik</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Zbuduj z nami nowy standard polskiej proktologii
          </h2>
          <div className="premium-divider mb-8" />
          <p className="text-muted-foreground leading-relaxed mb-10">
            Skaluj swoją praktykę w modelu premium. Zapewniamy kompletne szkolenia autorskie, środowisko wolne od biurokracji i gotowy model operacyjny sprawdzony na rynku.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            { icon: BookOpen, title: "Darmowe szkolenia", desc: "Kompletne szkolenia autorskie dla lekarzy i pielęgniarek. Zero bariery wejścia." },
            { icon: Heart, title: "Bez biurokracji", desc: "Skupiasz się na pacjentach. Wszystko inne leży po naszej stronie." },
            { icon: Award, title: "Prestiż premium", desc: "Dołączasz do sieci klinik wyznaczających najwyższe standardy w kraju." },
          ].map((item, i) => (
            <motion.div key={item.title} {...stagger(i)} className="glass-card p-6 rounded-2xl text-center">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2 font-sans text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp}>
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <Link to="/wspolpraca">
              Umów 15-minutową wirtualną kawę
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Niezobowiązująca rozmowa z dr. Janem Bujokiem
          </p>
        </motion.div>
      </div>
    </div>
  </section>
);

export default B2BSection;
