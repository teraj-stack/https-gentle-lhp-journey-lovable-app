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
    q: "Czy mikroflebektomia jest bolesna?",
    a: "Zabieg wykonujemy w znieczuleniu miejscowym, dzięki czemu nie odczuwasz bólu. Po zabiegu dyskomfort jest minimalny — większość pacjentów radzi sobie ze zwykłymi lekami przeciwbólowymi dostępnymi bez recepty. Narkoza ogólna nie jest potrzebna.",
  },
  {
    q: "Czym mikroflebektomia różni się od klasycznej operacji żylaków?",
    a: "Tradycyjna operacja (stripping) wymaga narkozy, długich nacięć i kilkutygodniowej rekonwalescencji. Mikroflebektomia piankowa to zabieg ambulatoryjny — wykonywany przez mikronakłucia 1–2 mm, bez szwów, w znieczuleniu miejscowym. Wracasz do domu tego samego dnia.",
  },
  {
    q: "Jak szybko mogę wrócić do pracy?",
    a: "Większość pacjentów wraca do pracy następnego dnia. Zalecamy unikanie ciężkiego wysiłku fizycznego przez około 2 tygodnie, natomiast lekki ruch, spacery i codzienne aktywności są wskazane od razu po zabiegu.",
  },
  {
    q: "Co to jest ta \"pianka\" w nazwie zabiegu?",
    a: "Pianka to sklerosant — specjalistyczny lek podawany w postaci gęstej pianki do mniejszych odgałęzień żylnych. Wypełnia i trwale skleja chore naczynia od środka. To uzupełnienie mikroflebektomii, które pozwala zamknąć również drobniejsze żylaki niedostępne dla mikrohaczyków.",
  },
  {
    q: "Czy po zabiegu pozostaną blizny?",
    a: "Mikronakłucia mają zaledwie 1–2 mm i nie wymagają szwów — zabezpieczamy je plasterkami steri-strip. Po zagojeniu ślady są praktycznie niewidoczne, a efekt estetyczny jest nieporównywalnie lepszy niż po klasycznej operacji.",
  },
  {
    q: "Czy żylaki mogą wrócić po mikroflebektomii?",
    a: "Usunięte żylaki nie odrastają. Jednak przewlekła niewydolność żylna może prowadzić do powstawania nowych zmian w innych miejscach. Dlatego zalecamy profilaktykę: noszenie pończoch uciskowych, regularną aktywność fizyczną i wizyty kontrolne.",
  },
  {
    q: "Ile kosztuje zabieg i co zawiera cena?",
    a: "Koszt mikroflebektomii piankowej to 3 500 zł. W cenie zawarty jest kompletny pakiet: zabieg mikrochirurgiczny, uzupełniająca skleroterapia piankowa, jednorazowy sprzęt najwyższej jakości oraz wszystkie wizyty kontrolne aż do pełnego wygojenia. Nie ma ukrytych kosztów.",
  },
  {
    q: "Kto powinien unikać mikroflebektomii?",
    a: "Zabiegu nie wykonujemy w ciąży, przy aktywnej zakrzepicy żył głębokich, ciężkim niedokrwieniu kończyny, aktywnej infekcji skóry w leczonym miejscu oraz przy nieuregulowanych zaburzeniach krzepnięcia. Kwalifikację poprzedza badanie USG Doppler.",
  },
];

interface MikroflebektomiaFAQProps {
  fadeUp: Record<string, unknown>;
}

const MikroflebektomiaFAQ = ({ fadeUp }: MikroflebektomiaFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={faqs} name="FAQ – Mikroflebektomia piankowa" url="https://mcml.pro/leczenie/mikroflebektomia" />
    <h2 className="section-title mb-3 text-center">
      Najczęściej zadawane pytania
    </h2>
    <p className="section-subtitle text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania, które najczęściej słyszymy od pacjentów rozważających mikroflebektomię piankową
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

export default MikroflebektomiaFAQ;
