
-- 1) Revoke public/anon/authenticated execute on the SECURITY DEFINER summary function.
REVOKE EXECUTE ON FUNCTION public.get_public_web_vitals_summary(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_web_vitals_summary(integer) TO service_role;

-- 2) Replace permissive INSERT policy on web_vitals with an explicit validation.
DROP POLICY IF EXISTS "Anyone can insert web vitals" ON public.web_vitals;

CREATE POLICY "Anyone can insert web vitals"
  ON public.web_vitals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    metric = ANY (ARRAY['LCP','INP','CLS','FCP','TTFB','FONTS_READY','FONTS_TO_LCP'])
    AND rating = ANY (ARRAY['good','needs-improvement','poor'])
    AND value >= 0 AND value < 10000000
    AND char_length(path) BETWEEN 1 AND 500
    AND (navigation_type IS NULL OR char_length(navigation_type) <= 40)
    AND (connection IS NULL OR char_length(connection) <= 40)
    AND (user_agent IS NULL OR char_length(user_agent) <= 500)
  );
