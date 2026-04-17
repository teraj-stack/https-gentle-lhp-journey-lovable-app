import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLastExportTimestamp } from "@/hooks/useLastExportTimestamp";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * Czyta zapisany ISO timestamp i zwraca pacjentowi przyjazny komunikat
 * w stylu „dzisiaj" / „wczoraj" / „X dni temu". Bez bibliotek (i18n) — celowo,
 * bo cała sekcja jest po polsku i to jedyne miejsce, gdzie tego potrzebujemy.
 */
const formatDaysAgo = (iso: string): { label: string; title: string } | null => {
  const exportedAt = new Date(iso);
  if (Number.isNaN(exportedAt.getTime())) return null;

  // Liczymy DNI KALENDARZOWE, nie godziny — pacjent oczekuje
  // „wczoraj" gdy eksport był ~26h temu (a nie „1 dzień temu" jeśli >24h ale <kalendarzowo).
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfExportDay = new Date(exportedAt);
  startOfExportDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (startOfToday.getTime() - startOfExportDay.getTime()) / MS_IN_DAY,
  );

  let label: string;
  if (diffDays <= 0) label = "dzisiaj";
  else if (diffDays === 1) label = "wczoraj";
  else if (diffDays < 5) label = `${diffDays} dni temu`;
  else label = `${diffDays} dni temu`;

  // Pełna data jako tooltip — przydatna gdy pacjent chce dokładnie wiedzieć kiedy.
  const title = exportedAt.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return { label, title };
};

const LastExportIndicator = () => {
  const iso = useLastExportTimestamp();
  // tick co 60s sprawia, że licznik aktualizuje się sam, gdy minie północ
  // i status "dzisiaj" → "wczoraj" zmieni się bez przeładowania strony.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [iso]);

  if (!iso) return null;
  const formatted = formatDaysAgo(iso);
  if (!formatted) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-sans text-muted-foreground/70"
      title={`Ostatni eksport: ${formatted.title}`}
      aria-label={`Ostatni eksport postępu: ${formatted.label}, dokładnie ${formatted.title}`}
    >
      <Clock className="w-3 h-3" aria-hidden="true" />
      Ostatni eksport: <span className="text-foreground/80">{formatted.label}</span>
    </span>
  );
};

export default LastExportIndicator;
