import { motion } from "framer-motion";
import FaqSchema from "@/components/shared/FaqSchema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const szczelinaFaqs = [
  {
    q: "Czy leczenie szczeliny odbytu jest bolesne?",
    a: "Leczenie zachowawcze (maści, dieta) jest bezbolesne. Iniekcja botoksu odbywa się w krótkim znieczuleniu i trwa kilka sekund. Laserowa sfinkterotomia wykonywana jest w znieczuleniu miejscowym — dyskomfort pooperacyjny jest minimalny.",
  },
  {
    q: "Ile trwa gojenie szczeliny odbytu?",
    a: "Szczelina ostra goi się zazwyczaj w 4–6 tygodni przy prawidłowym leczeniu zachowawczym. Szczelina przewlekła może wymagać interwencji (botoks lub laser) — po zabiegu gojenie trwa 2–4 tygodnie.",
  },
  {
    q: "Czy szczelina odbytu może wygoić się sama?",
    a: "Szczelina ostra — tak, przy odpowiedniej diecie i nawadnianiu ponad 60% przypadków goi się samoistnie. Szczelina przewlekła (powyżej 6 tygodni) wymaga interwencji medycznej, ponieważ błędne koło bólu i skurczu zwieracza uniemożliwia naturalne gojenie.",
  },
  {
    q: "Na czym polega leczenie botoksem?",
    a: "Toksyna botulinowa wstrzykiwana jest w mięsień zwieracz wewnętrzny, powodując jego rozluźnienie na 2–3 miesiące. W tym czasie rana ma optymalne warunki do wygojenia. Zabieg trwa kilka minut i jest wykonywany ambulatoryjnie.",
  },
  {
    q: "Kiedy konieczna jest laserowa sfinkterotomia?",
    a: "Gdy leczenie zachowawcze i botoks nie przynoszą efektów. Laser CO₂ precyzyjnie nacina włókna zwieracza wewnętrznego, trwale obniżając napięcie mięśnia. Jest to metoda ostateczna, ale bardzo skuteczna — z ponad 95% wyleczalnością.",
  },
  {
    q: "Jak zapobiegać nawrotom szczeliny?",
    a: "Kluczowe jest utrzymanie miękkiego stolca: dieta bogata w błonnik (30 g/dzień), nawadnianie (2–2,5 l/dzień), regularna aktywność fizyczna. Unikaj długiego siedzenia na toalecie i nadmiernego parcia podczas wypróżniania.",
  },
];

interface SzczelinaFAQProps {
  fadeUp: Record<string, unknown>;
}

const SzczelinaFAQ = ({ fadeUp }: SzczelinaFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={szczelinaFaqs} name="FAQ – Szczelina odbytu" url="https://mcml.pro/leczenie/szczelina" />
    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center font-serif">
      Najczęściej zadawane pytania
    </h2>
    <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania, które najczęściej słyszymy od pacjentów ze szczeliną odbytu
    </p>
    <div className="max-w-3xl mx-auto">
      <Accordion type="single" collapsible className="space-y-3">
        {szczelinaFaqs.map((faq, i) => (
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

export default SzczelinaFAQ;
