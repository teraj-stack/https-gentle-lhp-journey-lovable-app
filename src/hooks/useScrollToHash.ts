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

    // 120 ms okazało się stabilne na sekcji #backup (framer-motion entry ~600 ms,
    // ale layout final wysokości jest znany już po pierwszym paint). Dwustopniowe
    // opóźnienie (rAF → setTimeout) eliminuje race condition na powolnych urządzeniach.
    let timeoutId: number | undefined;
    const rafId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        const target = document.getElementById(id);
        if (!target) return;
        target.scrollIntoView({ behavior, block: "start" });
      }, 120);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [hash, pathname]);
};
