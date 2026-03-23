import { motion } from \u201Dframer-motion\u201D;
import { Link } from \u201Dreact-router-dom\u201D;
import ParallaxSection from \u201D@/components/ui/parallax-section\u201D;
import Breadcrumbs from \u201D@/components/layout/Breadcrumbs\u201D;
import { Button } from \u201D@/components/ui/button\u201D;
import SeoHead from \u201D@/components/shared/SeoHead\u201D;

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: \u201Dblur(4px)\u201D },
  whileInView: { opacity: 1, y: 0, filter: \u201Dblur(0px)\u201D },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const heroStats = [
  { num: \u201DIV\u201D, label: \u201DStopnie zaawansowania\u201D },
  { num: \u201D20–40'\u201D, label: \u201DCzas zabiegu laserowego\u201D },
  { num: \u201D2–5 dni\u201D, label: \u201DPowrót do pracy (laser)\u201D },
  { num: \u201D3–4 tyg.\u201D, label: \u201DRekonwalescencja klasyczna\u201D },
];

const mechanismCards = [
  { icon: \u201D🫀\u201D, title: 'Naturalne \u201Epoduszeczki\u201D', desc: \u201DHemoroidy to naczyniowe poduszeczki w kanale odbytu — każdy je ma. Uszczelniają odbyt i kontrolują gazy. Problem pojawia się, gdy ulegają powiększeniu i przekrwieniu.\u201D },
  { icon: \u201D🎈\u201D, title: 'Efekt \u201Ebalonika\u201D', desc: \u201DKrew wpływa do środka, ale ma utrudniony odpływ. Balonik pęcznieje, rozciąga się — z czasem zaczyna krwawić lub wypadać na zewnątrz.\u201D },
  { icon: \u201D⚙️\u201D, title: \u201DPrzyczyny — nie geny, lecz styl życia\u201D, desc: \u201DPraca siedząca, ciągły ucisk miednicy, dieta uboga w błonnik, silne parcie, ciąża, intensywny wysiłek z bezdechem — to mechanika, nie higiena.\u201D },
];

const dietPoints = [
  \u201DStudiują diety bogatoresztkowe i wpływ błonnika na miękkość stolca.\u201D,
  \u201DZgłębiają rolę mikrobioty jelitowej i odpowiedniego nawodnienia.\u201D,
  \u201DSięgają po suplementację: babka płesznik, magnez, probiotyki.\u201D,
];

const sportsQuit = [\u201DKolarstwo\u201D, \u201DJazda konna\u201D, \u201DTrójbój siłowy\u201D, \u201DPodnoszenie ciężarów\u201D];
const sportsStart = [\u201DPływanie\u201D, \u201DSpacery\u201D, \u201DJoga\u201D, \u201DStretching\u201D];

const ergonomyItems = [
  { icon: \u201D🍩\u201D, title: \u201DPoduszka ortopedyczna\u201D, desc: 'Poduszki z otworem (tzw. \u201Eoponki\u201D) redukujące ucisk na odbyt podczas siedzenia.' },
  { icon: \u201D🖥️\u201D, title: \u201DBiurko stojące\u201D, desc: \u201DBiurka do pracy stojącej eliminujące wielogodzinny ucisk miednicy.\u201D },
  { icon: \u201D🚿\u201D, title: \u201DNakładka bidetowa\u201D, desc: \u201DNakładki bidetowe na WC zapewniające delikatną higienę bez podrażnień.\u201D },
  { icon: \u201D🦶\u201D, title: \u201DPodnóżek toaletowy\u201D, desc: \u201DPodnóżki wymuszające fizjologiczną pozycję kucania podczas wypróżniania.\u201D },
];

const tabuCards = [
  { icon: \u201D👁️\u201D, title: 'Syndrom \u201ECichego Obserwatora\u201D', desc: \u201DHemoroidy to paraliżujące tabu. Pacjenci nie lajkują, nie komentują i nie udostępniają postów klinik ze swoich prywatnych profili. Ich aktywność toczy się wyłącznie w Dark Social — prywatne wiadomości, kopiowanie linków bez śladu.\u201D },
  { icon: \u201D🎭\u201D, title: \u201DMigracja do anonimowych stref\u201D, desc: \u201DSzukają wsparcia na zamkniętych grupach Facebook — często zakładając fałszywe konta — oraz na anonimowych forach. Pytają o brutalnie szczere doświadczenia z bólem po operacji.\u201D },
  { icon: \u201D⭐\u201D, title: 'Weryfikacja \u201Emiękkich\u201D kompetencji lekarza', desc: \u201DNa etapie przed operacją tytuł naukowy ma mniejsze znaczenie niż słowa-klucze od innych pacjentów w opiniach.\u201D },
];

const softSkillTags = ['\u201Dlekarz empatyczny\u201D', '\u201Ddelikatne badanie\u201D', '\u201Dnie ocenia\u201D', '\u201Dkomfortowa atmosfera\u201D', '\u201Dprzełamuje wstyd\u201D'];

const searchCategories = [
  {
    cat: \u201D🩸 Zaawansowane objawy\u201D,
    queries: [
      \u201D\u201Ewypadające guzki krwawnicze 3 i 4 stopnia\u201D\u201D,
      \u201D\u201Ezakrzepica splotu hemoroidalnego operacja\u201D\u201D,
      \u201D\u201Eogromny ból po wypróżnieniu utrzymujący się godzinami\u201D\u201D,
      \u201D\u201Ekrwawienie z odbytu i skrzepy\u201D\u201D,
    ],
  },
  {
    cat: \u201D⚖️ Porównanie metod\u201D,
    queries: [
      \u201D\u201Elaserowe usuwanie hemoroidów LHP opinie\u201D\u201D,
      \u201D\u201Emetoda Barrona a operacja klasyczna Milligana-Morgana ból\u201D\u201D,
      \u201D\u201Enajmniej inwazyjna metoda usuwania hemoroidów\u201D\u201D,
      \u201D\u201Eczy operacja hemoroidów jest pod narkozą\u201D\u201D,
    ],
  },
  {
    cat: \u201D😰 Logistyka i rekonwalescencja\u201D,
    queries: [
      \u201D\u201Epierwszy stolec po operacji proktologicznej jak przeżyć\u201D\u201D,
      \u201D\u201Eile dni L4 po operacji hemoroidów\u201D\u201D,
      \u201D\u201Eból po laserowym usunięciu hemoroidów\u201D\u201D,
      \u201D\u201Ekiedy wrócić do pracy po zabiegu proktologicznym\u201D\u201D,
    ],
  },
];

const comparisonRows = [
  { label: \u201DCo robi lekarz?\u201D, classic: \u201DWycina tkankę skalpelem lub nożyczkami elektrycznymi\u201D, laser: \u201DZamyka naczynia precyzyjną wiązką lasera od środka\u201D },
  { label: \u201DRany po zabiegu\u201D, classic: \u201DOtwarte rany, często wymagające szwów\u201D, laser: \u201DMikroskopijne nakłucie — brak ran otwartych\u201D },
  { label: \u201DPoziom bólu\u201D, classic: \u201DWysoki (8–9/10). Silne leki przez wiele dni\u201D, laser: \u201DMinimalny (2–3/10). Zwykłe leki przeciwbólowe\u201D },
  { label: \u201DPobyt w szpitalu\u201D, classic: \u201DZazwyczaj kilka dni\u201D, laser: \u201DProcedura jednego dnia — wychodzisz po kilku godzinach\u201D },
  { label: \u201DPowrót do pracy\u201D, classic: \u201D3–4 tygodnie (L4)\u201D, laser: \u201D24–48 godzin — możliwy powrót po weekendzie\u201D },
  { label: \u201DRyzyko powikłań\u201D, classic: \u201DRyzyko uszkodzenia zwieraczy\u201D, laser: \u201DRyzyko minimalne — laser działa punktowo\u201D },
  { label: \u201DZnieczulenie\u201D, classic: \u201DZnieczulenie ogólne lub regionalne\u201D, laser: \u201DZnieczulenie miejscowe\u201D },
];

const laserSteps = [
  { num: \u201D01\u201D, icon: \u201D🚪\u201D, title: \u201DPrzyjęcie i komfort\u201D, desc: \u201DPrzychodzisz do kliniki w dniu zabiegu — bez hospitalizacji dzień wcześniej. Zabieg ambulatoryjny. Znieczulenie miejscowe — nie boli.\u201D },
  { num: \u201D02\u201D, icon: \u201D💡\u201D, title: \u201DDziałanie lasera\u201D, desc: \u201DCienkie włókno laserowe wprowadzane do wnętrza guzka. Precyzyjna wiązka zamyka naczynia krwionośne. Śluzówka i zwieracze pozostają nienaruszone. Czas: 20–40 minut.\u201D },
  { num: \u201D03\u201D, icon: \u201D🏠\u201D, title: \u201DWyjście do domu\u201D, desc: \u201DWstajesz, ubierasz się i wracasz do domu o własnych siłach. Brak szwów, brak otwartych ran. Guzek zaczyna zanikać w ciągu kilku tygodni.\u201D },
];

const degrees = [
  { deg: \u201DI°\u201D, title: \u201DStopień I\u201D, desc: \u201DLaser działa idealnie. Niemal natychmiastowa ulga. Najlepszy moment na interwencję.\u201D, color: \u201Dbg-green-100 text-green-800\u201D },
  { deg: \u201DII°\u201D, title: \u201DStopień II\u201D, desc: \u201DLaser bardzo skuteczny. Guzki wypadają podczas parcia, ale cofają się samoistnie.\u201D, color: \u201Dbg-blue-100 text-blue-800\u201D },
  { deg: \u201DIII°\u201D, title: \u201DStopień III ⚠️\u201D, desc: \u201DMoment krytyczny. Guzki wypadają, ale dają się odprowadzić. Laser wciąż metodą z wyboru.\u201D, color: \u201Dbg-yellow-100 text-yellow-800\u201D },
  { deg: \u201DIV°\u201D, title: \u201DStopień IV ❌\u201D, desc: \u201DGuzki trwale na zewnątrz. Laser może być niewystarczający. Często konieczny skalpel.\u201D, color: \u201Dbg-red-100 text-red-800\u201D },
];

const vicCircleSteps = [
  { icon: \u201D💊\u201D, title: \u201DKrok 1\u201D, desc: \u201DKupujesz maść lub czopek. Substancje przeciwbólowe i ściągające dają chwilową ulgę.\u201D },
  { icon: \u201D😌\u201D, title: \u201DKrok 2\u201D, desc: \u201DPieczenie ustępuje, obrzęk maleje. Myślisz: \u201EUff, wyleczone.\u201D\u201D },
  { icon: \u201D💻\u201D, title: \u201DKrok 3\u201D, desc: \u201DWracasz do pracy, siadasz 8 godzin przed komputerem — mechanizm startuje od nowa.\u201D },
  { icon: \u201D📈\u201D, title: \u201DKrok 4\u201D, desc: \u201DKupujesz coraz droższe preparaty. Okresy ulgi coraz krótsze. Frustracja i strach rosną.\u201D },
];

const Hemoroidy = () => (
  <div className=\u201Dmin-h-screen bg-background pt-20\u201D>
    <SeoHead
      title=\u201DHemoroidy od A do Z — Kompleksowy Przewodnik Pacjenta\u201D
      description=\u201DMechanizm choroby hemoroidalnej, stopnie zaawansowania, porównanie metod leczenia (laser LHP vs klasyka) i styl życia. Dr Jan Bujok — chirurg, proktolog.\u201D
      path=\u201D/dla-pacjenta/hemoroidy\u201D
    />

    {/* HERO */}
    <ParallaxSection className=\u201Dgradient-bg py-16 md:py-24 px-4\u201D>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className=\u201Dmax-w-4xl mx-auto text-center\u201D
      >
        <p className=\u201Dtext-sm font-sans uppercase tracking-[0.15em] text-primary-foreground/80 mb-4\u201D>
          Kompleksowy Przewodnik Pacjenta
        </p>
        <h1 className=\u201Dtext-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight\u201D>
          Powrót do Komfortu — Hemoroidy od A do Z
        </h1>
        <div className=\u201Dw-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6\u201D />
        <p className=\u201Dtext-primary-foreground/90 text-base md:text-lg leading-relaxed max-w-2xl mx-auto\u201D>
          Mechanizm choroby, psychologia pacjenta, styl życia wymuszony bólem oraz nowoczesne metody leczenia — w jednym przewodniku.
        </p>
        <div className=\u201Dflex justify-center flex-wrap gap-4 md:gap-6 mt-8 px-4\u201D>
          {heroStats.map((s) => (
            <div key={s.label} className=\u201Dtext-center min-w-[100px]\u201D>
              <p className=\u201Dtext-2xl md:text-3xl font-bold text-primary-foreground\u201D>{s.num}</p>
              <p className=\u201Dtext-[10px] md:text-xs text-primary-foreground/80 mt-1\u201D>{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </ParallaxSection>

    <div className=\u201Dmax-w-5xl mx-auto px-4 py-16 space-y-24\u201D>
      <Breadcrumbs items={[{ label: \u201DDla pacjenta\u201D, href: \u201D/dla-pacjenta\u201D }, { label: \u201DHemoroidy od A do Z\u201D }]} className=\u201Dmb-4\u201D />

      {/* CHAPTER 1 — MECHANISM */}
      <motion.section {...fadeUp}>
        <h2 className=\u201Dsection-title mb-3 text-center\u201D>🩺 Dlaczego to boli? — Mechanizm choroby</h2>
        <p className=\u201Dsection-subtitle mb-10 text-center\u201D>Rozdział 1</p>
        <div className=\u201Dgrid sm:grid-cols-3 gap-6\u201D>
          {mechanismCards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className=\u201Dglass-card rounded-xl p-6 text-center\u201D
            >
              <div className=\u201Dtext-3xl mb-3\u201D>{c.icon}</div>
              <h3 className=\u201Dfont-bold text-foreground mb-2\u201D>{c.title}</h3>
              <p className=\u201Dtext-sm text-muted-foreground leading-relaxed\u201D>{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* VICIOUS CIRCLE */}
      <motion.section {...fadeUp}>
        <h2 className=\u201Dsection-title mb-3 text-center\u201D>🔄 Pułapka błędnego koła</h2>
        <p className=\u201Dsection-subtitle mb-10 text-center\u201D>Domowe sposoby vs. Medycyna — Rozdział 2</p>
        <div className=\u201Dgrid sm:grid-cols-2 lg:grid-cols-4 gap-5\u201D>
          {vicCircleSteps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className=\u201Dglass-card rounded-xl p-5 text-center relative\u201D
            >
              <div className=\u201Dtext-3xl mb-3\u201D>{s.icon}</div>
              <h4 className=\u201Dfont-bold text-foreground mb-1 text-sm\u201D>{s.title}</h4>
              <p className=\u201Dtext-xs text-muted-foreground leading-relaxed\u201D>{s.desc}</p>
              {i < vicCircleSteps.length - 1 && (
                <span className=\u201Dhidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-xl\u201D>→</span>
              )}
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className=\u201Dglass-card rounded-xl p-6 mt-8 border-l-4 border-primary max-w-3xl mx-auto\u201D
        >
          <p className=\u201Dtext-sm text-muted-foreground leading-relaxed italic\u201D>
            🚗 <strong className=\u201Dtext-foreground\u201D>Analogia:</strong> To tak, jakbyś w samochodzie ze świecącą kontrolką \u201EAwaria silnika\u201D zakleił ją taśmą izolacyjną. Nie widzisz problemu — ale silnik nadal jest zepsuty. Maść nie sprawi, że rozciągnięta tkanka \u201Ewchłonie się\u201D i wróci do pierwotnego kształtu.
          </p>
        </motion.div>
      </motion.section>

      {/* LIFESTYLE — DIET & SPORTS */}
      <motion.section {...fadeUp}>
        <h2 className=\u201Dsection-title mb-3 text-center\u201D>🏃 Zachowania Pacjenta — Styl Życia</h2>
        <p className=\u201Dsection-subtitle mb-10 text-center\u201D>Preferencje i zainteresowania wymuszone bólem</p>
        <div className=\u201Dgrid md:grid-cols-2 gap-6\u201D>
          {/* Diet */}
          <div className=\u201Dglass-card rounded-xl p-6\u201D>
            <div className=\u201Dflex items-center gap-3 mb-4\u201D>
              <div className=\u201Dw-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center text-2xl\u201D>🥗</div>
              <div>
                <h3 className=\u201Dfont-bold text-foreground\u201D>A. Nagłe zainteresowanie dietetyką</h3>
                <p className=\u201Dtext-xs text-muted-foreground\u201D>Domowy ekspert od układu pokarmowego</p>
              </div>
            </div>
            <ul className=\u201Dspace-y-2\u201D>
              {dietPoints.map((p, i) => (
                <li key={i} className=\u201Dflex items-start gap-3 text-sm text-muted-foreground\u201D>
                  <div className=\u201Dw-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5\u201D />
                  {p}
                </li>
              ))}
            </ul>
            <div className=\u201Dflex flex-wrap gap-2 mt-4\u201D>
              {[\u201DBłonnik\u201D, \u201DMikrobiota\u201D, \u201DNawodnienie\u201D, \u201DBabka płesznik\u201D].map((t) => (
                <span key={t} className=\u201Dpx-3 py-1 rounded-full bg-secondary text-xs font-semibold text-foreground\u201D>{t}</span>
              ))}
            </div>
          </div>

          {/* Sports */}
          <div className=\u201Dglass-card rounded-xl p-6\u201D>
            <div className=\u201Dflex items-center gap-3 mb-4\u201D>
              <div className=\u201Dw-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center text-2xl\u201D>🏊</div>
              <div>
                <h3 className=\u201Dfont-bold text-foreground\u201D>B. Modyfikacja aktywności sportowej</h3>
                <p className=\u201Dtext-xs text-muted-foreground\u201D>Rezygnacja z pasji — przejście na \u201Ebezpieczne\u201D</p>
              </div>
            </div>
            <div className=\u201Dgrid grid-cols-2 gap-4\u201D>
              <div>
                <p className=\u201Dtext-xs font-semibold text-destructive uppercase tracking-wider mb-2\u201D>❌ Rezygnują z:</p>
                {sportsQuit.map((s) => (
                  <p key={s} className=\u201Dtext-sm text-muted-foreground mb-1\u201D>{s}</p>
                ))}
              </div>
              <div>
                <p className=\u201Dtext-xs font-semibold text-green-600 uppercase tracking-wider mb-2\u201D>✅ Przechodzą na:</p>
                {sportsStart.map((s) => (
                  <p key={s} className=\u201Dtext-sm text-muted-foreground mb-1\u201D>{s}</p>
                ))}
              </div>
            </div>
            <p className=\u201Dtext-xs text-muted-foreground mt-4 leading-relaxed\u201D>
              Z żalem rezygnują z pasji zwiększających ciśnienie w jamie brzusznej lub uciskających dno miednicy.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ERGONOMICS */}
      <motion.section {...fadeUp}>
        <h2 className=\u201Dsection-title mb-3 text-center\u201D>🪑 Styl Życia — Ergonomia</h2>
        <p className=\u201Dsection-subtitle mb-10 text-center\u201D>
          \u201EGadżeciarstwo\u201D ergonomiczne — osoby wykonujące pracę siedzącą masowo interesują się ergonomią
        </p>
        <div className=\u201Dgrid sm:grid-cols-2 lg:grid-cols-4 gap-5\u201D>
          {ergonomyItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className=\u201Dglass-card rounded-xl p-5 text-center\u201D
            >
              <div className=\u201Dtext-3xl mb-3\u201D>{item.icon}</div>
              <h4 className=\u201Dfont-bold text-foreground text-sm mb-1\u201D>{item.title}</h4>
              <p className=\u201Dtext-xs text-muted-foreground leading-relaxed\u201D>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* SOCIAL MEDIA TABOO */}
      <motion.section {...fadeUp}>
        <h2 className=\u201Dsection-title mb-3 text-center\u201D>📱 Zachowania w Mediach Społecznościowych</h2>
        <p className=\u201Dsection-subtitle mb-10 text-center\u201D>Efekt Tabu i \u201EDark Social\u201D</p>
        <div className=\u201Dspace-y-5 max-w-3xl mx-auto\u201D>
          {tabuCards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className=\u201Dglass-card rounded-xl p-6 flex gap-5 items-start\u201D
            >
              <div className=\u201Dshrink-0 w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl\u201D>
                {c.icon}
              </div>
              <div>
                <h3 className=\u201Dfont-bold text-foreground mb-1\u201D>{c.title}</h3>
                <p className=\u201Dtext-sm text-muted-foreground leading-relaxed\u201D>{c.desc}</p>
                {c.title.includes(\u201Dkompetencji\u201D) && (
                  <div className=\u201Dflex flex-wrap gap-2 mt-3\u201D>
                    {softSkillTags.map((t) => (
                      <span key={t} className=\u201Dpx-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary\u201D>{t}</span>
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
        <h2 className=\u201Dsection-title mb-3 text-center\u201D>🔍 Dół Lejka Decyzyjnego</h2>
        <p className=\u201Dsection-subtitle mb-10 text-center max-w-3xl mx-auto\u201D>
          Osoba o krok od stołu operacyjnego — jej zapytania są medyczne, precyzyjne i nacechowane strachem
        </p>
        <div className=\u201Dgrid md:grid-cols-3 gap-6\u201D>
          {searchCategories.map((cat, ci) => (
            <motion.div
              key={cat.cat}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: ci * 0.1 }}
              className=\u201Dglass-card rounded-xl p-6\u201D
            >
              <h3 className=\u201Dfont-bold text-foreground mb-4 text-sm\u201D>{cat.cat}</h3>
              <ul className=\u201Dspace-y-3\u201D>
                {cat.queries.map((q, i) => (
                  <li key={i} className=\u201Dflex items-start gap-2 text-xs text-muted-foreground leading-relaxed\u201D>
                    <span className=\u201Dtext-primary shrink-0\u201D>🔎</span>
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
        <h2 className=\u201Dsection-title mb-3 text-center\u201D>⚡ Skalpel czy Laser?</h2>
        <p className=\u201Dsection-subtitle mb-10 text-center\u201D>Rozdział 3 — Porównanie metod leczenia</p>
        <div className=\u201Dglass-card rounded-2xl overflow-hidden max-w-4xl mx-auto\u201D>
          <div className=\u201Dgrid grid-cols-3 text-xs font-semibold uppercase tracking-wider border-b border-border\u201D>
            <div className=\u201Dp-4 text-muted-foreground\u201D>Cecha</div>
            <div className=\u201Dp-4 text-muted-foreground text-center\u201D>🔪 Klasyczna</div>
            <div className=\u201Dp-4 text-primary text-center\u201D>⚡ Laser LHP</div>
          </div>
          {comparisonRows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`grid grid-cols-3 text-sm ${i < comparisonRows.length - 1 ? \u201Dborder-b border-border/50\u201D : \u201D\u201D}`}
            >
              <div className=\u201Dp-4 text-foreground font-medium\u201D>{row.label}</div>
              <div className=\u201Dp-4 text-muted-foreground text-center\u201D>{row.classic}</div>
              <div className=\u201Dp-4 text-primary text-center font-semibold\u201D>{row.laser}</div>
            </motion.div>
          ))}
        </div>

        {/* Pain comparison */}
        <div className=\u201Dgrid sm:grid-cols-2 gap-5 mt-8 max-w-2xl mx-auto\u201D>
          <div className=\u201Drounded-xl bg-red-50 dark:bg-red-950/30 p-6 text-center\u201D>
            <p className=\u201Dtext-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 mb-2\u201D>Ból po operacji klasycznej</p>
            <p className=\u201Dtext-5xl font-black text-red-700 dark:text-red-400\u201D>8–9/10</p>
            <p className=\u201Dtext-xs text-red-600 dark:text-red-500 mt-2\u201D>Silne leki opioidowe przez wiele dni</p>
          </div>
          <div className=\u201Drounded-xl bg-green-50 dark:bg-green-950/30 p-6 text-center\u201D>
            <p className=\u201Dtext-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400 mb-2\u201D>Dyskomfort po zabiegu laserowym</p>
            <p className=\u201Dtext-5xl font-black text-green-700 dark:text-green-400\u201D>2–3/10</p>
            <p className=\u201Dtext-xs text-green-600 dark:text-green-500 mt-2\u201D>Zwykłe leki przeciwbólowe OTC</p>
          </div>
        </div>
      </motion.section>

      {/* CHAPTER 4 — LASER STEPS */}
      <motion.section {...fadeUp}>
        <h2 className=\u201Dsection-title mb-3 text-center\u201D>🏥 Jak wygląda zabieg laserowy LHP?</h2>
        <p className=\u201Dsection-subtitle mb-10 text-center\u201D>Rozdział 4 — Krok po kroku</p>
        <div className=\u201Dgrid sm:grid-cols-3 gap-6\u201D>
          {laserSteps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className=\u201Dglass-card rounded-xl p-6 relative overflow-hidden\u201D
            >
              <span className=\u201Dabsolute top-3 right-4 text-5xl font-black text-muted-foreground/10\u201D>{s.num}</span>
              <div className=\u201Dtext-3xl mb-3\u201D>{s.icon}</div>
              <h4 className=\u201Dfont-bold text-foreground mb-2\u201D>{s.title}</h4>
              <p className=\u201Dtext-sm text-muted-foreground leading-relaxed\u201D>{s.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className=\u201Dglass-card rounded-xl p-6 mt-8 border-l-4 border-primary max-w-3xl mx-auto\u201D
        >
          <p className=\u201Dtext-sm text-muted-foreground leading-relaxed italic\u201D>
            \u201EŻałuję tylko jednej rzeczy — że zwlekałem tak długo i męczyłem się niepotrzebnie przez te wszystkie lata.\u201D
            <span className=\u201Dblock text-xs mt-2 not-italic text-muted-foreground/70\u201D>— typowa reakcja pacjenta po zakończonym leczeniu</span>
          </p>
        </motion.div>
      </motion.section>

      {/* CHAPTER 5 — DEGREE SCALE */}
      <motion.section {...fadeUp}>
        <h2 className=\u201Dsection-title mb-3 text-center\u201D>📊 Czy kwalifikujesz się do zabiegu?</h2>
        <p className=\u201Dsection-subtitle mb-10 text-center\u201D>Rozdział 5 — Skala zaawansowania</p>
        <div className=\u201Dgrid sm:grid-cols-2 lg:grid-cols-4 gap-4\u201D>
          {degrees.map((d, i) => (
            <motion.div
              key={d.deg}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`rounded-xl p-5 text-center ${d.color}`}
            >
              <p className=\u201Dtext-3xl font-black mb-2\u201D>{d.deg}</p>
              <h4 className=\u201Dfont-bold text-sm mb-2\u201D>{d.title}</h4>
              <p className=\u201Dtext-xs leading-relaxed\u201D>{d.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className=\u201Dglass-card rounded-xl p-6 mt-8 border-l-4 border-destructive max-w-3xl mx-auto\u201D
        >
          <p className=\u201Dtext-sm text-foreground leading-relaxed\u201D>
            <strong>⏰ Czas działa na Twoją niekorzyść.</strong>{\u201D \u201D}
            Każdy miesiąc zwlekania i leczenia \u201Ena własną rękę\u201D przybliża Cię do momentu, w którym lekarz powie: \u201EPrzykro mi, na laser jest już za późno, musimy ciąć.\u201D
            Nie pozwól, aby strach lub wstyd odebrały Ci szansę na komfortowe leczenie.
          </p>
        </motion.div>
      </motion.section>

      {/* CTA */}
      <motion.section {...fadeUp} className=\u201Dglass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto\u201D>
        <div className=\u201Dtext-4xl mb-4\u201D>🎯</div>
        <h2 className=\u201Dtext-2xl font-bold text-foreground mb-3\u201D>
          Twój następny krok — Konsultacja kwalifikacyjna
        </h2>
        <p className=\u201Dtext-muted-foreground leading-relaxed mb-6\u201D>
          Niezobowiązująca wizyta, podczas której lekarz oceni stopień zaawansowania, potwierdzi kwalifikację do LHP, przedstawi plan leczenia i odpowie na wszystkie pytania — bez pośpiechu i wstydu.
        </p>
        <Button variant=\u201Dhero\u201D size=\u201Dlg\u201D asChild>
          <a href=\u201Dhttps://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa\u201D target=\u201D_blank\u201D rel=\u201Dnoopener noreferrer\u201D>
            Sprawdź dostępne terminy
          </a>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default Hemoroidy;
