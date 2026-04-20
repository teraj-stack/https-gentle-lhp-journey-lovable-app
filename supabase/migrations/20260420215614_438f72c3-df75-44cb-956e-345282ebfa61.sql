-- Enable realtime for bookings: full row data on UPDATE/DELETE + add to publication
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add to publication (idempotent: ignore if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;