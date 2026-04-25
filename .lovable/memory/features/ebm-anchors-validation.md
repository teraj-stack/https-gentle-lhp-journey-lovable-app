---
name: EBM Anchors Build Validation
description: Walidacja build-time sprawdzająca, że każdy ebmId w RiskFactorsAccordion ma odpowiadającą kategorię w EBMSourcesSection
type: feature
---

Build-time guard chroniący przed broken deep-links `/dla-pacjenta/ebm-hemoroidy#ebm-<id>`.

## Komponenty
- `scripts/validate-ebm-anchors.mjs` — eksportuje `validateEbmAnchors()`, działa też jako CLI (`node scripts/validate-ebm-anchors.mjs`).
  - Parsuje regexem `id: "<slug>"` z `EBMSourcesSection.tsx` (lista CATEGORIES, 8 kategorii).
  - Parsuje `ebmId: "<slug>"` z `RiskFactorsAccordion.tsx` (źródła w akordeonach + tabela porównawcza).
  - Zwraca `{ validIds, refsCount, orphans: [{ id, line }] }`.
- `vite.config.ts` — plugin `cml:validate-ebm-anchors` w hooku `buildStart` (działa zarówno w `vite dev` jak i `vite build`). Używa `this.error(...)` żeby przerwać build na orphana.
- `src/lib/ebmAnchors.test.ts` — vitest test który przechodzi tylko gdy `orphans.length === 0` (CI safety net na wypadek gdyby ktoś ominął vite).

## Aktualny stan
- 8 kategorii w bibliografii: `activity, diagnosis, fiber, guidelines, hydration, lhp, risk, toilet`
- 22 referencje `ebmId` w RiskFactorsAccordion → wszystkie mapują na istniejące kategorie

## Jak dodać nową kategorię
1. Dodaj nowy obiekt z `id: "<slug>"` do tablicy `CATEGORIES` w `src/components/hemoroidy/EBMSourcesSection.tsx`.
2. Zacznij używać tego `ebmId` w źródłach `RISK_FACTORS` lub `COMPARISON_ROWS`.
