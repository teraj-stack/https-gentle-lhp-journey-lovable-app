
CREATE OR REPLACE FUNCTION public.get_public_web_vitals_summary(p_days integer DEFAULT 7)
RETURNS TABLE(
  metric TEXT,
  p75 NUMERIC,
  count BIGINT,
  good BIGINT,
  needs_improvement BIGINT,
  poor BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT metric, value, rating
    FROM public.web_vitals
    WHERE created_at >= now() - make_interval(days => GREATEST(1, LEAST(p_days, 90)))
  )
  SELECT
    m.metric,
    (percentile_cont(0.75) WITHIN GROUP (ORDER BY f.value))::NUMERIC AS p75,
    COUNT(f.value)::BIGINT AS count,
    COUNT(*) FILTER (WHERE f.rating = 'good')::BIGINT AS good,
    COUNT(*) FILTER (WHERE f.rating = 'needs-improvement')::BIGINT AS needs_improvement,
    COUNT(*) FILTER (WHERE f.rating = 'poor')::BIGINT AS poor
  FROM (VALUES ('LCP'),('INP'),('CLS'),('FCP'),('TTFB')) AS m(metric)
  LEFT JOIN filtered f ON f.metric = m.metric
  GROUP BY m.metric;
$$;

REVOKE ALL ON FUNCTION public.get_public_web_vitals_summary(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_web_vitals_summary(integer) TO anon, authenticated;
