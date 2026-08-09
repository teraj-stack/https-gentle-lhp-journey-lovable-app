import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import HemoroidyRiskQuiz from "@/components/hemoroidy/HemoroidyRiskQuiz";
import DiaryReminderBanner from "@/components/hemoroidy/DiaryReminderBanner";
import QuizRetakeModule from "@/components/hemoroidy/QuizRetakeModule";
import QuizHistorySection from "@/components/hemoroidy/QuizHistorySection";
import HemoroidyChecklistSections from "@/components/hemoroidy/HemoroidyChecklistSections";
import EBMSourcesSection from "@/components/hemoroidy/EBMSourcesSection";
import RedFlagsFAQ from "@/components/hemoroidy/RedFlagsFAQ";
import DiaryFullModule from "@/components/hemoroidy/DiaryFullModule";
import { ClipboardList, Sparkles, BookOpen, Stethoscope, CalendarDays, ArrowRight } from "lucide-react";
import RelatedLinks from "@/components/shared/RelatedLinks";

const easeOut = [0.16, 1, 0.3, 1] as const;

const QuizHemoroidy = () => {
  const trail = BREADCRUMBS_MAP["/dla-pacjenta/quiz-hemoroidy"];

  return (
    <>
      <SeoHead
        title="Test ryzyka hemoroidów — quiz 9 pytań | CML"
        description="Sprawdź swoje ryzyko hemoroidów w 2 minuty. 9 pytań o styl życia (błonnik, zaparcia, woda, toaleta, telefon, ruch, siedzenie, ciąża/BMI, objawy), 3 poziomy ryzyka i dopasowane zalecenia EBM."
        path="/dla-pacjenta/quiz-hemoroidy"
      />
      <MedicalWebPageSchema
        name="Test ryzyka hemoroidów"
        description="Interaktywny quiz oceniający ryzyko choroby hemoroidalnej na podstawie czynników stylu życia (dieta, nawodnienie, nawyki toaletowe, aktywność, objawy) — z dopasowanymi zaleceniami EBM."
        path="/dla-pacjenta/quiz-hemoroidy"
      />

      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-4 md:px-8 relative overflow-hidden">
        {/* Subtle background gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-4xl mx-auto relative">
          {trail && <Breadcrumbs items={trail} className="mb-8" />}

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: easeOut }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-sans uppercase tracking-[0.18em] text-primary">
                Świadomy pacjent · EBM
              </span>
            </div>
            <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl text-foreground mb-5 leading-[1.1]">
              Test ryzyka <em className="text-primary not-italic">hemoroidów</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              9 pytań o Twoje codzienne nawyki — dieta, zaparcia, czas w toalecie, ciąża/BMI i objawy.
              W 2 minuty poznasz poziom ryzyka i otrzymasz dopasowane zalecenia oparte na wytycznych ASCRS i ESCP.
            </p>
          </motion.div>

          {/* Reminder banner — visible only when diary is overdue */}
          <div className="mb-6">
            <DiaryReminderBanner variant="quiz-page" />
          </div>

          {/* Quiz */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: easeOut }}
          >
            <HemoroidyRiskQuiz />
          </motion.div>

          {/* Diary — full 14-day module embedded inline */}
          <motion.section
            id="dziennik-14-dni"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="mt-16"
            aria-label="Dziennik 14 dni"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-4">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-sans uppercase tracking-[0.18em] text-primary">
                  Dziennik · 14 dni · prywatnie w przeglądarce
                </span>
              </div>
              <h2 className="font-heading text-2xl md:text-4xl text-foreground mb-3 leading-[1.15]">
                Twój <em className="text-primary not-italic">dziennik 14 dni</em>
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Codzienny quiz 9 pytań, miejsce na notatki i przycisk „Zapisz dzień" dla każdej doby.
                Wszystko zapisuje się lokalnie w Twojej przeglądarce — bez konta i bez wysyłki na serwer.
              </p>
              <div className="mt-4">
                <Link
                  to="/dla-pacjenta/dziennik-hemoroidy"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-sans"
                >
                  Otwórz dziennik na osobnej stronie
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <DiaryFullModule reminderVariant="quiz-page" showReminderSettings={false} />
          </motion.section>

          {/* Retake module — side-by-side comparison + restart CTA */}
          <div className="mt-12 max-w-3xl mx-auto">
            <QuizRetakeModule />
          </div>

          {/* History — local trend of past quiz results */}
          <div className="mt-8 max-w-3xl mx-auto">
            <QuizHistorySection />
          </div>

          {/* Red Flags FAQ — alarm symptoms with EBM links, complements quiz risk markers */}
          <div className="mt-20">
            <RedFlagsFAQ />
          </div>

          {/* Checklist sections — anchor targets for quiz recommendations */}
          <div className="mt-20">
            <HemoroidyChecklistSections />
          </div>

          {/* EBM Sources — bibliography backing the quiz recommendations */}
          <div className="mt-20">
            <EBMSourcesSection
              subtitle="Każde pytanie i zalecenie w teście opiera się na recenzowanych badaniach. Poniżej pełna bibliografia (8 kategorii, 22 referencje) z linkami do PubMed i wytycznych ASCRS / ESCP."
            />
          </div>

          {/* Related links */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="mt-16 grid md:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            <Link
              to="/dla-pacjenta/hemoroidy"
              className="group rounded-xl border border-border bg-background/40 hover:bg-primary/5 hover:border-primary/40 p-5 transition-all"
            >
              <BookOpen className="w-5 h-5 text-primary mb-2.5" />
              <p className="font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
                Hemoroidy od A do Z
              </p>
              <p className="text-xs text-muted-foreground">
                Pełny przewodnik EBM po objawach, stopniach i metodach leczenia.
              </p>
            </Link>
            <Link
              to="/leczenie/lhp"
              className="group rounded-xl border border-border bg-background/40 hover:bg-primary/5 hover:border-primary/40 p-5 transition-all"
            >
              <Stethoscope className="w-5 h-5 text-primary mb-2.5" />
              <p className="font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
                Leczenie laserowe LHP
              </p>
              <p className="text-xs text-muted-foreground">
                Małoinwazyjna metoda z szybkim powrotem do aktywności.
              </p>
            </Link>
            <Link
              to="/dla-pacjenta/proktolog-faq"
              className="group rounded-xl border border-border bg-background/40 hover:bg-primary/5 hover:border-primary/40 p-5 transition-all"
            >
              <ClipboardList className="w-5 h-5 text-primary mb-2.5" />
              <p className="font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
                FAQ proktolog
              </p>
              <p className="text-xs text-muted-foreground">
                Najczęstsze pytania pacjentów do dr Jana Bujoka.
              </p>
            </Link>
          </motion.div>
          <RelatedLinks path="/dla-pacjenta/quiz-hemoroidy" />
        </div>
      </section>
    </>
  );
};

export default QuizHemoroidy;
