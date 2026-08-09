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
    q: "Czym jest torbiel pilonidalna?",
    a: "Torbiel pilonidalna (sinus pilonidalis) to przewlekły stan zapalny w okolicy kości ogonowej, wywołany wrastaniem włosów pod skórę. Tworzy się kanał (zatoka), który może się nawracająco zapalać i ropieć.",
  },
  {
    q: "Czy zabieg SiLaC jest bolesny?",
    a: "SiLaC wykonujemy w znieczuleniu miejscowym. Ból pooperacyjny jest minimalny — oceniany na 2–3/10, znacznie mniejszy niż po klasycznym wycięciu. Wystarczają zwykłe leki przeciwbólowe.",
  },
  {
    q: "Ile trwa zabieg laserowego zamknięcia torbieli?",
    a: "Sam zabieg trwa 20–30 minut. Wraz z przygotowaniem i obserwacją po zabiegu pobyt w klinice wynosi ok. 2 godziny. Pacjent wraca do domu tego samego dnia.",
  },
  {
    q: "Jak szybko wrócę do pracy po SiLaC?",
    a: "Większość pacjentów wraca do pracy biurowej po 2–3 dniach. Praca fizyczna wymaga ok. 7–10 dni przerwy. To wielokrotnie krótszy czas niż 3–6 tygodni po klasycznym wycięciu z otwartym gojeniem.",
  },
  {
    q: "Czy torbiel może nawrócić po zabiegu laserowym?",
    a: "Skuteczność SiLaC wynosi ok. 90%. W przypadku nawrotu zabieg można bezpiecznie powtórzyć — to duża przewaga nad klasyczną chirurgią, po której ponowna operacja jest bardziej skomplikowana.",
  },
  {
    q: "Jak przygotować się do zabiegu SiLaC?",
    a: "Przed zabiegiem zalecamy dokładną depilację okolicy kości ogonowej (najlepiej laserową) oraz wykonanie USG tkanek miękkich. W dniu zabiegu nie jest wymagane specjalne przygotowanie.",
  },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const SiLaCFAQ = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={faqs} name="FAQ – SiLaC laserowe zamknięcie torbieli" url="https://mcml.pro/leczenie/silac" />
    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
      Najczęściej zadawane pytania
    </h2>
    <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania, które najczęściej słyszymy od pacjentów z torbielą pilonidalną
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

export default SiLaCFAQ;
