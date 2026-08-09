import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarDays, NotebookPen, Sparkles, ShieldCheck } from "lucide-react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import DiaryFullModule from "@/components/hemoroidy/DiaryFullModule";
import RelatedLinks from "@/components/shared/RelatedLinks";

const easeOut = [0.16, 1, 0.3, 1] as const;

const DziennikHemoroidy = () => {
  const trail = BREADCRUMBS_MAP["/dla-pacjenta/dziennik-hemoroidy"];

  return (
    <>
      <SeoHead
        title="Dziennik 14 dni — hemoroidy | śledź trend ryzyka | CML"
        description="14-dniowy dziennik objawów i nawyków: codzienny quiz 9 pytań, miejsce na notatki, przycisk zapisu dnia, wykres trendu ryzyka. Dane lokalnie w przeglądarce — bez konta."
        path="/dla-pacjenta/dziennik-hemoroidy"
      />
      <MedicalWebPageSchema
        name="Dziennik 14 dni — hemoroidy"
        description="Interaktywny dziennik 14 dni do śledzenia objawów hemoroidów i czynników stylu życia. Codziennie quiz 9 pytań + notatki + przycisk zapisu + wizualizacja trendu ryzyka."
        path="/dla-pacjenta/dziennik-hemoroidy"
      />

      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-4 md:px-8 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
        <div className="max-w-5xl mx-auto relative">
          {trail && <Breadcrumbs items={trail} className="mb-8" />}

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: easeOut }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-5">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-sans uppercase tracking-[0.18em] text-primary">
                14-dniowy dziennik · prywatnie w przeglądarce
              </span>
            </div>
            <h1 className="font-heading text-3xl md:text-5xl text-foreground mb-4 leading-[1.1]">
              Twój <em className="text-primary not-italic">dziennik 14 dni</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Codzienny quiz 9 pytań, miejsce na notatki i przycisk „Zapisz dzień" dla każdej doby.
              Dane są zapisywane lokalnie w Twojej przeglądarce — nie wysyłamy ich nigdzie i nie
              wymagamy konta.
            </p>
          </motion.div>

          <DiaryFullModule reminderVariant="diary-page" showReminderSettings showExport />

          {/* Related links */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="grid md:grid-cols-3 gap-4 mt-8"
          >
            <Link
              to="/dla-pacjenta/quiz-hemoroidy"
              className="group rounded-xl border border-border bg-background/40 hover:bg-primary/5 hover:border-primary/40 p-5 transition-all"
            >
              <Sparkles className="w-5 h-5 text-primary mb-2.5" />
              <p className="font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
                Jednorazowy test ryzyka
              </p>
              <p className="text-xs text-muted-foreground">
                Pełny quiz 9 pytań z dopasowanymi zaleceniami EBM.
              </p>
            </Link>
            <Link
              to="/dla-pacjenta/ebm-hemoroidy"
              className="group rounded-xl border border-border bg-background/40 hover:bg-primary/5 hover:border-primary/40 p-5 transition-all"
            >
              <ShieldCheck className="w-5 h-5 text-primary mb-2.5" />
              <p className="font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
                Profilaktyka — 6 filarów EBM
              </p>
              <p className="text-xs text-muted-foreground">
                Co realnie chroni i kiedy zgłosić się do lekarza.
              </p>
            </Link>
            <Link
              to="/dla-pacjenta/hemoroidy"
              className="group rounded-xl border border-border bg-background/40 hover:bg-primary/5 hover:border-primary/40 p-5 transition-all"
            >
              <NotebookPen className="w-5 h-5 text-primary mb-2.5" />
              <p className="font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
                Hemoroidy od A do Z
              </p>
              <p className="text-xs text-muted-foreground">
                Pełny przewodnik po objawach, stopniach i metodach.
              </p>
            </Link>
          </motion.div>
          <RelatedLinks path="/dla-pacjenta/dziennik-hemoroidy" />
        </div>
      </section>
    </>
  );
};

export default DziennikHemoroidy;
