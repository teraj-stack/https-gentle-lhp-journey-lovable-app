---
name: Procedure Search & Filters (Hub Pages)
description: Reusable wyszukiwarka + chip-filtry kategorii dla hubów Proktologia/Flebologia
type: feature
---

Reusable komponent `src/components/shared/ProcedureSearch.tsx` używany w hubach `/leczenie/proktologia` i `/leczenie/flebologia` (zastępuje statyczny grid kart).

## Mechanika
- **Search input** — pełnotekstowo po `title + description + keywords + categories`. Accent-insensitive: `foldText()` używa NFD + manualnie mapuje `ł→l` (NFD nie rozkłada `ł`).
- **Chip filters** — multi-select OR po `categories[]`. Kliknięcie chipa toggluje. Aktywne = `bg-primary text-primary-foreground`.
- **Status live region** — `aria-live="polite"` z `Znaleziono X z Y zabiegów`.
- **Empty state** — gdy 0 wyników, pokazuje karta z „Wyczyść filtry".
- **Animacje** — `AnimatePresence mode="popLayout"` + `layout` na kartach (smooth reorder przy filtrowaniu).
- **Stan lokalny** — świadomie NIE w URL (huby to strony eksploracyjne, nie deep-linki do filtra).

## Kontrakt `ProcedureItem`
```ts
{ title, description, href, icon, tag?, categories: string[], keywords?: string[] }
```

## Kategorie (utrzymane w sync z brand'em medycznym)
- **Proktologia**: Hemoroidy, Przetoki, Torbiel pilonidalna, Szczelina, Estetyka, Stany zapalne, Ból przewlekły, Diagnostyka, Laser, Botoks, Bez szwów, Oszczędzający zwieracz, Ambulatoryjnie.
- **Flebologia**: Żylaki, Pajączki, Iniekcje, Laser, Hybrydowo, Estetyka, Bez blizn, Bez szwów, Ambulatoryjnie, Regeneracja, Wsparcie pozabiegowe.

Kolejność chipów = kolejność pierwszego wystąpienia w `procedures[]` (deterministyczna deduplikacja).
