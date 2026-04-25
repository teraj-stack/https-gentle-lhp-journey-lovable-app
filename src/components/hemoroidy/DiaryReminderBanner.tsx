import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Bell, BellOff, NotebookPen, ClipboardList, ArrowRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDiaryReminders } from "@/hooks/useDiaryReminders";

const easeOut = [0.16, 1, 0.3, 1] as const;

type Variant = "diary-page" | "quiz-page" | "global";

interface Props {
  /** Co robi banner w kontekście:
   *  - "diary-page": jesteśmy na dzienniku → pokazuj tylko "wróć do quizu" jeśli quizDue,
   *    a banner dziennika ukryj (CTA jest tuż obok).
   *  - "quiz-page": jesteśmy na quizie → pokazuj „uzupełnij dziennik" jeśli diaryDue.
   *  - "global": pokazuj oba CTA.
   */
  variant?: Variant;
  className?: string;
}

const DiaryReminderBanner = ({ variant = "global", className = "" }: Props) => {
  const { prefs, status, snoozeToday } = useDiaryReminders();

  const showDiary =
    status.diaryDue && !status.snoozedToday && variant !== "diary-page" && prefs.cadence !== "off";
  const showQuiz =
    status.quizDue && !status.snoozedToday && variant !== "quiz-page" && prefs.quizCadence !== "off";

  if (!showDiary && !showQuiz) return null;

  // Treść — najpierw dziennik (bardziej czasowo zależny), potem quiz
  const primary = showDiary
    ? {
        icon: NotebookPen,
        eyebrow: "Przypomnienie · Dziennik 14 dni",
        title: status.diaryNeverFilled
          ? "Zacznij prowadzić dziennik objawów"
          : `Minęło ${status.diaryDaysSince ?? "?"} ${
              (status.diaryDaysSince ?? 0) === 1 ? "dzień" : "dni"
            } od ostatniego wpisu`,
        body: status.diaryNeverFilled
          ? "Codzienne 9 pytań (~1 min) pokazuje, jak Twoje ryzyko zmienia się w czasie."
          : "Uzupełnij dzisiejszy wpis — utrzymanie regularności daje wiarygodny trend.",
        cta: status.diaryNeverFilled ? "Wypełnij pierwszy wpis" : "Uzupełnij dzisiejszy wpis",
        href: "/dla-pacjenta/dziennik-hemoroidy",
      }
    : {
        icon: ClipboardList,
        eyebrow: "Przypomnienie · Quiz ryzyka",
        title: status.quizNeverCompleted
          ? "Wypełnij quiz ryzyka"
          : `Minęło ${status.quizDaysSince ?? "?"} dni od ostatniego quizu`,
        body: "Powrót do tych samych 9 pytań pokaże, jak zmienił się Twój wynik względem poprzedniego razu.",
        cta: "Wróć do quizu",
        href: "/dla-pacjenta/quiz-hemoroidy",
      };

  const secondary =
    showDiary && showQuiz
      ? {
          icon: ClipboardList,
          eyebrow: "Quiz ryzyka",
          title: status.quizNeverCompleted
            ? "Wypełnij pełny quiz"
            : `${status.quizDaysSince ?? "?"} dni od ostatniego quizu`,
          cta: "Otwórz quiz",
          href: "/dla-pacjenta/quiz-hemoroidy",
        }
      : null;

  const Icon = primary.icon;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: easeOut }}
        role="status"
        aria-live="polite"
        className={`rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background/40 to-background/40 p-4 sm:p-5 ${className}`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.18em] text-primary mb-1">
              {primary.eyebrow}
            </p>
            <h3 className="font-heading text-lg md:text-xl text-foreground leading-tight">
              {primary.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{primary.body}</p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-3.5">
              <Button asChild size="sm" variant="hero" className="gap-1.5">
                <Link to={primary.href}>
                  {primary.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
              {secondary && (
                <Button asChild size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary">
                  <Link to={secondary.href}>
                    {secondary.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={snoozeToday}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Przypomnij jutro"
              >
                <BellOff className="w-3.5 h-3.5" />
                Przypomnij jutro
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Link to="/dla-pacjenta/dziennik-hemoroidy#przypomnienia">
                  <Settings2 className="w-3.5 h-3.5" />
                  Ustawienia
                </Link>
              </Button>
            </div>
          </div>
          <Bell className="hidden sm:block w-4 h-4 text-primary/50 shrink-0 mt-1" aria-hidden />
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

export default DiaryReminderBanner;
