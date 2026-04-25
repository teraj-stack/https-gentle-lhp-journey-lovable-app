import jsPDF from "jspdf";

/* ---------- Wspólne typy ---------- */

export type ChecklistFactor = {
  id: string;
  title: string;
  shortBadge: string;
  body?: string;
  sources?: { label: string; url: string }[];
};

/* ---------- Helpery ---------- */

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

const formatToday = (): string =>
  new Date().toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatSelectedAt = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* ---------- CSV ---------- */

const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",;\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

export const exportChecklistCsv = (
  factors: ChecklistFactor[],
  totalAvailable: number,
  selectedAt?: string | null,
): void => {
  const sep = ";";
  const rows: string[] = [];

  rows.push("# Moja checklista czynnikow ryzyka — hemoroidy");
  rows.push(["Wygenerowano", formatToday()].map(csvEscape).join(sep));
  const selectedAtFmt = formatSelectedAt(selectedAt);
  if (selectedAtFmt) {
    rows.push(["Data zaznaczenia", selectedAtFmt].map(csvEscape).join(sep));
  }
  rows.push(
    ["Zaznaczone", `${factors.length}/${totalAvailable}`].map(csvEscape).join(sep),
  );
  rows.push(
    ["Zrodlo", "CML — Centrum Medycyny Laserowej, /dla-pacjenta/hemoroidy"]
      .map(csvEscape)
      .join(sep),
  );
  rows.push("");

  rows.push("# Czynniki ryzyka");
  const header = ["Lp.", "Tytul", "Krotki opis (badge)", "Uzasadnienie", "Zrodla EBM"];
  rows.push(header.map(csvEscape).join(sep));

  factors.forEach((f, i) => {
    const sources = (f.sources ?? [])
      .map((src) => `${src.label} (${src.url})`)
      .join(" | ");
    rows.push(
      [
        i + 1,
        f.title,
        f.shortBadge,
        f.body ?? "",
        sources,
      ]
        .map(csvEscape)
        .join(sep),
    );
  });

  const csv = "\uFEFF" + rows.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `cml-checklista-ryzyka-hemoroidy-${stamp}.csv`,
  );
};

/* ---------- PDF ---------- */

const BRAND_GOLD: [number, number, number] = [201, 168, 76];
const TEXT_DARK: [number, number, number] = [30, 30, 30];
const TEXT_MUTED: [number, number, number] = [100, 100, 100];
const BG_SOFT: [number, number, number] = [248, 245, 235];

export const exportChecklistPdf = (
  factors: ChecklistFactor[],
  totalAvailable: number,
  selectedAt?: string | null,
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
  doc.text(s("Moja checklista czynników ryzyka"), margin, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    s(`Wygenerowano: ${formatToday()}  •  Zaznaczone: ${factors.length}/${totalAvailable}`),
    margin,
    y,
  );

  const selectedAtFmt = formatSelectedAt(selectedAt);
  if (selectedAtFmt) {
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_GOLD);
    doc.text(s(`Data zaznaczenia przez pacjenta: ${selectedAtFmt}`), margin, y);
  }

  /* Intro box */
  y += 6;
  const introHeight = 18;
  doc.setFillColor(...BG_SOFT);
  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, introHeight, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_GOLD);
  doc.text(s("DLA LEKARZA"), margin + 5, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(
    s(
      "Pacjent zaznaczyl ponizsze czynniki ryzyka jako istotne w jego przypadku — pomocne",
    ),
    margin + 5,
    y + 11,
  );
  doc.text(
    s("przy doborze profilaktyki i decyzjach o leczeniu (EBM: ASCRS, ESCP, Cochrane)."),
    margin + 5,
    y + 15,
  );

  y += introHeight + 6;

  /* Empty state */
  if (factors.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(s("Brak zaznaczonych czynnikow."), margin, y);
    doc.save(`cml-checklista-ryzyka-hemoroidy-${new Date().toISOString().slice(0, 10)}.pdf`);
    return;
  }

  /* Factors */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_DARK);
  doc.text(s(`Zaznaczone czynniki (${factors.length})`), margin, y);
  y += 6;

  factors.forEach((f, i) => {
    // estimate block height
    const titleLines = doc.splitTextToSize(s(`${i + 1}. ${f.title}`), contentWidth - 8);
    const badgeLines = doc.splitTextToSize(s(f.shortBadge), contentWidth - 8);
    const bodyLines = f.body
      ? doc.splitTextToSize(s(f.body), contentWidth - 8)
      : [];
    const sourceLines: string[] = [];
    (f.sources ?? []).forEach((src) => {
      const line = `• ${src.label}`;
      sourceLines.push(...doc.splitTextToSize(s(line), contentWidth - 12));
    });

    const blockH =
      6 + // title
      titleLines.length * 5 +
      badgeLines.length * 4.5 +
      bodyLines.length * 4.5 +
      (sourceLines.length ? 4 + sourceLines.length * 4 : 0) +
      6;

    ensureSpace(blockH);

    // Card background
    const startY = y;
    doc.setFillColor(252, 250, 245);
    doc.setDrawColor(230, 220, 195);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, startY, contentWidth, blockH - 3, 2.5, 2.5, "FD");

    // Title
    let cy = startY + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...TEXT_DARK);
    titleLines.forEach((ln: string) => {
      doc.text(ln, margin + 4, cy);
      cy += 5;
    });

    // Badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND_GOLD);
    badgeLines.forEach((ln: string) => {
      doc.text(ln, margin + 4, cy);
      cy += 4.5;
    });

    // Body
    if (bodyLines.length) {
      cy += 1;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...TEXT_DARK);
      bodyLines.forEach((ln: string) => {
        doc.text(ln, margin + 4, cy);
        cy += 4.5;
      });
    }

    // Sources
    if (sourceLines.length) {
      cy += 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXT_MUTED);
      sourceLines.forEach((ln: string) => {
        doc.text(ln, margin + 6, cy);
        cy += 4;
      });
    }

    y = startY + blockH;
  });

  /* Footer note */
  ensureSpace(14);
  y += 2;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    s(
      "Pokaz te liste lekarzowi na konsultacji. Pelna bibliografia: cml.pl/dla-pacjenta/ebm-hemoroidy",
    ),
    margin,
    y,
  );

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(
      s(`Strona ${p} z ${pageCount}`),
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" },
    );
    doc.text(s("CML • Checklista ryzyka hemoroidy"), margin, pageHeight - 8);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`cml-checklista-ryzyka-hemoroidy-${stamp}.pdf`);
};
