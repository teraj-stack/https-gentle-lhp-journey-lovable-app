import jsPDF from "jspdf";

type Recommendation = { text: string; anchor: string };

export type QuizResultPdfPayload = {
  score: number;
  maxScore: number;
  tierLabel: string;
  tierRange: string;
  headline: string;
  recommendations: Recommendation[];
  showUrgent?: boolean;
};

const BRAND_GOLD: [number, number, number] = [201, 168, 76]; // #c9a84c
const TEXT_DARK: [number, number, number] = [30, 30, 30];
const TEXT_MUTED: [number, number, number] = [100, 100, 100];
const URGENT_RED: [number, number, number] = [180, 40, 40];
const URGENT_BG: [number, number, number] = [253, 240, 240];

/**
 * Strip Polish diacritics — jsPDF default fonts don't support full UTF-8.
 * Pragmatic transliteration so PDF stays readable without bundling a custom font.
 */
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

export const generateQuizResultPdf = (payload: QuizResultPdfPayload): void => {
  const { score, maxScore, tierLabel, tierRange, headline, recommendations, showUrgent } = payload;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ===== Header band =====
  doc.setFillColor(...BRAND_GOLD);
  doc.rect(0, 0, pageWidth, 8, "F");

  y = margin + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_GOLD);
  doc.text(s("CML — Centrum Medycyny Laserowej"), margin, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s("Test ryzyka hemoroidów — Twój wynik"), margin, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_MUTED);
  const today = new Date().toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(s(`Data wygenerowania: ${today}`), margin, y);

  // ===== Score box =====
  y += 8;
  const scoreBoxHeight = 26;
  doc.setFillColor(248, 245, 235);
  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, scoreBoxHeight, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_GOLD);
  doc.text(s("POZIOM RYZYKA"), margin + 6, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s(tierLabel), margin + 6, y + 17);

  // Score on the right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_MUTED);
  const scoreText = s(`Wynik: ${score} / ${maxScore} pkt`);
  const rangeText = s(`Zakres: ${tierRange}`);
  doc.text(scoreText, pageWidth - margin - 6, y + 10, { align: "right" });
  doc.text(rangeText, pageWidth - margin - 6, y + 17, { align: "right" });

  y += scoreBoxHeight + 8;

  // ===== Headline =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_DARK);
  const headlineLines = doc.splitTextToSize(s(headline), contentWidth);
  doc.text(headlineLines, margin, y);
  y += headlineLines.length * 5.5 + 6;

  // ===== Recommendations =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_GOLD);
  doc.text(s("Twoje 5 kroków — dopasowane zalecenia"), margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);

  recommendations.slice(0, 5).forEach((rec, idx) => {
    const num = `${idx + 1}.`;
    const lines = doc.splitTextToSize(s(rec.text), contentWidth - 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_GOLD);
    doc.text(num, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.text(lines, margin + 7, y);
    y += lines.length * 5 + 3;
  });

  y += 4;

  // ===== When to contact a doctor =====
  if (y > pageHeight - 90) {
    doc.addPage();
    y = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s("Kiedy skontaktować się z lekarzem"), margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_MUTED);
  const introLines = doc.splitTextToSize(
    s(
      "Niezależnie od wyniku quizu, poniższe sytuacje wymagają konsultacji proktologicznej. Quiz nie zastępuje badania lekarskiego."
    ),
    contentWidth
  );
  doc.text(introLines, margin, y);
  y += introLines.length * 4.8 + 5;

  // Routine consultation list
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s("Umów konsultację planową (w ciągu 1–4 tygodni):"), margin, y);
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  const routine = [
    "Każde krwawienie z odbytu — nawet jednorazowe lub niewielkie",
    "Wyczuwalny guzek przy odbycie lub uczucie niepełnego wypróżnienia",
    "Nawracający świąd, pieczenie lub ból podczas wypróżnień",
    "Zmiana rytmu wypróżnień utrzymująca się powyżej 2 tygodni",
    "Wypadanie hemoroidów wymagające ręcznego odprowadzenia",
  ];
  routine.forEach((item) => {
    const lines = doc.splitTextToSize(s(`• ${item}`), contentWidth - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4.8 + 1.5;
  });

  y += 4;

  // Urgent — red box
  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }

  const urgentTitle = s("PILNIE (24–48 h) — zgłoś się na SOR lub do proktologa:");
  const urgentItems = [
    "Obfite, nieustępujące krwawienie z odbytu",
    "Silny, narastający ból okolicy odbytu",
    "Twardy, bardzo bolesny guz (możliwa zakrzepica)",
    "Gorączka powyżej 38°C z bólem okolicy odbytu",
    "Krew ciemna, smolista lub z dużą ilością skrzepów",
  ];

  // Measure urgent box height
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let urgentHeight = 8 + 6; // padding + title
  const measuredUrgent = urgentItems.map((item) => {
    const lines = doc.splitTextToSize(s(`• ${item}`), contentWidth - 12);
    urgentHeight += lines.length * 4.8 + 1.5;
    return lines;
  });
  urgentHeight += 6;

  doc.setFillColor(...URGENT_BG);
  doc.setDrawColor(...URGENT_RED);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, urgentHeight, 3, 3, "FD");

  let yi = y + 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...URGENT_RED);
  doc.text(urgentTitle, margin + 5, yi);
  yi += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  measuredUrgent.forEach((lines) => {
    doc.text(lines, margin + 7, yi);
    yi += lines.length * 4.8 + 1.5;
  });

  y += urgentHeight + 8;

  // ===== Footer =====
  const footerY = pageHeight - 14;
  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    s(
      "Dokument edukacyjny CML — nie zastępuje konsultacji lekarskiej. Źródła EBM: ASCRS, ESCP."
    ),
    margin,
    footerY
  );
  doc.text(s("mcml.pl"), pageWidth - margin, footerY, { align: "right" });

  // ===== Save =====
  const fileName = `wynik-quizu-hemoroidy-${score}pkt-CML.pdf`;
  doc.save(fileName);
};
