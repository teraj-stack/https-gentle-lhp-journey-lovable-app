import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import AnatomyDiagram from "@/components/pajaczki/AnatomyDiagram";
import VeinAnatomyImage from "@/components/shared/VeinAnatomyImage";
import PajaczkiTestimonials from "@/components/pajaczki/PajaczkiTestimonials";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import RelatedLinks from "@/components/shared/RelatedLinks";

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const myths = [
  { myth: "Krem usunie pajączki", truth: "Żaden kosmetyk nie przeniknie pod skórę i fizycznie nie zamknie uszkodzonego naczynia." },
  { myth: "To tylko defekt kosmetyczny", truth: "Pajączki to często pierwszy sygnał Przewlekłej Niewydolności Żylnej (PNŻ) — problemu, który postępuje." },
  { myth: "Laser u kosmetyczki wystarczy", truth: "Powierzchowne zabiegi ignorują żyłę zasilającą ('gałąź') — problem szybko wraca." },
];

const causes = [
  { emoji: "🧬", title: "Genetyka", desc: "Jeśli mama lub babcia miały pajączki, prawdopodobnie odziedziczyłaś predyspozycje do słabszej tkanki łącznej ścian żył." },
  { emoji: "🤰", title: "Hormony i ciąże", desc: "Kobieca gospodarka hormonalna mocno wpływa na rozszerzanie się żył. Ciąże to ogromny wysiłek dla układu krążenia." },
  { emoji: "💼", title: "Styl życia i pracy", desc: "Godziny w pozycji siedzącej — krew musi pokonać grawitację, a najdrobniejsze naczynka nie wytrzymują ciśnienia." },
];

const clacsSteps = [
  { num: "01", title: "Laser barwnikowy", desc: "Specjalistyczny laser obkurcza i zwęża ścianę naczynia od wewnątrz, nie naruszając skóry." },
  { num: "02", title: "Skleroterapia", desc: "W zwężone laserem naczynie wprowadzamy ułamek standardowej dawki preparatu zamykającego — potężna synergia." },
  { num: "03", title: "Fototerapia relaksacyjna", desc: "Ciepłe światło medyczne wycisza stan zapalny, łagodzi tkanki i przyspiesza wchłanianie zasinień." },
  { num: "04", title: "Autorski krem", desc: "Naturalny krem stworzony na zamówienie — uszczelnia, nawilża i wspomaga gojenie naczynek w domu." },
];

const Pajaczki = () => (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="Pajączki naczyniowe | Przyczyny i leczenie | CML Wilanów"
      description="Dlaczego powstają pajączki naczyniowe, jak wygląda diagnostyka i które metody działają: skleroterapia i CLaCS. Poradnik flebologów CML Warszawa Wilanów."
      path="/dla-pacjenta/pajaczki"
    />
    <MedicalWebPageSchema
      name="Pajączki naczyniowe – przyczyny i leczenie"
      description="Wszystko o pajączkach naczyniowych: przyczyny, diagnostyka i nowoczesne metody leczenia laserowego."
      path="/dla-pacjenta/pajaczki"
      specialty="Phlebology"
    />
    {/* Hero */}
    <ParallaxSection className="gradient-bg py-16 md:py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mx-auto text-center"
      >
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary-foreground/60 mb-4">
          Dla Pacjentki
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Odzyskaj beztroskę
        </h1>
        <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Prawda o pajączkach, ukrytym ryzyku i najskuteczniejszej metodzie leczenia. Przewodnik dla kobiet, które mają dość ukrywania nóg.
        </p>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={BREADCRUMBS_MAP["/dla-pacjenta/pajaczki"]} className="mb-4" />

      {/* Intro */}
      <motion.section {...fadeUp} className="max-w-3xl mx-auto">
        <div className="glass-card rounded-2xl p-8 md:p-10">
          <p className="text-foreground/90 leading-relaxed text-base md:text-lg">
            Wyobraź sobie ciepły, letni poranek. Pakujesz walizkę na upragniony urlop. Patrzysz na tę piękną, zwiewną sukienkę… i z ciężkim westchnieniem odkładasz ją z powrotem do szafy. Zamiast niej wyciągasz sprawdzone, długie lniane spodnie.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Jeśli ten scenariusz brzmi znajomo, ten przewodnik jest właśnie dla Ciebie. Wiele z nas żyje z pajączkami latami, spychając swoje potrzeby na dalszy plan. Czas z tym skończyć.
          </p>
        </div>
      </motion.section>

      {/* Przyczyny */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Skąd one się wzięły?</h2>
        <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
          Zdejmij z siebie poczucie winy — pajączki (teleangiektazje) nie są wynikiem Twojego zaniedbania.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {causes.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="glass-card rounded-2xl p-6 text-center"
            >
              <div className="text-4xl mb-4">{c.emoji}</div>
              <h3 className="font-bold text-foreground text-base mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Anatomia pajączka — statyczny schemat z opisanymi warstwami */}
      <VeinAnatomyImage fadeUp={fadeUp} />

      {/* Anatomia pajączka — interaktywny diagram z hotspotami */}
      <AnatomyDiagram fadeUp={fadeUp} />

      {/* Pułapka kamuflażu */}
      <motion.section {...fadeUp} className="max-w-3xl mx-auto">
        <h2 className="section-title mb-3 text-center">Pułapka kamuflażu</h2>
        <p className="section-subtitle mb-8 text-center">
          Dlaczego ukrywanie pajączków bywa niebezpieczne?
        </p>
        <div className="glass-card rounded-2xl p-8 md:p-10 space-y-4">
          <p className="text-foreground/90 leading-relaxed">
            Wyobraź sobie, że w Twoim samochodzie zapala się czerwona kontrolka awarii silnika, a Ty… <strong className="text-primary">zaklejasz ją plastrem</strong>. Samochód nadal jedzie, ale problem pod maską rośnie z każdym kilometrem.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Pajączki to bardzo często pierwszy, widoczny sygnał <strong className="text-foreground">Przewlekłej Niewydolności Żylnej (PNŻ)</strong>. Ukrywając je, usypiasz swoją czujność. Z upływem lat może to prowadzić do ciężkich nóg, bolesnych obrzęków, a ostatecznie — do dużych, wypukłych żylaków.
          </p>
          <div className="border-l-2 border-primary/40 pl-5 mt-4">
            <p className="text-foreground/80 text-sm italic leading-relaxed">
              Decyzja o wizycie w klinice to nie egoizm czy próżność. To odpowiedzialny, profilaktyczny krok w kierunku Twojego zdrowia. Zajmując się problemem estetycznym, dajesz lekarzowi szansę na zbadanie Twoich żył (USG Doppler) i uchronienie Cię przed poważną chorobą.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Obalamy mity */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Obalamy mity</h2>
        <p className="section-subtitle mb-10 text-center">
          Skuteczne i trwałe zamykanie naczynek nie jest proste — oto dlaczego.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {myths.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-destructive/80 mb-2">MIT</div>
              <p className="text-foreground font-bold text-sm mb-3">„{m.myth}"</p>
              <div className="w-8 h-px bg-primary/30 mb-3" />
              <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">PRAWDA</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.truth}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CLaCS — złoty standard */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Złoty Standard — Metoda CLaCS</h2>
        <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
          Cryo-Laser and Cryo-Sclerotherapy — bezkompromisowe podejście, które uderza w naczynko z podwójną siłą podczas jednej sesji.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          {clacsSteps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass-card rounded-2xl p-6 flex gap-5 items-start"
            >
              <div className="text-3xl font-bold text-primary/30 shrink-0 font-serif">{s.num}</div>
              <div>
                <h4 className="font-bold text-foreground text-sm mb-1">{s.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Twoja transformacja */}
      <motion.section {...fadeUp} className="max-w-3xl mx-auto">
        <h2 className="section-title mb-3 text-center">Twoja transformacja</h2>
        <div className="glass-card rounded-2xl p-8 md:p-10 space-y-4">
          <p className="text-foreground/90 leading-relaxed">
            Wyobraź sobie poranek za kilka tygodni. Pakujesz walizkę na wyjazd. Nie zastanawiasz się „co założyć, żeby ukryć problem". Wyciągasz z szafy ulubioną letnią sukienkę, zakładasz ją i <strong className="text-primary">uśmiechasz się do lustra</strong>.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Na plaży nie szukasz nerwowo pareo. Czujesz w głowie absolutną, wspaniałą lekkość i spokój ducha, bo wiesz, że Twoje żyły zostały zbadane i są bezpieczne.
          </p>
          <p className="text-foreground/80 leading-relaxed font-medium">
            Po latach dbania o dom, pracę i bliskich, przyszedł czas, byś zainwestowała wyłącznie w swój komfort i zdrowie.
          </p>
        </div>
      </motion.section>

      {/* Opinie pacjentek */}
      <PajaczkiTestimonials />


      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">✨</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Jesteś gotowa na swoje pierwsze lato bez długich spodni?</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Umów się na diagnostykę USG Doppler oraz kwalifikację do zabiegu CLaCS. Resztą — od profesjonalnego leczenia po relaksującą fototerapię i kojący krem — zajmiemy się my.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="hero" size="lg" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów konsultację</a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/leczenie/clacs">
              Dowiedz się o zabiegu CLaCS
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </motion.section>
    </div>
      <RelatedLinks path="/dla-pacjenta/pajaczki" />

  </div>
);

export default Pajaczki;
