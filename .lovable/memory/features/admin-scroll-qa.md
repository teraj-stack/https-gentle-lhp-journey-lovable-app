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

**Logika scroll = identyczna jak produkcyjna** w `AdminSystemHealth.scrollRowIntoView`: `force=true`, `prefers-reduced-motion` → instant, rapid-repeat (<250ms) → instant, w przeciwnym razie smooth. Snapshot statusu update'owany po `setTimeout(450ms)` dla smooth / `50ms` dla instant żeby złapać końcową pozycję po animacji.

**Kiedy używać:** po każdej zmianie w `computeRowScrollTarget` lub `scrollRowIntoView`, zwłaszcza przy regresji "wiersz schowany pod headerem". Jeśli ❌ pojawi się dla GÓRA #1 lub DÓŁ #100 → helper się popsuł.

Route: `/admin/scroll-test` (poza Layout, własny `<Header />` z `pt-[var(--header-height)]`). Brak linku z `AdminDashboard` — strona internal-tooling, bez SEO.
