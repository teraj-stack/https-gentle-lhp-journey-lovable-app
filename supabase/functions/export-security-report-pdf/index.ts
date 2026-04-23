// Server-side PDF security report generator.
// Renders the same checklist a Lovable admin sees on /admin/security, but uses
// pdf-lib with measured text widths so line breaks are crisp and there is no
// truncation regardless of input length.
//
// Auth: requires a Supabase user JWT with admin role (verified via has_role()).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DbStatus = "pass" | "warn" | "fail";
type CheckStatus = DbStatus | "running" | "unknown";

interface PolicyRef {
  name: string;
  table: string;
  sql?: string;
}

interface PdfCheck {
  slug: string;
  category: string;
  title: string;
  description: string;
  status: CheckStatus;
  detail?: string | null;
  policies?: PolicyRef[];
}

type PageSize = "A4" | "Letter" | "Custom";
type PageMargin = "narrow" | "standard" | "wide";

// Standard PDF point dimensions (1pt = 1/72 inch).
const PAGE_DIMS: Record<"A4" | "Letter", [number, number]> = {
  A4: [595.28, 841.89],       // 210 x 297 mm
  Letter: [612, 792],          // 8.5 x 11 in
};

// Custom page size bounds, expressed in millimetres so the UI can ask for
// human-friendly numbers. Lower bound is roughly A8 (~52x74mm); upper bound
// stays well under pdf-lib's hard limit (~14400pt) so we never hit it.
const CUSTOM_MM_MIN = 50;
const CUSTOM_MM_MAX = 1200;
const MM_TO_PT = 72 / 25.4;

// Margin presets in PDF points (1pt = 1/72 inch).
// narrow ~10mm, standard ~14mm, wide ~20mm.
const MARGIN_PRESETS: Record<PageMargin, number> = {
  narrow: 28,
  standard: 40,
  wide: 56,
};

interface ExportPayload {
  checks: PdfCheck[];
  meta?: {
    generatedAt?: string;
    lastScanDate?: string;
    lastAuditAt?: string | null;
    filterLabel?: string;
    overall?: string;
    counts?: { pass: number; warn: number; fail: number; total: number; allTotal: number };
  };
  filename?: string;
  pageSize?: PageSize;
  pageMargin?: PageMargin;
  // Required when pageSize === "Custom". Width/height in millimetres.
  customPageSizeMm?: { width: number; height: number };
  // When true, the server returns ONLY the first rendered page (preview mode).
  // Used to drive an in-dialog preview before the full download.
  previewOnly?: boolean;
}

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "OK",
  warn: "WARN",
  fail: "FAIL",
  running: "...",
  unknown: "?",
};

const STATUS_COLOR: Record<CheckStatus, [number, number, number]> = {
  pass: [21 / 255, 128 / 255, 61 / 255],
  warn: [161 / 255, 98 / 255, 7 / 255],
  fail: [185 / 255, 28 / 255, 28 / 255],
  running: [110 / 255, 110 / 255, 110 / 255],
  unknown: [110 / 255, 110 / 255, 110 / 255],
};

// Sanitize text to a safe ASCII subset for the bundled WinAnsi fonts.
function sanitize(text: string): string {
  if (!text) return "";
  // Replace common Unicode punctuation with ASCII equivalents.
  return text
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("…", "...")
    .replaceAll("→", "->")
    .replaceAll("•", "*")
    .replaceAll("·", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("‘", "'")
    .replaceAll("’", "'")
    // Strip Polish diacritics; keep ASCII letters identifiable.
    .replaceAll("ą", "a").replaceAll("Ą", "A")
    .replaceAll("ć", "c").replaceAll("Ć", "C")
    .replaceAll("ę", "e").replaceAll("Ę", "E")
    .replaceAll("ł", "l").replaceAll("Ł", "L")
    .replaceAll("ń", "n").replaceAll("Ń", "N")
    .replaceAll("ó", "o").replaceAll("Ó", "O")
    .replaceAll("ś", "s").replaceAll("Ś", "S")
    .replaceAll("ż", "z").replaceAll("Ż", "Z")
    .replaceAll("ź", "z").replaceAll("Ź", "Z");
}

// Measured word-wrap. Splits a paragraph into lines that fit `maxWidth` in pt.
// Long unbreakable tokens are split mid-word so they never overflow.
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const out: string[] = [];
  const paragraphs = sanitize(text).split("\n");
  for (const para of paragraphs) {
    if (para.length === 0) {
      out.push("");
      continue;
    }
    const words = para.split(/(\s+)/); // keep separators
    let line = "";
    const flush = () => {
      out.push(line);
      line = "";
    };
    const widthOf = (s: string) => font.widthOfTextAtSize(s, fontSize);

    const pushToken = (token: string) => {
      // If the token alone is wider than maxWidth, hard-split by characters.
      if (widthOf(token) > maxWidth) {
        let chunk = "";
        for (const ch of token) {
          const next = chunk + ch;
          if (widthOf(next) > maxWidth) {
            if (chunk) {
              if (line) flush();
              out.push(chunk);
            }
            chunk = ch;
          } else {
            chunk = next;
          }
        }
        if (chunk) {
          if (widthOf(line + chunk) > maxWidth && line) flush();
          line += chunk;
        }
        return;
      }
      const candidate = line + token;
      if (widthOf(candidate) > maxWidth) {
        // Don't start a new line with whitespace.
        if (line.trim().length > 0) flush();
        if (/^\s+$/.test(token)) return;
        line = token;
      } else {
        line = candidate;
      }
    };

    for (const tok of words) pushToken(tok);
    flush();
  }
  return out;
}

interface RenderContext {
  doc: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  fontMono: PDFFont;
  page: PDFPage;
  pageWidth: number;
  pageHeight: number;
  pageDims: [number, number];
  margin: number;
  cursorY: number;
  pageIndex: number;
}

function newPage(ctx: RenderContext): void {
  ctx.page = ctx.doc.addPage(ctx.pageDims);
  ctx.pageWidth = ctx.page.getWidth();
  ctx.pageHeight = ctx.page.getHeight();
  ctx.cursorY = ctx.pageHeight - ctx.margin;
  ctx.pageIndex += 1;
}

function ensureSpace(ctx: RenderContext, needed: number): void {
  // Reserve 50pt at bottom for page footer.
  if (ctx.cursorY - needed < ctx.margin + 30) newPage(ctx);
}

function drawText(
  ctx: RenderContext,
  text: string,
  opts: {
    font?: PDFFont;
    size?: number;
    color?: [number, number, number];
    x?: number;
    maxWidth?: number;
    lineGap?: number;
  } = {},
): void {
  const font = opts.font ?? ctx.font;
  const size = opts.size ?? 10;
  const color = opts.color ?? [40 / 255, 40 / 255, 40 / 255];
  const x = opts.x ?? ctx.margin;
  const maxWidth = opts.maxWidth ?? ctx.pageWidth - ctx.margin * 2;
  const lineGap = opts.lineGap ?? 3;
  const lineHeight = size + lineGap;
  const lines = wrapText(text, font, size, maxWidth);
  for (const line of lines) {
    ensureSpace(ctx, lineHeight);
    ctx.page.drawText(line, {
      x,
      y: ctx.cursorY - size,
      size,
      font,
      color: rgb(color[0], color[1], color[2]),
    });
    ctx.cursorY -= lineHeight;
  }
}

function drawDivider(ctx: RenderContext, color: [number, number, number] = [0.85, 0.85, 0.85]): void {
  ensureSpace(ctx, 8);
  ctx.cursorY -= 4;
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.cursorY },
    end: { x: ctx.pageWidth - ctx.margin, y: ctx.cursorY },
    thickness: 0.5,
    color: rgb(color[0], color[1], color[2]),
  });
  ctx.cursorY -= 6;
}

function drawCheckCard(ctx: RenderContext, idx: number, c: PdfCheck): void {
  const cardPaddingTop = 10;
  const cardPaddingBottom = 12;
  const innerWidth = ctx.pageWidth - ctx.margin * 2 - 24;
  const headerSize = 11;
  const metaSize = 9;
  const bodySize = 9;
  const monoSize = 8;

  const status = c.status as CheckStatus;
  const statusLabel = STATUS_LABEL[status] ?? "?";
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.unknown;

  // Compute total height needed: title + meta line + detail + policies. We
  // measure greedily and start a new page if the *header block* alone would
  // overflow; long content naturally flows to subsequent pages.
  ensureSpace(ctx, headerSize + 6 + metaSize + 6);

  // Card background
  const startY = ctx.cursorY;
  ctx.cursorY -= cardPaddingTop;

  // Title row: "#N. Title"
  drawText(ctx, `${idx}. ${c.title}`, {
    font: ctx.fontBold,
    size: headerSize,
    color: [25 / 255, 25 / 255, 25 / 255],
    x: ctx.margin + 12,
    maxWidth: innerWidth,
  });

  // Meta row: category + status
  ensureSpace(ctx, metaSize + 2);
  ctx.cursorY -= 2;
  const metaY = ctx.cursorY - metaSize;
  ctx.page.drawText(sanitize(`Kategoria: ${c.category}`), {
    x: ctx.margin + 12,
    y: metaY,
    size: metaSize,
    font: ctx.font,
    color: rgb(95 / 255, 95 / 255, 95 / 255),
  });
  // Status pill on the right
  const statusText = statusLabel;
  const statusW = ctx.fontBold.widthOfTextAtSize(statusText, metaSize);
  const pillW = statusW + 16;
  const pillX = ctx.pageWidth - ctx.margin - 12 - pillW;
  ctx.page.drawRectangle({
    x: pillX,
    y: metaY - 3,
    width: pillW,
    height: metaSize + 6,
    color: rgb(color[0], color[1], color[2]),
    opacity: 0.12,
    borderColor: rgb(color[0], color[1], color[2]),
    borderWidth: 0.5,
  });
  ctx.page.drawText(statusText, {
    x: pillX + 8,
    y: metaY,
    size: metaSize,
    font: ctx.fontBold,
    color: rgb(color[0], color[1], color[2]),
  });
  ctx.cursorY -= metaSize + 6;

  drawDivider(ctx, [0.92, 0.92, 0.92]);

  // Detail / description
  const detailText = c.detail || c.description || "";
  if (detailText.trim().length > 0) {
    drawText(ctx, detailText, {
      size: bodySize,
      color: [55 / 255, 55 / 255, 55 / 255],
      x: ctx.margin + 12,
      maxWidth: innerWidth,
    });
    ctx.cursorY -= 4;
  }

  // Policies block
  const policies = c.policies ?? [];
  if (policies.length > 0) {
    drawText(ctx, `Powiazane polityki RLS (${policies.length}):`, {
      font: ctx.fontBold,
      size: bodySize,
      color: [40 / 255, 40 / 255, 40 / 255],
      x: ctx.margin + 12,
      maxWidth: innerWidth,
    });
    ctx.cursorY -= 2;
    policies.forEach((p, pIdx) => {
      drawText(ctx, `${pIdx + 1}. ${p.name}  [tabela: ${p.table}]`, {
        size: bodySize,
        color: [60 / 255, 60 / 255, 60 / 255],
        x: ctx.margin + 18,
        maxWidth: innerWidth - 6,
      });
      if (p.sql) {
        // Mono-styled SQL block with light background.
        const sqlLines = wrapText(p.sql, ctx.fontMono, monoSize, innerWidth - 18);
        const blockH = sqlLines.length * (monoSize + 3) + 8;
        ensureSpace(ctx, blockH);
        const top = ctx.cursorY;
        ctx.page.drawRectangle({
          x: ctx.margin + 18,
          y: top - blockH,
          width: innerWidth - 6,
          height: blockH,
          color: rgb(0.97, 0.97, 0.97),
          borderColor: rgb(0.88, 0.88, 0.88),
          borderWidth: 0.4,
        });
        ctx.cursorY -= 4;
        for (const line of sqlLines) {
          ensureSpace(ctx, monoSize + 3);
          ctx.page.drawText(line, {
            x: ctx.margin + 24,
            y: ctx.cursorY - monoSize,
            size: monoSize,
            font: ctx.fontMono,
            color: rgb(35 / 255, 35 / 255, 35 / 255),
          });
          ctx.cursorY -= monoSize + 3;
        }
        ctx.cursorY -= 6;
      }
    });
  } else {
    drawText(ctx, "Brak powiazanych polityk RLS.", {
      size: bodySize - 1,
      color: [110 / 255, 110 / 255, 110 / 255],
      x: ctx.margin + 12,
      maxWidth: innerWidth,
    });
  }

  // Card border (drawn last so we know the height)
  const endY = ctx.cursorY - cardPaddingBottom;
  // Only draw the border if the card stayed on a single page (cheap heuristic).
  if (endY < startY) {
    ctx.page.drawRectangle({
      x: ctx.margin,
      y: endY,
      width: ctx.pageWidth - ctx.margin * 2,
      height: startY - endY,
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 0.4,
      color: rgb(1, 1, 1),
      opacity: 0,
    });
  }
  ctx.cursorY = endY - 10;
}

function drawFooter(ctx: RenderContext, total: number, generatedAt?: string): void {
  const pages = ctx.doc.getPages();
  const footerY = 24;
  const dividerY = footerY + 14;
  const grey: [number, number, number] = [0.55, 0.55, 0.55];
  const lightGrey: [number, number, number] = [0.85, 0.85, 0.85];

  pages.forEach((page, i) => {
    const w = page.getWidth();
    // Thin divider
    page.drawLine({
      start: { x: ctx.margin, y: dividerY },
      end: { x: w - ctx.margin, y: dividerY },
      thickness: 0.4,
      color: rgb(lightGrey[0], lightGrey[1], lightGrey[2]),
    });
    // Left: brand
    page.drawText(sanitize("CML - Raport bezpieczenstwa"), {
      x: ctx.margin,
      y: footerY,
      size: 8,
      font: ctx.font,
      color: rgb(grey[0], grey[1], grey[2]),
    });
    // Center: timestamp (optional)
    if (generatedAt) {
      const ts = sanitize(generatedAt);
      const tsW = ctx.font.widthOfTextAtSize(ts, 8);
      page.drawText(ts, {
        x: (w - tsW) / 2,
        y: footerY,
        size: 8,
        font: ctx.font,
        color: rgb(grey[0], grey[1], grey[2]),
      });
    }
    // Right: page N of TOTAL (bold page number, regular separators)
    const label = sanitize(`Strona ${i + 1} z ${total}`);
    const labelW = ctx.fontBold.widthOfTextAtSize(label, 8);
    page.drawText(label, {
      x: w - ctx.margin - labelW,
      y: footerY,
      size: 8,
      font: ctx.fontBold,
      color: rgb(grey[0], grey[1], grey[2]),
    });
  });
}

async function buildPdf(payload: ExportPayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const requestedSize: PageSize =
    payload.pageSize === "Letter" || payload.pageSize === "Custom" ? payload.pageSize : "A4";
  let dims: [number, number];
  if (requestedSize === "Custom" && payload.customPageSizeMm) {
    const wPt = payload.customPageSizeMm.width * MM_TO_PT;
    const hPt = payload.customPageSizeMm.height * MM_TO_PT;
    dims = [wPt, hPt];
  } else {
    dims = PAGE_DIMS[requestedSize === "Custom" ? "A4" : requestedSize];
  }
  const marginKey: PageMargin =
    payload.pageMargin === "narrow" || payload.pageMargin === "wide" ? payload.pageMargin : "standard";
  // Cap the margin so it can never exceed ~30% of the shorter edge — otherwise
  // a tiny custom page could leave zero usable content area.
  const shorter = Math.min(dims[0], dims[1]);
  const margin = Math.min(MARGIN_PRESETS[marginKey], Math.floor(shorter * 0.3));

  const ctx: RenderContext = {
    doc,
    font,
    fontBold,
    fontMono,
    page: doc.addPage(dims),
    pageWidth: dims[0],
    pageHeight: dims[1],
    pageDims: dims,
    margin,
    cursorY: dims[1] - margin,
    pageIndex: 1,
  };

  const meta = payload.meta ?? {};

  // Header
  drawText(ctx, "Raport bezpieczenstwa - CML", {
    font: fontBold,
    size: 20,
    color: [20 / 255, 20 / 255, 20 / 255],
  });
  ctx.cursorY -= 4;
  if (meta.generatedAt) {
    drawText(ctx, `Wygenerowano: ${meta.generatedAt}`, {
      size: 9,
      color: [110 / 255, 110 / 255, 110 / 255],
    });
  }
  if (meta.lastScanDate) {
    drawText(ctx, `Ostatni przeglad checklisty: ${meta.lastScanDate}`, {
      size: 9,
      color: [110 / 255, 110 / 255, 110 / 255],
    });
  }
  if (meta.lastAuditAt) {
    drawText(ctx, `Ostatni self-audit: ${meta.lastAuditAt}`, {
      size: 9,
      color: [110 / 255, 110 / 255, 110 / 255],
    });
  }
  ctx.cursorY -= 6;

  // Summary box
  const summaryHeight = 70;
  ensureSpace(ctx, summaryHeight + 12);
  const boxTop = ctx.cursorY;
  ctx.page.drawRectangle({
    x: ctx.margin,
    y: boxTop - summaryHeight,
    width: ctx.pageWidth - ctx.margin * 2,
    height: summaryHeight,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 0.5,
  });
  ctx.page.drawText(sanitize(`Status ogolny: ${meta.overall ?? "-"}`), {
    x: ctx.margin + 14,
    y: boxTop - 22,
    size: 12,
    font: fontBold,
    color: rgb(20 / 255, 20 / 255, 20 / 255),
  });
  const counts = meta.counts;
  if (counts) {
    ctx.page.drawText(
      sanitize(`OK: ${counts.pass}    Ostrzezenia: ${counts.warn}    Krytyczne: ${counts.fail}    Lacznie: ${counts.total} z ${counts.allTotal}`),
      {
        x: ctx.margin + 14,
        y: boxTop - 42,
        size: 10,
        font,
        color: rgb(60 / 255, 60 / 255, 60 / 255),
      },
    );
  }
  if (meta.filterLabel) {
    ctx.page.drawText(sanitize(meta.filterLabel), {
      x: ctx.margin + 14,
      y: boxTop - 60,
      size: 9,
      font,
      color: rgb(90 / 255, 90 / 255, 90 / 255),
    });
  }
  ctx.cursorY = boxTop - summaryHeight - 14;

  // Render each check as a card. In preview mode we stop adding cards as soon
  // as we have spilled onto a second page so the output is a single sample page.
  const previewOnly = payload.previewOnly === true;
  for (let i = 0; i < payload.checks.length; i++) {
    if (previewOnly && ctx.doc.getPages().length > 1) break;
    drawCheckCard(ctx, i + 1, payload.checks[i]);
  }

  // In preview mode, drop every page after the first so the iframe shows
  // exactly what the first page of the full export would look like.
  if (previewOnly) {
    const total = ctx.doc.getPages().length;
    for (let i = total - 1; i >= 1; i--) ctx.doc.removePage(i);
  }

  drawFooter(ctx, ctx.doc.getPages().length, meta.generatedAt);

  const bytes = await doc.save();
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // --- Auth: verify caller is an admin -------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", { _role: "admin" });
    if (roleErr || isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Payload -------------------------------------------------------------
    const payload = (await req.json()) as ExportPayload;
    if (!payload || !Array.isArray(payload.checks)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payload.checks.length === 0) {
      return new Response(JSON.stringify({ error: "Empty checks" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payload.checks.length > 500) {
      return new Response(JSON.stringify({ error: "Too many checks" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      payload.pageSize !== undefined &&
      payload.pageSize !== "A4" &&
      payload.pageSize !== "Letter" &&
      payload.pageSize !== "Custom"
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid pageSize (expected 'A4', 'Letter' or 'Custom')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (payload.pageSize === "Custom") {
      const c = payload.customPageSizeMm;
      const isFiniteNum = (n: unknown): n is number =>
        typeof n === "number" && Number.isFinite(n);
      if (
        !c ||
        !isFiniteNum(c.width) ||
        !isFiniteNum(c.height) ||
        c.width < CUSTOM_MM_MIN ||
        c.width > CUSTOM_MM_MAX ||
        c.height < CUSTOM_MM_MIN ||
        c.height > CUSTOM_MM_MAX
      ) {
        return new Response(
          JSON.stringify({
            error: `Invalid customPageSizeMm (width/height must be finite numbers in [${CUSTOM_MM_MIN}, ${CUSTOM_MM_MAX}] mm)`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    if (
      payload.pageMargin !== undefined &&
      payload.pageMargin !== "narrow" &&
      payload.pageMargin !== "standard" &&
      payload.pageMargin !== "wide"
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid pageMargin (expected 'narrow', 'standard' or 'wide')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pdfBytes = await buildPdf(payload);
    const filename = (payload.filename || "cml-security-report.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
    const disposition = payload.previewOnly ? "inline" : "attachment";

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
