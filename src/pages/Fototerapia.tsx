import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sun, Zap, ShieldCheck, Heart, Sparkles, Activity } from "lucide-react";
import FototerapiaFAQ from "@/components/fototerapia/FototerapiaFAQ";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import fototerapiaColorsImg from "@/assets/fototerapia-colors.webp";
import RelatedLinks from "@/components/shared/RelatedLinks";


const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const lightColors = [
  {
    color: "Fioletowy",
    wavelength: "400–420 nm",
    description: "Eliminuje toksyny, redukuje stany zapalne i poprawia krążenie krwi. Wspomaga gojenie skóry.",
    bgClass: "bg-purple-500/20 border-purple-400/30",
    textClass: "text-purple-300",
  },
  {
    color: "Niebieski",
    wavelength: "430–450 nm",
    description: "Silne działanie bakteriobójcze — niszczy bakterie Cutibacterium acnes. Reguluje produkcję sebum i redukuje trądzik.",
    bgClass: "bg-blue-500/20 border-blue-400/30",
    textClass: "text-blue-300",
  },
  {
    color: "Cyjanowy",
    wavelength: "500–520 nm",
    description: "Łagodzi stany zapalne i obkurcza podrażnione naczynka. Wspomaga redukcję obrzęków naczyniowych.",
    bgClass: "bg-cyan-500/20 border-cyan-400/30",
    textClass: "text-cyan-300",
  },
  {
    color: "Żółty",
    wavelength: "570–600 nm",
    description: "Stymuluje produkcję kolagenu i wspomaga gojenie ran. Wspiera regenerację podrażnionej po zabiegach skóry.",
    bgClass: "bg-yellow-500/20 border-yellow-400/30",
    textClass: "text-yellow-300",
  },
  {
    color: "Pomarańczowy",
    wavelength: "590–630 nm",
    description: "Promuje jaśniejszy koloryt skóry. Dodaje witalności i blasku zmęczonej, matowej cerze.",
    bgClass: "bg-orange-500/20 border-orange-400/30",
    textClass: "text-orange-300",
  },
  {
    color: "Czerwony",
    wavelength: "630–700 nm",
    description: "Pobudza krążenie i przepływ limfy. Wspomaga odnowę komórkową, przyspiesza gojenie i promuje młodszy wygląd skóry.",
    bgClass: "bg-red-500/20 border-red-400/30",
    textClass: "text-red-300",
  },
  {
    color: "Biały (pełne spektrum)",
    wavelength: "400–700 nm",
    description: "Penetruje tkanki na różnych głębokościach. Ujednolica koloryt, napina tkanki i poprawia strukturę zmarszczek.",
    bgClass: "bg-white/10 border-white/20",
    textClass: "text-white/80",
  },
];

const advantages = [
  {
    icon: ShieldCheck,
    title: "Bezbolesna i nieinwazyjna",
    desc: "Metoda nie powoduje bólu, blizn ani uszkodzeń tkanek. Opiera się wyłącznie na naturalnej stymulacji mitochondriów.",
  },
  {
    icon: Zap,
    title: "Przyspiesza gojenie",
    desc: "Wzrost syntezy ATP i kolagenu poprawia mikrokrążenie i regenerację tkanek po zabiegach laserowych.",
  },
  {
    icon: Sun,
    title: "Wycisza stany zapalne",
    desc: "Fotobiomodulacja hamuje mediatory zapalne, łagodząc rumień, obrzęk i podrażnienie skóry.",
  },
  {
    icon: Sparkles,
    title: "Wspomaga usuwanie naczynek",
    desc: "Światło żółte i pomarańczowe obkurcza powierzchowne naczynka, redukując pajączki i rumień naczyniowy.",
  },
  {
    icon: Heart,
    title: "Bez okresu rekonwalescencji",
    desc: "Po zabiegu od razu wracasz do normalnych aktywności — nie wymaga ograniczeń ani osłon od światła.",
  },
  {
    icon: Activity,
    title: "Potwierdzona naukowo (EBM)",
    desc: "Skuteczność fotobiomodulacji jest potwierdzona setkami badań klinicznych i wytycznymi WALT.",
  },
];

const howItWorks = [
  {
    num: "01",
    title: "Absorpcja fotonów",
    desc: "Światło czerwone (630–660 nm) i bliska podczerwień (800–850 nm) docierają głęboko do tkanek, gdzie są absorbowane przez Oksydazę Cytochromu c w mitochondriach.",
  },
  {
    num: "02",
    title: "Uwolnienie energii komórkowej",
    desc: "Fotony odłączają hamujące cząsteczki tlenku azotu (NO) od enzymów oddechowych — wznawia się produkcja ATP, komórkowego \u201Epaliwa\u201D.",
  },
  {
    num: "03",
    title: "Kaskada regeneracyjna",
    desc: "Uwolniony NO rozszerza naczynia i poprawia mikrokrążenie. Jony wapnia aktywują geny odpowiedzialne za syntezę kolagenu i angiogenezę.",
  },
  {
    num: "04",
    title: "Efekt terapeutyczny",
    desc: "Szybsze gojenie ran, redukcja stanów zapalnych, spłycenie naczynek i poprawa elastyczności skóry — bez jakiegokolwiek bólu.",
  },
];

const Fototerapia = () => (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="Fototerapia LED w CML | Szybsze gojenie po zabiegu"
      description="Fotobiomodulacja LED przyspiesza gojenie po zabiegach laserowych i wspiera redukcję naczynek — bezboleśnie i bez rekonwalescencji. Umów wizytę w CML Warszawa."
      path="/leczenie/fototerapia"
    />
    <MedicalWebPageSchema
      name="Fototerapia LED (PBM) – gojenie i usuwanie naczynek"
      description="Fotobiomodulacja (PBM) — nieinwazyjna terapia światłem LED przyspieszająca gojenie po zabiegach i wspierająca redukcję pajączków naczyniowych."
      path="/leczenie/fototerapia"
      specialty="Phlebology"
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
          Flebologia · Medycyna Regeneracyjna
        </p>
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-primary-foreground mb-6 leading-tight">
          Fototerapia LED
          <span className="block text-primary mt-2 text-2xl md:text-3xl">Fotobiomodulacja (PBM)</span>
        </h1>
        <p className="text-base md:text-lg text-primary-foreground/80 leading-relaxed max-w-2xl mx-auto">
          Nieinwazyjna, bezbolesna terapia światłem, która przyspiesza gojenie po zabiegach laserowych
          i wspomaga zamykanie drobnych naczynek — potwierdzona badaniami naukowymi.
        </p>
      </motion.div>
    </ParallaxSection>

    <Breadcrumbs
      items={BREADCRUMBS_MAP["/leczenie/fototerapia"]}
    />

    {/* Intro */}
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div {...fadeUp}>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-6">
            Czym jest fotobiomodulacja?
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Fotobiomodulacja (PBM), znana również jako terapia światłem LED, to <strong className="text-foreground">nieinwazyjna, nietermiczna
            metoda lecznicza</strong> wykorzystująca precyzyjnie dobrane pasma światła widzialnego i bliskiej podczerwieni
            (400–1100 nm). W odróżnieniu od laserów chirurgicznych, PBM nie podnosi temperatury tkanek
            i nie powoduje żadnych uszkodzeń — jej celem jest <strong className="text-foreground">stymulacja naturalnych procesów
            naprawczych</strong> w komórkach.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            To zjawisko często porównywane do fotosyntezy u roślin — kwanty światła dostarczane do
            mitochondriów „ładują" komórki energią, przyspieszając regenerację, hamując stany zapalne
            i poprawiając mikrokrążenie.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            W naszej klinice fototerapia LED stanowi integralny element protokołu leczenia pajączków naczyniowych
            metodą CLaCS oraz wspomagania gojenia po zabiegach EVLT i skleroterapii.
          </p>
        </motion.div>
      </div>
    </section>

    {/* How it works */}
    <section className="py-16 md:py-20 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.h2 {...fadeUp} className="text-2xl md:text-3xl font-serif font-bold text-foreground text-center mb-12">
          Jak to działa? Mechanizm na poziomie komórki
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-6">
          {howItWorks.map((step, i) => (
            <motion.div
              key={i}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-colors"
            >
              <span className="text-4xl font-serif font-bold text-primary/20 block mb-2">{step.num}</span>
              <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Light spectrum */}
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.h2 {...fadeUp} className="text-2xl md:text-3xl font-serif font-bold text-foreground text-center mb-4">
          7 kolorów światła — 7 mechanizmów działania
        </motion.h2>
        <motion.p {...fadeUp} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Każda długość fali oddziałuje na inne struktury komórkowe, umożliwiając precyzyjne
          dopasowanie terapii do problemu pacjenta.
        </motion.p>
        <motion.div {...fadeUp} className="mb-10">
          <img
            src={fototerapiaColorsImg}
            alt="7 kolorów światła LED stosowanych w fototerapii – fioletowy, niebieski, cyjanowy, żółty, pomarańczowy, biały i czerwony z opisami długości fal"
            width={1600}
            height={400}
            className="w-full rounded-2xl border border-border"
            loading="lazy"
            decoding="async"
          />
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lightColors.map((light, i) => (
            <motion.div
              key={i}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.06 }}
              className={`rounded-2xl p-5 border ${light.bgClass} backdrop-blur-sm`}
            >
              <h3 className={`font-semibold text-base mb-1 ${light.textClass}`}>{light.color}</h3>
              <span className="text-xs text-muted-foreground font-mono block mb-3">{light.wavelength}</span>
              <p className="text-muted-foreground text-sm leading-relaxed">{light.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Advantages */}
    <section className="py-16 md:py-20 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.h2 {...fadeUp} className="text-2xl md:text-3xl font-serif font-bold text-foreground text-center mb-12">
          Dlaczego stosujemy fototerapię?
        </motion.h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((adv, i) => (
            <motion.div
              key={i}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              className="bg-card rounded-2xl p-6 border border-border"
            >
              <adv.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-foreground mb-2">{adv.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{adv.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Clinical applications */}
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div {...fadeUp}>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-6">
            Zastosowania kliniczne w naszej klinice
          </h2>

          <div className="space-y-6">
            <div className="border-l-4 border-primary pl-5">
              <h3 className="font-semibold text-foreground mb-1">Po zabiegu CLaCS (pajączki naczyniowe)</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Ciepłe światło medyczne wycisza stan zapalny wywołany laserem barwnikowym i skleroterapią,
                łagodzi tkanki i przyspiesza wchłanianie zasinień. Stanowi integralny trzeci etap naszego
                protokołu CLaCS.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-5">
              <h3 className="font-semibold text-foreground mb-1">Po zabiegu EVLT (żylaki)</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Wspomaganie gojenia tkanek wokół zamkniętej laserowo żyły. Redukcja obrzęku
                i przyspieszenie neowaskularyzacji w leczonej kończynie.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-5">
              <h3 className="font-semibold text-foreground mb-1">Redukcja pajączków naczyniowych</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Światło żółte i pomarańczowe (570–630 nm) skutecznie spłyca sieć powierzchownych naczynek,
                łagodząc podrażnienia i minimalizując rumień zlokalizowany w trądziku różowatym.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-5">
              <h3 className="font-semibold text-foreground mb-1">Wspomaganie gojenia ran i blizn</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                PBM gwałtownie poprawia mikrokrążenie na poziomie włośniczkowym i stymuluje angiogenezę,
                co jest kluczowe w leczeniu ran pooperacyjnych i przewlekłych owrzodzeń.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Safety profile */}
    <section className="py-16 md:py-20 px-4 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <motion.div {...fadeUp}>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-6">
            Profil bezpieczeństwa
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Fotobiomodulacja wyznacza <strong className="text-foreground">niemal idealny profil bezpieczeństwa</strong> pośród
            nowoczesnych interwencji fotonicznych. Jest to z zasady terapia bezbolesna, bezurazowa
            i wykluczająca długofalowe niszczenie komórek.
          </p>
          <div className="bg-card rounded-2xl p-6 border border-border mb-6">
            <h3 className="font-semibold text-foreground mb-3">✅ Co wykazały badania?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Metaanalizy <strong className="text-foreground">całkowicie obaliły</strong> tezę o rakotwórczym działaniu PBM</li>
              <li>• Fale świetlne nie mają wystarczającej energii do uszkodzenia wiązań DNA</li>
              <li>• Skutki uboczne są ekstremalnie rzadkie — mogą obejmować delikatne mrowienie lub przejściowe zaczerwienienie</li>
              <li>• Nie wymaga okresu rekonwalescencji ani ochrony przed słońcem</li>
            </ul>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="font-semibold text-foreground mb-3">⚠️ Środki ostrożności</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong className="text-foreground">Ciąża</strong> — odradza się naświetlanie powłok jamy brzusznej ze względów medyczno-prawnych</li>
              <li>• <strong className="text-foreground">Tatuaże</strong> — ciemny pigment może powodować przejściowe odczucie ciepła (nie stanowi przeciwwskazania)</li>
              <li>• <strong className="text-foreground">Dzieci</strong> — unika się naświetlań chrząstek wzrostowych u noworodków</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>

    {/* EBM note */}
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div {...fadeUp} className="bg-card rounded-2xl p-8 border border-primary/20">
          <h2 className="text-xl font-serif font-bold text-foreground mb-4">
            📚 Podstawa naukowa (EBM)
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Skuteczność fotobiomodulacji jest potwierdzona przez Światowe Stowarzyszenie Terapii Laserowej (WALT)
            oraz setki badań opublikowanych w bazach PubMed i Cochrane. Mechanizm działania opiera się na
            fotodysocjacji tlenku azotu z oksydazy cytochromu c (Kompleks IV łańcucha oddechowego), co prowadzi
            do wzrostu syntezy ATP i aktywacji czynników transkrypcyjnych NF-κB oraz HIF-1α.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            W naszej klinice stosujemy fotobiomodulację zgodnie z najnowszymi wytycznymi EBM,
            jako element zintegrowanego protokołu leczenia pajączków (CLaCS) oraz wspomagania
            gojenia po zabiegach flebologicznych.
          </p>
        </motion.div>
      </div>
    </section>

    {/* Karta zabiegu */}
    <section className="py-16 md:py-20 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <ProcedureSummaryTable
          fadeUp={fadeUp}
          rows={[
            { label: "Przygotowanie", value: "Nie wymaga specjalnego przygotowania — wystarczy oczyszczona skóra w obszarze naświetlania." },
            { label: "Czas trwania", value: "15–30 minut na sesję, w zależności od leczonego obszaru i protokołu." },
            { label: "Znieczulenie", value: "Nie jest wymagane — zabieg jest całkowicie bezbolesny." },
            { label: "Technika", value: "Naświetlanie panelem LED o dobranym widmie (400–1100 nm), dostosowanym do wskazania klinicznego." },
            { label: "Rekonwalescencja", value: "Brak — po zabiegu można natychmiast wrócić do codziennych aktywności." },
            { label: "Efekty", value: "Przyspieszenie gojenia, redukcja stanów zapalnych, spłycenie naczynek i poprawa mikrokrążenia." },
            { label: "Możliwe powikłania", value: "Ekstremalnie rzadkie — delikatne mrowienie lub przejściowe zaczerwienienie w miejscu naświetlania." },
            { label: "Cena", value: "Wliczona w cenę zabiegu CLaCS lub EVLT. Jako samodzielna sesja — od 200 zł." },
          ]}
        />
      </div>
    </section>

    {/* FAQ */}
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <FototerapiaFAQ fadeUp={fadeUp} />
      </div>
    </section>

    <section className="py-16 md:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <TestimonialsSection />
      </div>
    </section>

    {/* CTA */}
    <section className="py-16 md:py-20 px-4 bg-muted/30">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div {...fadeUp}>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
            Zainteresowała Cię fototerapia?
          </h2>
          <p className="text-muted-foreground mb-8">
            Umów się na konsultację — dobierzemy odpowiedni protokół świetlny do Twojego problemu.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full gap-2">
              <Link to="/kontakt">
                Umów wizytę <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full gap-2">
              <Link to="/leczenie/clacs">
                Poznaj metodę CLaCS <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
      <RelatedLinks path="/leczenie/fototerapia" />

  </div>
);

export default Fototerapia;
