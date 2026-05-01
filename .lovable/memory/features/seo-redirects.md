---
name: SEO Redirects Infrastructure
description: Centralna mapa SEO_REDIRECTS w src/lib/seo/redirectsMap.ts + komponent SeoRedirect (Navigate replace + canonical + meta refresh + noindex) auto-renderowany z App.tsx
type: feature
---

## Stan

Lovable hosting NIE wspiera _redirects/netlify.toml/vercel.json — prawdziwe HTTP 301 z infry niemożliwe. Substytut SEO-friendly:

**Trzy warstwy w `<SeoRedirect to>`** (`src/components/seo/SeoRedirect.tsx`):
1. `<Navigate replace>` — instant client-side, nie zaśmieca history (back button OK).
2. `<link rel="canonical" href="{absolute target}">` — konsoliduje sygnał dla Google.
3. `<meta http-equiv="refresh" content="0;url={target}">` — fallback dla botów bez JS (Google traktuje 0s meta refresh jako permanent).
4. `<meta name="robots" content="noindex, follow">` na starej ścieżce — chcemy żeby indeksowany był tylko cel.

Wszystko sprzątane na unmount, canonical przywracany do poprzedniej wartości.

## Jak dodać redirect

Edytuj `src/lib/seo/redirectsMap.ts`:
```ts
export const SEO_REDIRECTS: SeoRedirectEntry[] = [
  { from: "/stary-adres", to: "/nowy-adres", reason: "Powód zmiany" },
];
```

App.tsx automatycznie wygeneruje `<Route>` per wpis (mapowanie wewnątrz bloku `<Route element={<Layout />}>`, więc header/footer się renderują).

## Stan na moment utworzenia

Lista `SEO_REDIRECTS` jest **pusta**. Restruktura menu (huby Proktologia/Flebologia, dropdown Klinika, schowanie mniej popularnych pozycji do hubów) NIE usunęła żadnych URL-i — wszystkie strony żyją pod oryginalnymi adresami i odpowiadają 200 OK. Redirecty są niepotrzebne, dopóki nie usuniesz/zmienisz fizycznej ścieżki w `App.tsx`.
