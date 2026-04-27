/**
 * useExportConfirmation — drobny hook na boilerplate dialogu potwierdzenia
 * eksportu. Trzyma:
 *   • `open` — czy dialog widoczny,
 *   • `pending` — co user zamierzał pobrać (filename/format/metadane + akcja),
 *   • `request(...)` — call site woła zamiast bezpośrednio swojego export(),
 *   • `confirm()` — wywoływane przez ConfirmExportDialog (onConfirm),
 *   • `cancel()` — wywoływane przez Radix (onOpenChange(false)).
 *
 * Wzorzec użycia w komponencie:
 *
 *   const exportDialog = useExportConfirmation();
 *
 *   const handleExportCsv = () => {
 *     exportDialog.request({
 *       filename: "diary.csv",
 *       format: "csv",
 *       recordsLabel: "60 dni",
 *       sizeLabel: "~8 KB",
 *       run: () => exportDiaryCsv(...),
 *     });
 *   };
 *
 *   <Button onClick={handleExportCsv}>Pobierz CSV</Button>
 *   <ConfirmExportDialog
 *     {...exportDialog.dialogProps}
 *     title="Eksport dziennika"
 *   />
 *
 * Dzięki spread `dialogProps` wywołujący NIE musi sam łączyć open/onOpenChange/
 * onConfirm/filename/format/etc. — wszystko leci z hooka.
 */
import { useCallback, useMemo, useState } from "react";

import type {
  ConfirmExportDialogProps,
  ExportFormat,
} from "@/components/shared/ConfirmExportDialog";

export interface ExportRequest {
  filename: string;
  format: ExportFormat;
  recordsLabel?: string;
  sizeLabel?: string;
  description?: React.ReactNode;
  /** Akcja eksportu wywołana po potwierdzeniu. */
  run: () => void | Promise<void>;
}

/** Subset propsów do spreadowania bezpośrednio na <ConfirmExportDialog />. */
export type DialogProps = Pick<
  ConfirmExportDialogProps,
  | "open"
  | "onOpenChange"
  | "onConfirm"
  | "filename"
  | "format"
  | "recordsLabel"
  | "sizeLabel"
  | "description"
>;

export interface UseExportConfirmationApi {
  /** Otwiera dialog z opisem konkretnego eksportu. */
  request: (req: ExportRequest) => void;
  /** Spread bezpośrednio na <ConfirmExportDialog />. */
  dialogProps: DialogProps;
}

export const useExportConfirmation = (): UseExportConfirmationApi => {
  const [pending, setPending] = useState<ExportRequest | null>(null);

  const request = useCallback((req: ExportRequest) => {
    setPending(req);
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    if (!next) setPending(null);
  }, []);

  const onConfirm = useCallback(async () => {
    const current = pending;
    if (!current) return;
    // Najpierw zamykamy dialog (Radix sam to zrobi, ale czyścimy `pending`),
    // potem odpalamy export — jeśli rzuci, toast w call site to obsłuży.
    setPending(null);
    await current.run();
  }, [pending]);

  const dialogProps: DialogProps = useMemo(
    () => ({
      open: pending !== null,
      onOpenChange,
      onConfirm,
      // Domyślne wartości placeholderów dla zamkniętego stanu — Radix i tak
      // nie renderuje content, ale TS wymaga stringów.
      filename: pending?.filename ?? "",
      format: pending?.format ?? "json",
      recordsLabel: pending?.recordsLabel,
      sizeLabel: pending?.sizeLabel,
      description: pending?.description,
    }),
    [pending, onOpenChange, onConfirm],
  );

  return { request, dialogProps };
};
