import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Award, Heart, Users, ArrowRight, BookOpen, Stethoscope, Activity, Star, CheckCircle2 } from "lucide-react";
import drBujokImg from "@/assets/dr-bujok.jpg";

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

/* ─── Section 1: Hero ─── */
const HeroHome = () => (
  <section className="relative min-h-[90vh] flex items-center gradient-hero overflow-hidden">
    {/* Organic shapes */}
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      <div className="absolute -bottom-1/3 -left-1/4 w-[50vw] h-[50vw] rounded-full bg-primary-foreground/3 blur-3xl" />
    </div>

    <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-32 md:py-40">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="max-w-3xl"
      >
        <p className="text-primary-foreground/60 text-sm font-sans uppercase tracking-[0.2em] mb-6">
          Centrum Medycyny Laserowej
        </p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-6">
          Nowy standard w proktologii i&nbsp;flebologii
        </h1>
        <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed max-w-2xl mb-10">
          Innowacyjne leczenie laserowe w klinikach premium. Nie sprzedajemy technologii — zapewniamy kompleksową opiekę, w której jesteś naszym świadomym partnerem.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <Link to="/kontakt">Umów Konsultację</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-6 text-base border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            asChild
          >
            <Link to="/o-nas">
              Poznaj metodę CML
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

/* ─── Section 2: Trust Bar ─── */
const trustItems = [
  { icon: Shield, label: "Certyfikowane systemy laserowe", sub: "ELVeS · FiLaC · SiLaC" },
  { icon: Award, label: "Kliniki premium", sub: "Warszawa Wilanów · Siedlce" },
  { icon: Star, label: "Zweryfikowane opinie", sub: "4.9/5 – Google & ZnanyLekarz" },
  { icon: Users, label: "Doświadczony zespół", sub: "Szkolenia autorskie dla lekarzy" },
];

const TrustBar = () => (
  <section className="py-10 border-b border-border bg-card">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {trustItems.map((item, i) => (
          <motion.div key={item.label} {...stagger(i)} className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Section 3: Philosophy ─── */
const Philosophy = () => (
  <section className="py-20 md:py-28" style={{ background: "var(--gradient-warm)" }}>
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div {...fadeUp}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Nasza Filozofia</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Pacjent jako Świadomy Partner
          </h2>
          <div className="premium-divider !mx-0 mb-8" />
          <p className="text-muted-foreground leading-relaxed mb-6">
            W naszym centrum nie sprzedajemy wyłącznie zaawansowanej technologii laserowej. Dostarczamy kompleksową opiekę, w której każdy pacjent staje się aktywnym, wyedukowanym partnerem w procesie leczenia.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Przed pierwszą wizytą każdy pacjent otrzymuje nasz autorski <strong className="text-foreground">Przewodnik Przygotowawczy</strong> — dedykowany e-book edukacyjny. Dzięki temu wchodzisz do gabinetu spokojny, doskonale rozumiejąc cały proces. Lekarz może skupić się wyłącznie na Twoich indywidualnych potrzebach, bez marnowania czasu na powtarzalne wyjaśnienia.
          </p>
          <ul className="space-y-3 mb-8">
            {[
              "Wchodzisz do gabinetu spokojny i przygotowany",
              "Lekarz poświęca 100% uwagi Twoim potrzebom",
              "Budujesz partnerską relację z zespołem medycznym",
            ].map((text) => (
              <li key={text} className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                {text}
              </li>
            ))}
          </ul>
          <Button variant="outline" asChild>
            <Link to="/dla-pacjenta">
              Dowiedz się więcej o programie
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </motion.div>

        {/* E-book mockup */}
        <motion.div {...fadeUp} className="flex justify-center">
          <div className="relative">
            <div className="w-64 md:w-72 aspect-[3/4] rounded-2xl bg-gradient-to-br from-primary/90 to-primary shadow-2xl flex flex-col items-center justify-center p-8 text-primary-foreground">
              <BookOpen className="w-12 h-12 mb-6 opacity-80" />
              <p className="text-xs uppercase tracking-[0.15em] opacity-60 mb-2 font-sans">CML</p>
              <h3 className="text-lg font-bold text-center leading-snug font-serif">
                Kompleksowy Przewodnik Pacjenta
              </h3>
              <div className="w-10 h-px bg-primary-foreground/30 my-4" />
              <p className="text-xs text-center opacity-70 font-sans">
                Nowoczesna Proktologia Laserowa
              </p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-64 md:w-72 aspect-[3/4] rounded-2xl bg-primary/20 -z-10" />
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

/* ─── Section 4: Service Cards ─── */
const services = [
  {
    icon: Stethoscope,
    title: "Proktologia Laserowa",
    desc: "Bezbolesne leczenie hemoroidów, przetok i torbieli pilonidalnej. Bez cięć, bez szwów — powrót do domu tego samego dnia.",
    treatments: ["LHP – Hemoroidy", "FiLaC – Przetoki", "SiLaC – Torbiel pilonidalna", "Szczelina odbytu"],
    cta: "Sprawdź metody leczenia",
    href: "/leczenie/lhp",
  },
  {
    icon: Activity,
    title: "Flebologia Laserowa",
    desc: "Nowoczesne leczenie żylaków i pajączków naczyniowych. Precyzyjne zabiegi zamykające żyły bez tradycyjnej chirurgii.",
    treatments: ["EVLT – Ablacja żylaków", "Klejenie żył", "Skleroterapia pajączków"],
    cta: "Poznaj rozwiązania naczyniowe",
    href: "/leczenie/evlt",
  },
];

const ServiceCards = () => (
  <section className="py-20 md:py-28">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <motion.div {...fadeUp} className="text-center mb-14">
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Specjalizacje</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Zaawansowane leczenie laserowe</h2>
        <div className="premium-divider mb-6" />
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Łączymy najnowsze technologie z indywidualnym podejściem do każdego pacjenta. Wszystkie zabiegi wykonujemy w klinikach klasy premium.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        {services.map((s, i) => (
          <motion.div
            key={s.title}
            {...stagger(i)}
            className="glass-card p-8 md:p-10 rounded-2xl hover:shadow-lg transition-shadow group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-6">
              <s.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3 font-serif">{s.title}</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">{s.desc}</p>
            <ul className="space-y-2 mb-8">
              {s.treatments.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="group-hover:border-primary group-hover:text-primary transition-colors" asChild>
              <Link to={s.href}>
                {s.cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Section 5: Doctor ─── */
const DoctorSection = () => (
  <section className="py-20 md:py-28 bg-card">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Photo placeholder */}
        <motion.div {...fadeUp} className="flex justify-center lg:order-2">
          <div className="relative">
            <img
              src={drBujokImg}
              alt="Dr Jan Bujok – chirurg, proktolog, flebolog"
              className="w-72 md:w-80 aspect-[3/4] rounded-2xl object-cover shadow-2xl"
            />
            <div className="absolute -bottom-4 -right-4 w-72 md:w-80 aspect-[3/4] rounded-2xl bg-primary/20 -z-10" />
          </div>
        </motion.div>

        <motion.div {...fadeUp}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Założyciel CML</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Dr Jan Bujok
          </h2>
          <div className="premium-divider !mx-0 mb-8" />
          <p className="text-muted-foreground leading-relaxed mb-4">
            Wizjoner i twórca Mazowieckiego Centrum Proktologii Laserowej. Wieloletnie doświadczenie w zaawansowanej chirurgii laserowej połączył z głębokim zrozumieniem psychologii pacjenta, budując zupełnie nowy model opieki proktologicznej w Polsce.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Dr Bujok nie tylko operuje — prowadzi autorskie szkolenia dla chirurgów i personelu pielęgniarskiego z całego kraju, systematycznie podnosząc standardy polskiej proktologii. Jego filozofia opiera się na przekonaniu, że najlepsza technologia laserowa jest bezwartościowa bez empatii i partnerskiej relacji z pacjentem.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { num: "15+", label: "lat doświadczenia" },
              { num: "3000+", label: "zabiegów laserowych" },
              { num: "100+", label: "przeszkolonych lekarzy" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-accent/50">
                <p className="text-2xl font-bold text-primary font-serif">{stat.num}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" asChild>
            <Link to="/o-nas">
              Poznaj cały zespół
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  </section>
);

/* ─── Section 6: B2B ─── */
const B2BSection = () => (
  <section className="py-20 md:py-28" style={{ background: "var(--gradient-warm)" }}>
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div {...fadeUp}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Dla Lekarzy i Klinik</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Zbuduj z nami nowy standard polskiej proktologii
          </h2>
          <div className="premium-divider mb-8" />
          <p className="text-muted-foreground leading-relaxed mb-10">
            Skaluj swoją praktykę lub placówkę medyczną w modelu premium. Zapewniamy kompletne szkolenia autorskie, środowisko wolne od biurokracji i gotowy model operacyjny sprawdzony na rynku.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: BookOpen,
              title: "Darmowe szkolenia",
              desc: "Kompletne szkolenia autorskie dla lekarzy i pielęgniarek. Zero bariery wejścia.",
            },
            {
              icon: Heart,
              title: "Bez biurokracji",
              desc: "Skupiasz się na pacjentach. Wszystko inne leży po naszej stronie.",
            },
            {
              icon: Award,
              title: "Prestiż premium",
              desc: "Dołączasz do sieci klinik wyznaczających najwyższe standardy w kraju.",
            },
          ].map((item, i) => (
            <motion.div key={item.title} {...stagger(i)} className="glass-card p-6 rounded-2xl text-center">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2 font-sans text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp}>
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <Link to="/wspolpraca">
              Umów 15-minutową wirtualną kawę
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Niezobowiązująca rozmowa z dr. Janem Bujokiem
          </p>
        </motion.div>
      </div>
    </div>
  </section>
);

/* ─── Section 7: FAQ Teaser ─── */
const FAQTeaser = () => {
  const faqs = [
    { q: "Ile trwa rekonwalescencja po zabiegu laserowym?", a: "Większość pacjentów wraca do codziennej aktywności w ciągu 1-3 dni. Do pracy biurowej można wrócić zazwyczaj po 4-5 dniach." },
    { q: "Czy zabieg laserowy jest bolesny?", a: "Zabiegi wykonujemy w znieczuleniu miejscowym. Pacjenci opisują odczucia jako minimalne i znacznie łagodniejsze niż w przypadku tradycyjnych metod." },
    { q: "Dlaczego muszę przeczytać e-book przed wizytą?", a: "Autorski przewodnik przygotowuje Cię do wizyty, redukuje stres i pozwala lekarzowi skupić się wyłącznie na Twoich indywidualnych potrzebach — nie na powtarzaniu podstaw." },
  ];

  return (
    <section className="py-20 md:py-28 bg-card">
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <motion.div {...fadeUp} className="text-center mb-12">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Najczęstsze pytania</h2>
          <div className="premium-divider" />
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.details
              key={i}
              {...stagger(i)}
              className="glass-card rounded-xl group"
            >
              <summary className="flex items-center justify-between p-5 cursor-pointer text-sm font-semibold text-foreground hover:text-primary transition-colors list-none font-sans">
                {faq.q}
                <span className="ml-4 text-muted-foreground group-open:rotate-45 transition-transform text-lg">+</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                {faq.a}
              </div>
            </motion.details>
          ))}
        </div>

        <motion.div {...fadeUp} className="text-center mt-10">
          <Button variant="outline" asChild>
            <Link to="/dla-pacjenta">
              Więcej pytań i odpowiedzi
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

/* ─── Homepage ─── */
const Home = () => (
  <div className="min-h-screen">
    <HeroHome />
    <TrustBar />
    <Philosophy />
    <ServiceCards />
    <DoctorSection />
    <B2BSection />
    <FAQTeaser />
  </div>
);

export default Home;
