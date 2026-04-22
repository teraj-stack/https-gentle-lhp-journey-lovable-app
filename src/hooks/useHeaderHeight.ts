import { useEffect, useState } from "react";

/**
 * Reactive subscription do CSS var `--header-height` publikowanej przez `Header.tsx`
 * (ResizeObserver na <header>). Zwraca aktualną wysokość w pikselach.
 *
 * Dlaczego nie wystarczy odczyt jednorazowy:
 * - Header zmienia wysokość responsywnie (mobile vs desktop, mega-menu open/close,
 *   zmiana orientacji, scroll-shrink). `getComputedStyle` w handlerze klawisza dał
 *   poprawną wartość w momencie skoku, ale snapshot/safe-area overlay i pochodne
 *   wartości w state komponentu zostawały zatrzymane na starym headerH dopóki nie
 *   zaszedł kolejny scroll/resize event.
 *
 * Mechanizm:
 * 1. **MutationObserver** na `documentElement.style` — łapie każde
 *    `setProperty("--header-height", ...)` z `Header.tsx`. To główne źródło zmian.
 *    Obserwujemy attributeFilter=["style"], żeby nie reagować na inne mutacje.
 * 2. **window resize** — drugi sygnał na wypadek gdyby browser przeliczył
 *    `getComputedStyle` (rzadkie, ale tanie do dodania).
 * 3. Fallback do 80px gdy CSS var nie ustawiona (np. przed mountem `<Header>`).
 *
 * Zwraca STABILNE referencje — re-render tylko gdy wartość faktycznie się zmienia
 * (porównanie w setState callback).
 */
export function useHeaderHeight(fallback = 80): number {
  const [height, setHeight] = useState<number>(() => readHeaderHeight(fallback));

  useEffect(() => {
    const update = () => {
      const next = readHeaderHeight(fallback);
      setHeight((prev) => (prev === next ? prev : next));
    };

    // 1. MutationObserver na <html style="--header-height: Xpx"> — reaguje natychmiast
    //    na każde setProperty z Header.tsx (mega-menu open, mobile menu toggle, resize).
    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(update)
        : null;
    mo?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    // 2. Resize — defensywny fallback (np. iOS keyboard pokazuje/chowa się i wpływa
    //    na innerHeight, niektóre browsery przeliczają wtedy CSS var inaczej).
    window.addEventListener("resize", update);

    // Initial sync — gdyby Header zamontował się po nas i zdążył ustawić var
    // zanim observer zaczął obserwować.
    update();

    return () => {
      mo?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [fallback]);

  return height;
}

function readHeaderHeight(fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const cssVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--header-height")
    .trim();
  if (!cssVar) return fallback;
  const parsed = parseFloat(cssVar);
  return Number.isFinite(parsed) ? parsed : fallback;
}
