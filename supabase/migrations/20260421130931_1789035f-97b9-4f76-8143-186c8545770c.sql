-- RPC: top rate-limited IPs across all endpoints + windows in the last hour.
-- "Denied" = sum(count - limit) for buckets that exceeded the per-endpoint limit.
-- Limits hardcoded to match shared/rate-limit.ts consumer config:
--   handle-email-unsubscribe       10/60s
--   handle-reminder-opt-out        10/60s
--   verify-turnstile               30/60s
--   preview-transactional-email    10/60s
-- Unknown endpoints fall back to DEFAULT_RATE_LIMIT (10).
CREATE OR REPLACE FUNCTION public.get_top_rate_limited_ips(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  endpoint TEXT,
  ip TEXT,
  denied BIGINT,
  hits BIGINT,
  windows BIGINT,
  last_window TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH limits(endpoint, max_per_window) AS (
    VALUES
      ('handle-email-unsubscribe',    10),
      ('handle-reminder-opt-out',     10),
      ('verify-turnstile',            30),
      ('preview-transactional-email', 10)
  ),
  joined AS (
    SELECT
      b.endpoint,
      b.ip,
      b.count,
      b.window_start,
      COALESCE(l.max_per_window, 10) AS max_per_window
    FROM public.rate_limit_buckets b
    LEFT JOIN limits l ON l.endpoint = b.endpoint
  )
  SELECT
    j.endpoint,
    j.ip,
    SUM(GREATEST(0, j.count - j.max_per_window))::BIGINT AS denied,
    SUM(j.count)::BIGINT                                  AS hits,
    COUNT(*)::BIGINT                                      AS windows,
    MAX(j.window_start)                                   AS last_window
  FROM joined j
  WHERE j.count > j.max_per_window
  GROUP BY j.endpoint, j.ip
  ORDER BY denied DESC, hits DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_top_rate_limited_ips(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_rate_limited_ips(INTEGER) TO authenticated;