import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SEO_REDIRECTS } from "@/lib/seo/redirectsMap";
import SeoRedirect from "@/components/seo/SeoRedirect";

/**
 * Unit testy zachowania runtime dla SEO_REDIRECTS.
 *
 * Każde wejście z mapy MUSI:
 *   1. Wyrenderować <SeoRedirect> (Navigate replace) zamiast 404,
 *   2. Po nawigacji router osiada na ścieżce `to`,
 *   3. NIE wyrenderować markera "NOT FOUND".
 *
 * Strategia: replikujemy strukturę <Routes> z App.tsx (te same wpisy +
 * placeholder dla każdego unikalnego `to` + catch-all "*"). Jeden zbiór
 * <Routes>, jeden match — żeby zachowanie było zgodne z prodem.
 */

const NotFoundMarker = () => <div data-testid="not-found">NOT FOUND</div>;

const TargetPlaceholder = () => {
  const location = useLocation();
  return <div data-testid="target-path">{location.pathname}</div>;
};

const UNIQUE_TARGETS = Array.from(new Set(SEO_REDIRECTS.map((e) => e.to)));

function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {/* Cele redirectów — tu wyląduje router po Navigate replace */}
        {UNIQUE_TARGETS.map((to) => (
          <Route key={to} path={to} element={<TargetPlaceholder />} />
        ))}
        {/* Wpisy redirectów — odpowiednik bloku w App.tsx */}
        {SEO_REDIRECTS.map(({ from, to }) => (
          <Route key={from} path={from} element={<SeoRedirect to={to} />} />
        ))}
        {/* Catch-all */}
        <Route path="*" element={<NotFoundMarker />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("SEO_REDIRECTS — zachowanie runtime", () => {
  it("mapa nie jest pusta (sanity check)", () => {
    expect(SEO_REDIRECTS.length).toBeGreaterThan(0);
  });

  it.each(SEO_REDIRECTS)(
    "wejście na '$from' przekierowuje na '$to' (NIE 404)",
    ({ from, to }) => {
      renderAtPath(from);

      // Krytyczne: marker NotFound NIE może się pojawić.
      expect(
        screen.queryByTestId("not-found"),
        `Ścieżka '${from}' wpadła w catch-all '*' zamiast w SEO_REDIRECTS.`
      ).not.toBeInTheDocument();

      // Po renderze <Navigate replace> placeholder celu powinien pokazywać `to`.
      const target = screen.getByTestId("target-path");
      expect(
        target.textContent,
        `Ścieżka '${from}' nie przekierowała na '${to}' (faktycznie: '${target.textContent}').`
      ).toBe(to);
    }
  );

  it("nieznana ścieżka NADAL trafia w 404 (catch-all działa, redirecty nie pochłaniają wszystkiego)", () => {
    renderAtPath("/zupelnie-nieistniejaca-sciezka-xyz-123");
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });
});
