---
name: Booking No-Show Follow-up
description: Edge function send-booking-no-show-followup wysyła mail do bookings status='pending' o 22:00 Warsaw (cron 20:00 UTC), szablon booking-no-show-check ma 2 scenariusze (jak poszło / nie udało się dotrzeć), idempotency guard po booking-no-show-{id}-{date}
type: feature
---
# Booking No-Show Follow-up

**Edge function**: `send-booking-no-show-followup`
- Filter: `appointment_date=today (Europe/Warsaw) AND status='pending' AND reminder_opt_out=false`
- Idempotency key: `booking-no-show-{bookingId}-{date}` (jeden mail per booking per dzień)
- Pre-check `email_send_log` przed invoke (status IN pending/sent)

**Cron**: `booking-no-show-followup`, jobid=8, schedule `0 20 * * *` UTC = 22:00 Warsaw (CEST).
W zimie (CET) faktycznie wykona się o 21:00 Warsaw — akceptowalne dla follow-up maila.

**Szablon**: `booking-no-show-check.tsx` — 2 scenariusze w kartach scenarioCard:
1. ✅ Wizyta się odbyła? → CTA "Umów wizytę kontrolną" (primary, gold)
2. 🙋 Nie udało się dotrzeć? → CTA "Umów nowy termin" (secondary, dark)

Oba CTA linkują do `BOOKING_URL` = ZnanyLekarz Dr Bujok.

**Subject**: "Jak minęła dzisiejsza wizyta?"
**templateData**: `patientName`, `appointmentDate` (DD.MM.YYYY), `locationLabel`
