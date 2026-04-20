---
name: booking-status-history
description: Tabela booking_status_history + trigger logujący każdą zmianę statusu, popover w /admin/bookings z timeline łączącym zmiany statusu i kliknięcia tokenów z maili
type: feature
---
**Tabela `booking_status_history`** (RLS: admins SELECT, service_role ALL):
- `booking_id` (FK do bookings, ON DELETE CASCADE), `old_status`, `new_status`, `changed_at`, `changed_by`, `source` ('admin' | 'system' | 'patient_link'), `note`
- Index: `(booking_id, changed_at DESC)`

**Trigger `trg_log_booking_status_change`** na `bookings` (AFTER INSERT OR UPDATE OF status) — funkcja `log_booking_status_change()`:
- INSERT bookingu → wpis z `old=NULL, new=status, source='system'`
- UPDATE statusu → wpis z `old=OLD.status, new=NEW.status`, source = 'admin' jeśli `status_changed_by` zawiera '@', inaczej 'system'
- `changed_at` = `NEW.status_changed_at` (już ustawiane przez istniejący trigger `touch_booking_status_changed_at`)

**Backfill** uruchomiony w migracji: dla każdego bookingu wpis 'created' (status_changed_by=NULL, changed_at=created_at), plus jeśli `status_changed_at IS NOT NULL` i `status<>'pending'` — drugi wpis 'backfill: latest known change'.

**UI**: `StatusChangeCell` w `src/pages/AdminBookings.tsx` (kolumna "Historia", `hidden lg:table-cell`):
- compact view: ostatnia zmiana (data + email)
- klik "Historia (X/Y)" → Popover (w-96) z lazy-loadowanym (`enabled: open`) zunifikowanym timeline:
  - status changes (kropka primary/gold) — old→new badge'y w kolorach STATUS_HISTORY_TONE
  - token clicks z maili (kropka sky) — kto kliknął, recipient, IP, UA
  - sortowane malejąco po `at`
- nadal pokazuje stopkę o auto-invalidated linkach jeśli takie są

**Edge functions** mogą zapisywać wpisy do historii ręcznie z `source='patient_link'` jeśli nie chcemy polegać na triggerze (obecnie trigger ustawia 'admin' gdy email jest podany — wystarczające bo `update-booking-status` ustawia `status_changed_by` na recipient_email tokenu).
