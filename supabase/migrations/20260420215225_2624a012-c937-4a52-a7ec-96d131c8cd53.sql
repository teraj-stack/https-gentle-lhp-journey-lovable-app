-- 1) Status history table
CREATE TABLE public.booking_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT,
  source TEXT NOT NULL DEFAULT 'system',
  note TEXT
);

CREATE INDEX idx_booking_status_history_booking_id_changed_at
  ON public.booking_status_history (booking_id, changed_at DESC);

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view booking status history"
  ON public.booking_status_history
  FOR SELECT
  TO authenticated
  USING (has_role('admin'::app_role));

CREATE POLICY "Service role full access to booking status history"
  ON public.booking_status_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2) Trigger: log every status change (and initial INSERT) to history
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (booking_id, old_status, new_status, changed_at, changed_by, source)
    VALUES (NEW.id, NULL, NEW.status, COALESCE(NEW.created_at, now()), NEW.status_changed_by, 'system');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_history (booking_id, old_status, new_status, changed_at, changed_by, source)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.status_changed_at, now()),
      NEW.status_changed_by,
      CASE
        WHEN NEW.status_changed_by IS NULL THEN 'system'
        WHEN NEW.status_changed_by ILIKE '%@%' THEN 'admin'
        ELSE 'system'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_booking_status_change
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_status_change();

-- 3) Backfill existing bookings:
--    a) Initial creation event (status = 'pending' assumed, using created_at)
--    b) If status_changed_at is set and current status != 'pending', add the latest known change
INSERT INTO public.booking_status_history (booking_id, old_status, new_status, changed_at, changed_by, source, note)
SELECT id, NULL, 'pending', created_at, NULL, 'system', 'backfill: created'
FROM public.bookings;

INSERT INTO public.booking_status_history (booking_id, old_status, new_status, changed_at, changed_by, source, note)
SELECT id, 'pending', status, status_changed_at, status_changed_by,
       CASE WHEN status_changed_by ILIKE '%@%' THEN 'admin' ELSE 'system' END,
       'backfill: latest known change'
FROM public.bookings
WHERE status_changed_at IS NOT NULL
  AND status <> 'pending';