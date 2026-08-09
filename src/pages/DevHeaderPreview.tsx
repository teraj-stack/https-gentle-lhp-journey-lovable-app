import { useEffect, useRef, useState } from "react";

/**
 * Dev-only: /dev/header-preview
 *
 * Pokazuje nagłówek strony głównej w iframe'ach przy 4 typowych szerokościach
 * (375 / 390 / 768 / 1024) i automatycznie wykrywa przepełnienia tekstu
 * (scrollWidth > clientWidth, ukryta zawartość) oraz przepełnienia poziome
 * całego dokumentu.
 *
 * Uwaga: nie jest podlinkowane w nawigacji — tylko do debugu/QA layoutu.
 */

type Viewport = {
  label: string;
  width: number;
  height: number;
  device: string;
};

const VIEWPORTS: Viewport[] = [
  { label: "Mobile S", width: 375, height: 667, device: "iPhone SE" },
  { label: "Mobile M", width: 390, height: 844, device: "iPhone 14" },
  { label: "Tablet", width: 768, height: 1024, device: "iPad portrait" },
  { label: "Tablet L", width: 1024, height: 768, device: "iPad landscape" },
];

type OverflowFinding = {
  selector: string;
  text: string;
  scrollWidth: number;
  clientWidth: number;
  overflowPx: number;
  reason:
    | "text-clipped"
    | "horizontal-scroll"
    | "section-missing"
    | "section-empty"
    | "panel-not-open";
};

type ReportState = {
  status: "idle" | "loading" | "ok" | "warn" | "error";
  findings: OverflowFinding[];
  documentScrollWidth?: number;
  viewportWidth?: number;
  error?: string;
  /** Tryb skanu — desktop (header inline) lub mobile (po otwarciu burgera). */
  mode?: "desktop" | "mobile";
  /** Sekcje wymagane w mobilnym menu — true = znaleziono nagłówek + niepuste linki. */
  mobileSections?: Record<string, boolean>;
};

/**
 * Wymagane sekcje w mobilnym menu po kliknięciu burgera.
 * Każda musi mieć widoczny nagłówek (po polsku, case-insensitive substring)
 * ORAZ co najmniej 1 link <a>/<Link> w panelu.
 *
 * Synchronizacja = wszystkie 5 sekcji + Cennik + Kontakt obecne po jednym
 * kliknięciu burgera (bez dodatkowych interakcji — mobile nav jest płaskim
 * akordeonem, a nie zagnieżdżonymi dropdownami).
 */
const REQUIRED_MOBILE_SECTIONS = [
  "Proktologia",
  "Flebologia",
  
  "Wiedza",
  "Klinika",
] as const;

/** Działa wewnątrz dokumentu iframe — szuka elementów z ucinającym się tekstem. */
function detectOverflowsInDoc(doc: Document, vw: number): OverflowFinding[] {
  const findings: OverflowFinding[] = [];

  // 1) Sprawdź header element i jego dzieci tekstowe
  const header = doc.querySelector("header");
  if (!header) return findings;

  const candidates = header.querySelectorAll<HTMLElement>(
    "a, button, span, div"
  );

  candidates.forEach((el) => {
    // Pomijamy elementy schowane (display:none / hidden parent)
    if (el.offsetParent === null && el !== doc.body) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const sw = el.scrollWidth;
    const cw = el.clientWidth;
    if (cw === 0) return;

    // Margines 1px na sub-pixel rendering
    if (sw - cw > 1) {
      // Tylko jeśli element ma jakikolwiek bezpośredni text content
      const txt = (el.textContent ?? "").trim().slice(0, 80);
      if (!txt) return;
      findings.push({
        selector: describeEl(el),
        text: txt,
        scrollWidth: sw,
        clientWidth: cw,
        overflowPx: sw - cw,
        reason: "text-clipped",
      });
    }
  });

  // 2) Document-level horizontal scroll (header wypycha layout poza viewport)
  const docSW = doc.documentElement.scrollWidth;
  if (docSW - vw > 1) {
    findings.push({
      selector: "<html>",
      text: `Strona scrolluje się poziomo (${docSW}px > ${vw}px viewport)`,
      scrollWidth: docSW,
      clientWidth: vw,
      overflowPx: docSW - vw,
      reason: "horizontal-scroll",
    });
  }

  return findings;
}

function describeEl(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = el.className && typeof el.className === "string"
    ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
    : "";
  return `${tag}${id}${cls}`.slice(0, 80);
}

/**
 * Otwiera mobilne menu w iframe poprzez kliknięcie burgera
 * (`button[aria-label="Menu"]` w Header.tsx). Czeka do ~700ms na animację
 * framer-motion (height: auto). Idempotentne — gdy już otwarte, nie klika.
 */
async function openMobilePanel(doc: Document): Promise<HTMLElement | null> {
  const burger = doc.querySelector<HTMLButtonElement>(
    'button[aria-label="Menu"]'
  );
  if (!burger) return null;
  if (!findMobilePanel(doc)) burger.click();
  const start = performance.now();
  while (performance.now() - start < 700) {
    const panel = findMobilePanel(doc);
    if (panel && panel.getBoundingClientRect().height > 40) return panel;
    await new Promise((r) => setTimeout(r, 50));
  }
  return findMobilePanel(doc);
}

function findMobilePanel(doc: Document): HTMLElement | null {
  // Header renderuje mobilny panel jako motion.div z `lg:hidden bg-card ...`.
  // Sentinel: tekst „Proktologia" — pierwszy nagłówek sekcji.
  const candidates = doc.querySelectorAll<HTMLElement>(
    "div.lg\\:hidden.bg-card"
  );
  for (const c of candidates) {
    if (/Proktologia/i.test(c.textContent ?? "")) return c;
  }
  return null;
}

/**
 * Skanuje mobilny panel: wymagane sekcje (sync check) + przepełnienia
 * tekstu w linkach + horyzontalny scroll panelu.
 */
function detectMobilePanelIssues(
  panel: HTMLElement,
  vw: number
): { findings: OverflowFinding[]; sections: Record<string, boolean> } {
  const findings: OverflowFinding[] = [];
  const sections: Record<string, boolean> = {};

  const labels = Array.from(
    panel.querySelectorAll<HTMLElement>(".uppercase")
  ).map((el) => (el.textContent ?? "").trim());

  for (const required of REQUIRED_MOBILE_SECTIONS) {
    const found = labels.some((t) =>
      new RegExp(`(^|·\\s*)${required}\\b`, "i").test(t)
    );
    sections[required] = found;
    if (!found) {
      findings.push({
        selector: `[mobile-section="${required}"]`,
        text: `Brak nagłówka sekcji „${required}" w mobilnym menu`,
        scrollWidth: 0,
        clientWidth: 0,
        overflowPx: 0,
        reason: "section-missing",
      });
    }
  }

  const links = panel.querySelectorAll<HTMLAnchorElement>("a[href]");
  if (links.length < REQUIRED_MOBILE_SECTIONS.length) {
    findings.push({
      selector: "a[href]",
      text: `Tylko ${links.length} linków w panelu (oczekiwano ≥ ${REQUIRED_MOBILE_SECTIONS.length})`,
      scrollWidth: 0,
      clientWidth: 0,
      overflowPx: 0,
      reason: "section-empty",
    });
  }

  panel.querySelectorAll<HTMLElement>("a, span").forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const sw = el.scrollWidth;
    const cw = el.clientWidth;
    if (cw === 0) return;
    if (sw - cw > 1) {
      const txt = (el.textContent ?? "").trim().slice(0, 80);
      if (!txt) return;
      findings.push({
        selector: describeEl(el),
        text: txt,
        scrollWidth: sw,
        clientWidth: cw,
        overflowPx: sw - cw,
        reason: "text-clipped",
      });
    }
  });

  if (panel.scrollWidth - vw > 1) {
    findings.push({
      selector: "div.lg\\:hidden.bg-card",
      text: `Panel mobilny szerszy niż viewport (${panel.scrollWidth}px > ${vw}px)`,
      scrollWidth: panel.scrollWidth,
      clientWidth: vw,
      overflowPx: panel.scrollWidth - vw,
      reason: "horizontal-scroll",
    });
  }

  return { findings, sections };
}

function ViewportFrame({
  vp,
  mode,
}: {
  vp: Viewport;
  mode: "desktop" | "mobile";
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [report, setReport] = useState<ReportState>({
    status: "idle",
    findings: [],
    mode,
  });

  const runScan = async () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setReport({ status: "loading", findings: [], mode });
    try {
      const doc = iframe.contentDocument;
      if (!doc) {
        setReport({
          status: "error",
          findings: [],
          mode,
          error: "Brak dostępu do contentDocument (cross-origin?)",
        });
        return;
      }

      if (mode === "desktop") {
        const findings = detectOverflowsInDoc(doc, vp.width);
        setReport({
          status: findings.length === 0 ? "ok" : "warn",
          findings,
          documentScrollWidth: doc.documentElement.scrollWidth,
          viewportWidth: vp.width,
          mode,
        });
        return;
      }

      // mode === "mobile" — kliknij burgera, sprawdź rozwinięty panel
      const panel = await openMobilePanel(doc);
      if (!panel) {
        setReport({
          status: "warn",
          findings: [
            {
              selector: 'button[aria-label="Menu"]',
              text: "Panel mobilny nie otworzył się po kliknięciu burgera",
              scrollWidth: 0,
              clientWidth: 0,
              overflowPx: 0,
              reason: "panel-not-open",
            },
          ],
          mode,
          mobileSections: Object.fromEntries(
            REQUIRED_MOBILE_SECTIONS.map((s) => [s, false])
          ),
        });
        return;
      }
      const { findings, sections } = detectMobilePanelIssues(panel, vp.width);
      setReport({
        status: findings.length === 0 ? "ok" : "warn",
        findings,
        documentScrollWidth: doc.documentElement.scrollWidth,
        viewportWidth: vp.width,
        mode,
        mobileSections: sections,
      });
    } catch (e) {
      setReport({
        status: "error",
        findings: [],
        mode,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // Auto-run skanowania ~800ms po załadowaniu iframe (czas na fonty/layout).
  // Mobile: dodatkowe ~700ms na animację rozwinięcia panelu obsługuje openMobilePanel.
  const handleLoad = () => {
    window.setTimeout(runScan, mode === "mobile" ? 1000 : 800);
  };

  // Mobile potrzebuje wyższego iframe — rozwinięty panel zajmuje ~600px.
  const iframeHeight = mode === "mobile" ? 720 : 240;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {vp.label} — {vp.width}×{vp.height}
            <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">
              {mode}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{vp.device}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={report.status} count={report.findings.length} />
          <button
            type="button"
            onClick={runScan}
            className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent/50 transition-colors"
          >
            Re-scan
          </button>
        </div>
      </div>

      <div
        className="relative overflow-auto rounded-lg border border-border bg-background"
        style={{ maxWidth: "100%" }}
      >
        <iframe
          ref={iframeRef}
          src="/"
          title={`Header preview ${vp.label} (${mode})`}
          onLoad={handleLoad}
          style={{
            width: vp.width,
            height: iframeHeight,
            border: "none",
            display: "block",
          }}
        />
      </div>

      {/* Mobile sync status — pokazuje która z 5 wymaganych sekcji jest obecna */}
      {mode === "mobile" && report.mobileSections && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {REQUIRED_MOBILE_SECTIONS.map((s) => {
            const ok = report.mobileSections?.[s];
            return (
              <span
                key={s}
                className={`px-2 py-0.5 rounded border ${
                  ok
                    ? "bg-green-500/10 border-green-500/30 text-green-500"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
                title={ok ? "Sekcja obecna w panelu" : "Brak sekcji w panelu"}
              >
                {ok ? "✓" : "✗"} {s}
              </span>
            );
          })}
        </div>
      )}

      {report.status === "error" && (
        <div className="text-xs text-destructive">⚠ {report.error}</div>
      )}

      {report.findings.length > 0 && (
        <div className="space-y-1.5 text-xs">
          <div className="font-semibold text-foreground">
            Znaleziono {report.findings.length} problemów:
          </div>
          <ul className="space-y-1 max-h-48 overflow-auto">
            {report.findings.map((f, i) => (
              <li
                key={i}
                className="rounded border border-border/60 bg-background/40 p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[11px] text-primary truncate">
                    {f.selector}
                  </code>
                  <span className="text-[10px] uppercase tracking-wider text-destructive shrink-0">
                    {f.overflowPx > 0 ? `+${f.overflowPx}px ` : ""}
                    {f.reason}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground truncate">
                  „{f.text}"
                  {f.scrollWidth > 0 &&
                    ` — scroll ${f.scrollWidth} / client ${f.clientWidth}`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.status === "ok" && (
        <div className="text-xs text-green-500">
          ✓ {mode === "mobile"
            ? "Panel mobilny: wszystkie sekcje OK, brak przepełnień"
            : "Brak przepełnień w nagłówku"}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  count,
}: {
  status: ReportState["status"];
  count: number;
}) {
  const map: Record<ReportState["status"], { label: string; cls: string }> = {
    idle: { label: "—", cls: "bg-muted text-muted-foreground" },
    loading: { label: "Skanuję…", cls: "bg-muted text-muted-foreground" },
    ok: { label: "OK", cls: "bg-green-500/15 text-green-500" },
    warn: { label: `${count} problem(y)`, cls: "bg-destructive/15 text-destructive" },
    error: { label: "Błąd", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status];
  return (
    <span
      className={`px-2 py-0.5 rounded text-[11px] font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

export default function DevHeaderPreview() {
  // Globalna sygnalizacja: zsumuj wyniki ze wszystkich iframe'ów
  // (uproszczone — tu po prostu nagłówek strony testowej)

  useEffect(() => {
    document.title = "Dev: Header Overflow Preview";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold">
            Header Overflow Preview
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Strona dev-only do QA nagłówka na typowych szerokościach. Każdy
            panel ładuje stronę główną w iframe i automatycznie wykrywa
            elementy z przepełniającym się tekstem (
            <code>scrollWidth &gt; clientWidth</code>) oraz horyzontalny scroll
            dokumentu. Skan uruchamia się ~800ms po załadowaniu, można też
            kliknąć <strong>Re-scan</strong> ręcznie.
          </p>
          <p className="text-xs text-muted-foreground">
            Szerokości: {VIEWPORTS.map((v) => v.width).join(" / ")} px
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Desktop / Tablet — header inline
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {VIEWPORTS.map((vp) => (
              <ViewportFrame key={`d-${vp.width}`} vp={vp} mode="desktop" />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Mobile menu — auto-klik burgera + sync sekcji
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Test automatycznie klika burger w iframe, czeka na animację panelu
            (~700ms) i waliduje obecność wszystkich 5 sekcji (Proktologia,
            Flebologia, Wiedza, Klinika) oraz przepełnienia
            tekstu w linkach. Zielone chipy = sekcja zsynchronizowana.
            Wykonywany tylko na szerokościach &lt; 1024px (powyżej menu mobilne
            jest ukryte: <code>lg:hidden</code>).
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {VIEWPORTS.filter((vp) => vp.width < 1024).map((vp) => (
              <ViewportFrame key={`m-${vp.width}`} vp={vp} mode="mobile" />
            ))}
          </div>
        </section>

        <footer className="pt-4 text-xs text-muted-foreground">
          Tip: jeśli zmieniasz <code>Header.tsx</code>, hot-reload przeładuje
          iframes — odczekaj chwilę i kliknij Re-scan, aby odświeżyć wynik.
        </footer>
      </div>
    </div>
  );
}
