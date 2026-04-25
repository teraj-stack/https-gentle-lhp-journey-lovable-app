---
name: Tooltip Last Change — single source of truth
description: Helper buildLastChangeTooltipModel jest jedynym miejscem składania treści tooltipa „Ostatnia zmiana" — komponent czyta pola modelu, nigdy inline w JSX. Opcja `format` (TimeValueFormat) sterująca wygładzaniem wartości czasu jest stosowana JEDNOLICIE do view i a11y.
type: preference
---

Cała logika tooltipa „Ostatnia zmiana" w `AutoSaveSettings.tsx` (kanały: widoczny `<TooltipContent>`, `aria-label` kontenera, `title` triggera, badge „lokalnie") MUSI czytać z helpera `buildLastChangeTooltipModel` w `src/lib/lastChangeTooltipModel.ts`.

**Why:** Wcześniej każdy kanał miał własne inline składanie stringów `Czas: ${…}` z osobnymi warunkami fallback (full date → relative label → brak linii). To rodziło rozjazdy: aria-label mówił co innego niż widoczny tooltip. Helper centralizuje wszystkie warunki (smoothTimeValue, isRelativeFallback, shouldRenderTimeLine, kwalifikator „(etykieta względna)" tylko w a11y) i jest pokryty 76 testami jednostkowymi.

**How to apply:**
- Każdy nowy kanał (PDF export, narrator SR-only, alternatywny tooltip) MUSI wołać `buildLastChangeTooltipModel({ source, fullDate, relativeLabel, format? })` i czytać pola modelu (`content`, `ariaText`, `timeValue`, `shouldRenderTimeLine`, `timeLineForView`, `timeLineForA11y`, `timeLineHelpTitle`).
- ZAKAZANE: inline składanie `Czas: ${…}`, ręczne `??`/`||` na fullDate w JSX, duplikowanie smoothTimeValue.
- Opcjonalny parametr `format: TimeValueFormat`:
  - `"single-space"` (DOMYŚLNY, kompatybilność wsteczna): wszystkie whitespace → pojedyncza spacja, single-line, bezpieczny dla aria-label.
  - `"compact"`: dodatkowo zwarte separatory (zero spacji przed `,`/`:`, jedna po).
  - `"preserve-newlines"`: zachowuje `\n` (kolapsuje wielokrotne, kompresuje spacje w linii) — TYLKO dla wieloliniowych kanałów wizualnych (np. PDF), NIE dla a11y.
- Tryb format jest stosowany RAZ do `timeValue`, więc widoczny tooltip i aria-label/title dostają DOKŁADNIE tę samą wygładzoną wartość — niemożliwy rozjazd między kanałami.
- Testy: `src/lib/lastChangeTooltipModel.test.ts` (76) + `AutoSaveSettings.tooltip.test.tsx` (57) + `lastChangeTooltipContent.test.ts` (30) = 163.
