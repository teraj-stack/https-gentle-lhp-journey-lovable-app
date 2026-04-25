---
name: Risk Checklist Share Link
description: Generowanie krótkiego linku/kodu do udostępnienia checklisty czynników ryzyka hemoroidów lekarzowi (offline, bez backendu)
type: feature
---
- **Helper**: `src/lib/checklistShare.ts`
  - `RISK_FACTOR_IDS` — STABILNA lista id (nie zmieniaj kolejności, tylko dopisuj na końcu); index w tablicy = identyfikator w payloadzie
  - `encodeChecklist(ids)` → kompresja do base64url indeksów (~20-30 znaków przy 8 zaznaczonych)
  - `decodeChecklist(payload)` → tablica id, walidacja zakresu i deduplikacja
  - `buildChecklistShareUrl(ids)` → `${origin}/dla-pacjenta/hemoroidy?c=<payload>#moja-checklista-ryzyka`
  - `buildChecklistShortCode(ids)` → sam payload (bez URL), do podyktowania ustnie
- **UI** (`src/components/blog/RiskFactorsAccordion.tsx`):
  - Przycisk **"Utwórz link do checklisty"** (variant="hero", ikona Share2) jako PIERWSZY w grupie akcji checklisty (przed "Pobierz PDF" / "Pobierz CSV")
  - Otwiera Dialog (Radix) z dwoma polami `Input readOnly`:
    1. Pełny URL + przycisk "Kopiuj" (Copy/Check icon swap, 2s)
    2. Krótki kod + przycisk "Kopiuj" (mniejszy, w zaramkowanym box `bg-muted/30`)
  - Pusty stan → toast zamiast otwarcia dialogu
  - Sukces kopiowania → toast + ikona zmienia się na `Check` na 2s
- **Auto-restore z URL**: useEffect na `location.search` w komponencie:
  - Czyta `?c=<payload>` przez URLSearchParams
  - `decodeChecklist` → MERGE z aktualnym `selected` (Set, brak nadpisywania)
  - Toast "Wczytano udostępnioną checklistę"
  - Czyści parametr przez `navigate(..., { replace: true })`, zachowując `#moja-checklista-ryzyka`
- **Brak backendu**: zero call-i do Supabase, zero TTL, działa offline, link nigdy nie wygasa
