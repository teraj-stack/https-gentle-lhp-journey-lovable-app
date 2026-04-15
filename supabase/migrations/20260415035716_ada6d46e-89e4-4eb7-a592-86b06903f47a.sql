DROP POLICY "Anyone can insert bookings with valid data" ON public.bookings;

CREATE POLICY "Service role can insert bookings"
ON public.bookings
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');