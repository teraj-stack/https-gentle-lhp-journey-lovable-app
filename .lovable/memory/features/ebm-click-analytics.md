---
name: EBM Click Analytics
description: Frontend-only tracking kliknięć w linki badań EBM (PubMed/Cochrane) i deep-linki bibliografii — localStorage + dataLayer + CustomEvent
type: feature
---

Lekka analityka kliknięć dla treści edukacyjnych EBM. Brak ciasteczek, brak PII, brak żądań sieciowych.

## Helper
`src/lib/ebmAnalytics.ts` — funkcja `trackEbmClick({ url, label, source, kind?, ebmId? })`:
- agreguje liczniki w `localStorage` (klucz `cml.ebm.analytics.v1`): totals per kind, perHost, perEbmId, perSource + ostatnie 200 zdarzeń
- pushuje zdarzenie `ebm_click` do `window.dataLayer` (gotowe pod GA4/GTM bez zmian kodu)
- emituje `CustomEvent("cml:ebm-click", { detail })` na `window` — punkt podpięcia dla integracji backendowych

## Instrumentowane miejsca
- `src/components/blog/RiskFactorsAccordion.tsx` — linki źródeł w akordeonach + deep-linki "kategoria w bibliografii" + "moduł Źródła EBM →" + tabela porównawcza (desktop + mobile)
- `src/components/hemoroidy/RedFlagsFAQ.tsx` — linki w czerwonych flagach
- `src/components/hemoroidy/EBMSourcesSection.tsx` — linki "Link" przy każdej referencji w bibliografii (z `ebmId` = id kategorii)

## Rodzaje zdarzeń (`kind`)
- `external_source` — link do PubMed, Cochrane, NICE, ASCRS, ESCP, journals
- `internal_anchor` — deep-link `#ebm-<categoryId>` lub `#bibliografia` (auto-detekcja po `/` lub `#` na początku)

## Testy
`src/lib/ebmAnalytics.test.ts` (6 testów): empty state, agregaty per host/source/ebmId, klasyfikacja anchor, dataLayer push, CustomEvent dispatch, cap 200 ostatnich zdarzeń.
