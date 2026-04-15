
-- 1. Drop all dependent policies first
DROP POLICY IF EXISTS "Admins can delete blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can insert blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can read all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can update blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete blog covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update blog covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload blog covers" ON storage.objects;

-- 2. Drop old function and create new one
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
  )
$$;

-- 3. Recreate all policies
CREATE POLICY "Admins can delete blog posts" ON public.blog_posts FOR DELETE TO authenticated USING (public.has_role('admin'::app_role));
CREATE POLICY "Admins can insert blog posts" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'::app_role));
CREATE POLICY "Admins can read all blog posts" ON public.blog_posts FOR SELECT TO authenticated USING (public.has_role('admin'::app_role));
CREATE POLICY "Admins can update blog posts" ON public.blog_posts FOR UPDATE TO authenticated USING (public.has_role('admin'::app_role)) WITH CHECK (public.has_role('admin'::app_role));

CREATE POLICY "Admins can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (public.has_role('admin'::app_role));
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.has_role('admin'::app_role));
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role('admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'::app_role));
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can delete blog covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-covers' AND public.has_role('admin'::app_role));
CREATE POLICY "Admins can update blog covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'blog-covers' AND public.has_role('admin'::app_role));
CREATE POLICY "Admins can upload blog covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-covers' AND public.has_role('admin'::app_role));
