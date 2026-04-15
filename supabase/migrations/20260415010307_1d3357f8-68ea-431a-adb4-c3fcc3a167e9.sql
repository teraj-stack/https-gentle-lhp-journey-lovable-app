
-- 1. Fix bookings INSERT: add field validation instead of bare WITH CHECK (true)
DROP POLICY "Anyone can insert bookings" ON public.bookings;

CREATE POLICY "Anyone can insert bookings with valid data"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  patient_name IS NOT NULL AND patient_name <> '' AND
  patient_email IS NOT NULL AND patient_email <> '' AND
  patient_phone IS NOT NULL AND patient_phone <> '' AND
  location IS NOT NULL AND location <> '' AND
  appointment_date IS NOT NULL AND
  appointment_time IS NOT NULL AND appointment_time <> ''
);

-- 2. Fix blog-covers storage: restrict to admins only
DROP POLICY "Authenticated users can upload blog covers" ON storage.objects;
DROP POLICY "Authenticated users can update blog covers" ON storage.objects;
DROP POLICY "Authenticated users can delete blog covers" ON storage.objects;

CREATE POLICY "Admins can upload blog covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-covers' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update blog covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blog-covers' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete blog covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'blog-covers' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
