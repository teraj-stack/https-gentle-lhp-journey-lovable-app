import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  FileJson,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkoutStreak } from "@/hooks/useWorkoutStreak";
import { downloadWorkoutProgressJson } from "@/lib/workoutProgressExport";
import { parseWorkoutProgressFile } from "@/lib/workoutProgressImport";

const easeOut = [0.16, 1, 0.3, 1] as const;

/** Statyczny przykład struktury eksportu — pokazywany w Popoverze "Co jest w pliku?". */
const SAMPLE_JSON = `{
  "schema": "cml-workout-progress",
  "schemaVersion": 1,
  "exportedAt": "2026-04-17T08:30:00.000Z",
  "source": {
    "app": "Centrum Medycyny Laserowej",
    "page": "/dla-pacjenta/profilaktyka-zylakow",
    "feature": "Trening dnia — profilaktyka żylaków"
  },
  "summary": {
    "currentStreak": 14,
    "totalDays": 18,
    "firstDayISO": "2026-03-30",
    "lastDayISO": "2026-04-17",
    "milestonesAchieved": [7, 14],
    "nextMilestone": 30,
    "daysToNextMilestone": 16
  },
  "history": {
    "days": ["2026-03-30", "2026-03-31", "...", "2026-04-17"]
  }
}`;

const BackupProgressSection = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const { currentStreak, totalDays, days, reset, mergeImportedDays } = useWorkoutStreak();

  const handleCopySample = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SAMPLE_JSON);
      } else {
        const ta = document.createElement("textarea");
        ta.value = SAMPLE_JSON;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Przykład JSON skopiowany do schowka.", {
        description: "Wklej go w edytorze, żeby obejrzeć strukturę.",
      });
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Nie udało się skopiować przykładu.", {
        description: "Spróbuj zaznaczyć tekst w polu poniżej i skopiować ręcznie.",
      });
    }
  };

  const handleExport = () => {
    if (totalDays === 0) {
      toast.info("Brak postępu do wyeksportowania.", {
        description: "Najpierw ukończ przynajmniej jeden trening dnia.",
      });
      return;
    }
    const result = downloadWorkoutProgressJson({ currentStreak, totalDays, days });
    if (result) {
      toast.success("Postęp wyeksportowany do pliku JSON.", {
        description: `${result.filename} · ${result.totalDays} ${result.totalDays === 1 ? "ukończony dzień" : "ukończonych dni"}`,
      });
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    const result = await parseWorkoutProgressFile(file);
    if (result.ok === false) {
      toast.error("Nie udało się zaimportować pliku.", {
        description: result.error.message,
      });
      return;
    }

    const stats = mergeImportedDays(result.data.days);
    if (stats.added === 0) {
      toast.info("Brak nowych dni do dodania.", {
        description: `Wszystkie ${stats.duplicates} ${stats.duplicates === 1 ? "dzień" : "dni"} z pliku już istnieją w historii.`,
      });
      return;
    }

    toast.success("Postęp został zaimportowany.", {
      description: `Dodano ${stats.added} ${stats.added === 1 ? "nowy dzień" : "nowych dni"}${stats.duplicates > 0 ? ` · pominięto ${stats.duplicates} duplikat${stats.duplicates === 1 ? "" : "ów"}` : ""} · łącznie ${stats.total} dni w historii.`,
    });
  };

  return (
    <motion.section
      id="backup"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className="glass-card rounded-2xl p-6 md:p-8 max-w-3xl mx-auto scroll-mt-24"
      aria-labelledby="backup-progress-heading"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      <header className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[11px] font-sans uppercase tracking-[0.18em] text-primary mb-1">
            Bezpieczeństwo Twojego streaka
          </p>
          <h3
            id="backup-progress-heading"
            className="font-heading text-xl md:text-2xl text-foreground"
          >
            Backup postępu treningu
          </h3>
        </div>
      </header>

      <div className="space-y-2.5 mb-6 text-sm text-muted-foreground leading-relaxed">
        <p className="flex items-start gap-2">
          <Smartphone className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Twój postęp jest zapisywany <strong className="text-foreground">tylko w tej przeglądarce</strong>.
            Wyczyszczenie ciasteczek, tryb incognito lub zmiana urządzenia oznaczają utratę historii.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <FileJson className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Pobierz mały plik <code className="text-foreground/90 font-mono text-[12px] bg-primary/10 px-1.5 py-0.5 rounded">.json</code> z Twoim
            streakiem i listą ukończonych dni — przenieś go między urządzeniami albo zachowaj jako kopię zapasową.
          </span>
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={totalDays === 0}
          className="group flex items-center gap-3 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border/60 disabled:hover:bg-transparent"
          aria-label="Eksportuj postęp treningu do pliku JSON"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
            <Download className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-base text-foreground leading-tight">
              Eksportuj postęp
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalDays === 0
                ? "Najpierw ukończ trening"
                : `Pobierz ${totalDays} ${totalDays === 1 ? "dzień" : "dni"} jako .json`}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          className="group flex items-center gap-3 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
          aria-label="Importuj postęp treningu z pliku JSON"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
            <Upload className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-base text-foreground leading-tight">
              Importuj postęp
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Wczytaj wcześniej pobrany plik .json
            </p>
          </div>
        </button>
      </div>

      <div className="mt-5 pt-4 border-t border-border/40 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-sans text-muted-foreground/70 hover:text-primary transition-colors"
              aria-label="Pokaż przykładową strukturę pliku JSON z postępem"
            >
              <HelpCircle className="w-3 h-3" />
              Co jest w pliku?
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="w-[min(92vw,30rem)] p-0 border-primary/20 bg-card/95 backdrop-blur"
          >
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileJson className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <p className="text-[11px] font-sans uppercase tracking-[0.18em] text-primary truncate">
                    Pełna transparentność
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySample}
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-sans text-muted-foreground/80 hover:text-primary transition-colors shrink-0 px-2 py-1 rounded-md border border-border/50 hover:border-primary/40 hover:bg-primary/5"
                  aria-label={copied ? "Skopiowano przykład JSON do schowka" : "Skopiuj przykład JSON do schowka"}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-primary" aria-hidden="true" />
                      Skopiowano
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      Skopiuj przykład
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-foreground leading-snug">
                Plik <code className="font-mono text-[12px] bg-primary/10 text-foreground/90 px-1.5 py-0.5 rounded">.json</code>{" "}
                zawiera wyłącznie Twoją historię treningu — bez danych osobowych, bez identyfikatorów, bez śledzenia.
              </p>
            </div>
            <pre
              className="text-[10.5px] leading-relaxed font-mono text-foreground/85 p-4 max-h-72 overflow-auto bg-background/40 rounded-b-md"
              aria-label="Przykładowa struktura pliku JSON"
            >
              <code>{SAMPLE_JSON}</code>
            </pre>
          </PopoverContent>
        </Popover>

        {totalDays > 0 && (
          <>
            <span className="hidden sm:inline-block h-3 w-px bg-border/60" aria-hidden="true" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-sans text-muted-foreground/70 hover:text-destructive transition-colors"
                  aria-label="Zresetuj postęp treningu"
                >
                  <RotateCcw className="w-3 h-3" />
                  Zresetuj postęp
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-heading">
                    Zresetować cały postęp?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Stracisz aktualny streak ({currentStreak}{" "}
                    {currentStreak === 1 ? "dzień" : "dni"} z rzędu) oraz historię {totalDays}{" "}
                    ukończonych dni. Tej operacji nie można cofnąć.
                    <br />
                    <br />
                    <span className="text-foreground font-semibold">Wskazówka:</span>{" "}
                    jeśli chcesz zachować historię, najpierw użyj opcji{" "}
                    <span className="text-foreground">Eksportuj postęp</span> powyżej.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      reset();
                      toast.success("Postęp został zresetowany.");
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Tak, zresetuj
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </motion.section>
  );
};

export default BackupProgressSection;
