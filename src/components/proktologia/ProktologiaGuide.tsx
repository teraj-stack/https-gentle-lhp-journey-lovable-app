import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import FaqSchema from "@/components/shared/FaqSchema";

const anim = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const symptoms = [
  {
    title: "Krwawienie przy wypróżnieniu",
    body: "Jasnoczerwona krew na papierze lub na powierzchni stolca najczęściej wskazuje na chorobę hemoroidalną albo szczelinę odbytu. Krew ciemna, zmieszana ze stolcem lub śluzem, wymaga pilnej diagnostyki endoskopowej — nigdy nie zakładamy z góry, że to „tylko hemoroidy”.",
    href: "/leczenie/lhp",
    label: "Leczenie hemoroidów (LHP)",
  },
  {
    title: "Silny ból podczas i po wypróżnieniu",
    body: "Ostry, przeszywający ból utrzymujący się kilkadziesiąt minut po wypróżnieniu to typowy obraz szczeliny odbytu ze wtórnym skurczem zwieracza. Ból głęboki, tępy, bez związku z wypróżnieniem sugeruje raczej spazm mięśnia łonowo-odbytniczego.",
    href: "/leczenie/szczelina",
    label: "Szczelina odbytu",
  },
  {
    title: "Wyciek ropy lub treści surowiczej",
    body: "Nawracające sączenie z otworu przy odbycie, często poprzedzone bolesnym ropniem, to obraz przetoki okołoodbytniczej. Sama przetoka nie zamknie się samoistnie — wymaga leczenia zabiegowego oszczędzającego zwieracz.",
    href: "/leczenie/filac",
    label: "Przetoki – FiLaC",
  },
  {
    title: "Sączenie w szparze międzypośladkowej",
    body: "Bolesny guz lub przewlekłe sączenie nad kością ogonową to zwykle zatoka włosowa (torbiel pilonidalna). Klasyczne wycięcie oznacza tygodnie gojenia — leczenie laserowe pozwala tego uniknąć.",
    href: "/leczenie/silac",
    label: "Torbiel pilonidalna – SiLaC",
  },
  {
    title: "Świąd, pieczenie, uczucie wilgoci",
    body: "Przewlekły świąd odbytu rzadko jest chorobą samą w sobie — najczęściej towarzyszy zapaleniu odbytu, wypadającym guzkom, fałdom skórnym utrudniającym higienę lub reakcji na kosmetyki i chusteczki nawilżane.",
    href: "/leczenie/anusitis",
    label: "Zapalenie odbytu",
  },
  {
    title: "Wyczuwalne fałdy i zmiany skórne",
    body: "Fałdy skórne (mariski) same w sobie nie są groźne, ale utrudniają higienę i bywają źródłem podrażnień. Ich korekta ma sens wtedy, gdy realnie przeszkadzają — nie „profilaktycznie”.",
    href: "/leczenie/plastyka",
    label: "Plastyka odbytu",
  },
];

const visitSteps = [
  {
    title: "1. Rozmowa i wywiad",
    body:
      "Zaczynamy od rozmowy w gabinecie, przy biurku, w ubraniu. Pytamy o charakter dolegliwości, rytm wypróżnień, dietę, przebyte zabiegi i choroby przewlekłe. To najważniejsza część wizyty — większość rozpoznań stawia się właśnie tutaj, a badanie je potwierdza.",
  },
  {
    title: "2. Oglądanie okolicy odbytu",
    body:
      "Badanie wykonuje się w pozycji na lewym boku z podkurczonymi nogami, pod przykryciem. Oceniamy skórę, fałdy, ujścia przetok, obecność szczeliny i wypadających guzków. Ten etap trwa dosłownie kilkadziesiąt sekund.",
  },
  {
    title: "3. Badanie palcem (per rectum)",
    body:
      "Wykonywane z żelem znieczulającym. Pozwala ocenić napięcie zwieraczy, bolesność, obecność nacieków i — u mężczyzn — gruczoł krokowy. Przy bardzo bolesnej szczelinie odstępujemy od niego i wracamy po wstępnym leczeniu.",
  },
  {
    title: "4. Anoskopia",
    body:
      "Krótkie badanie wziernikiem o średnicy palca, umożliwiające obejrzenie kanału odbytu i dolnej części odbytnicy. Trwa 1–2 minuty i pozwala ocenić stopień zaawansowania hemoroidów w skali Goligher, co bezpośrednio przekłada się na wybór metody leczenia.",
  },
  {
    title: "5. Plan leczenia i decyzja pacjenta",
    body:
      "Na koniec omawiamy rozpoznanie, opcje leczenia (także zachowawcze), realne rokowanie i koszty. Nie oczekujemy decyzji podczas wizyty. Jeśli objawy wymagają wykluczenia przyczyny onkologicznej, kierujemy na kolonoskopię przed jakimkolwiek zabiegiem.",
  },
];

const methodRows = [
  {
    problem: "Hemoroidy II–III stopnia",
    method: "LHP – laser 1470 nm",
    anesthesia: "Miejscowe lub krótkie dożylne",
    recovery: "1–3 dni",
    href: "/leczenie/lhp",
  },
  {
    problem: "Przetoka okołoodbytnicza",
    method: "FiLaC – laserowe zamknięcie kanału",
    anesthesia: "Miejscowe lub dożylne",
    recovery: "2–5 dni",
    href: "/leczenie/filac",
  },
  {
    problem: "Torbiel pilonidalna",
    method: "SiLaC – laserowe zamknięcie zatoki",
    anesthesia: "Miejscowe",
    recovery: "2–3 dni",
    href: "/leczenie/silac",
  },
  {
    problem: "Szczelina odbytu",
    method: "Leczenie zachowawcze, botoks, laser",
    anesthesia: "Miejscowe",
    recovery: "1–3 dni",
    href: "/leczenie/szczelina",
  },
  {
    problem: "Fałdy skórne, korekta okolicy",
    method: "Plastyka laserowa bez szwów",
    anesthesia: "Miejscowe",
    recovery: "2–4 dni",
    href: "/leczenie/plastyka",
  },
  {
    problem: "Przewlekły ból, spazm mięśniowy",
    method: "Diagnostyka czynnościowa, terapia celowana",
    anesthesia: "Nie dotyczy",
    recovery: "Bez przerwy",
    href: "/leczenie/spazm-lonowoodbytniczy",
  },
];

const faqs = [
  {
    q: "Czy zabiegi proktologiczne laserem bolą?",
    a: "Sam zabieg wykonywany jest w znieczuleniu, więc jest bezbolesny. Po zabiegu ból oceniany jest zwykle na 2–4 w skali 0–10 i ustępuje w ciągu kilku dni. To zasadnicza różnica wobec klasycznych operacji z otwartą raną, gdzie ból bywa silny przez 2–3 tygodnie.",
  },
  {
    q: "Czy muszę zostać w szpitalu?",
    a: "Nie. Wszystkie zabiegi laserowe wykonujemy w trybie jednodniowym — pacjent przychodzi rano i wychodzi do domu po 1–2 godzinach obserwacji. Po znieczuleniu dożylnym nie należy prowadzić samochodu tego samego dnia.",
  },
  {
    q: "Jak przygotować się do zabiegu?",
    a: "W większości przypadków nie jest potrzebna głodówka ani pełne oczyszczanie jelita. Wystarczy poranne wypróżnienie lub mikrowlewka oraz higiena okolicy. Szczegółowe zalecenia zawsze przekazujemy indywidualnie na wizycie kwalifikacyjnej.",
  },
  {
    q: "Kiedy wrócę do pracy?",
    a: "Przy pracy biurowej zwykle po 1–3 dniach, przy pracy fizycznej po 7–10 dniach. Pełna aktywność sportowa jest możliwa po 3–6 tygodniach, zależnie od rodzaju zabiegu.",
  },
  {
    q: "Czy krwawienie z odbytu zawsze oznacza hemoroidy?",
    a: "Nie. Krwawienie może pochodzić także ze szczeliny, polipa, choroby zapalnej jelit lub nowotworu. U pacjentów po 45. roku życia, z niedokrwistością, utratą masy ciała albo obciążonym wywiadem rodzinnym zawsze zalecamy kolonoskopię przed leczeniem zabiegowym.",
  },
  {
    q: "Czy zabieg laserowy uszkodzi zwieracze?",
    a: "Metody laserowe zostały zaprojektowane tak, aby oszczędzać aparat zwieraczowy — energia podawana jest wewnątrz guzka, przetoki lub zatoki, bez przecinania mięśni. Ryzyko trwałych zaburzeń trzymania stolca jest bardzo niskie i istotnie mniejsze niż po klasycznych technikach chirurgicznych.",
  },
];

const ProktologiaGuide = () => (
  <div className="container mx-auto px-4 py-16 md:py-24 space-y-20 max-w-5xl">
    <FaqSchema
      faqs={faqs}
      name="Proktologia laserowa – najczęstsze pytania"
      url="https://mcml.pro/leczenie/proktologia"
    />

    {/* Wprowadzenie */}
    <motion.section {...anim}>
      <h2 className="section-title mb-6 text-center">Czym zajmuje się proktologia</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed max-w-3xl mx-auto">
        <p>
          Proktologia to dziedzina zajmująca się chorobami odbytu, kanału odbytu i końcowego odcinka
          jelita grubego. Dolegliwości z tej okolicy dotyczą znacznej części dorosłej populacji — szacuje
          się, że objawy choroby hemoroidalnej wystąpią w ciągu życia u co drugiej osoby po 50. roku życia.
          Mimo to średni czas od pierwszych objawów do zgłoszenia się do lekarza liczy się zwykle w latach.
          Powodem jest wstyd, a nie brak dolegliwości.
        </p>
        <p>
          Konsekwencja zwlekania jest zawsze taka sama: choroba, którą we wczesnym stadium leczy się
          ambulatoryjnie w kilkanaście minut, po latach wymaga większego zabiegu i dłuższej rekonwalescencji.
          Druga konsekwencja jest poważniejsza — objawy przypisywane „hemoroidom” bywają pierwszym sygnałem
          choroby nowotworowej jelita grubego, a każdy miesiąc zwłoki ma wtedy realne znaczenie.
        </p>
        <p>
          W Centrum Medycyny Laserowej pracujemy technikami minimalnie inwazyjnymi, opartymi na laserze
          diodowym 1470 nm. Wspólnym mianownikiem tych metod jest brak rozległej rany, ochrona aparatu
          zwieraczowego i leczenie w trybie jednodniowym. Nie oznacza to jednak, że laser jest odpowiedzią
          na każdy problem — w niektórych sytuacjach klasyczna chirurgia pozostaje metodą z wyboru i mówimy
          o tym wprost podczas kwalifikacji.
        </p>
      </div>
    </motion.section>

    {/* Objawy → rozpoznanie */}
    <motion.section {...anim}>
      <h2 className="section-title mb-4 text-center">Objawy i to, co za nimi stoi</h2>
      <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-center mb-10">
        Ta sama dolegliwość może mieć kilka przyczyn. Poniższe zestawienie pomaga wstępnie zorientować się,
        w którym kierunku prowadzi diagnostyka — nie zastępuje jednak badania proktologicznego.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {symptoms.map((s) => (
          <div key={s.title} className="glass-card rounded-2xl p-6">
            <h3 className="font-heading text-xl text-foreground mb-3">{s.title}</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">{s.body}</p>
            <Link to={s.href} className="text-primary font-medium hover:underline">
              {s.label}
            </Link>
          </div>
        ))}
      </div>
    </motion.section>

    {/* Przebieg wizyty */}
    <motion.section {...anim}>
      <h2 className="section-title mb-4 text-center">Jak wygląda pierwsza wizyta</h2>
      <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-center mb-10">
        Najczęstszy powód odkładania wizyty to wyobrażenie o samym badaniu. W praktyce trwa ono kilka minut,
        jest wykonywane pod przykryciem i — poza sytuacją bardzo bolesnej szczeliny — nie sprawia bólu.
      </p>
      <ol className="space-y-5 max-w-3xl mx-auto">
        {visitSteps.map((step) => (
          <li key={step.title} className="glass-card rounded-2xl p-6">
            <h3 className="font-heading text-lg text-foreground mb-2">{step.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{step.body}</p>
          </li>
        ))}
      </ol>
    </motion.section>

    {/* Metody w skrócie */}
    <motion.section {...anim}>
      <h2 className="section-title mb-4 text-center">Metody leczenia w skrócie</h2>
      <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-center mb-10">
        Zestawienie porównawcze najczęściej wykonywanych u nas procedur. Szczegółowy opis przebiegu,
        skuteczności i powikłań znajdziesz na stronie każdego zabiegu.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 pr-4 font-heading text-foreground">Problem</th>
              <th className="py-3 pr-4 font-heading text-foreground">Metoda</th>
              <th className="py-3 pr-4 font-heading text-foreground">Znieczulenie</th>
              <th className="py-3 pr-4 font-heading text-foreground">Powrót do pracy</th>
            </tr>
          </thead>
          <tbody>
            {methodRows.map((r) => (
              <tr key={r.problem} className="border-b border-border/50 align-top">
                <td className="py-4 pr-4 text-foreground">
                  <Link to={r.href} className="hover:text-primary transition-colors">
                    {r.problem}
                  </Link>
                </td>
                <td className="py-4 pr-4 text-muted-foreground">{r.method}</td>
                <td className="py-4 pr-4 text-muted-foreground">{r.anesthesia}</td>
                <td className="py-4 pr-4 text-muted-foreground">{r.recovery}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>

    {/* Bezpieczeństwo i czerwone flagi */}
    <motion.section {...anim}>
      <h2 className="section-title mb-6 text-center">Kiedy nie zwlekać z wizytą</h2>
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-heading text-xl text-foreground mb-3">Objawy alarmowe</h3>
          <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc pl-5">
            <li>Krew ciemna, zmieszana ze stolcem lub ze śluzem</li>
            <li>Zmiana rytmu wypróżnień utrzymująca się ponad 3 tygodnie</li>
            <li>Niezamierzona utrata masy ciała lub niedokrwistość</li>
            <li>Gorączka, tętniący ból i obrzęk przy odbycie (podejrzenie ropnia)</li>
            <li>Nietrzymanie gazów lub stolca</li>
            <li>Rak jelita grubego u krewnego pierwszego stopnia</li>
          </ul>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-heading text-xl text-foreground mb-3">Nasza zasada</h3>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Żadnego zabiegu proktologicznego nie wykonujemy, dopóki nie mamy pewności, że objawy nie
            wynikają z przyczyny wymagającej innego postępowania. U pacjentów z grupy ryzyka oznacza to
            kolonoskopię przed leczeniem — nawet jeśli obraz kliniczny wydaje się jednoznaczny.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Ostry ropień okołoodbytniczy jest sytuacją pilną: wymaga nacięcia i drenażu w ciągu godzin,
            a nie planowego zabiegu laserowego. Leczenie docelowe przetoki planujemy dopiero po ustąpieniu
            ostrego zapalenia.
          </p>
        </div>
      </div>
    </motion.section>

    {/* Po zabiegu */}
    <motion.section {...anim}>
      <h2 className="section-title mb-6 text-center">Rekonwalescencja — co jest wspólne dla wszystkich zabiegów</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed max-w-3xl mx-auto">
        <p>
          Niezależnie od tego, czy leczymy hemoroidy, szczelinę czy przetokę, o komforcie pierwszych dni
          decydują te same trzy czynniki: miękki stolec, nawodnienie i ruch. Zaparcie po zabiegu jest
          najczęstszą przyczyną bólu, krwawienia i lęku przed toaletą — dlatego środki zmiękczające
          włączamy profilaktycznie, a nie dopiero wtedy, gdy pojawi się problem.
        </p>
        <p>
          Standardowo zalecamy 2–2,5 litra płynów dziennie, dietę bogatoresztkową, kąpiele nasiadowe
          w letniej wodzie oraz krótkie spacery od pierwszej doby. Odradzamy natomiast długie siedzenie
          bez przerw, saunę i gorące kąpiele, dźwiganie oraz intensywny trening z parciem przez pierwsze
          2–4 tygodnie.
        </p>
        <p>
          Kontrole pozabiegowe do czasu pełnego wygojenia są wliczone w cenę zabiegu. Ostateczny efekt
          — zwłaszcza po metodach laserowych, gdzie tkanka obkurcza się stopniowo — oceniamy dopiero
          po ok. 6 tygodniach, a nie w pierwszym tygodniu po zabiegu.
        </p>
      </div>
    </motion.section>

    {/* FAQ */}
    <motion.section {...anim}>
      <h2 className="section-title mb-10 text-center">Najczęstsze pytania</h2>
      <div className="space-y-5 max-w-3xl mx-auto">
        {faqs.map((f) => (
          <div key={f.q} className="glass-card rounded-2xl p-6">
            <h3 className="font-heading text-lg text-foreground mb-2">{f.q}</h3>
            <p className="text-muted-foreground leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>
    </motion.section>
  </div>
);

export default ProktologiaGuide;
