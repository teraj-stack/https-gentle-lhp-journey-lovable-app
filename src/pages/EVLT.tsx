import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import EVLTComparisonChart from "@/components/evlt/ComparisonChart";
import RiskFactorsChart from "@/components/evlt/RiskFactorsChart";
import EVLTFAQ from "@/components/evlt/EVLTFAQ";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";

const evltSummary = [
  { label: "Przygotowanie", value: "Konsultacja flebologiczna oraz USG Doppler w celu mapowania niewydolnych żył" },
  { label: "Czas trwania", value: "Od 40 minut do 2,5 godziny" },
  { label: "Znieczulenie", value: "Miejscowe (tumescencyjne)" },
  { label: "Technika", value: "Pod kontrolą USG do niewydolnej żyły wprowadza się cienki światłowód. Energia lasera zamyka naczynie od wewnątrz." },
  { label: "Rekonwalescencja", value: "Powrót do domu po zabiegu. Pończocha uciskowa przez ok. 2 tygodnie, codzienne spacery." },
  { label: "Efekty", value: "Zamknięcie niewydolnych pni żylnych, ustąpienie bólu i obrzęków, poprawa estetyki nóg" },
  { label: "Możliwe powikłania", value: "Przejściowy ból, zasinienia, uczucie ciągnięcia wzdłuż żyły. Rzadko: zapalenie żył, przebarwienia." },
  { label: "Cena", value: "4 500 zł — cena obejmuje zabieg i wszystkie wizyty kontrolne do czasu wygojenia" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const warnings = [
  { emoji: "🧘", title: "Ciężar nóg", desc: 'Uczucie „nóg z ołowiu", nasilające się pod koniec dnia.' },
  { emoji: "👞", title: "Opuchlizna", desc: "Gromadząca się wokół kostek, znikająca po nocy." },
  { emoji: "💤", title: "Niespokojne nogi", desc: "Utrudnione zasypianie i niszczenie jakości snu." },
  { emoji: "🕸", title: "Pajączki", desc: "Widoczna fioletowa siateczka lub wypukłe żyły." },
];


const EVLT = () => (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="EVLT – Laserowe leczenie żylaków nóg"
        description="Endowenozna ablacja laserowa żylaków (EVLT) w CML. Zabieg ambulatoryjny, szybki powrót do aktywności. Warszawa, Siedlce."
        path="/leczenie/evlt"
      />
      <MedicalProcedureSchema
        name="EVLT – Endowenozna ablacja laserowa żylaków"
        description="Zamknięcie niewydolnych żył od wewnątrz za pomocą energii lasera, pod kontrolą USG. Alternatywa dla strippingu."
        bodyLocation="Żyły kończyn dolnych"
        procedureType="Percutaneous"
        preparation="Konsultacja flebologiczna oraz USG Doppler w celu mapowania niewydolnych żył"
        followup="Powrót do domu po zabiegu. Pończocha uciskowa przez ok. 2 tygodnie, codzienne spacery."
        howPerformed="Pod kontrolą USG do niewydolnej żyły wprowadza się cienki światłowód. Energia lasera zamyka naczynie od wewnątrz."
        risks="Przejściowy ból, zasinienia, uczucie ciągnięcia wzdłuż żyły. Rzadko: zapalenie żył, przebarwienia."
        url="/leczenie/evlt"
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
          Nowoczesna Flebologia
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Żylaki nóg: Odzyskaj zdrowie i lekkość kroku
        </h1>
        <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Bez skalpela, bez narkozy i bez długiej rekonwalescencji. Poznaj medycynę, która pozwala załatwić problem „raz a dobrze".
        </p>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={[{ label: "Flebologia" }, { label: "Żylaki – EVLT" }]} className="mb-4" />
      {/* Przyczyny + Sygnały */}
      <div className="grid lg:grid-cols-2 gap-12">
        <motion.section {...fadeUp}>
          <h2 className="section-title mb-3">
            <span className="text-2xl mr-2">⚠</span> Zrozumieć wroga: Przyczyny
          </h2>
          <p className="section-subtitle mb-8">
            Żylaki to nie tylko defekt wizualny, to przede wszystkim choroba naczyniowa. Choć genetyka odgrywa tu największą rolę, nasz codzienny styl życia, rodzaj wykonywanej pracy oraz wahania hormonalne znacząco przyspieszają ich rozwój.
          </p>
          <div className="glass-card p-6 rounded-2xl">
            <RiskFactorsChart />
          </div>
        </motion.section>

        <motion.section {...fadeUp}>
          <h2 className="section-title mb-3">
            <span className="text-2xl mr-2">👁</span> Sygnały ostrzegawcze
          </h2>
          <p className="section-subtitle mb-8">
            Kiedy Twój organizm woła o pomoc? Zmiany wizualne pojawiają się często na samym końcu. Nie ignoruj wcześniejszych, niewidocznych gołym okiem sygnałów.
          </p>
          <div className="space-y-4">
            {warnings.map((w, i) => (
              <motion.div
                key={w.title}
                initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card rounded-xl p-5 flex items-start gap-4"
              >
                <span className="text-2xl">{w.emoji}</span>
                <div>
                  <h4 className="font-bold text-foreground text-sm">{w.title}</h4>
                  <p className="text-muted-foreground text-sm">{w.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Mechanizm zastawek */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Mechanizm powstawania: Zastawki</h2>
        <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
          Wyobraź sobie, że w Twoich żyłach znajdują się małe, jednokierunkowe zawory. Przepuszczają krew do serca, walcząc z grawitacją. Gdy słabną, krew cofa się, tworząc wypukłe zmiany.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {/* Zdrowa żyła */}
          <div className="text-center">
            <div className="relative w-20 h-48 mx-auto border-l-[6px] border-r-[6px] border-primary/60 rounded bg-primary/5 mb-4">
              {/* Zastawki zamknięte */}
              <div className="absolute top-1/3 left-0 w-[45%] h-1 bg-primary/60 origin-left rotate-[-20deg]" />
              <div className="absolute top-1/3 right-0 w-[45%] h-1 bg-primary/60 origin-right rotate-[20deg]" />
              <div className="absolute top-2/3 left-0 w-[45%] h-1 bg-primary/60 origin-left rotate-[-20deg]" />
              <div className="absolute top-2/3 right-0 w-[45%] h-1 bg-primary/60 origin-right rotate-[20deg]" />
              {/* Strzałki w górę */}
              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-primary text-lg font-bold">↑</span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-primary text-lg font-bold">↑</span>
            </div>
            <h4 className="font-bold text-foreground text-sm">Zdrowa żyła</h4>
            <p className="text-xs text-muted-foreground max-w-[180px] mx-auto mt-1">
              Zastawki szczelnie się zamykają. Krew płynie sprawnie w kierunku serca.
            </p>
          </div>

          <span className="text-3xl text-muted-foreground hidden md:block">➞</span>
          <span className="text-3xl text-muted-foreground md:hidden rotate-90">➞</span>

          {/* Chora żyła */}
          <div className="text-center">
            <div className="relative w-24 h-48 mx-auto border-l-[6px] border-r-[6px] border-destructive/60 rounded-xl bg-destructive/5 mb-4">
              {/* Zastawki otwarte */}
              <div className="absolute top-1/3 left-0 w-[35%] h-1 bg-destructive/60 origin-left rotate-[30deg]" />
              <div className="absolute top-1/3 right-0 w-[35%] h-1 bg-destructive/60 origin-right rotate-[-30deg]" />
              <div className="absolute top-2/3 left-0 w-[35%] h-1 bg-destructive/60 origin-left rotate-[30deg]" />
              <div className="absolute top-2/3 right-0 w-[35%] h-1 bg-destructive/60 origin-right rotate-[-30deg]" />
              {/* Strzałki w dół + w górę */}
              <span className="absolute top-2 left-1/3 -translate-x-1/2 text-destructive text-lg font-bold">↓</span>
              <span className="absolute top-2 right-1/3 translate-x-1/2 text-primary text-lg font-bold">↑</span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-destructive text-lg font-bold">↓</span>
              {/* Wybrzuszenie */}
              <div className="absolute top-1/2 -left-4 w-4 h-10 rounded-l-full bg-destructive/10 border-l-[3px] border-destructive/40" />
            </div>
            <h4 className="font-bold text-foreground text-sm">Chora żyła (Żylak)</h4>
            <p className="text-xs text-muted-foreground max-w-[180px] mx-auto mt-1">
              Zastawki są niewydolne. Krew opada w dół, rozpychając ściany naczyń.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Porównanie tradycja vs nowoczesność */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Tradycja kontra Nowoczesność</h2>
        <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
          Wielu pacjentów odwleka wizytę, bojąc się bólu i „wyrywania" żył. Porównajmy stare chirurgiczne metody z naszym systemem „walk-in, walk-out" opartym na laseroterapii (EVLT) i skleroterapii.
        </p>
        <div className="glass-card p-6 rounded-2xl">
          <EVLTComparisonChart />
        </div>
      </motion.section>

      {/* Dwa kroki */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Dwa proste kroki do zdrowych nóg</h2>
        <div className="grid md:grid-cols-2 gap-8 mt-10">
          <motion.div
            initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-2xl p-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-lg">1</span>
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Precyzyjna mapa żył</h3>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-3">Bezbolesne badanie USG Doppler</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dla lekarza to narzędzie działa jak nawigacja. Pozwala zajrzeć w głąb tkanek, ocenić sytuację i zaplanować leczenie uszyte na miarę. Nie leczymy „w ciemno", dzięki czemu minimalizujemy ryzyko nawrotów.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-2xl p-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-lg">2</span>
              <span className="text-3xl">🚪</span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">System „Walk-in, walk-out"</h3>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-3">Małoinwazyjne zamykanie naczyń</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zabieg jest szybki i bezpieczny. Używamy lasera EVLT, zamykając żyłę od wewnątrz przez mikronakłucie. Używamy tylko znieczulenia miejscowego. Tego samego dnia wracasz do domu o własnych siłach.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* FAQ */}
      <EVLTFAQ fadeUp={fadeUp} />
      <ProcedureSummaryTable rows={evltSummary} fadeUp={fadeUp} />

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🩺</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Nadal masz wątpliwości?</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Zasługujesz na to, by budzić się rano bez bólu. Zadbamy o Ciebie na każdym etapie.
        </p>
        <Button variant="hero" size="lg" asChild>
          <Link to="/kontakt">Umów konsultację</Link>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default EVLT;
