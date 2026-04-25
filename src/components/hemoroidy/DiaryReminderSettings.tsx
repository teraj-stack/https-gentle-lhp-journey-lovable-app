import { motion } from "framer-motion";
import { Bell, BellRing, BellOff, CalendarClock, ClipboardList, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDiaryReminders,
  type DiaryCadence,
  type QuizCadence,
} from "@/hooks/useDiaryReminders";

const easeOut = [0.16, 1, 0.3, 1] as const;

const DIARY_OPTIONS: Array<{ value: DiaryCadence; label: string; sub: string }> = [
  { value: "daily", label: "Codziennie", sub: "Najwierniejszy trend" },
  { value: "every2days", label: "Co 2 dni", sub: "Złoty środek" },
  { value: "every3days", label: "Co 3 dni", sub: "Lekko, bez presji" },
  { value: "off", label: "Wyłączone", sub: "Bez przypomnień" },
];

const QUIZ_OPTIONS: Array<{ value: QuizCadence; label: string; sub: string }> = [
  { value: "weekly", label: "Co tydzień", sub: "Krótka kontrola" },
  { value: "biweekly", label: "Co 2 tygodnie", sub: "Spokojny rytm" },
  { value: "monthly", label: "Co miesiąc", sub: "Tylko duże zmiany" },
  { value: "off", label: "Wyłączone", sub: "Bez przypomnień" },
];

const DiaryReminderSettings = () => {
  const {
    prefs,
    status,
    setCadence,
    setQuizCadence,
    snoozeToday,
    snoozeForDays,
    clearSnooze,
    requestSystemNotifications,
    disableSystemNotifications,
  } = useDiaryReminders();

  const supportsNotifications = typeof window !== "undefined" && "Notification" in window;
  const permission =
    supportsNotifications && typeof Notification !== "undefined"
      ? Notification.permission
      : "default";

  return (
    <motion.section
      id="przypomnienia"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6 md:p-8 mb-8 scroll-mt-32"
      aria-label="Ustawienia przypomnień"
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
          <BellRing className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.18em] text-primary mb-1">
            Przypomnienia w aplikacji
          </p>
          <h2 className="font-heading text-xl md:text-2xl text-foreground leading-tight">
            Ustaw rytm wpisów do dziennika i powrotu do quizu
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Banner przypomnień pojawi się na stronie dziennika i quizu, gdy minie wybrany odstęp.
            Wszystko działa lokalnie w Twojej przeglądarce — bez konta i bez wysyłki danych.
          </p>
        </div>
      </div>

      {/* Diary cadence */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-base md:text-lg text-foreground">
            Dziennik 14 dni — co ile dni przypominać?
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DIARY_OPTIONS.map((opt) => {
            const active = prefs.cadence === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCadence(opt.value)}
                aria-pressed={active}
                className={`text-left p-3 rounded-xl border transition-all ${
                  active
                    ? "border-primary bg-primary/15 ring-1 ring-primary/40"
                    : "border-border bg-background/60 hover:bg-primary/5 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`font-heading text-sm md:text-base ${
                      active ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </span>
                  {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
                <span className="text-[11px] text-muted-foreground leading-snug block">
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quiz cadence */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-base md:text-lg text-foreground">
            Powrót do quizu ryzyka — jak często?
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUIZ_OPTIONS.map((opt) => {
            const active = prefs.quizCadence === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setQuizCadence(opt.value)}
                aria-pressed={active}
                className={`text-left p-3 rounded-xl border transition-all ${
                  active
                    ? "border-primary bg-primary/15 ring-1 ring-primary/40"
                    : "border-border bg-background/60 hover:bg-primary/5 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`font-heading text-sm md:text-base ${
                      active ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </span>
                  {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
                <span className="text-[11px] text-muted-foreground leading-snug block">
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status + snooze controls */}
      <div className="rounded-xl border border-border bg-background/60 p-4 mb-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="text-foreground font-semibold">Dziennik:</span>{" "}
            {status.diaryNeverFilled
              ? "brak wpisów"
              : `ostatni wpis ${status.diaryDaysSince ?? "?"} dni temu`}
            {status.diaryDue && prefs.cadence !== "off" && (
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                czas na wpis
              </span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="text-foreground font-semibold">Quiz:</span>{" "}
            {status.quizNeverCompleted
              ? "nie wypełniony"
              : `ostatnio ${status.quizDaysSince ?? "?"} dni temu`}
            {status.quizDue && prefs.quizCadence !== "off" && (
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                pora wrócić
              </span>
            )}
          </span>
          {status.snoozedToday && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <BellOff className="w-3.5 h-3.5" />
              Wyciszone do końca {prefs.snoozedUntil}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={snoozeToday}
            className="gap-1.5"
            disabled={status.snoozedToday}
          >
            <BellOff className="w-3.5 h-3.5" />
            Wycisz na dziś
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => snoozeForDays(3)}
            className="gap-1.5"
          >
            <BellOff className="w-3.5 h-3.5" />
            Wycisz na 3 dni
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => snoozeForDays(7)}
            className="gap-1.5"
          >
            <BellOff className="w-3.5 h-3.5" />
            Wycisz na tydzień
          </Button>
          {prefs.snoozedUntil && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSnooze}
              className="gap-1.5"
            >
              Wznów teraz
            </Button>
          )}
        </div>
      </div>

      {/* System notifications (opcjonalne) */}
      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-heading text-sm md:text-base text-foreground mb-1">
              Powiadomienia systemowe (opcjonalnie)
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Gdy odwiedzasz tę stronę i jest „pora" na wpis, wyświetlimy delikatne powiadomienie
              w systemie. Bez backendu — działa tylko gdy masz otwartą zakładkę z aplikacją.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {!supportsNotifications ? (
                <span className="text-xs italic text-muted-foreground">
                  Twoja przeglądarka nie wspiera powiadomień systemowych.
                </span>
              ) : prefs.systemNotifications && permission === "granted" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={disableSystemNotifications}
                  className="gap-1.5"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  Wyłącz powiadomienia systemowe
                </Button>
              ) : permission === "denied" ? (
                <span className="text-xs italic text-muted-foreground">
                  Powiadomienia są zablokowane w ustawieniach przeglądarki — zmień to ręcznie.
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="hero"
                  onClick={() => requestSystemNotifications()}
                  className="gap-1.5"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  Włącz powiadomienia systemowe
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default DiaryReminderSettings;
