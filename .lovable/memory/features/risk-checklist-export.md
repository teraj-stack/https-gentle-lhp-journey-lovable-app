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

## Wysoki priorytet (gwiazdki)
- **Storage**: `cml.hemoroidy.risk-factors.priority.v1` (string[]) — niezależny od `selected`. Auto-czyszczenie w useEffect: jeśli czynnik został odznaczony z checklisty, znika też z priorytetów.
- **UI**: ikona `Star` przy każdym wpisie checklisty (toggle). Aktywny stan = `fill-current` + złoty kolor + dodatkowy badge "PRIORYTET" obok tytułu + akcent karty (`border-primary/60 bg-primary/[0.06] ring-1 ring-primary/20`).
- **Sortowanie**: `selectedFactors` useMemo sortuje priorytetowe na górę (stable wewnątrz grupy).
- **Licznik**: w nagłówku obok "X z Y zaznaczonych" pojawia się "· N priorytetów" gdy `priorityCount > 0`.

## Auto-podsumowanie (kategorie + mechanizmy)
- **Mapa**: `src/lib/checklistSummary.ts` — `RISK_FACTOR_META: Record<id, { category, mechanisms[] }>` z 5 kategoriami (Dieta/Styl życia/Fizjologia/Genetyka/Zachowanie w toalecie) i 5 mechanizmami patofizjologicznymi.
- **Helper**: `buildChecklistSummary(ids)` zwraca top kategorie + top mechanizmy z count i share %, plus krótki kontekstowy komentarz dopasowany do dominującego mechanizmu.
- **UI**: `src/components/blog/ChecklistAutoSummary.tsx` — karta na dole checklisty (po liście, przed przyciskami eksportu) z 2 kolumnami pasków top-3 + komentarz w kursywie. Hidden gdy total = 0.
- **Brak nowych zależności**: czysty TS + framer-motion + lucide.

## Skrót klawiaturowy Ctrl/⌘+E
- **Lokalizacja**: useEffect w `RiskFactorsAccordion` z window keydown listenerem.
- **Mapping**: `Ctrl+E` (Win/Linux) lub `Cmd+E` (macOS) bez Shift/Alt → toggle wszystkich akordeonów (`setOpenItems`).
- **Bezpieczeństwo**: ignoruje gdy fokus w INPUT/TEXTAREA/SELECT/contenteditable (żeby pisanie litery „e" działało normalnie).
- **preventDefault** — Ctrl+E w Chrome to focus searchbar; przejmujemy.
- **Feedback**: toast "Rozwinięto/Zwinięto wszystkie sekcje" + opis ze skrótem.
- **Tooltip**: przycisk "Rozwiń/Zwiń wszystko" ma `title` z hintem skrótu.

## Pasek wyników wyszukiwania
- **Widoczny licznik**: pojawia się TYLKO gdy `nQuery` aktywne i `filtered.length > 0`. Karta z `border-primary/30 bg-primary/[0.05]`, badge `X/Y` z ikoną Search + tekst „dopasowanych czynników dla „query"".
- **Przycisk „Rozwiń tylko dopasowane"**: zapisuje `filtered.map(rf => rf.id)` do `openItems`, czyści `query` (`setQuery("")`), pokazuje toast. Efekt: dopasowania zostają otwarte trwale, reszta zwinięta.
- **Stary tekst hint** pod inputem zachowany (aria-live polite) — duplikuje informację dla czytników ekranu.

## Persystencja stanu rozwinięcia (openItems)
- **Storage**: `cml.hemoroidy.risk-factors.open.v1` (string[]) — id otwartych akordeonów.
- **Lazy init** w `useState` z walidacją: `RISK_FACTORS` ids (Set), żeby zignorować przestarzałe id po refaktorze.
- **Autosave**: useEffect na `openItems` — zapis TYLKO gdy `!nQuery` (tryb wyszukiwania nadpisuje accordionValue na auto-rozwinięcie dopasowań, więc to nie jest wybór użytkownika).
- **Skrót Ctrl/⌘+E i przyciski "Rozwiń wszystko" / "Rozwiń tylko dopasowane"** automatycznie persistują przez ten sam mechanizm.

## Stagger animation przy bulk expand/collapse
- Helper `setOpenItemsStaggered(target)` rozkłada zmianę `openItems` na sekwencję 40ms/krok zamiast jednoczesnego skoku → fala otwierania (od góry) i zamykania (od dołu).
- Bookkeeping przez `staggerTimersRef` (cancel poprzedniej sekwencji przy nowym wywołaniu i przy unmount).
- `prefers-reduced-motion: reduce` → natychmiastowy `setOpenItems(target)` bez staggera.
- Używane w 3 miejscach: `toggleAll` (przycisk Rozwiń/Zwiń wszystko), Ctrl/⌘+E, "Rozwiń tylko dopasowane". Pojedyncze klikanie w `AccordionTrigger` zostaje na natywnym `animate-accordion-down/up` z Radix.

## Filtr źródeł EBM (multi-select chips)
- 5 providerów: Cochrane, PubMed, ASCRS, ESCP, Czasopisma (LWW/Wiley) — detekcja po `url` (host) z fallbackiem na `label`. Helper `getSourceProviders(source)` + `factorHasProvider(rf, set)`.
- Provider to ortogonalna oś względem `ebmId` (kategoria merytoryczna fiber/hydration/...) — `ebmId` nie jest reużywany.
- Stan: `sourceFilter: Set<EbmProvider>`. Logika OR (zaznaczenie wielu = ≥1 dopasowanie).
- Łączy się z wyszukiwaniem (AND między filtrem providera a `nQuery`); aktywny filtr providera również auto-rozwija dopasowane karty (`filterActive` w `accordionValue`).
- Guardy autosave openItems + auto-mark-read pomijają tryb filtra (analogicznie jak nQuery), żeby filtr nie nadpisywał zapisanej rozwinięcia ani nie oznaczał kart jako przeczytane bez intencji.
- Chipy pokazują licznik czynników per provider; chip z `count === 0` jest disabled.
