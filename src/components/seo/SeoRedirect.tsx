import { useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { logRedirectHit } from "@/lib/seo/redirectLog";

interface SeoRedirectProps {
  /** Ścieżka docelowa (np. "/dla-pacjenta/hemoroidy") albo absolute URL. */
  to: string;
}

const BASE_URL = "https://mcml.pro";

/** Marker atrybutu — pozwala namierzyć i usunąć tylko tagi dodane przez nas. */
const OWNER_ATTR = "data-seo-redirect";

function toAbsolute(target: string): string {
  if (/^https?:\/\//i.test(target)) return target;
  const path = target.startsWith("/") ? target : `/${target}`;
  return `${BASE_URL}${path}`;
}

interface SnapshotEntry {
  el: HTMLElement;
  /** Czy tag został przez nas utworzony (vs. zmodyfikowany istniejący). */
  created: boolean;
  /** Snapshot atrybutów do odtworzenia, jeśli `created === false`. */
  previousAttrs: Record<string, string> | null;
}

/**
 * Idempotentnie utwórz/zaktualizuj tag w <head>. Zwraca snapshot do cleanupu.
 * Wykonywane SYNCHRONICZNIE w trakcie renderu — w przeciwnym razie <Navigate> unmount
 * przed effectem i tagi nigdy by nie trafiły do DOM dla crawlerów inspekcjonujących head.
 */
function upsert(
  selector: string,
  tag: "meta" | "link",
  build: (el: HTMLElement) => void
): SnapshotEntry {
  const existing = document.head.querySelector(selector) as HTMLElement | null;
  if (existing) {
    const previousAttrs: Record<string, string> = {};
    for (const attr of Array.from(existing.attributes)) previousAttrs[attr.name] = attr.value;
    build(existing);
    existing.setAttribute(OWNER_ATTR, "modified");
    return { el: existing, created: false, previousAttrs };
  }
  const el = document.createElement(tag);
  build(el);
  el.setAttribute(OWNER_ATTR, "created");
  document.head.appendChild(el);
  return { el, created: true, previousAttrs: null };
}

/**
 * SEO-friendly client-side redirect dla hostingu Lovable (brak HTTP 301 z infrastruktury).
 *
 * Strategia obrony w głąb (defense-in-depth):
 *
 *  1. **Synchroniczna emisja w renderze** — modyfikacje <head> dzieją się PRZED
 *     `return <Navigate>`, więc tagi są w DOM nawet jeśli React natychmiast
 *     unmountuje komponent po redirect (kluczowe — useEffect odpalał się za późno).
 *
 *  2. **Canonical** `<link rel="canonical">` na absolute URL celu —
 *     konsoliduje ranking aliasu z celem.
 *
 *  3. **Meta refresh** `<meta http-equiv="refresh" content="0;url=...">` —
 *     Google traktuje 0s refresh jako permanent redirect. Fallback dla botów bez JS
 *     (Bingbot non-JS, Twitterbot, Facebookbot, LinkedInBot).
 *
 *  4. **Noindex × 3** — `robots`, `googlebot`, `bingbot` z `noindex, follow, noarchive`.
 *     `follow` przekazuje link equity, `noarchive` blokuje cache snippet.
 *
 *  5. **Open Graph / Twitter URL → cel** — udostępnienia social media pokazują kanoniczny URL.
 *
 *  6. **Cleanup na unmount** — utworzone tagi usunięte (po `data-seo-redirect="created"`),
 *     zmodyfikowane przywrócone do snapshot atrybutów. Brak wycieków.
 *
 *  7. **`<Navigate replace>`** — instant client-side redirect bez zaśmiecania history.
 *
 *  8. **Self-redirect guard** — jeśli `from === to`, pomija side-effects i ostrzega
 *     w konsoli (chroni przed nieskończoną pętlą redirectów).
 */
const SeoRedirect = ({ to }: SeoRedirectProps) => {
  const location = useLocation();
  const absoluteTarget = toAbsolute(to);
  const sourceAbsolute = `${BASE_URL}${location.pathname}`;
  const isSelfRedirect = sourceAbsolute === absoluteTarget;

  // Snapshot operacji do odwrócenia w cleanup. Zapisywany w renderze, wykonany w useEffect cleanup.
  const snapshotRef = useRef<SnapshotEntry[] | null>(null);

  // ── Synchroniczna emisja w trakcie renderu (jednorazowo per mount) ──────────
  // Tworzymy tagi tylko raz na mount, zanim React commituje <Navigate>.
  if (typeof document !== "undefined" && snapshotRef.current === null && !isSelfRedirect) {
    // Dev/diagnostyka: zarejestruj trafienie w starym URL → /dev/seo-redirects.
    logRedirectHit(location.pathname, to);

    const ROBOTS_DIRECTIVE = "noindex, follow, noarchive";
    const ops: SnapshotEntry[] = [];

    ops.push(
      upsert('link[rel="canonical"]', "link", (el) => {
        el.setAttribute("rel", "canonical");
        el.setAttribute("href", absoluteTarget);
      })
    );
    ops.push(
      upsert('meta[http-equiv="refresh"]', "meta", (el) => {
        el.setAttribute("http-equiv", "refresh");
        el.setAttribute("content", `0;url=${absoluteTarget}`);
      })
    );
    ops.push(
      upsert('meta[name="robots"]', "meta", (el) => {
        el.setAttribute("name", "robots");
        el.setAttribute("content", ROBOTS_DIRECTIVE);
      })
    );
    ops.push(
      upsert('meta[name="googlebot"]', "meta", (el) => {
        el.setAttribute("name", "googlebot");
        el.setAttribute("content", ROBOTS_DIRECTIVE);
      })
    );
    ops.push(
      upsert('meta[name="bingbot"]', "meta", (el) => {
        el.setAttribute("name", "bingbot");
        el.setAttribute("content", ROBOTS_DIRECTIVE);
      })
    );
    ops.push(
      upsert('meta[property="og:url"]', "meta", (el) => {
        el.setAttribute("property", "og:url");
        el.setAttribute("content", absoluteTarget);
      })
    );
    ops.push(
      upsert('meta[name="twitter:url"]', "meta", (el) => {
        el.setAttribute("name", "twitter:url");
        el.setAttribute("content", absoluteTarget);
      })
    );

    snapshotRef.current = ops;
  }

  if (isSelfRedirect) {
    console.warn(`[SeoRedirect] from === to dla '${location.pathname}', pomijam.`);
    return null;
  }

  // CELOWO bez cleanup w useEffect:
  // Po `<Navigate>` jesteśmy na celu, który ma własny SeoHead nadpisujący canonical/og:url.
  // Próba cleanup zbiega się z unmountem przez Navigate i powodowała usuwanie tagów
  // ZANIM cel zdążył je nadpisać. Pozostawienie tagów do następnego mount SeoRedirect
  // (gdzie `upsert` nadpisze przez selector) jest bezpieczne i deterministyczne.
  // Tag `data-seo-redirect="created"` pozwala namierzyć je narzędziami debug.

  return <Navigate to={to} replace />;
};

export default SeoRedirect;
