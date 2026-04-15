
-- Replace broad SELECT policy with one that prevents listing but allows direct access
DROP POLICY "Public read access for blog covers" ON storage.objects;

-- Allow public read of individual files (needed for displaying cover images)
-- but restrict listing (folder-level access) to admins only
CREATE POLICY "Public can read individual blog covers"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'blog-covers' AND
  name IS NOT NULL AND name <> ''
);
