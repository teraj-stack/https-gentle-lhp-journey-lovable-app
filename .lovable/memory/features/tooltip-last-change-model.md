---
name: Tooltip Last Change — single source of truth
description: Helper buildLastChangeTooltipModel jest jedynym miejscem składania treści tooltipa „Ostatnia zmiana" — komponent czyta pola modelu, nigdy inline w JSX
type: preference
---

Cała logika tooltipa „Ostatnia zmiana" w `AutoSaveSettings.tsx` (kanały: widoczny `<TooltipContent>`, `aria-label` kontenera, `title` triggera, badge „lokalnie") MUSI czytać z helpera `buildLastChangeTooltipModel` w `src/lib/lastChangeTooltipModel.ts`.

**Why:** Wcześniej każdy kanał miał własne inline składanie stringów `Czas: ${…}` z osobnymi warunkami fallback (full date → relative label → brak linii). To rodziło rozjazdy: aria-label mówił co innego niż widoczny tooltip. Helper centralizuje wszystkie warunki (smoothTimeValue, isRelativeFallback, shouldRenderTimeLine, kwalifikator „(etykieta względna)" tylko w a11y) i jest pokryty 19 testami jednostkowymi.

**How to apply:**
- Każdy nowy kanał (PDF export, narrator SR-only, alternatywny tooltip) MUSI wołać `buildLastChangeTooltipModel({ source, fullDate, relativeLabel })` i czytać pola modelu (`content`, `ariaText`, `timeValue`, `shouldRenderTimeLine`, `timeLineForView`, `timeLineForA11y`, `timeLineHelpTitle`).
- ZAKAZANE: inline składanie `Czas: ${…}`, ręczne `??`/`||` na fullDate w JSX, duplikowanie smoothTimeValue.
- Testy: `src/lib/lastChangeTooltipModel.test.ts` (19) + `AutoSaveSettings.tooltip.test.tsx` (24) + `lastChangeTooltipContent.test.ts` (30) = 73.
