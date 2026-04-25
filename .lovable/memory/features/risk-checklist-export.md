---
name: Risk Factors Checklist Export
description: Eksport checklisty czynników ryzyka hemoroidów (z RiskFactorsAccordion) do PDF/CSV — przyciski w sekcji "Moja checklista czynników ryzyka"
type: feature
---
- **Komponent**: `src/components/blog/RiskFactorsAccordion.tsx` — sekcja "Moja checklista czynników ryzyka" (`#moja-checklista-ryzyka`)
- **Helper eksportu**: `src/lib/checklistExport.ts` (jsPDF + Blob CSV; ten sam wzorzec brandingu CML co `diaryExport.ts`: złoty pasek nagłówka, TEXT_DARK/MUTED, BG_SOFT, helvetica + stripDiacritics)
- **PDF** (`exportChecklistPdf`): nagłówek brand + ramka "DLA LEKARZA" + lista kart z `title`, `shortBadge`, `body`, `sources` (każda karta jako rounded box z padding); paginacja, footer z numerem strony i URL `cml.pl/dla-pacjenta/ebm-hemoroidy`
- **CSV** (`exportChecklistCsv`): nagłówek z metadanymi (data, count, źródło) + tabela `Lp.|Tytul|Badge|Uzasadnienie|Zrodla EBM`. Separator `;` (Excel-PL), BOM `\uFEFF`
- **Przyciski**: variant="hero" (PDF) + variant="outline" (CSV) — pojawiają się tylko gdy `selectedFactors.length > 0`. Pusty stan → toast "Brak zaznaczonych czynników"
- **Nazwa pliku**: `cml-checklista-ryzyka-hemoroidy-YYYY-MM-DD.{pdf,csv}`
- **Storage**: lista zaznaczeń w localStorage `cml.hemoroidy.risk-checklist.v1` (anonimowo, bez backendu)

## Data zaznaczenia (timestamp)
- **Storage**: `cml.hemoroidy.risk-factors.selected-at.v1` (ISO string) — aktualizowany w useEffect na zmianę `selected`, z `useRef` jako flagą first-render (żeby restore z localStorage NIE nadpisywał istniejącego timestampu).
- **Reset**: gdy `selected.length === 0` → `removeItem` + state na `null`.
- **UI**: linia z `<CalendarClock>` + `<time dateTime>` w nagłówku checklisty (kolor `text-primary/80`, format `pl-PL` dzień + miesiąc skrócony + rok + HH:MM).
- **Eksport**: `exportChecklistPdf` i `exportChecklistCsv` przyjmują 3. opcjonalny parametr `selectedAt?: string | null`. PDF: linia kursywą złotym kolorem pod „Wygenerowano". CSV: dodatkowy wiersz „Data zaznaczenia" w bloku metadanych.
