/**
 * ConfirmExportDialog — uniwersalny dialog potwierdzenia przed pobraniem
 * pliku JSON/CSV (tu też PDF jeśli ktoś poda format „pdf").
 *
 * Po co: wszystkie eksporty w aplikacji (dziennik hemoroidy, trening
 * profilaktyka, quiz history, checklista ryzyka, vein-images JSON/CSV,
 * admin system health JSON) używają jednego komponentu, żeby user miał
 * spójną ścieżkę „klik → pokaz metadanych → Anuluj/Pobierz". To chroni
 * przed przypadkowym pobraniem dużych plików (np. eksport całej bazy
 * vein_image_overrides przez admina).
 *
 * Komponent jest **kontrolowany** (open + onOpenChange) — wywołujący
 * trzyma stan i decyduje, którą operację potwierdzić. Po kliku „Pobierz"
 * wywołujemy `onConfirm()` i NIE zamykamy dialogu sami — to robi sam
 * AlertDialogAction (default behavior). Hook `useExportConfirmation`
 * abstrahuje typowy boilerplate stanu.
 *
 * UX:
 *  - format renderowany jako kolorowy badge (JSON niebieski, CSV zielony,
 *    PDF złoty),
 *  - opcjonalne `recordsLabel` (np. „14 dni" / „120 wpisów") + opcjonalny
 *    `sizeLabel` („~12 KB"),
 *  - opcjonalna `description` na dole, gdy potrzebny dłuższy kontekst
 *    (np. „Plik trafia tylko do Ciebie, nie wysyłamy go nigdzie").
 *
 * Style: wyłącznie semantic tokeny z design system (primary/destructive/
 * muted/foreground), zero hard-coded kolorów. Badge'y per format mają
 * subtelne tła w tych samych skalach co istniejące „chips" w aplikacji.
 */
import * as React from "react";
import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ExportFormat = "json" | "csv" | "pdf";

export interface ConfirmExportDialogProps {
  /** Kontrolowany stan otwarcia. */
  open: boolean;
  /** Callback Radix przy zmianie stanu (np. ESC/klik tła = false). */
  onOpenChange: (open: boolean) => void;
  /** Wywoływane po kliku „Pobierz". Może być async — błędy łapie wywołujący. */
  onConfirm: () => void | Promise<void>;
  /** Nazwa pliku, jaka zostanie pobrana — pokazujemy ją 1:1 użytkownikowi. */
  filename: string;
  /** Format pliku. Decyduje o ikonie + kolorze badge. */
  format: ExportFormat;
  /**
   * Opisowy tytuł nad nazwą pliku, np. „Eksport dziennika"
   * lub „Backup postępu treningu". Domyślnie „Pobrać plik?".
   */
  title?: string;
  /**
   * Krótka etykieta liczby rekordów / dni / wpisów —
   * np. „14 ukończonych dni", „120 wpisów (60 dni)".
   * Pokazujemy w grid metadanych obok formatu i rozmiaru.
   */
  recordsLabel?: string;
  /**
   * Szacunkowy rozmiar pliku, jeśli wywołujący umie go obliczyć
   * (np. JSON.stringify(payload).length). Format „~12 KB".
   */
  sizeLabel?: string;
  /** Dodatkowy kontekst pod metadanymi (1–2 zdania). */
  description?: React.ReactNode;
  /** Tekst przycisku potwierdzenia. Domyślnie „Pobierz". */
  confirmLabel?: string;
  /** Tekst przycisku anulowania. Domyślnie „Anuluj". */
  cancelLabel?: string;
  /**
   * Gdy true: spinner zamiast ikony download, oba przyciski disabled
   * (Anuluj też — bo i tak nie przerwie operacji JS), aria-busy na content.
   * Hook useExportConfirmation propaguje to automatycznie podczas await run().
   */
  isExporting?: boolean;
}

const FORMAT_META: Record<
  ExportFormat,
  { Icon: React.ComponentType<{ className?: string }>; badgeClass: string; label: string }
> = {
  json: {
    Icon: FileJson,
    label: "JSON",
    // primary = złoty/marka (zgodnie z brand identity); używamy wyłącznie tokenów semantycznych.
    badgeClass: "bg-primary/10 text-primary border-primary/30",
  },
  csv: {
    Icon: FileSpreadsheet,
    label: "CSV",
    // accent w postaci emerald — jedyny dopuszczony hard-coded set (już używany w aplikacji
    // dla „CSV / Excel"). Trzymamy w tym samym wzorze co DiaryFullModule (emerald-500/30).
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  },
  pdf: {
    Icon: FileText,
    label: "PDF",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/40",
  },
};

const ConfirmExportDialog: React.FC<ConfirmExportDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  filename,
  format,
  title = "Pobrać plik?",
  recordsLabel,
  sizeLabel,
  description,
  confirmLabel = "Pobierz",
  cancelLabel = "Anuluj",
  isExporting = false,
}) => {
  const meta = FORMAT_META[format];
  const Icon = meta.Icon;
  const exportingLabel = "Pobieranie…";

  /**
   * Keyboard support: Enter = potwierdź, Esc = anuluj.
   *
   *  • Esc — Radix AlertDialog obsługuje natywnie przez `onOpenChange(false)`,
   *    więc nie trzeba dodatkowego handlera (cancel path zostaje
   *    automatycznie wywołany przez `useExportConfirmation`).
   *  • Enter — Radix domyślnie focusuje przycisk Cancel (a11y best practice
   *    dla destrukcyjnych dialogów), więc Enter nie potwierdziłby eksportu
   *    bez przesunięcia focusa Tabem. Dodajemy globalny listener na
   *    AlertDialogContent, który traktuje Enter jako „kliknięcie Pobierz",
   *    o ile focus NIE jest w polu edytowalnym (input/textarea/contentEditable)
   *    i export nie jest już w toku. Stop propagation + preventDefault, żeby
   *    przeglądarka nie wysłała podwójnego eventu (np. gdy focus akurat jest
   *    na przycisku Confirm — bez tego Enter wywołałby onConfirm dwa razy).
   */
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
      if (isExporting) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable;
      if (isEditable) return;
      e.preventDefault();
      e.stopPropagation();
      void onConfirm();
    },
    [isExporting, onConfirm],
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent aria-busy={isExporting} onKeyDown={handleKeyDown}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2.5">
            <span
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                meta.badgeClass,
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <span>{title}</span>
          </AlertDialogTitle>
          {/*
            AlertDialogDescription musi być prostym tekstem dla a11y.
            Metadane (filename, format, rekordy) renderujemy w osobnym
            bloku poza description — ale wewnątrz tego samego content,
            żeby ekran-readery nadal je czytały (są w treści dialogu).
          */}
          <AlertDialogDescription>
            Plik zostanie pobrany na Twoje urządzenie. Możesz anulować, jeśli to
            był przypadkowy klik.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Blok metadanych — zawsze pokazuje filename i format, a opcjonalnie rekordy/rozmiar. */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-sans uppercase tracking-[0.18em] text-muted-foreground mb-1">
                Nazwa pliku
              </p>
              <p
                className="font-mono text-xs sm:text-sm text-foreground break-all leading-snug"
                title={filename}
              >
                {filename}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                meta.badgeClass,
              )}
              aria-label={`Format: ${meta.label}`}
            >
              {meta.label}
            </span>
          </div>
          {(recordsLabel || sizeLabel) && (
            <dl className="grid grid-cols-2 gap-2 pt-1 text-xs">
              {recordsLabel && (
                <div>
                  <dt className="text-[10px] font-sans uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
                    Zawartość
                  </dt>
                  <dd className="text-foreground">{recordsLabel}</dd>
                </div>
              )}
              {sizeLabel && (
                <div>
                  <dt className="text-[10px] font-sans uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
                    Rozmiar
                  </dt>
                  <dd className="text-foreground">{sizeLabel}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isExporting}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              if (isExporting) {
                // Defensywnie: gdyby Radix nie zablokował kliku przy disabled,
                // nie odpalamy drugiego runa.
                event.preventDefault();
                return;
              }
              // Świadomie nie await — błędy łapie wywołujący przez toast,
              // a hook trzyma stan isExporting do czasu rozliczenia promise.
              void onConfirm();
            }}
            disabled={isExporting}
            className="gap-2"
            aria-live="polite"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {isExporting ? exportingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmExportDialog;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Formatuje rozmiar w bajtach jako „~12 KB" / „~3.4 MB".
 * Używamy w call sites, gdy mamy gotowy string/blob i chcemy oszacować size.
 */
export const formatExportSize = (bytes: number): string => {
  if (bytes < 1024) return `~${bytes} B`;
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`;
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
