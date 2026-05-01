import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SEO_REDIRECTS } from "@/lib/seo/redirectsMap";
import SeoRedirect from "@/components/seo/SeoRedirect";

/**
 * Unit testy zachowania routingu dla SEO_REDIRECTS.
 *
 * Każde wejście z mapy MUSI:
 *   1. Wyrenderować <SeoRedirect> (Navigate replace) zamiast 404,
 *   2. Po następnym tiku skierować router na ścieżkę `to`,
 *   3. NIE wyrenderować markera "NOT FOUND".
 *
 * Replikujemy tu strukturę <Routes> z App.tsx (te same wpisy + catch-all "*"),
 * żeby test był bliski produkcyjnemu zachowaniu, ale bez ładowania całego drzewa.
 */

const NotFoundMarker = () => <div data-testid="not-found">NOT FOUND</div>;

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
};

/**
 * Renderuje ten sam zestaw route'ów co App.tsx, ale z prostymi placeholderami
 * dla rzeczywistych stron (interesuje nas tylko routing, nie content).
 */
function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {/* Wszystkie cele redirectów jako anonimowe placeholdery + sonda lokalizacji */}
        <Route path="*" element={<LocationProbe />} />
      </Routes>
      <Routes>
        {SEO_REDIRECTS.map(({ from, to }) => (
          <Route key={from} path={from} element={<SeoRedirect to={to} />} />
        ))}
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

      // Po renderze <Navigate replace> sonda powinna już pokazywać `to`.
      const probe = screen.getByTestId("current-path");
      expect(
        probe.textContent,
        `Ścieżka '${from}' nie przekierowała na '${to}' (faktycznie: '${probe.textContent}').`
      ).toBe(to);
    }
  );

  it("nieznana ścieżka NADAL trafia w 404 (catch-all działa, redirecty nie pochłaniają wszystkiego)", () => {
    renderAtPath("/zupelnie-nieistniejaca-sciezka-xyz-123");
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });
});
