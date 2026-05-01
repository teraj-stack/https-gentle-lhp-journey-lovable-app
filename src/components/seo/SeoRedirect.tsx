import { useLayoutEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface SeoRedirectProps {
  /** Ścieżka docelowa (np. "/dla-pacjenta/hemoroidy") albo absolute URL. */
  to: string;
}

const BASE_URL = "https://bestcml.io";

/** Buduje absolutny URL z relatywnej ścieżki (idempotentne dla absolutnych). */
function toAbsolute(target: string): string {
  if (/^https?:\/\//i.test(target)) return target;
  const path = target.startsWith("/") ? target : `/${target}`;
  return `${BASE_URL}${path}`;
}

/** Idempotentne ustawienie/utworzenie tagu w <head>. Zwraca [element, czyToNowy]. */
function upsertMeta(
  selector: string,
  build: (el: HTMLMetaElement | HTMLLinkElement) => void,
  tag: "meta" | "link"
): { el: HTMLMetaElement | HTMLLinkElement; created: boolean; previous: Record<string, string> | null } {
  const existing = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (existing) {
    // Snapshot istniejących atrybutów do późniejszego przywrócenia
    const previous: Record<string, string> = {};
    for (const attr of Array.from(existing.attributes)) previous[attr.name] = attr.value;
    build(existing);
    return { el: existing, created: false, previous };
  }
  const el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
  build(el);
  document.head.appendChild(el);
  return { el, created: true, previous: null };
}

/**
 * SEO-friendly client-side redirect dla hostingu Lovable (brak HTTP 301 z infrastruktury).
 *
 * Strategia obrony w głąb (defense-in-depth):
 *
 *  1. **Synchroniczny `useLayoutEffect`** — modyfikuje <head> ZANIM React commituje
 *     `<Navigate>`, więc canonical/refresh/robots realnie trafiają do DOM nawet jeśli
 *     redirect wykona się natychmiast. (useEffect odpalał się po commit → tagi ginęły.)
 *
 *  2. **Canonical `<link rel="canonical">`** na URL docelowy (absolute).
 *     Konsoliduje sygnał rankingowy z aliasu na cel.
 *
 *  3. **Meta refresh `<meta http-equiv="refresh" content="0;url=...">`** — Google
 *     traktuje 0s refresh jako permanent redirect. Fallback dla botów bez JS
 *     (Bingbot non-JS, Twitterbot, Facebookbot, LinkedInBot).
 *
 *  4. **Noindex** — trzy warstwy:
 *      - `<meta name="robots" content="noindex, follow, noarchive">`
 *      - `<meta name="googlebot" content="noindex, follow, noarchive">` (silniejsze dla GSC)
 *      - `<meta name="bingbot"   content="noindex, follow, noarchive">`
 *     `follow` przekazuje link equity dalej, `noarchive` blokuje cache snippet.
 *
 *  5. **Open Graph / Twitter** — `og:url` i `twitter:url` przepinane na cel,
 *     żeby udostępnienia w social media pokazywały URL kanoniczny.
 *
 *  6. **Cleanup na unmount** — wszystkie utworzone tagi są usuwane, a podmienione
 *     atrybuty istniejących tagów przywracane do poprzednich wartości. Brak wycieków
 *     pomiędzy nawigacjami client-side.
 *
 *  7. **`<Navigate replace>`** — instant client-side redirect dla użytkowników i botów
 *     z JS. `replace` nie zaśmieca history (back button skacze do poprzedniej strony,
 *     nie do aliasu).
 */
const SeoRedirect = ({ to }: SeoRedirectProps) => {
  const location = useLocation();
  const absoluteTarget = toAbsolute(to);

  // Trzymamy operacje cleanupu w ref — useLayoutEffect odpali cleanup tylko na unmount
  // (deps: [absoluteTarget]) — przy zmianie celu cleanup + ponowna aplikacja.
  const cleanupRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    // Defensywnie: jeśli cel jest identyczny ze ścieżką źródłową, NIE rób nic
    // (chroni przed nieskończoną pętlą redirectów w razie błędu konfiguracji).
    const sourceAbsolute = `${BASE_URL}${location.pathname}`;
    if (sourceAbsolute === absoluteTarget) {
      console.warn(`[SeoRedirect] from === to dla '${location.pathname}', pomijam.`);
      return;
    }

    const cleanups: Array<() => void> = [];

    /** Helper: zarejestruj operację upsert + zaplanuj jej rewert. */
    const apply = (
      selector: string,
      tag: "meta" | "link",
      build: (el: HTMLMetaElement | HTMLLinkElement) => void
    ) => {
      const { el, created, previous } = upsertMeta(selector, build, tag);
      cleanups.push(() => {
        if (created) {
          el.remove();
        } else if (previous) {
          // Usuń atrybuty dodane przez nas, przywróć oryginalne
          for (const attr of Array.from(el.attributes)) {
            if (!(attr.name in previous)) el.removeAttribute(attr.name);
          }
          for (const [name, value] of Object.entries(previous)) {
            el.setAttribute(name, value);
          }
        }
      });
    };

    // ── 1. Canonical na cel ───────────────────────────────────────────────
    apply('link[rel="canonical"]', "link", (el) => {
      el.setAttribute("rel", "canonical");
      el.setAttribute("href", absoluteTarget);
    });

    // ── 2. Meta refresh (0s = permanent dla Google) ───────────────────────
    apply('meta[http-equiv="refresh"]', "meta", (el) => {
      el.setAttribute("http-equiv", "refresh");
      el.setAttribute("content", `0;url=${absoluteTarget}`);
    });

    // ── 3. Noindex × 3 (generic + Googlebot + Bingbot) ────────────────────
    const ROBOTS_DIRECTIVE = "noindex, follow, noarchive";
    apply('meta[name="robots"]', "meta", (el) => {
      el.setAttribute("name", "robots");
      el.setAttribute("content", ROBOTS_DIRECTIVE);
    });
    apply('meta[name="googlebot"]', "meta", (el) => {
      el.setAttribute("name", "googlebot");
      el.setAttribute("content", ROBOTS_DIRECTIVE);
    });
    apply('meta[name="bingbot"]', "meta", (el) => {
      el.setAttribute("name", "bingbot");
      el.setAttribute("content", ROBOTS_DIRECTIVE);
    });

    // ── 4. Open Graph / Twitter URL → cel ─────────────────────────────────
    apply('meta[property="og:url"]', "meta", (el) => {
      el.setAttribute("property", "og:url");
      el.setAttribute("content", absoluteTarget);
    });
    apply('meta[name="twitter:url"]', "meta", (el) => {
      el.setAttribute("name", "twitter:url");
      el.setAttribute("content", absoluteTarget);
    });

    cleanupRef.current = () => cleanups.forEach((fn) => fn());
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [absoluteTarget, location.pathname]);

  return <Navigate to={to} replace />;
};

export default SeoRedirect;
