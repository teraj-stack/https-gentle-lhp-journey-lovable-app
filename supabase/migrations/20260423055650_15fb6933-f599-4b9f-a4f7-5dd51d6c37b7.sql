-- Add explicit admin-only UPDATE policy on user_roles to harden against
-- privilege escalation. INSERT/DELETE are already admin-only; UPDATE was missing.
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));