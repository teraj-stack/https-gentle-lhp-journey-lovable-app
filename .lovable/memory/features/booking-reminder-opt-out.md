---
name: booking-reminder-opt-out
description: Per-booking jednoklikowa rezygnacja z przypomnień (24h+2h) — token w tabeli, edge function handle-reminder-opt-out, link w stopce booking-reminder/2h, strona /reminder-opt-out
type: feature
---
Pacjent może w jednym kliknięciu wyłączyć przypomnienia o swojej wizycie:

- **Tabela** `booking_reminder_opt_out_tokens` (booking_id FK→bookings ON DELETE CASCADE, patient_email, unique token, expires_at default now()+90d, used_at, used_by_ip/ua). RLS: service_role full + admin SELECT.
- **Edge function** `handle-reminder-opt-out` (verify_jwt=false): GET=walidacja tokenu (zwraca `{valid, patientEmail}` lub `{valid:false, reason: 'already_opted_out'|'expired'}`), POST=atomic update `used_at` IS NULL → ustawia `bookings.reminder_opt_out=true` przez service-role. Loguje IP/UA klikającego.
- **Generowanie tokenu** w `send-booking-reminders` — `ensureOptOutToken` re-używa istniejący nieużyty/nievygasły token dla bookingu albo tworzy nowy (64-znakowy hex z dwóch UUID). Token wstrzykiwany jako `reminderOptOutUrl` do `templateData` obu szablonów. Fail-open: jak insert tokenu padnie, e-mail i tak idzie (bez linka).
- **URL bazowy**: `Deno.env.get('SITE_URL') ?? 'https://mcml.pl'` + `/reminder-opt-out?token=…`.
- **Szablony** `booking-reminder.tsx` (24h) i `booking-reminder-2h.tsx` mają opcjonalny prop `reminderOptOutUrl` — jeśli dostarczony, renderują dyskretną stopkę "Nie chcesz otrzymywać przypomnień o tej wizycie? Wypisz się jednym kliknięciem". Stopka systemowa unsubscribe (z send-transactional-email) NADAL doklejana automatycznie — opt-out per-booking jest dodatkową opcją węższą niż globalny unsubscribe.
- **Frontend** `/reminder-opt-out` (`src/pages/ReminderOptOut.tsx`) — wzorzec na bazie `Unsubscribe.tsx`, stany: loading/valid/already/expired/invalid/success/error. Walidacja przez fetch GET na load, opt-out przez `supabase.functions.invoke` POST.
- **Różnica vs `/unsubscribe`**: globalny unsubscribe blokuje wszystkie maile (`suppressed_emails`), reminder-opt-out wyłącza tylko reminder dla konkretnego bookingu (przyszłe rezerwacje normalnie dostają reminder o ile pacjent nie jest w suppressed_emails).
