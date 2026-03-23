
CREATE POLICY "Authenticated users can read all blog posts"
ON public.blog_posts
FOR SELECT
TO authenticated
USING (true);
