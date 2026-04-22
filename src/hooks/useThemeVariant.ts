import { useEffect, useState } from "react";
import type { ThemeVariant } from "@/lib/focusPrefsSerialization";

/**
 * Wykrywanie aktualnego wariantu motywu dla systemu per-variant focus prefs.
 *
 * Trzy warianty:
 *  - `"hc"` (high-contrast) — ZAWSZE wygrywa, niezależnie od motywu. To jest osobny
 *    układ stylów (grubszy ring + outline foreground), więc nadpisuje light/dark.
 *    Włączony przez prop `highContrast` (zwykle z `localStorage` toggle w UI).
 *  - `"dark"` — `<html class="dark">` (Tailwind `darkMode: "class"`) LUB
 *    `prefers-color-scheme: dark` gdy klasa nie jest jawnie ustawiona.
 *  - `"light"` — fallback (default `:root` w `index.css`).
 *
 * Hook nasłuchuje:
 *  - `MutationObserver` na `<html>` (zmiana klasy `.dark` przez ThemeProvider/toggle),
 *  - `window.matchMedia("(prefers-color-scheme: dark)")` (system zmienił preferencje),
 *  - `highContrast` jako prop (re-render przy toggle w UI).
 *
 * SSR-safe: zwraca `"light"` gdy `typeof window === "undefined"`.
 */
export function useThemeVariant(highContrast: boolean): ThemeVariant {
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  const [htmlDark, setHtmlDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  // Nasłuch system color-scheme — gdy user przełączy w OS, hook reaguje od razu.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    // addEventListener jest standardem; addListener to deprecated (Safari <14).
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  // Nasłuch klasy `.dark` na <html> przez MutationObserver — gdy ThemeProvider
  // (np. next-themes) doda/usunie klasę, rerender natychmiast.
  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      setHtmlDark(html.classList.contains("dark"));
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  if (highContrast) return "hc";
  // `<html class="dark">` jest jawnym sygnałem (override system), więc ma pierwszeństwo.
  // Jeśli klasa NIE jest ustawiona, padamy na system preference.
  if (htmlDark || (!htmlDark && systemDark && !document.documentElement.classList.contains("light"))) {
    return htmlDark ? "dark" : (systemDark ? "dark" : "light");
  }
  return "light";
}
