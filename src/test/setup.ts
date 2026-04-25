import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Domyślny język w testach jsdom = polski.
// Zapewnia stabilność testów integracyjnych komponentów (np. tooltip
// „Ostatnia zmiana"), które asercjonują na polskie literały. Testy i18n,
// które chcą sprawdzić warianty EN, nadpisują `navigator.language` lokalnie.
Object.defineProperty(window.navigator, "language", {
  configurable: true,
  get: () => "pl-PL",
});
Object.defineProperty(window.navigator, "languages", {
  configurable: true,
  get: () => ["pl-PL", "pl"],
});

