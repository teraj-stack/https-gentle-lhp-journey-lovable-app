-- Sync the CTE in get_top_rate_limited_ips with RATE_LIMITS in
-- supabase/functions/_shared/rate-limit.ts (single source of truth in TS).
-- Adds on-booking-created (60/min) which was missing from the CTE.
CREATE OR REPLACE FUNCTION public.get_top_rate_limited_ips(p_limit integer DEFAULT 10)
 RETURNS TABLE(endpoint text, ip text, denied bigint, hits bigint, windows bigint, last_window timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH limits(endpoint, max_per_window) AS (
    -- Keep in sync with RATE_LIMITS in supabase/functions/_shared/rate-limit.ts
    VALUES
      ('handle-email-unsubscribe',    10),
      ('handle-reminder-opt-out',     10),
      ('preview-transactional-email', 10),
      ('verify-turnstile',            30),
      ('on-booking-created',          60)
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
$function$;