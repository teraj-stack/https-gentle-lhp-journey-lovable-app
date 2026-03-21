import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import AnatomyDiagram from "@/components/pajaczki/AnatomyDiagram";

/* ── animation presets ── */
const reveal = {
  initial: { opacity: 0, y: 32, filter: "blur(6px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

/* ── chapter definitions ── */
const chapters = [
  { id: "intro", label: "Wstęp" },
  { id: "ch1", label: "Przyczyny" },
  { id: "ch2", label: "Ryzyko" },
  { id: "ch3", label: "Schemat" },
  { id: "ch4", label: "Leczenie" },
  { id: "ch5", label: "CLaCS" },
  { id: "ch6", label: "Fototerapia" },
  { id: "ch7", label: "Opieka" },
  { id: "ending", label: "Zakończenie" },
];

/* ── Highlight box ── */
const Highlight = ({ children }: { children: React.ReactNode }) => (
  <div className="border-l-2 border-primary/50 bg-accent/30 rounded-r-xl pl-5 pr-5 py-4 my-6">
    <p className="text-foreground/85 text-sm md:text-base leading-relaxed italic">{children}</p>
  </div>
);

/* ── Chapter label ── */
const ChapterNum = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block text-xs font-sans uppercase tracking-[0.2em] text-primary mb-3 font-semibold">
    {children}
  </span>
);

/* ── Reading progress bar ── */
const ProgressBar = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5">
      <div
        className="h-full bg-primary transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

/* ── Chapter nav (sticky) ── */
const ChapterNav = ({ activeId }: { activeId: string }) => (
  <nav className="sticky top-16 md:top-20 z-40 bg-background/90 backdrop-blur-md border-b border-border overflow-x-auto">
    <div className="max-w-5xl mx-auto px-4 flex gap-1">
      {chapters.map((ch) => (
        <a
          key={ch.id}
          href={`#${ch.id}`}
          className={`shrink-0 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
            activeId === ch.id
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {ch.label}
        </a>
      ))}
    </div>
  </nav>
);

/* ── Section wrapper with observer ── */
const Section = ({
  id,
  alt,
  children,
  onVisible,
}: {
  id: string;
  alt?: boolean;
  children: React.ReactNode;
  onVisible: (id: string) => void;
}) => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  useEffect(() => {
    if (inView) onVisible(id);
  }, [inView, id, onVisible]);

  return (
    <section
      ref={ref}
      id={id}
      className={`py-16 md:py-24 ${alt ? "bg-card" : ""}`}
    >
      <motion.div {...reveal} className="max-w-3xl mx-auto px-4 md:px-8">
        {children}
      </motion.div>
    </section>
  );
};

/* ── CLaCS steps ── */
const clacsSteps = [
  { num: "1", title: "Laser Barwnikowy", desc: "Naświetlamy naczynko specjalistycznym laserem barwnikowym. Jego energia błyskawicznie obkurcza i zwęża ścianę naczynia od wewnątrz, nie naruszając skóry." },
  { num: "2", title: "Skleroterapia", desc: "Zaledwie ułamek sekundy później, w to samo — zwężone już laserem — naczynie, wprowadzamy za pomocą cieniutkiej igły bezpieczny preparat zamykający." },
];

/* ── Main Page ── */
const EbookPajaczki = () => {
  const [activeChapter, setActiveChapter] = useState("intro");

  return (
    <div className="min-h-screen bg-background pt-20">
      <ProgressBar />

      {/* HERO */}
      <section className="relative py-24 md:py-36 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center max-w-2xl mx-auto px-4"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-[1.1]">
            Odzyskaj beztroskę.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
            Prawda o pajączkach, ukrytym ryzyku i najskuteczniejszej metodzie leczenia.
            Przewodnik dla kobiet, które mają dość ukrywania nóg.
          </p>
          <a
            href="#intro"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Rozpocznij lekturę
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </section>

      <ChapterNav activeId={activeChapter} />

      {/* WSTĘP */}
      <Section id="intro" onVisible={setActiveChapter}>
        <ChapterNum>Wstęp</ChapterNum>
        <h2 className="section-title mb-6">Znamy ten scenariusz aż za dobrze...</h2>
        <p className="text-foreground/90 leading-relaxed mb-4">
          Wyobraź sobie ciepły, letni poranek. Pakujesz walizkę na upragniony urlop albo szykujesz się na weekendowe przyjęcie. Patrzysz na tę piękną, zwiewną sukienkę przed kolano... i z ciężkim westchnieniem odkładasz ją z powrotem do szafy. Zamiast niej wyciągasz sprawdzone, długie lniane spodnie. Przewiewne, ale to wciąż długie spodnie.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Na plaży Twoim najlepszym przyjacielem stało się pareo, a siadając w kawiarni, instynktownie krzyżujesz nogi tak, by ostre światło nie obnażyło fioletowo-czerwonej siateczki pod kolanami.
        </p>
        <Highlight>
          Jeśli ten scenariusz brzmi dla Ciebie znajomo, ten e-book jest właśnie dla Ciebie. Wiele z nas żyje z „pajączkami" latami, spychając swoje potrzeby na dalszy plan.
        </Highlight>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Tłumaczymy sobie: „to tylko defekt kosmetyczny", „powinnam się z tym pogodzić", „są ważniejsze wydatki dla rodziny".
        </p>
        <p className="text-foreground/90 leading-relaxed">
          Czas z tym skończyć. W tym poradniku opowiemy Ci, dlaczego ukrywanie pajączków to niebezpieczna gra z własnym zdrowiem, dlaczego pozbycie się tego problemu wcale nie jest takie proste, jak sugerują internetowe reklamy, i wreszcie — jak nowoczesna medycyna może pomóc Ci odzyskać letnią beztroskę raz a dobrze.
        </p>
      </Section>

      {/* ROZDZIAŁ 1 */}
      <Section id="ch1" alt onVisible={setActiveChapter}>
        <ChapterNum>Rozdział 1</ChapterNum>
        <h2 className="section-title mb-6">Skąd one się w ogóle wzięły? Zdejmij z siebie poczucie winy</h2>
        <p className="text-foreground/90 leading-relaxed mb-4">
          Wiele naszych pacjentek siada w gabinecie i z rezygnacją mówi: „Zaniedbałam się, to pewnie przez brak sportu". To mit! Zanim przejdziemy do rozwiązań, musisz wiedzieć jedno: <strong className="text-primary">to nie jest Twoja wina.</strong>
        </p>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Pajączki (medycznie: <strong className="text-foreground">teleangiektazje</strong>) nie są wynikiem Twojego zaniedbania. Dlaczego naczynka popękały akurat u Ciebie? To zazwyczaj splot czynników:
        </p>
        <ul className="space-y-4 mb-6">
          {[
            { title: "Genetyka (spadek po przodkach):", text: "Jeśli Twoja mama lub babcia borykały się z pękającymi naczynkami, prawdopodobnie odziedziczyłaś po nich predyspozycje do słabszej tkanki łącznej budującej ściany żył." },
            { title: "Hormony i ciąże:", text: "Kobieca gospodarka hormonalna mocno wpływa na rozszerzanie się żył. Ciąże z kolei to dla układu krążenia tytaniczny wysiłek — to właśnie wtedy u wielu z nas pojawiają się pierwsze naczynka." },
            { title: "Twój styl życia i pracy:", text: "Godziny spędzane w pozycji siedzącej za biurkiem sprawiają, że krew musi wykonać ogromną pracę, by pokonać grawitację i wrócić do serca. Z czasem najdrobniejsze naczynka nie wytrzymują tego ciśnienia." },
          ].map((item) => (
            <li key={item.title} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p className="text-muted-foreground leading-relaxed text-sm">
                <strong className="text-foreground">{item.title}</strong> {item.text}
              </p>
            </li>
          ))}
        </ul>
        <Highlight>
          Twoje nogi ciężko dla Ciebie pracują. Fioletowa siateczka to po prostu wizualne ślady tej pracy.
        </Highlight>
      </Section>

      {/* ROZDZIAŁ 2 - Pułapka kamuflażu */}
      <Section id="ch2" onVisible={setActiveChapter}>
        <ChapterNum>Rozdział 2</ChapterNum>
        <h2 className="section-title mb-6">Pułapka kamuflażu. Dlaczego ukrywanie pajączków bywa niebezpieczne?</h2>
        <p className="text-foreground/90 leading-relaxed mb-4">
          Porozmawiajmy szczerze. Nakładanie grubych warstw samoopalacza, rajstop w sprayu czy chowanie nóg pod długimi spódnicami daje ulgę psychiczną, ale z medycznego punktu widzenia to najgorsze, co możesz zrobić.
        </p>
        <Highlight>
          Wyobraź sobie, że w Twoim samochodzie zapala się czerwona kontrolka awarii silnika, a Ty… zaklejasz ją plastrem, by nie raziła w oczy. Samochód nadal jedzie, ale problem pod maską rośnie z każdym kilometrem.
        </Highlight>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Dokładnie tak samo jest z Twoimi nogami. <strong className="text-foreground">Pajączki to bardzo często pierwszy, widoczny gołym okiem sygnał Przewlekłej Niewydolności Żylnej (PNŻ).</strong> Ukrywając je, usypiasz swoją czujność i niebezpiecznie przedłużasz czas rozpoznania tej przewlekłej choroby.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Kiedy udajesz, że problemu nie ma, krew w głębszych żyłach nadal nie krąży prawidłowo. Z upływem lat może to prowadzić do uczucia ciężkich nóg, bolesnych obrzęków, a ostatecznie — do dużych, wypukłych żylaków.
        </p>
        <Highlight>
          <strong>Zrozum to jasno:</strong> Decyzja o wizycie w klinice to nie jest egoizm czy próżność. To odpowiedzialny, profilaktyczny krok w kierunku Twojego zdrowia. Zajmując się problemem estetycznym, dajesz lekarzowi szansę na zbadanie Twoich żył (USG Doppler) i uchronienie Cię przed poważną chorobą.
        </Highlight>
      </Section>

      {/* SCHEMAT ANATOMICZNY */}
      <section id="ch3" className="py-16 md:py-24 bg-card">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <motion.div {...reveal}>
            <ChapterNum>Schemat anatomiczny</ChapterNum>
          </motion.div>
          <AnatomyDiagram fadeUp={reveal} />
        </div>
      </section>

      {/* ROZDZIAŁ 3 - Usuwanie naczynek */}
      <Section id="ch4" onVisible={setActiveChapter}>
        <ChapterNum>Rozdział 3</ChapterNum>
        <h2 className="section-title mb-6">Bądźmy szczere — usuwanie naczynek wcale nie jest proste</h2>
        <p className="text-foreground/90 leading-relaxed mb-4">
          W internecie krąży mnóstwo szkodliwych mitów. Półki w drogeriach uginają się od kremów obiecujących „zniknięcie naczynek w 7 dni", a niektóre gabinety oferują szybkie zabiegi „w przerwie na lunch".
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Jako specjaliści szanujemy nasze pacjentki, dlatego musimy postawić sprawę jasno: <strong className="text-foreground">skuteczne i trwałe zamykanie naczynek nie jest proste.</strong>
        </p>
        <Highlight>
          Żaden, nawet najdroższy kosmetyk nie jest w stanie przeniknąć pod skórę i fizycznie zamknąć uszkodzonego naczynia. Z kolei proste zabiegi (np. zwykły laser u kosmetyczki) często przynoszą rozczarowanie.
        </Highlight>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Twój układ krwionośny to skomplikowana sieć pod wysokim ciśnieniem. Widoczny pajączek to tylko „liść", który zazwyczaj jest pompowany przez ukrytą głębiej <strong className="text-foreground">żyłę zasilającą</strong> („gałąź"). Jeśli zamkniemy tylko powierzchnię, a zignorujemy źródło — problem szybko powróci.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Z naczyniami nie ma drogi na skróty. Wymagają one precyzji, czasu na gojenie i potężnej technologii. Właśnie dlatego w naszej klinice odeszliśmy od kompromisów.
        </p>
      </Section>

      {/* ROZDZIAŁ 4 - CLaCS */}
      <Section id="ch5" alt onVisible={setActiveChapter}>
        <ChapterNum>Rozdział 4</ChapterNum>
        <h2 className="section-title mb-6">Złoty Standard — Metoda CLaCS, która uderza u źródła</h2>
        <p className="text-foreground/90 leading-relaxed mb-4">
          Skoro problem jest złożony, leczenie musi być bezkompromisowe. Z dumą stosujemy metodę, która zrewolucjonizowała światową flebologię estetyczną: <strong className="text-primary">CLaCS (Cryo-Laser and Cryo-Sclerotherapy)</strong>.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          To absolutnie bezkonkurencyjne podejście, które uderza w naczynko z podwójną siłą podczas jednej sesji:
        </p>
        <div className="space-y-4 mb-6">
          {clacsSteps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="glass-card rounded-xl p-5 flex gap-5 items-start"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-lg">{step.num}</span>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <Highlight>
          Ponieważ laser wykonał już „połowę pracy", możemy użyć ułamka standardowej dawki leku. To potężna synergia, która daje spektakularne i niezwykle trwałe efekty tam, gdzie inne metody zawodzą.
        </Highlight>
      </Section>

      {/* ROZDZIAŁ 5 - Fototerapia */}
      <Section id="ch6" onVisible={setActiveChapter}>
        <ChapterNum>Rozdział 5</ChapterNum>
        <h2 className="section-title mb-6">Czas na Twój relaks. Błoga Fototerapia</h2>
        <p className="text-foreground/90 leading-relaxed mb-4">
          Najczęstsza obawa przed zabiegiem? „Czy to będzie bolało i jak moje nogi będą wyglądać tuż po?".
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Wiemy, że obawiasz się długiego gojenia. Dlatego całkowicie zmieniliśmy doświadczenie pozabiegowe, wprowadzając do procedury element <strong className="text-foreground">luksusowego relaksu</strong>.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Bezpośrednio po zamknięciu naczynek zaprosimy Cię na uzupełniającą sesję fototerapii. To niezwykle przyjemny, bezbolesny zabieg! Kładziesz się wygodnie, zamykasz oczy, a Twoje nogi są naświetlane specjalistycznym, ciepłym światłem medycznym.
        </p>
        <Highlight>
          Światło to działa jak magiczny kompres: błyskawicznie wycisza stan zapalny, łagodzi tkanki i radykalnie przyspiesza proces wchłaniania się drobnych zasinień. Zamiast wychodzić z gabinetu z uczuciem dyskomfortu, wyjdziesz z głęboko odprężonymi nogami.
        </Highlight>
      </Section>

      {/* ROZDZIAŁ 6 - Opieka */}
      <Section id="ch7" alt onVisible={setActiveChapter}>
        <ChapterNum>Rozdział 6</ChapterNum>
        <h2 className="section-title mb-6">Nasza opieka w Twoim domu — Twój naturalny rytuał</h2>
        <p className="text-foreground/90 leading-relaxed mb-4">
          Zamykanie i wchłanianie się naczynek to proces, który trwa jeszcze kilka tygodni po wizycie w klinice. Nie zostawimy Cię z tym samej.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Z naszego gabinetu nie wyjdziesz z pustymi rękami i nie wyślemy Cię do apteki po przypadkowe maści. Każda pacjentka po zabiegu otrzymuje od nas w prezencie <strong className="text-foreground">specjalnie skomponowany, autorski krem</strong>.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Został on stworzony w laboratorium na nasze zamówienie, wyłącznie z myślą o wyjątkowych potrzebach skóry w okresie zamykania naczynek. Oparty w 100% na naturalnych składnikach i potężnych ekstraktach botanicznych, działa łagodząco, uszczelniająco i głęboko nawilża.
        </p>
        <Highlight>
          Wmasowywanie go w zaciszu własnego domu zamieni się w Twój ekskluzywny, codzienny rytuał pielęgnacyjny, a Ty ze spokojem będziesz obserwować, jak Twoje nogi z każdym dniem odzyskują czysty koloryt.
        </Highlight>
      </Section>

      {/* ZAKOŃCZENIE */}
      <Section id="ending" onVisible={setActiveChapter}>
        <ChapterNum>Zakończenie</ChapterNum>
        <h2 className="section-title mb-6">Zrób ten pierwszy krok. Wreszcie dla siebie.</h2>
        <p className="text-foreground/90 leading-relaxed mb-4">
          Pajączki na nogach odbierają coś więcej niż tylko estetyczny wygląd. Odbierają Ci pewność siebie, beztroskę i luz, na który tak ciężko pracujesz każdego dnia.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Wyobraź sobie poranek za kilka tygodni. Pakujesz walizkę na wyjazd. Nie zastanawiasz się „co założyć, żeby ukryć problem". Wyciągasz z szafy ulubioną letnią sukienkę, zakładasz ją i uśmiechasz się do lustra. Na plaży nie szukasz nerwowo pareo. Czujesz w głowie absolutną, wspaniałą lekkość i spokój ducha, bo wiesz, że Twoje żyły zostały zbadane i są bezpieczne.
        </p>
        <Highlight>
          Po latach dbania o dom, pracę i bliskich, przyszedł czas, byś zainwestowała wyłącznie w swój komfort i zdrowie.
        </Highlight>

        {/* CTA */}
        <div className="mt-12 glass-card rounded-2xl p-8 text-center">
          <p className="text-xl md:text-2xl font-bold text-primary mb-6">
            Jesteś gotowa na swoje pierwsze lato bez długich spodni?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/kontakt">Umów konsultację</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/leczenie/clacs">
                Dowiedz się o CLaCS
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* E-book download */}
        <div className="mt-8 flex justify-center">
          <Button variant="outline" size="default" asChild>
            <a href="/ebooks/CLaCS-Pajaczki-Przewodnik.pdf" download>
              <Download className="w-4 h-4 mr-2" />
              Pobierz jako PDF
            </a>
          </Button>
        </div>
      </Section>
    </div>
  );
};

export default EbookPajaczki;
