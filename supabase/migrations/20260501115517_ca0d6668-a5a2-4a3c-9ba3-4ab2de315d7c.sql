CREATE OR REPLACE FUNCTION public.validate_seo_redirect()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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