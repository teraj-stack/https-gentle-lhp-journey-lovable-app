
-- Function to delete bookings older than 6 months
CREATE OR REPLACE FUNCTION public.cleanup_old_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.bookings
  WHERE appointment_date < (CURRENT_DATE - INTERVAL '6 months');
END;
$$;
