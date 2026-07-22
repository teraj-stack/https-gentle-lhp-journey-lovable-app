
ALTER TABLE public.web_vitals DROP CONSTRAINT web_vitals_metric_check;
ALTER TABLE public.web_vitals ADD CONSTRAINT web_vitals_metric_check
  CHECK (metric = ANY (ARRAY['LCP','INP','CLS','FCP','TTFB','FONTS_READY','FONTS_TO_LCP']));

CREATE OR REPLACE FUNCTION public.get_public_web_vitals_summary(p_days integer DEFAULT 7)
 RETURNS TABLE(metric text, p75 numeric, count bigint, good bigint, needs_improvement bigint, poor bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  FROM (VALUES ('LCP'),('INP'),('CLS'),('FCP'),('TTFB'),('FONTS_READY'),('FONTS_TO_LCP')) AS m(metric)
  LEFT JOIN filtered f ON f.metric = m.metric
  GROUP BY m.metric;
$function$;
