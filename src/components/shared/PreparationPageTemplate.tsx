import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import SeoHead from "@/components/shared/SeoHead";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  Heart,
  CheckCircle2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export interface PreparationItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

export interface PreparationSection {
  title: string;
  icon: LucideIcon;
  items: PreparationItem[];
}

interface PreparationPageTemplateProps {
  procedureName: string;
  procedureHref: string;
  recoveryHref: string;
  seoTitle: string;
  seoDescription: string;
  path: string;
  intro: string;
  sections: PreparationSection[];
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const PreparationPageTemplate = ({
  procedureName,
  procedureHref,
  recoveryHref,
  seoTitle,
  seoDescription,
  path,
  intro,
  sections,
}: PreparationPageTemplateProps) => {
  return (
    <>
      <SeoHead title={seoTitle} description={seoDescription} path={path} />

      <section className="pt-24 md:pt-28 pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs
            items={[
              { label: "Wiedza" },
              { label: "Dla Pacjenta", href: "/dla-pacjenta" },
              { label: `Przygotowanie do ${procedureName}` },
            ]}
            className="mb-6"
          />
          <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-4">
              Jak przygotować się do zabiegu {procedureName}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">{intro}</p>
          </motion.div>
        </div>
      </section>

      {sections.map((section, sIdx) => {
        const SectionIcon = section.icon;
        return (
          <section key={sIdx} className="py-10 md:py-14">
            <div className="container mx-auto px-4 max-w-4xl">
              <motion.div {...fadeUp} className="flex items-center gap-3 mb-8">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <SectionIcon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                  {section.title}
                </h2>
              </motion.div>

              <div className="space-y-4">
                {section.items.map((item, i) => {
                  const ItemIcon = item.icon;
                  return (
                    <motion.div
                      key={i}
                      {...fadeUp}
                      transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                      className="flex items-start gap-4 bg-card border border-border rounded-xl p-5 md:p-6"
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ItemIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* Recovery cross-link */}
      <section className="py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            {...fadeUp}
            className="glass-card rounded-2xl p-6 md:p-7 border border-primary/20 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
          >
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">A co po zabiegu?</h3>
                <p className="text-sm text-muted-foreground">
                  Zalecenia pozabiegowe — pierwsze dni, codzienna pielęgnacja i powrót do aktywności.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="group whitespace-nowrap">
              <Link to={recoveryHref}>
                Zalecenia po zabiegu
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Reassurance + CTA */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            {...fadeUp}
            className="bg-gradient-to-br from-primary/5 via-accent/20 to-primary/5 border border-primary/10 rounded-2xl p-8 md:p-10 text-center"
          >
            <Heart className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
              Jesteśmy tu dla Ciebie
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
              Jeśli masz jakiekolwiek wątpliwości przed wizytą — zadzwoń lub napisz. Spokojnie wszystko wyjaśnimy i dostosujemy plan przygotowania do Twojej sytuacji.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <a href="tel:+48222174007">
                  <Phone className="w-4 h-4" />
                  Zadzwoń do nas
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to="/kontakt">
                  <Mail className="w-4 h-4" />
                  Napisz do nas
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-8">
              Wracasz do strony zabiegu?{" "}
              <Link to={procedureHref} className="text-primary hover:underline">
                {procedureName} →
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default PreparationPageTemplate;
