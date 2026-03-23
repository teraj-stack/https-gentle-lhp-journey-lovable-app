import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { ArrowRight, CheckCircle2, Clock, Shield, Zap, Syringe, Sparkles } from "lucide-react";
import ParallaxSection from "@/components/ui/parallax-section";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";

const szczelinaSummary = [
  { label: "Przygotowanie", value: "Badanie proktologiczne, ocena napięcia zwieraczy. Wykluczenie innych chorób jelit." },
  { label: "Czas trwania", value: "15–30 minut" },
  { label: "Znieczulenie", value: "Miejscowe (krem lub iniekcja)" },
  { label: "Technika", value: "Botoks: rozluźnienie zwieracza umożliwiające gojenie. Laser: oczyszczenie brzegów rany lub precyzyjna sfinkterotomia — bez skalpela." },
  { label: "Rekonwalescencja", value: "Powrót do domu natychmiast. Kluczowe: miękki stolec (dieta, nawadnianie) przez kilka tygodni." },
  { label: "Efekty", value: "Ustąpienie silnego bólu podczas defekacji, wygojenie rany, powrót elastyczności anodermy" },
  { label: "Możliwe powikłania", value: "Przejściowe nietrzymanie gazów (rzadkie), krwiak w miejscu iniekcji, nawrót przy braku zmiany diety" },
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

const Szczelina = () => (
    <div className="min-h-screen pt-20">
      <SeoHead
        title="Szczelina odbytu – od diety do lasera"
        description="Leczenie szczeliny odbytu w CML – botoks, laser, farmakoterapia. Skuteczne metody bez długiej rekonwalescencji."
        path="/leczenie/szczelina"
      />
      <MedicalProcedureSchema
        name="Leczenie szczeliny odbytu – od diety do lasera"
        description="Kompleksowe leczenie szczeliny odbytu: od leczenia zachowawczego, przez botoks, po precyzyjną laserową sfinkterotomię."
        bodyLocation="Kanał odbytu"
        procedureType="Percutaneous"
        preparation="Badanie proktologiczne, ocena napięcia zwieraczy. Wykluczenie innych chorób jelit."
        followup="Powrót do domu natychmiast. Kluczowe: miękki stolec (dieta, nawadnianie) przez kilka tygodni."
        howPerformed="Botoks: rozluźnienie zwieracza. Laser: oczyszczenie brzegów rany lub precyzyjna sfinkterotomia — bez skalpela."
        risks="Przejściowe nietrzymanie gazów (rzadkie), krwiak w miejscu iniekcji, nawrót przy braku zmiany diety"
        url="/leczenie/szczelina"
      />
    {/* Hero */}
    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-3xl">
          <p className="text-primary-foreground/60 text-sm font-sans uppercase tracking-[0.2em] mb-6">Proktologia Laserowa</p>
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-[1.1] mb-6">
            Szczelina odbytu
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed max-w-2xl mb-10">
            Skuteczne leczenie od diety do lasera — od farmakoterapii po nowoczesne metody małoinwazyjne, dobrane indywidualnie do Twoich potrzeb.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <Link to="/kontakt">Umów Konsultację</Link>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    {/* Hero Metrics */}
    <section className="py-10 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Shield, label: "Znieczulenie miejscowe", sub: "Pełen komfort" },
            { icon: Clock, label: "60%+ skuteczność", sub: "Leczenia zachowawczego" },
            { icon: Zap, label: "Laser CO₂", sub: "Precyzyjne nacięcie" },
            { icon: Sparkles, label: "Botoks & PRP", sub: "Innowacyjne wspomaganie" },
          ].map((item, i) => (
            <motion.div key={item.label} {...stagger(i)} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 space-y-20">
      <Breadcrumbs items={[{ label: "Proktologia" }, { label: "Szczelina odbytu" }]} className="mb-4" />
      {/* Co to jest */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Czym jest szczelina odbytu?
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Szczelina odbytu to bolesna dolegliwość polegająca na pęknięciu anodermy — delikatnej skóry wyścielającej końcowy odcinek kanału odbytu. Do urazu dochodzi zazwyczaj nagle, najczęściej podczas wypróżniania.
          </p>
          <p>
            Choć problem często kojarzony jest z zaparciami, badania pokazują, że jedynie 25% pacjentów z tą przypadłością skarży się na oddawanie twardego stolca. Nieleczona szczelina może prowadzić do przewlekłego bólu i poważnych powikłań.
          </p>
        </div>
      </motion.section>

      {/* Objawy */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Objawy — co powinno Cię zaniepokoić?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Najbardziej charakterystycznym objawem jest silny, piekący ból podczas wypróżniania, który może utrzymywać się nawet przez kilka godzin. Inne symptomy to:
        </p>
        <ul className="space-y-3">
          {[
            "Obecność żywoczerwonej krwi na papierze toaletowym lub stolcu",
            "Świąd i pieczenie w okolicy odbytu",
            "Dolegliwości najsilniejsze w pierwszych dniach choroby",
          ].map((text) => (
            <li key={text} className="flex items-start gap-3 text-sm text-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              {text}
            </li>
          ))}
        </ul>
      </motion.section>

      {/* Przyczyny */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Dlaczego powstaje szczelina?
        </h2>
        <div className="glass-card p-8 rounded-2xl space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Najczęściej jest to wynik mechanicznego urazu (zaparcia, biegunki) nałożonego na nadmierne napięcie mięśnia zwieracza wewnętrznego odbytu.
          </p>
          <p>
            Mięsień ten, działający niezależnie od naszej woli, u osób ze szczeliną jest stale „zaciśnięty" — napięcie spoczynkowe może być nawet dwukrotnie wyższe niż u osoby zdrowej. To powoduje niedokrwienie tkanek, utrudnia ich gojenie i tworzy błędne koło: ból → skurcz → utrudnione gojenie.
          </p>
        </div>
      </motion.section>

      {/* Rodzaje */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Rodzaje szczeliny odbytu
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-3">Szczelina ostra</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Świeże, bolesne pęknięcie, które często goi się samoistnie lub przy niewielkim wsparciu farmakologicznym.
            </p>
          </div>
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-3">Szczelina przewlekła</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Diagnozowana, gdy rana nie goi się przez ponad 6 tygodni. Charakteryzuje się obecnością guzka wartowniczego i zwłóknieniem.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Leczenie 3 etapy */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Jak leczymy szczelinę odbytu?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Naszym priorytetem jest wyleczenie pacjenta metodami najmniej inwazyjnymi. Leczenie nigdy nie powinno być bardziej uciążliwe niż sama choroba.
        </p>

        <div className="space-y-8">
          {/* Etap 1 */}
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">1</div>
              <h3 className="text-lg font-semibold text-foreground">Leczenie zachowawcze (Farmakologia i dieta)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Pierwszy etap, który przynosi ulgę u ponad 60% pacjentów:</p>
            <ul className="space-y-2">
              {[
                "Zmiana diety — produkty bogatoresztkowe i nawadnianie organizmu",
                "Farmakoterapia — maści rozluźniające zwieracz",
                "Dilatatory — urządzenia rozciągające zwieracz",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Etap 2 */}
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">2</div>
              <h3 className="text-lg font-semibold text-foreground">Nowoczesne metody małoinwazyjne</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Jeśli leczenie zachowawcze nie przynosi efektów:</p>
            <ul className="space-y-2">
              {[
                "Toksyna botulinowa (Botoks) — rozluźnia zwieracz na 2-3 miesiące, czas idealny na wygojenie rany",
                "Komórki macierzyste i osocze bogatopłytkowe (PRP) — naturalna regeneracja",
                "Mezoterapia (aminokwasy i peptydy) — poprawa elastyczności skóry",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Etap 3 */}
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">3</div>
              <h3 className="text-lg font-semibold text-foreground">Leczenie laserowe</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Gdy inne metody nie przynoszą rezultatów:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Laserowa sfinkterotomia tylna</strong> — precyzyjne nacięcie włókien mięśniowych laserem CO₂. Brak dodatkowych ran na skórze, znacznie mniejsze ryzyko powikłań.</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.section>

      <ProcedureSummaryTable rows={szczelinaSummary} fadeUp={fadeUp} />

      {/* CTA */}
      <motion.section {...fadeUp} className="text-center py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-serif">
          Sprawdź nowoczesne metody leczenia szczeliny
        </h2>
        <p className="text-muted-foreground mb-8">
          Nie czekaj, aż dolegliwości staną się przewlekłe. Umów konsultację i poznaj najlepszą opcję leczenia.
        </p>
        <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
          <Link to="/kontakt">
            Umów Konsultację
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default Szczelina;
