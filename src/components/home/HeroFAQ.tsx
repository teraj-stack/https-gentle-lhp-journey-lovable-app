import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import FaqSchema from "@/components/shared/FaqSchema";

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
});

type FaqLink = { label: string; to: string };

type HeroFaq = {
  q: string;
  a: string;
  links: FaqLink[];
};

const FAQS: HeroFaq[] = [
  {
    q: "Jakie zabiegi laserowe wykonujecie w CML?",
    a: "Specjalizujemy się w proktologii laserowej (LHP – hemoroidy, FiLaC – przetoki, SiLaC – torbiel pilonidalna) oraz flebologii (EVLT, CLaCS, skleroterapia, mikroflebektomia).",
    links: [
      { label: "Proktologia", to: "/proktologia" },
      { label: "Flebologia", to: "/flebologia" },
    ],
  },
  {
    q: "Jak laserowe leczenie hemoroidów (LHP) różni się od klasycznej operacji?",
    a: "Metoda LHP zamyka guzki krwawnicze włóknem laserowym od wewnątrz – bez cięcia, bez szwów i z krótszą rekonwalescencją niż klasyczna hemoroidektomia.",
    links: [
      { label: "Zabieg LHP", to: "/proktologia/hemoroidy" },
      { label: "Powrót do formy", to: "/zalecenia-po-lhp" },
    ],
  },
  {
    q: "Jak wygląda laserowe leczenie żylaków metodą EVLT?",
    a: "EVLT to wewnątrznaczyniowe zamknięcie niewydolnej żyły laserem 1470 nm w znieczuleniu miejscowym tumescencyjnym. Pacjent wraca do aktywności tego samego dnia.",
    links: [
      { label: "Zabieg EVLT", to: "/flebologia/evlt" },
      { label: "Przygotowanie do EVLT", to: "/przygotowanie-evlt" },
    ],
  },
  {
    q: "Czy zabiegi laserowe są bolesne?",
    a: "Wszystkie zabiegi wykonujemy w komfortowym znieczuleniu miejscowym. Pacjenci opisują odczucia jako minimalne – znacznie łagodniejsze niż w metodach klasycznych.",
    links: [{ label: "Filozofia opieki", to: "/o-nas" }],
  },
  {
    q: "Gdzie znajdują się kliniki CML?",
    a: "Przyjmujemy w Warszawie – Wilanów. Pełny adres, telefon i godziny pracy znajdziesz na stronie kontaktu.",
    links: [{ label: "Lokalizacje i kontakt", to: "/kontakt" }],
  },
  {
    q: "Jak umówić konsultację u dr Jana Bujoka?",
    a: "Konsultacje umawiasz online przez profil ZnanyLekarz lub telefonicznie w wybranej klinice. Cennik i czas trwania konsultacji opisaliśmy w sekcji cennika.",
    links: [
      { label: "Cennik konsultacji", to: "/cennik" },
      { label: "O dr Janie Bujoku", to: "/o-nas" },
    ],
  },
];

const HeroFAQ = () => (
  <section
    id="faq"
    aria-labelledby="hero-faq-heading"
    className="py-20 md:py-24 bg-background"
  >
    <FaqSchema
      name="CML – Najczęstsze pytania o leczenie laserowe"
      url="https://mcml.pro/#faq"
      faqs={FAQS.map(({ q, a }) => ({ q, a }))}
    />

    <div className="max-w-3xl mx-auto px-4 md:px-8">
      <motion.div {...fadeUp} className="text-center mb-12">
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">FAQ</p>
        <h2
          id="hero-faq-heading"
          className="text-3xl md:text-4xl font-bold text-foreground mb-4"
        >
          Najczęstsze pytania pacjentów
        </h2>
        <div className="premium-divider" />
        <p className="text-muted-foreground mt-6 max-w-xl mx-auto">
          Krótkie odpowiedzi na pytania, które najczęściej zadają pacjenci przed wizytą. Każdą odpowiedź pogłębisz na dedykowanej podstronie.
        </p>
      </motion.div>

      <div className="space-y-4">
        {FAQS.map((faq, i) => (
          <motion.details
            key={faq.q}
            {...stagger(i)}
            className="glass-card rounded-xl group"
          >
            <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer text-sm md:text-base font-semibold text-foreground hover:text-primary transition-colors list-none font-sans">
              <span>{faq.q}</span>
              <span
                aria-hidden="true"
                className="text-muted-foreground group-open:rotate-45 transition-transform text-lg shrink-0"
              >
                +
              </span>
            </summary>
            <div className="px-5 pb-5 pt-4 border-t border-border space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              {faq.links.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {faq.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-primary hover:underline font-medium"
                      >
                        → {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.details>
        ))}
      </div>
    </div>
  </section>
);

export default HeroFAQ;
