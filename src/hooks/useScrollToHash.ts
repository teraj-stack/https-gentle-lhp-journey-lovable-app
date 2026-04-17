import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Globalny scroll-to-anchor dla React Router z offsetem pod sticky header.
 *
 * React Router nie wykonuje natywnego scrolla do `#hash` po wczytaniu strony
 * ani po nawigacji client-side. Ten hook nasłuchuje zmian `location.hash`
 * (a także zmian `pathname` — bo użytkownik może wejść np. z `/?#sekcja`)
 * i scrolluje do elementu o danym `id`.
 *
 * Header w `Header.tsx` jest `position: fixed` (h-16 = 64 px), więc bez offsetu
 * tytuł sekcji byłby przykryty. Hook mierzy realną wysokość `<header>` przez
 * `getBoundingClientRect()` (uwzględnia paddingi, border, mobile vs desktop)
 * i odejmuje ją od docelowego scroll-position.
 *
 * Strategia retry-loop: layout sekcji rośnie po lazy-load obrazów,
 * framer-motion `whileInView` i webfontach — korygujemy pozycję ~8× przez
 * ~1.2 s. Każda korekta jest tania.
 *
 * Bezpieczne fallbacki:
 * - hash pusty → no-op
 * - element nie istnieje → no-op
 * - brak `<header>` → fallback offset 80 px
 * - `prefers-reduced-motion: reduce` → scroll bez animacji
 */

const HEADER_FALLBACK_OFFSET = 80;
const ANCHOR_BREATHING_ROOM = 12;

/**
 * Preferuje CSS var `--header-height` (ustawiana w Header.tsx przez ResizeObserver) —
 * jedno źródło prawdy współdzielone z `scroll-mt-[var(--header-height)]` itd.
 * Fallback do `getBoundingClientRect()` na <header>, ostatecznie 80 px.
 */
const getHeaderOffset = () => {
  const cssVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--header-height")
    .trim();
  if (cssVar) {
    const parsed = parseFloat(cssVar);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const header = document.querySelector("header");
  if (!header) return HEADER_FALLBACK_OFFSET;
  return header.getBoundingClientRect().height;
};

export const useScrollToHash = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;

    // Hash z routera zawiera prefix "#"; getElementById wymaga samego id.
    // decodeURIComponent obsługuje znaki specjalne (np. polskie znaki w id).
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      id = hash.slice(1);
    }
    if (!id) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

    let attempts = 0;
    const maxAttempts = 8;
    const intervalMs = 150;

    const scrollToTarget = () => {
      const target = document.getElementById(id);
      if (!target) return false;

      // Liczymy absolutną pozycję elementu w dokumencie i odejmujemy
      // wysokość headera + mały oddech (12 px), żeby tytuł sekcji nie
      // dotykał dolnej krawędzi paska nawigacji.
      const rect = target.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const offset = getHeaderOffset() + ANCHOR_BREATHING_ROOM;
      const top = Math.max(0, absoluteTop - offset);

      window.scrollTo({ top, behavior });
      return true;
    };

    const rafId = window.requestAnimationFrame(() => {
      // Pierwszy strzał szybko (po ~16 ms), żeby uniknąć błysku "u góry strony".
      scrollToTarget();
    });

    const intervalId = window.setInterval(() => {
      attempts += 1;
      const ok = scrollToTarget();
      if (!ok || attempts >= maxAttempts) {
        window.clearInterval(intervalId);
      }
    }, intervalMs);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
    };
  }, [hash, pathname]);
};
