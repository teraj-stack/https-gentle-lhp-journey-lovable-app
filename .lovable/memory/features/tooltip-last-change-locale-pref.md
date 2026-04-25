---
name: Tooltip locale preference — persisted PL/EN selector
description: Selektor języka tooltipa „Ostatnia zmiana" (PL/EN) w `AutoSaveSettings.tsx` — persystowany w localStorage przez `useLocalePreference`, sync cross-tab przez storage event + custom event w tej samej karcie.
type: feature
---

Persystowana preferencja języka tooltipa „Ostatnia zmiana" w panelu auto-zapisu.

**Hook:** `src/hooks/useLocalePreference.ts` — `useLocalePreference(): [Locale, (next) => void]`.
- localStorage key: `cml.tooltip-locale` (eksport `LOCALE_STORAGE_KEY`).
- Custom event same-tab: `cml-locale-changed` (eksport `LOCALE_CHANGE_EVENT`) — bo `storage` event NIE odpala się w karcie-źródle.
- Priorytet odczytu: localStorage (po whiteliście `SUPPORTED_LOCALES`) > `navigator.language` (przez `resolveLocale`) > `"pl"`.
- Setter: każde wejście przechodzi przez `resolveLocale` — `"klingon"` → `"pl"`, `"en-GB"` → `"en"`. Do localStorage trafia TYLKO zwalidowany primary tag.
- SSR-safe: brak `window`/`localStorage`/`navigator` → bezpieczny default `"pl"`, brak throw.

**UI:** `src/components/hemoroidy/AutoSaveSettings.tsx`.
- Segmented switcher (PL/EN) w bloku ustawień obok format-czasu i widoczności-etykiety, w tej samej stylistyce (`role=radiogroup` + `aria-checked`, `text-[10px] font-sans font-medium`, `bg-primary/20` dla aktywnego).
- Zmiana wyzwala toast 1.8s („Język: PL/EN" + hint).
- `tooltipModel` w głównym tooltipie czyta `locale: tooltipLocale` zamiast `navigator.language` — dzięki temu wybór użytkownika jest natychmiast respektowany (PL prefiks „Czas:" / „Źródło:" vs EN „Time:" / „Source:").
- Switcher renderowany tylko gdy istnieje `lastSyncLabel` (bez treści tooltipa nie ma czego przełączać).

**Testy:** `src/hooks/useLocalePreference.test.ts` (12) — priorytet źródeł, walidacja whitelisty, sync między instancjami same-tab, storage event z innej karty, ignorowanie zdarzeń dla innych kluczy, kontrakt nazw stałych. Razem z istniejącym suite tooltipa: 1415 testów globalnie.

**Why:** Wcześniej locale był wyliczany przy każdym renderze z `navigator.language` — pacjent z PL UA miał zawsze PL, EN UA zawsze EN, bez możliwości zmiany. Persystowana preferencja: (1) pozwala wybrać język niezależnie od systemu, (2) przeżywa F5/zamknięcie karty, (3) synchronizuje się między kartami (parytet z UX `useAutoSave`/`useTimeFormatPreference`).

**How to apply:** Każde nowe miejsce w UI używające `buildLastChangeTooltipModel` powinno czytać `locale` z `useLocalePreference()` zamiast z `navigator.language`. Auto-detekcja `navigator.language` zostaje wewnątrz hooka jako fallback przy pierwszym wejściu.
