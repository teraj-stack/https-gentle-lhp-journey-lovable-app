import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipForward,
  X,
  Volume2,
  VolumeX,
  CheckCircle2,
  RotateCcw,
  Flame,
} from "lucide-react";
import { useWorkoutStreak } from "@/hooks/useWorkoutStreak";

export type WorkoutExercise = {
  Icon: () => JSX.Element;
  title: string;
  technique: string;
  durationSec: number; // czas trwania pojedynczego ćwiczenia
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: WorkoutExercise[];
};

const REST_SEC = 10; // przerwa między ćwiczeniami

const easeOut = [0.16, 1, 0.3, 1] as const;

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const WorkoutModal = ({ open, onOpenChange, exercises }: Props) => {
  const [step, setStep] = useState(0); // index ćwiczenia
  const [phase, setPhase] = useState<"exercise" | "rest" | "done">("exercise");
  const [remaining, setRemaining] = useState(exercises[0]?.durationSec ?? 30);
  const [paused, setPaused] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const intervalRef = useRef<number | null>(null);
  const voiceOnRef = useRef(voiceOn);
  const recordedRef = useRef(false);
  const { currentStreak, recordCompletion } = useWorkoutStreak();

  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);

  // Web Speech API — bezpłatne, działa offline, polski głos
  const speak = (text: string) => {
    if (!voiceOnRef.current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "pl-PL";
      utter.rate = 1;
      utter.pitch = 1;
      utter.volume = 1;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore
    }
  };

  const reset = () => {
    setStep(0);
    setPhase("exercise");
    setRemaining(exercises[0]?.durationSec ?? 30);
    setPaused(false);
    recordedRef.current = false;
  };

  // start / restart przy otwarciu
  useEffect(() => {
    if (open) {
      reset();
      // krótka zachęta
      setTimeout(() => speak(`Trening dnia. Zaczynamy. ${exercises[0]?.title}.`), 250);
    } else {
      // sprzątanie po zamknięciu
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // tikanie zegara
  useEffect(() => {
    if (!open || paused || phase === "done") return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => r - 1);
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [open, paused, phase, step]);

  // przejścia
  useEffect(() => {
    if (remaining > 0) {
      // odliczanie 3-2-1 na koniec ćwiczenia
      if (phase === "exercise" && remaining <= 3 && remaining > 0) {
        speak(String(remaining));
      }
      return;
    }

    if (phase === "exercise") {
      const isLast = step >= exercises.length - 1;
      if (isLast) {
        setPhase("done");
        if (!recordedRef.current) {
          recordedRef.current = true;
          recordCompletion();
        }
        speak("Brawo! Trening dnia zakończony.");
        return;
      }
      setPhase("rest");
      setRemaining(REST_SEC);
      const nextTitle = exercises[step + 1]?.title;
      speak(`Świetnie. Przerwa ${REST_SEC} sekund. Następne ćwiczenie: ${nextTitle}.`);
    } else if (phase === "rest") {
      const nextStep = step + 1;
      setStep(nextStep);
      setPhase("exercise");
      setRemaining(exercises[nextStep]?.durationSec ?? 30);
      speak(`Start. ${exercises[nextStep]?.title}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const skip = () => {
    if (phase === "done") return;
    setRemaining(0);
  };

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (next && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  const current = exercises[step];
  const totalSteps = exercises.length;
  const completed = phase === "done";
  const totalDuration =
    (current?.durationSec ?? 30) + (phase === "rest" ? REST_SEC - REST_SEC : 0);
  const progress =
    phase === "exercise"
      ? Math.round(((current.durationSec - remaining) / current.durationSec) * 100)
      : phase === "rest"
        ? Math.round(((REST_SEC - remaining) / REST_SEC) * 100)
        : 100;

  const overall = completed
    ? 100
    : Math.round(((step + (phase === "rest" ? 1 : progress / 100)) / totalSteps) * 100);

  const Icon = current?.Icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-primary/20 bg-card">
        <div className="relative">
          {/* close */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-background/60 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 md:p-10">
            {/* nagłówek */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[11px] font-sans uppercase tracking-[0.18em] text-primary">
                  Trening dnia · {totalSteps} ćwiczeń
                </p>
                <h3 className="font-heading text-2xl text-foreground">
                  {completed
                    ? "Trening zakończony"
                    : phase === "rest"
                      ? "Przerwa"
                      : `Ćwiczenie ${step + 1} z ${totalSteps}`}
                </h3>
              </div>
              <button
                onClick={() => setVoiceOn((v) => !v)}
                className="w-9 h-9 rounded-full bg-background/60 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                aria-label={voiceOn ? "Wyłącz głos" : "Włącz głos"}
              >
                {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            {/* pasek ogólny */}
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-8">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${overall}%` }}
                transition={{ duration: 0.4, ease: easeOut }}
              />
            </div>

            <AnimatePresence mode="wait">
              {!completed ? (
                <motion.div
                  key={`${phase}-${step}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: easeOut }}
                  className="text-center"
                >
                  {/* piktogram lub karta przerwy */}
                  {phase === "exercise" ? (
                    <div className="w-32 h-32 mx-auto mb-5 rounded-3xl bg-primary/5 border border-primary/20 flex items-center justify-center">
                      <div className="w-20 h-20">{Icon ? <Icon /> : null}</div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto mb-5 rounded-3xl bg-primary/5 border border-primary/20 flex items-center justify-center">
                      <span className="text-4xl">☕</span>
                    </div>
                  )}

                  <h4 className="font-heading text-2xl md:text-3xl text-foreground mb-2">
                    {phase === "exercise" ? current.title : "Złap oddech"}
                  </h4>
                  {phase === "exercise" ? (
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
                      {current.technique}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
                      Następne ćwiczenie:{" "}
                      <span className="text-foreground font-semibold">
                        {exercises[step + 1]?.title}
                      </span>
                    </p>
                  )}

                  {/* duży zegar */}
                  <div className="relative mx-auto w-44 h-44 mb-6">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-muted opacity-40"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className={
                          phase === "rest" ? "text-warm-beige" : "text-primary"
                        }
                        strokeDasharray={2 * Math.PI * 45}
                        animate={{
                          strokeDashoffset:
                            2 * Math.PI * 45 * (1 - progress / 100),
                        }}
                        transition={{ duration: 0.8, ease: "linear" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-heading text-5xl text-foreground tabular-nums">
                        {formatTime(remaining)}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                        {phase === "rest" ? "Przerwa" : "Pozostało"}
                      </span>
                    </div>
                  </div>

                  {/* sterowanie */}
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={togglePause}
                      className="gap-2"
                    >
                      {paused ? (
                        <>
                          <Play className="w-4 h-4" /> Wznów
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4" /> Pauza
                        </>
                      )}
                    </Button>
                    <Button
                      variant="hero"
                      size="lg"
                      onClick={skip}
                      className="gap-2"
                    >
                      <SkipForward className="w-4 h-4" />
                      {phase === "rest" ? "Pomiń przerwę" : "Następne"}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: easeOut }}
                  className="text-center py-6"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <h4 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
                    Brawo!
                  </h4>
                  <p className="text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
                    Ukończyłeś trening dnia. Twoje żyły dziękują — pompa mięśniowa łydki
                    właśnie pracowała przez pełne {totalSteps} ćwiczeń.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="hero" size="lg" onClick={reset} className="gap-2">
                      <RotateCcw className="w-4 h-4" /> Powtórz trening
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => onOpenChange(false)}
                    >
                      Zamknij
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutModal;
