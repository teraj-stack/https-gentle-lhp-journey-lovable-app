import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { CheckCircle2, Clock, Shield, Sparkles, AlertTriangle, Heart } from "lucide-react";
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
  { label: "Przygotowanie", value: "Konsultacja chirurgiczna, badanie USG piersi (wykonuje chirurg podczas konsultacji), ewentualne badania hormonalne" },
  { label: "Czas trwania", value: "60–120 minut" },
  { label: "Znieczulenie", value: "Ogólne lub miejscowe z sedacją" },
  { label: "Technika", value: "Liposukcja ultradźwiękowa Vaser Lipo HD i/lub wycięcie gruczołu piersiowego. Przy dużej ginekomastii – usunięcie nadmiaru skóry." },
  { label: "Rekonwalescencja", value: "Powrót do pracy po 3–7 dniach. Kamizelka uciskowa przez 4–6 tygodni. Pełna aktywność fizyczna po 6 tygodniach." },
  { label: "Efekty", value: "Płaska, męska klatka piersiowa. Trwałe rezultaty. Poprawa sylwetki i pewności siebie." },
  { label: "Możliwe powikłania", value: "Obrzęk, krwiak, asymetria, zaburzenia czucia w obrębie brodawki, blizny" },
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
  {
    question: "Czym jest ginekomastia?",
    answer: "Ginekomastia to powiększenie gruczołu piersiowego u mężczyzn. Może dotyczyć jednej lub obu piersi i wynikać z zaburzeń hormonalnych, stosowania leków, otyłości lub być idiopatyczna (bez ustalonej przyczyny).",
  },
  {
    question: "Czy ginekomastia jest niebezpieczna?",
    answer: "Ginekomastia sama w sobie nie jest groźna, ale wymaga diagnostyki w celu wykluczenia chorób endokrynologicznych, nowotworów jądra lub wątroby. Przed zabiegiem zalecamy USG piersi (wykonuje chirurg podczas konsultacji) i konsultację.",
  },
  {
    question: "Jak przebiega zabieg?",
    answer: "Zabieg polega na liposukcji tkanki tłuszczowej i/lub chirurgicznym wycięciu rozrośniętego gruczołu piersiowego. W przypadku dużego nadmiaru skóry wykonujemy dodatkową korektę. Wszystko podczas jednej sesji operacyjnej.",
  },
  {
    question: "Czy blizny będą widoczne?",
    answer: "Nacięcia wykonujemy wokół otoczki brodawki sutkowej lub w fałdzie pod piersią – blizny są dyskretne i z czasem blakną. Przy samej liposukcji ślady są minimalne (3–4 mm).",
  },
  {
    question: "Ile trwa rekonwalescencja?",
    answer: "Do pracy biurowej można wrócić po 3–7 dniach. Kamizelka uciskowa noszona jest przez 4–6 tygodni. Pełna aktywność sportowa możliwa po ok. 6 tygodniach.",
  },
  {
    question: "Czy efekty są trwałe?",
    answer: "Tak – usunięty gruczoł piersiowy nie odrasta. Warunkiem jest utrzymanie stabilnej masy ciała. W przypadku lipoginekomastii (z tkanki tłuszczowej) duży przyrost wagi może częściowo zmniejszyć efekt.",
  },
  {
    question: "Jaki jest koszt zabiegu?",
    answer: "Koszt zależy od zakresu zabiegu (sama liposukcja vs wycięcie gruczołu vs korekta skóry). Dokładną wycenę otrzymasz po konsultacji. Umów się na wizytę, aby omówić plan leczenia.",
  },
];

const indications = [
  "Powiększenie jednej lub obu piersi u mężczyzny",
  "Dyskomfort psychiczny i unikanie sytuacji bez koszulki",
  "Tkliwość lub ból w obrębie piersi",
  "Brak efektów po diecie i ćwiczeniach (prawdziwa ginekomastia)",
  "Ginekomastia po stosowaniu leków (po konsultacji endokrynologicznej)",
  "Asymetria piersi u mężczyzny",
];

const advantages = [
  { icon: Shield, title: "Minimalne blizny", desc: "Nacięcia w naturalnych fałdach skóry – dyskretne i praktycznie niewidoczne po wygojeniu." },
  { icon: Clock, title: "Szybki powrót", desc: "Praca biurowa już po 3–7 dniach. Pełna aktywność po 6 tygodniach." },
  { icon: Sparkles, title: "Trwały efekt", desc: "Usunięty gruczoł nie odrasta – efekt jest permanentny." },
  { icon: Heart, title: "Nowa pewność siebie", desc: "Płaska klatka piersiowa przywraca komfort w codziennym życiu i podczas aktywności." },
];

const Ginekomastia = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="Ginekomastia w CML | Leczenie chirurgiczne | Warszawa"
      description="Korekcja ginekomastii metodą Vaser Lipo HD i wycięcie gruczołu piersiowego — trwały efekt, minimalne blizny. Szybki powrót do formy. Umów konsultację."
      path="/leczenie/ginekomastia"
    />
    <MedicalWebPageSchema
      name="Ginekomastia – leczenie chirurgiczne"
      description="Chirurgiczne leczenie ginekomastii – liposukcja i wycięcie gruczołu piersiowego. Trwałe efekty, dyskretne blizny."
      path="/leczenie/ginekomastia"
      specialty="Surgery"
    />
    <MedicalProcedureSchema
      name="Leczenie chirurgiczne ginekomastii"
      description="Liposukcja ultradźwiękowa Vaser Lipo HD i/lub wycięcie gruczołu piersiowego w celu przywrócenia męskiego kształtu klatki piersiowej."
      bodyLocation="Klatka piersiowa"
      procedureType="Surgical"
      preparation="Konsultacja chirurgiczna, badanie USG piersi (wykonuje chirurg podczas konsultacji), ewentualne badania hormonalne"
      followup="Kamizelka uciskowa przez 4–6 tygodni. Kontrola po 7 i 30 dniach."
      howPerformed="Liposukcja ultradźwiękowa Vaser Lipo HD tkanki tłuszczowej i/lub chirurgiczne wycięcie rozrośniętego gruczołu piersiowego przez nacięcie wokół otoczki brodawki."
      risks="Obrzęk, krwiak, asymetria, zaburzenia czucia w obrębie brodawki, blizny"
      url="/leczenie/ginekomastia"
    />
    <FaqSchema
      faqs={faqItems.map(f => ({ q: f.question, a: f.answer }))}
      name="Ginekomastia – FAQ"
      url="https://gentle-lhp-journey.lovable.app/leczenie/ginekomastia"
    />

    {/* Hero */}
    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-3xl">
          <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">Chirurgia Estetyczna</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-6">
            Ginekomastia
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
            Powiększone piersi u mężczyzn to problem, który dotyka nawet co trzeciego mężczyznę. Nowoczesne leczenie chirurgiczne przywraca płaską klatkę piersiową i pewność siebie.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/ginekomastia"]} />

    {/* Co to jest */}
    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            Czym jest ginekomastia?
          </h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>
              <strong>Ginekomastia</strong> to powiększenie tkanki gruczołowej piersi u mężczyzn. Może występować jednostronnie lub obustronnie i dotyczy mężczyzn w każdym wieku — od okresu dojrzewania po wiek dojrzały.
            </p>
            <p>
              Wyróżniamy <strong>prawdziwą ginekomastię</strong> (rozrost gruczołu piersiowego) oraz <strong>pseudoginekomastię</strong> (lipoginekomastię) — powiększenie piersi spowodowane nadmiarem tkanki tłuszczowej. W praktyce często współistnieją oba komponenty.
            </p>
            <p>
              Problem może wynikać z zaburzeń hormonalnych, stosowania niektórych leków (np. antyandrogeny, steroidy anaboliczne), chorób wątroby lub być idiopatyczny. Niezależnie od przyczyny — jest to jeden z najczęstszych powodów dyskomfortu psychicznego u mężczyzn.
            </p>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Wskazania */}
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
          Wskazania do zabiegu
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-4">
          {indications.map((item, i) => (
            <motion.div key={i} {...stagger(i)} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-foreground text-sm">{item}</p>
            </motion.div>
          ))}
        </div>
        <motion.div {...fadeUp} className="mt-8 p-5 rounded-xl border-l-4 border-l-primary bg-primary/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Ważne:</strong> Przed zabiegiem konieczna jest diagnostyka (USG piersi (wykonuje chirurg podczas konsultacji), ewentualne badania hormonalne) w celu ustalenia przyczyny i wykluczenia patologii wymagających innego leczenia.
            </p>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Przebieg zabiegu */}
    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
          Jak przebiega zabieg?
        </motion.h2>
        <div className="space-y-6">
          {[
            { step: "1", title: "Konsultacja i diagnostyka", desc: "Badanie fizykalne, USG piersi (wykonuje chirurg podczas konsultacji), omówienie oczekiwań. Planowanie zakresu zabiegu: liposukcja, wycięcie gruczołu lub kombinacja obu metod." },
            { step: "2", title: "Liposukcja ultradźwiękowa Vaser Lipo HD", desc: "Przez mikronakłucia (3–4 mm) wprowadzamy sondę ultradźwiękową, która selektywnie rozbija i odsysa nadmiar tkanki tłuszczowej. Energia ultradźwięków dodatkowo obkurcza skórę, poprawiając jej sprężystość." },
            { step: "3", title: "Wycięcie gruczołu", desc: "Jeśli obecna jest tkanka gruczołowa — usuwamy ją przez dyskretne nacięcie wokół otoczki brodawki sutkowej. To klucz do trwałego efektu." },
            { step: "4", title: "Modelowanie i zamknięcie", desc: "Precyzyjne modelowanie konturu klatki piersiowej. Szwy wewnętrzne, opatrunek uciskowy, założenie kamizelki kompresyjnej." },
          ].map((item, i) => (
            <motion.div key={i} {...stagger(i)} className="flex gap-5 p-6 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Zalety */}
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
          Dlaczego warto?
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-6">
          {advantages.map((item, i) => (
            <motion.div key={i} {...stagger(i)} className="p-6 rounded-2xl bg-card border border-border">
              <item.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Tabela podsumowująca */}
    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
          Zabieg w skrócie
        </motion.h2>
        <motion.div {...fadeUp}>
          <ProcedureSummaryTable rows={summary} />
         </motion.div>

         <div className="mt-16">
           <PreparationRecoveryCards
             procedureLabel="Ginekomastia — diagnostyka i leczenie"
             variant="rich"
             preparationDescription="Niezależnie od wariantu (gruczołowa, tłuszczowa, mieszana) — przygotowanie wygląda podobnie. Te kroki obniżą ryzyko powikłań i przyspieszą powrót do formy."
             preparationHref="/dla-pacjenta/przygotowanie-ginekomastii"
             preparationPreviewItems={[
               "Bez papierosów 2–4 tygodnie przed zabiegiem",
               "Lekkie ubranie rozpinane z przodu na dzień zabiegu",
               "Komplet badań krwi i ewentualne EKG (mężczyźni 40+)",
             ]}
             recoveryDescription="Kamizelka uciskowa, spokojny powrót do aktywności, plan dzień po dniu — to samo dla wszystkich wariantów ginekomastii."
             recoveryHref="/dla-pacjenta/zalecenia-po-ginekomastii"
             recoveryPreviewItems={[
               "Kamizelka uciskowa nieprzerwanie przez 4–6 tygodni",
               "Powrót do pracy po 3–7 dniach",
               "Pełna aktywność fizyczna po 6 tygodniach",
             ]}
           />
         </div>

         <RecoveryBoostBanner />

         <TestimonialsSection />
      </div>
    </section>

    {/* FAQ */}
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
          Najczęściej zadawane pytania
        </motion.h2>
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <motion.details key={i} {...stagger(i)} className="group p-5 rounded-2xl bg-card border border-border cursor-pointer">
              <summary className="font-semibold text-foreground list-none flex items-center justify-between">
                {item.question}
                <span className="text-primary transition-transform group-open:rotate-45 text-xl ml-4">+</span>
              </summary>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">
                {item.answer}
              </p>
            </motion.details>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 md:py-28 gradient-hero">
      <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Odzyskaj pewność siebie
          </h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Umów się na konsultację, aby omówić plan leczenia ginekomastii. Dyskretnie, profesjonalnie, z trwałym efektem.
          </p>
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
          </Button>
        </motion.div>
      </div>
    </section>
  </div>
);

export default Ginekomastia;
