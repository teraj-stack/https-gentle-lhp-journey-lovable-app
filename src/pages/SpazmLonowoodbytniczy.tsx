import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { ArrowRight, CheckCircle2, AlertTriangle, Brain, Activity, HeartPulse } from "lucide-react";
import { StaggeredListItem } from "@/components/shared/StaggeredList";
import miesnieDnaMiednicy from "@/assets/miesnie-dna-miednicy.webp";
import ParallaxSection from "@/components/ui/parallax-section";
import ProcedureSummaryTable from "@/components/shared/ProcedureSummaryTable";
import MedicalProcedureSchema from "@/components/shared/MedicalProcedureSchema";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";

import RecoveryBoostBanner from "@/components/shared/RecoveryBoostBanner";
import TestimonialsSection from "@/components/shared/TestimonialsSection";
import SpazmFAQ from "@/components/spazm/SpazmFAQ";
import RelatedLinks from "@/components/shared/RelatedLinks";

const spazmSummary = [
  { label: "Przygotowanie", value: "Badanie proktologiczne, ocena napięcia mięśni dna miednicy, wykluczenie przyczyn organicznych (szczelina, ropień, guz)." },
  { label: "Czas trwania", value: "Leczenie wieloetapowe — czas terapii zależny od odpowiedzi na leczenie (tygodnie–miesiące)." },
  { label: "Znieczulenie", value: "W przypadku iniekcji botoksu — znieczulenie miejscowe lub krótka sedacja." },
  { label: "Technika", value: "Terapia wielokierunkowa: farmakoterapia, fizjoterapia dna miednicy (biofeedback), iniekcje toksyny botulinowej, modyfikacja nawyków." },
  { label: "Rekonwalescencja", value: "Leczenie ambulatoryjne — brak typowej rekonwalescencji. Po iniekcji botoksu powrót do aktywności tego samego dnia." },
  { label: "Efekty", value: "Ustąpienie lub znaczne złagodzenie przewlekłego bólu, poprawa jakości życia, przywrócenie prawidłowej funkcji defekacji." },
  { label: "Możliwe powikłania", value: "Przejściowe nietrzymanie gazów po botoksie (rzadko), nawrót dolegliwości wymagający powtórzenia terapii." },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const SpazmLonowoodbytniczy = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="Spazm w CML | Leczenie przewlekłego bólu odbytu Wilanów"
      description="Przewlekły ból odbytu ze spazmu mięśnia łonowo-odbytniczego: diagnostyka, botoks, fizjoterapia i leki. Ulga bez operacji. Umów konsultację w CML Warszawa."
      path="/leczenie/spazm-lonowoodbytniczy"
    />
    <MedicalWebPageSchema
      name="Przewlekły ból odbytu – spazm mięśnia łonowo-odbytniczego"
      description="Diagnostyka i leczenie przewlekłego bólu odbytu wywołanego spazmem mięśnia łonowo-odbytniczego w CML Warszawa."
      path="/leczenie/spazm-lonowoodbytniczy"
      specialty="Proctology"
    />
    <MedicalProcedureSchema
      name="Leczenie spazmu mięśnia łonowo-odbytniczego"
      description="Wielokierunkowa terapia przewlekłego bólu odbytu: farmakoterapia, fizjoterapia dna miednicy (biofeedback), iniekcje toksyny botulinowej."
      bodyLocation="Mięsień łonowo-odbytniczy (m. puborectalis)"
      procedureType="Percutaneous"
      preparation="Badanie proktologiczne, ocena napięcia mięśni dna miednicy, wykluczenie przyczyn organicznych."
      followup="Leczenie ambulatoryjne, wizyty kontrolne, kontynuacja fizjoterapii wg zaleceń."
      howPerformed="Farmakoterapia, fizjoterapia dna miednicy (biofeedback), iniekcje toksyny botulinowej w mięsień łonowo-odbytniczy."
      risks="Przejściowe nietrzymanie gazów po botoksie (rzadko), nawrót dolegliwości."
      url="/leczenie/spazm-lonowoodbytniczy"
    />

    {/* Hero */}
    <ParallaxSection className="relative py-20 md:py-28 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="max-w-3xl">
          <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">Proktologia</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-6">
            Przewlekły ból odbytu
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-4">
            Spazm mięśnia łonowo-odbytniczego (m.&nbsp;puborectalis)
          </p>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mb-10">
            Ból, który nie ma widocznej przyczyny, ale całkowicie zmienia jakość życia. Pomagamy go zdiagnozować i skutecznie leczyć.
          </p>
          <Button variant="hero" size="lg" className="px-8 py-6 text-base" asChild>
            <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów Konsultację</a>
          </Button>
        </motion.div>
      </div>
    </ParallaxSection>

    {/* Metrics */}
    <section className="py-10 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Brain, label: "Problem czynnościowy", sub: "Często bez zmian organicznych" },
            { icon: Activity, label: "Terapia wielokierunkowa", sub: "Botoks, fizjoterapia, farmakologia" },
            { icon: HeartPulse, label: "Poprawa jakości życia", sub: "Ustąpienie przewlekłego bólu" },
          ].map((item, i) => (
            <motion.div key={item.label} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.12 }} className="flex items-start gap-3">
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
      <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/spazm-lonowoodbytniczy"]} className="mb-4" />

      {/* Co to jest */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Czym jest spazm mięśnia łonowo-odbytniczego?
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Mięsień łonowo-odbytniczy (m.&nbsp;puborectalis) to jeden z kluczowych mięśni dna miednicy, który tworzy pętlę wokół odbytnicy, odpowiadając za utrzymanie kąta odbytniczo-odbytowego i kontrolę wypróżniania.
          </p>
          <p>
            Gdy mięsień ten pozostaje w stanie przewlekłego skurczu (spazmu), pacjent doświadcza uporczywego, głębokiego bólu w okolicy odbytu — często opisywanego jako tępy ucisk, ciągnienie lub „siedzenie na piłce". Ból może promieniować do krocza, kości krzyżowej, a nawet ud.
          </p>
          <p>
            Co istotne, w badaniu proktologicznym często nie stwierdza się żadnych zmian organicznych — brak szczeliny, hemoroidów czy ropnia. To sprawia, że wielu pacjentów latami pozostaje bez diagnozy, krążąc między specjalistami.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8"
        >
          <figure className="glass-card rounded-2xl p-4 md:p-6">
            <img
              src={miesnieDnaMiednicy}
              alt="Schemat anatomiczny mięśni dna miednicy — m. biodrowo-guziczny, m. łonowo-odbytniczy, m. łonowo-kroczowy, m. zwieracz zewnętrzny odbytu, m. łonowo-odbytowy"
              width={800}
              height={600}
              className="w-full max-w-lg mx-auto rounded-xl"
              loading="lazy"
              decoding="async"
            />
            <figcaption className="text-xs text-muted-foreground text-center mt-3">
              Schemat anatomiczny mięśni dna miednicy z zaznaczonym m.&nbsp;łonowo-odbytniczym (puborectalis)
            </figcaption>
          </figure>
        </motion.div>
      </motion.section>

      {/* Objawy */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Objawy — jak rozpoznać spazm?
        </h2>
        <ul className="space-y-3">
          {[
            "Przewlekły, tępy ból w okolicy odbytu — nasilający się przy siedzeniu",
            'Uczucie „ciała obcego" lub ucisku w odbytnicy',
            "Ból nasilający się po defekacji lub w sytuacjach stresowych",
            "Epizody nagłego, ostrego bólu odbytu (proctalgia fugax)",
            "Trudności z wypróżnianiem — uczucie niepełnego stolca (dyssynergia)",
            "Ból promieniujący do krocza, kości ogonowej lub ud",
            "Nasilenie dolegliwości w nocy lub w pozycji siedzącej",
          ].map((text, i) => (
            <StaggeredListItem key={text} index={i} icon={<CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />}>
              {text}
            </StaggeredListItem>
          ))}
        </ul>
      </motion.section>

      {/* Przyczyny */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Dlaczego mięsień się kurczy?
        </h2>
        <div className="glass-card p-8 rounded-2xl">
          <p className="text-muted-foreground leading-relaxed mb-4">
            Każdy czynnik drażniący okolicę dna miednicy może być triggerem (czynnikiem spustowym) prowokującym bolesny skurcz mięśni. Najczęściej obserwowane przyczyny i czynniki podtrzymujące to:
          </p>
          <ul className="space-y-2">
            {[
              "Przewlekły stres i napięcie emocjonalne — mięśnie dna miednicy reagują na stres podobnie jak mięśnie szyi",
              "Przebyte urazy lub operacje w okolicy miednicy mniejszej",
              "Zaburzenia posturalne — długotrwałe siedzenie, nieprawidłowa pozycja",
              "Współistnienie zespołu jelita drażliwego (IBS)",
              "Przebyte infekcje lub stany zapalne w okolicy odbytu",
              "Nadmierne napinanie mięśni podczas defekacji (parcie chroniczne)",
              "Czynniki psychogenne — lęk, depresja, zespół bólu przewlekłego",
            ].map((t, i) => (
              <StaggeredListItem key={t} index={i} icon={<CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />} className="flex items-start gap-2 text-sm text-foreground">
                {t}
              </StaggeredListItem>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Diagnostyka */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Jak diagnozujemy problem?
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Diagnostyka opiera się przede wszystkim na dokładnym badaniu fizykalnym — ocena napięcia mięśni dna miednicy w badaniu per rectum pozwala doświadczonemu proktologowi postawić wstępną diagnozę. Kluczowe jest wykluczenie przyczyn organicznych bólu:
          </p>
        </div>
        <ul className="space-y-2 mt-4">
          {[
            "Badanie per rectum z oceną napięcia spoczynkowego i zdolności do relaksacji mięśni",
            "Anoskopia — wykluczenie szczeliny, hemoroidów wewnętrznych",
            "Manometria anorektalna — obiektywna ocena ciśnień w kanale odbytu",
            "USG endoanalne — ocena anatomii zwieraczy",
            "Defekografia (w wybranych przypadkach) — ocena dynamiki defekacji",
          ].map((t, i) => (
            <StaggeredListItem key={t} index={i} icon={<CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />} className="flex items-start gap-2 text-sm text-foreground">
              {t}
            </StaggeredListItem>
          ))}
        </ul>
      </motion.section>

      {/* Leczenie */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Metody leczenia
        </h2>
        <div className="space-y-6">
          {[
            {
              title: "1. Fizjoterapia dna miednicy (biofeedback)",
              desc: "Złoty standard w leczeniu dyssynergii i spazmu. Pacjent uczy się świadomej relaksacji mięśni dna miednicy za pomocą czujników EMG. Skuteczność sięga 70–80% w badaniach klinicznych.",
            },
            {
              title: "2. Iniekcje toksyny botulinowej (botoks)",
              desc: 'Precyzyjna iniekcja botoksu w mięsień łonowo-odbytniczy powoduje jego kontrolowane rozluźnienie na okres 3–6 miesięcy. W tym czasie mięsień „uczy się" prawidłowego napięcia. Zabieg ambulatoryjny, powrót do aktywności tego samego dnia.',
            },
            {
              title: "3. Farmakoterapia",
              desc: "Leki rozluźniające mięśnie gładkie (np. diltiazem, nifedypina w maściach), leki zmniejszające ból neuropatyczny (amitryptylina, gabapentyna), preparaty magnezowe.",
            },
            {
              title: "4. Modyfikacja nawyków",
              desc: "Techniki relaksacyjne, prawidłowa pozycja defekacji, regulacja konsystencji stolca, zarządzanie stresem. Podstawa długoterminowej remisji.",
            },
          ].map((method) => (
            <div key={method.title} className="glass-card p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-foreground mb-2">{method.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{method.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Dlaczego warto */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
          Dlaczego warto szukać pomocy?
        </h2>
        <div className="glass-card p-8 rounded-2xl border-l-4 border-primary">
          <p className="text-muted-foreground leading-relaxed mb-4">
            Przewlekły ból odbytu drastycznie obniża jakość życia — wpływa na sen, pracę, relacje i samopoczucie psychiczne. Wielu pacjentów wstydzi się mówić o problemie lub uważa, że „nie da się nic zrobić". To nieprawda.
          </p>
          <ul className="space-y-2">
            {[
              "Prawidłowa diagnoza to podstawa — ból ma konkretną przyczynę",
              "Nowoczesne metody muszą uwzględniać prawidłowe nawyki żywieniowe — zaburzenie ekosystemu mikroflory jelitowej jest najczęściej pomijalnym elementem diagnostyki, a co za tym idzie również leczenia",
              "Nowoczesne metody leczenia, tj. biofeedback czy toksyna botulinowa są wysoce skuteczne, jednak nie zastąpią prawidłowych nawyków żywieniowych",
              "Im wcześniej rozpoczniesz leczenie, tym szybszy powrót do normalności",
              "Terapia jest bezbolesna i prowadzona ambulatoryjnie",
            ].map((t, i) => (
              <StaggeredListItem key={t} index={i} icon={<CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />} className="flex items-start gap-2 text-sm text-foreground">
                {t}
              </StaggeredListItem>
            ))}
          </ul>
        </div>
      </motion.section>

      <ProcedureSummaryTable rows={spazmSummary} fadeUp={fadeUp} />

      

      <RecoveryBoostBanner />

      <TestimonialsSection />

      <SpazmFAQ fadeUp={fadeUp} />

      {/* CTA */}
      <motion.section {...fadeUp} className="text-center py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-serif">
          Odzyskaj komfort życia
        </h2>
        <p className="text-muted-foreground mb-8">
          Przewlekły ból odbytu to nie wyrok. Umów konsultację — wspólnie znajdziemy przyczynę i dobierzemy skuteczne leczenie.
        </p>
        <Button variant="hero" size="lg" className="px-10 py-6 text-base" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">
            Umów Konsultację
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </motion.section>
    </div>
      <RelatedLinks path="/leczenie/spazm-lonowoodbytniczy" />

  </div>
);

export default SpazmLonowoodbytniczy;
