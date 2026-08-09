import { motion } from "framer-motion";
import FaqSchema from "@/components/shared/FaqSchema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const spazmFaqs = [
  {
    q: "Czym jest spazm mięśnia łonowo-odbytniczego?",
    a: "To przewlekłe, nadmierne napięcie mięśnia puborektalis, który tworzy pętlę wokół odbytnicy. Powoduje tępy, głęboki ból odbytu trwający godzinami, nasilający się przy siedzeniu i defekacji. Bywa błędnie diagnozowany jako hemoroidy lub szczelina.",
  },
  {
    q: "Jakie są objawy spazmu łonowo-odbytniczego?",
    a: "Przewlekły, rozlany ból w okolicy odbytu i krocza, uczucie ciała obcego, trudności z wypróżnianiem (dyssynergia), uczucie niepełnego wypróżnienia. Ból może promieniować do pośladków, kości ogonowej i ud.",
  },
  {
    q: "Jak diagnozuje się spazm mięśnia łonowo-odbytniczego?",
    a: "Kluczowe jest badanie per rectum z oceną napięcia mięśni dna miednicy. Lekarz może zlecić manometrię anorektalną (pomiar ciśnień), defekografię MR lub EMG mięśni dna miednicy. Ważne jest wykluczenie przyczyn organicznych.",
  },
  {
    q: "Czy biofeedback jest skuteczny w leczeniu spazmu?",
    a: "Tak, biofeedback (fizjoterapia dna miednicy z czujnikami EMG) jest złotym standardem leczenia dyssynergii i spazmu. Skuteczność sięga 70-80% w badaniach klinicznych. Pacjent uczy się świadomej relaksacji mięśni dna miednicy.",
  },
  {
    q: "Na czym polega leczenie botoksem spazmu łonowo-odbytniczego?",
    a: "Toksyna botulinowa wstrzykiwana jest w mięsień łonowo-odbytniczy, powodując jego kontrolowane rozluźnienie na 3-6 miesięcy. W tym czasie mięsień uczy się prawidłowego napięcia. Zabieg jest ambulatoryjny, powrót do aktywności tego samego dnia.",
  },
  {
    q: "Ile trwa leczenie przewlekłego bólu odbytu?",
    a: "Leczenie jest wieloetapowe i zindywidualizowane. Biofeedback wymaga zazwyczaj 6-12 sesji (2-3 miesiące). Efekt botoksu utrzymuje się 3-6 miesięcy. Farmakoterapia i modyfikacja nawyków to proces ciągły. U większości pacjentów znaczna poprawa następuje w ciągu 2-4 miesięcy.",
  },
  {
    q: "Czy spazm łonowo-odbytniczy może nawracać?",
    a: "Tak, nawroty są możliwe, szczególnie w okresach stresu. Dlatego tak ważna jest kompleksowa terapia obejmująca nie tylko leczenie objawowe, ale też modyfikację nawyków, techniki relaksacyjne i zarządzanie stresem.",
  },
  {
    q: "Czy spazm łonowo-odbytniczy jest groźny?",
    a: "Nie jest stanem zagrażającym życiu, ale znacząco obniża jego jakość. Przewlekły ból wpływa na sen, pracę, relacje i samopoczucie psychiczne. Nieleczony może prowadzić do zaparć, unikania defekacji i pogłębiania dysfunkcji.",
  },
];

interface SpazmFAQProps {
  fadeUp: Record<string, unknown>;
}

const SpazmFAQ = ({ fadeUp }: SpazmFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={spazmFaqs} name="FAQ – Spazm mięśnia łonowo-odbytniczego" url="https://mcml.pro/leczenie/spazm-lonowoodbytniczy" />
    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center font-serif">
      Najczęściej zadawane pytania
    </h2>
    <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania dotyczące przewlekłego bólu odbytu i spazmu mięśnia łonowo-odbytniczego
    </p>
    <div className="max-w-3xl mx-auto">
      <Accordion type="single" collapsible className="space-y-3">
        {spazmFaqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12, filter: "blur(3px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
          >
            <AccordionItem
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
          </motion.div>
        ))}
      </Accordion>
    </div>
  </motion.section>
);

export default SpazmFAQ;
