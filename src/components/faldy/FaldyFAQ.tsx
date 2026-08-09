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
    q: "Czy fałdy brzeżne odbytu są niebezpieczne?",
    a: "Nie — fałdy brzeżne (skin tags) to łagodne naddatki skóry, które nie niosą ryzyka zezłośliwienia i nie prowadzą do powikłań zdrowotnych. Nie wymagają leczenia z przyczyn medycznych.",
  },
  {
    q: "Czy fałdy mogą zniknąć samoistnie?",
    a: "W zdecydowanej większości przypadków nie. Fałdy powstałe po zakrzepicy brzeżnej, ciąży lub przewlekłych zaparciach mają charakter trwały. Jedyną skuteczną metodą ich usunięcia jest zabieg chirurgiczny lub laserowy.",
  },
  {
    q: "Jak wygląda zabieg usunięcia fałdów?",
    a: "Wykonujemy laserową plastykę okolicy odbytu laserem CO₂. Zabieg jest ambulatoryjny, trwa 10–20 minut i odbywa się w znieczuleniu miejscowym. Laser jednocześnie tnie i koaguluje, co minimalizuje krwawienie — nie ma potrzeby zakładania szwów.",
  },
  {
    q: "Czy usunięcie fałdów jest bolesne?",
    a: "Zabieg wykonywany jest w znieczuleniu miejscowym, więc w jego trakcie nie odczuwasz bólu. Po zabiegu może pojawić się umiarkowany dyskomfort trwający 7–10 dni, łagodzony zwykłymi lekami przeciwbólowymi.",
  },
  {
    q: "Ile kosztuje usunięcie fałdów brzeżnych?",
    a: "Koszt zabiegu zależy od rozległości zmian i jest ustalany indywidualnie podczas konsultacji. Aktualny cennik znajdziesz na stronie Cennik lub zapytaj o wycenę podczas wizyty.",
  },
  {
    q: "Czy fałdy mogą nawrócić po zabiegu?",
    a: "Usunięte fałdy nie odrastają. Jednak jeśli utrzymuje się przyczyna ich powstawania (np. przewlekłe zaparcia, nawracająca zakrzepica), nowe fałdy mogą pojawić się w innym miejscu. Dlatego podczas konsultacji omawiamy również profilaktykę.",
  },
  {
    q: "Kiedy powinienem/powinnam zgłosić się do lekarza?",
    a: "Warto skonsultować się z proktologiem, jeśli fałd pojawił się nagle i boli (może to być zakrzepica), towarzyszą mu krwawienia, świąd lub wyciek, zmiana rośnie lub zmienia kolor, albo po prostu chcesz mieć pewność diagnozy.",
  },
  {
    q: "Czy mogę pracować następnego dnia po usunięciu fałdów?",
    a: "Tak — zabieg jest ambulatoryjny i praca biurowa jest zwykle możliwa już następnego dnia. Praca fizyczna oraz sport wymagają ok. 7–10 dni przerwy, do czasu wygojenia rany.",
  },
];

interface FaldyFAQProps {
  fadeUp: Record<string, unknown>;
}

const FaldyFAQ = ({ fadeUp }: FaldyFAQProps) => (
  <motion.section {...fadeUp}>
    <FaqSchema faqs={faqs} name="FAQ – Fałdy okolicy odbytu" url="https://mcml.pro/dla-pacjenta/faldy-odbytu" />
    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center font-serif">
      Najczęściej zadawane pytania
    </h2>
    <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
      Odpowiedzi na pytania, które najczęściej słyszymy od pacjentów z fałdami brzeżnymi odbytu
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

export default FaldyFAQ;
