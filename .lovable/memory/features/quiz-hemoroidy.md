---
name: Quiz ryzyka hemoroidów
description: Dedykowana podstrona /dla-pacjenta/quiz-hemoroidy z 5-pytaniowym interaktywnym quizem, scoringiem 0–16 pkt, 3 poziomami ryzyka i dopasowanymi zaleceniami EBM
type: feature
---

Interaktywny test ryzyka hemoroidów na podstronie `/dla-pacjenta/quiz-hemoroidy`.

## Komponenty
- `src/components/hemoroidy/HemoroidyRiskQuiz.tsx` — reużywalny komponent quizu
- `src/pages/QuizHemoroidy.tsx` — strona z hero, quizem i 3 kafelkami linków zwrotnymi

## Struktura quizu
- 5 pytań (błonnik, nawodnienie, czas w toalecie, ruch/styl życia, objawy)
- Scoring 0–16 punktów (objawy ważą do 4 pkt)
- 3 poziomy ryzyka:
  - **Niskie (0–5 pkt)**: zielona ramka, CTA → pobierz PDF checklisty
  - **Średnie (6–11 pkt)**: złota ramka, CTA → konsultacja proktologiczna (`/kontakt`)
  - **Wysokie (12+ pkt)**: czerwona ramka, dodatkowy box „pilnie do lekarza", CTA → konsultacja
- Każdy poziom ma 4–6 dopasowanych zaleceń z 4 filarów checklisty
- Linki wtórne: Hemoroidy A–Z, LHP, FAQ proktolog
- Disclaimer EBM (ASCRS / ESCP)

## Linki
- Z wpisu blogowego `/blog/seks-analny-a-hemoroidy-fakty-i-mity` (sekcja „Wersja do pobrania")
- Z `BREADCRUMBS_MAP` (Wiedza › Dla Pacjenta › Test ryzyka hemoroidów)

## Stan UI
- React useState (step, answers[], done) — bez persistencji
- framer-motion: AnimatePresence między pytaniem a wynikiem, progress bar animowany
- Pełna responsywność, focus rings dla a11y, role="radiogroup"
