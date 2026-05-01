---
name: SEO Redirects Infrastructure
description: SEO_REDIRECTS map + wzmocniony SeoRedirect (defense-in-depth: canonical+refresh+noindex×3+og/twitter URL), synchroniczna emisja w renderze, auto-routes w App.tsx; substytut 301 dla Lovable hostingu z testami runtime
type: feature
---

## Stan

Lovable hosting NIE wspiera _redirects/netlify.toml/vercel.json — prawdziwe HTTP 301 niemożliwe. Substytut SEO-friendly w `src/components/seo/SeoRedirect.tsx`.

## Defense-in-depth (7 warstw)

1. **Synchroniczna emisja w renderze** (NIE useEffect) — tagi w <head> ZANIM `<Navigate>` unmountuje komponent. Kluczowe: useEffect odpalał się za późno → tagi nigdy nie trafiały do DOM.
2. **Canonical** `<link rel="canonical">` na absolute URL celu.
3. **Meta refresh 0s** — Google traktuje jako permanent redirect, fallback dla botów bez JS.
4. **Noindex × 3**: `robots`, `googlebot`, `bingbot` z `noindex, follow, noarchive`.
5. **Open Graph + Twitter URL** → cel (social media pokazują kanoniczny URL).
6. **Self-redirect guard** — jeśli `from === to`, no-op + `console.warn`.
7. **`<Navigate replace>`** — instant, nie zaśmieca history.

**BEZ useEffect cleanup** — po Navigate cel ma własny SeoHead nadpisujący tagi przez selector. Próba cleanup zbiegała się z unmount-by-Navigate i usuwała tagi przed nadpisaniem. Tagi oznaczone `data-seo-redirect="created"` dla debug.

## Mapa redirectów (`src/lib/seo/redirectsMap.ts`)

- **Faza 1 (Vanity)**: 6 krótkich aliasów (`/hemoroidy`, `/pajaczki`, `/zylaki`, `/przetoka`, `/torbiel`, `/ginekomastia`).
- **Faza 2 (Literówki)**: ~30 wariantów pisowni, polskich znaków, l.poj./mn., synonimów potocznych/medycznych.
- **Faza 3 (TEMPLATE)**: ~25 zakomentowanych przykładów vanity kliniki + slot `MOJE STARE ADRESY` z TODO dla wpisów z GSC.

## Cloudflare (planowane)

Domena `cml.pl` ma być za Cloudflare → Bulk Redirects dla prawdziwych HTTP 301. Mapa w kodzie zostaje jako fallback.

## Sitemap & robots

- `public/sitemap.xml` — wyłącznie kanoniczne URL-e (~50 stron). Aliasy z mapy NIE w sitemap.
- `public/robots.txt` — `Disallow:` dla `/admin/`, `/dev/`, `/booking-action`, `/unsubscribe`, `/reminder-opt-out` + jawne `Disallow:` per alias dla Googlebota (crawl budget).

## Testy (155, ~3.5s)

- `src/lib/seo/redirectsMap.test.ts` (93) — higiena, brak duplikatów/cykli/łańcuchów, integralność `to` z route'ami w App.tsx, brak kolizji `from`.
- `src/lib/seo/redirectsRuntime.test.tsx` (45) — sparametryzowane: każde wejście z mapy renderuje SeoRedirect i `Navigate` na `to` zamiast 404.
- `src/lib/seo/sitemapRobots.test.ts` (6) — sitemap nie wycieka aliasów ani admin/dev, robots blokuje co trzeba.
- `src/components/seo/SeoRedirect.test.tsx` (11) — DOM: canonical, refresh, noindex×3, og/twitter URL, idempotency re-mount, self-redirect guard, absolute URL passthrough, marker `data-seo-redirect`.
