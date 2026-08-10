import { useRef } from "react";
import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import { useIsMobile } from "@/hooks/use-mobile";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import { BookOpen, Download, FileText, Shield, Clock, Heart, ArrowRight, Sparkles, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { StaggeredListItem } from "@/components/shared/StaggeredList";
import ebookCoverImg from "@/assets/ebook-cover-powrot.webp";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const mainEbook = {
  title: "Powrót do Komfortu — Kompleksowy Przewodnik",
  pages: "13 stron",
  desc: "Pełny przewodnik po nowoczesnym leczeniu hemoroidów. Dowiesz się: dlaczego maści przestają działać, jak działa laser vs. skalpel, jak wygląda zabieg krok po kroku i czego się spodziewać po zabiegu.",
  chapters: [
    "Dlaczego to w ogóle boli? — mechanizm hemoroidów",
    "Domowe sposoby vs. medycyna — pułapka błędnego koła",
    "Skalpel czy laser? — porównanie metod",
    "Jak wygląda zabieg laserowy krok po kroku?",
    "Czy kwalifikujesz się do zabiegu? — wyścig z czasem",
  ],
  href: "/ebooks/Powrot-do-Komfortu-Przewodnik.pdf",
  color: "from-primary/90 to-primary",
};

const onlineGuides = [
  {
    title: "Test ryzyka hemoroidów",
    subtitle: "Interaktywny quiz · 9 pytań",
    desc: "Sprawdź swoje ryzyko hemoroidów w 1 minutę. 3 poziomy ryzyka, dopasowane zalecenia EBM i checklista PDF do pobrania.",
    href: "/dla-pacjenta/quiz-hemoroidy",
    icon: "🧪",
  },
  {
    title: "EBM hemoroidy — czynniki ryzyka i profilaktyka",
    subtitle: "Kompendium naukowe",
    desc: "6 kluczowych czynników ryzyka i 6 filarów profilaktyki z linkami do badań PubMed, ASCRS, ESCP i Cochrane.",
    href: "/dla-pacjenta/ebm-hemoroidy",
    icon: "📚",
  },
  {
    title: "Hemoroidy i wizyta u proktologa",
    subtitle: "Lekarz odpowiada",
    desc: "Najczęstsze pytania o hemoroidy, badanie proktologiczne, metody leczenia i profilaktykę — odpowiada lekarz.",
    href: "/dla-pacjenta/proktolog-faq",
    icon: "🩺",
  },
  {
    title: "Hemoroidy od A do Z",
    subtitle: "Infografika wizualna",
    desc: "Wizualna podróż od objawów do decyzji. Porównanie skalpel vs. laser, oś czasu zabiegu i kluczowe liczby.",
    href: "/leczenie/lhp",
    icon: "📊",
  },
  {
    title: "FiLaC — Laserowe Zamykanie Przetok",
    subtitle: "Przewodnik po zabiegu",
    desc: "Zabieg FiLaC w 4 krokach, parametry kliniczne (93% skuteczności) i porównanie z metodami tradycyjnymi.",
    href: "/leczenie/filac",
    icon: "🔬",
  },
  {
    title: "EVLT — Laserowe Leczenie Żylaków",
    subtitle: "Przewodnik po zabiegu",
    desc: "Zabieg EVLT krok po kroku, 98% skuteczności, 0 mm blizny — bez skalpela i hospitalizacji.",
    href: "/leczenie/evlt",
    icon: "🦵",
  },
  {
    title: "Pajączki i naczynka — Przewodnik dla Pacjentki",
    subtitle: "Interaktywny e-book",
    desc: "Kompletny przewodnik o pajączkach naczyniowych — skąd się biorą, jak metoda CLaCS zamyka naczynka trwale i komfortowo.",
    href: "/dla-pacjenta/ebook-pajaczki",
    icon: "🩺",
  },
  {
    title: "Pielęgnacja nóg po zabiegu laserowym",
    subtitle: "Infografika instruktażowa",
    desc: "Oś czasu aplikacji kremu, 4 złote zasady bezpieczeństwa i objawy wymagające kontaktu z gabinetem — po zabiegu laserem Nd:YAG.",
    href: "/dla-pacjenta/pielegnacja-nog",
    icon: "🦵",
  },
  {
    title: "Profilaktyka żylaków — jak dbać o nogi",
    subtitle: "Przewodnik profilaktyczny",
    desc: "Czynniki ryzyka, sygnały ostrzegawcze i 6 filarów codziennej profilaktyki, które potrafią opóźnić żylaki o dekady.",
    href: "/dla-pacjenta/profilaktyka-zylakow",
    icon: "🛡️",
  },
  {
    title: "Dlaczego edukacja przed wizytą jest kluczowa?",
    subtitle: "Infografika edukacyjna",
    desc: "Jak przygotowanie merytoryczne optymalizuje czas konsultacji, redukuje stres i pomaga podjąć świadomą decyzję o leczeniu.",
    href: "/dla-pacjenta/edukacja",
    icon: "🎓",
  },
  {
    title: "Przygotowanie do zabiegu LHP",
    subtitle: "Checklista pacjenta",
    desc: "Praktyczna lista wskazówek: dieta, leki, higiena i co zabrać do kliniki przed laserowym zabiegiem hemoroidów.",
    href: "/dla-pacjenta/przygotowanie-lhp",
    icon: "📋",
  },
];

const benefits = [
  { icon: Shield, title: "Pełna dyskrecja", desc: "Materiały do przeczytania w domu, w bezpiecznej przestrzeni, bez pośpiechu." },
  { icon: Clock, title: "Przygotowanie do wizyty", desc: "Wchodzisz do gabinetu spokojny i wyedukowany. Lekarz poświęca 100% uwagi Twoim potrzebom." },
  { icon: Heart, title: "Bez medycznego żargonu", desc: "Przewodniki napisane prostym językiem, z empatią i zrozumieniem Twojej sytuacji." },
];

const DlaPacjenta = () => {
  const coverRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  return (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="Dla pacjenta | Poradniki przed i po zabiegu | CML"
      description="E-booki, checklisty i poradniki CML: jak przygotować się do wizyty, jak przebiega zabieg i jak wygląda rekonwalescencja. Wejdź na wizytę przygotowany."
      path="/dla-pacjenta"
    />
    {/* Hero */}
    <ParallaxSection className="gradient-bg py-16 md:py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto text-center"
      >
        <div className="text-5xl mb-6">📚</div>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Strefa Pacjenta
        </h1>
        <p className="text-xl md:text-2xl font-semibold text-primary-foreground/90 mb-4">
          Wiedza, która daje spokój
        </p>
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Zanim wejdziesz do gabinetu, przeczytaj nasze autorskie materiały. Zrozumiesz problem, poznasz metody leczenia i będziesz wiedział dokładnie, czego się spodziewać.
        </p>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-20">
      <Breadcrumbs items={BREADCRUMBS_MAP["/dla-pacjenta"]} className="mb-4" />
      {/* Benefits */}
      <motion.section {...fadeUp}>
        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mx-auto mb-4">
                <b.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Featured: Quiz CTA — wyraźnie wyeksponowany na samej górze */}
      <motion.section {...fadeUp}>
        <Link
          to="/dla-pacjenta/quiz-hemoroidy"
          className="group block glass-card rounded-2xl p-6 md:p-8 border border-primary/30 hover:border-primary/60 transition-all relative overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-sans uppercase tracking-[0.18em] text-primary mb-1.5">
                Nowość · Interaktywny test
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                Sprawdź swoje ryzyko hemoroidów w 1 minutę
              </h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                9 pytań o styl życia · 3 poziomy ryzyka · dopasowane zalecenia EBM i checklista PDF do pobrania.
              </p>
            </div>
            <Button variant="hero" size="lg" className="shrink-0 w-full md:w-auto pointer-events-none">
              Wypełnij test
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </Link>

        {/* Sekundarny link — bibliografia EBM */}
        <Link
          to="/dla-pacjenta/ebm-hemoroidy"
          className="group mt-4 flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors justify-center"
        >
          <BookMarked className="w-4 h-4" />
          <span>
            Wolisz najpierw przeczytać badania? Zobacz <strong>kompendium EBM hemoroidy</strong>
          </span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.section>

      {/* Main E-book (PDF download) */}
      <section className="space-y-10">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">E-book do pobrania</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Darmowy e-book Dr Bujoka
          </h2>
          <div className="premium-divider mb-6" />
        </motion.div>

        <motion.div
          {...fadeUp}
          className="glass-card rounded-2xl p-8 md:p-10"
        >
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div ref={coverRef} className="w-48 md:w-56 shrink-0 mx-auto md:mx-0" style={{ perspective: "800px" }}>
              {isMobile ? (
                <img
                  src={ebookCoverImg}
                  alt="Okładka e-booka CML — Powrót do Komfortu"
                  className="w-full rounded-xl shadow-xl ring-1 ring-primary/20"
                  loading="lazy"
                  width={640}
                  height={896}
                />
              ) : (
                <motion.img
                  src={ebookCoverImg}
                  alt="Okładka e-booka CML — Powrót do Komfortu"
                  className="w-full rounded-xl shadow-xl ring-1 ring-primary/20 cursor-pointer"
                  style={{ transformOrigin: "left center" }}
                  whileHover={{ rotateY: -15, scale: 1.05, boxShadow: "12px 12px 30px rgba(0,0,0,0.25)" }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  loading="lazy"
                  width={640}
                  height={896}
                />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-2">{mainEbook.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-4 text-sm">{mainEbook.desc}</p>
              <div className="mb-5">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  <FileText className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
                  Spis treści:
                </p>
                <ul className="space-y-1.5">
                  {mainEbook.chapters.map((ch, i) => (
                    <StaggeredListItem key={ch} index={i} icon={<span className="text-primary mt-1">•</span>} className="text-sm text-muted-foreground flex gap-2">
                      {ch}
                    </StaggeredListItem>
                  ))}
                </ul>
              </div>
              <Button variant="hero" size="lg" asChild>
                <a href={mainEbook.href} download>
                  <Download className="w-4 h-4 mr-2" />
                  Pobierz bezpłatnie (PDF)
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Kompendium Wiedzy Pacjenta */}
      <section className="space-y-8">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">Czytaj online</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Kompendium Wiedzy Pacjenta
          </h2>
          <div className="premium-divider mb-6" />
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Przewodniki dostępne bezpośrednio na stronie — bez pobierania, w każdej chwili i na każdym urządzeniu.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {onlineGuides.map((guide, i) => (
            <motion.div
              key={guide.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link
                to={guide.href}
                className="glass-card rounded-xl p-6 flex gap-5 items-start group hover:border-primary/30 transition-colors duration-300 block h-full"
              >
                <span className="text-3xl shrink-0">{guide.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground mb-0.5 group-hover:text-primary transition-colors font-sans">
                    {guide.title}
                  </h3>
                  <p className="text-[11px] uppercase tracking-widest text-primary/60 mb-2 font-sans">
                    {guide.subtitle}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{guide.desc}</p>
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    Czytaj na stronie
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>



      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🩺</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Gotowy na konsultację?</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Przeczytałeś przewodniki i masz pytania? Umów się na niezobowiązującą konsultację kwalifikacyjną. Lekarz oceni stopień zaawansowania i zaproponuje najlepszą metodę leczenia.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów się na konsultację</a>
        </Button>
      </motion.section>
    </div>
  </div>
  );
};

export default DlaPacjenta;
