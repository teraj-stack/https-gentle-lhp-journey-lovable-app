import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { Button } from "@/components/ui/button";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import { StaggeredListItem } from "@/components/shared/StaggeredList";
import RelatedLinks from "@/components/shared/RelatedLinks";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const heroStats = [
  { num: "IV", label: "Stopnie zaawansowania" },
  { num: "20\u201340\u2019", label: "Czas zabiegu laserowego" },
  { num: "2\u20135 dni", label: "Powr\u00f3t do pracy (laser)" },
  { num: "3\u20134 tyg.", label: "Rekonwalescencja klasyczna" },
];

const mechanismCards = [
  { icon: "\ud83e\udec0", title: "Naturalne \u201Epoduszeczki\u201D", desc: "Hemoroidy to naczyniowe poduszeczki w kanale odbytu \u2014 ka\u017Cdy je ma. Uszczelniaj\u0105 odbyt i kontroluj\u0105 gazy. Problem pojawia si\u0119, gdy ulegaj\u0105 powi\u0119kszeniu i przekrwieniu." },
  { icon: "\ud83c\udf88", title: "Efekt \u201Ebalonika\u201D", desc: "Krew wp\u0142ywa do \u015Brodka, ale ma utrudniony odp\u0142yw. Balonik p\u0119cznieje, rozci\u0105ga si\u0119 \u2014 z czasem zaczyna krwawi\u0107 lub wypada\u0107 na zewn\u0105trz." },
  { icon: "\u2699\ufe0f", title: "Przyczyny \u2014 nie geny, lecz styl \u017Cycia", desc: "Praca siedz\u0105ca, ci\u0105g\u0142y ucisk miednicy, dieta uboga w b\u0142onnik, silne parcie, ci\u0105\u017Ca, intensywny wysi\u0142ek z bezdechem \u2014 to mechanika, nie higiena." },
];

const dietPoints = [
  "Studiuj\u0105 diety bogatoresztkowe i wp\u0142yw b\u0142onnika na mi\u0119kko\u015B\u0107 stolca.",
  "Zg\u0142\u0119biaj\u0105 rol\u0119 mikrobioty jelitowej i odpowiedniego nawodnienia.",
  "Si\u0119gaj\u0105 po suplementacj\u0119: babka p\u0142esznik, magnez, probiotyki.",
];

const sportsQuit = ["Kolarstwo", "Jazda konna", "Tr\u00f3jb\u00f3j si\u0142owy", "Podnoszenie ci\u0119\u017Car\u00f3w"];
const sportsStart = ["P\u0142ywanie", "Spacery", "Joga", "Stretching"];

const ergonomyItems = [
  { icon: "\ud83c\udf69", title: "Poduszka ortopedyczna", desc: "Poduszki z otworem (tzw. \u201Eoponki\u201D) redukuj\u0105ce ucisk na odbyt podczas siedzenia." },
  { icon: "\ud83d\udda5\ufe0f", title: "Biurko stoj\u0105ce", desc: "Biurka do pracy stoj\u0105cej eliminuj\u0105ce wielogodzinny ucisk miednicy." },
  { icon: "\ud83d\udebf", title: "Nak\u0142adka bidetowa", desc: "Nak\u0142adki bidetowe na WC zapewniaj\u0105ce delikatn\u0105 higien\u0119 bez podra\u017Cnie\u0144." },
  { icon: "\ud83e\uddb6", title: "Podn\u00f3\u017Cek toaletowy", desc: "Podn\u00f3\u017Cki wymuszaj\u0105ce fizjologiczn\u0105 pozycj\u0119 kucania podczas wypr\u00f3\u017Cniania." },
];

const tabuCards = [
  { icon: "\ud83d\udc41\ufe0f", title: "Syndrom \u201ECichego Obserwatora\u201D", desc: "Hemoroidy to parali\u017Cuj\u0105ce tabu. Pacjenci nie lajkuj\u0105, nie komentuj\u0105 i nie udost\u0119pniaj\u0105 post\u00f3w klinik ze swoich prywatnych profili. Ich aktywno\u015B\u0107 toczy si\u0119 wy\u0142\u0105cznie w Dark Social." },
  { icon: "\ud83c\udfad", title: "Migracja do anonimowych stref", desc: "Szukaj\u0105 wsparcia na zamkni\u0119tych grupach Facebook \u2014 cz\u0119sto zak\u0142adaj\u0105c fa\u0142szywe konta \u2014 oraz na anonimowych forach. Pytaj\u0105 o brutalnie szczere do\u015Bwiadczenia z b\u00f3lem po operacji." },
  { icon: "\u2b50", title: "Weryfikacja \u201Emi\u0119kkich\u201D kompetencji lekarza", desc: "Na etapie przed operacj\u0105 tytu\u0142 naukowy ma mniejsze znaczenie ni\u017C s\u0142owa-klucze od innych pacjent\u00f3w w opiniach." },
];

const softSkillTags = ["\u201Elekarz empatyczny\u201D", "\u201Edelikatne badanie\u201D", "\u201Enie ocenia\u201D", "\u201Ekomfortowa atmosfera\u201D", "\u201Eprze\u0142amuje wstyd\u201D"];

const searchCategories = [
  {
    cat: "\ud83e\ude78 Zaawansowane objawy",
    queries: [
      "\u201Ewypadaj\u0105ce guzki krwawnicze 3 i 4 stopnia\u201D",
      "\u201Ezakrzepica splotu hemoroidalnego operacja\u201D",
      "\u201Eogromny b\u00f3l po wypr\u00f3\u017Cnieniu utrzymuj\u0105cy si\u0119 godzinami\u201D",
      "\u201Ekrwawienie z odbytu i skrzepy\u201D",
    ],
  },
  {
    cat: "\u2696\ufe0f Por\u00f3wnanie metod",
    queries: [
      "\u201Elasterowe usuwanie hemoroid\u00f3w LHP opinie\u201D",
      "\u201Emetoda Barrona a operacja klasyczna Milligana-Morgana b\u00f3l\u201D",
      "\u201Enajmniej inwazyjna metoda usuwania hemoroid\u00f3w\u201D",
      "\u201Eczy operacja hemoroid\u00f3w jest pod narkoz\u0105\u201D",
    ],
  },
  {
    cat: "\ud83d\ude30 Logistyka i rekonwalescencja",
    queries: [
      "\u201Epierwszy stolec po operacji proktologicznej jak prze\u017Cy\u0107\u201D",
      "\u201Eile dni L4 po operacji hemoroid\u00f3w\u201D",
      "\u201Eb\u00f3l po laserowym usuni\u0119ciu hemoroid\u00f3w\u201D",
      "\u201Ekiedy wr\u00f3ci\u0107 do pracy po zabiegu proktologicznym\u201D",
    ],
  },
];

const comparisonRows = [
  { label: "Co robi lekarz?", classic: "Wycina tkank\u0119 skalpelem lub no\u017Cyczkami elektrycznymi", laser: "Zamyka naczynia precyzyjn\u0105 wi\u0105zk\u0105 lasera od \u015Brodka" },
  { label: "Rany po zabiegu", classic: "Otwarte rany, cz\u0119sto wymagaj\u0105ce szw\u00f3w", laser: "Mikroskopijne nak\u0142ucie \u2014 brak ran otwartych" },
  { label: "Poziom b\u00f3lu", classic: "Wysoki (8\u20139/10). Silne leki przez wiele dni", laser: "Minimalny (2\u20133/10). Zwyk\u0142e leki przeciwb\u00f3lowe" },
  { label: "Pobyt w szpitalu", classic: "Zazwyczaj kilka dni", laser: "Procedura jednego dnia \u2014 wychodzisz po kilku godzinach" },
  { label: "Powr\u00f3t do pracy", classic: "3\u20134 tygodnie (L4)", laser: "24\u201348 godzin \u2014 mo\u017Cliwy powr\u00f3t po weekendzie" },
  { label: "Ryzyko powik\u0142a\u0144", classic: "Ryzyko uszkodzenia zwieraczy", laser: "Ryzyko minimalne \u2014 laser dzia\u0142a punktowo" },
  { label: "Znieczulenie", classic: "Znieczulenie og\u00f3lne lub regionalne", laser: "Znieczulenie miejscowe" },
];

const laserSteps = [
  { num: "01", icon: "\ud83d\udeaa", title: "Przyj\u0119cie i komfort", desc: "Przychodzisz do kliniki w dniu zabiegu \u2014 bez hospitalizacji dzie\u0144 wcze\u015Bniej. Zabieg ambulatoryjny. Znieczulenie miejscowe \u2014 nie boli." },
  { num: "02", icon: "\ud83d\udca1", title: "Dzia\u0142anie lasera", desc: "Cienkie w\u0142\u00f3kno laserowe wprowadzane do wn\u0119trza guzka. Precyzyjna wi\u0105zka zamyka naczynia krwiono\u015Bne. \u015Al\u0117z\u00f3wka i zwieracze pozostaj\u0105 nienaruszone. Czas: 20\u201340 minut." },
  { num: "03", icon: "\ud83c\udfe0", title: "Wyj\u015Bcie do domu", desc: "Wstajesz, ubierasz si\u0119 i wracasz do domu o w\u0142asnych si\u0142ach. Brak szw\u00f3w, brak otwartych ran. Guzek zaczyna zanika\u0107 w ci\u0105gu kilku tygodni." },
];

const degrees = [
  { deg: "I\u00b0", title: "Stopie\u0144 I", desc: "Laser dzia\u0142a idealnie. Niemal natychmiastowa ulga. Najlepszy moment na interwencj\u0119.", variant: "green" as const },
  { deg: "II\u00b0", title: "Stopie\u0144 II", desc: "Laser bardzo skuteczny. Guzki wypadaj\u0105 podczas parcia, ale cofaj\u0105 si\u0119 samoistnie.", variant: "blue" as const },
  { deg: "III\u00b0", title: "Stopie\u0144 III \u26a0\ufe0f", desc: "Moment krytyczny. Guzki wypadaj\u0105, ale daj\u0105 si\u0119 odprowadzi\u0107. Laser wci\u0105\u017C metod\u0105 z wyboru.", variant: "yellow" as const },
  { deg: "IV\u00b0", title: "Stopie\u0144 IV \u274c", desc: "Guzki trwale na zewn\u0105trz. Laser mo\u017Ce by\u0107 niewystarczaj\u0105cy. Cz\u0119sto konieczny skalpel.", variant: "red" as const },
];

const degreeColors = {
  green: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300",
  blue: "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300",
  yellow: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300",
  red: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300",
};

const vicCircleSteps = [
  { icon: "\ud83d\udc8a", title: "Krok 1", desc: "Kupujesz ma\u015B\u0107 lub czopek. Substancje przeciwb\u00f3lowe i \u015Bci\u0105gaj\u0105ce daj\u0105 chwilkow\u0105 ulg\u0119." },
  { icon: "\ud83d\ude0c", title: "Krok 2", desc: "Pieczenie ust\u0119puje, obrz\u0119k maleje. My\u015Blisz: \u201EUff, wyleczone.\u201D" },
  { icon: "\ud83d\udcbb", title: "Krok 3", desc: "Wracasz do pracy, siadasz 8 godzin przed komputerem \u2014 mechanizm startuje od nowa." },
  { icon: "\ud83d\udcc8", title: "Krok 4", desc: "Kupujesz coraz dro\u017Csze preparaty. Okresy ulgi coraz kr\u00f3tsze. Frustracja i strach rosn\u0105." },
];

const Hemoroidy = () => {
  return (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="Hemoroidy od A do Z — Kompleksowy Przewodnik Pacjenta"
      description="Mechanizm choroby hemoroidalnej, stopnie zaawansowania, porównanie metod leczenia (laser LHP vs klasyka) i styl życia. Dr Jan Bujok."
      path="/dla-pacjenta/hemoroidy"
    />
    <MedicalWebPageSchema
      name="Hemoroidy od A do Z — Kompleksowy Przewodnik Pacjenta"
      description="Kompendium wiedzy o hemoroidach: mechanizm choroby, stopnie zaawansowania, porównanie metody laserowej LHP z chirurgią klasyczną, dieta, ergonomia i psychologia pacjenta."
      path="/dla-pacjenta/hemoroidy"
      specialty="Proctology"
    />

    {/* HERO */}
    <ParallaxSection className="gradient-bg py-16 md:py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl mx-auto text-center"
      >
        <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary-foreground/80 mb-4">
          Kompleksowy Przewodnik Pacjenta
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Powr{"\u00f3"}t do Komfortu {"\u2014"} Hemoroidy od A do Z
        </h1>
        <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
        <p className="text-primary-foreground/90 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Mechanizm choroby, psychologia pacjenta, styl {"\u017C"}ycia wymuszony b{"\u00f3"}lem oraz nowoczesne metody leczenia {"\u2014"} w jednym przewodniku.
        </p>
        <div className="flex justify-center flex-wrap gap-4 md:gap-6 mt-8 px-4">
          {heroStats.map((s) => (
            <div key={s.label} className="text-center min-w-[100px]">
              <p className="text-2xl md:text-3xl font-bold text-primary-foreground">{s.num}</p>
              <p className="text-[10px] md:text-xs text-primary-foreground/80 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={BREADCRUMBS_MAP["/dla-pacjenta/hemoroidy"]} className="mb-4" />

      {/* CHAPTER 1 */}
      <section>
        <h2 className="section-title mb-3 text-center">{"\ud83e\ude7a"} Dlaczego to boli? {"\u2014"} Mechanizm choroby</h2>
        <p className="section-subtitle mb-10 text-center">Rozdzia{"\u0142"} 1</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {mechanismCards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-xl p-6 text-center"
            >
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="font-bold text-foreground mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VICIOUS CIRCLE */}
      <section>
        <h2 className="section-title mb-3 text-center">{"\ud83d\udd04"} Pu{"\u0142"}apka b{"\u0142\u0119"}dnego ko{"\u0142"}a</h2>
        <p className="section-subtitle mb-10 text-center">Domowe sposoby vs. Medycyna {"\u2014"} Rozdzia{"\u0142"} 2</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {vicCircleSteps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass-card rounded-xl p-5 text-center relative"
            >
              <div className="text-3xl mb-3">{s.icon}</div>
              <h4 className="font-bold text-foreground mb-1 text-sm">{s.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              {i < vicCircleSteps.length - 1 && (
                <span className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-xl">{"\u2192"}</span>
              )}
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-card rounded-xl p-6 mt-8 border-l-4 border-primary max-w-3xl mx-auto"
        >
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            {"\ud83d\ude97"} <strong className="text-foreground">Analogia:</strong> To tak, jakby{"\u015B"} w samochodzie ze {"\u015B"}wiec{"\u0105"}c{"\u0105"} kontrolk{"\u0105"} {"\u201E"}Awaria silnika{"\u201D"} zaklei{"\u0142"} j{"\u0105"} ta{"\u015B"}m{"\u0105"} izolacyjn{"\u0105"}. Nie widzisz problemu {"\u2014"} ale silnik nadal jest zepsuty. Ma{"\u015B\u0107"} nie sprawi, {"\u017C"}e rozci{"\u0105"}gni{"\u0119"}ta tkanka {"\u201E"}wch{"\u0142"}onie si{"\u0119\u201D"} i wr{"\u00f3"}ci do pierwotnego kszta{"\u0142"}tu.
          </p>
        </motion.div>
      </section>

      {/* LIFESTYLE */}
      <section>
        <h2 className="section-title mb-3 text-center">{"\ud83c\udfc3"} Zachowania Pacjenta {"\u2014"} Styl {"\u017B"}ycia</h2>
        <p className="section-subtitle mb-10 text-center">Preferencje i zainteresowania wymuszone b{"\u00f3"}lem</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center text-2xl">{"\ud83e\udd57"}</div>
              <div>
                <h3 className="font-bold text-foreground">A. Nag{"\u0142"}e zainteresowanie dietetyk{"\u0105"}</h3>
                <p className="text-xs text-muted-foreground">Domowy ekspert od uk{"\u0142"}adu pokarmowego</p>
              </div>
            </div>
            <ul className="space-y-2">
              {dietPoints.map((p, i) => (
                <StaggeredListItem key={i} index={i} icon={<div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />} className="flex items-start gap-3 text-sm text-muted-foreground">
                  {p}
                </StaggeredListItem>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 mt-4">
              {["B\u0142onnik", "Mikrobiota", "Nawodnienie", "Babka p\u0142esznik"].map((t) => (
                <span key={t} className="px-3 py-1 rounded-full bg-secondary text-xs font-semibold text-foreground">{t}</span>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center text-2xl">{"\ud83c\udfca"}</div>
              <div>
                <h3 className="font-bold text-foreground">B. Modyfikacja aktywno{"\u015B"}ci sportowej</h3>
                <p className="text-xs text-muted-foreground">Rezygnacja z pasji {"\u2014"} przej{"\u015B"}cie na {"\u201E"}bezpieczne{"\u201D"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">{"\u274c"} Rezygnuj{"\u0105"} z:</p>
                {sportsQuit.map((s) => (
                  <p key={s} className="text-sm text-muted-foreground mb-1">{s}</p>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{"\u2705"} Przechodz{"\u0105"} na:</p>
                {sportsStart.map((s) => (
                  <p key={s} className="text-sm text-muted-foreground mb-1">{s}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ERGONOMICS */}
      <section>
        <h2 className="section-title mb-3 text-center">{"\ud83e\ude91"} Styl {"\u017B"}ycia {"\u2014"} Ergonomia</h2>
        <p className="section-subtitle mb-10 text-center">
          Osoby wykonuj{"\u0105"}ce prac{"\u0119"} siedz{"\u0105"}c{"\u0105"} masowo interesuj{"\u0105"} si{"\u0119"} ergonomi{"\u0105"}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ergonomyItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-card rounded-xl p-5 text-center"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <h4 className="font-bold text-foreground text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SOCIAL MEDIA TABOO */}
      <section>
        <h2 className="section-title mb-3 text-center">{"\ud83d\udcf1"} Zachowania w Mediach Spo{"\u0142"}eczno{"\u015B"}ciowych</h2>
        <p className="section-subtitle mb-10 text-center">Efekt Tabu i {"\u201E"}Dark Social{"\u201D"}</p>
        <div className="space-y-5 max-w-3xl mx-auto">
          {tabuCards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-xl p-6 flex gap-5 items-start"
            >
              <div className="shrink-0 w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                {c.icon}
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                {c.title.includes("kompetencji") && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {softSkillTags.map((t) => (
                      <span key={t} className="px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SEARCH QUERIES */}
      <section>
        <h2 className="section-title mb-3 text-center">{"\ud83d\udd0d"} Obawy pacjenta doprowadzaj{"\u0105"} do sytuacji, kiedy objawy choroby hemoroidalnej znacz{"\u0105"}co wp{"\u0142"}ywaj{"\u0105"} na codzienne funkcjonowanie</h2>
        <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
          Osoba o krok od sto{"\u0142"}u operacyjnego {"\u2014"} jej zapytania s{"\u0105"} medyczne, precyzyjne i nacechowane strachem
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {searchCategories.map((cat, ci) => (
            <motion.div
              key={cat.cat}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: ci * 0.1 }}
              className="glass-card rounded-xl p-6"
            >
              <h3 className="font-bold text-foreground mb-4 text-sm">{cat.cat}</h3>
              <ul className="space-y-3">
                {cat.queries.map((q, i) => (
                  <StaggeredListItem key={i} index={i} icon={<span className="text-primary shrink-0">{"\ud83d\udd0e"}</span>} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                    {q}
                  </StaggeredListItem>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CHAPTER 3 — COMPARISON */}
      <section>
        <h2 className="section-title mb-3 text-center">{"\u26a1"} Skalpel czy Laser?</h2>
        <p className="section-subtitle mb-10 text-center">Rozdzia{"\u0142"} 3 {"\u2014"} Por{"\u00f3"}wnanie metod leczenia</p>
        <div className="glass-card rounded-2xl overflow-hidden max-w-4xl mx-auto">
          <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider border-b border-border">
            <div className="p-4 text-muted-foreground">Cecha</div>
            <div className="p-4 text-muted-foreground text-center">{"\ud83d\udd2a"} Klasyczna</div>
            <div className="p-4 text-primary text-center">{"\u26a1"} Laser LHP</div>
          </div>
          {comparisonRows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`grid grid-cols-3 text-sm ${i < comparisonRows.length - 1 ? "border-b border-border/50" : ""}`}
            >
              <div className="p-4 text-foreground font-medium">{row.label}</div>
              <div className="p-4 text-muted-foreground text-center">{row.classic}</div>
              <div className="p-4 text-primary text-center font-semibold">{row.laser}</div>
            </motion.div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-5 mt-8 max-w-2xl mx-auto">
          <div className="rounded-xl bg-destructive/10 p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-destructive mb-2">B{"\u00f3"}l po operacji klasycznej</p>
            <p className="text-5xl font-black text-destructive">8{"\u2013"}9/10</p>
            <p className="text-xs text-destructive/80 mt-2">Silne leki opioidowe przez wiele dni</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Dyskomfort po zabiegu laserowym</p>
            <p className="text-5xl font-black text-primary">2{"\u2013"}3/10</p>
            <p className="text-xs text-primary/80 mt-2">Zwyk{"\u0142"}e leki przeciwb{"\u00f3"}lowe OTC</p>
          </div>
        </div>
      </section>

      {/* CHAPTER 4 — LASER STEPS */}
      <section>
        <h2 className="section-title mb-3 text-center">{"\ud83c\udfe5"} Jak wygl{"\u0105"}da zabieg laserowy LHP?</h2>
        <p className="section-subtitle mb-10 text-center">Rozdzia{"\u0142"} 4 {"\u2014"} Krok po kroku</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {laserSteps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="glass-card rounded-xl p-6 relative overflow-hidden"
            >
              <span className="absolute top-3 right-4 text-5xl font-black text-muted-foreground/10">{s.num}</span>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h4 className="font-bold text-foreground mb-2">{s.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-card rounded-xl p-6 mt-8 border-l-4 border-primary max-w-3xl mx-auto"
        >
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            {"\u201E\u017Ba\u0142uj\u0119"} tylko jednej rzeczy {"\u2014"} {"\u017Ce"} zwleka{"\u0142"}em tak d{"\u0142"}ugo i m{"\u0119"}czy{"\u0142"}em si{"\u0119"} niepotrzebnie przez te wszystkie lata.{"\u201D"}
            <span className="block text-xs mt-2 not-italic text-muted-foreground/70">{"\u2014"} typowa reakcja pacjenta po zako{"\u0144"}czonym leczeniu</span>
          </p>
        </motion.div>
      </section>

      {/* CHAPTER 5 — DEGREE SCALE */}
      <section>
        <h2 className="section-title mb-3 text-center">{"\ud83d\udcca"} Czy kwalifikujesz si{"\u0119"} do zabiegu?</h2>
        <p className="section-subtitle mb-10 text-center">Rozdzia{"\u0142"} 5 {"\u2014"} Skala zaawansowania</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {degrees.map((d, i) => (
            <motion.div
              key={d.deg}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`rounded-xl p-5 text-center ${degreeColors[d.variant]}`}
            >
              <p className="text-3xl font-black mb-2">{d.deg}</p>
              <h4 className="font-bold text-sm mb-2">{d.title}</h4>
              <p className="text-xs leading-relaxed">{d.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-card rounded-xl p-6 mt-8 border-l-4 border-destructive max-w-3xl mx-auto"
        >
          <p className="text-sm text-foreground leading-relaxed">
            <strong>{"\u23f0"} Czas dzia{"\u0142"}a na Twoj{"\u0105"} niekorzy{"\u015B\u0107"}.</strong>{" "}
            Ka{"\u017C"}dy miesi{"\u0105"}c zwlekania i leczenia {"\u201E"}na w{"\u0142"}asn{"\u0105"} r{"\u0119"}k{"\u0119\u201D"} przybli{"\u017C"}a Ci{"\u0119"} do momentu, w kt{"\u00f3"}rym lekarz powie: {"\u201E"}Przykro mi, na laser jest ju{"\u017C"} za p{"\u00f3\u017A"}no, musimy ci{"\u0105\u0107"}. {"\u201D"}
            Nie pozw{"\u00f3"}l, aby strach lub wstyd odebra{"\u0142"}y Ci szans{"\u0119"} na komfortowe leczenie.
          </p>
        </motion.div>
      </section>

      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <section className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">{"\ud83c\udfaf"}</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Tw{"\u00f3"}j nast{"\u0119"}pny krok {"\u2014"} Konsultacja kwalifikacyjna
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Niezobowi{"\u0105"}zuj{"\u0105"}ca wizyta, podczas kt{"\u00f3"}rej lekarz oceni stopie{"\u0144"} zaawansowania, potwierdzi kwalifikacj{"\u0119"} do LHP, przedstawi plan leczenia i odpowie na wszystkie pytania {"\u2014"} bez po{"\u015B"}piechu i wstydu.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
            Sprawd{"\u017A"} dost{"\u0119"}pne terminy
          </a>
        </Button>
        <RelatedLinks path="/dla-pacjenta/hemoroidy" />
      </section>
    </div>
  </div>
  );
};

export default Hemoroidy;
