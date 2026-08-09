import { motion } from "framer-motion";
import FaqSchema from "@/components/shared/FaqSchema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Czy zabieg FiLaC jest bolesny?",
    a: "FiLaC wykonujemy w znieczuleniu miejscowym lub krótkotrwałej sedacji. Pacjenci opisują odczucia jako minimalne — znacznie łagodniejsze niż po klasycznej operacji przetoki. Po zabiegu wystarczają zwykłe leki przeciwbólowe.",
  },
  {
    q: "Ile trwa zabieg laserowego zamknięcia przetoki?",
    a: "Sam zabieg trwa zazwyczaj 20–40 minut, w zależności od złożoności przetoki. Wraz z przygotowaniem i obserwacją po zabiegu pobyt w klinice wynosi ok. 2–3 godziny.",
  },
  {
    q: "Jak szybko wrócę do pracy po FiLaC?",
    a: "Większość pacjentów wraca do pracy biurowej po 2–3 dniach. Praca fizyczna wymaga ok. 7–10 dni przerwy. To znacznie krótszy czas niż 3–6 tygodni po klasycznej operacji.",
  },
  {
    q: "Czy FiLaC jest skuteczny przy nawracających przetokach?",
    a: "Tak — jedną z zalet FiLaC jest możliwość powtórzenia zabiegu bez uszkodzenia zwieracza. W przypadku nawrotów laser można zastosować ponownie, czego nie zapewnia tradycyjna chirurgia.",
  },
  {
    q: "Jakie jest ryzyko nietrzymania stolca po zabiegu?",
    a: "Praktycznie zerowe. FiLaC zamyka kanał przetoki od wewnątrz, w 100% oszczędzając mięsień zwieracz. To główna przewaga tej metody nad klasycznym nacięciem chirurgicznym.",
  },
  {
    q: "Jak przygotować się do zabiegu FiLaC?",
    a: "Przed zabiegiem wykonujemy badanie MRI lub USG endorektalne, aby precyzyjnie zmapować przebieg przetoki. W dniu zabiegu zalecamy lekką dietę i oczyszczenie jelita (wlewka).",
  },
];

interface FiLaCFAQProps {
  fadeUp: Record<string, unknown>;
}

const FiLaCFAQ = ({ fadeUp }: FiLaCFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={faqs} name="FAQ – FiLaC laserowe zamknięcie przetoki" url="https://mcml.pro/leczenie/filac" />
    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
      Najczęściej zadawane pytania
    </h2>
    <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania, które najczęściej słyszymy od pacjentów rozważających leczenie laserowe przetoki
    </p>
    <div className="max-w-3xl mx-auto">
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
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

export default FiLaCFAQ;
