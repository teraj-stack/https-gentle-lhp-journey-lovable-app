import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, ArrowRight } from "lucide-react";
import { StaggeredListItem } from "@/components/shared/StaggeredList";

const stagger = (delay = 0) => ({
  initial: { opacity: 0, y: 28, filter: "blur(5px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const Philosophy = () => (
  <section className="py-20 md:py-28" style={{ background: "var(--gradient-warm)" }}>
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div {...stagger(0)}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Nasza Filozofia</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Pacjent jako Świadomy Partner
          </h2>
          <div className="premium-divider !mx-0 mb-8" />
          <p className="text-muted-foreground leading-relaxed mb-6">
            W CML nie oferujemy wyłącznie zaawansowanej technologii laserowej. Budujemy partnerską relację, w której każdy pacjent staje się aktywnym, wyedukowanym uczestnikiem procesu odzyskiwania komfortu i zdrowia.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Przed pierwszą wizytą otrzymujesz nasz autorski <strong className="text-foreground">Przewodnik Przygotowawczy</strong> — dedykowany e-book, który krok po kroku wyjaśnia cały proces. Wchodzisz do gabinetu spokojny, doskonale rozumiejąc, czego się spodziewać. Lekarz może poświęcić 100% uwagi Twoim indywidualnym potrzebom.
          </p>
          <ul className="space-y-3 mb-8">
            {[
              "Wchodzisz do gabinetu spokojny i przygotowany",
              "Lekarz poświęca pełną uwagę Twoim potrzebom",
              "Budujesz partnerską relację z zespołem medycznym",
            ].map((text, i) => (
              <StaggeredListItem key={text} index={i} icon={<CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />}>
                {text}
              </StaggeredListItem>
            ))}
          </ul>
          <Button variant="outline" asChild>
            <Link to="/dla-pacjenta">
              Dowiedz się więcej o programie
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </motion.div>

        <motion.div {...stagger(0.15)} className="flex justify-center">
          <div className="relative">
            <div className="w-64 md:w-72 aspect-[3/4] rounded-2xl bg-gradient-to-br from-primary/90 to-primary shadow-2xl flex flex-col items-center justify-center p-8 text-primary-foreground">
              <BookOpen className="w-12 h-12 mb-6 opacity-80" />
              <p className="text-xs uppercase tracking-[0.15em] opacity-60 mb-2 font-sans">CML</p>
              <h3 className="text-lg font-bold text-center leading-snug font-serif">
                Kompleksowy Przewodnik Pacjenta
              </h3>
              <div className="w-10 h-px bg-primary-foreground/30 my-4" />
              <p className="text-xs text-center opacity-70 font-sans">
                Nowoczesne Leczenie Laserowe
              </p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-64 md:w-72 aspect-[3/4] rounded-2xl bg-primary/20 -z-10" />
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default Philosophy;
