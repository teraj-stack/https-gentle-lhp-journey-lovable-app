---
name: Quiz ryzyka hemoroidów
description: Dedykowana podstrona /dla-pacjenta/quiz-hemoroidy z 5-pytaniowym interaktywnym quizem, scoringiem 0–16 pkt, 3 poziomami ryzyka, klikalnymi zaleceniami z deep-linkami do sekcji checklisty i bibliografią EBM
type: feature
---

Interaktywny test ryzyka hemoroidów na podstronie `/dla-pacjenta/quiz-hemoroidy`.

## Komponenty
- `src/components/hemoroidy/HemoroidyRiskQuiz.tsx` — reużywalny komponent quizu (id="hemoroidy-quiz", reaguje na event `cml:quiz-restart`)
- `src/components/hemoroidy/QuizRetakeModule.tsx` — moduł powtórnego quizu: side-by-side porównanie poprzedni vs ostatni, delta, najlepszy wynik, insight kontekstowy + CTA "Wypełnij ponownie" (dispatch `cml:quiz-restart` + smooth scroll do quizu)
- `src/components/hemoroidy/QuizHistorySection.tsx` — historia + line chart trendu (recharts) + eksport JSON
- `src/components/hemoroidy/HemoroidyChecklistSections.tsx` — 6 sekcji checklisty (anchor targets) pod quizem
- `src/components/hemoroidy/EBMSourcesSection.tsx` — bibliografia EBM
- `src/pages/QuizHemoroidy.tsx` — strona: hero → quiz → CTA dziennik → retake module → history → red flags → checklist → kafelki → źródła EBM

## Struktura quizu
- 5 pytań (błonnik, nawodnienie, czas w toalecie, ruch/styl życia, objawy)
- Scoring 0–16 punktów (objawy ważą do 4 pkt)
- 3 poziomy ryzyka:
  - **Niskie (0–5 pkt)**: zielona ramka, CTA → pobierz PDF checklisty
  - **Średnie (6–11 pkt)**: złota ramka, CTA → konsultacja proktologiczna (`/kontakt`)
  - **Wysokie (12+ pkt)**: czerwona ramka, dodatkowy box „pilnie do lekarza", CTA → konsultacja
- Każde zalecenie typu `{ text, anchor }` — klikalny link do `#fiber|hydration|toilet|movement|symptoms|urgent`
- Linki wtórne: Hemoroidy A–Z, LHP, FAQ proktolog
- Disclaimer EBM (ASCRS / ESCP)

## Sekcje checklisty (anchory)
- `#fiber` — Błonnik 25–35 g
- `#hydration` — Nawodnienie 2–2,5 l
- `#toilet` — Nawyki toaletowe (max 3 min, podnóżek)
- `#movement` — Ruch min. 30 min
- `#symptoms` — Kiedy do proktologa
- `#urgent` — Pilne objawy (24–48 h, czerwona ramka)
Każda sekcja: ikona (Lucide), lead, lista zaleceń, przypis źródła. `scroll-mt-32` pod sticky header.

## Linki
- Z wpisu blogowego `/blog/seks-analny-a-hemoroidy-fakty-i-mity` (sekcja „Wersja do pobrania")
- Z `BREADCRUMBS_MAP` (Wiedza › Dla Pacjenta › Test ryzyka hemoroidów)

## Stan UI
- React useState (step, answers[], done) — bez persistencji
- framer-motion: AnimatePresence między pytaniem a wynikiem, progress bar animowany
- Pełna responsywność, focus rings dla a11y, role="radiogroup"
