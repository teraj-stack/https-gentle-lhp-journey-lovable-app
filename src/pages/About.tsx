import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Award, Heart, Sparkles, BookOpen, Users } from "lucide-react";
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

const About = () => (
  <div className="min-h-screen pt-20">
    {/* Hero */}
    <section className="relative py-20 md:py-28 gradient-hero overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-background/40" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="max-w-3xl"
        >
          <p className="text-primary-foreground/60 text-sm font-sans uppercase tracking-[0.2em] mb-6">
            O Nas
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-[1.1] mb-6">
            Pasja, Technologia, Misja
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed max-w-2xl">
            Centrum Medycyny Laserowej to zespół specjalistów, dla których medycyna to przede wszystkim misja niesienia ulgi i poprawy jakości życia pacjentów.
          </p>
        </motion.div>
      </div>
    </section>

    {/* Doctor Section */}
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div {...fadeUp} className="flex justify-center lg:sticky lg:top-28">
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 leading-tight">
              Dr Jan Bujok
            </h2>
            <p className="text-lg text-muted-foreground mb-6 font-serif italic">
              Chirurg ogólny · Proktolog · Flebolog
            </p>
            <div className="premium-divider !mx-0 mb-8" />

            <div className="space-y-5 text-muted-foreground leading-relaxed">
              <p>
                Pionier w swojej dziedzinie – jako <strong className="text-foreground">pierwszy lekarz w Polsce</strong> zaczął wykonywać zabiegi z zakresu proktologii estetycznej, przełamując tabu i wprowadzając nowe standardy dbałości o intymny komfort pacjentów.
              </p>
              <p>
                W swojej praktyce odchodzi od rutyny, stawiając na innowacyjne terapie hybrydowe. Łączy najnowocześniejsze technologie — laseroterapię, radiofrekwencję, CLaCS — z precyzyjną diagnostyką, co pozwala mu osiągać spektakularne efekty lecznicze przy jednoczesnym zachowaniu doskonałych rezultatów estetycznych.
              </p>
              <p>
                Specjalizuje się w małoinwazyjnym leczeniu hemoroidów, szczelin, przetok oraz zaawansowanych problemów żylnych.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 my-8">
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
          </motion.div>
        </div>
      </div>
    </section>

    {/* Philosophy pillars */}
    <section className="py-20 md:py-28" style={{ background: "var(--gradient-warm)" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeUp} className="text-center mb-14">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Nasza Filozofia</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Trzy filary CML</h2>
          <div className="premium-divider" />
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: CheckCircle2,
              title: "Skuteczność",
              desc: "Stosujemy najnowocześniejsze technologie laserowe i metody hybrydowe. Każdy zabieg jest precyzyjnie dobrany do indywidualnych potrzeb pacjenta, by osiągnąć maksymalny efekt leczniczy.",
            },
            {
              icon: Heart,
              title: "Empatia",
              desc: "Dla nas pacjent nie jest przypadkiem medycznym, ale człowiekiem potrzebującym holistycznego wsparcia. W gabinecie stawiamy na czas, uwagę i szczerą rozmowę.",
            },
            {
              icon: Award,
              title: "Zaufanie",
              desc: "Budujemy partnerską relację z każdym pacjentem. Nasz autorski Przewodnik Przygotowawczy sprawia, że wchodzisz do gabinetu spokojny, świadomy i przygotowany.",
            },
          ].map((item, i) => (
            <motion.div key={item.title} {...stagger(i)} className="glass-card p-8 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-6">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 font-serif">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Holistyczne podejście */}
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeUp}>
            <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Holistyczne Podejście</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
              Medycyna Stylu Życia
            </h2>
            <div className="premium-divider !mx-0 mb-8" />
            <p className="text-muted-foreground leading-relaxed mb-6">
              Dr Bujok wyznaje zasadę, że skuteczna terapia zaczyna się od starannej diagnostyki (USG Doppler, anoskopia) i kończy na zmianie nawyków. Jako pasjonat Medycyny Stylu Życia, inspiruje pacjentów do dbania o zdrowie w wymiarze fizycznym i społecznym.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Precyzyjna diagnostyka (USG Doppler, anoskopia)",
                "Innowacyjne terapie hybrydowe — laser, radiofrekwencja, CLaCS",
                "Proktologia estetyczna — pionierska w Polsce",
                "Edukacja pacjenta i zmiana nawyków zdrowotnych",
              ].map((text) => (
                <li key={text} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  {text}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div {...fadeUp} className="grid grid-cols-2 gap-4">
            {[
              { icon: Sparkles, title: "Proktologia Estetyczna", desc: "Pierwszy w Polsce" },
              { icon: BookOpen, title: "Edukacja Pacjenta", desc: "Autorski e-book" },
              { icon: Users, title: "Szkolenia Lekarzy", desc: "100+ przeszkolonych" },
              { icon: Award, title: "Kliniki Premium", desc: "Wilanów · Siedlce" },
            ].map((item, i) => (
              <motion.div key={item.title} {...stagger(i)} className="glass-card p-6 rounded-2xl text-center">
                <item.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 md:py-28 bg-card">
      <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Poznaj nas osobiście
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-10">
            W gabinecie każdy pacjent otrzymuje czas, uwagę i poczucie bezpieczeństwa. Umów konsultację i przekonaj się, czym jest prawdziwie partnerska opieka medyczna.
          </p>
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <Link to="/kontakt">
              Umów Konsultację
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  </div>
);

export default About;
