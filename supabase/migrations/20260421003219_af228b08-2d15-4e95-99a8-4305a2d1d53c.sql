-- Table for logging suspicious token validation attempts
CREATE TABLE public.token_validation_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('invalid_token', 'rate_limited', 'expired', 'already_used')),
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast brute-force detection queries
CREATE INDEX idx_tvf_ip_created ON public.token_validation_failures (ip, created_at DESC);
CREATE INDEX idx_tvf_created ON public.token_validation_failures (created_at DESC);
CREATE INDEX idx_tvf_reason_created ON public.token_validation_failures (reason, created_at DESC);

-- RLS
ALTER TABLE public.token_validation_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to token validation failures"
  ON public.token_validation_failures
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view token validation failures"
  ON public.token_validation_failures
  FOR SELECT
  TO authenticated
  USING (has_role('admin'::app_role));

-- View: IPs with >=10 failures in last 10 minutes (alert threshold)
CREATE OR REPLACE VIEW public.recent_token_abuse_ips
WITH (security_invoker = on)
AS
SELECT
  ip,
  COUNT(*)::int AS failure_count,
  COUNT(*) FILTER (WHERE reason = 'invalid_token')::int AS invalid_token_count,
  COUNT(*) FILTER (WHERE reason = 'rate_limited')::int AS rate_limited_count,
  COUNT(*) FILTER (WHERE reason = 'expired')::int AS expired_count,
  COUNT(*) FILTER (WHERE reason = 'already_used')::int AS already_used_count,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen,
  array_agg(DISTINCT endpoint) AS endpoints,
  (array_agg(user_agent ORDER BY created_at DESC))[1] AS last_user_agent
FROM public.token_validation_failures
WHERE created_at > now() - interval '10 minutes'
  AND ip IS NOT NULL
GROUP BY ip
HAVING COUNT(*) >= 10
ORDER BY failure_count DESC, last_seen DESC;

-- Cleanup function: delete entries older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_token_failures()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.token_validation_failures
  WHERE created_at < (now() - interval '30 days');
END;
$$;