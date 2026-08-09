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
    q: "Czy fototerapia LED jest bolesna?",
    a: "Nie — fotobiomodulacja jest całkowicie bezbolesna. Pacjenci mogą odczuwać jedynie delikatne, przyjemne ciepło w naświetlanym obszarze. Nie wymaga żadnego znieczulenia.",
  },
  {
    q: "Ile sesji fototerapii potrzebuję?",
    a: "Liczba sesji zależy od wskazania. W przypadku wspomagania gojenia po zabiegach (CLaCS, EVLT) zazwyczaj wykonujemy 1–3 sesje. Przy samodzielnej redukcji naczynek lub stanów zapalnych protokół obejmuje 4–8 sesji w odstępach tygodniowych.",
  },
  {
    q: "Jak długo trwa pojedynczy zabieg PBM?",
    a: "Sesja naświetlania trwa zazwyczaj 15–30 minut, w zależności od powierzchni leczonego obszaru i zastosowanego protokołu świetlnego.",
  },
  {
    q: "Czy po fototerapii są jakieś ograniczenia?",
    a: "Nie ma żadnych ograniczeń — od razu po zabiegu można wrócić do normalnych aktywności. PBM nie wymaga ochrony przed słońcem ani okresu rekonwalescencji.",
  },
  {
    q: "Czy fototerapia LED jest bezpieczna?",
    a: "Tak. Metaanalizy badań klinicznych potwierdzają niemal idealny profil bezpieczeństwa PBM. Fale świetlne stosowane w terapii nie mają wystarczającej energii, by uszkodzić DNA. Skutki uboczne są ekstremalnie rzadkie i ograniczają się do przejściowego mrowienia lub lekkiego zaczerwienienia.",
  },
  {
    q: "Czy fototerapię można łączyć z innymi zabiegami?",
    a: "Tak — w naszej klinice PBM stanowi integralny element protokołu CLaCS (leczenie pajączków) oraz wspomagania gojenia po EVLT i skleroterapii. Światło LED doskonale uzupełnia zabiegi laserowe i iniekcyjne.",
  },
  {
    q: "Dla kogo fototerapia jest przeciwwskazana?",
    a: "Bezwzględnych przeciwwskazań jest bardzo niewiele. Odradza się naświetlanie powłok brzusznych u kobiet w ciąży (ze względów medyczno-prawnych) oraz chrząstek wzrostowych u noworodków. Tatuaże nie stanowią przeciwwskazania, mogą jedynie powodować przejściowe odczucie ciepła.",
  },
  {
    q: "Ile kosztuje fototerapia LED?",
    a: "Cenę pojedynczej sesji oraz pakietów ustalamy indywidualnie w zależności od protokołu i powierzchni naświetlania. Gdy PBM stanowi element zabiegu CLaCS lub gojenia po EVLT, jest zwykle wliczona w cenę pakietu — szczegóły omawiamy na konsultacji.",
  },
];

interface FototerapiaFAQProps {
  fadeUp: Record<string, unknown>;
}

const FototerapiaFAQ = ({ fadeUp }: FototerapiaFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema
      faqs={faqs}
      name="FAQ – Fototerapia LED (PBM)"
      url="https://mcml.pro/leczenie/fototerapia"
    />
    <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-3 text-center">
      Najczęściej zadawane pytania
    </h2>
    <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania, które najczęściej słyszymy od pacjentów zainteresowanych fototerapią LED
    </p>
    <div className="max-w-3xl mx-auto">
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16, filter: "blur(3px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
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

export default FototerapiaFAQ;
