---
name: Header Navigation
description: Główna nawigacja oparta o rolę pacjenta — Problem → Zabieg → Wiedza, mega-menu wielokolumnowe
type: feature
---

Główna nawigacja w `src/components/layout/Header.tsx` opiera się o **klucz roli pacjenta**: Problem → Zabieg → Wiedza. Pozycje główne (7): **O nas | Problem | Zabieg | Wiedza | Współpraca | Cennik | Kontakt**.

- **Problem** — pojedyncza kolumna (dropdown 320px) z objawami/schorzeniami: hemoroidy, żylaki, pajączki, szczelina, przetoka, torbiel, fałdy, ból odbytu, ginekomastia. Każdy item ma `desc`.
- **Zabieg** — mega-menu 3-kolumnowe (Proktologia / Flebologia / Ginekomastia), wycentrowane pod buttonem. Tylko etykiety zabiegów, bez `desc`.
- **Wiedza** — mega-menu 3-kolumnowe (Edukacja / Przed wizytą / Materiały). "Materiały" obejmuje Blog, e-book, infografiki.
- **Zalecenia po zabiegu** świadomie **wykluczone** z menu — dostępne wyłącznie z odpowiednich stron zabiegów (nawigacja kontekstowa).
- **Ginekomastia** ujęta w dropdown "Zabieg" jako trzecia kolumna (nie jako osobna pozycja w nav).
- **Mobile**: jedno akordeonowe menu z nagłówkami sekcji `Problem`, `Zabieg · Proktologia`, `Zabieg · Flebologia`, `Zabieg · Ginekomastia`, `Wiedza · Edukacja`, itd.
- Komponenty wewnętrzne: `SingleDropdown` (1 kolumna z desc) i `MegaDropdown` (N kolumn, grid auto). Hover-enter, click-out lock 2s przez `megaLockedUntil`, `navKey` resetuje state po nawigacji.
- CSS var `--header-height` publikowany przez ResizeObserver — single source of truth dla `useScrollToHash` i klas `scroll-mt-[var(--header-height)]`.
