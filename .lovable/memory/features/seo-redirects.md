---
name: SEO Redirects Infrastructure
description: SEO_REDIRECTS map + SeoRedirect (Navigate replace + canonical + meta refresh + noindex), auto-routes w App.tsx; substytut 301 dla Lovable hostingu, z testami integralności
type: feature
---

## Stan

Lovable hosting NIE wspiera _redirects/netlify.toml/vercel.json — prawdziwe HTTP 301 z infry niemożliwe. Substytut SEO-friendly:

**Trzy warstwy w `<SeoRedirect to>`** (`src/components/seo/SeoRedirect.tsx`):
1. `<Navigate replace>` — instant client-side, nie zaśmieca history.
2. `<link rel="canonical" href="{absolute target}">` — konsoliduje sygnał dla Google.
3. `<meta http-equiv="refresh" content="0;url={target}">` — fallback dla botów bez JS.
4. `<meta name="robots" content="noindex, follow">` na starej ścieżce.

## Jak dodać redirect

Edytuj `src/lib/seo/redirectsMap.ts`:
```ts
export const SEO_REDIRECTS: SeoRedirectEntry[] = [
  { from: "/stary-adres", to: "/nowy-adres", reason: "Powód zmiany" },
];
```
App.tsx automatycznie generuje `<Route>` per wpis (wewnątrz `<Route element={<Layout />}>`).

## Aktualne wpisy

- **Faza 1 (Vanity URLs)**: 6 krótkich aliasów do druku/Ads (`/hemoroidy`, `/pajaczki`, `/zylaki`, `/przetoka`, `/torbiel`, `/ginekomastia`).
- **Faza 2 (Aliasy literówek)**: ~30 wariantów pisowni z polskimi znakami, l.poj./mn., synonimów potocznych i medycznych, oraz starych aliasów `/leczenie/{problem}` jako fallback gdyby Cloudflare Bulk Redirects nie zadziałał.

## Cloudflare (planowane)

Domena `cml.pl` ma być przepięta za Cloudflare → Bulk Redirects dla prawdziwych HTTP 301. Mapa w kodzie zostaje jako fallback.

## Testy (`src/lib/seo/redirectsMap.test.ts`)

CI guard chroni przed regresją po zmianach w menu/route'ach. Parsuje `App.tsx` regexem `<Route path="...">` i sprawdza:
1. **Higiena**: format wpisów (slash początkowy, brak spacji/trailing slash, niepusty `reason`).
2. **Brak konfliktów**: brak duplikatów `from`, brak self-redirect (`from===to`), brak cykli A→B+B→A, brak łańcuchów A→B→C.
3. **Integralność z routerem**: każdy `to` pasuje do realnego route w App.tsx (wspiera parametry typu `:slug`).
4. **Kolizje from**: żaden `from` nie pokrywa się z realnym route (z wyjątkiem tych wstrzykiwanych przez samą mapę).

Uruchamianie: `bunx vitest run src/lib/seo/redirectsMap.test.ts` (93 testy, ~20ms).
