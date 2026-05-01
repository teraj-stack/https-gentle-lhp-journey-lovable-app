CREATE TABLE IF NOT EXISTS public.seo_redirects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT seo_redirects_from_path_unique UNIQUE (from_path)
);

CREATE INDEX IF NOT EXISTS seo_redirects_from_active_idx
  ON public.seo_redirects (from_path) WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.validate_seo_redirect()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.from_path !~ '^/' THEN
    RAISE EXCEPTION 'from_path musi zaczynać się od "/" (otrzymano: %)', NEW.from_path;
  END IF;
  IF NEW.to_path !~ '^/' AND NEW.to_path !~ '^https?://' THEN
    RAISE EXCEPTION 'to_path musi być ścieżką lub absolute URL (otrzymano: %)', NEW.to_path;
  END IF;
  IF NEW.from_path = NEW.to_path THEN
    RAISE EXCEPTION 'from_path nie może być równe to_path (self-redirect)';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_seo_redirect_trigger ON public.seo_redirects;
CREATE TRIGGER validate_seo_redirect_trigger
  BEFORE INSERT OR UPDATE ON public.seo_redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_seo_redirect();

ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active seo_redirects"
  ON public.seo_redirects
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can read all seo_redirects"
  ON public.seo_redirects
  FOR SELECT
  TO authenticated
  USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can insert seo_redirects"
  ON public.seo_redirects
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role('admin'::app_role));

CREATE POLICY "Admins can update seo_redirects"
  ON public.seo_redirects
  FOR UPDATE
  TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));

CREATE POLICY "Admins can delete seo_redirects"
  ON public.seo_redirects
  FOR DELETE
  TO authenticated
  USING (public.has_role('admin'::app_role));