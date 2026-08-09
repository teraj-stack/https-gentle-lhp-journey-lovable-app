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
    q: "Czy zabieg usuwania boli?",
    a: "Nowoczesne metody są niemal bezbolesne. Zabiegi wykonujemy w znieczuleniu miejscowym — poczujesz jedynie delikatne ukłucia, porównywalne do pobierania krwi. Większość pacjentek nie wymaga środków przeciwbólowych.",
  },
  {
    q: "Długość rekonwalescencji?",
    a: "Do domu wracasz o własnych siłach prosto z gabinetu. Większość pacjentek wraca do pracy i lekkich codziennych obowiązków już następnego dnia. Odradzamy jedynie intensywny sport przez ok. 2 tygodnie.",
  },
  {
    q: "Co z bliznami po zabiegu?",
    a: "Metody małoinwazyjne nie wymagają szwów ani skalpela. Laser wprowadzamy przez mikroskopijne nakłucie, które goi się jak po zwykłym zastrzyku. Efekt estetyczny jest doskonały, nogi pozostają gładkie.",
  },
  {
    q: "Czy żylaki mogą powrócić?",
    a: "Dzięki USG Doppler usuwamy przyczynę problemu, a nie tylko objawy, co potężnie minimalizuje ryzyko. Należy pamiętać, że skłonność do żylaków bywa genetyczna, więc edukujemy jak dbać o nogi w przyszłości.",
  },
  {
    q: "Jak przygotować się do wizyty?",
    a: "Brak specjalnych przygotowań. Załóż wygodne, luźne ubranie ułatwiające badanie USG. Jeśli posiadasz wcześniejszą dokumentację medyczną żył — po prostu zabierz ją ze sobą.",
  },
];

interface EVLTFAQProps {
  fadeUp: Record<string, unknown>;
}

const EVLTFAQ = ({ fadeUp }: EVLTFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={faqs} name="FAQ – Zabieg EVLT na żylaki" url="https://mcml.pro/leczenie/evlt" />
    <h2 className="section-title mb-3 text-center">Najczęściej zadawane pytania</h2>
    <p className="section-subtitle mb-10 text-center">
      Wszystko, co chcesz wiedzieć przed pierwszą wizytą
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

export default EVLTFAQ;
