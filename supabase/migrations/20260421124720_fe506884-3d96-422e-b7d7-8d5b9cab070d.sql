-- ============================================================
-- DB-backed rate limiting (cross-isolate, atomic).
-- Replaces in-memory checkRateLimit() in shared/rate-limit.ts.
-- ============================================================

CREATE TABLE public.rate_limit_buckets (
  endpoint TEXT NOT NULL,
  ip TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (endpoint, ip, window_start)
);

-- Index used by cleanup cron (DELETE WHERE window_start < cutoff).
CREATE INDEX idx_rate_limit_buckets_window_start
  ON public.rate_limit_buckets (window_start);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Only service_role can touch the table; RPC runs as SECURITY DEFINER so
-- edge functions don't need direct table grants.
CREATE POLICY "Service role full access to rate_limit_buckets"
  ON public.rate_limit_buckets
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view rate_limit_buckets"
  ON public.rate_limit_buckets
  FOR SELECT
  TO authenticated
  USING (has_role('admin'::app_role));

-- ============================================================
-- check_and_increment_rate_limit
-- Fixed-window per (endpoint, ip). Atomic UPSERT.
-- Returns: allowed, remaining, retry_after_sec, current_count.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_endpoint TEXT,
  p_ip TEXT,
  p_max INTEGER,
  p_window_sec INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  retry_after_sec INTEGER,
  current_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Bucket the current second into a fixed window of size p_window_sec.
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_sec) * p_window_sec
  );
  v_window_end := v_window_start + make_interval(secs => p_window_sec);

  -- Atomic increment-or-insert. The PRIMARY KEY guarantees one row per
  -- (endpoint, ip, window_start) across all isolates.
  INSERT INTO public.rate_limit_buckets (endpoint, ip, window_start, count)
  VALUES (p_endpoint, p_ip, v_window_start, 1)
  ON CONFLICT (endpoint, ip, window_start)
  DO UPDATE SET count = public.rate_limit_buckets.count + 1
  RETURNING public.rate_limit_buckets.count INTO v_count;

  IF v_count > p_max THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_window_end - now())))::INTEGER),
      v_count;
  ELSE
    RETURN QUERY SELECT
      TRUE,
      GREATEST(0, p_max - v_count),
      0,
      v_count;
  END IF;
END;
$$;

-- ============================================================
-- Cleanup: pg_cron-triggered DELETE of windows older than 1 hour.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_buckets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_buckets
  WHERE window_start < (now() - interval '1 hour');
END;
$$;