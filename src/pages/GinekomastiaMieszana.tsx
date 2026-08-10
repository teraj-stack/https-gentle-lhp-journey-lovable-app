import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { CheckCircle2, AlertTriangle } from "lucide-react";
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
  { label: "Przygotowanie", value: "Konsultacja chirurgiczna, USG piersi (wykonuje chirurg podczas konsultacji), badania hormonalne i laboratoryjne" },
  { label: "Czas trwania", value: "90–150 minut" },
  { label: "Znieczulenie", value: "Ogólne lub miejscowe z sedacją" },
  { label: "Technika", value: "Liposukcja ultradźwiękowa Vaser Lipo HD tkanki tłuszczowej + chirurgiczne wycięcie gruczołu przez nacięcie wokół otoczki brodawki." },
  { label: "Rekonwalescencja", value: "Powrót do pracy po 5–10 dniach. Kamizelka uciskowa 4–6 tygodni. Pełna aktywność po 6–8 tygodniach." },
  { label: "Efekty", value: "Kompleksowa korekta: usunięcie zarówno tłuszczu, jak i gruczołu. Trwały, naturalny kształt klatki piersiowej." },
  { label: "Możliwe powikłania", value: "Obrzęk, krwiak, asymetria, zaburzenia czucia brodawki, blizny, nierówności konturu" },
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
  { q: "Czym jest ginekomastia mieszana?", a: "To najczęstsza forma ginekomastii, w której współistnieją dwa komponenty: rozrośnięty gruczoł piersiowy (twardy guzek pod brodawką) oraz nadmiar tkanki tłuszczowej wokół niego. Wymaga podwójnego podejścia chirurgicznego." },
  { q: "Dlaczego potrzebuję dwóch technik naraz?", a: "Sama liposukcja nie usunie twardego gruczołu (jest zbyt zwarty). Samo wycięcie gruczołu nie usunie tłuszczu z obwodu piersi. Dopiero kombinacja obu metod daje kompletny, symetryczny efekt." },
  { q: "Jak długo trwa zabieg?", a: "Zabieg kombinowany trwa 90–150 minut. Najpierw wykonujemy liposukcję ultradźwiękową Vaser Lipo HD (redukcja tłuszczu + obkurczenie skóry), następnie chirurgicznie wycinamy gruczoł." },
  { q: "Czy rekonwalescencja jest dłuższa niż przy pojedynczej technice?", a: "Nieznacznie — o 2–3 dni dłuższy dyskomfort w porównaniu z samą liposukcją. Kamizelka uciskowa noszona jest przez 4–6 tygodni, jak przy ginekomastii gruczołowej." },
  { q: "Jaki jest ostateczny efekt?", a: "Płaska, symetryczna klatka piersiowa o naturalnym konturze. Efekt jest trwały — usunięty gruczoł nie odrasta, a usunięte komórki tłuszczowe nie regenerują się." },
];

const GinekomastiaMieszana = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="Ginekomastia mieszana w CML | Vaser i wycięcie"
      description="Ginekomastia mieszana: liposukcja Vaser Lipo HD i wycięcie gruczołu w jednej sesji, trwały i naturalny efekt. Umów konsultację w CML Warszawa Wilanów."
      path="/leczenie/ginekomastia-mieszana"
    />
    <MedicalWebPageSchema
      name="Ginekomastia mieszana – leczenie kombinowane"
      description="Liposukcja ultradźwiękowa Vaser Lipo HD + wycięcie gruczołu piersiowego — kompleksowe leczenie ginekomastii mieszanej."
      path="/leczenie/ginekomastia-mieszana"
      specialty="Surgery"
    />
    <MedicalProcedureSchema
      name="Leczenie ginekomastii mieszanej – liposukcja + wycięcie gruczołu"
      description="Kombinowany zabieg liposukcji ultradźwiękowej Vaser Lipo HD i chirurgicznego wycięcia gruczołu piersiowego."
      bodyLocation="Klatka piersiowa"
      procedureType="Surgical"
      preparation="Konsultacja chirurgiczna, USG piersi (wykonuje chirurg podczas konsultacji), badania hormonalne i laboratoryjne"
      followup="Kamizelka uciskowa 4–6 tygodni. Kontrola po 7 i 30 dniach."
      howPerformed="Etap 1: liposukcja ultradźwiękowa Vaser Lipo HD tkanki tłuszczowej. Etap 2: chirurgiczne wycięcie gruczołu przez nacięcie wokół otoczki brodawki."
      risks="Obrzęk, krwiak, asymetria, zaburzenia czucia brodawki, blizny, nierówności konturu"
      url="/leczenie/ginekomastia-mieszana"
    />
    <FaqSchema faqs={faqItems} name="Ginekomastia mieszana – FAQ" url="https://gentle-lhp-journey.lovable.app/leczenie/ginekomastia-mieszana" />

    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-3xl">
          <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">Ginekomastia</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-6">
            Ginekomastia mieszana
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
            Najczęstsza forma — połączenie rozrostu gruczołu i nadmiaru tłuszczu. Wymaga podwójnego podejścia: liposukcji ultradźwiękowej Vaser Lipo HD i chirurgicznego wycięcia gruczołu w jednej sesji.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/ginekomastia-mieszana"]} />

    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Czym jest ginekomastia mieszana?</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p><strong>Ginekomastia mieszana</strong> to najczęstsza postać powiększonych piersi u mężczyzn. Łączy dwa komponenty: rozrośniętą tkankę gruczołową (twardy guzek pod brodawką) oraz nadmiar tkanki tłuszczowej wokół gruczołu i na obwodzie piersi.</p>
            <p>Diagnostyka USG piersi (wykonuje chirurg podczas konsultacji) jednoznacznie rozróżnia oba komponenty, co pozwala precyzyjnie zaplanować zakres zabiegu. W większości przypadków konieczne jest zastosowanie <strong>dwóch technik podczas jednej sesji operacyjnej</strong>.</p>
            <p>To podejście daje najlepsze rezultaty estetyczne — eliminujemy zarówno twardy, „kobiecy" kształt gruczołu, jak i miękki nadmiar tłuszczu, uzyskując płaską, naturalną klatkę piersiową.</p>
          </div>
        </motion.div>
      </div>
    </section>

    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">Przebieg zabiegu kombinowanego</motion.h2>
        <div className="space-y-6">
          {[
            { step: "1", title: "Diagnostyka i plan", desc: "USG piersi (wykonuje chirurg podczas konsultacji) identyfikuje proporcję gruczołu do tłuszczu. Planujemy zakres liposukcji i wycięcia. Badania hormonalne wykluczają aktywną przyczynę." },
            { step: "2", title: "Etap I — Liposukcja ultradźwiękowa Vaser Lipo HD", desc: "Przez mikronakłucia (3–4 mm) wprowadzamy sondę ultradźwiękową, która selektywnie rozbija komórki tłuszczowe. Odsysamy tkankę tłuszczową z obwodu piersi. Energia ultradźwięków jednocześnie obkurcza skórę, zapobiegając jej wiotczeniu." },
            { step: "3", title: "Etap II — Wycięcie gruczołu", desc: "Przez dyskretne nacięcie wokół otoczki brodawki usuwamy twardą tkankę gruczołową. Zachowujemy cienką warstwę pod brodawką dla naturalnego wyglądu." },
            { step: "4", title: "Modelowanie końcowe", desc: "Precyzyjne wymodelowanie konturu klatki, kontrola symetrii, szwy wewnętrzne, opatrunek i kamizelka kompresyjna." },
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
            procedureLabel="Ginekomastia mieszana — Vaser HD + wycięcie gruczołu"
            variant="rich"
            preparationDescription="Mieszany zabieg = podwójna staranność przygotowania: liposukcja + nacięcie chirurgiczne. Te kroki zoptymalizują gojenie obu komponentów."
            preparationHref="/dla-pacjenta/przygotowanie-ginekomastia-mieszana"
            preparationPreviewItems={[
              "Komplet badań: morfologia, krzepliwość, EKG, grupa krwi",
              "Bez papierosów 2–4 tygodnie (gojenie rany + obkurczanie skóry)",
              "Stabilna waga + nawodnienie 2,5–3 l dziennie",
            ]}
            recoveryDescription="Kamizelka uciskowa, pielęgnacja rany po nacięciu, sygnały alarmowe — kompletny plan rekonwalescencji dzień po dniu."
            recoveryHref="/dla-pacjenta/zalecenia-po-ginekomastii"
            recoveryPreviewItems={[
              "Kamizelka uciskowa 24/7 przez 4–6 tygodni",
              "Powrót do pracy po 5–10 dniach",
              "Pełna aktywność fizyczna po 6–8 tygodniach",
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
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Kompleksowe rozwiązanie w jednym zabiegu</h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">Nie potrzebujesz dwóch osobnych operacji. Liposukcja + wycięcie gruczołu w jednej sesji — trwały efekt, szybsza rekonwalescencja.</p>
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
          </Button>
        </motion.div>
      </div>
    </section>
  </div>
);

export default GinekomastiaMieszana;
