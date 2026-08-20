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
  // ─────────────────────────────────────────────────────────────────────────
  // FAZA 1 — Vanity URLs (potwierdzone, używane w druku/Google Ads/social).
  // Mapują problem pacjenta → kanoniczna podstrona (hub edukacyjny lub metoda).
  // ─────────────────────────────────────────────────────────────────────────
  { from: "/hemoroidy", to: "/dla-pacjenta/hemoroidy", reason: "Vanity URL → hub edukacyjny hemoroidów" },
  { from: "/pajaczki", to: "/dla-pacjenta/pajaczki", reason: "Vanity URL → hub edukacyjny pajączków" },
  { from: "/zylaki", to: "/leczenie/evlt", reason: "Vanity URL → metoda leczenia żylaków (EVLT)" },
  { from: "/przetoka", to: "/leczenie/filac", reason: "Vanity URL → metoda leczenia przetoki (FiLaC)" },
  { from: "/torbiel", to: "/leczenie/silac", reason: "Vanity URL → metoda leczenia torbieli pilonidalnej (SiLaC)" },
  { from: "/ginekomastia", to: "/leczenie/ginekomastia", reason: "Vanity URL → strona główna ginekomastii" },

  // ─────────────────────────────────────────────────────────────────────────
  // FAZA 2 — Aliasy literówek i alternatywnych pisowni (fallback gdy
  // Cloudflare Bulk Redirects nie zadziała lub nie obejmie wariantu).
  // Pokrywa: pisownię z polskimi znakami, częste literówki, formy ang./potoczne.
  // ─────────────────────────────────────────────────────────────────────────

  // Hemoroidy — warianty pisowni
  { from: "/hemoroidi", to: "/dla-pacjenta/hemoroidy", reason: "Literówka: hemoroidi → hemoroidy" },
  { from: "/hemeroidy", to: "/dla-pacjenta/hemoroidy", reason: "Literówka: hemeroidy → hemoroidy" },
  { from: "/hemoroidy-leczenie", to: "/dla-pacjenta/hemoroidy", reason: "Wariant frazy → hub hemoroidów" },
  { from: "/leczenie-hemoroidow", to: "/dla-pacjenta/hemoroidy", reason: "Wariant frazy → hub hemoroidów" },
  { from: "/zylaki-odbytu", to: "/dla-pacjenta/hemoroidy", reason: "Potoczna nazwa → hub hemoroidów" },
  { from: "/leczenie/hemoroidy", to: "/dla-pacjenta/hemoroidy", reason: "Stary alias /leczenie/* → hub edukacyjny" },

  // Pajączki — warianty pisowni (z/bez polskich znaków, l.poj.)
  { from: "/pajączki", to: "/dla-pacjenta/pajaczki", reason: "Polskie znaki → wersja kanoniczna" },
  { from: "/pajaczek", to: "/dla-pacjenta/pajaczki", reason: "Liczba pojedyncza → hub pajączków" },
  { from: "/naczynka", to: "/dla-pacjenta/pajaczki", reason: "Synonim potoczny → hub pajączków" },
  { from: "/teleangiektazje", to: "/dla-pacjenta/pajaczki", reason: "Termin medyczny → hub pajączków" },
  { from: "/clacs", to: "/leczenie/clacs", reason: "Vanity → metoda CLaCS" },
  { from: "/leczenie/pajaczki", to: "/dla-pacjenta/pajaczki", reason: "Stary alias /leczenie/* → hub edukacyjny" },

  // Żylaki — warianty pisowni
  { from: "/żylaki", to: "/leczenie/evlt", reason: "Polskie znaki → metoda EVLT" },
  { from: "/zylak", to: "/leczenie/evlt", reason: "Liczba pojedyncza → metoda EVLT" },
  { from: "/zylaki-konczyn-dolnych", to: "/leczenie/evlt", reason: "Pełna nazwa medyczna → metoda EVLT" },
  { from: "/evlt", to: "/leczenie/evlt", reason: "Vanity → metoda EVLT" },
  { from: "/laser-zylaki", to: "/leczenie/evlt", reason: "Wariant frazy → metoda EVLT" },

  // Przetoka odbytu — warianty
  { from: "/przetoki", to: "/leczenie/filac", reason: "Liczba mnoga → metoda FiLaC" },
  { from: "/przetoka-odbytu", to: "/leczenie/filac", reason: "Pełna nazwa → metoda FiLaC" },
  { from: "/filac", to: "/leczenie/filac", reason: "Vanity → metoda FiLaC" },
  { from: "/leczenie/przetoka", to: "/leczenie/filac", reason: "Stary alias → metoda FiLaC" },

  // Torbiel pilonidalna — warianty
  { from: "/torbiel-pilonidalna", to: "/leczenie/silac", reason: "Pełna nazwa → metoda SiLaC" },
  { from: "/torbiel-wlosowa", to: "/leczenie/silac", reason: "Synonim → metoda SiLaC" },
  { from: "/zatoka-pilonidalna", to: "/leczenie/silac", reason: "Synonim medyczny → metoda SiLaC" },
  { from: "/silac", to: "/leczenie/silac", reason: "Vanity → metoda SiLaC" },

  // Ginekomastia — warianty pisowni
  { from: "/gynekomastia", to: "/leczenie/ginekomastia", reason: "Literówka (g→gy): gynekomastia → ginekomastia" },
  { from: "/ginekomatia", to: "/leczenie/ginekomastia", reason: "Literówka: brak 's'" },
  { from: "/gynecomastia", to: "/leczenie/ginekomastia", reason: "Pisownia ang. → wersja PL" },
  { from: "/piersi-meskie", to: "/leczenie/ginekomastia", reason: "Potoczna nazwa → hub ginekomastii" },
  { from: "/redukcja-piersi-mezczyzni", to: "/leczenie/ginekomastia", reason: "Wariant frazy → hub ginekomastii" },

  // Szczelina i inne typowe trafienia proktologiczne
  { from: "/szczelina", to: "/leczenie/szczelina", reason: "Vanity → szczelina odbytu" },
  { from: "/szczelina-odbytu", to: "/leczenie/szczelina", reason: "Pełna nazwa → szczelina odbytu" },
  { from: "/lhp", to: "/leczenie/lhp", reason: "Vanity → metoda LHP" },
  { from: "/proktolog", to: "/leczenie/proktologia", reason: "Specjalizacja → hub proktologii" },
  { from: "/proktologia", to: "/leczenie/proktologia", reason: "Bez prefiksu → hub proktologii" },
  { from: "/flebolog", to: "/leczenie/flebologia", reason: "Specjalizacja → hub flebologii" },
  { from: "/flebologia", to: "/leczenie/flebologia", reason: "Bez prefiksu → hub flebologii" },

  // ─────────────────────────────────────────────────────────────────────────
  // FAZA 3 — TEMPLATE: vanity URLs kliniki + slot na stare adresy z GSC.
  //
  // INSTRUKCJA:
  //   1. Każdy wpis poniżej ODKOMENTUJ gdy realnie chcesz uruchomić.
  //   2. Dopisuj swoje stare adresy (z Google Search Console → "Not found" → Export CSV,
  //      starych ulotek, kampanii Ads, archiwum WordPress) w sekcji "MOJE STARE ADRESY".
  //   3. Po każdej zmianie testy `npm test src/lib/seo/redirectsMap.test.ts` zwalidują:
  //      brak duplikatów, cykli, kolizji z route'ami i istnienie celu w App.tsx.
  // ─────────────────────────────────────────────────────────────────────────

  // ── Vanity dla materiałów drukowanych / Google Ads / wizytówek (przykłady) ──
  // { from: "/umow-wizyte", to: "/kontakt", reason: "CTA z wizytówki/ulotki → strona kontaktu" },
  // { from: "/rejestracja", to: "/kontakt", reason: "Vanity z ulotki → kontakt z rejestratorką" },
  // { from: "/wizyta", to: "/kontakt", reason: "Krótki vanity → kontakt" },
  // { from: "/ceny", to: "/cennik", reason: "Synonim → cennik" },
  // { from: "/cena", to: "/cennik", reason: "L.poj. → cennik" },
  // { from: "/cennik-zabiegow", to: "/cennik", reason: "Wariant frazy → cennik" },
  // { from: "/o-klinice", to: "/o-nas", reason: "Wariant frazy → strona O nas" },
  // { from: "/o-cml", to: "/o-nas", reason: "Brand vanity → O nas" },
  // { from: "/dr-bujok", to: "/o-nas", reason: "Imienne vanity → O nas (Dr Bujok)" },
  // { from: "/jan-bujok", to: "/o-nas", reason: "Imienne vanity → O nas" },
  // { from: "/zespol", to: "/o-nas", reason: "Sekcja zespół → O nas" },
  // { from: "/lokalizacje", to: "/kontakt", reason: "4 lokalizacje kliniki → strona kontaktu" },
  // { from: "/gabinet", to: "/kontakt", reason: "Vanity → kontakt z lokalizacjami" },
  // { from: "/wspolpraca-medyczna", to: "/wspolpraca", reason: "Wariant frazy → S.C.A.L.E. współpraca" },
  // { from: "/dla-lekarzy", to: "/wspolpraca", reason: "Target B2B → strona współpracy" },
  // { from: "/blog-medyczny", to: "/blog", reason: "Wariant frazy → blog" },
  // { from: "/artykuly", to: "/blog", reason: "Synonim → blog" },
  // { from: "/poradnik", to: "/dla-pacjenta", reason: "Synonim → strefa pacjenta" },
  // { from: "/wiedza", to: "/dla-pacjenta", reason: "Wariant frazy → strefa pacjenta" },
  // { from: "/edukacja", to: "/dla-pacjenta/edukacja", reason: "Bez prefiksu → strona edukacyjna" },

  // ── Vanity dla zabiegów (przykłady — uzupełnij własnymi) ──
  // { from: "/zabieg-laserowy", to: "/leczenie/lhp", reason: "Generyczna nazwa → LHP (najpopularniejszy zabieg)" },
  // { from: "/laser-proktologia", to: "/leczenie/proktologia", reason: "Vanity → hub proktologii laserowej" },
  // { from: "/laser-flebologia", to: "/leczenie/flebologia", reason: "Vanity → hub flebologii laserowej" },

  // ─────────────────────────────────────────────────────────────────────────
  // ⬇ MOJE STARE ADRESY — wklej tu URL-e z GSC / starej strony WordPress / ulotek.
  //   Format: { from: "/stara-sciezka", to: "/cel", reason: "Skąd pochodzi" },
  //   Przykład: { from: "/usugi/laser-zylakow", to: "/leczenie/evlt", reason: "Stary WordPress slug" },
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // FAZA 4 — Konsolidacja lokalizacji: jedyny gabinet to Warszawa Wilanów,
  // ul. Adama Branickiego 10/U6. Stare URL-e zawierające inne miasta lub
  // frazę „kliniki premium" (l.mn.) → /kontakt (jedyna, aktualna lokalizacja).
  // ─────────────────────────────────────────────────────────────────────────

  // Inne miasta (stare lokalizacje / partnerzy)
  
  { from: "/rzeszow", to: "/kontakt", reason: "Stara lokalizacja Rzeszów → jedyny gabinet Wilanów" },
  { from: "/rzeszów", to: "/kontakt", reason: "Polskie znaki Rzeszów → jedyny gabinet Wilanów" },
  { from: "/warszawa", to: "/kontakt", reason: "Vanity miejscowości → strona kontaktu (Wilanów)" },
  { from: "/warszawa-centrum", to: "/kontakt", reason: "Stara lokalizacja Warszawa Centrum → Wilanów" },
  { from: "/warszawa-gieldowa", to: "/kontakt", reason: "Stara lokalizacja Giełdowa → Wilanów" },
  { from: "/warszawa-brzeska", to: "/kontakt", reason: "Stara lokalizacja Brzeska → Wilanów" },
  { from: "/fimedica", to: "/kontakt", reason: "Stary partner Fimedica → Wilanów" },
  { from: "/beauty-and-mind", to: "/kontakt", reason: "Stary partner Beauty & Mind → Wilanów" },
  { from: "/ip-cliniq", to: "/kontakt", reason: "Stary partner IP Cliniq → Wilanów" },
  { from: "/lokalizacje", to: "/kontakt", reason: "Historyczna lista lokalizacji → jedyny gabinet Wilanów" },
  { from: "/nasze-kliniki", to: "/kontakt", reason: "L.mn. „kliniki” → jedyny gabinet Wilanów" },
  { from: "/kliniki", to: "/kontakt", reason: "L.mn. „kliniki” → jedyny gabinet Wilanów" },
  { from: "/kliniki-premium", to: "/kontakt", reason: "Fraza „kliniki premium” (l.mn.) → jedyny gabinet Wilanów" },
  { from: "/klinika-premium", to: "/kontakt", reason: "Vanity „klinika premium” → strona kontaktu (Wilanów)" },
  { from: "/wilanow", to: "/kontakt", reason: "Vanity Wilanów → strona kontaktu" },
  { from: "/warszawa-wilanow", to: "/kontakt", reason: "Vanity Warszawa Wilanów → strona kontaktu" },
  { from: "/branickiego", to: "/kontakt", reason: "Vanity nazwa ulicy → strona kontaktu" },
];
