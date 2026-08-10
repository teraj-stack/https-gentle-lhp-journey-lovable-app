import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { CheckCircle2, Shield, Clock, Sparkles } from "lucide-react";
import ParallaxSection from "@/components/ui/parallax-section";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import FaqSchema from "@/components/shared/FaqSchema";
import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import PreparationRecoveryCards from "@/components/shared/PreparationRecoveryCards";
import TestimonialsSection from "@/components/shared/TestimonialsSection";

const summary = [
  { label: "Przygotowanie", value: "Konsultacja chirurgiczna, USG piersi (wykonuje chirurg podczas konsultacji), ocena BMI, ewentualne badania hormonalne" },
  { label: "Czas trwania", value: "45–90 minut" },
  { label: "Znieczulenie", value: "Miejscowe z sedacją (tumescencyjne)" },
  { label: "Technika", value: "Liposukcja ultradźwiękowa Vaser Lipo HD — fale ultradźwiękowe selektywnie rozbijają tkankę tłuszczową, która jest następnie odsysana. Energia ultradźwięków dodatkowo obkurcza skórę." },
  { label: "Rekonwalescencja", value: "Powrót do pracy po 2–5 dniach. Kamizelka uciskowa 3–4 tygodnie. Pełna aktywność po 4 tygodniach." },
  { label: "Efekty", value: "Redukcja objętości piersi, poprawa konturu klatki piersiowej. Efekt widoczny po ustąpieniu obrzęku (4–8 tygodni)." },
  { label: "Możliwe powikłania", value: "Obrzęk, siniaki, nierówności konturu, asymetria, minimalne blizny po wkłuciach (3–4 mm)" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const stagger = (i: number) => ({
  ...fadeUp,
  transition: { duration: 0.6, delay: i * 0.12 },
});

const faqItems = [
  { q: "Czym jest pseudoginekomastia (lipoginekomastia)?", a: "To powiększenie piersi u mężczyzn spowodowane wyłącznie nadmiarem tkanki tłuszczowej — bez rozrostu gruczołu piersiowego. Częsta u mężczyzn z nadwagą, ale może dotyczyć też szczupłych osób z genetyczną predyspozycją do odkładania tłuszczu w okolicy klatki piersiowej." },
  { q: "Czy mogę pozbyć się tego dietą i ćwiczeniami?", a: "Częściowo tak — redukcja masy ciała może zmniejszyć objętość piersi. Jednak lokalne depozyty tłuszczu często są oporne na dietę i trening. Liposukcja pozwala precyzyjnie usunąć tłuszcz z konkretnego obszaru." },
  { q: "Jak działa liposukcja ultradźwiękowa Vaser Lipo HD?", a: "Przez mikronakłucia (3–4 mm) wprowadzamy cienką sondę ultradźwiękową. Fale ultradźwiękowe selektywnie rozbijają komórki tłuszczowe, oszczędzając naczynia krwionośne i nerwy. Rozbitą tkankę tłuszczową delikatnie odsysamy. Dodatkowy efekt: energia ultradźwięków stymuluje skurcz kolagenu w skórze, co zapobiega jej wiotczeniu po zabiegu." },
  { q: "Czy tłuszcz może wrócić?", a: "Usunięte komórki tłuszczowe nie regenerują się. Jednak znaczny przyrost masy ciała (>10 kg) może spowodować powiększenie pozostałych komórek. Zalecamy utrzymanie stabilnej wagi." },
  { q: "Jakie blizny pozostaną?", a: "Minimalne — jedynie 2–3 ślady po wkłuciach o średnicy 3–4 mm, które z czasem stają się praktycznie niewidoczne." },
];

const GinekomastiaTluszczowa = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="Ginekomastia tłuszczowa w CML | Vaser Lipo HD Wilanów"
      description="Pseudoginekomastia: liposukcja ultradźwiękowa Vaser Lipo HD modeluje klatkę piersiową bez blizn. Szybki powrót do formy. Umów konsultację w CML Warszawa."
      path="/leczenie/ginekomastia-tluszczowa"
    />
    <MedicalWebPageSchema
      name="Ginekomastia tłuszczowa – liposukcja ultradźwiękowa Vaser Lipo HD"
      description="Liposukcja ultradźwiękowa Vaser Lipo HD piersi u mężczyzn z pseudoginekomastią (lipoginekomastią). Minimalne blizny, naturalny efekt."
      path="/leczenie/ginekomastia-tluszczowa"
      specialty="Surgery"
    />
    <MedicalProcedureSchema
      name="Liposukcja ultradźwiękowa Vaser Lipo HD – ginekomastia tłuszczowa"
      description="Liposukcja ultradźwiękowa Vaser Lipo HD nadmiaru tkanki tłuszczowej w obrębie klatki piersiowej u mężczyzn."
      bodyLocation="Klatka piersiowa"
      procedureType="Surgical"
      preparation="Konsultacja chirurgiczna, USG piersi (wykonuje chirurg podczas konsultacji), ocena BMI, ewentualne badania hormonalne"
      followup="Kamizelka uciskowa 3–4 tygodnie. Kontrola po 7 i 30 dniach."
      howPerformed="Liposukcja ultradźwiękowa Vaser Lipo HD — fale ultradźwiękowe selektywnie rozbijają tkankę tłuszczową, odsysanie, obkurczanie skóry."
      risks="Obrzęk, siniaki, nierówności konturu, asymetria"
      url="/leczenie/ginekomastia-tluszczowa"
    />
    <FaqSchema faqs={faqItems} name="Ginekomastia tłuszczowa – FAQ" url="https://gentle-lhp-journey.lovable.app/leczenie/ginekomastia-tluszczowa" />

    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-3xl">
          <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">Ginekomastia</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-6">
            Ginekomastia tłuszczowa
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
            Pseudoginekomastia — nadmiar tkanki tłuszczowej w obrębie piersi. Liposukcja ultradźwiękowa Vaser Lipo HD precyzyjnie modeluje klatkę piersiową, pozostawiając minimalne ślady.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/ginekomastia-tluszczowa"]} />

    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Czym jest ginekomastia tłuszczowa?</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p><strong>Pseudoginekomastia</strong> (lipoginekomastia) to powiększenie piersi u mężczyzn spowodowane wyłącznie nadmiarem tkanki tłuszczowej — bez rozrostu gruczołu piersiowego.</p>
            <p>To najczęstsza forma „męskich piersi". Może towarzyszyć ogólnej nadwadze, ale nierzadko dotyczy mężczyzn o prawidłowym BMI, u których tłuszcz lokalizuje się preferencyjnie w okolicy klatki piersiowej.</p>
            <p>Tkanka tłuszczowa jest miękka w dotyku, równomiernie rozłożona (bez twardego guzka pod brodawką). USG piersi (wykonuje chirurg podczas konsultacji) potwierdza brak komponentu gruczołowego.</p>
          </div>
        </motion.div>
      </div>
    </section>

    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">Przebieg zabiegu</motion.h2>
        <div className="space-y-6">
          {[
            { step: "1", title: "Znieczulenie tumescencyjne", desc: "Wstrzykujemy roztwór znieczulający, który dodatkowo zwęża naczynia krwionośne — minimalizuje krwawienie i siniaki." },
            { step: "2", title: "Liposukcja ultradźwiękowa Vaser Lipo HD", desc: "Przez 2–3 mikronakłucia (3–4 mm) wprowadzamy sondę ultradźwiękową. Fale ultradźwiękowe selektywnie rozbijają komórki tłuszczowe, oszczędzając naczynia i nerwy. Rozbitą tkankę delikatnie odsysamy." },
            { step: "3", title: "Obkurczanie skóry", desc: "Energia ultradźwięków stymuluje produkcję kolagenu w skórze — skóra obkurcza się i dopasowuje do nowego konturu. To kluczowa przewaga nad klasyczną liposukcją." },
            { step: "4", title: "Kompresja", desc: "Założenie kamizelki uciskowej, która wspiera gojenie i modeluje kształt klatki piersiowej przez 3–4 tygodnie." },
          ].map((item, i) => (
            <motion.div key={i} {...stagger(i)} className="flex gap-5 p-6 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">{item.step}</div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">Zabieg w skrócie</motion.h2>
        <motion.div {...fadeUp}><ProcedureSummaryTable rows={summary} /></motion.div>

        <div className="mt-16">
          <PreparationRecoveryCards
            procedureLabel="Ginekomastia tłuszczowa — Vaser Lipo HD"
            variant="rich"
            preparationDescription="Aby Vaser HD precyzyjnie wymodelował klatkę piersiową — kluczowe są stabilna waga, dobre nawodnienie i czysta skóra. Krótka checklista przed zabiegiem."
            preparationHref="/dla-pacjenta/przygotowanie-ginekomastia-tluszczowa"
            preparationPreviewItems={[
              "Stabilna waga przez kilka tygodni przed zabiegiem",
              "Bez papierosów 2–4 tygodnie (kluczowe dla obkurczania skóry)",
              "Nawodnienie 2,5–3 l wody dziennie",
            ]}
            recoveryDescription="Kamizelka uciskowa, masaże limfatyczne, stopniowy powrót do aktywności — plan rekonwalescencji po Vaser Lipo HD."
            recoveryHref="/dla-pacjenta/zalecenia-po-ginekomastii"
            recoveryPreviewItems={[
              "Kamizelka uciskowa 24/7 przez 3–4 tygodnie",
              "Powrót do pracy biurowej po 2–5 dniach",
              "Pełna aktywność fizyczna po 4 tygodniach",
            ]}
          />
        </div>

        <RecoveryBoostBanner />

        <TestimonialsSection />
      </div>
    </section>

    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">Najczęściej zadawane pytania</motion.h2>
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <motion.details key={i} {...stagger(i)} className="group p-5 rounded-2xl bg-card border border-border cursor-pointer">
              <summary className="font-semibold text-foreground list-none flex items-center justify-between">
                {item.q}
                <span className="text-primary transition-transform group-open:rotate-45 text-xl ml-4">+</span>
              </summary>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">{item.a}</p>
            </motion.details>
          ))}
        </div>
      </div>
    </section>

    <section className="py-20 md:py-28 gradient-hero">
      <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Precyzyjne modelowanie bez widocznych blizn</h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">Liposukcja ultradźwiękowa Vaser Lipo HD to złoty standard leczenia ginekomastii tłuszczowej. Umów się na konsultację.</p>
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
          </Button>
        </motion.div>
      </div>
    </section>
  </div>
);

export default GinekomastiaTluszczowa;
