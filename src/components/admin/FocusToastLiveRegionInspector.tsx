import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Activity, Eye, EyeOff, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Dev-only inspektor live regionów dla toastów (a11y QA tool).
 *
 * Po co to istnieje:
 *  - Toasty potwierdzające „Kopiuj link (variant)" jadą przez DWA kanały:
 *    `toast.success` (sonner globalny live region) + `toast.custom`
 *    (lokalny `role=status`+`aria-live=polite`+`aria-atomic=true`).
 *  - Trudno wzrokowo zweryfikować, czy SR ogłosiłby je w poprawnej kolejności
 *    i bez ucięć — szczególnie na mobile (375px), gdzie tekst może wychodzić
 *    poza viewport albo zostać złamany w nieczytelny sposób.
 *
 * Co robi:
 *  1. MutationObserver na `document.body` — łapie KAŻDE wstawienie nodu
 *     wewnątrz elementu z `role=status` / `aria-live` (polite/assertive).
 *  2. Loguje zdarzenia z timestampem (ms od mountu), tekstem, długością
 *     i flagą `overflow` (czy bounding rect wystaje poza window.innerWidth).
 *  3. Renderuje listę ostatnich 20 zdarzeń z kolorowym oznaczeniem ucięć.
 *  4. Przycisk „Próbny toast" — odpala fake toast.success+toast.custom
 *     z długim opisem, żeby admin mógł sprawdzić zachowanie na mobile bez
 *     wykonywania prawdziwej akcji kopiowania.
 *
 * NIE renderuje się w produkcji (`import.meta.env.DEV` guard w call-site).
 */

interface LiveRegionEvent {
  id: number;
  timestamp: number; // ms od mountu inspektora
  region: string; // role/aria-live wartość regionu źródłowego
  text: string;
  textLength: number;
  overflow: boolean; // czy element wystaje poza viewport
  rectWidth: number;
  viewportWidth: number;
}

let eventIdCounter = 0;

export const FocusToastLiveRegionInspector = () => {
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<LiveRegionEvent[]>([]);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;
    mountTimeRef.current = Date.now();

    // Helper: rekursywnie znajdź najbliższy element-przodka z aria-live/role=status.
    // Sonner czasem wstawia treść głęboko w drzewie (np. <li><div><span>tekst</span>),
    // więc target.parentElement nie zawsze ma atrybut — trzeba go znaleźć w hierarchii.
    const findLiveRegionAncestor = (node: Node): HTMLElement | null => {
      let el: HTMLElement | null =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as HTMLElement)
          : node.parentElement;
      while (el) {
        const role = el.getAttribute("role");
        const ariaLive = el.getAttribute("aria-live");
        if (role === "status" || role === "alert" || (ariaLive && ariaLive !== "off")) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const recordEvent = (regionEl: HTMLElement, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const rect = regionEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      // Overflow = prawy brzeg toasta wystaje poza viewport. Tolerancja 2px na sub-pixel.
      // To jest najlepszy proxy dla „SR ucina/użytkownik nie widzi końcówki".
      const overflow = rect.right > viewportWidth + 2 || rect.left < -2;
      const role = regionEl.getAttribute("role") ?? "";
      const ariaLive = regionEl.getAttribute("aria-live") ?? "";
      const regionLabel = [role && `role=${role}`, ariaLive && `aria-live=${ariaLive}`]
        .filter(Boolean)
        .join(" · ");

      setEvents((prev) => {
        // Dedup ten sam tekst w ciągu 50ms (sonner czasem dwukrotnie patchuje DOM
        // przy wstawianiu — to NIE jest osobne ogłoszenie SR, tylko artefakt renderu).
        const last = prev[0];
        if (last && last.text === trimmed && Date.now() - mountTimeRef.current - last.timestamp < 50) {
          return prev;
        }
        const next: LiveRegionEvent = {
          id: eventIdCounter++,
          timestamp: Date.now() - mountTimeRef.current,
          region: regionLabel || "(unknown)",
          text: trimmed,
          textLength: trimmed.length,
          overflow,
          rectWidth: Math.round(rect.width),
          viewportWidth,
        };
        return [next, ...prev].slice(0, 20);
      });
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // Wstawienie nodu (najczęstszy przypadek dla toastów).
        for (const added of Array.from(m.addedNodes)) {
          const region = findLiveRegionAncestor(added);
          if (!region) continue;
          // Dajemy 1 frame na finalizację layoutu (sonner anim, content paint),
          // potem czytamy textContent + bounding rect.
          requestAnimationFrame(() => {
            recordEvent(region, region.textContent ?? "");
          });
        }
        // Mutacja characterData — bezpośrednia podmiana tekstu w istniejącym live regionie.
        if (m.type === "characterData") {
          const region = findLiveRegionAncestor(m.target);
          if (region) {
            requestAnimationFrame(() => {
              recordEvent(region, region.textContent ?? "");
            });
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [enabled]);

  const fireTestToasts = () => {
    // Symulujemy DOKŁADNIE ten sam pattern co `handleCopyFocusPrefsLinkVariant`:
    // success (kanał wizualny, sonner) + custom (kanał a11y, dedicated live region).
    // Tekst celowo długi — sprawdza zachowanie na mobile (375px).
    const title = "Skopiowano link (High Contrast)";
    const description = "Wariant High Contrast: ring 2.5px · glow 80% · afterglow 2.4s";

    toast.success(title, { description, duration: 4000 });

    toast.custom(
      (t) => (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-auto flex w-full items-start gap-3 rounded-md border border-border bg-background p-4 text-foreground shadow-lg"
          onClick={() => toast.dismiss(t)}
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="text-sm font-semibold leading-snug">{title}</div>
            <div className="whitespace-normal break-words text-sm leading-snug text-muted-foreground">
              {description}
            </div>
          </div>
        </div>
      ),
      { duration: 4000 },
    );
  };

  return (
    <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <Activity className="h-3 w-3" />
          <span>Inspektor live regionu (DEV)</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={() => setEnabled((v) => !v)}
            aria-pressed={enabled}
            title={enabled ? "Wyłącz nasłuchiwanie MutationObserver" : "Włącz nasłuchiwanie wstawień w live regionach"}
          >
            {enabled ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {enabled ? "Stop" : "Start"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={() => setEvents([])}
            disabled={events.length === 0}
            title="Wyczyść historię zdarzeń"
          >
            <Trash2 className="h-3 w-3" />
            Wyczyść
          </Button>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-full text-[11px]"
        onClick={fireTestToasts}
        title="Odpal próbny toast (success + custom) z długim opisem, żeby przetestować live region bez kopiowania"
      >
        Odpal próbny toast (success + custom)
      </Button>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
          <span>
            Zdarzenia: <span className="font-mono tabular-nums">{events.length}</span>
            {events.length === 20 && " (max)"}
          </span>
          <span className="font-mono tabular-nums">vw: {window.innerWidth}px</span>
        </div>
        {events.length === 0 ? (
          <div className="text-[10px] text-muted-foreground/60 italic py-2 text-center">
            {enabled
              ? "Brak zdarzeń. Kliknij „Odpal próbny toast" lub „Kopiuj link"."
              : "Inspektor wyłączony. Kliknij „Start" żeby zacząć nasłuchiwać."}
          </div>
        ) : (
          <ol
            className="space-y-1 max-h-48 overflow-y-auto pr-1"
            // Numerowana lista — pokazuje KOLEJNOŚĆ ogłoszeń (najnowszy = #1 na górze).
            // To jest kluczowe dla weryfikacji „czy SR przeczyta success PRZED custom".
            aria-label="Historia zdarzeń live regionu, najnowsze pierwsze"
          >
            {events.map((ev, idx) => (
              <li
                key={ev.id}
                className="rounded border border-border/40 bg-background/60 p-1.5 text-[10px] space-y-0.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 font-mono tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">#{events.length - idx}</span>
                    <span>{ev.timestamp}ms</span>
                    <span className="text-muted-foreground/60">·</span>
                    <span>{ev.textLength} znaków</span>
                  </div>
                  {ev.overflow && (
                    <span
                      className="flex items-center gap-0.5 text-destructive font-semibold"
                      title={`Overflow: szerokość ${ev.rectWidth}px > viewport ${ev.viewportWidth}px — może być ucięte`}
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      OVERFLOW
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground/80 font-mono text-[9px]">{ev.region}</div>
                <div className="text-foreground whitespace-normal break-words leading-snug">
                  {ev.text}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="text-[9px] text-muted-foreground/60 leading-snug">
        Tylko DEV. Łapie wstawienia w <code className="font-mono">role=status</code> /{" "}
        <code className="font-mono">aria-live</code>. „OVERFLOW" = toast wystaje poza viewport
        (na mobile może urwać się po prawej stronie).
      </p>
    </div>
  );
};
