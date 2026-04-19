---
name: Footer Navigation
description: Stopka 5-kolumnowa zsynchronizowana z nawigacją Problem / Zabieg / Wiedza + Klinika
type: feature
---

Stopka (`src/components/layout/Footer.tsx`) odzwierciedla strukturę głównego menu (Problem → Zabieg → Wiedza). Układ 5 kolumn (lg):

1. **Brand/CML** — logo, opis, social, premium-divider, sekundarne linki (O nas, Współpraca B2B, Cennik, Kontakt).
2. **Problem** — lista 10 schorzeń (hemoroidy, szczelina, przetoka, torbiel, ból odbytu, spazm, fałdy, żylaki, pajączki, ginekomastia) — linkują do najbardziej trafnej strony (zabieg lub edukacja).
3. **Zabieg** — 3 pod-bloki: Proktologia (LHP/FiLaC/SiLaC/Plastyka), Flebologia (EVLT/Skleroterapia/Mikroflebektomia/CLaCS), Ginekomastia (3 podtypy). Nagłówki pod-bloków linkują do hubów.
4. **Wiedza** — 3 pod-bloki: Edukacja, Przed wizytą, Materiały (Blog, e-book, infografika). Pomija "Zalecenia po zabiegu" — zgodnie z header (kontekstowa nawigacja).
5. **Klinika** — 4 lokalizacje (Wilanów, Fimedica, Siedlce, Rzeszów) w skróconej formie: nazwa + adres + telefon (jeśli jest). Pełne dane (godziny, e-maile) tylko na `/kontakt`.

Nagłówki kolumn w kolorze `text-primary` (gold) uppercase. Sub-nagłówki `text-foreground/80`. Zalecenia po zabiegach świadomie pominięte — dostępne wyłącznie ze stron zabiegów.
