import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ParallaxSection from "@/components/ui/parallax-section";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import SeoHead from "@/components/shared/SeoHead";

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const heroStats = [
  { num: "IV", label: "Stopnie zaawansowania" },
  { num: "20–40'", label: "Czas zabiegu laserowego" },
  { num: "2–5 dni", label: "Powrót do pracy (laser)" },
  { num: "3–4 tyg.", label: "Rekonwalescencja klasyczna" },
];

const mechanismCards = [
  { icon: "🫀", title: 'Naturalne „poduszeczki"', desc: "Hemoroidy to naczyniowe poduszeczki w kanale odbytu — każdy je ma. Uszczelniają odbyt i kontrolują gazy. Problem pojawia się, gdy ulegają powiększeniu i przekrwieniu." },
  { icon: "🎈", title: 'Efekt „balonika"', desc: "Krew wpływa do środka, ale ma utrudniony odpływ. Balonik pęcznieje, rozciąga się — z czasem zaczyna krwawić lub wypadać na zewnątrz." },
  { icon: "⚙️", title: "Przyczyny — nie geny, lecz styl życia", desc: "Praca siedząca, ciągły ucisk miednicy, dieta uboga w błonnik, silne parcie, ciąża, intensywny wysiłek z bezdechem — to mechanika, nie higiena." },
];

const dietPoints = [
  "Studiują diety bogatoresztkowe i wpływ błonnika na miękkość stolca.",
  "Zgłębiają rolę mikrobioty jelitowej i odpowiedniego nawodnienia.",
  "Sięgają po suplementację: babka płesznik, magnez, probiotyki.",
];

const sportsQuit = ["Kolarstwo", "Jazda konna", "Trójbój siłowy", "Podnoszenie ciężarów"];
const sportsStart = ["Pływanie", "Spacery", "Joga", "Stretching"];

const ergonomyItems = [
  { icon: "🍩", title: "Poduszka ortopedyczna", desc: 'Poduszki z otworem (tzw. „oponki") redukujące ucisk na odbyt podczas siedzenia.' },
  { icon: "🖥️", title: "Biurko stojące", desc: "Biurka do pracy stojącej eliminujące wielogodzinny ucisk miednicy." },
  { icon: "🚿", title: "Nakładka bidetowa", desc: "Nakładki bidetowe na WC zapewniające delikatną higienę bez podrażnień." },
  { icon: "🦶", title: "Podnóżek toaletowy", desc: "Podnóżki wymuszające fizjologiczną pozycję kucania podczas wypróżniania." },
];

const tabuCards = [
  { icon: "👁️", title: 'Syndrom „Cichego Obserwatora"', desc: "Hemoroidy to paraliżujące tabu. Pacjenci nie lajkują, nie komentują i nie udostępniają postów klinik ze swoich prywatnych profili. Ich aktywność toczy się wyłącznie w Dark Social — prywatne wiadomości, kopiowanie linków bez śladu." },
  { icon: "🎭", title: "Migracja do anonimowych stref", desc: "Szukają wsparcia na zamkniętych grupach Facebook — często zakładając fałszywe konta — oraz na anonimowych forach. Pytają o brutalnie szczere doświadczenia z bólem po operacji." },
  { icon: "⭐", title: 'Weryfikacja „miękkich" kompetencji lekarza', desc: "Na etapie przed operacją tytuł naukowy ma mniejsze znaczenie niż słowa-klucze od innych pacjentów w opiniach." },
];

const softSkillTags = ['"lekarz empatyczny"', '"delikatne badanie"', '"nie ocenia"', '"komfortowa atmosfera"', '"przełamuje wstyd"'];

const searchCategories = [
  {
    cat: "🩸 Zaawansowane objawy",
    queries: [
      "„wypadające guzki krwawnicze 3 i 4 stopnia"",
      "„zakrzepica splotu hemoroidalnego operacja"",
      "„ogromny ból po wypróżnieniu utrzymujący się godzinami"",
      "„krwawienie z odbytu i skrzepy"",
    ],
  },
  {
    cat: "⚖️ Porównanie metod",
    queries: [
      "„laserowe usuwanie hemoroidów LHP opinie"",
      "„metoda Barrona a operacja klasyczna Milligana-Morgana ból"",
      "„najmniej inwazyjna metoda usuwania hemoroidów"",
      "„czy operacja hemoroidów jest pod narkozą"",
    ],
  },
  {
    cat: "😰 Logistyka i rekonwalescencja",
    queries: [
      "„pierwszy stolec po operacji proktologicznej jak przeżyć"",
      "„ile dni L4 po operacji hemoroidów"",
      "„ból po laserowym usunięciu hemoroidów"",
      "„kiedy wrócić do pracy po zabiegu proktologicznym"",
    ],
  },
];

const comparisonRows = [
  { label: "Co robi lekarz?", classic: "Wycina tkankę skalpelem lub nożyczkami elektrycznymi", laser: "Zamyka naczynia precyzyjną wiązką lasera od środka" },
  { label: "Rany po zabiegu", classic: "Otwarte rany, często wymagające szwów", laser: "Mikroskopijne nakłucie — brak ran otwartych" },
  { label: "Poziom bólu", classic: "Wysoki (8–9/10). Silne leki przez wiele dni", laser: "Minimalny (2–3/10). Zwykłe leki przeciwbólowe" },
  { label: "Pobyt w szpitalu", classic: "Zazwyczaj kilka dni", laser: "Procedura jednego dnia — wychodzisz po kilku godzinach" },
  { label: "Powrót do pracy", classic: "3–4 tygodnie (L4)", laser: "24–48 godzin — możliwy powrót po weekendzie" },
  { label: "Ryzyko powikłań", classic: "Ryzyko uszkodzenia zwieraczy", laser: "Ryzyko minimalne — laser działa punktowo" },
  { label: "Znieczulenie", classic: "Znieczulenie ogólne lub regionalne", laser: "Znieczulenie miejscowe" },
];

const laserSteps = [
  { num: "01", icon: "🚪", title: "Przyjęcie i komfort", desc: "Przychodzisz do kliniki w dniu zabiegu — bez hospitalizacji dzień wcześniej. Zabieg ambulatoryjny. Znieczulenie miejscowe — nie boli." },
  { num: "02", icon: "💡", title: "Działanie lasera", desc: "Cienkie włókno laserowe wprowadzane do wnętrza guzka. Precyzyjna wiązka zamyka naczynia krwionośne. Śluzówka i zwieracze pozostają nienaruszone. Czas: 20–40 minut." },
  { num: "03", icon: "🏠", title: "Wyjście do domu", desc: "Wstajesz, ubierasz się i wracasz do domu o własnych siłach. Brak szwów, brak otwartych ran. Guzek zaczyna zanikać w ciągu kilku tygodni." },
];

const degrees = [
  { deg: "I°", title: "Stopień I", desc: "Laser działa idealnie. Niemal natychmiastowa ulga. Najlepszy moment na interwencję.", color: "bg-green-100 text-green-800" },
  { deg: "II°", title: "Stopień II", desc: "Laser bardzo skuteczny. Guzki wypadają podczas parcia, ale cofają się samoistnie.", color: "bg-blue-100 text-blue-800" },
  { deg: "III°", title: "Stopień III ⚠️", desc: "Moment krytyczny. Guzki wypadają, ale dają się odprowadzić. Laser wciąż metodą z wyboru.", color: "bg-yellow-100 text-yellow-800" },
  { deg: "IV°", title: "Stopień IV ❌", desc: "Guzki trwale na zewnątrz. Laser może być niewystarczający. Często konieczny skalpel.", color: "bg-red-100 text-red-800" },
];

const vicCircleSteps = [
  { icon: "💊", title: "Krok 1", desc: "Kupujesz maść lub czopek. Substancje przeciwbólowe i ściągające dają chwilową ulgę." },
  { icon: "😌", title: "Krok 2", desc: "Pieczenie ustępuje, obrzęk maleje. Myślisz: „Uff, wyleczone."" },
  { icon: "💻", title: "Krok 3", desc: "Wracasz do pracy, siadasz 8 godzin przed komputerem — mechanizm startuje od nowa." },
  { icon: "📈", title: "Krok 4", desc: "Kupujesz coraz droższe preparaty. Okresy ulgi coraz krótsze. Frustracja i strach rosną." },
];

const Hemoroidy = () => (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="Hemoroidy od A do Z — Kompleksowy Przewodnik Pacjenta"
      description="Mechanizm choroby hemoroidalnej, stopnie zaawansowania, porównanie metod leczenia (laser LHP vs klasyka) i styl życia. Dr Jan Bujok — chirurg, proktolog."
      path="/dla-pacjenta/hemoroidy"
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
          Powrót do Komfortu — Hemoroidy od A do Z
        </h1>
        <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
        <p className="text-primary-foreground/90 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Mechanizm choroby, psychologia pacjenta, styl życia wymuszony bólem oraz nowoczesne metody leczenia — w jednym przewodniku.
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
      <Breadcrumbs items={[{ label: "Dla pacjenta", href: "/dla-pacjenta" }, { label: "Hemoroidy od A do Z" }]} className="mb-4" />

      {/* CHAPTER 1 — MECHANISM */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">🩺 Dlaczego to boli? — Mechanizm choroby</h2>
        <p className="section-subtitle mb-10 text-center">Rozdział 1</p>
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
      </motion.section>

      {/* VICIOUS CIRCLE */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">🔄 Pułapka błędnego koła</h2>
        <p className="section-subtitle mb-10 text-center">Domowe sposoby vs. Medycyna — Rozdział 2</p>
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
                <span className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-xl">→</span>
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
            🚗 <strong className="text-foreground">Analogia:</strong> To tak, jakbyś w samochodzie ze świecącą kontrolką „Awaria silnika" zakleił ją taśmą izolacyjną. Nie widzisz problemu — ale silnik nadal jest zepsuty. Maść nie sprawi, że rozciągnięta tkanka „wchłonie się" i wróci do pierwotnego kształtu.
          </p>
        </motion.div>
      </motion.section>

      {/* LIFESTYLE — DIET & SPORTS */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">🏃 Zachowania Pacjenta — Styl Życia</h2>
        <p className="section-subtitle mb-10 text-center">Preferencje i zainteresowania wymuszone bólem</p>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Diet */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center text-2xl">🥗</div>
              <div>
                <h3 className="font-bold text-foreground">A. Nagłe zainteresowanie dietetyką</h3>
                <p className="text-xs text-muted-foreground">Domowy ekspert od układu pokarmowego</p>
              </div>
            </div>
            <ul className="space-y-2">
              {dietPoints.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 mt-4">
              {["Błonnik", "Mikrobiota", "Nawodnienie", "Babka płesznik"].map((t) => (
                <span key={t} className="px-3 py-1 rounded-full bg-secondary text-xs font-semibold text-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* Sports */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center text-2xl">🏊</div>
              <div>
                <h3 className="font-bold text-foreground">B. Modyfikacja aktywności sportowej</h3>
                <p className="text-xs text-muted-foreground">Rezygnacja z pasji — przejście na „bezpieczne"</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">❌ Rezygnują z:</p>
                {sportsQuit.map((s) => (
                  <p key={s} className="text-sm text-muted-foreground mb-1">{s}</p>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">✅ Przechodzą na:</p>
                {sportsStart.map((s) => (
                  <p key={s} className="text-sm text-muted-foreground mb-1">{s}</p>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Z żalem rezygnują z pasji zwiększających ciśnienie w jamie brzusznej lub uciskających dno miednicy.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ERGONOMICS */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">🪑 Styl Życia — Ergonomia</h2>
        <p className="section-subtitle mb-10 text-center">
          „Gadżeciarstwo" ergonomiczne — osoby wykonujące pracę siedzącą masowo interesują się ergonomią
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
      </motion.section>

      {/* SOCIAL MEDIA TABOO */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">📱 Zachowania w Mediach Społecznościowych</h2>
        <p className="section-subtitle mb-10 text-center">Efekt Tabu i „Dark Social"</p>
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
      </motion.section>

      {/* SEARCH QUERIES — BOTTOM OF FUNNEL */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">🔍 Dół Lejka Decyzyjnego</h2>
        <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
          Osoba o krok od stołu operacyjnego — jej zapytania są medyczne, precyzyjne i nacechowane strachem
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
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-primary shrink-0">🔎</span>
                    {q}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CHAPTER 3 — COMPARISON */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">⚡ Skalpel czy Laser?</h2>
        <p className="section-subtitle mb-10 text-center">Rozdział 3 — Porównanie metod leczenia</p>
        <div className="glass-card rounded-2xl overflow-hidden max-w-4xl mx-auto">
          <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider border-b border-border">
            <div className="p-4 text-muted-foreground">Cecha</div>
            <div className="p-4 text-muted-foreground text-center">🔪 Klasyczna</div>
            <div className="p-4 text-primary text-center">⚡ Laser LHP</div>
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

        {/* Pain comparison */}
        <div className="grid sm:grid-cols-2 gap-5 mt-8 max-w-2xl mx-auto">
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 mb-2">Ból po operacji klasycznej</p>
            <p className="text-5xl font-black text-red-700 dark:text-red-400">8–9/10</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-2">Silne leki opioidowe przez wiele dni</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400 mb-2">Dyskomfort po zabiegu laserowym</p>
            <p className="text-5xl font-black text-green-700 dark:text-green-400">2–3/10</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-2">Zwykłe leki przeciwbólowe OTC</p>
          </div>
        </div>
      </motion.section>

      {/* CHAPTER 4 — LASER STEPS */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">🏥 Jak wygląda zabieg laserowy LHP?</h2>
        <p className="section-subtitle mb-10 text-center">Rozdział 4 — Krok po kroku</p>
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
            „Żałuję tylko jednej rzeczy — że zwlekałem tak długo i męczyłem się niepotrzebnie przez te wszystkie lata."
            <span className="block text-xs mt-2 not-italic text-muted-foreground/70">— typowa reakcja pacjenta po zakończonym leczeniu</span>
          </p>
        </motion.div>
      </motion.section>

      {/* CHAPTER 5 — DEGREE SCALE */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">📊 Czy kwalifikujesz się do zabiegu?</h2>
        <p className="section-subtitle mb-10 text-center">Rozdział 5 — Skala zaawansowania</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {degrees.map((d, i) => (
            <motion.div
              key={d.deg}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`rounded-xl p-5 text-center ${d.color}`}
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
            <strong>⏰ Czas działa na Twoją niekorzyść.</strong>{" "}
            Każdy miesiąc zwlekania i leczenia „na własną rękę" przybliża Cię do momentu, w którym lekarz powie: „Przykro mi, na laser jest już za późno, musimy ciąć."
            Nie pozwól, aby strach lub wstyd odebrały Ci szansę na komfortowe leczenie.
          </p>
        </motion.div>
      </motion.section>

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Twój następny krok — Konsultacja kwalifikacyjna
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Niezobowiązująca wizyta, podczas której lekarz oceni stopień zaawansowania, potwierdzi kwalifikację do LHP, przedstawi plan leczenia i odpowie na wszystkie pytania — bez pośpiechu i wstydu.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
            Sprawdź dostępne terminy
          </a>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default Hemoroidy;
