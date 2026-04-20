---
name: booking-reminders-unified
description: Generic send-booking-reminders edge function with window param (24h/2h), config map per window, hourly + /30min cron jobs
type: feature
---
Funkcja `send-booking-reminders` jest jedna i przyjmuje w body `{window: "24h" | "2h"}`.
- `WINDOW_CONFIG` mapuje window → {templateName, targetDate(), timeWindow?(), idempotencyKey(b), buildTemplateData(b)}.
- `24h` → tomorrow Warsaw, template `booking-reminder`, idem key `booking-reminder-{id}-{date}`.
- `2h` → today Warsaw, time-window now+90..150min, template `booking-reminder-2h`, idem key `booking-reminder-2h-{id}-{date}T{time}`.
- Pre-check `email_send_log` (status pending|sent) per template w jednym zapytaniu, fail-open.
- Cron joby: `send-booking-reminders-hourly` (`0 * * * *`, body window=24h, jobid 5) i `send-booking-reminders-2h` (`*/30 * * * *`, body window=2h, jobid 9).
- Stara funkcja `send-booking-reminders-2h` USUNIĘTA.
- Nieprawidłowy window → 400.
