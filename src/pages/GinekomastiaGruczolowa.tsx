import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { CheckCircle2, AlertTriangle, Shield, Clock, Sparkles, Heart } from "lucide-react";
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
  { label: "Przygotowanie", value: "Konsultacja chirurgiczna, USG piersi (wykonuje chirurg podczas konsultacji), badania hormonalne" },
  { label: "Czas trwania", value: "60–120 minut" },
  { label: "Znieczulenie", value: "Ogólne lub miejscowe z sedacją" },
  { label: "Technika", value: "Chirurgiczne wycięcie rozrośniętego gruczołu piersiowego przez nacięcie wokół otoczki brodawki sutkowej." },
  { label: "Rekonwalescencja", value: "Powrót do pracy po 5–7 dniach. Kamizelka uciskowa 4–6 tygodni. Pełna aktywność po 6–8 tygodniach." },
  { label: "Efekty", value: "Trwałe usunięcie twardej tkanki gruczołowej. Płaska, naturalna klatka piersiowa." },
  { label: "Możliwe powikłania", value: "Obrzęk, krwiak, asymetria, zaburzenia czucia brodawki, blizny wokół otoczki" },
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
  { q: "Czym różni się ginekomastia gruczołowa od tłuszczowej?", a: "Ginekomastia gruczołowa (prawdziwa) polega na rozroście tkanki gruczołowej piersi, która jest twarda i wyczuwalna pod brodawką. Tkanka ta nie znika po odchudzaniu – wymaga chirurgicznego wycięcia." },
  { q: "Czy liposukcja wystarczy przy ginekomastii gruczołowej?", a: "Nie. Tkanka gruczołowa jest zbyt twarda i zbita, aby ją odessać kaniulą. Konieczne jest chirurgiczne wycięcie gruczołu przez nacięcie wokół otoczki brodawki." },
  { q: "Jakie badania są potrzebne przed zabiegiem?", a: "USG piersi (wykonuje chirurg podczas konsultacji) (wykluczenie patologii), badania hormonalne (testosteron, estradiol, prolaktyna, hormony tarczycy) oraz podstawowa morfologia i koagulogram." },
  { q: "Czy blizny będą widoczne?", a: "Nacięcie prowadzimy wzdłuż granicy otoczki brodawki sutkowej – blizna jest dyskretna i z czasem praktycznie niewidoczna." },
  { q: "Czy gruczoł może odrosnąć?", a: "Nie – usunięty chirurgicznie gruczoł piersiowy nie regeneruje się. Efekt jest trwały, o ile wyeliminowano przyczynę (np. leki, zaburzenia hormonalne)." },
];

const GinekomastiaGruczolowa = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="Ginekomastia gruczołowa w CML | Wycięcie | Warszawa"
      description="Prawdziwa ginekomastia gruczołowa: chirurgiczne usunięcie rozrośniętego gruczołu z dyskretnym cięciem i trwałym efektem. Umów konsultację w CML Warszawa."
      path="/leczenie/ginekomastia-gruczolowa"
    />
    <MedicalWebPageSchema
      name="Ginekomastia gruczołowa – leczenie chirurgiczne"
      description="Chirurgiczne wycięcie gruczołu piersiowego u mężczyzn z prawdziwą ginekomastią gruczołową."
      path="/leczenie/ginekomastia-gruczolowa"
      specialty="Surgery"
    />
    <MedicalProcedureSchema
      name="Wycięcie gruczołu piersiowego – ginekomastia gruczołowa"
      description="Chirurgiczne usunięcie rozrośniętej tkanki gruczołowej piersi u mężczyzn."
      bodyLocation="Klatka piersiowa"
      procedureType="Surgical"
      preparation="Konsultacja chirurgiczna, USG piersi (wykonuje chirurg podczas konsultacji), badania hormonalne"
      followup="Kamizelka uciskowa 4–6 tygodni. Kontrola po 7 i 30 dniach."
      howPerformed="Chirurgiczne wycięcie tkanki gruczołowej przez nacięcie wokół otoczki brodawki sutkowej."
      risks="Obrzęk, krwiak, asymetria, zaburzenia czucia brodawki, blizny"
      url="/leczenie/ginekomastia-gruczolowa"
    />
    <FaqSchema faqs={faqItems} name="Ginekomastia gruczołowa – FAQ" url="https://gentle-lhp-journey.lovable.app/leczenie/ginekomastia-gruczolowa" />

    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-3xl">
          <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">Ginekomastia</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-6">
            Ginekomastia gruczołowa
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
            Prawdziwa ginekomastia — rozrost tkanki gruczołowej piersi. Twarda, wyczuwalna tkanka pod brodawką, która nie znika po diecie ani ćwiczeniach. Jedynym skutecznym rozwiązaniem jest chirurgiczne wycięcie.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/ginekomastia-gruczolowa"]} />

    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Czym jest ginekomastia gruczołowa?</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p><strong>Ginekomastia gruczołowa</strong> (prawdziwa) to rozrost tkanki gruczołowej piersi u mężczyzn. W przeciwieństwie do pseudoginekomastii (tłuszczowej), tkanka gruczołowa jest twarda, zbita i zlokalizowana bezpośrednio pod brodawką sutkową.</p>
            <p>Najczęstsze przyczyny to zaburzenia równowagi hormonalnej (nadmiar estrogenów względem androgenów), stosowanie niektórych leków (np. spironolakton, finasteryd, steroidy anaboliczne) oraz choroby wątroby lub jąder.</p>
            <p>Kluczowa cecha: <strong>tkanka gruczołowa nie reaguje na dietę ani ćwiczenia</strong>. Nawet intensywny trening klatki piersiowej nie zmniejszy objętości gruczołu — może wręcz optycznie pogorszyć sytuację.</p>
          </div>
        </motion.div>
      </div>
    </section>

    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">Przebieg zabiegu</motion.h2>
        <div className="space-y-6">
          {[
            { step: "1", title: "Diagnostyka", desc: "USG piersi (wykonuje chirurg podczas konsultacji) potwierdza obecność tkanki gruczołowej. Badania hormonalne wykluczają aktywną przyczynę endokrynologiczną." },
            { step: "2", title: "Nacięcie", desc: "Dyskretne nacięcie wzdłuż dolnej granicy otoczki brodawki sutkowej — w naturalnej granicy koloru skóry." },
            { step: "3", title: "Wycięcie gruczołu", desc: "Precyzyjne usunięcie twardej tkanki gruczołowej. Zachowujemy cienką warstwę pod brodawką dla naturalnego wyglądu." },
            { step: "4", title: "Zamknięcie i kompresja", desc: "Szwy wewnętrzne, drenaż (opcjonalnie), opatrunek uciskowy i kamizelka kompresyjna." },
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
            procedureLabel="Ginekomastia gruczołowa — wycięcie gruczołu piersiowego"
            variant="rich"
            preparationDescription="Krótka checklista, która obniży ryzyko powikłań i skróci powrót do formy. 5 minut na przeczytanie, dni komfortu w nagrodę."
            preparationHref="/dla-pacjenta/przygotowanie-ginekomastia-gruczolowa"
            preparationPreviewItems={[
              "Bez papierosów 2–4 tygodnie przed (kluczowe dla gojenia rany)",
              "Komplet badań krwi: morfologia + krzepliwość + EKG",
              "Wygodna koszula rozpinana z przodu na dzień zabiegu",
            ]}
            recoveryDescription="Kamizelka uciskowa, spokojny powrót do aktywności, sygnały alarmowe — pełny plan rekonwalescencji dzień po dniu."
            recoveryHref="/dla-pacjenta/zalecenia-po-ginekomastii"
            recoveryPreviewItems={[
              "Kamizelka uciskowa nieprzerwanie przez 4–6 tygodni",
              "Bez podnoszenia ramion powyżej barków przez 2 tygodnie",
              "Pełna aktywność (siłownia, pływanie) po 6 tygodniach",
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
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Pozbądź się problemu na stałe</h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">Chirurgiczne wycięcie gruczołu to jedyna metoda trwałego rozwiązania prawdziwej ginekomastii. Umów się na konsultację.</p>
          <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
          </Button>
        </motion.div>
      </div>
    </section>
  </div>
);

export default GinekomastiaGruczolowa;
