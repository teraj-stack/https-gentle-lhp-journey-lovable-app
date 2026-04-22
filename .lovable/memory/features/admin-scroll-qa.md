---
name: Admin Scroll QA Page
description: Strona /admin/scroll-test do ręcznej regresji scrollRowIntoView pod sticky headerem — 100 wierszy, Next/Prev + J/K, live status czy aktywny wiersz w safe-area
type: feature
---

Strona `/admin/scroll-test` (`src/pages/AdminScrollTest.tsx`, admin-only przez `useIsAdmin`) służy do ręcznej regresji `computeRowScrollTarget` z `src/lib/scrollHelpers.ts` (helper używany w `AdminSystemHealth.tsx` do skoków Next/Prev w tabeli "Top retry sources").

**Co testuje:**
- 100 wierszy (oznaczone GÓRA #1, ŚRODEK #50, DÓŁ #100) — łatwa weryfikacja krawędziowych pozycji
- Pasek Next/Prev na dole (sticky) + klawisze `J`/`K`/`↓`/`↑`
- Quick-jump buttons: GÓRA #1, GÓRA #3, ŚRODEK, DÓŁ #98, DÓŁ #100
- **Live status badge** (✅ W safe-area / ❌ ZASŁONIĘTY przez header / ❌ Pod dolną krawędzią) liczony na każdy scroll/resize event — pokazuje aktualny `rect.top/bottom` aktywnego wiersza vs `safeAreaTop/safeAreaBottom`
- **Wizualny overlay safe-area** (toggle Eye/EyeOff) — przerywany prostokąt w kolorze primary między dolną krawędzią headera (`headerH + 16`) a dnem viewportu (`innerHeight - 24`); user widzi gdzie wiersz powinien wylądować
- **Debug panel** (toggle Bug, button "Debug ON/OFF") — sticky overlay nad nawigatorem (max-h 40vh, scroll), pokazuje:
  - Aktualne `--header-height` (live z CSS var)
  - Log ostatnich 10 skoków (FIFO, najnowszy na górze podświetlony primary): `from→to`, trigger (`next`/`prev`/`quick`/`key-j`/`key-k`), `behavior` (smooth/auto), `reason` (default/reduced-motion/rapid-repeat), `Δt` od poprzedniego skoku, `headerH`/`vh`/`scrollY`/`rectTop`/`rowH`/`targetY`, **offset** (delta scrollY = `targetY - scrollYBefore`, kolorowany: + primary, − destructive)
  - Przycisk "Wyczyść log"
  - Pozwala diagnozować dlaczego konkretny skok dostał `auto` zamiast `smooth` (rapid-repeat <250ms vs system reduced-motion) i czy offset zgadza się z oczekiwaniami

**Logika scroll = identyczna jak produkcyjna** w `AdminSystemHealth.scrollRowIntoView`: `force=true`, `prefers-reduced-motion` → instant, rapid-repeat (<250ms) → instant, w przeciwnym razie smooth. Snapshot statusu update'owany po `setTimeout(450ms)` dla smooth / `50ms` dla instant żeby złapać końcową pozycję po animacji.

**Reactive header height**: strona używa hooka `useHeaderHeight` (`src/hooks/useHeaderHeight.ts`) — `MutationObserver` na `documentElement.style` łapie każde `setProperty("--header-height", ...)` z `Header.tsx` (mega-menu open/close, mobile menu toggle, breakpoint change, orientation change). Snapshot bezpiecznej strefy + status badge re-liczone natychmiast (w deps `useEffect`), bez czekania na scroll/resize. Fallback: 80px gdy CSS var brak (np. przed mountem `<Header>`).

**Kiedy używać:** po każdej zmianie w `computeRowScrollTarget` lub `scrollRowIntoView`, zwłaszcza przy regresji "wiersz schowany pod headerem". Jeśli ❌ pojawi się dla GÓRA #1 lub DÓŁ #100 → helper się popsuł. Debug panel pomaga zobaczyć **dlaczego** (np. headerH=0 → CSS var nie ustawiony, lub offset=+0 → helper zwrócił obecny scrollY). Manualny test reactive: otwórz mega-menu w headerze → `--header-height` rośnie → overlay safe-area i wartość w debug panelu odświeżają się natychmiast.

Route: `/admin/scroll-test` (poza Layout, własny `<Header />` z `pt-[var(--header-height)]`). Brak linku z `AdminDashboard` — strona internal-tooling, bez SEO.

**Hook `useHeaderHeight(fallback=80)`** — reużywalny: każdy komponent który potrzebuje reactive subscription do `--header-height` (np. floating action button który ma się chować pod sticky headerem) może użyć tego samego hooka zamiast czytać CSS var inline w handlerach.
