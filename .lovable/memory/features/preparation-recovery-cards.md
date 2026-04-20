---
name: Preparation & Recovery Cards
description: Reużywalny komponent z 2 kartami (Przed/Po zabiegu) wpięty na 8 stronach zabiegów przed RecoveryBoostBanner
type: feature
---

Sekcja "Przygotowanie i zalecenia" — komponent `src/components/shared/PreparationRecoveryCards.tsx` z h2 + 2 karty side-by-side (md:grid-cols-2) z ikoną (ClipboardCheck / HeartPulse), tytułem, krótkim opisem (1-2 zdania) i CTA `Zobacz checklistę`.

Wpięte na 8 stronach zabiegów przed `<RecoveryBoostBanner />`: LHP, EVLT, FiLaC, SiLaC, CLaCS, Skleroterapia, Mikroflebektomia, Plastyka.

Strony Przygotowanie* (8): `/dla-pacjenta/przygotowanie-{lhp,evlt,filac,silac,clacs,skleroterapia,mikroflebektomia,plastyka}`. Nowe 6 stron używają reużywalnego szablonu `src/components/shared/PreparationPageTemplate.tsx` (sekcje z ikonami CalendarDays/Clock/Shirt + lista checklistowa + cross-link do Zalecenia* + CTA telefon/mail). LHP i EVLT zachowują własne, bardziej rozbudowane strony.

Wszystkie ścieżki dodane do `BREADCRUMBS_MAP` w `src/lib/breadcrumbsMap.ts` pod hubem Wiedza › Dla Pacjenta. Zalecenia po zabiegu pozostają niezależnymi stronami z własnymi breadcrumbs (Zabieg › Hub › Procedura › Zalecenia).
