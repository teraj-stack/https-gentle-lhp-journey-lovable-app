---
name: Tooltip Last Change — single source of truth
description: Helper buildLastChangeTooltipModel jest jedynym miejscem składania treści tooltipa „Ostatnia zmiana" — komponent czyta pola modelu, nigdy inline w JSX. Opcje `format` (TimeValueFormat) i `locale` (PL/EN, default PL) są stosowane JEDNOLICIE do view i a11y.
type: preference
---

Cała logika tooltipa „Ostatnia zmiana" w `AutoSaveSettings.tsx` (kanały: widoczny `<TooltipContent>`, `aria-label` kontenera, `title` triggera, badge „lokalnie") MUSI czytać z helpera `buildLastChangeTooltipModel` w `src/lib/lastChangeTooltipModel.ts`.

**Why:** Wcześniej każdy kanał miał własne inline składanie stringów `Czas: ${…}` z osobnymi warunkami fallback (full date → relative label → brak linii). To rodziło rozjazdy: aria-label mówił co innego niż widoczny tooltip. Helper centralizuje wszystkie warunki (smoothTimeValue, isRelativeFallback, shouldRenderTimeLine, kwalifikator „(etykieta względna)" tylko w a11y) i jest pokryty 129 testami jednostkowymi.

**How to apply:**
- Każdy nowy kanał (PDF export, narrator SR-only, alternatywny tooltip) MUSI wołać `buildLastChangeTooltipModel({ source, fullDate, relativeLabel, format?, locale? })` i czytać pola modelu (`content`, `ariaText`, `timeValue`, `shouldRenderTimeLine`, `timeLineForView`, `timeLineForA11y`, `timeLineHelpTitle`).
- ZAKAZANE: inline składanie `Czas: ${…}`/`Time: ${…}`, ręczne `??`/`||` na fullDate w JSX, duplikowanie smoothTimeValue, hard-codowanie literałów EN/PL w komponencie.
- Opcjonalny parametr `format: TimeValueFormat`:
  - `"single-space"` (DOMYŚLNY): wszystkie whitespace → pojedyncza spacja, single-line, bezpieczny dla aria-label.
  - `"compact"`: dodatkowo zwarte separatory (zero spacji przed `,`/`:`, jedna po).
  - `"preserve-newlines"`: zachowuje `\n` (kolapsuje wielokrotne) — TYLKO dla wieloliniowych kanałów wizualnych (np. PDF), NIE dla a11y.
- Opcjonalny parametr `locale: Locale | string` (PL/EN, default `"pl"`):
  - Akceptuje `"pl"`, `"en"` oraz BCP-47 z regionem (`"pl-PL"`, `"en-US"`, `"en-GB"`).
  - Nieznane języki → fallback `"pl"` (default operacyjny kliniki).
  - Sterowane literały: prefiks linii czasu (`"Czas: "` / `"Time: "`), sufiks fallbacku (`"(etykieta względna)"` / `"(relative label)"`), helpTitle, nagłówek/opis źródła.
  - Komponent `AutoSaveSettings` używa `navigator.language` (auto-detekcja); testy jsdom mają stały `pl-PL` w `src/test/setup.ts`.
  - Tłumaczenia żyją w `TRANSLATIONS` (`lastChangeTooltipContent.ts`) i `TIME_LINE_TRANSLATIONS` (`lastChangeTooltipModel.ts`). Dodanie nowego języka = rozszerzenie typu `Locale` + dopisanie wpisów w obu mapach (TS wymusi komplet).
- Tryby `format` i `locale` są stosowane RAZ do wynikowych pól, więc widoczny tooltip i aria-label/title dostają DOKŁADNIE tę samą wygładzoną i przetłumaczoną wartość — niemożliwy rozjazd między kanałami ani języków w obrębie jednego ariaText.
- Testy: `src/lib/lastChangeTooltipModel.test.ts` (129) + `AutoSaveSettings.tooltip.test.tsx` (57) + `lastChangeTooltipContent.test.ts` (30) = 216.
