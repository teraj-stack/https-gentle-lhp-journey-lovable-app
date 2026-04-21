-- Add per-booking reminder schedule columns (DST-safe via Europe/Warsaw timezone)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS next_reminder_24h_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_reminder_2h_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.next_reminder_24h_at IS
  'When the 24h reminder should be sent. Computed as (appointment_date + appointment_time) AT TIME ZONE ''Europe/Warsaw'' minus 24h. Auto-updated by trigger.';
COMMENT ON COLUMN public.bookings.next_reminder_2h_at IS
  'When the 2h reminder should be sent. Computed as (appointment_date + appointment_time) AT TIME ZONE ''Europe/Warsaw'' minus 2h. Auto-updated by trigger.';

-- Trigger function: compute next_reminder_*_at from appointment_date + appointment_time in Europe/Warsaw
CREATE OR REPLACE FUNCTION public.compute_booking_reminder_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_warsaw TIMESTAMPTZ;
BEGIN
  -- Combine date + time as a Warsaw local timestamp, convert to UTC.
  -- AT TIME ZONE 'Europe/Warsaw' on a naive timestamp interprets it as local Warsaw time.
  v_appointment_warsaw := (NEW.appointment_date::text || ' ' || NEW.appointment_time::text)::timestamp
                          AT TIME ZONE 'Europe/Warsaw';

  NEW.next_reminder_24h_at := v_appointment_warsaw - INTERVAL '24 hours';
  NEW.next_reminder_2h_at  := v_appointment_warsaw - INTERVAL '2 hours';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_booking_reminder_schedule ON public.bookings;

CREATE TRIGGER trg_compute_booking_reminder_schedule
  BEFORE INSERT OR UPDATE OF appointment_date, appointment_time ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_booking_reminder_schedule();

-- Backfill existing rows
UPDATE public.bookings
   SET next_reminder_24h_at = ((appointment_date::text || ' ' || appointment_time::text)::timestamp
                               AT TIME ZONE 'Europe/Warsaw') - INTERVAL '24 hours',
       next_reminder_2h_at  = ((appointment_date::text || ' ' || appointment_time::text)::timestamp
                               AT TIME ZONE 'Europe/Warsaw') - INTERVAL '2 hours'
 WHERE next_reminder_24h_at IS NULL OR next_reminder_2h_at IS NULL;

-- Indexes for cron-driven SELECT (partial: only future-ish reminders)
CREATE INDEX IF NOT EXISTS idx_bookings_next_reminder_24h
  ON public.bookings (next_reminder_24h_at)
  WHERE status <> 'cancelled' AND reminder_opt_out = false;

CREATE INDEX IF NOT EXISTS idx_bookings_next_reminder_2h
  ON public.bookings (next_reminder_2h_at)
  WHERE status <> 'cancelled' AND reminder_opt_out = false;