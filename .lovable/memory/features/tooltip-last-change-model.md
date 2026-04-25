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
- Opcjonalny parametr `format: TimeValueFormat` — STERUJE TYLKO `timeValue`/`timeLineForView`:
  - `"single-space"` (DOMYŚLNY): wszystkie whitespace → pojedyncza spacja, single-line.
  - `"compact"`: dodatkowo zwarte separatory (zero spacji przed `,`/`:`, jedna po).
  - `"preserve-newlines"`: zachowuje `\n` (kolapsuje wielokrotne) — dla wieloliniowych kanałów wizualnych (np. PDF).
- **KRYTYCZNE — kontrakt a11y:** `timeLineForA11y` (i tym samym `ariaText`) ZAWSZE używa `single-space`, NIEZALEŻNIE od `input.format`. Helper liczy `a11yTimeValue` osobno przez `smoothTimeValue(raw, "single-space")`. Dzięki temu `aria-label`/`title` NIGDY nie zawierają `\n`, `\t`, ani podwójnych spacji — nawet gdy konsument świadomie wybrał `preserve-newlines` dla widocznego tooltipa. Screen reader nie zrobi pauzy, `ariaText` nie ma pustych linii (`/\n\s*\n/`) ani osieroconych prefiksów „Czas: " bez treści.
- Opcjonalny parametr `locale: Locale | string` (PL/EN/DE/IT, default `"pl"`):
  - Akceptuje `"pl"`, `"en"`, `"de"`, `"it"` oraz BCP-47 z regionem (`"pl-PL"`, `"en-US"`, `"de-AT"`, `"it-CH"` itp.).
  - Nieznane języki → fallback `"pl"` (default operacyjny kliniki).
  - Sterowane literały per locale:
    - PL: prefiks `"Czas: "`, sourcePrefix `"Źródło: "`, qualifier `"(etykieta względna)"`.
    - EN: `"Time: "`, `"Source: "`, `"(relative label)"`.
    - DE: `"Zeit: "`, `"Quelle: "`, `"(relative Angabe)"`.
    - IT: `"Ora: "`, `"Origine: "`, `"(etichetta relativa)"`.
  - Komponent `AutoSaveSettings` używa `navigator.language` (auto-detekcja); testy jsdom mają stały `pl-PL` w `src/test/setup.ts`.
  - Tłumaczenia żyją w `TRANSLATIONS` (`lastChangeTooltipContent.ts`) i `TIME_LINE_TRANSLATIONS` (`lastChangeTooltipModel.ts`). Dodanie nowego języka = rozszerzenie typu `Locale` + dopisanie wpisów w obu mapach + dopisanie regułki w `resolveLocale` + dodanie do `SUPPORTED_LOCALES` (TS wymusi komplet w mapach; brute-force matrix w testach automatycznie iteruje po nowym locale przez `SUPPORTED_LOCALES`).
- Locale jest stosowany RAZ do wynikowych pól — niemożliwy rozjazd języków w obrębie jednego ariaText.
- **Walidacja wejścia (`validateLastChangeTooltipInput`)**: builder ZAWSZE przepuszcza wejście przez walidator defensywny zanim cokolwiek policzy. Walidator NIGDY nie rzuca, koercuje każde pole o niepoprawnym typie/wartości do bezpiecznego fallbacku (`source` poza `"remote"|"local"` → `null`/local; `fullDate`/`relativeLabel` non-string → `null`; `format` poza whitelistą → `"single-space"`; `locale` non-string → `"pl"`). Zwraca `{value, issues[]}` — issues z polami `field`/`code`/`message` (8 kodów `ValidationIssueCode`) są ignorowane przez builder (UI musi pozostać stabilny), ale dostępne dla dev-overlay/testów. Nawet `buildLastChangeTooltipModel(null)` zwraca kompletny, spójny model bez throw — `ariaText` nie zawiera „undefined", „[object Object]", „NaN", osieroconego prefiksu „Czas:" ani pustych linii.
- Testy: 1403 globalnie (z czego ~1100 w `lastChangeTooltipModel.test.ts`). Brute-force matrix `format×locale×source×fullDate×relative` automatycznie iteruje po wszystkich 4 językach (helper `assertAriaTextInvariants` zna prefiksy `"Czas: "/"Time: "/"Zeit: "/"Ora: "` i blokuje osierocone prefiksy w każdym z nich). Dedykowane bloki: `buildLastChangeTooltipModel — DE` i `— IT` (po 4 testy: remote, local override, fallback qualifier+helpTitle, BCP-47 regiony) + `composeTimeLine — DE/IT`.
