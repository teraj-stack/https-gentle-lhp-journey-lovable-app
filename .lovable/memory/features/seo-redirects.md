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

## Diagnostyka runtime (logger + ekran dev)

- **`src/lib/seo/redirectLog.ts`** — in-memory + sessionStorage logger (`logRedirectHit`, `logNotFoundHit`, `getRedirectLog`, `clearRedirectLog`, `subscribeRedirectLog`). Cap 500 wpisów, klucz `cml:seo-redirect-log:v1`. Toleruje quota/uszkodzony JSON.
- **Instrumentacja**: `SeoRedirect` woła `logRedirectHit(from, to)` synchronicznie w renderze; `pages/NotFound` woła `logNotFoundHit(pathname)` w `useEffect`. Konsola: `console.info` dla redirect, `console.warn` dla 404.
- **Ekran**: `/dev/seo-redirects` (`src/pages/DevSeoRedirects.tsx`) — 3 sekcje: mapa SEO_REDIRECTS z licznikami trafień, agregat unikalnych 404 z referrerem (przycisk „Skopiuj jako szablon SEO_REDIRECTS"), surowy log. Auto-refresh co 1s + reset. Strona nie indeksowana (meta robots noindex,nofollow).
- **Testy**: `src/lib/seo/redirectLog.test.ts` (8) — kontrakt API, FIFO, subscribe/unsub, odporność na quota i uszkodzony JSON.

## Fuzzy 404 → suggested redirect

- **`src/lib/seo/suggestRedirect.ts`** — czysty helper (no React/DOM). API: `suggestRedirect(pathname) → { to, source, score, action: "auto-redirect"|"suggest"|"none", matchedFrom }`.
- **Algorytm**: normalizacja (lowercase + NFD + strip diacritics + trim slashes) → exact match (1.0) → substring (0.85, gated minLen ≥ 3 by uniknąć kolizji `""`) → Jaccard po tokenach `/-` (×0.9) → Levenshtein znormalizowany (×0.95). Best-of.
- **Progi**: `AUTO=0.82` (`<Navigate replace>`), `SUGGEST=0.55` (sekcja „Czy chodziło Ci o…?"), poniżej → none. Remis → preferencja `redirect-map` nad `app-route`.
- **`pages/NotFound`** — odpala `suggestRedirect` w `useMemo`, loguje przez `logNotFoundHit` zawsze + `logRedirectHit` przy auto-redirect (widać w `/dev/seo-redirects` jako kandydat na nowy wpis SEO_REDIRECTS). Przy `auto-redirect` zwraca `<Navigate>` zamiast widoku 404. Przy `suggest` — pokazuje link `data-testid="suggested-link"`.
- **Testy**: `src/lib/seo/suggestRedirect.test.ts` — normalizacja, exact-match, literówki znanych aliasów, brak fałszywych pozytywów dla losowych stringów, preferencja redirect-map, kontrakt zwrotny dla wszystkich SEO_REDIRECTS (każdy alias w 100% mapuje na swój `to`).

## Admin panel — `/admin/seo-redirects`

- **Tabela DB**: `public.seo_redirects` (from_path UNIQUE, to_path, reason, is_active, created_by, timestamps). Trigger `validate_seo_redirect` (search_path=public) blokuje self-redirect i wymusza prefix `/`. RLS: public SELECT aktywnych + admin pełen CRUD via `has_role('admin'::app_role)`.
- **Hook** `src/hooks/useMergedRedirects.ts` — merge `SEO_REDIRECTS` (kod) + DB (active). DB ma pierwszeństwo per `from`, oznaczenie origin: `code` / `db` / `db-override`. `placeholderData` zwraca hardcoded mapę natychmiast (zero opóźnienia hydratacji); cache 60s.
- **Strona** `src/pages/AdminSeoRedirects.tsx` — auth gate + `useIsAdmin`. CRUD inline-form (from/to/reason/is_active), filtr substring po from/to/reason, badge origin, akcje: „Otwórz alias w nowej karcie" (test live), „Skopiuj jako kod" (gotowy template do `redirectsMap.ts`), edytuj/usuń tylko dla wpisów DB. Sekcja „Nieaktywne wpisy DB" z toggle aktywności.
- **Nawigacja**: link „SEO Redirects" w headerze `AdminDashboard` (ikona Link2).
- **Testy**: `src/hooks/useMergedRedirects.test.ts` (4) — czysty merge, DB nadpisuje kod, sortowanie, brak fałszywych origin.

## Analityka trafień — `seo_redirect_hits`

- **Tabela** `public.seo_redirect_hits` (kind: redirect/not_found/suggested, from_path, to_path, referrer, search, user_agent, session_id, created_at). Indeksy: `from_path`, `(kind, created_at DESC)`, `created_at DESC`. RLS: anon+auth INSERT (publiczna analityka, kontrolowane minimum pól), admin SELECT/DELETE.
- **Klient** `src/lib/seo/redirectLog.ts` — dwupoziomowy logger: lokalny sessionStorage (`/dev/seo-redirects`) + zdalny insert do Supabase. Deduplikacja per (sessionId, kind, from) w sessionStorage `cml:seo-redirect-remote-sent:v1` → jeden wpis na sesję per ścieżka (chroni przed StrictMode remountami). API: `logRedirectHit`, `logNotFoundHit`, `logSuggestedRedirectHit`. Best-effort — błędy zdalne tylko `console.debug`.
- **NotFound**: fuzzy-match auto-redirect loguje teraz `logSuggestedRedirectHit` (kind=suggested) zamiast `logRedirectHit` — odróżnia w analityce „literówki uratowane przez fuzzy" od „realnie zmapowanych aliasów".
- **UI** `src/components/admin/SeoRedirectAnalytics.tsx` — wstrzyknięty w `/admin/seo-redirects` między formularzem a tabelą. Tabs: 404 / Aliasy / Auto-fuzzy. TOP 20 per kategoria z hits/sessions/last_at, akcja „Map" (prefiluje formularz `from`) i „Utwardź" (prefiluje from+to z fuzzy → stały redirect). Window 30 dni, cache 60s, manual refresh.
