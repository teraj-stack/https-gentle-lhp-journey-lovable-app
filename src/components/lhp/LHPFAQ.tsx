import { motion } from "framer-motion";
import FaqSchema from "@/components/shared/FaqSchema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const lhpFaqs = [
  {
    q: "Czy zabieg LHP jest bolesny?",
    a: "LHP wykonujemy w znieczuleniu miejscowym lub krótkotrwałej sedacji dożylnej. Pacjenci opisują odczucia jako znacznie łagodniejsze niż po klasycznej hemoroidektomii. Po zabiegu wystarczają zwykłe leki przeciwbólowe.",
  },
  {
    q: "Ile trwa zabieg laserowego leczenia hemoroidów?",
    a: "Sam zabieg trwa od 20 minut do 1 godziny, w zależności od stopnia zaawansowania. Wraz z przygotowaniem i obserwacją pobyt w klinice wynosi ok. 3–4 godziny. Wracasz do domu tego samego dnia.",
  },
  {
    q: "Jak szybko wrócę do pracy po LHP?",
    a: "Większość pacjentów wraca do pracy biurowej po 3–5 dniach. Praca fizyczna wymaga ok. 7–14 dni przerwy. To wielokrotnie krótszy czas niż 4–6 tygodni po klasycznej hemoroidektomii.",
  },
  {
    q: "Czy hemoroidy mogą wrócić po zabiegu laserowym?",
    a: "Skuteczność LHP wynosi ok. 90–95% dla stopnia II–III. Nawroty są rzadkie, a w razie potrzeby zabieg można bezpiecznie powtórzyć — to duża przewaga nad metodami chirurgicznymi.",
  },
  {
    q: "Kto kwalifikuje się do zabiegu LHP?",
    a: "LHP jest najskuteczniejsze w przypadku hemoroidów II i III stopnia. W stopniu IV laser może być niewystarczający i konieczna jest interwencja chirurgiczna. Kwalifikację ustalamy podczas konsultacji proktologicznej z anoskopią.",
  },
  {
    q: "Jak przygotować się do zabiegu LHP?",
    a: "Przed zabiegiem wykonujemy badanie proktologiczne z anoskopią. W dniu zabiegu zalecamy lekką dietę i oczyszczenie jelita (wlewka). Po zabiegu kluczowa jest dieta bogata w błonnik i odpowiednie nawadnianie.",
  },
];

interface LHPFAQProps {
  fadeUp: Record<string, unknown>;
}

const LHPFAQ = ({ fadeUp }: LHPFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={lhpFaqs} name="FAQ – LHP laserowe leczenie hemoroidów" url="https://mcml.pro/leczenie/lhp" />
    <h2 className="section-title mb-3 text-center">
      Najczęściej zadawane pytania
    </h2>
    <p className="section-subtitle text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania, które najczęściej słyszymy od pacjentów rozważających leczenie laserowe hemoroidów
    </p>
    <div className="max-w-3xl mx-auto">
      <Accordion type="single" collapsible className="space-y-3">
        {lhpFaqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="glass-card rounded-xl border-none px-6"
          >
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-primary hover:no-underline py-5">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </motion.section>
);

export default LHPFAQ;
