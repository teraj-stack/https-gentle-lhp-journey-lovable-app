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
    q: "Czy skleroterapia jest bolesna?",
    a: "Zabieg wykonujemy igłami o bardzo małej średnicy, a sam sklerosant podawany jest w postaci pianki, co minimalizuje dyskomfort. Większość pacjentów opisuje jedynie lekkie pieczenie lub uczucie ciepła w miejscu iniekcji. Znieczulenie ogólne nie jest potrzebne.",
  },
  {
    q: "Ile sesji skleroterapii potrzebuję?",
    a: "Liczba sesji zależy od rozległości zmian. Przy pojedynczych żylakach wystarczają 1–2 zabiegi, natomiast w przypadku zaawansowanej choroby żylnej może być potrzebnych 3–5 sesji w odstępach 2–4 tygodni. Plan leczenia ustalamy indywidualnie po badaniu USG.",
  },
  {
    q: "Kiedy mogę wrócić do pracy po zabiegu?",
    a: "Natychmiast — skleroterapia nie wymaga zwolnienia lekarskiego. Po zabiegu zalecamy 20–30 minut spaceru, a następnie normalną aktywność. Jedynie ciężki wysiłek fizyczny i siłownia powinny być odłożone na 1–2 tygodnie.",
  },
  {
    q: "Czy żylaki mogą wrócić po skleroterapii?",
    a: "Zamknięte naczynia nie otwierają się ponownie — organizm je wchłania na stałe. Jednak przewlekła niewydolność żylna może powodować powstawanie nowych żylaków w innych miejscach. Dlatego zalecamy profilaktykę: noszenie pończoch uciskowych, regularny ruch i wizyty kontrolne.",
  },
  {
    q: "Czym różni się skleroterapia od EVLT?",
    a: "EVLT (laser wewnątrzżylny) zamyka główne pnie żylne — żyłę odpiszczelową lub odstrzałkową. Skleroterapia piankowa jest idealna do zamykania bocznic, żył o krętym przebiegu i perforatorów. Często obie metody stosujemy komplementarnie w ramach jednego planu leczenia.",
  },
  {
    q: "Jak długo muszę nosić pończochę uciskową?",
    a: "Zazwyczaj zalecamy noszenie pończochy uciskowej klasy II przez 2–3 tygodnie po zabiegu — całodobowo przez pierwsze 3 dni, potem w ciągu dnia. Dokładne zalecenia ustalamy indywidualnie na podstawie rozległości leczonych zmian.",
  },
  {
    q: "Ile trwa zabieg skleroterapii i kiedy widać wyniki?",
    a: "Pojedyncza sesja trwa 20–40 minut. Pierwsze efekty widoczne są po 2–4 tygodniach, gdy organizm wchłania zamknięte naczynia, a pełny rezultat estetyczny oceniamy po 2–3 miesiącach od ostatniej sesji.",
  },
  {
    q: "Ile kosztuje skleroterapia?",
    a: "Cena zaczyna się od 600 zł za sesję i zależy od rozległości leczonych zmian. Konsultacja flebologiczna kosztuje 400 zł, a z USG Doppler 500 zł. Liczbę sesji i całkowity koszt szacujemy po badaniu — pełny cennik znajdziesz na stronie Cennik.",
  },
  {
    q: "Kto powinien unikać skleroterapii?",
    a: "Zabiegu nie wykonujemy w ciąży i podczas karmienia piersią, przy aktywnej zakrzepicy żył głębokich, przy alergii na sklerosant, w ciężkim niedokrwieniu kończyny oraz przy aktywnej infekcji skóry w leczonym miejscu. Kwalifikację poprzedza badanie USG Doppler.",
  },

];

interface SkleroterapiaFAQProps {
  fadeUp: Record<string, unknown>;
}

const SkleroterapiaFAQ = ({ fadeUp }: SkleroterapiaFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={faqs} name="FAQ – Skleroterapia żylaków" url="https://mcml.pro/leczenie/skleroterapia" />
    <h2 className="section-title mb-3 text-center">
      Najczęściej zadawane pytania
    </h2>
    <p className="section-subtitle text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania, które najczęściej słyszymy od pacjentów rozważających skleroterapię żylaków
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

export default SkleroterapiaFAQ;
