import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Globalny scroll-to-anchor dla React Router.
 *
 * React Router nie wykonuje natywnego scrolla do `#hash` po wczytaniu strony
 * ani po nawigacji client-side. Ten hook nasłuchuje zmian `location.hash`
 * (a także zmian `pathname` — bo użytkownik może wejść np. z `/?#sekcja`)
 * i scrolluje do elementu o danym `id`.
 *
 * Krótki łańcuch rAF + setTimeout daje sekcjom czas na zamontowanie
 * i animację framer-motion (`whileInView`/`initial`), żeby `scrollIntoView`
 * trafił we właściwą pozycję — a nie w placeholder przed animacją.
 *
 * Bezpieczne fallbacki:
 * - jeśli `hash` jest pusty → no-op (pozwala domyślnemu zachowaniu Routera zarządzać top-scroll)
 * - jeśli element nie istnieje w DOM → no-op (np. literówka w linku)
 * - jeśli użytkownik preferuje `prefers-reduced-motion: reduce` → scroll bez animacji
 */
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

    // Strategia: ścigamy się ze zmianami layoutu — sekcje powyżej anchora mogą rosnąć
    // (lazy-loadowane obrazy, framer-motion `whileInView`, czcionki webfont).
    // Zamiast jednego scrolla po 120 ms, korygujemy pozycję kilkukrotnie aż element
    // znajdzie się w viewporcie ALBO upłynie ~1.2 s. Każda korekta jest tania.
    let attempts = 0;
    const maxAttempts = 8;
    const intervalMs = 150;

    const scrollToTarget = () => {
      const target = document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ behavior, block: "start" });
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
