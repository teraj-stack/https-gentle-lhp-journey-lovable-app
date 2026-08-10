import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { Button } from "@/components/ui/button";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";

import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import PreparationRecoveryCards from "@/components/shared/PreparationRecoveryCards";
import PreparationChecklistSection from "@/components/shared/PreparationChecklistSection";
import { preparationChecklists } from "@/content/procedures/preparationChecklists";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import MikroflebektomiaFAQ from "@/components/mikroflebektomia/MikroflebektomiaFAQ";
import VenousInsufficiencyImage from "@/components/shared/VenousInsufficiencyImage";
import VeinImageDevOverlay from "@/components/dev/VeinImageDevOverlay";
import RelatedLinks from "@/components/shared/RelatedLinks";

const summary = [
  { label: "Przygotowanie", value: "Konsultacja flebologiczna oraz USG Doppler w celu mapowania żył" },
  { label: "Czas trwania", value: "30–60 minut" },
  { label: "Znieczulenie", value: "Miejscowe" },
  { label: "Technika", value: "Przez mikronakłucia 1–2 mm lekarz usuwa wypukłe żylaki mikrohaczykami, a mniejsze odgałęzienia zamyka pianką sklerotyzującą pod kontrolą USG." },
  { label: "Rekonwalescencja", value: "Powrót do domu tego samego dnia. Pończocha uciskowa, natychmiastowy powrót do lekkiej aktywności." },
  { label: "Efekty", value: "Usunięcie dużych, wypukłych żylaków. Trwały efekt estetyczny i funkcjonalny." },
  { label: "Możliwe powikłania", value: "Przejściowe siniaki, zgrubienia, przebarwienia. Rzadko: zapalenie żył." },
  { label: "Cena", value: "3 500 zł — cena obejmuje zabieg mikrochirurgiczny, uzupełniającą skleroterapię piankową oraz wszystkie wizyty kontrolne do czasu wygojenia" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const advantages = [
  { emoji: "✔", title: "Bez narkozy", desc: "Zabieg odbywa się w znieczuleniu miejscowym. Zachowujesz pełną świadomość i nie czujesz bólu." },
  { emoji: "✔", title: "Bez skalpela", desc: "Nie wykonujemy długich cięć. Używamy precyzyjnych narzędzi wprowadzanych przez mikronakłucia." },
  { emoji: "✔", title: "Bez szwów", desc: "Ślady są tak mikroskopijne (1–2 mm), że zabezpieczamy je jedynie drobnymi plasterkami (steri-stripami)." },
];

const steps = [
  { emoji: "🔍", title: "Mapowanie żył (USG Doppler)", desc: "Nigdy nie działamy w ciemno. Tworzymy dokładną mapę drogową Twoich nóg, lokalizując ukryte źródło problemu i nieszczelne zastawki milimetr po milimetrze." },
  { emoji: "💉", title: "Znieczulenie miejscowe", desc: "Okolica żylaka jest całkowicie znieczulana. Jesteś z nami w kontakcie, czujesz się komfortowo i unikasz obciążającej narkozy." },
  { emoji: "🩶", title: "Mikronakłucia i usunięcie", desc: "Przez otworki wielkości 1–2 mm (ślad jak po pobraniu krwi), lekarz usuwa wypukły, chory żylak przy użyciu delikatnych mikrohaczyków." },
  { emoji: "🧴", title: "Medyczna pianka (skleroterapia)", desc: "Dopełnienie efektu. Do mniejszych odgałęzień podajemy gęstą piankę, która szczelnie wypełnia i trwale skleja zepsute naczynia od środka." },
  { emoji: "🚶", title: "Plasterki i powrót do domu", desc: "Naklejamy steri-stripy, zakładamy pończochę uciskową, a Ty wstajesz z fotela i od razu wracasz do swoich aktywności. Zero blizn, zero hospitalizacji." },
];

const packageItems = [
  "Zabieg mikrochirurgiczny",
  "Uzupełniająca skleroterapia piankowa",
  "Najwyższej jakości jednorazowy sprzęt",
  "Profesjonalna opieka i natychmiastowa mobilność",
];

const Mikroflebektomia = () => (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="Mikroflebektomia w CML | Usuwanie żylaków | Warszawa"
      description="Mikroflebektomia piankowa usuwa duże, wypukłe żylaki przez nakłucia 1–2 mm, bez narkozy i szwów. Szybki powrót do normalności. Umów wizytę w CML. Zapraszamy."
      path="/leczenie/mikroflebektomia"
    />
    <MedicalWebPageSchema
      name="Mikroflebektomia piankowa – usuwanie żylaków bez skalpela"
      description="Mikroflebektomia piankowa – usuwanie dużych żylaków przez mikronakłucia 1–2 mm, bez narkozy, bez szwów."
      path="/leczenie/mikroflebektomia"
      specialty="Phlebology"
    />
    <MedicalProcedureSchema
      name="Mikroflebektomia piankowa"
      description="Usuwanie wypukłych żylaków przez mikronakłucia 1–2 mm z uzupełniającą skleroterapią piankową. Bez narkozy, bez szwów, bez hospitalizacji."
      bodyLocation="Żyły kończyn dolnych"
      procedureType="Percutaneous"
      preparation="Konsultacja flebologiczna oraz USG Doppler w celu mapowania żył"
      followup="Powrót do domu tego samego dnia. Pończocha uciskowa, natychmiastowy powrót do lekkiej aktywności."
      howPerformed="Przez mikronakłucia 1–2 mm lekarz usuwa wypukłe żylaki mikrohaczykami, a mniejsze odgałęzienia zamyka pianką sklerotyzującą pod kontrolą USG."
      risks="Przejściowe siniaki, zgrubienia, przebarwienia. Rzadko: zapalenie żył."
      url="/leczenie/mikroflebektomia"
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
          Flebologia zabiegowa
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Mikroflebektomia Piankowa
        </h1>
        <div className="w-16 h-0.5 mx-auto bg-primary-foreground/30 mb-6" />
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Pozbądź się dużych, wypukłych żylaków bez skalpela, szwów i pobytu w szpitalu.
        </p>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
      <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/mikroflebektomia"]} className="mb-4" />

      {/* Anatomia żylaków — co usuwamy mikroflebektomią */}
      <VenousInsufficiencyImage
        pageKey="mikroflebektomia"
        fadeUp={fadeUp}
        title="Co dokładnie usuwa mikroflebektomia?"
        subtitle={`„Sznury" pod skórą to żylaki bocznic — żył, w których ścianki osłabły, zastawki przestały się domykać, a krew zaczęła się cofać. Mikroflebektomia usuwa je z drobnych nakłuć, bez nacinania skóry.`}
        mainAlt="Schemat porównawczy zdrowej żyły i żylakowatej bocznicy — poszerzone naczynie z niedomykalnością zastawek i refluksem (cofaniem krwi), które mikroflebektomia usuwa mechanicznie z mikronakłuć"
        mainCaption="Zdrowa bocznica · Żylakowata bocznica · Refluks w bocznicy · Usunięcie z mikronakłuć"
        perforatorAlt="Schemat niewydolnego perforatora — często zasila żylakowate bocznice usuwane mikroflebektomią; jego ocena USG Doppler decyduje o zakresie zabiegu"
        perforatorCaption="Niewydolny perforator · Zasila żylakowatą bocznicę · Ocena USG Doppler przed zabiegiem"
      />
      <VeinImageDevOverlay pageKey="mikroflebektomia" />
      {/* Intro */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Przełom w leczeniu zaawansowanych żylaków</h2>
        <div className="glass-card rounded-2xl p-8 md:p-10 max-w-3xl mx-auto">
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
            Wiele osób borykających się z zaawansowanymi żylakami zwleka z wizytą u lekarza w obawie przed bolesną operacją, narkozą i długą rekonwalescencją. Jeśli myślisz, że Twoje żylaki (<span className="text-primary font-semibold">"grube sznurki"</span>) są "zbyt duże na laser" – mamy dla Ciebie przełomową wiadomość. Współczesna medycyna pozwala usunąć je w sposób <span className="text-primary font-bold">w pełni małoinwazyjny</span>.
          </p>
        </div>
      </motion.section>

      {/* Zalety */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Dlaczego pacjenci wybierają nową metodę?</h2>
        <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
          Tradycyjne operacje chirurgiczne wiązały się z ogromnym obciążeniem dla organizmu. Zobacz, jak drastycznie mikroflebektomia redukuje inwazyjność leczenia.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {advantages.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-lg mb-4">
                {item.emoji}
              </div>
              <h3 className="font-bold text-foreground text-base mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Przebieg leczenia — krok po kroku */}
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Przebieg leczenia: Krok po kroku</h2>
        <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
          Mikroflebektomia piankowa to inteligentny duet dwóch technik medycznych, gwarantujący trwały efekt i najwyższe bezpieczeństwo.
        </p>
        <div className="max-w-2xl mx-auto space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative pl-12 pb-8 last:pb-0 border-l-4 border-primary/30 last:border-l-transparent"
            >
              <div className="absolute -left-[1.15rem] top-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold border-4 border-background">
                {i + 1}
              </div>
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{step.emoji}</span>
                  <h3 className="font-bold text-foreground text-sm">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Cena */}
      <motion.section {...fadeUp}>
        <div className="glass-card rounded-2xl p-8 md:p-12 max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Pełen pakiet w jednej cenie</p>
          <div className="text-4xl md:text-5xl font-bold text-foreground mb-4">3 500 zł</div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            W tej cenie zyskujesz kompleksowe rozwiązanie problemu. Nie ma ukrytych kosztów, nie ma długich tygodni zwolnienia lekarskiego, które uszczuplają Twój budżet domowy.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-left max-w-md mx-auto mb-8">
            {packageItems.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✔</span>
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
          <Button variant="hero" size="lg" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
              Zadbaj o lekkość nóg już dziś
            </a>
          </Button>
        </div>
      </motion.section>

      {/* FAQ */}
      <MikroflebektomiaFAQ fadeUp={fadeUp} />

      {/* Karta zabiegu */}
      <ProcedureSummaryTable rows={summary} fadeUp={fadeUp} />

      

      <PreparationChecklistSection
        checklist={preparationChecklists.mikroflebektomia}
        pageUrl="https://mcml.pro/leczenie/mikroflebektomia"
      />

      <PreparationRecoveryCards
        procedureLabel="Mikroflebektomia piankowa"
        preparationDescription="Leki, nawodnienie, brak golenia nóg i pończocha uciskowa II klasy w gotowości. Wszystko, czego potrzebujesz przed mikronakłuciami."
        preparationHref="/dla-pacjenta/przygotowanie-mikroflebektomia"
        recoveryDescription="Kompresjoterapia, codzienne spacery, pielęgnacja mikronakłuć — droga do szybkiego powrotu bez żylaków."
        recoveryHref="/dla-pacjenta/zalecenia-po-mikroflebektomii"
      />

      <RecoveryBoostBanner />

      <TestimonialsSection />

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🧬</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Nadal masz wątpliwości?</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Zasługujesz na to, by budzić się rano bez bólu i kompleksów. Zadbamy o Ciebie na każdym etapie.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów konsultację</a>
        </Button>
      </motion.section>
    </div>
      <RelatedLinks path="/leczenie/mikroflebektomia" />

  </div>
);

export default Mikroflebektomia;
