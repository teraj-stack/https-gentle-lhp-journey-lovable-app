CREATE TABLE public.web_vitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric TEXT NOT NULL CHECK (metric IN ('LCP','INP','CLS','FCP','TTFB')),
  value NUMERIC NOT NULL CHECK (value >= 0 AND value < 1e7),
  rating TEXT NOT NULL CHECK (rating IN ('good','needs-improvement','poor')),
  path TEXT NOT NULL CHECK (char_length(path) <= 500),
  navigation_type TEXT CHECK (navigation_type IS NULL OR char_length(navigation_type) <= 40),
  connection TEXT CHECK (connection IS NULL OR char_length(connection) <= 40),
  user_agent TEXT CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.web_vitals TO anon, authenticated;
GRANT SELECT ON public.web_vitals TO authenticated;
GRANT ALL ON public.web_vitals TO service_role;

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert web vitals"
  ON public.web_vitals FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read web vitals"
  ON public.web_vitals FOR SELECT
  TO authenticated
  USING (public.has_role('admin'::app_role));

CREATE INDEX idx_web_vitals_metric_created ON public.web_vitals (metric, created_at DESC);
CREATE INDEX idx_web_vitals_path_created ON public.web_vitals (path, created_at DESC);