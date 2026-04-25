---
name: hemoroidy-dziennik-14dni
description: 14-dniowy dziennik objawów hemoroidów (quiz 9 pytań/dzień + notatki + przycisk „Zapisz dzień" + wykres trendu). Współdzielony moduł osadzony na /dziennik-hemoroidy i inline na /quiz-hemoroidy.
type: feature
---

Dziennik 14 dni hemoroidów: anonimowy tracker w przeglądarce.

- **Reusable component**: `src/components/hemoroidy/DiaryFullModule.tsx`
  - Props: `reminderVariant` ("diary-page" | "quiz-page"), `showReminderSettings`, `showExport`
  - Zawiera: trend chart + **panel statystyk trendu** (`DiaryTrendStats.tsx`) + **auto-podsumowanie tygodniowe** (`DiaryWeeklySummary.tsx`: Tydzień 1 = dni 1-7, Tydzień 2 = dni 8-14, średnia, dominujący poziom, rozkład N/Ś/W, delta + komentarz narracyjny EBM zależny od kierunku zmiany), day picker (14-dniowy strip), edytor dnia (quiz 9 pytań + notatki), **przycisk „Zapisz dzień"** (variant `hero`, ikona Save/CheckCircle2 zależnie od completeness, toast potwierdzający), opcjonalnie eksport PDF/CSV i ustawienia przypomnień + clear all
  - Auto-zapis po każdej zmianie (writeStorage), przycisk daje pacjentowi jawne potwierdzenie
- **Statystyki trendu** (`DiaryTrendStats.tsx`):
  - Tydzień vs poprzedni: średnia ostatnich 7d minus średnia poprzednich 7d → kolor emerald (poprawa) / destructive (regres) / muted (flat lub n/a)
  - Najdłuższa seria niskiego ryzyka: liczy consecutive `level==='low'`, luki (brak wpisu) NIE przerywają serii
  - Spójność: `filled/totalDays * 100%`
- **Auto-podsumowanie tygodniowe** (`DiaryWeeklySummary.tsx`):
  - Dwie karty Tydzień 1/Tydzień 2 (slice 0-7 / 7-14 z trend), każda kolorowana wg dominującego poziomu (low=emerald, medium=primary, high=destructive)
  - Komentarz generowany przez `buildCommentary()` na podstawie delty: brak danych / start / poprawa (z wzrostem dni low) / stabilnie (|delta|<0.5) / regres (z dodatkowymi dniami high) — wszystkie z mikro-poradami EBM (błonnik 25-35g, woda 1.5-2l, max 3 min na toalecie)
- **Strony**:
  - `/dla-pacjenta/dziennik-hemoroidy` → `DziennikHemoroidy.tsx` (pełna strona z hero + DiaryFullModule + related links)
  - `/dla-pacjenta/quiz-hemoroidy` → `QuizHemoroidy.tsx` osadza DiaryFullModule inline pod quizem (sekcja `#dziennik-14-dni`, bez ustawień przypomnień)
- **Storage**: localStorage `cml.hemoroidy.diary.v1` (klucz dnia: `YYYY-MM-DD` lokalna data); auto-sync między tabami przez CustomEvent `cml:diary-updated`
- **Hook**: `src/hooks/useDailyDiary.ts` — `getEntry/setAnswer/setNotes/removeEntry/clearAll/last14Trend`
- **Współdzielone dane quizu**: `src/lib/hemoroidyQuizData.ts` (`HEMOROIDY_QUESTIONS`, `getRiskLevel`, `HEMOROIDY_QUIZ_MAX_SCORE`) — używane też przez `HemoroidyRiskQuiz`
- **Funkcje**:
  - Pełny quiz 9 pytań/dziennie (te same co na /quiz-hemoroidy, scoring 0–24)
  - Pole `Textarea` na notatki dnia (max 1000 znaków, id per data)
  - Przycisk „Zapisz dzień" z toastem (potwierdza zapis lub informuje o postępie X/9)
  - Wykres trendu 14 dni (recharts LineChart, ReferenceLine 8.5 i 17.5)
  - Strip dni z kolorowymi kropkami (low=emerald, medium=primary, high=destructive)
  - „Wyczyść dzień" (per-entry) i „Wyczyść cały dziennik" (AlertDialog) — tylko gdy `showReminderSettings`
- **Privacy**: brak konta, brak wysyłki na backend, dane czyszczą się razem z localStorage przeglądarki
