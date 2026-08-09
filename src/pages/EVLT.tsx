import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { Button } from "@/components/ui/button";
import EVLTComparisonChart from "@/components/evlt/ComparisonChart";
import RiskFactorsChart from "@/components/evlt/RiskFactorsChart";
import EVLTFAQ from "@/components/evlt/EVLTFAQ";
import EVLTAnatomy from "@/components/evlt/EVLTAnatomy";
import EVLTValves from "@/components/evlt/EVLTValves";
import CEAPSection from "@/components/evlt/CEAPSection";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import PreparationRecoveryCards from "@/components/shared/PreparationRecoveryCards";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import VenousInsufficiencyImage from "@/components/shared/VenousInsufficiencyImage";
import VeinImageDevOverlay from "@/components/dev/VeinImageDevOverlay";

const evltSummary = [
  { label: "Przygotowanie", value: "Konsultacja flebologiczna oraz USG Doppler w celu mapowania niewydolnych żył" },
  { label: "Czas trwania", value: "Od 40 minut do 2,5 godziny" },
  { label: "Znieczulenie", value: "Miejscowe (tumescencyjne)" },
  { label: "Technika", value: "Pod kontrolą USG do niewydolnej żyły wprowadza się cienki światłowód. Energia lasera zamyka naczynie od wewnątrz." },
  { label: "Rekonwalescencja", value: "Powrót do domu po zabiegu. Pończocha uciskowa przez ok. 2 tygodnie, codzienne spacery." },
  { label: "Efekty", value: "Zamknięcie niewydolnych pni żylnych, ustąpienie bólu i obrzęków, poprawa estetyki nóg" },
  { label: "Możliwe powikłania", value: "Przejściowy ból, zasinienia, uczucie ciągnięcia wzdłuż żyły. Rzadko: zapalenie żył, przebarwienia." },
  { label: "Cena", value: "Od 5 500 zł — cena obejmuje zabieg i wszystkie wizyty kontrolne do czasu wygojenia" },
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
      description="Endowenozna ablacja laserowa żylaków (EVLT) w CML. Zabieg ambulatoryjny, szybki powrót do aktywności. Warszawa."
      path="/leczenie/evlt"
    />
    <MedicalWebPageSchema
      name="EVLT – Laserowe leczenie żylaków nóg"
      description="Endowenozna ablacja laserowa żylaków (EVLT) w CML. Zabieg ambulatoryjny, szybki powrót do aktywności."
      path="/leczenie/evlt"
      specialty="Phlebology"
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
          Bez skalpela, bez narkozy i bez długiej rekonwalescencji. Jednak zależy mi na tym, aby pacjent był świadomy, że przewlekła choroba żylna jest chorobą przewlekłą i postępującą. To zmienia perspektywę, ponieważ pozwala zrozumieć dlaczego tak ważne jest okresowe badanie USG Doppler żył.
        </p>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/evlt"]} className="mb-4" />

      {/* Anatomia niewydolności żylnej — co naprawia EVLT */}
      <VenousInsufficiencyImage
        pageKey="evlt"
        fadeUp={fadeUp}
        title="Skąd biorą się żylaki — co dokładnie zamyka EVLT?"
        subtitle="EVLT zamyka chorą żyłę odpiszczelową lub odstrzałkową od środka — eliminuje refluks, który napędza żylaki, perforatorowy zastój i stan zapalny widoczne na schemacie."
        mainAlt="Schemat porównawczy zdrowej żyły i żylaka — niedomykalność zastawek w pniu żylnym powoduje refluks (cofanie krwi), który EVLT zamyka termicznie od środka"
        mainCaption="Zdrowa zastawka · Refluks w pniu żylnym · Cel EVLT · Termiczne zamknięcie żyły"
        perforatorAlt="Schemat niewydolnego perforatora — żyły łączącej układ głęboki z powierzchownym; jego refluks często współistnieje z niewydolnością pnia żylnego leczonego EVLT"
        perforatorCaption="Niewydolny perforator · Współistnieje z refluksem pnia · Diagnostyka USG Doppler przed EVLT"
      />
      <VeinImageDevOverlay pageKey="evlt" />

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

      <EVLTAnatomy fadeUp={fadeUp} />
      <EVLTValves fadeUp={fadeUp} />
      <CEAPSection fadeUp={fadeUp} />

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

      <EVLTFAQ fadeUp={fadeUp} />
      <ProcedureDeepDive content={evltDeepDive} fadeUp={fadeUp} />
      <ProcedureSummaryTable rows={evltSummary} fadeUp={fadeUp} />

      <PreparationRecoveryCards
        procedureLabel="EVLT — laserowe zamknięcie żył"
        variant="rich"
        preparationDescription="Krótka lista, która ułatwi pracę lasera i Twoje samopoczucie — bez stresu i bez przerwy w codziennych planach."
        preparationHref="/dla-pacjenta/przygotowanie-evlt"
        preparationPreviewItems={[
          "Nawodnienie 2–2,5 l wody na dzień przed zabiegiem",
          "Bez golenia i kremów na nogach na 24 h przed",
          "Lekki posiłek 2 h przed wizytą — nie jesteś na czczo",
        ]}
        recoveryDescription="Pończocha uciskowa, spacery, kontrole USG — dokładny plan rekonwalescencji po EVLT, dzień po dniu."
        recoveryHref="/dla-pacjenta/zalecenia-po-evlt"
        recoveryPreviewItems={[
          "Pończocha II klasy ucisku przez 7 dni",
          "Spacer 30–60 min jeszcze tego samego dnia",
          "Kontrolne USG po 7–10 dniach od zabiegu",
        ]}
      />

      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🩺</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Nadal masz wątpliwości?</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Zasługujesz na to, by budzić się rano bez bólu. Zadbamy o Ciebie na każdym etapie.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów konsultację</a>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default EVLT;
