---
name: Preparation & Recovery Cards
description: Reużywalny komponent z 2 kartami (Przed/Po zabiegu) wpięty na 12 stronach zabiegów przed RecoveryBoostBanner — wraz z 12 stronami Przygotowanie* (8 phlebo/proct + 4 ginekomastia)
type: feature
---

Sekcja "Przygotowanie i zalecenia" — komponent `src/components/shared/PreparationRecoveryCards.tsx` z h2 + 2 karty side-by-side (md:grid-cols-2). Karty: glass-card + złoty tytuł `text-primary`, hover gold-tinted radial gradient + złoty shadow + border 20→50%, ikona (ClipboardCheck / HeartPulse), opis 1-2 zdania, CTA `Zobacz pełną checklistę`.

Warianty:
- `variant="default"` (domyślny) — sam opis + CTA. Używany na 7 stronach zabiegów.
- `variant="rich"` — opis + preview-lista 3 punktów (komponent `<PreviewList>` z `Check` w złotym kółku). Wymaga propsów `preparationPreviewItems: string[]` oraz `recoveryPreviewItems: string[]`. Używany przykładowo na EVLT (nawodnienie / brak golenia / lekki posiłek + pończocha / spacer / USG kontrolne).

Wpięte na 12 stronach zabiegów przed `<RecoveryBoostBanner />`: LHP, EVLT (rich), FiLaC, SiLaC, CLaCS, Skleroterapia, Mikroflebektomia, Plastyka + 4 strony ginekomastii (Ginekomastia hub + Gruczolowa + Tluszczowa + Mieszana — wszystkie z `variant="rich"` z preview itemami dopasowanymi do specyfiki wariantu).

Strony Przygotowanie* (12): `/dla-pacjenta/przygotowanie-{lhp,evlt,filac,silac,clacs,skleroterapia,mikroflebektomia,plastyka}` (8 phlebo/proct) + `/dla-pacjenta/przygotowanie-{ginekomastii,ginekomastia-gruczolowa,ginekomastia-tluszczowa,ginekomastia-mieszana}` (4 ginekomastia). Wszystkie nowe 4 strony ginekomastii oraz 6 starszych phlebo/proct używają reużywalnego szablonu `src/components/shared/PreparationPageTemplate.tsx`. LHP i EVLT zachowują własne, bardziej rozbudowane strony.

Recovery: wszystkie 4 warianty ginekomastii linkują do wspólnej strony `/dla-pacjenta/zalecenia-po-ginekomastii` (jeden plan rekonwalescencji = kamizelka 4–6 tyg, podobny timeline dla wszystkich wariantów).

Wszystkie ścieżki dodane do `BREADCRUMBS_MAP` w `src/lib/breadcrumbsMap.ts` pod hubem Wiedza › Dla Pacjenta. Zalecenia po zabiegu pozostają niezależnymi stronami z własnymi breadcrumbs (Zabieg › Hub › Procedura › Zalecenia).
