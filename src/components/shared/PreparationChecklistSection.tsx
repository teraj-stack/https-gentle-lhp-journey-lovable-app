import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ClipboardList, Check, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { PreparationChecklist } from "@/content/procedures/preparationChecklists";

interface PreparationChecklistSectionProps {
  checklist: PreparationChecklist;
  /** Pełny URL strony zabiegu — używany w JSON-LD HowTo */
  pageUrl?: string;
}

const anim = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const PreparationChecklistSection = ({
  checklist,
  pageUrl,
}: PreparationChecklistSectionProps) => {
  const { procedureName, intro, fullGuideHref, groups } = checklist;

  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `Przygotowanie do zabiegu ${procedureName}`,
    description: intro,
    ...(pageUrl ? { url: pageUrl } : {}),
    step: groups.map((group, gIdx) => ({
      "@type": "HowToSection",
      position: gIdx + 1,
      name: group.title,
      itemListElement: group.items.map((item, iIdx) => ({
        "@type": "HowToStep",
        position: iIdx + 1,
        text: item,
      })),
    })),
  };

  return (
    <motion.section
      {...anim}
      id="przygotowanie-do-zabiegu"
      aria-labelledby="preparation-checklist-heading"
      className="scroll-mt-24"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />

      <div className="glass-card rounded-2xl p-6 md:p-10">
        <div className="flex items-start gap-4 mb-4">
          <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </span>
          <div>
            <h2
              id="preparation-checklist-heading"
              className="text-2xl md:text-3xl font-serif font-bold text-foreground"
            >
              Przygotowanie do zabiegu {procedureName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Rozwiń listę i sprawdź, co zrobić przed wizytą.
            </p>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
          {intro}
        </p>

        <Accordion
          type="single"
          collapsible
          defaultValue="prep-0"
          className="w-full"
        >
          {groups.map((group, idx) => (
            <AccordionItem key={group.title} value={`prep-${idx}`}>
              <AccordionTrigger className="text-left">
                <h3 className="text-base md:text-lg font-medium text-foreground">
                  {group.title}
                </h3>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 pt-1">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm md:text-base text-muted-foreground leading-relaxed"
                    >
                      <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary" strokeWidth={3} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to={fullGuideHref}>
              Pełna instrukcja przygotowania
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
};

export default PreparationChecklistSection;
