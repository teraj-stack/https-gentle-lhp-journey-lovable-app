import { motion } from "framer-motion";
import { BookOpen, Download, FileText, Shield, Clock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const ebooks = [
  {
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
  },
  {
    title: "Hemoroidy od A do Z — Infografika",
    pages: "11 stron",
    desc: "Wizualna podróż od objawów do decyzji. Infografika porównawcza skalpel vs. laser, oś czasu zabiegu, syndrom cichego obserwatora i kluczowe liczby, które pomogą Ci podjąć decyzję.",
    chapters: [
      "Hemoroidy: naturalne poduszki, które wymknęły się spod kontroli",
      "Syndrom Cichego Obserwatora — poszukiwanie w internecie",
      "Błędne koło apteki — skuteczność maści w czasie",
      "Skalpel vs. Laser — porównanie bólu i rekonwalescencji",
      "Czas działa na Twoją niekorzyść — skala I°–IV°",
    ],
    href: "/ebooks/Hemoroidy-od-A-do-Z-Infografika.pdf",
    color: "from-accent-foreground/80 to-accent-foreground",
  },
];

const benefits = [
  { icon: Shield, title: "Pełna dyskrecja", desc: "Materiały do przeczytania w domu, w bezpiecznej przestrzeni, bez pośpiechu." },
  { icon: Clock, title: "Przygotowanie do wizyty", desc: "Wchodzisz do gabinetu spokojny i wyedukowany. Lekarz poświęca 100% uwagi Twoim potrzebom." },
  { icon: Heart, title: "Bez medycznego żargonu", desc: "Przewodniki napisane prostym językiem, z empatią i zrozumieniem Twojej sytuacji." },
];

const DlaPacjenta = () => (
  <div className="min-h-screen bg-background pt-20">
    {/* Hero */}
    <section className="gradient-bg py-16 md:py-24 px-4">
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
    </section>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-20">
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

      {/* E-books */}
      <section className="space-y-10">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">Materiały do pobrania</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Darmowe e-booki Dr. Bujoka
          </h2>
          <div className="premium-divider mb-6" />
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Każdy pacjent CML otrzymuje dostęp do autorskich przewodników. Pobierz, przeczytaj i wróć z pytaniami — jesteśmy tu, by na nie odpowiedzieć.
          </p>
        </motion.div>

        {ebooks.map((ebook, i) => (
          <motion.div
            key={ebook.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.15 }}
            className="glass-card rounded-2xl p-8 md:p-10"
          >
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-32 md:w-40 shrink-0 mx-auto md:mx-0">
                <div className={`aspect-[3/4] rounded-xl bg-gradient-to-br ${ebook.color} shadow-xl flex flex-col items-center justify-center p-4 text-primary-foreground`}>
                  <BookOpen className="w-8 h-8 mb-3 opacity-80" />
                  <p className="text-[10px] uppercase tracking-[0.15em] opacity-60 mb-1 font-sans">CML</p>
                  <h3 className="text-[11px] font-bold text-center leading-snug font-serif">
                    {ebook.title.split("—")[0].trim()}
                  </h3>
                  <div className="w-8 h-px bg-primary-foreground/30 my-2" />
                  <p className="text-[9px] text-center opacity-70 font-sans">{ebook.pages}</p>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-2">{ebook.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-4 text-sm">{ebook.desc}</p>
                <div className="mb-5">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                    <FileText className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
                    Spis treści:
                  </p>
                  <ul className="space-y-1.5">
                    {ebook.chapters.map((ch) => (
                      <li key={ch} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary mt-1">•</span>
                        {ch}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="hero" size="lg" asChild>
                  <a href={ebook.href} download>
                    <Download className="w-4 h-4 mr-2" />
                    Pobierz bezpłatnie (PDF)
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🩺</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Gotowy na konsultację?</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Przeczytałeś przewodniki i masz pytania? Umów się na niezobowiązującą konsultację kwalifikacyjną. Lekarz oceni stopień zaawansowania i zaproponuje najlepszą metodę leczenia.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="hero" size="lg" asChild>
            <Link to="/kontakt">Umów konsultację</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/leczenie/lhp">Dowiedz się o zabiegu LHP</Link>
          </Button>
        </div>
      </motion.section>
    </div>
  </div>
);

export default DlaPacjenta;
