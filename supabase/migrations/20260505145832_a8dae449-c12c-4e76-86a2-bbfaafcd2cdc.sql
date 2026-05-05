DROP POLICY IF EXISTS "Admins can read suppressed emails" ON public.suppressed_emails;

CREATE POLICY "Admins can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));
