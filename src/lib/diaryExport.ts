import jsPDF from "jspdf";
import { HEMOROIDY_QUESTIONS, RiskLevel } from "@/lib/hemoroidyQuizData";
import type { DiaryEntry } from "@/hooks/useDailyDiary";

/* ---------- Wspólne dane podsumowania trendu ---------- */

export type TrendPoint = {
  date: string;
  score: number | null;
  level: RiskLevel | null;
  hasNotes: boolean;
};

export type DiarySummary = {
  filledDays: number;
  totalDays: number;
  averageScore: number | null;
  bestDay: { date: string; score: number } | null;
  worstDay: { date: string; score: number } | null;
  firstScore: number | null;
  lastScore: number | null;
  delta: number | null;
  trendDirection: "down" | "flat" | "up" | "n/a";
  levelCounts: Record<RiskLevel | "none", number>;
  rangeFrom: string;
  rangeTo: string;
};

export const buildDiarySummary = (
  trend: TrendPoint[],
  entries: Record<string, DiaryEntry>,
): DiarySummary => {
  const filled = trend.filter((d) => d.score !== null) as Array<
    TrendPoint & { score: number }
  >;
  const counts: Record<RiskLevel | "none", number> = { low: 0, medium: 0, high: 0, none: 0 };
  trend.forEach((d) => {
    counts[d.level ?? "none"]++;
  });

  const sortedByScore = [...filled].sort((a, b) => a.score - b.score);
  const avg =
    filled.length > 0
      ? Math.round((filled.reduce((s, d) => s + d.score, 0) / filled.length) * 10) / 10
      : null;
  const first = filled[0]?.score ?? null;
  const last = filled[filled.length - 1]?.score ?? null;
  const delta = first !== null && last !== null ? last - first : null;
  const trendDirection: DiarySummary["trendDirection"] =
    delta === null ? "n/a" : delta < 0 ? "down" : delta > 0 ? "up" : "flat";

  // Take notes-aware entries from the entries map (some days may have notes without score)
  void entries; // currently not aggregated, future-proof

  return {
    filledDays: filled.length,
    totalDays: trend.length,
    averageScore: avg,
    bestDay: sortedByScore[0] ? { date: sortedByScore[0].date, score: sortedByScore[0].score } : null,
    worstDay: sortedByScore.length
      ? {
          date: sortedByScore[sortedByScore.length - 1].date,
          score: sortedByScore[sortedByScore.length - 1].score,
        }
      : null,
    firstScore: first,
    lastScore: last,
    delta,
    trendDirection,
    levelCounts: counts,
    rangeFrom: trend[0]?.date ?? "",
    rangeTo: trend[trend.length - 1]?.date ?? "",
  };
};

/* ---------- Helpers ---------- */

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Niskie",
  medium: "Średnie",
  high: "Wysokie",
};

const formatDayPL = (key: string): string => {
  if (!key) return "—";
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
};

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a short delay so the browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* ---------- CSV ---------- */

const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportDiaryCsv = (
  trend: TrendPoint[],
  entries: Record<string, DiaryEntry>,
  summary: DiarySummary,
): void => {
  const sep = ";"; // Excel-friendly w PL
  const rows: string[] = [];

  // ---- Sekcja 1: Podsumowanie ----
  rows.push("# Dziennik 14 dni — podsumowanie");
  rows.push(
    ["Zakres", `${formatDayPL(summary.rangeFrom)} – ${formatDayPL(summary.rangeTo)}`]
      .map(csvEscape)
      .join(sep),
  );
  rows.push(
    ["Wypelnionych dni", `${summary.filledDays}/${summary.totalDays}`]
      .map(csvEscape)
      .join(sep),
  );
  rows.push(
    ["Sredni wynik (pkt)", summary.averageScore ?? "—"].map(csvEscape).join(sep),
  );
  rows.push(
    ["Pierwszy wynik (pkt)", summary.firstScore ?? "—"].map(csvEscape).join(sep),
  );
  rows.push(
    ["Ostatni wynik (pkt)", summary.lastScore ?? "—"].map(csvEscape).join(sep),
  );
  rows.push(
    [
      "Zmiana (ostatni − pierwszy)",
      summary.delta === null
        ? "—"
        : `${summary.delta > 0 ? "+" : ""}${summary.delta} pkt (${
            summary.trendDirection === "down"
              ? "trend spadkowy"
              : summary.trendDirection === "up"
              ? "trend wzrostowy"
              : "bez zmian"
          })`,
    ]
      .map(csvEscape)
      .join(sep),
  );
  rows.push(
    [
      "Najlepszy dzien",
      summary.bestDay
        ? `${formatDayPL(summary.bestDay.date)} (${summary.bestDay.score} pkt)`
        : "—",
    ]
      .map(csvEscape)
      .join(sep),
  );
  rows.push(
    [
      "Najgorszy dzien",
      summary.worstDay
        ? `${formatDayPL(summary.worstDay.date)} (${summary.worstDay.score} pkt)`
        : "—",
    ]
      .map(csvEscape)
      .join(sep),
  );
  rows.push(
    [
      "Rozklad poziomow ryzyka",
      `Niskie: ${summary.levelCounts.low}, Srednie: ${summary.levelCounts.medium}, Wysokie: ${summary.levelCounts.high}, Brak wpisu: ${summary.levelCounts.none}`,
    ]
      .map(csvEscape)
      .join(sep),
  );
  rows.push("");

  // ---- Sekcja 2: Wpisy dzienne ----
  rows.push("# Wpisy dzienne");
  const header = [
    "Data",
    "Wynik (pkt)",
    "Maks (pkt)",
    "Poziom ryzyka",
    "Komplet (9/9)",
    ...HEMOROIDY_QUESTIONS.map((q, i) => `Q${i + 1}: ${q.q}`),
    "Notatki",
  ];
  rows.push(header.map(csvEscape).join(sep));

  trend.forEach((d) => {
    const e = entries[d.date];
    const answers = HEMOROIDY_QUESTIONS.map((q, i) => {
      const idx = e?.answers[i];
      if (idx === null || idx === undefined) return "";
      const opt = q.options[idx];
      return opt ? `${opt.label} (${opt.points} pkt)` : "";
    });
    rows.push(
      [
        formatDayPL(d.date),
        e?.complete ? e.score : e?.score ?? "",
        e?.maxScore ?? "",
        e?.complete && e.level ? RISK_LABEL[e.level] : "",
        e?.complete ? "tak" : e ? "nie" : "",
        ...answers,
        e?.notes ?? "",
      ]
        .map(csvEscape)
        .join(sep),
    );
  });

  // BOM dla Excela (PL znaki)
  const csv = "\uFEFF" + rows.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `cml-dziennik-hemoroidy-${stamp}.csv`);
};

/* ---------- PDF ---------- */

const BRAND_GOLD: [number, number, number] = [201, 168, 76];
const TEXT_DARK: [number, number, number] = [30, 30, 30];
const TEXT_MUTED: [number, number, number] = [100, 100, 100];
const LOW_COLOR: [number, number, number] = [76, 175, 120];
const MED_COLOR: [number, number, number] = [201, 168, 76];
const HIGH_COLOR: [number, number, number] = [180, 40, 40];
const BG_SOFT: [number, number, number] = [248, 245, 235];

const stripDiacritics = (input: string): string => {
  const map: Record<string, string> = {
    ą: "a", Ą: "A", ć: "c", Ć: "C", ę: "e", Ę: "E",
    ł: "l", Ł: "L", ń: "n", Ń: "N", ó: "o", Ó: "O",
    ś: "s", Ś: "S", ź: "z", Ź: "Z", ż: "z", Ż: "Z",
    "–": "-", "—": "-", "·": "-", "„": '"', "”": '"',
    "’": "'", "‘": "'",
  };
  return input.replace(/[ąĄćĆęĘłŁńŃóÓśŚźŹżŻ–—·„”’‘]/g, (ch) => map[ch] ?? ch);
};
const s = (input: string) => stripDiacritics(input);

const colorForLevel = (level: RiskLevel | null): [number, number, number] => {
  if (level === "low") return LOW_COLOR;
  if (level === "medium") return MED_COLOR;
  if (level === "high") return HIGH_COLOR;
  return [200, 200, 200];
};

export const exportDiaryPdf = (
  trend: TrendPoint[],
  entries: Record<string, DiaryEntry>,
  summary: DiarySummary,
  maxScore: number,
): void => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = margin;
    }
  };

  /* ===== Header band ===== */
  doc.setFillColor(...BRAND_GOLD);
  doc.rect(0, 0, pageWidth, 8, "F");

  y = margin + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_GOLD);
  doc.text(s("CML — Centrum Medycyny Laserowej"), margin, y);

  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s("Dziennik 14 dni — hemoroidy"), margin, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_MUTED);
  const today = new Date().toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(
    s(
      `Wygenerowano: ${today}  •  Zakres: ${formatDayPL(summary.rangeFrom)} – ${formatDayPL(summary.rangeTo)}`,
    ),
    margin,
    y,
  );

  /* ===== Summary box ===== */
  y += 6;
  const summaryHeight = 42;
  doc.setFillColor(...BG_SOFT);
  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, summaryHeight, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_GOLD);
  doc.text(s("PODSUMOWANIE TRENDU"), margin + 5, y + 7);

  // 2 columns
  const colX1 = margin + 5;
  const colX2 = margin + contentWidth / 2 + 2;
  const rowY = y + 14;
  const lineH = 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);

  const stat = (label: string, value: string, x: number, line: number) => {
    doc.setTextColor(...TEXT_MUTED);
    doc.text(s(label), x, rowY + line * lineH);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.text(s(value), x + 48, rowY + line * lineH);
    doc.setFont("helvetica", "normal");
  };

  stat("Wypełnione dni:", `${summary.filledDays} / ${summary.totalDays}`, colX1, 0);
  stat(
    "Średnia (pkt):",
    summary.averageScore !== null ? `${summary.averageScore}` : "—",
    colX1,
    1,
  );
  stat(
    "Pierwszy wynik:",
    summary.firstScore !== null ? `${summary.firstScore} pkt` : "—",
    colX1,
    2,
  );
  stat(
    "Ostatni wynik:",
    summary.lastScore !== null ? `${summary.lastScore} pkt` : "—",
    colX1,
    3,
  );

  const deltaText =
    summary.delta === null
      ? "—"
      : `${summary.delta > 0 ? "+" : ""}${summary.delta} pkt`;
  const trendText =
    summary.trendDirection === "down"
      ? "↓ trend spadkowy"
      : summary.trendDirection === "up"
      ? "↑ trend wzrostowy"
      : summary.trendDirection === "flat"
      ? "→ bez zmian"
      : "—";

  stat("Zmiana:", `${deltaText}  (${trendText})`, colX2, 0);
  stat(
    "Najlepszy dzień:",
    summary.bestDay
      ? `${formatDayPL(summary.bestDay.date)} (${summary.bestDay.score} pkt)`
      : "—",
    colX2,
    1,
  );
  stat(
    "Najgorszy dzień:",
    summary.worstDay
      ? `${formatDayPL(summary.worstDay.date)} (${summary.worstDay.score} pkt)`
      : "—",
    colX2,
    2,
  );
  stat(
    "Rozkład poziomów:",
    `N:${summary.levelCounts.low}  Ś:${summary.levelCounts.medium}  W:${summary.levelCounts.high}  —:${summary.levelCounts.none}`,
    colX2,
    3,
  );

  y += summaryHeight + 6;

  /* ===== Mini sparkline trend ===== */
  ensureSpace(38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s("Wykres trendu (im niżej, tym lepiej)"), margin, y);
  y += 4;

  const chartH = 28;
  const chartW = contentWidth;
  const chartX = margin;
  const chartY = y;

  // Box
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.rect(chartX, chartY, chartW, chartH);

  // Threshold lines (8 = low/medium boundary, 17 = medium/high)
  const yForScore = (score: number): number =>
    chartY + chartH - (score / Math.max(1, maxScore)) * chartH;

  // Low band
  doc.setFillColor(232, 245, 233);
  doc.rect(chartX, yForScore(8), chartW, chartY + chartH - yForScore(8), "F");
  // High band
  doc.setFillColor(253, 240, 240);
  doc.rect(chartX, chartY, chartW, yForScore(17) - chartY, "F");

  // Threshold dashed lines
  doc.setDrawColor(160, 160, 160);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(chartX, yForScore(8), chartX + chartW, yForScore(8));
  doc.line(chartX, yForScore(17), chartX + chartW, yForScore(17));
  doc.setLineDashPattern([], 0);

  // Plot points + line
  const stepX = chartW / Math.max(1, trend.length - 1);
  const points: Array<{ x: number; y: number; level: RiskLevel | null }> = trend.map((d, i) => ({
    x: chartX + i * stepX,
    y: d.score !== null ? yForScore(d.score) : NaN,
    level: d.level,
  }));

  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(0.6);
  let prev: { x: number; y: number } | null = null;
  points.forEach((p) => {
    if (!Number.isNaN(p.y)) {
      if (prev) doc.line(prev.x, prev.y, p.x, p.y);
      prev = { x: p.x, y: p.y };
    } else {
      prev = null;
    }
  });

  points.forEach((p) => {
    if (Number.isNaN(p.y)) return;
    const c = colorForLevel(p.level);
    doc.setFillColor(...c);
    doc.circle(p.x, p.y, 1.2, "F");
  });

  // X-axis day labels (co 2. dzień)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  trend.forEach((d, i) => {
    if (i % 2 !== 0 && i !== trend.length - 1) return;
    const [, m, day] = d.date.split("-");
    doc.text(`${day}.${m}`, chartX + i * stepX, chartY + chartH + 4, { align: "center" });
  });

  y = chartY + chartH + 9;

  /* ===== Daily entries table ===== */
  ensureSpace(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s("Dzienne wpisy"), margin, y);
  y += 5;

  // Header row
  const cols = [
    { label: "Data", w: 22 },
    { label: "Wynik", w: 16 },
    { label: "Poziom", w: 22 },
    { label: "Status", w: 18 },
    { label: "Notatki", w: contentWidth - 22 - 16 - 22 - 18 },
  ];

  doc.setFillColor(...BG_SOFT);
  doc.rect(margin, y, contentWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  let cx = margin + 2;
  cols.forEach((c) => {
    doc.text(s(c.label), cx, y + 4);
    cx += c.w;
  });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  trend.forEach((d, idx) => {
    const e = entries[d.date];
    const notesRaw = e?.notes?.trim() ?? "";
    const notesLines = notesRaw
      ? doc.splitTextToSize(s(notesRaw), cols[4].w - 2)
      : ["—"];
    const rowH = Math.max(6, notesLines.length * 4 + 2);

    ensureSpace(rowH + 2);

    // alternating zebra
    if (idx % 2 === 0) {
      doc.setFillColor(252, 250, 245);
      doc.rect(margin, y, contentWidth, rowH, "F");
    }

    const cellY = y + 4;
    cx = margin + 2;

    // Data
    doc.setTextColor(...TEXT_DARK);
    doc.text(s(formatDayPL(d.date)), cx, cellY);
    cx += cols[0].w;

    // Wynik
    if (e?.complete) {
      doc.text(`${e.score}`, cx, cellY);
    } else if (e?.score) {
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`(${e.score})`, cx, cellY);
      doc.setTextColor(...TEXT_DARK);
    } else {
      doc.setTextColor(...TEXT_MUTED);
      doc.text("—", cx, cellY);
      doc.setTextColor(...TEXT_DARK);
    }
    cx += cols[1].w;

    // Poziom + kolorowa kropka
    const lvl = e?.complete ? e.level : null;
    if (lvl) {
      const c = colorForLevel(lvl);
      doc.setFillColor(...c);
      doc.circle(cx + 1.5, cellY - 1.2, 1.2, "F");
      doc.setTextColor(...TEXT_DARK);
      doc.text(s(RISK_LABEL[lvl]), cx + 4, cellY);
    } else {
      doc.setTextColor(...TEXT_MUTED);
      doc.text("—", cx, cellY);
      doc.setTextColor(...TEXT_DARK);
    }
    cx += cols[2].w;

    // Status
    const status = e?.complete ? "9/9" : e ? `${e.answers.filter((a) => a !== null).length}/9` : "—";
    doc.setTextColor(e?.complete ? TEXT_DARK[0] : TEXT_MUTED[0], 100, 100);
    doc.setTextColor(...(e?.complete ? TEXT_DARK : TEXT_MUTED));
    doc.text(s(status), cx, cellY);
    doc.setTextColor(...TEXT_DARK);
    cx += cols[3].w;

    // Notatki
    if (notesRaw) {
      doc.text(notesLines, cx, cellY);
    } else {
      doc.setTextColor(...TEXT_MUTED);
      doc.text("—", cx, cellY);
      doc.setTextColor(...TEXT_DARK);
    }

    y += rowH;
    doc.setDrawColor(235, 230, 215);
    doc.setLineWidth(0.1);
    doc.line(margin, y, margin + contentWidth, y);
  });

  y += 4;

  /* ===== Disclaimer ===== */
  ensureSpace(20);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  const disc = doc.splitTextToSize(
    s(
      "Dokument edukacyjny CML — nie zastępuje konsultacji lekarskiej. Każde krwawienie z odbytu lub utrzymujące się objawy wymagają oceny proktologa. Źródła EBM: ASCRS, ESCP.",
    ),
    contentWidth,
  );
  doc.text(disc, margin, y);

  /* ===== Footer per page ===== */
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = pageHeight - 10;
    doc.setDrawColor(...BRAND_GOLD);
    doc.setLineWidth(0.3);
    doc.line(margin, fy - 3, pageWidth - margin, fy - 3);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(s("CML — mcml.pl"), margin, fy);
    doc.text(s(`Strona ${p} / ${pageCount}`), pageWidth - margin, fy, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`cml-dziennik-hemoroidy-${stamp}.pdf`);
};

/* ---------- Eksport pojedynczego dnia (JSON + PDF) ---------- */

/**
 * Czytelny snapshot odpowiedzi quizu z jednego dnia. Zawiera nie tylko surowe indeksy
 * (pole `answers`), ale też pełny opis każdego pytania, wybranej opcji i punktów —
 * dzięki temu plik jest samowystarczalny (lekarz może go odczytać bez znajomości aplikacji).
 */
export const exportSingleDayJson = (entry: DiaryEntry): void => {
  const payload = {
    schema: "cml.hemoroidy.diary.day.v1",
    exportedAt: new Date().toISOString(),
    source: "CML — Centrum Medycyny Laserowej (mcml.pl)",
    date: entry.date,
    score: entry.score,
    maxScore: entry.maxScore,
    complete: entry.complete,
    riskLevel: entry.level,
    riskLabel: entry.complete && entry.level ? RISK_LABEL[entry.level] : null,
    updatedAt: entry.updatedAt,
    notes: entry.notes ?? "",
    answers: HEMOROIDY_QUESTIONS.map((q, i) => {
      const idx = entry.answers[i];
      const opt = idx !== null && idx !== undefined ? q.options[idx] : null;
      return {
        questionIndex: i,
        questionId: q.id,
        question: q.q,
        selectedOptionIndex: idx,
        selectedOption: opt ? opt.label : null,
        points: opt ? opt.points : null,
      };
    }),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  triggerDownload(blob, `cml-dziennik-hemoroidy-${entry.date}.json`);
};

/**
 * Jednostronicowy PDF z odpowiedziami z konkretnego dnia — do druku/zabrania na konsultację.
 * Layout: nagłówek brand → karta wyniku (kolor poziomu ryzyka) → lista 9 pytań z wybraną
 * opcją i punktacją → notatki → disclaimer.
 */
export const exportSingleDayPdf = (entry: DiaryEntry): void => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = margin;
    }
  };

  /* Header band */
  doc.setFillColor(...BRAND_GOLD);
  doc.rect(0, 0, pageWidth, 8, "F");

  y = margin + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_GOLD);
  doc.text(s("CML — Centrum Medycyny Laserowej"), margin, y);

  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s("Dziennik hemoroidów — wpis z dnia"), margin, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s(formatDayPL(entry.date)), margin, y);

  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  const exportedAt = new Date().toLocaleString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(s(`Wygenerowano: ${exportedAt}`), margin, y);

  /* Result card */
  y += 6;
  const cardH = 26;
  const lvlColor = entry.complete && entry.level ? colorForLevel(entry.level) : ([200, 200, 200] as [number, number, number]);
  doc.setFillColor(...BG_SOFT);
  doc.setDrawColor(...lvlColor);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, cardH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_GOLD);
  doc.text(s("WYNIK QUIZU"), margin + 5, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`${entry.score} / ${entry.maxScore}`, margin + 5, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(s("punktów"), margin + 5, y + 23);

  // Right side — risk level + completeness
  const rightX = margin + contentWidth - 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...lvlColor);
  const riskText =
    entry.complete && entry.level
      ? `Ryzyko: ${RISK_LABEL[entry.level].toUpperCase()}`
      : "Wpis niekompletny";
  doc.text(s(riskText), rightX, y + 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  const answered = entry.answers.filter((a) => a !== null).length;
  doc.text(
    s(`Odpowiedzi: ${answered}/${entry.answers.length}`),
    rightX,
    y + 16,
    { align: "right" },
  );
  doc.text(
    s(`Aktualizacja: ${new Date(entry.updatedAt).toLocaleString("pl-PL")}`),
    rightX,
    y + 21,
    { align: "right" },
  );

  y += cardH + 6;

  /* Answers list */
  ensureSpace(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s("Odpowiedzi (9 pytań)"), margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  HEMOROIDY_QUESTIONS.forEach((q, i) => {
    const idx = entry.answers[i];
    const opt = idx !== null && idx !== undefined ? q.options[idx] : null;
    const qLines = doc.splitTextToSize(s(`${i + 1}. ${q.q}`), contentWidth - 4);
    const aText = opt
      ? s(`→ ${opt.label}  (${opt.points} pkt)`)
      : s("→ brak odpowiedzi");
    const aLines = doc.splitTextToSize(aText, contentWidth - 8);
    const blockH = qLines.length * 4 + aLines.length * 4 + 4;

    ensureSpace(blockH + 2);

    if (i % 2 === 0) {
      doc.setFillColor(252, 250, 245);
      doc.rect(margin, y, contentWidth, blockH, "F");
    }

    doc.setTextColor(...TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.text(qLines, margin + 2, y + 4);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...(opt ? TEXT_DARK : TEXT_MUTED));
    doc.text(aLines, margin + 6, y + 4 + qLines.length * 4);

    y += blockH;
  });

  /* Notes */
  y += 4;
  ensureSpace(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s("Notatki dnia"), margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const notesRaw = entry.notes?.trim() ?? "";
  if (notesRaw) {
    doc.setTextColor(...TEXT_DARK);
    const noteLines = doc.splitTextToSize(s(notesRaw), contentWidth - 4);
    ensureSpace(noteLines.length * 4 + 4);
    doc.text(noteLines, margin + 2, y);
    y += noteLines.length * 4 + 2;
  } else {
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont("helvetica", "italic");
    doc.text(s("(brak notatek)"), margin + 2, y);
    y += 5;
  }

  /* Disclaimer */
  y += 4;
  ensureSpace(20);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  const disc = doc.splitTextToSize(
    s(
      "Dokument edukacyjny CML — nie zastępuje konsultacji lekarskiej. Każde krwawienie z odbytu lub utrzymujące się objawy wymagają oceny proktologa. Źródła EBM: ASCRS, ESCP.",
    ),
    contentWidth,
  );
  doc.text(disc, margin, y);

  /* Footer */
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = pageHeight - 10;
    doc.setDrawColor(...BRAND_GOLD);
    doc.setLineWidth(0.3);
    doc.line(margin, fy - 3, pageWidth - margin, fy - 3);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(s("CML — mcml.pl"), margin, fy);
    doc.text(s(`Strona ${p} / ${pageCount}`), pageWidth - margin, fy, { align: "right" });
  }

  doc.save(`cml-dziennik-hemoroidy-${entry.date}.pdf`);
};
