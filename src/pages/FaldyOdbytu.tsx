import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { ArrowRight, CheckCircle2, HelpCircle, AlertTriangle, Heart, Eye, ShieldCheck } from "lucide-react";
import { StaggeredListItem } from "@/components/shared/StaggeredList";
import ParallaxSection from "@/components/ui/parallax-section";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";

import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import FaldyFAQ from "@/components/faldy/FaldyFAQ";
import RelatedLinks from "@/components/shared/RelatedLinks";

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.12 },
});

const FaldyOdbytu = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="Fałdy okolicy odbytu | Norma czy wskazanie do zabiegu"
      description="Fałdy brzeżne odbytu: skąd się biorą, kiedy są wariantem anatomii, a kiedy warto je usunąć. Rzetelna wiedza bez oceniania — poradnik CML Warszawa. Zapraszamy."
      path="/dla-pacjenta/faldy-odbytu"
    />
    <MedicalWebPageSchema
      name="Fałdy okolicy odbytu – wariant anatomiczny czy powód kompleksów?"
      description="Fałdy brzeżne odbytu: czym są, skąd się biorą i kiedy warto skonsultować się z proktologiem."
      path="/dla-pacjenta/faldy-odbytu"
      specialty="Proctology"
    />

    {/* Hero */}
    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-3xl">
          <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">Proktologia &middot; Edukacja Pacjenta</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-6">
            Fałdy okolicy odbytu
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
            Wariant anatomiczny czy rzeczywisty powód kompleksów? Wyjaśniamy bez oceniania — żebyś mógł/mogła podjąć świadomą decyzję.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów dyskretną konsultację</a>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    {/* Metrics */}
    <section className="py-10 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Eye, label: "Częsty objaw", sub: "Dotyczy nawet 30% dorosłych" },
            { icon: ShieldCheck, label: "Nieszkodliwe", sub: "Nie są stanem chorobowym" },
            { icon: Heart, label: "Pełna dyskrecja", sub: "Intymny temat traktujemy poważnie" },
            { icon: HelpCircle, label: "Warto wiedzieć", sub: "Wiedza pomaga podjąć decyzję" },
          ].map((item, i) => (
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

    <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 space-y-20">
      <Breadcrumbs items={BREADCRUMBS_MAP["/dla-pacjenta/faldy-odbytu"]} className="mb-4" />

      {/* Czym są fałdy */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Czym właściwie są fałdy brzeżne?
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Fałdy brzeżne (łac. <em>plicae perianales</em>, ang. <em>skin tags</em>) to niewielkie, miękkie wypustki lub naddatki skóry zlokalizowane na zewnętrznym brzegu kanału odbytu. Mają charakter łagodny i nie stanowią stanu chorobowego — nie wymagają leczenia z przyczyn medycznych.
          </p>
          <p>
            W praktyce klinicznej spotykamy je niezwykle często. Szacuje się, że występują u nawet 30% populacji dorosłych, choć rzeczywista częstość może być jeszcze wyższa — wiele osób po prostu o nich nie wie.
          </p>
        </div>
      </motion.section>

      {/* Przyczyny */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Skąd się biorą?
        </h2>
        <div className="glass-card p-8 rounded-2xl">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Ciąża i poród", desc: "Gwałtowne rozciągnięcie tkanek miednicy mniejszej i okolicy odbytu. Po ustąpieniu obrzęku skóra nie wraca do pierwotnego kształtu." },
              { title: "Przebyta zakrzepica brzeżna", desc: 'Po wchłonięciu się skrzepu zewnętrznego hemoroidu pozostaje \u201Epusty worek\u201D skóry \u2014 fałd brzeżny.' },
              { title: "Przewlekłe zaparcia i parcie", desc: "Wieloletnie nadmierne napinanie podczas wypróżnień stopniowo rozciąga skórę okolicy odbytu." },
              { title: "Choroba Leśniowskiego-Crohna", desc: "W przebiegu tej choroby zapalnej jelit mogą pojawiać się charakterystyczne, obrzęknięte fałdy, tzw. elephant ears." },
              { title: "Wariant anatomiczny", desc: "U części osób fałdy obecne są od urodzenia lub pojawiają się w okresie dojrzewania — bez żadnej uchwytnej przyczyny." },
              { title: "Po zabiegach proktologicznych", desc: "Gojenie ran w okolicy odbytu może prowadzić do powstania bliznowatych lub przerostowych fałdów skórnych." },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Wariant anatomiczny vs problem */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Wariant anatomiczny czy problem?
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            To pytanie, z którym mierzy się wielu naszych pacjentów. Odpowiedź jest niuansowa: <strong>z perspektywy medycznej fałdy brzeżne nie są chorobą</strong>. Nie niosą ryzyka zezłośliwienia, nie prowadzą do powikłań zdrowotnych i nie wymagają interwencji chirurgicznej.
          </p>
          <p>
            Jednocześnie rozumiemy, że <strong>subiektywne odczucia mają realną wartość</strong>. Jeśli fałdy:
          </p>
        </div>
        <ul className="space-y-3 mt-6">
          {[
            "Utrudniają utrzymanie higieny intymnej",
            "Powodują dyskomfort podczas siedzenia lub aktywności fizycznej",
            "Wpływają negatywnie na samoocenę i pewność siebie",
            "Stanowią barierę w relacjach intymnych",
            "Wywołują lęk przed poważniejszą chorobą",
          ].map((text, i) => (
            <StaggeredListItem key={text} index={i} icon={<CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />}>
              {text}
            </StaggeredListItem>
          ))}
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-6">
          …to <strong>Twoje odczucia są wystarczającym powodem do konsultacji</strong>. W naszej klinice nigdy nie oceniamy motywacji pacjenta — pomagamy podjąć świadomą decyzję.
        </p>
      </motion.section>

      {/* Kiedy do lekarza */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Kiedy warto zgłosić się do proktologa?
        </h2>
        <div className="glass-card p-8 rounded-2xl space-y-4">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground font-medium">
              Choć fałdy same w sobie nie wymagają leczenia, warto skonsultować się ze specjalistą, jeśli:
            </p>
          </div>
          <ul className="space-y-3 pl-8">
            {[
              "Fałd pojawił się nagle, jest bolesny lub zaczerwieniony — może to być zakrzepica brzeżna",
              "Towarzyszą mu krwawienia z odbytu — wymaga wykluczenia hemoroidów lub szczeliny",
              "Zmiana rośnie, twardnieje lub zmienia kolor — wymaga oceny dermatologicznej",
              "Doświadczasz świądu, pieczenia lub wycieku — mogą wskazywać na anusitis lub egzemę",
              "Po prostu chcesz wiedzieć, z czym masz do czynienia — diagnostyka to nie przesada, to rozsądek",
            ].map((text, i) => (
              <StaggeredListItem key={text} index={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed" icon={<span className="text-primary mt-1">•</span>}>
                {text}
              </StaggeredListItem>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Możliwości leczenia */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Czy fałdy można usunąć?
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Tak — jeśli po rzetelnej konsultacji zdecydujesz, że chcesz je usunąć, oferujemy <strong>laserową plastykę okolicy odbytu</strong>. Zabieg jest:
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          {[
            { title: "Ambulatoryjny", desc: "Wykonywany w gabinecie, bez hospitalizacji. Powrót do domu tego samego dnia." },
            { title: "Bezbolesny", desc: "Znieczulenie miejscowe zapewnia pełen komfort — czujesz jedynie dotyk." },
            { title: "Precyzyjny", desc: "Laser CO₂ jednocześnie tnie i koaguluje — minimalne krwawienie, bez szwów." },
            { title: "Szybki", desc: "Zabieg trwa 10–20 minut. Rekonwalescencja: dyskomfort przez 7–10 dni." },
          ].map((item) => (
            <div key={item.title} className="glass-card p-5 rounded-xl">
              <h3 className="text-sm font-semibold text-primary mb-1.5 uppercase tracking-wider">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-6 leading-relaxed">
          Więcej o samym zabiegu przeczytasz na stronie{" "}
          <a href="/leczenie/plastyka" className="text-primary hover:underline">Plastyka odbytu →</a>
        </p>
      </motion.section>

      {/* Podejście kliniczne */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Nasze podejście: wiedza, nie presja
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            W Centrum Medycyny Laserowej nie namawiamy do zabiegów. Naszą rolą jest dostarczenie rzetelnej wiedzy medycznej, aby pacjent mógł podjąć własną, świadomą decyzję.
          </p>
          <p>
            Podczas konsultacji:
          </p>
        </div>
        <div className="space-y-3 mt-4">
          {[
            { step: "1", title: "Diagnoza", desc: "Delikatne badanie proktologiczne — ustalamy, czy mamy do czynienia z fałdem brzeżnym, hemoroidem, brodawką wartowniczą czy inną zmianą." },
            { step: "2", title: "Edukacja", desc: "Wyjaśniamy charakter zmiany, przyczynę jej powstania i możliwości postępowania." },
            { step: "3", title: "Decyzja", desc: "Omawiamy opcje: obserwacja, zmiana nawyków higienicznych lub zabieg. Decyzja zawsze należy do Ciebie." },
          ].map((item) => (
            <div key={item.step} className="glass-card p-6 rounded-2xl flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <RecoveryBoostBanner />

      <TestimonialsSection />

      

      <FaldyFAQ fadeUp={fadeUp} />

      {/* CTA */}
      <motion.section {...fadeUp} className="text-center py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-serif">
          Masz pytania? Porozmawiajmy.
        </h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Nie musisz od razu decydować o zabiegu. Konsultacja to rozmowa — bez zobowiązań, bez oceniania.
        </p>
        <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
            Umów dyskretną konsultację
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </motion.section>
    </div>
      <RelatedLinks path="/dla-pacjenta/faldy-odbytu" />

  </div>
);

export default FaldyOdbytu;
