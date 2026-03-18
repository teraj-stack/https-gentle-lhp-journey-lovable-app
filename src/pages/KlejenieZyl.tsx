import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const advantages = [
  { emoji: "💉", title: "Bez narkozy", desc: "Zabieg wykonywany wyłącznie w znieczuleniu miejscowym — zero ryzyka ogólnego." },
  { emoji: "🩹", title: "Bez nacięć", desc: "Klej podawany przez mikrokaniulę — brak szwów, brak blizn." },
  { emoji: "🧦", title: "Bez pończoch uciskowych", desc: "W przeciwieństwie do EVLT, po klejeniu nie musisz nosić kompresjoterapii." },
  { emoji: "🚶", title: "Natychmiastowy powrót", desc: "Wstajesz ze stołu i wychodzisz. Praca biurowa możliwa tego samego dnia." },
];

const steps = [
  { num: "1", emoji: "🔍", title: "Diagnostyka USG Doppler", subtitle: "Mapowanie niewydolnych naczyń", desc: "Precyzyjne badanie ultrasonograficzne pozwala zlokalizować źródło refluksu i zaplanować optymalną strategię zamknięcia żyły." },
  { num: "2", emoji: "💧", title: "Podanie kleju cyjanoakrylowego", subtitle: "Zamknięcie żyły od wewnątrz", desc: "Przez mikronakłucie wprowadzamy kaniulę do chorej żyły. Klej medyczny jest podawany pod kontrolą USG, zamykając naczynie w kilka sekund." },
  { num: "3", emoji: "🤲", title: "Kompresja punktowa", subtitle: "Utrwalenie efektu", desc: "Lekarz uciska miejsce klejenia na kilka minut. Żyła zamyka się na stałe, a krew kierowana jest do zdrowych naczyń." },
];

const faqs = [
  { q: "Czym różni się klejenie od lasera EVLT?", a: "EVLT zamyka żyłę energią cieplną, co wymaga tumescencji (ostrzykiwania płynem) i noszenia pończoch uciskowych. Klejenie eliminuje oba te elementy — jest szybsze i bardziej komfortowe, choć nie w każdym przypadku jest wskazane." },
  { q: "Czy klej jest bezpieczny?", a: "Stosujemy klej cyjanoakrylowy klasy medycznej (VenaSeal™). Jest to ten sam rodzaj kleju, który od dekad stosowany jest w chirurgii do zamykania ran. Substancja pozostaje w organizmie i jest stopniowo wchłaniana." },
  { q: "Ile trwa zabieg?", a: "Sama procedura klejenia trwa zwykle 15–30 minut. Łącznie z przygotowaniem i obserwacją — około godziny. Wychodzisz na własnych nogach." },
  { q: "Czy potrzebuję zwolnienia lekarskiego?", a: "W zdecydowanej większości przypadków — nie. Pacjenci wracają do pracy biurowej tego samego dnia. Ciężki wysiłek fizyczny odradzamy przez ok. tydzień." },
  { q: "Dla kogo jest ta metoda?", a: "Klejenie żył jest idealne dla pacjentów z niewydolnością żyły odpiszczelowej lub odstrzałkowej, którzy chcą uniknąć narkozy, kompresjoterapii i długiej rekonwalescencji. Kwalifikację potwierdza badanie USG." },
];

const KlejenieZyl = () => (
  <div className="min-h-screen bg-background pt-20">
    {/* Hero */}
    <section className="gradient-bg py-16 md:py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto text-center"
      >
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary-foreground/60 mb-4">
          Flebologia małoinwazyjna
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Klejenie żył: Zamknij problem bez skalpela
        </h1>
        <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Klej medyczny zamyka chorą żyłę w kilka sekund — bez narkozy, bez pończoch uciskowych i bez przerwy w pracy. Najnowocześniejsza metoda w flebologii.
        </p>
      </motion.div>
    </section>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      {/* Czym jest klejenie */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Czym jest klejenie żył?</h2>
        <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
          Metoda VenaSeal™ polega na wprowadzeniu do chorej żyły specjalnego kleju cyjanoakrylowego, który zamyka naczynie od wewnątrz. Krew zostaje przekierowana do zdrowych żył, a zamknięte naczynie jest stopniowo wchłaniane przez organizm.
        </p>
        <div className="glass-card rounded-2xl p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Jak to działa?</h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                  Mikronakłucie w okolicy kolana pod kontrolą USG
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                  Wprowadzenie kaniuli do niewydolnej żyły
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                  Precyzyjne podanie kleju medycznego w małych dawkach
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">4</span>
                  Kompresja punktowa — żyła zamyka się natychmiast
                </li>
              </ol>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-6xl">🧬</div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="glass-card rounded-xl p-4">
                    <div className="text-2xl font-bold text-primary">15–30</div>
                    <div className="text-xs text-muted-foreground">minut zabiegu</div>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <div className="text-2xl font-bold text-primary">0</div>
                    <div className="text-xs text-muted-foreground">dni L4</div>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <div className="text-2xl font-bold text-primary">97%</div>
                    <div className="text-xs text-muted-foreground">skuteczność</div>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <div className="text-2xl font-bold text-primary">0</div>
                    <div className="text-xs text-muted-foreground">blizn</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Zalety */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Dlaczego klejenie żył?</h2>
        <p className="section-subtitle mb-10 text-center">
          Kluczowe przewagi nad metodami tradycyjnymi
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          {advantages.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass-card rounded-xl p-6 flex items-start gap-4"
            >
              <span className="text-3xl">{a.emoji}</span>
              <div>
                <h4 className="font-bold text-foreground text-sm mb-1">{a.title}</h4>
                <p className="text-muted-foreground text-sm">{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Kroki procedury */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Przebieg zabiegu krok po kroku</h2>
        <div className="space-y-6 mt-10">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-2xl p-8"
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-lg">{s.num}</span>
                <span className="text-3xl">{s.emoji}</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{s.title}</h3>
              <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-3">{s.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* EVLT vs Klejenie */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">EVLT vs Klejenie żył</h2>
        <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
          Obie metody są skuteczne i bezpieczne. Wybór zależy od anatomii żył i preferencji pacjenta.
        </p>
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Cecha</th>
                  <th className="p-4 text-center text-foreground font-semibold">EVLT (Laser)</th>
                  <th className="p-4 text-center text-primary font-semibold">Klejenie (VenaSeal)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-4 text-muted-foreground">Znieczulenie</td><td className="p-4 text-center text-foreground">Tumescencyjne</td><td className="p-4 text-center text-primary font-medium">Tylko 1 nakłucie</td></tr>
                <tr><td className="p-4 text-muted-foreground">Pończochy uciskowe</td><td className="p-4 text-center text-foreground">2–4 tygodnie</td><td className="p-4 text-center text-primary font-medium">Nie wymagane</td></tr>
                <tr><td className="p-4 text-muted-foreground">Ból po zabiegu</td><td className="p-4 text-center text-foreground">Minimalny</td><td className="p-4 text-center text-primary font-medium">Praktycznie żaden</td></tr>
                <tr><td className="p-4 text-muted-foreground">Powrót do pracy</td><td className="p-4 text-center text-foreground">1–2 dni</td><td className="p-4 text-center text-primary font-medium">Ten sam dzień</td></tr>
                <tr><td className="p-4 text-muted-foreground">Skuteczność 5-letnia</td><td className="p-4 text-center text-foreground">~95%</td><td className="p-4 text-center text-primary font-medium">~97%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Najczęściej zadawane pytania</h2>
        <p className="section-subtitle mb-10 text-center">
          Odpowiedzi na pytania, które słyszymy najczęściej
        </p>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="glass-card rounded-xl border-none px-6">
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-primary hover:no-underline py-5">
                  <span className="text-primary mr-2">❓</span> {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🩺</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Sprawdź, czy klejenie jest dla Ciebie</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Kwalifikację potwierdza badanie USG Doppler. Umów się na bezpłatną konsultację i poznaj najlepszą opcję dla Twoich żył.
        </p>
        <Button variant="hero" size="lg" asChild>
          <Link to="/kontakt">Umów konsultację</Link>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default KlejenieZyl;
