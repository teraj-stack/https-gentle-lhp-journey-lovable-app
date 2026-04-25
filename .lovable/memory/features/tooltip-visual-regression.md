---
name: Tooltip Last Change — wizualna regresja (Playwright)
description: Strona dev-only /dev/tooltip-preview renderuje 6 statycznych wariantów tooltipa „Ostatnia zmiana" (replika popovera, BEZ Radix portal); spec tests/visual/tooltip-last-change.spec.ts robi toHaveScreenshot per kafelek z maxDiffPixelRatio 0.01.
type: feature
---

Wizualna regresja tooltipa „Ostatnia zmiana" na 6 kluczowych wariantach.

**Architektura:**
- Strona `/dev/tooltip-preview` (`src/pages/DevTooltipPreview.tsx`) renderuje siatkę 3x2 kafelków, każdy z `data-testid=tooltip-variant-{slug}` i `data-testid=tooltip-content-{slug}`.
- Każdy kafelek czyta model z `buildLastChangeTooltipModel` (single source of truth) i wyświetla statyczną replikę `<TooltipContent>` z klasami SKOPIOWANYMI 1:1 z `src/components/ui/tooltip.tsx` (poza animacjami).
- Spec `tests/visual/tooltip-last-change.spec.ts` używa `playwright-fixture.ts` + `toHaveScreenshot` z `maxDiffPixelRatio: 0.01`, viewport 1280x720, `animations: "disabled"`, czeka na `document.fonts.ready`.

**6 wariantów (uzgodnione, zaślepkowe daty deterministyczne):**
1. `remote-full-pl` — happy path zdalny.
2. `local-full-pl` — happy path lokalny.
3. `remote-relative-pl` — fallback na etykietę względną (sufiks „(etykieta względna)").
4. `no-data-pl` — 2-liniowy bez „Czas:" (regresja na osierocony prefiks).
5. `remote-full-en` — parytet EN („Time:" + opis EN).
6. `preserve-newlines-pl` — wieloliniowa wartość czasu (regresja na łamanie linii).

**Dlaczego replika popovera, NIE Radix Tooltip:**
Radix renderuje `<TooltipContent>` przez Portal do `document.body` — `tile.screenshot()` NIE złapałby treści. Dodatkowo animacje fade-in + zoom-in destabilizują pierwszy frame. Replika gwarantuje deterministyczny snapshot kafelka i testuje sam **model** (kontrakt buildLastChangeTooltipModel), a NIE Radix portal/animacje (pokryte własnymi testami biblioteki).

**Aktualizacja baseline po świadomej zmianie:**
```
npx playwright test tests/visual/tooltip-last-change.spec.ts --update-snapshots
```

**Strona jest dev-only** — zarejestrowana w `App.tsx` jako `/dev/tooltip-preview`, NIE w menu/sitemapie. Lekka (bez Layout/Header/Footer) dla minimalizacji flaky.
