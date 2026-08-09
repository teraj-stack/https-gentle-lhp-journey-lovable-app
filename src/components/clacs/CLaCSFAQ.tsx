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
    q: "Ile sesji CLaCS potrzebuję, żeby pozbyć się pajączków?",
    a: "Większość pacjentek wymaga 2–4 sesji w odstępach 4–6 tygodni. Liczba zależy od rozległości zmian i indywidualnej reakcji naczyń. Efekty widoczne są już po pierwszej sesji, ale pełny rezultat osiągamy po zakończeniu cyklu.",
  },
  {
    q: "Czy zabieg CLaCS jest bolesny?",
    a: "CLaCS jest jedną z najkomfortniejszych metod — kriochłodzenie znacząco redukuje ból, a większość pacjentek opisuje odczucia jako lekkie mrowienie lub chłód. Nie wymaga znieczulenia ogólnego ani miejscowego.",
  },
  {
    q: "Czy pajączki mogą wrócić po zabiegu?",
    a: "Zamknięte naczynia nie otwierają się ponownie. Mogą jednak pojawić się nowe pajączki — zwłaszcza przy predyspozycji genetycznej, ciąży lub długim staniu. Dlatego zalecamy profilaktykę: kompresję, aktywność fizyczną i okresowe wizyty kontrolne.",
  },
  {
    q: "Kiedy zobaczę efekty zabiegu CLaCS?",
    a: "Pierwsze efekty widoczne są po 2–3 tygodniach, gdy organizm wchłonie zamknięte naczynia. Pełny rezultat estetyczny oceniamy po 6–8 tygodniach od ostatniej sesji. W tym czasie mogą pojawić się przejściowe zasinienia — to naturalna reakcja.",
  },
  {
    q: "Czy mogę się opalać po zabiegu?",
    a: "Nie — przez 4–6 tygodni po zabiegu należy chronić leczone miejsca filtrem SPF 50+ i unikać bezpośredniego słońca. Ekspozycja na UV może prowadzić do przebarwień w miejscach po zamkniętych naczyniach.",
  },
  {
    q: "Czym CLaCS różni się od zwykłej skleroterapii?",
    a: "Klasyczna skleroterapia polega wyłącznie na iniekcji środka zamykającego. CLaCS łączy trzy techniki — kriochłodzenie zmniejsza ból i obkurcza naczynia, laser zamyka je od zewnątrz, a mikroskleroterapia dopełnia efekt. Ta synergia daje lepsze rezultaty estetyczne i większy komfort.",
  },
  {
    q: "Ile trwa jedna sesja CLaCS?",
    a: "Pojedyncza sesja trwa zazwyczaj 30–60 minut, w zależności od powierzchni leczonych zmian. Wraz z konsultacją i mapowaniem naczyń wizyta zajmuje ok. 1–1,5 godziny.",
  },
  {
    q: "Ile kosztuje zabieg CLaCS?",
    a: "Cena zaczyna się od 500 zł za sesję i zależy od rozległości leczonego obszaru. Konsultacja flebologiczna kosztuje 400 zł, a z USG Doppler 500 zł. Pełny plan leczenia wyceniamy indywidualnie po badaniu — aktualne stawki znajdziesz w cenniku.",
  },
  {
    q: "Kto powinien unikać zabiegu CLaCS?",
    a: "Zabiegu nie wykonujemy w ciąży i podczas karmienia piersią, przy aktywnej infekcji lub stanie zapalnym skóry w leczonym miejscu, przy świeżej opaleniźnie, nieleczonej niewydolności żył głównych oraz przy zaburzeniach krzepnięcia. Kwalifikację zawsze poprzedza badanie USG Doppler.",
  },
  {
    q: "Czy mogę pracować następnego dnia po CLaCS?",
    a: "Tak — CLaCS nie wymaga zwolnienia lekarskiego. Do pracy i codziennych aktywności wracasz od razu. Przez 1–2 tygodnie odradzamy jedynie intensywny sport, saunę i gorące kąpiele.",
  },
];

interface CLaCSFAQProps {
  fadeUp: Record<string, unknown>;
}

const CLaCSFAQ = ({ fadeUp }: CLaCSFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={faqs} name="FAQ – Zabieg CLaCS na pajączki" url="https://mcml.pro/leczenie/clacs" />
    <h2 className="section-title mb-3 text-center">
      Najczęściej zadawane pytania
    </h2>
    <p className="section-subtitle text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania, które najczęściej słyszymy od pacjentek rozważających zabieg CLaCS
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

export default CLaCSFAQ;
