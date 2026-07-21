import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import FaqSchema from "@/components/shared/FaqSchema";
import { Button } from "@/components/ui/button";
import {
  Dna,
  Briefcase,
  Baby,
  CigaretteOff,
  Footprints,
  Droplet,
  Snowflake,
  Activity,
  Apple,
  Bandage,
  Sparkles,
  Zap,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Upload,
} from "lucide-react";
import schematImg from "@/assets/profilaktyka-zylakow-schemat.webp";
import RiskQuiz from "@/components/profilaktyka/RiskQuiz";
import ExercisesSection from "@/components/profilaktyka/ExercisesSection";
import VenousInsufficiencyImage from "@/components/shared/VenousInsufficiencyImage";
import VeinImageDevOverlay from "@/components/dev/VeinImageDevOverlay";

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 28, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: easeOut },
};

const riskFactors = [
  {
    icon: Dna,
    title: "Genetyka",
    desc: "Jeśli rodzice mieli żylaki, ryzyko sięga 70–90%. Geny decydują o jakości ścian żył i sprawności zastawek.",
  },
  {
    icon: Briefcase,
    title: "Praca stojąca lub siedząca",
    desc: "Brak ruchu mięśni łydki = brak „pompy mięśniowej”. Krew zalega w żyłach i rozciąga ich ściany.",
  },
  {
    icon: Baby,
    title: "Ciąża i hormony",
    desc: "Estrogen i progesteron rozluźniają ściany naczyń. Każda kolejna ciąża zwiększa ryzyko.",
  },
  {
    icon: CigaretteOff,
    title: "Styl życia",
    desc: "Otyłość, palenie, alkohol i mała aktywność fizyczna obciążają układ żylny przez dekady.",
  },
];

const symptoms = [
  "Uczucie ciężkości i zmęczenia nóg pod koniec dnia",
  "Obrzęki kostek, szczególnie w upalne dni",
  "Pulsujący ból i nocne kurcze łydek",
  "Świąd i pieczenie skóry wzdłuż żył",
  "Widoczne pajączki naczyniowe lub uwypuklone żyły",
];

const prevention = [
  {
    icon: Footprints,
    title: "Regularny ruch",
    desc: "Minimum 30 min dziennie: spacer, pływanie, rower. Aktywuje pompę mięśniową łydki — naturalny mechanizm odprowadzający krew z nóg. WAZNE: ruch należy wykonywac na swierzym powietrzu, z odsłoniętą skórą podudzi, wykonywanie aktywnosci na siłowni, w ciasnych legginsach lub długich spodniach zwiększają ryzyko żylaków ",
  },
  {
    icon: Apple,
    title: "Zdrowa dieta",
    desc: "Błonnik (warzywa, owoce, pełne ziarna) zapobiega zaparciom. Ogranicz sól (zatrzymuje wodę) i utrzymuj prawidłową masę ciała. WAŻNE: Aby błonnik spełniał swoją funkcję, w jelicie grubym ponad 50% powinny stanowić Laseczki glebowe, głównie bakterie z grupy Clostridium (metabolizują błonnik do kwasu masłowego, gwarantując dobrostan jelita grubego). Znajdziesz je na warzywach i owocach rosnących w warunkach naturalnych.",
  },
  {
    icon: Droplet,
    title: "Nawodnienie",
    desc: "1,5–2 l wody dziennie. Odwodnienie zagęszcza krew i utrudnia jej przepływ przez żyły. WAŻNE: zapotrzebowanie człowieka na wodę wynosi 30ml/kg m.c. na dobę. To oznacza, że jogurt, szklanka wody i pełnowartościowe dwa posiłki, to około 1500ml wody",
  },
  {
    icon: Snowflake,
    title: "Naprzemienne kąpiele",
    desc: "Końcowe spłukanie nóg chłodną wodą obkurcza naczynia i poprawia krążenie. Unikaj długich gorących kąpieli i sauny.",
  },
  {
    icon: Activity,
    title: "Wysoka pozycja nóg",
    desc: "15 minut dziennie z nogami uniesionymi powyżej poziomu serca. Doskonałe po pracy stojącej lub długim locie.",
  },
  {
    icon: Bandage,
    title: "Wyroby kompresyjne",
    desc: "Pończochy lub podkolanówki uciskowe (II klasa) podczas długich podróży, ciąży lub pracy stojącej. Mechanicznie wspierają żyły.",
  },
];

const habits = {
  do: [
    "Wchodź po schodach zamiast jeździć windą",
    "Rób przerwy co 60 min siedzącej pracy — wstań, przejdź się",
    "Wybieraj wygodne, płaskie obuwie z dobrym podparciem",
    "Sypiaj z lekko uniesionymi nogami (poduszka pod kostkami)",
  ],
  dont: [
    "Nie zakładaj nogi na nogę przez długi czas",
    "Unikaj obcasów wyższych niż 4 cm na co dzień",
    "Nie noś ciasnych skarpet i obcisłych pasków na biodra",
    "Nie ignoruj pierwszych pajączków — to sygnał ostrzegawczy",
  ],
};

const treatments = [
  {
    icon: Bandage,
    name: "Wyroby uciskowe",
    desc: "Pierwsza linia profilaktyki i wsparcia.",
  },
  {
    icon: Droplet,
    name: "Skleroterapia",
    desc: "Iniekcje zamykające drobne naczynia i pajączki.",
    href: "/leczenie/skleroterapia",
  },
  {
    icon: Sparkles,
    name: "CLaCS — laser estetyczny",
    desc: "Hybrydowa metoda: krioskleroterapia + laser.",
    href: "/leczenie/clacs",
  },
  {
    icon: Zap,
    name: "EVLT — laser endowenozny",
    desc: "Złoty standard leczenia żylaków pni żylnych.",
    href: "/leczenie/evlt",
  },
];

const faqs = [
  {
    q: "Czy żylakom można w pełni zapobiec?",
    a: "Jeśli masz silne predyspozycje genetyczne — nie zawsze. Ale konsekwentna profilaktyka (ruch, dieta, kompresja, kontrola masy ciała) potrafi opóźnić ich pojawienie się o 10–20 lat i znacznie złagodzić przebieg.",
  },
  {
    q: "Od jakiego wieku warto zacząć profilaktykę?",
    a: "Najlepiej już w wieku 20–30 lat, szczególnie jeśli ktoś z rodziny ma żylaki. Pierwsze pajączki bywają jedynym sygnałem zaczynającej się niewydolności żylnej.",
  },
  {
    q: "Czy podnoszenie ciężarów na siłowni szkodzi żyłom?",
    a: "Bardzo intensywny trening siłowy z zatrzymywaniem oddechu (manewr Valsalvy) zwiększa ciśnienie w żyłach jamy brzusznej i nóg. Lepsze są ćwiczenia o umiarkowanej intensywności i z prawidłowym oddychaniem.",
  },
  {
    q: "Czy bieganie pomaga, czy szkodzi przy żylakach?",
    a: "Bieganie po miękkim podłożu w dobrze dobranym obuwiu wzmacnia pompę mięśniową łydki i poprawia krążenie. Przy zaawansowanych żylakach warto skonsultować się z flebologiem i rozważyć kompresję sportową.",
  },
  {
    q: "Kiedy pajączki to sygnał, że trzeba iść do lekarza?",
    a: "Każde widoczne naczynka warto skonsultować z flebologiem i wykonać USG Doppler. Pajączki bywają „wierzchołkiem góry lodowej” — pod skórą może już rozwijać się niewydolność większych żył.",
  },
];

const ProfilaktykaZylakow = () => {
  const url = "https://bestcml.io/dla-pacjenta/profilaktyka-zylakow";

  return (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="Profilaktyka żylaków — jak dbać o nogi, by uniknąć żylaków | CML"
        description="Praktyczny przewodnik profilaktyki żylaków: czynniki ryzyka, objawy ostrzegawcze, codzienne nawyki i metody leczenia. Opracowanie flebologów CML."
        path="/dla-pacjenta/profilaktyka-zylakow"
      />
      <MedicalWebPageSchema
        name="Profilaktyka żylaków — jak dbać o nogi"
        description="Kompendium profilaktyki przewlekłej choroby żylnej: czynniki ryzyka, objawy, codzienne nawyki, metody leczenia."
        path="/dla-pacjenta/profilaktyka-zylakow"
        specialty="Phlebology"
      />
      <FaqSchema faqs={faqs} name="Profilaktyka żylaków — FAQ" url={url} />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <Breadcrumbs
            items={BREADCRUMBS_MAP["/dla-pacjenta/profilaktyka-zylakow"]}
            className="mb-8"
          />
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeOut }}
            className="max-w-3xl"
          >
            <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">
              Strefa Pacjenta · Flebologia
            </p>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground mb-6">
              Jak dbać o nogi, aby uniknąć <span className="italic text-primary">żylaków</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Żylaki to nie wyłącznie problem estetyczny — to przewlekła choroba żylna, która rozwija się latami.
              Świadoma profilaktyka potrafi opóźnić ją o dekady.
            </p>
            <a
              href="#backup"
              className="group inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors text-sm text-foreground/90"
              aria-label="Przejdź do sekcji backup postępu treningu — import historii z innego urządzenia"
            >
              <Upload className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>
                Wracasz z innego urządzenia?{" "}
                <span className="text-primary font-medium">Wczytaj swój postęp</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-primary/70 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </a>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-5xl space-y-20 pb-24">
        {/* Schemat referencyjny */}
        <motion.section {...fadeUp} className="space-y-6">
          <div className="text-center">
            <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
              Spójrz na całość
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
              Żylaki w jednym schemacie
            </h2>
            <div className="premium-divider mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Czynniki ryzyka, objawy i profilaktyka — wizualne podsumowanie, które rozwijamy poniżej.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4 md:p-8">
            <img
              src={schematImg}
              alt="Infografika: czynniki ryzyka żylaków, objawy przewlekłej niewydolności żylnej i metody profilaktyki — schemat poglądowy"
              className="w-full max-w-3xl mx-auto rounded-xl"
              loading="lazy"
            />
          </div>
        </motion.section>

        {/* Anatomia: dlaczego warto zapobiegać */}
        <VenousInsufficiencyImage
          pageKey="profilaktyka"
          fadeUp={fadeUp}
          title="Co dokładnie chronisz, dbając o nogi"
          subtitle="Profilaktyka żylaków to ochrona zastawek. Gdy zaczynają się one rozszczelniać, krew cofa się ku dołowi, ścianki słabną, a wokół naczynia narasta stan zapalny — proces, który po latach trudno cofnąć."
          mainAlt="Schemat porównawczy zdrowej zastawki żylnej i niedomykalności zastawek prowadzącej do refluksu (cofania krwi) — proces, któremu zapobiega regularny ruch, kompresjoterapia i pielęgnacja nóg"
          mainCaption="Zdrowa zastawka · Pierwsze rozszczelnienie · Refluks i stan zapalny · Etap, któremu zapobiegasz"
          perforatorAlt="Schemat niewydolnego perforatora — pokazuje, dlaczego długie stanie i siedzenie obciąża układ żylny; czynnik ryzyka, który łagodzi aktywność i kompresjoterapia"
          perforatorCaption="Niewydolny perforator · Obciążenie z długiego stania · Łagodzony ruchem i kompresją"
        />
        <VeinImageDevOverlay pageKey="profilaktyka" />

        {/* Czynniki ryzyka */}
        <section className="space-y-8">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
              Krok 1
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
              Poznaj czynniki ryzyka
            </h2>
            <div className="premium-divider mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Część z nich jest poza Twoją kontrolą — ale świadomość pozwala wdrożyć skuteczną profilaktykę.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-5">
            {riskFactors.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: easeOut }}
                  className="glass-card rounded-2xl p-6 flex gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl text-foreground mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Objawy ostrzegawcze */}
        <motion.section {...fadeUp}>
          <div className="text-center mb-8">
            <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
              Krok 2
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
              Sygnały, których nie wolno ignorować
            </h2>
            <div className="premium-divider mb-4" />
          </div>
          <div className="glass-card rounded-2xl p-8 md:p-10 max-w-2xl mx-auto">
            <ul className="space-y-4">
              {symptoms.map((s) => (
                <li key={s} className="flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/90 leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-6 italic border-t border-border/50 pt-4">
              Pierwsze pajączki naczyniowe (skala C1 wg CEAP) bywają jedynym widocznym sygnałem zaczynającej się
              niewydolności żylnej. Im wcześniej skonsultujesz je z flebologiem, tym mniej inwazyjne będzie leczenie.
            </p>
          </div>
        </motion.section>

        {/* Profilaktyka — 6 filarów */}
        <section className="space-y-8">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
              Krok 3
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
              Sześć filarów codziennej profilaktyki
            </h2>
            <div className="premium-divider mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Konsekwencja {'>'} intensywność. Drobne, codzienne nawyki działają lepiej niż okazjonalne maratony.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {prevention.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: easeOut }}
                  className="glass-card rounded-2xl p-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading text-lg text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Rób / Nie rób */}
        <motion.section {...fadeUp}>
          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
              Codzienne nawyki
            </h2>
            <div className="premium-divider mb-4" />
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="glass-card rounded-2xl p-6 md:p-8 border-l-4 border-primary">
              <h3 className="font-heading text-xl text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" /> Rób
              </h3>
              <ul className="space-y-3">
                {habits.do.map((h) => (
                  <li key={h} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <span className="text-primary mt-1">•</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card rounded-2xl p-6 md:p-8 border-l-4 border-destructive/50">
              <h3 className="font-heading text-xl text-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive/80" /> Unikaj
              </h3>
              <ul className="space-y-3">
                {habits.dont.map((h) => (
                  <li key={h} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <span className="text-destructive/70 mt-1">•</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Ćwiczenia profilaktyczne */}
        <ExercisesSection />

        {/* Quiz — Test ryzyka */}
        <motion.section {...fadeUp} className="space-y-6">
          <div className="text-center">
            <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
              Sprawdź siebie
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
              Test ryzyka żylaków
            </h2>
            <div className="premium-divider mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pięć krótkich pytań, które pomogą oszacować Twoje indywidualne ryzyko przewlekłej choroby żylnej.
            </p>
          </div>
          <RiskQuiz />
        </motion.section>

        {/* Metody leczenia — krótkie */}
        <section className="space-y-8">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
              Gdy profilaktyka to za mało
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
              Nowoczesne metody leczenia
            </h2>
            <div className="premium-divider mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Wszystkie zabiegi w CML są minimalnie inwazyjne — bez strippingu, bez blizn, z szybkim powrotem do aktywności.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {treatments.map((t, i) => {
              const Icon = t.icon;
              const inner = (
                <div className="glass-card rounded-2xl p-5 h-full flex flex-col group hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading text-base text-foreground mb-1">{t.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{t.desc}</p>
                  {t.href && (
                    <span className="text-xs font-semibold text-primary flex items-center gap-1 mt-3">
                      Zobacz <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </div>
              );
              return (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: easeOut }}
                >
                  {t.href ? <Link to={t.href} className="block h-full">{inner}</Link> : inner}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <motion.section {...fadeUp}>
          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
              Najczęstsze pytania
            </h2>
            <div className="premium-divider mb-4" />
          </div>
          <div className="space-y-3 max-w-3xl mx-auto">
            {faqs.map((f, i) => (
              <motion.details
                key={f.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="glass-card rounded-xl p-5 group"
              >
                <summary className="cursor-pointer font-semibold text-foreground flex justify-between items-center gap-4">
                  <span>{f.q}</span>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-sm text-muted-foreground leading-relaxed mt-3">{f.a}</p>
              </motion.details>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
          <div className="text-4xl mb-4">🦵</div>
          <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3">
            Zauważyłeś pierwsze pajączki?
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Konsultacja z badaniem USG Doppler pozwoli ocenić stan zastawek i zaplanować profilaktykę „skrojoną” pod Twoje żyły.
          </p>
          <Button variant="hero" size="lg" asChild>
            <a
              href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
              target="_blank"
              rel="noopener noreferrer"
            >
              Umów konsultację flebologiczną
            </a>
          </Button>
        </motion.section>
      </div>
    </div>
  );
};

export default ProfilaktykaZylakow;
