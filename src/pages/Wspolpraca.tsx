import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Network,
  GraduationCap,
  Clock,
  Shield,
  ArrowRight,
  BookOpen,
  Users,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
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
  transition: { duration: 0.7 },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.12 },
});

const models = [
  {
    label: "Tradycyjny model (opieka silosowa)",
    desc: "Poszczególne działy medyczne funkcjonują niezależnie. Brak wymiany informacji o pacjencie między specjalistami, co prowadzi do powtórzeń diagnostycznych i wydłużenia ścieżki leczenia.",
    type: "old" as const,
  },
  {
    label: "Model kooperacyjny CML",
    desc: "Zintegrowany ekosystem partnerski wspierający wdrażanie procedur tkankowo-oszczędzających. Placówki zyskują dostęp do systemu preedukacji pacjenta oraz możliwości krzyżowego kierowania chorych, zachowując pełną autonomię operacyjną.",
    type: "new" as const,
  },
];

const benefits = [
  {
    icon: Clock,
    title: "Optymalizacja czasu",
    desc: "Preedukacja obniża stres pacjenta, co ułatwia i przyspiesza przepływ wizyt w harmonogramach lekarskich.",
  },
  {
    icon: TrendingUp,
    title: "Profil usług",
    desc: "Adaptacja metod tkankowo-oszczędzających (LHP, EVLT, skleroterapia) wpisuje się w najnowsze standardy chirurgii krótkoterminowej.",
  },
  {
    icon: Network,
    title: "Synergia kompetencji",
    desc: "Współpraca sieciowa poszerza portfolio diagnostyczne ośrodka, ułatwiając bezpieczne krzyżowe skierowania (cross-referrals).",
  },
  {
    icon: Shield,
    title: "Wiarygodność EBM",
    desc: "Komunikacja oparta na faktach naukowych (Evidence-Based Medicine) wzmacnia pozycję ośrodka jako placówki innowacyjnej.",
  },
];

const faq = [
  {
    q: "W jaki sposób technologia LHP wspiera chirurgię jednego dnia?",
    a: "Zabieg LHP to wewnątrztkankowa procedura fotokoagulacji — nie wymaga mechanicznego wycinania tkanek ani otwartych ran. W wielu przypadkach pacjenci wracają do aktywności w 48–72 godziny. Optymalizuje to rotację na salach zabiegowych i minimalizuje obciążenie infrastruktury łóżkowej.",
  },
  {
    q: "Na czym polega rola narzędzi edukacyjnych w kwalifikacji medycznej?",
    a: "Standaryzowane materiały (e-booki przedzabiegowe) pełnią funkcję miękkiej prekwalifikacji. Przenoszą ciężar edukacji podstawowej poza mury placówki, dzięki czemu lekarz może skupić się wyłącznie na zaawansowanej diagnostyce klinicznej.",
  },
  {
    q: "Dlaczego nowoczesna medycyna wymaga kooperacji interdyscyplinarnej?",
    a: "Pacjentki po urazach okołoporodowych nierzadko wymagają jednoczesnej opieki ginekologicznej, fizjoterapeutycznej i proktologicznej. Sieć zaufanych partnerstw pozwala placówkom na bezpieczne zarządzanie takimi przypadkami pod wspólnym standardem jakości.",
  },
  {
    q: "Czy dołączenie do sieci wiąże się z utratą autonomii?",
    a: "Absolutnie nie. Model kooperacyjny CML gwarantuje zachowanie pełnej autonomii operacyjnej placówki. Partnerzy zyskują dostęp do sprawdzonego modelu, systemu preedukacji i możliwości cross-referrals — bez biurokracji i ingerencji w zarządzanie.",
  },
];

const Wspolpraca = () => (
  <div className="min-h-screen">
    {/* Hero */}
    <ParallaxSection className="relative gradient-hero pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background/40" />
      <div className="relative max-w-4xl mx-auto px-4 md:px-8 text-center">
        <motion.div {...fadeUp}>
          <p className="text-sm font-sans uppercase tracking-[0.2em] text-primary mb-6">
            Współpraca B2B
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            Interdyscyplinarny standard dla nowoczesnych placówek
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
            Jak kooperacyjny model CML optymalizuje procesy, podnosi jakość leczenia
            i buduje przewagę konkurencyjną Twojej kliniki.
          </p>
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <a href="#kontakt-b2b">
              Umów wirtualną kawę
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    {/* Filozofia */}
    <section className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center mb-14">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Filozofia</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Edukacja pacjenta jako narzędzie optymalizacji
          </h2>
          <div className="premium-divider mb-8" />
          <p className="text-muted-foreground leading-relaxed">
            Ustandaryzowana edukacja pacjenta — w postaci e-booków i materiałów przedzabiegowych —
            pełni funkcję „prehabilitacji informacyjnej". Uświadomiony pacjent odczuwa mniejszy stres,
            co prowadzi do sprawniejszego wywiadu, wyższego compliance i optymalizacji czasu konsultacji.
          </p>
        </motion.div>

        {/* Porównanie modeli */}
        <div className="grid md:grid-cols-2 gap-6">
          {models.map((model, i) => (
            <motion.div
              key={model.label}
              {...stagger(i)}
              className={`glass-card p-8 rounded-2xl border-l-4 ${
                model.type === "new" ? "border-l-primary" : "border-l-muted"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-sans font-semibold uppercase tracking-wider ${
                  model.type === "new" ? "text-primary" : "text-muted-foreground"
                }`}>
                  {model.type === "new" ? "Rekomendowany" : "Tradycyjny"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3 font-sans">{model.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{model.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Korzyści */}
    <section className="py-20 md:py-28 bg-card">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center mb-14">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">
            Korzyści dla placówki
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Kluczowe wnioski z perspektywy zarządzania
          </h2>
          <div className="premium-divider" />
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((item, i) => (
            <motion.div key={item.title} {...stagger(i)} className="glass-card p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-5">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2 font-sans">{item.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* FAQ */}
    <section className="py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <motion.div {...fadeUp} className="text-center mb-14">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">
            Baza wiedzy
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            FAQ dla managerów medycznych
          </h2>
          <div className="premium-divider" />
        </motion.div>

        <motion.div {...fadeUp}>
          <Accordion type="single" collapsible className="space-y-3">
            {faq.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="glass-card rounded-xl border border-border px-6"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground text-left py-5 hover:no-underline font-sans">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section id="kontakt-b2b" className="py-20 md:py-28 bg-card">
      <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
        <motion.div {...fadeUp}>
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Porozmawiajmy o współpracy
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Niezobowiązująca, 15-minutowa rozmowa z dr. Janem Bujokiem.
            Omówimy, jak model kooperacyjny CML może wzmocnić Twoją placówkę.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
            <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
              <Link to="/kontakt">
                Umów wirtualną kawę
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">lub napisz: kontakt@cml.pl</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-12 text-xs text-muted-foreground">
            {["Pełna autonomia operacyjna", "Zero biurokracji", "Darmowe szkolenia", "Evidence-Based Medicine"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  </div>
);

export default Wspolpraca;
