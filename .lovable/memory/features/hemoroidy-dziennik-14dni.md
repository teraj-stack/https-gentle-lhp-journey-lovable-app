---
name: hemoroidy-dziennik-14dni
description: Strona /dla-pacjenta/dziennik-hemoroidy — 14-dniowy dziennik objawów z codziennym quizem 9 pytań, notatkami i wykresem trendu ryzyka. Dane lokalnie.
type: feature
---

Dziennik 14 dni hemoroidów: anonimowy tracker w przeglądarce.

- **Route**: `/dla-pacjenta/dziennik-hemoroidy` → `src/pages/DziennikHemoroidy.tsx`
- **Storage**: localStorage `cml.hemoroidy.diary.v1` (klucz dnia: `YYYY-MM-DD` lokalna data); auto-sync między tabami przez CustomEvent `cml:diary-updated`
- **Hook**: `src/hooks/useDailyDiary.ts` — `getEntry/setAnswer/setNotes/removeEntry/clearAll/last14Trend`
- **Współdzielone dane quizu**: `src/lib/hemoroidyQuizData.ts` (`HEMOROIDY_QUESTIONS`, `getRiskLevel`, `HEMOROIDY_QUIZ_MAX_SCORE`) — używane też przez `HemoroidyRiskQuiz`
- **Funkcje**:
  - Pełny quiz 9 pytań/dziennie (te same co na /quiz-hemoroidy, ten sam scoring 0–24)
  - Pole `Textarea` na notatki dnia (max 1000 znaków)
  - Wykres trendu 14 dni (recharts LineChart, ReferenceLine 8.5 i 17.5 dla progów ryzyka)
  - Strip dni z kolorowymi kropkami (low=emerald, medium=primary, high=destructive)
  - „Wyczyść dzień" (per-entry) i „Wyczyść cały dziennik" (AlertDialog)
- **CTA**: na `/dla-pacjenta/quiz-hemoroidy` pod sekcją quizu znajduje się banner z linkiem do dziennika
- **Privacy**: brak konta, brak wysyłki na backend, dane czyszczą się razem z localStorage przeglądarki
