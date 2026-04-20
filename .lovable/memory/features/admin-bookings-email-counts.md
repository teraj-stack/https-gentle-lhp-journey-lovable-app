---
name: Admin Bookings Email Counts
description: Kolumna "Maile" w /admin/bookings — count z email_send_log per booking (dedup po message_id) z popoverem rozbicia per template_name
type: feature
---

W panelu /admin/bookings dodano kolumnę "Maile" (widoczna od xl breakpoint), pokazującą całkowitą liczbę unikalnych maili wysłanych dla danej rezerwacji (confirmation + notification do recepcji + reminder 24h + reminder 2h + status-update + no-show-check + manualne resendy).

Implementacja:
- **Edge functions**: `send-transactional-email` przyjmuje opcjonalne `body.metadata` które jest mergowane z hardkodowanymi `caller_ip` + `idempotency_key` przed insertem do `email_send_log`. Wszystkie funkcje wysyłające emaile bookingowe (`on-booking-created`, `send-booking-reminders`, `update-booking-status`, `send-booking-no-show-followup`, `resend-booking-reminder` — ten ostatni już wcześniej) przekazują `metadata.booking_id` przy invocation.
- **Frontend (`AdminBookings.tsx`)**: `useQuery(["admin-bookings-email-counts", ...])` pobiera dwa zestawy logów (180 dni wstecz):
  1. `metadata->>booking_id IN (ids)` — nowe wpisy
  2. fallback: wszystkie wpisy z 6 template_name + dopasowanie booking.id w `metadata.idempotency_key` substringiem (dla starych logów sprzed deploy 2026-04-20)
  Dedup po `message_id` (latest status wins), agregacja per template_name.
- **UI**: kolumna `<EmailCountCell>` z `Popover` — przycisk z liczbą total + tonem (zielony/żółty/czerwony zależnie od dominującego stanu). Popover pokazuje listę szablonów z licznikami `total`, `✓sent`, `⧗pending`, `✗failed`. Mapping techniczny→ludzki: `EMAIL_TEMPLATE_LABEL`.

Korzyści dla recepcji:
- szybki podgląd ile razy pacjent kontaktowany mailowo (np. 5 = potwierdzenie + reminder 24h + reminder 2h + ręczny resend + status-update)
- diagnostyka: jeśli pacjent twierdzi "nie dostałem maila", popover pokaże czy mail był `sent`, `pending` (utknął w kolejce) czy `failed`
- bonus: liczba maili działa nawet dla bookingów sprzed migracji metadata.booking_id (fallback po idempotency_key)
