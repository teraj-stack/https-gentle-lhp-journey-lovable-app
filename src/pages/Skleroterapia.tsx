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

const types = [
  { emoji: "🕸", title: "Pajączki naczyniowe", desc: "Drobne fioletowe lub czerwone naczynka widoczne tuż pod skórą, najczęściej na udach i łydkach.", color: "text-primary" },
  { emoji: "🔵", title: "Żyły retikularne", desc: "Nieco większe, niebieskawe żyły (1–3 mm), zasilające pajączki. Ich zamknięcie zapobiega nawrotom.", color: "text-primary" },
  { emoji: "💜", title: "Teleangiektazje twarzy", desc: "Rozszerzone naczynka na nosie i policzkach. Wymagają specjalnej techniki i stężenia środka.", color: "text-primary" },
];

const steps = [
  { num: "1", emoji: "🔬", title: "Ocena naczyniowa", desc: "Badanie dermoskopowe lub USG pozwala ocenić głębokość i typ zmienionych naczyń. Dobieramy stężenie i technikę indywidualnie." },
  { num: "2", emoji: "💉", title: "Iniekcje sklerozantu", desc: "Za pomocą ultracienkich igieł (30G) podajemy środek sklerotyzujący bezpośrednio do zmienionych naczyń. Zabieg jest niemal bezbolesny." },
  { num: "3", emoji: "🩹", title: "Kompresja i obserwacja", desc: "Po zabiegu zakładamy opatrunek uciskowy na 24–48h. Pajączki stopniowo bladną i znikają w ciągu 3–6 tygodni." },
];

const beforeAfter = [
  { label: "Sesje", value: "1–3", desc: "w zależności od rozległości zmian" },
  { label: "Czas sesji", value: "20–30 min", desc: "komfortowa procedura gabinetowa" },
  { label: "Efekt", value: "3–6 tyg.", desc: "stopniowe zanikanie pajączków" },
  { label: "Powrót do aktywności", value: "Natychmiast", desc: "unikaj gorących kąpieli przez 48h" },
];

const faqs = [
  { q: "Czy skleroterapia boli?", a: "Stosujemy najcieńsze igły dostępne w medycynie (30G). Większość pacjentów porównuje uczucie do lekkiego szczypania. Nie jest wymagane żadne znieczulenie." },
  { q: "Ile sesji potrzebuję?", a: "Zwykle 1–3 sesje w odstępach 4–6 tygodni. Liczba zależy od rozległości pajączków. Już po pierwszej sesji widoczna jest znaczna poprawa." },
  { q: "Czy pajączki mogą wrócić?", a: "Zamknięte naczynia nie otwierają się ponownie. Jednak predyspozycja genetyczna może powodować powstawanie nowych pajączków w innych miejscach. Regularna profilaktyka minimalizuje to ryzyko." },
  { q: "Kiedy zobaczę efekty?", a: "Pierwsze efekty widoczne są po 2–3 tygodniach. Pełny rezultat — po 6–8 tygodniach, gdy organizm wchłonie zamknięte naczynia." },
  { q: "Czy są przeciwwskazania?", a: "Ciąża, karmienie piersią, zakrzepica żył głębokich w wywiadzie oraz alergia na środek sklerotyzujący. Każdy pacjent jest indywidualnie kwalifikowany." },
];

const Skleroterapia = () => (
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
          Flebologia estetyczna
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Pajączki naczyniowe: Skleroterapia precyzyjna
        </h1>
        <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Bezbolesna procedura gabinetowa, która przywraca gładkość i jednolity kolor skóry nóg. Bez skalpela, bez rekonwalescencji.
        </p>
      </motion.div>
    </section>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      {/* Typy zmian */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Jakie zmiany leczymy?</h2>
        <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
          Skleroterapia jest złotym standardem w leczeniu drobnych zmian naczyniowych. Skutecznie zamyka pajączki, żyły retikularne i teleangiektazje.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {types.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="glass-card rounded-2xl p-6 text-center"
            >
              <div className="text-4xl mb-4">{t.emoji}</div>
              <h3 className={`font-bold text-base mb-2 ${t.color}`}>{t.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Jak działa */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Jak przebiega zabieg?</h2>
        <p className="section-subtitle mb-10 text-center">
          Trzy proste kroki do gładkich nóg
        </p>
        <div className="space-y-6">
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
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Kluczowe liczby */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Czego się spodziewać?</h2>
        <p className="section-subtitle mb-10 text-center">
          Kluczowe informacje w pigułce
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {beforeAfter.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-card rounded-xl p-5 text-center"
            >
              <div className="text-2xl font-bold text-primary mb-1">{item.value}</div>
              <div className="text-sm font-semibold text-foreground mb-1">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Profilaktyka */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Profilaktyka po zabiegu</h2>
        <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
          Aby efekty utrzymały się jak najdłużej, warto wprowadzić kilka prostych nawyków
        </p>
        <div className="glass-card rounded-2xl p-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-primary text-lg">✓</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Regularna aktywność fizyczna</h4>
                  <p className="text-xs text-muted-foreground">Spacery, pływanie, jazda na rowerze wspierają krążenie żylne.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary text-lg">✓</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Unoszenie nóg</h4>
                  <p className="text-xs text-muted-foreground">15 minut dziennie z nogami powyżej poziomu serca.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary text-lg">✓</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Unikanie długiego stania/siedzenia</h4>
                  <p className="text-xs text-muted-foreground">Co 30 minut zmień pozycję lub zrób krótki spacer.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-primary text-lg">✓</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Nawodnienie</h4>
                  <p className="text-xs text-muted-foreground">Minimum 2 litry wody dziennie dla zdrowia naczyń.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary text-lg">✓</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Ochrona przed słońcem</h4>
                  <p className="text-xs text-muted-foreground">Krem z filtrem na leczone obszary przez 4–6 tygodni.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary text-lg">✓</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Kontrola wagi</h4>
                  <p className="text-xs text-muted-foreground">Nadwaga zwiększa ciśnienie w żyłach kończyn dolnych.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Najczęściej zadawane pytania</h2>
        <p className="section-subtitle mb-10 text-center">
          Rozwiewamy wątpliwości przed wizytą
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
        <div className="text-4xl mb-4">✨</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Odzyskaj piękne nogi</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Skleroterapia to szybki, bezpieczny i skuteczny sposób na pozbycie się pajączków naczyniowych. Umów się na konsultację.
        </p>
        <Button variant="hero" size="lg" asChild>
          <Link to="/kontakt">Umów konsultację</Link>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default Skleroterapia;
