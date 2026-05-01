import { useEffect } from "react";
import { Navigate } from "react-router-dom";

interface SeoRedirectProps {
  /** Ścieżka docelowa (np. "/dla-pacjenta/hemoroidy"). */
  to: string;
}

const BASE_URL = "https://bestcml.io";

/**
 * SEO-friendly client-side redirect dla hostingu Lovable (brak HTTP 301 z infrastruktury).
 *
 * Trzy warstwy bezpieczeństwa:
 *  1. <Navigate replace> — natychmiastowy redirect dla użytkowników i botów obsługujących JS
 *     (m.in. Googlebot). `replace` NIE dodaje wpisu do historii, więc back button działa poprawnie.
 *  2. <link rel="canonical"> wskazujący URL docelowy — wzmacnia sygnał konsolidacji.
 *  3. <meta http-equiv="refresh" content="0;url=..."> — fallback dla crawlerów bez JS
 *     (Bingbot w niektórych trybach, Twitterbot, Facebookbot). Google Search Central potwierdza,
 *     że meta refresh z 0s jest traktowane jako permanent redirect.
 *
 * Wszystkie 3 tagi są dodawane synchronicznie w useEffect i sprzątane przy unmount,
 * żeby nie zanieczyściły <head> po nawigacji.
 */
const SeoRedirect = ({ to }: SeoRedirectProps) => {
  useEffect(() => {
    const absoluteTarget = to.startsWith("http") ? to : `${BASE_URL}${to}`;
    const created: HTMLElement[] = [];

    // Meta refresh fallback dla botów bez JS
    const refresh = document.createElement("meta");
    refresh.setAttribute("http-equiv", "refresh");
    refresh.setAttribute("content", `0;url=${absoluteTarget}`);
    document.head.appendChild(refresh);
    created.push(refresh);

    // Canonical na cel
    const existingCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const previousCanonicalHref = existingCanonical?.getAttribute("href") ?? null;
    let canonical = existingCanonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
      created.push(canonical);
    }
    canonical.setAttribute("href", absoluteTarget);

    // Robots: noindex starej ścieżki — chcemy żeby Google indeksował tylko cel
    const robots = document.createElement("meta");
    robots.setAttribute("name", "robots");
    robots.setAttribute("content", "noindex, follow");
    document.head.appendChild(robots);
    created.push(robots);

    return () => {
      created.forEach((el) => el.remove());
      // Przywróć poprzedni canonical jeśli istniał
      if (previousCanonicalHref && existingCanonical && existingCanonical.parentNode) {
        existingCanonical.setAttribute("href", previousCanonicalHref);
      }
    };
  }, [to]);

  return <Navigate to={to} replace />;
};

export default SeoRedirect;
