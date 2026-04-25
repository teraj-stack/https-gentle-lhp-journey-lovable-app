---
name: diary-reminders
description: In-app przypomnienia dziennika 14 dni i powrotu do quizu hemoroidów. localStorage-only, banner + ustawienia + opcjonalnie Notification API.
type: feature
---

In-app reminders dla dziennika hemoroidów i quizu ryzyka — wszystko anonimowo w localStorage.

- **Hook**: `src/hooks/useDiaryReminders.ts` — preferencje + status + akcje
  - storage key: `cml.hemoroidy.reminders.v1`
  - `cadence` (dziennik): `daily` | `every2days` | `every3days` | `off` (default: daily)
  - `quizCadence`: `weekly` | `biweekly` | `monthly` | `off` (default: weekly)
  - `snoozedUntil`: YYYY-MM-DD (banner ukryty do tego dnia włącznie)
  - `lastQuizCompletedAt`: ISO ts — ustawiany przez `markQuizCompleted()` (wywoływany w `HemoroidyRiskQuiz` po `done`)
  - `systemNotifications`: best-effort Notification API (tylko jeśli zakładka otwarta, bez SW); 1 ping/dzień przez `sessionStorage` flag `cml.hemoroidy.notif.shown.<date>`
  - `diaryDue` = brak wpisu lub `daysSinceLastEntry >= cadenceDays`; ostatni dzień liczy się po wpisach z `cml.hemoroidy.diary.v1` (answers lub notes)
  - re-eval na: `storage`, `cml:diary-updated`, `cml:reminder-prefs-updated`, `visibilitychange`, co 30 min interval

- **Komponenty**:
  - `src/components/hemoroidy/DiaryReminderBanner.tsx` — banner z 1–2 CTA (uzupełnij wpis / wróć do quizu) + „Przypomnij jutro" (snooze) + link do ustawień (`#przypomnienia`). Variants: `quiz-page` (pokazuje tylko diary), `diary-page` (pokazuje tylko quiz), `global` (oba)
  - `src/components/hemoroidy/DiaryReminderSettings.tsx` — sekcja `id="przypomnienia"` w dzienniku: 4 kafelki cadence dziennika + 4 kafelki quizu + status (ostatni wpis/quiz, „czas na wpis" badge) + snooze (dzień/3 dni/tydzień/wznów) + przełącznik powiadomień systemowych

- **Wpięcia**:
  - `src/pages/DziennikHemoroidy.tsx`: `<DiaryReminderBanner variant="diary-page" />` przed wykresem trendu; `<DiaryReminderSettings />` po sekcji eksportu, przed prywatnością
  - `src/pages/QuizHemoroidy.tsx`: `<DiaryReminderBanner variant="quiz-page" />` nad `<HemoroidyRiskQuiz />`
  - `src/components/hemoroidy/HemoroidyRiskQuiz.tsx`: `useDiaryReminders().markQuizCompleted()` w effect po ustawieniu `done = true`

- **Privacy**: wszystko lokalnie, bez backendu, bez konta. Powiadomienia systemowe wymagają explicit opt-in (Notification.requestPermission) i znikają wraz z zamknięciem zakładki — to nie jest push, tylko in-page ping.
