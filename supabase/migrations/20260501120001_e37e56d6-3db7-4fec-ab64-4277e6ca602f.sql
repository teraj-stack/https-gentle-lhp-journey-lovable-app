-- Tabela do logowania trafień w SEO redirects i 404 (analityka literówek)
CREATE TABLE public.seo_redirect_hits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('redirect', 'not_found', 'suggested')),
  from_path TEXT NOT NULL,
  to_path TEXT,
  referrer TEXT,
  search TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_redirect_hits_from ON public.seo_redirect_hits(from_path);
CREATE INDEX idx_seo_redirect_hits_kind_created ON public.seo_redirect_hits(kind, created_at DESC);
CREATE INDEX idx_seo_redirect_hits_created ON public.seo_redirect_hits(created_at DESC);

ALTER TABLE public.seo_redirect_hits ENABLE ROW LEVEL SECURITY;

-- Każdy (anon i authenticated) może wstawiać hity — to publiczna analityka ruchu.
CREATE POLICY "Anyone can insert redirect hits"
ON public.seo_redirect_hits
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Tylko admini widzą surowe dane (zawierają user_agent/referrer = potencjalnie wrażliwe).
CREATE POLICY "Admins can read redirect hits"
ON public.seo_redirect_hits
FOR SELECT
TO authenticated
USING (has_role('admin'::app_role));

CREATE POLICY "Admins can delete redirect hits"
ON public.seo_redirect_hits
FOR DELETE
TO authenticated
USING (has_role('admin'::app_role));

CREATE POLICY "Service role full access redirect hits"
ON public.seo_redirect_hits
FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);