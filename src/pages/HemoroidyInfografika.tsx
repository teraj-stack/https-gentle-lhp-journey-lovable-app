import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import ComparisonCharts from "@/components/hemoroidy/ComparisonCharts";
import ReturnToWorkChart from "@/components/hemoroidy/ReturnToWorkChart";
import SatisfactionChart from "@/components/hemoroidy/SatisfactionChart";
import StatsCountUp from "@/components/hemoroidy/StatsCountUp";
import SeoHead from "@/components/shared/SeoHead";
import { StaggeredListItem } from "@/components/shared/StaggeredList";
import {
import RelatedLinks from "@/components/shared/RelatedLinks";
  User, Layers, Clock, Monitor, Dumbbell, Baby, TrendingUp,
  Apple, PersonStanding, ShieldCheck, ShieldX, Search,
  AlertTriangle, Zap, Home, Timer, CheckCircle2, XCircle,
  ArrowRight, Mail, Phone, Globe, ChevronRight, Info, Quote
} from "lucide-react";

const sectionAnim = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const HemoroidyInfografika = () => (
  <>
    <SeoHead
      title="Hemoroidy od A do Z – Infografika"
      description="Kompleksowy przewodnik po nowoczesnym leczeniu hemoroidów. Laser vs. metody klasyczne — porównanie, procedura krok po kroku, okno terapeutyczne."
      path="/dla-pacjenta/hemoroidy-infografika"
    />

    <div className="min-h-screen">
      <Breadcrumbs items={BREADCRUMBS_MAP["/dla-pacjenta/hemoroidy-infografika"]} />

      {/* HERO */}
      <motion.section {...sectionAnim} className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full">
                Przewodnik Pacjenta
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight">
                Powrót do Komfortu
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Kompleksowy przewodnik po nowoczesnym leczeniu hemoroidów — Laser vs. Metody klasyczne
              </p>
            </div>
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Dr Jan Bujok</p>
                  <p className="text-sm text-muted-foreground">Chirurg ogólny · Proktolog · Flebolog</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card rounded-xl p-5 text-center">
                  <Layers className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">IV</p>
                  <p className="text-xs text-muted-foreground">Stopnie zaawansowania</p>
                </div>
                <div className="glass-card rounded-xl p-5 text-center">
                  <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">20–40'</p>
                  <p className="text-xs text-muted-foreground">Czas trwania zabiegu</p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground mb-3">⏱ Czas powrotu do pracy</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground"><strong className="text-foreground">Laser LHP</strong> (2–5 dni)</span>
                      <span className="text-primary font-semibold">Szybko</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-[15%] rounded-full bg-primary" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground"><strong className="text-foreground">Metoda Klasyczna</strong> (3–4 tygodnie)</span>
                      <span className="text-destructive font-semibold">Wolno</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-[75%] rounded-full bg-destructive" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* MECHANIZM CHOROBY */}
      <motion.section {...sectionAnim} className="py-16 bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Mechanizm choroby</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-4">
            Hemoroidy: naturalne poduszeczki, które wymknęły się spod kontroli
          </h2>

          <div className="grid md:grid-cols-4 gap-6 mt-10">
            <div className="glass-card rounded-2xl p-6 md:col-span-1 md:row-span-2">
              <TrendingUp className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-3">Efekt „Balonika"</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Krew wpływa do środka, ale ma utrudniony odpływ. Naczynie pęcznieje, rozciąga się — z czasem zaczyna krwawić lub wypadać na zewnątrz.
              </p>
            </div>
            {[
              { icon: Monitor, title: "Praca siedząca", desc: "Stały ucisk miednicy, zastoje w splotach hemoroidalnych (kierowcy, IT, biuro)." },
              { icon: Dumbbell, title: "Intensywny wysiłek", desc: "Dźwiganie na bezdechu powoduje gwałtowne skoki ciśnienia w naczyniach." },
              { icon: Baby, title: "Ciąża i poród", desc: "Rewolucja hormonalna oraz mechaniczny ucisk rosnącej macicy." },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 glass-card rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              To mechanika, nie higiena. Przyczyną jest styl życia, nie „złe geny".
            </p>
          </div>
        </div>
      </motion.section>

      {/* STYL ŻYCIA */}
      <motion.section {...sectionAnim} className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Styl życia</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-10">
            Ból zmienia wszystko — wymuszone zmiany
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Dietetyka</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Pacjenci stają się „domowymi ekspertami od układu pokarmowego".
              </p>
              <ul className="space-y-3">
                {[
                  "Studiują diety bogatoresztkowe i wpływ błonnika na miękkość stolca.",
                  "Zgłębiają rolę mikrobioty jelitowej i odpowiedniego nawodnienia.",
                  "Stosują suplementację: babka płesznik, magnez, probiotyki.",
                ].map((item, i) => (
                  <StaggeredListItem key={item} index={i} icon={<CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />} className="flex items-start gap-2 text-sm text-muted-foreground">
                    {item}
                  </StaggeredListItem>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <PersonStanding className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Sport</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Z żalem rezygnują z pasji zwiększających ciśnienie w jamie brzusznej.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-destructive/10 rounded-xl p-4">
                  <p className="text-xs font-semibold text-destructive uppercase mb-2">Rezygnują z</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li>🚴 Kolarstwo</li>
                    <li>🐴 Jazda konna</li>
                    <li>🏋️ Trójbój siłowy</li>
                  </ul>
                </div>
                <div className="bg-primary/10 rounded-xl p-4">
                  <p className="text-xs font-semibold text-primary uppercase mb-2">Przechodzą na</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li>🏊 Pływanie</li>
                    <li>🚶 Spacery</li>
                    <li>🧘 Joga</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6 italic">
            Choroba wymusza głęboką przebudowę codziennych nawyków — od talerza po matę do ćwiczeń.
          </p>
        </div>
      </motion.section>

      {/* ERGONOMIA */}
      <motion.section {...sectionAnim} className="py-16 bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Styl życia — Ergonomia</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-4">
            Praca siedząca + ból = obsesja na punkcie ergonomii
          </h2>
          <p className="text-muted-foreground mb-10">
            Osoby wykonujące pracę siedzącą (kierowcy zawodowi, branża IT, praca biurowa) masowo inwestują w specjalistyczne akcesoria.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Poduszka ortopedyczna", desc: "\u201EOponka\u201D z otworem redukuj\u0105ca ucisk na odbyt podczas wielogodzinnego siedzenia." },
              { title: "Biurko do pracy stojącej", desc: "Eliminuje wielogodzinny ucisk miednicy. Coraz popularniejsze w środowiskach IT i biurowych." },
              { title: "Nakładka bidetowa na WC", desc: "Zapewnia delikatną higienę bez podrażnień mechanicznych. Alternatywa dla papieru toaletowego." },
              { title: "Podnóżek toaletowy", desc: "Wymusza fizjologiczną pozycję kucania podczas wypróżniania — zgodną z anatomią człowieka." },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-2xl p-6">
                <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* TABU */}
      <motion.section {...sectionAnim} className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Media społecznościowe</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-10">
            Hemoroidy to największe tabu — pacjent ukrywa się w cieniu internetu
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6">
              <ShieldX className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold text-foreground mb-3">Syndrom „Cichego Obserwatora"</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Pacjenci NIE lajkują, NIE komentują i NIE udostępniają postów klinik ze swoich prywatnych profili.
              </p>
              <p className="text-sm text-muted-foreground">
                Panicznie boją się oceny znajomych i rodziny. Cała aktywność toczy się w ukryciu.
              </p>
              <span className="inline-block mt-4 text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">🔒 DARK SOCIAL</span>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <Search className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold text-foreground mb-3">Migracja do anonimowych stref</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Ucieczka do zamkniętych grup na Facebooku (często z fałszywych alt-kont) oraz na anonimowe fora (Reddit, Pair).
              </p>
              <p className="text-sm text-muted-foreground">
                Szukają tam <strong className="text-foreground">brutalnie szczerych doświadczeń</strong> innych pacjentów, nie ufając wyglądzonemu marketingowi.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <ShieldCheck className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold text-foreground mb-3">Weryfikacja Lekarza</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tytuł naukowy profesora ma mniejsze znaczenie niż „miękkie kompetencje" w opiniach na ZnanyLekarz.pl.
              </p>
              <div className="flex flex-wrap gap-2">
                {["#lekarz empatyczny", "#delikatne badanie", "#nie ocenia", "#przełamuje wstyd"].map((tag) => (
                  <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6 italic">
            Tradycyjne reklamy nie docierają do tej grupy. Kluczowe są opinie, anonimowość i empatyczny język.
          </p>
        </div>
      </motion.section>

      {/* BOTTOM OF THE FUNNEL */}
      <motion.section {...sectionAnim} className="py-16 bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Bottom of the funnel</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-4">
            Osoba o krok od operacji szuka precyzyjnie — i z lękiem
          </h2>
          <p className="text-muted-foreground mb-10">
            Pacjent, u którego ból dezorganizuje życie, nie szuka już „maści z kory dębu". Jego zapytania są medyczne, precyzyjne i nacechowane strachem.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Zaawansowane objawy",
                queries: ["\u201Ewypadaj\u0105ce guzki krwawnicze 3 i 4 stopnia\u201D", "\u201Ezakrzepica splotu hemoroidalnego operacja\u201D", "\u201Eogromny b\u00F3l po wypr\u00F3\u017Cnieniu...\u201D", "\u201Ekrwawienie z odbytu i skrzepy\u201D"],
              },
              {
                title: "Porównanie metod",
                queries: ["\u201Elaserowe usuwanie hemoroid\u00F3w LHP opinie\u201D", "\u201Emetoda Barrona a operacja Milligana...\u201D", "\u201Enajmniej inwazyjna metoda usuwania...\u201D", "\u201Eczy operacja hemoroid\u00F3w jest pod narkoz\u0105\u201D"],
              },
              {
                title: "Logistyka i obawy",
                queries: ["\u201Epierwszy stolec po operacji jak prze\u017Cy\u0107\u201D", "\u201Eile dni L4 po operacji hemoroid\u00F3w\u201D", "\u201Eb\u00F3l po laserowym usuni\u0119ciu hemoroid\u00F3w\u201D", "\u201Ekiedy wr\u00F3ci\u0107 do pracy po zabiegu...\u201D"],
              },
            ].map((col) => (
              <div key={col.title} className="glass-card rounded-2xl p-6">
                <h3 className="font-bold text-foreground mb-4">{col.title}</h3>
                <ul className="space-y-3">
                  {col.queries.map((q, i) => (
                    <StaggeredListItem key={q} index={i} icon={<Search className="w-4 h-4 text-primary shrink-0 mt-0.5" />} className="flex items-start gap-2 text-sm text-muted-foreground">
                      {q}
                    </StaggeredListItem>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 glass-card rounded-xl p-4 flex items-start gap-3 border-l-4 border-primary">
            <p className="text-sm text-muted-foreground">
              <strong className="text-primary">PARADOKS:</strong> Przed operacją pacjenci najbardziej boją się tego, co nastąpi PO niej.
            </p>
          </div>
        </div>
      </motion.section>

      {/* PUŁAPKA BŁĘDNEGO KOŁA */}
      <motion.section {...sectionAnim} className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10">
            <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-8 md:p-10 text-primary-foreground">
              <h2 className="text-3xl font-serif font-bold mb-6">Pułapka Błędnego Koła</h2>
              <div className="bg-primary-foreground/10 rounded-xl p-6 mt-4">
                <AlertTriangle className="w-8 h-8 text-primary mb-3" />
                <blockquote className="text-sm italic leading-relaxed">
                  „To tak, jakbyś w samochodzie ze świecącą kontrolką 'Awaria silnika' zakleił ją taśmą izolacyjną. Nie widzisz problemu — ale silnik nadal jest zepsuty."
                </blockquote>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-serif font-bold text-foreground">Dlaczego domowe leczenie zawodzi?</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { num: "01", title: "Kupujesz maść", desc: "Substancje przeciwbólowe dają chwilową ulgę. Pieczenie ustępuje." },
                  { num: "02", title: "My\u015Blisz: \u201EWyleczone\u201D", desc: "Z\u0142udne poczucie bezpiecze\u0144stwa. Powr\u00F3t do starych nawyk\u00F3w." },
                  { num: "03", title: "Wracasz do pracy", desc: "8 godzin siedzenia. Mechanizm ucisku startuje od nowa." },
                  { num: "04", title: "Frustracja rośnie", desc: "Kupujesz coraz droższe preparaty, ale okresy ulgi są coraz krótsze." },
                ].map((step) => (
                  <div key={step.num} className="glass-card rounded-xl p-4">
                    <span className="text-2xl font-bold text-primary">{step.num}</span>
                    <h4 className="font-bold text-foreground text-sm mt-1">{step.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card rounded-xl p-4 border-l-4 border-primary bg-primary/5">
                <p className="text-xs font-semibold text-primary uppercase mb-1">Fakt medyczny</p>
                <p className="text-sm text-muted-foreground">
                  W zaawansowanym stadium struktura naczyń jest trwale rozciągnięta. Żadna maść nie sprawi, że tkanka „wchłonie się" i wróci do pierwotnego kształtu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* SKALPEL VS LASER */}
      <motion.section {...sectionAnim} className="py-16 bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Porównanie metod</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-10">
            Skalpel vs. Laser
          </h2>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-8 text-primary-foreground">
              <p className="text-xs uppercase tracking-widest opacity-70">Porównanie metod</p>
              <h3 className="text-3xl font-serif font-bold mt-2 mb-4">Skalpel vs. Laser</h3>
              <p className="text-sm opacity-80 mb-8">Rewolucja w proktologii zmienia zasady gry. Koniec z wyborem między bólem a chorobą.</p>
              <div className="space-y-4">
                <div className="bg-primary-foreground/10 rounded-xl p-4">
                  <p className="text-xs uppercase opacity-60">Ból: Metoda klasyczna</p>
                  <p className="text-4xl font-bold">8-9<span className="text-lg opacity-60">/10</span></p>
                  <p className="text-xs opacity-70">Silne leki opioidowe przez wiele dni</p>
                </div>
                <div className="bg-primary-foreground/10 rounded-xl p-4">
                  <p className="text-xs uppercase opacity-60">Ból: Metoda laserowa</p>
                  <p className="text-4xl font-bold text-sage">2-3<span className="text-lg opacity-60">/10</span></p>
                  <p className="text-xs opacity-70">Zwykłe leki przeciwbólowe (OTC)</p>
                </div>
              </div>
            </div>

            <div className="space-y-0">
              {[
                { label: "Działanie", classic: "Wycina tkankę skalpelem", laser: "Zamyka naczynia światłem" },
                { label: "Rany", classic: "Otwarte rany, szwy", laser: "Mikroskopijne nakłucie" },
                { label: "Szpital", classic: "Kilka dni hospitalizacji", laser: "Procedura jednego dnia" },
                { label: "Powrót do pracy", classic: "3–4 tygodnie (L4)", laser: "24–48 godzin" },
                { label: "Ryzyko", classic: "Ryzyko uszkodzenia zwieraczy", laser: "Minimalne (punktowe)" },
              ].map((row, i) => (
                <div key={row.label} className={`grid grid-cols-3 gap-4 p-4 ${i % 2 === 0 ? "bg-card/50" : ""} rounded-lg`}>
                  <span className="font-bold text-sm text-foreground">{row.label}</span>
                  <span className="text-sm text-muted-foreground">{row.classic}</span>
                  <span className="text-sm text-primary font-semibold">{row.laser}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* WYKRESY PORÓWNAWCZE */}
      <motion.section {...sectionAnim} className="py-16 bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <StatsCountUp />
        </div>
      </motion.section>

      <motion.section {...sectionAnim} className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Dane kliniczne</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-10">
            Liczby mówią same za siebie
          </h2>
          <div className="glass-card rounded-2xl p-6 md:p-10">
            <ComparisonCharts />
          </div>
          <div className="glass-card rounded-2xl p-6 md:p-10 mt-8">
            <ReturnToWorkChart />
          </div>
          <div className="glass-card rounded-2xl p-6 md:p-10 mt-8">
            <SatisfactionChart />
          </div>
        </div>
      </motion.section>

      {/* PROCEDURA LHP */}
      <motion.section {...sectionAnim} className="py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Procedura LHP</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-4">
            20–40 minut — krócej niż odcinek serialu
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mt-10 text-left">
            {[
              {
                num: "01",
                icon: Home,
                title: "Przyjęcie i komfort",
                desc: "Przychodzisz w dniu zabiegu. Brak hospitalizacji dzień wcześniej. Znieczulenie miejscowe.",
                extra: "Czy to będzie bolało? NIE.",
              },
              {
                num: "02",
                icon: Zap,
                title: "Działanie lasera",
                desc: "Precyzyjna wiązka zamyka naczynia. Guzek obkurcza się i znika. Śluzówka i zwieracze pozostają nienaruszone.",
                extra: null,
              },
              {
                num: "03",
                icon: Home,
                title: "Wyjście do domu",
                desc: "Wstajesz i wracasz o własnych siłach. Brak szwów i otwartych ran. Dyskomfort minimalny (2–3/10).",
                extra: null,
              },
            ].map((step) => (
              <div key={step.num} className="glass-card rounded-2xl p-6 relative overflow-hidden">
                <span className="absolute top-4 right-4 text-5xl font-bold text-muted/30">{step.num}</span>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
                {step.extra && (
                  <p className="text-sm text-foreground mt-3">
                    {step.extra.replace("NIE.", "")} <strong className="text-primary">NIE.</strong>
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 glass-card rounded-xl p-5 inline-flex items-start gap-3 text-left max-w-2xl mx-auto">
            <Quote className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground italic">
              „Żałuję tylko jednej rzeczy — że zwlekałem tak długo i męczyłem się niepotrzebnie przez te wszystkie lata."
              <span className="block text-xs mt-1 not-italic text-muted-foreground/70">— Pacjent po zabiegu LHP</span>
            </p>
          </div>
        </div>
      </motion.section>

      {/* OKNO TERAPEUTYCZNE */}
      <motion.section {...sectionAnim} className="py-16 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Okno terapeutyczne</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-10">
            Czas działa na Twoją niekorzyść
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { degree: "I°", color: "border-sage", bg: "", title: "Laser Idealny", desc: "Niemal natychmiastowa ulga. Najlepszy moment na interwencję. Zabieg najmniej inwazyjny.", icon: <CheckCircle2 className="w-5 h-5 text-sage" /> },
              { degree: "II°", color: "border-primary", bg: "", title: "Bardzo Skuteczny", desc: "Guzki wypadają podczas parcia, ale cofają się samoistnie. Laser wciąż daje doskonałe efekty.", icon: <CheckCircle2 className="w-5 h-5 text-primary" /> },
              { degree: "III°", color: "border-warm-beige", bg: "bg-warm-beige/5", title: "Moment Krytyczny", desc: "Guzki wypadają, ale dają się odprowadzić. Ostatnia szansa na uniknięcie skalpela.", icon: <AlertTriangle className="w-5 h-5 text-warm-beige" /> },
              { degree: "IV°", color: "border-destructive", bg: "bg-destructive/5", title: "Laser Niewystarczający", desc: "Guzki trwale na zewnątrz. Często jedyną drogą pozostaje tradycyjna operacja z bolesną rekonwalescencją.", icon: <XCircle className="w-5 h-5 text-destructive" /> },
            ].map((stage) => (
              <div key={stage.degree} className={`glass-card rounded-2xl p-5 border-t-4 ${stage.color} ${stage.bg} text-left`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-foreground">{stage.degree}</span>
                  {stage.icon}
                </div>
                <h3 className="font-bold text-foreground text-sm mb-2">{stage.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{stage.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl bg-card border border-destructive/30 p-5 max-w-3xl mx-auto">
            <p className="text-sm text-muted-foreground">
              <Timer className="w-4 h-4 text-destructive inline mr-1" />
              Każdy miesiąc zwlekania przybliża Cię do momentu, w którym lekarz powie:
              <span className="block text-destructive font-semibold mt-1 italic">
                „Przykro mi, na laser jest już za późno, musimy ciąć."
              </span>
            </p>
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section {...sectionAnim} className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-semibold tracking-widest uppercase text-primary">Podsumowanie</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-2 mb-6">
                Decyzja należy do Ciebie
              </h2>
              <div className="border-l-4 border-primary pl-6 space-y-3">
                <p className="text-muted-foreground italic">
                  Wstajesz rano, pijesz kawę. Jedziesz do pracy. Wieczorem bawisz się z dziećmi.
                </p>
                <p className="text-foreground font-bold italic">
                  I przez cały ten czas... nie myślisz o swoim ciele.
                </p>
                <p className="text-muted-foreground italic">To jest definicja zdrowia.</p>
              </div>
              <div className="mt-6 glass-card rounded-xl p-4 flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Problemy proktologiczne nie znikają same.</strong> Zatrzymaj ten proces na własnych warunkach.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-8">
                <h3 className="text-xl font-bold text-foreground mb-4">Twój następny krok</h3>
                <ul className="space-y-3">
                  {[
                    "Ocena stopnia zaawansowania",
                    "Kwalifikacja do metody LHP",
                    "Dokładny plan leczenia i koszt",
                    "Odpowiedzi na wszystkie pytania",
                  ].map((item, i) => (
                    <StaggeredListItem key={item} index={i} icon={<CheckCircle2 className="w-4 h-4 text-primary" />} className="flex items-center gap-2 text-sm text-muted-foreground">
                      {item}
                    </StaggeredListItem>
                  ))}
                </ul>
              </div>
              <div className="glass-card rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary" />
                  drbujok@gmail.com
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 text-primary" />
                  <strong className="text-foreground">572 001 200</strong>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4 text-primary" />
                  ZnanyLekarz.pl
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-5 text-center text-primary-foreground">
                <span className="text-xs uppercase tracking-widest opacity-70">Bonus</span>
                <p className="text-xs opacity-70 mt-1">Dla czytelników e-booka</p>
                <p className="font-bold mt-1">Pierwszeństwo terminu konsultacji</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
      <RelatedLinks path="/dla-pacjenta/hemoroidy-infografika" />

  </>
);

export default HemoroidyInfografika;
