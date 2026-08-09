import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Mail, Users } from "lucide-react";
import WspolpracaContactDialog from "./WspolpracaContactDialog";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const badges = [
  "Pełna autonomia operacyjna",
  "Zero biurokracji",
  "Darmowe szkolenia",
  "Evidence-Based Medicine",
];

const WspolpracaCTA = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <section id="kontakt-b2b" className="py-20 md:py-28 bg-card">
      <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
        <motion.div {...fadeUp}>
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Porozmawiajmy o współpracy
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Niezobowiązująca, 15-minutowa rozmowa z dr. Janem Bujokiem.
            Omówimy, jak model kooperacyjny CML może wzmocnić Twoją placówkę.
          </p>

          <blockquote className="border-l-2 border-primary/40 pl-4 my-8 text-sm italic text-muted-foreground max-w-lg mx-auto text-left">
            „Praca zespołu powinna zawsze obejmować wielkiego zawodnika,
            ale wielki zawodnik musi zawsze pracować."
          </blockquote>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
            <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
              <a
                href={(() => {
                  const now = new Date();
                  const start = new Date(now);
                  start.setDate(start.getDate() + ((1 + 7 - start.getDay()) % 7 || 7));
                  start.setHours(10, 0, 0, 0);
                  const end = new Date(start);
                  end.setMinutes(15);
                  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
                  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Wirtualna kawa – współpraca B2B z CML")}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent("Niezobowiązująca, 15-minutowa rozmowa z dr. Janem Bujokiem na temat modelu kooperacyjnego CML.\n\nStrona: https://mcml.pro/wspolpraca")}&location=${encodeURIComponent("Online (Google Meet)")}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
              >
                Umów wirtualną kawę
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-10 py-6 text-base"
              onClick={() => setContactOpen(true)}
            >
              <Mail className="w-4 h-4 mr-2" />
              Napisz do nas
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-12 text-xs text-muted-foreground">
            {badges.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <WspolpracaContactDialog open={contactOpen} onOpenChange={setContactOpen} />
    </section>
  );
};

export default WspolpracaCTA;
