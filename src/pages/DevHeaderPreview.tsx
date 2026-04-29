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
  "Ginekomastia",
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

function ViewportFrame({ vp }: { vp: Viewport }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [report, setReport] = useState<ReportState>({
    status: "idle",
    findings: [],
  });

  const runScan = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setReport({ status: "loading", findings: [] });
    try {
      const doc = iframe.contentDocument;
      if (!doc) {
        setReport({
          status: "error",
          findings: [],
          error: "Brak dostępu do contentDocument (cross-origin?)",
        });
        return;
      }
      const findings = detectOverflowsInDoc(doc, vp.width);
      setReport({
        status: findings.length === 0 ? "ok" : "warn",
        findings,
        documentScrollWidth: doc.documentElement.scrollWidth,
        viewportWidth: vp.width,
      });
    } catch (e) {
      setReport({
        status: "error",
        findings: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // Auto-run skanowania ~800ms po załadowaniu iframe (czas na fonty/layout)
  const handleLoad = () => {
    window.setTimeout(runScan, 800);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {vp.label} — {vp.width}×{vp.height}
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
          title={`Header preview ${vp.label}`}
          onLoad={handleLoad}
          style={{
            width: vp.width,
            height: 240, // Pokazujemy tylko górę strony — header
            border: "none",
            display: "block",
          }}
        />
      </div>

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
                    +{f.overflowPx}px {f.reason}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground truncate">
                  „{f.text}" — scroll {f.scrollWidth} / client {f.clientWidth}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.status === "ok" && (
        <div className="text-xs text-green-500">
          ✓ Brak przepełnień w nagłówku
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {VIEWPORTS.map((vp) => (
            <ViewportFrame key={vp.width} vp={vp} />
          ))}
        </div>

        <footer className="pt-4 text-xs text-muted-foreground">
          Tip: jeśli zmieniasz <code>Header.tsx</code>, hot-reload przeładuje
          iframes — odczekaj chwilę i kliknij Re-scan, aby odświeżyć wynik.
        </footer>
      </div>
    </div>
  );
}
