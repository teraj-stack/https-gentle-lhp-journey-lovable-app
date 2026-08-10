ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_interval_days integer NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS needs_medical_review boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS blog_posts_scheduled_at_idx ON public.blog_posts (scheduled_at);

DROP POLICY IF EXISTS "Anyone can read published blog posts" ON public.blog_posts;

CREATE POLICY "Anyone can read published blog posts"
ON public.blog_posts
FOR SELECT
TO anon, authenticated
USING (
  published = true
  AND (scheduled_at IS NULL OR scheduled_at <= now())
);