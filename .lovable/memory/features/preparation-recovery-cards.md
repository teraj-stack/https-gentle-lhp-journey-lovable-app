---
name: Preparation & Recovery Cards
description: Reużywalny komponent z 2 kartami (Przed/Po zabiegu) wpięty na 8 stronach zabiegów przed RecoveryBoostBanner
type: feature
---

Sekcja "Przygotowanie i zalecenia" — komponent `src/components/shared/PreparationRecoveryCards.tsx` z h2 + 2 karty side-by-side (md:grid-cols-2). Karty: glass-card + złoty tytuł `text-primary`, hover gold-tinted radial gradient + złoty shadow + border 20→50%, ikona (ClipboardCheck / HeartPulse), opis 1-2 zdania, CTA `Zobacz pełną checklistę`.

Warianty:
- `variant="default"` (domyślny) — sam opis + CTA. Używany na 7 stronach zabiegów.
- `variant="rich"` — opis + preview-lista 3 punktów (komponent `<PreviewList>` z `Check` w złotym kółku). Wymaga propsów `preparationPreviewItems: string[]` oraz `recoveryPreviewItems: string[]`. Używany przykładowo na EVLT (nawodnienie / brak golenia / lekki posiłek + pończocha / spacer / USG kontrolne).

Wpięte na 8 stronach zabiegów przed `<RecoveryBoostBanner />`: LHP, EVLT (rich), FiLaC, SiLaC, CLaCS, Skleroterapia, Mikroflebektomia, Plastyka.

Strony Przygotowanie* (8): `/dla-pacjenta/przygotowanie-{lhp,evlt,filac,silac,clacs,skleroterapia,mikroflebektomia,plastyka}`. Nowe 6 stron używają reużywalnego szablonu `src/components/shared/PreparationPageTemplate.tsx` (sekcje z ikonami CalendarDays/Clock/Shirt + lista checklistowa + cross-link do Zalecenia* + CTA telefon/mail). LHP i EVLT zachowują własne, bardziej rozbudowane strony.

Wszystkie ścieżki dodane do `BREADCRUMBS_MAP` w `src/lib/breadcrumbsMap.ts` pod hubem Wiedza › Dla Pacjenta. Zalecenia po zabiegu pozostają niezależnymi stronami z własnymi breadcrumbs (Zabieg › Hub › Procedura › Zalecenia).
