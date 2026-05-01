/**
 * Centralna mapa przekierowań SEO.
 *
 * Format: { from: "/stara-sciezka", to: "/nowa-sciezka", reason?: "opis" }
 *
 * Użycie: każdy wpis automatycznie generuje <Route> w App.tsx (przez `redirectRoutes`)
 * renderujący komponent <SeoRedirect>, który:
 *  - ustawia <link rel="canonical"> na URL docelowy,
 *  - dodaje <meta http-equiv="refresh" content="0;url=..."> (ekwiwalent 301 dla botów bez JS),
 *  - wykonuje `<Navigate replace>` po stronie klienta (instant dla użytkowników i Googlebota).
 *
 * UWAGA (Lovable hosting): prawdziwe nagłówki HTTP 301 nie są możliwe (brak _redirects/netlify.toml).
 * Ten mechanizm to maksymalnie SEO-friendly substytut: replace + canonical + meta refresh.
 *
 * Stan na dziś: BRAK aktywnych przekierowań. Restruktura menu nie usunęła żadnych URL-i —
 * wszystkie strony nadal odpowiadają 200 OK pod oryginalnymi adresami, jedynie zmieniła się
 * ich pozycja w nawigacji. Dlatego lista jest pusta. Dodawaj wpisy gdy realnie usuwasz/zmieniasz URL.
 *
 * Przykład przyszłego wpisu:
 *   { from: "/stary-blog/jakas-strona", to: "/blog/jakas-strona", reason: "Zmiana struktury bloga" }
 */
export interface SeoRedirectEntry {
  from: string;
  to: string;
  reason?: string;
}

export const SEO_REDIRECTS: SeoRedirectEntry[] = [
  // Brak aktywnych przekierowań — patrz komentarz powyżej.
];
