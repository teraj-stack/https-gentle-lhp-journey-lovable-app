---
name: hemoroidy-dziennik-14dni
description: 14-dniowy dziennik objawów hemoroidów (quiz 9 pytań/dzień + notatki + przycisk „Zapisz dzień" + wykres trendu). Współdzielony moduł osadzony na /dziennik-hemoroidy i inline na /quiz-hemoroidy.
type: feature
---

Dziennik 14 dni hemoroidów: anonimowy tracker w przeglądarce.

- **Reusable component**: `src/components/hemoroidy/DiaryFullModule.tsx`
  - Props: `reminderVariant` ("diary-page" | "quiz-page"), `showReminderSettings`, `showExport`
  - Zawiera: trend chart + **auto-werdykt trendu** (`DiaryTrendSummary.tsx`: regresja liniowa po wypełnionych dniach → spadek/utrzymanie/wzrost + najważniejszy dzień zmiany vs średnia poprzedzających) + **panel statystyk trendu** (`DiaryTrendStats.tsx`) + **auto-podsumowanie tygodniowe** (`DiaryWeeklySummary.tsx`: Tydzień 1 = dni 1-7, Tydzień 2 = dni 8-14, średnia, dominujący poziom, rozkład N/Ś/W, delta + komentarz narracyjny EBM zależny od kierunku zmiany), day picker (14-dniowy strip), edytor dnia (quiz 9 pytań + notatki), **przycisk „Zapisz dzień"** (variant `hero`, ikona Save/CheckCircle2 zależnie od completeness, toast potwierdzający), opcjonalnie eksport PDF/CSV i ustawienia przypomnień + clear all
  - Auto-zapis po każdej zmianie (writeStorage), przycisk daje pacjentowi jawne potwierdzenie
- **Statystyki trendu** (`DiaryTrendStats.tsx`):
  - Tydzień vs poprzedni: średnia ostatnich 7d minus średnia poprzednich 7d → kolor emerald (poprawa) / destructive (regres) / muted (flat lub n/a)
  - Najdłuższa seria niskiego ryzyka: liczy consecutive `level==='low'`, luki (brak wpisu) NIE przerywają serii
  - Spójność: `filled/totalDays * 100%`
- **Auto-werdykt trendu** (`DiaryTrendSummary.tsx`):
  - Wymaga ≥2 wypełnionych dni; mniej → komunikat-zachęta.
  - Kierunek: regresja liniowa (least squares) na (idx, score) wypełnionych dni → slope pkt/dzień. Progi: `<-0.3` spadek (emerald), `>0.3` wzrost (destructive), inaczej utrzymanie (muted). Pokazuje też prognozę 14-dniową (`slope*(n-1)`).
  - Najważniejszy dzień zmiany: dla każdego wypełnionego dnia liczy `score − avg(poprzednich)`, wymaga ≥2 dni bazowych i `|delta|≥3 pkt`. Bierze maks `|delta|` (najmocniejszy odchył). Karta z datą długą (weekday + dzień + miesiąc), ikoną ↘/↗, deltą i scorem; jeśli wpis ma notatkę — cytuje fragment (line-clamp-2).
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
- **Edycja wpisów + timestamp aktualizacji** (DiaryFullModule):
  - Każdy z 14 dni jest pełnoedytowalny (klik dnia w stripie → edytor; klik odpowiedzi/notatki nadpisuje wpis i aktualizuje `updatedAt` w `useDailyDiary`)
  - W nagłówku stripa hint: ikona Pencil + tekst „Możesz edytować dowolny z 14 dni — kliknij datę, aby otworzyć i poprawić wpis."
  - Każdy przycisk w stripie ma `title` z pełną datą+godziną aktualizacji (formatUpdatedAt: `25.04.2026, 14:32`) lub „Brak wpisu — kliknij, aby dodać"
  - Pod kropką poziomu w stripie: kompaktowy timestamp `formatUpdatedAtCompact` (HH:MM dla dziś/wczoraj, `DD.MM HH:MM` dla starszych)
  - W nagłówku edytora aktywnego dnia: linia z ikoną Clock i pełnym timestampem ostatniej aktualizacji (tylko gdy wpis istnieje w `entries[activeDate]`)
- **Wskaźnik postępu 14-dniowego** (DiaryFullModule, między `DiaryReminderBanner` a kartą trendu):
  - Pasek `Progress` (shadcn) wartość = `completedDaysCount/14 * 100%` — liczy TYLKO dni z `entry.complete === true` (wszystkie 9 pytań quizu mają odpowiedź)
  - Liczniki w nagłówku: Ukończone (emerald), Częściowe (primary, gdy >0 — wpis istnieje z ≥1 odp. lub notatką ale niekomplet), Pozostało (`14 - totalProgressDays`)
  - Status aktywnego dnia (chip pod paskiem): `completed/total pól quizu` z ikoną CheckCircle2 (entry.complete) lub CircleDashed (incomplete) i kolorem emerald/primary/muted
  - `partialDaysCount` liczone w `useMemo` z `[trend, entries]` — aktualizuje się po każdej zmianie auto-zapisu
- **Konfigurowalne progi ryzyka** (`useRiskThresholds`, panel `RiskThresholdsSettings`):
  - Storage `cml.hemoroidy.risk-thresholds.v1` (`{lowMax, mediumMax}`), domyślne `{8, 17}`. Walidacja `sanitizeRiskThresholds` (0 ≤ low < medium ≤ maxScore-1).
  - `hemoroidyQuizData.ts` eksportuje `getRiskLevelWithThresholds` / `getRiskRangeWithThresholds`. Stare `getRiskLevel`/`getRiskRange` używają DEFAULT (back-compat).
  - `useDailyDiary` przelicza `level/label` w `useMemo([rawEntries, thresholds])` — storage trzyma raw answers, derived liczone w locie. Zmiana progów natychmiast aktualizuje cały wykres/legendy.
  - Sync między tabami: custom event `cml:risk-thresholds-updated` + natywny `storage`.
  - Panel z 2 sliderami (low/medium) + podgląd 3 stref + reset do default; widoczny w DiaryFullModule gdy `showReminderSettings` (pełna strona dziennika).
  - HemoroidyRiskQuiz używa `getRiskLevelWithThresholds` + `getRiskRangeWithThresholds`; `tier.range` zastąpione zmienną `tierRange`.
