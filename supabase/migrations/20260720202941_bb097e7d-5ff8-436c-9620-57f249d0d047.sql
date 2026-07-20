GRANT EXECUTE ON FUNCTION public.get_top_rate_limited_ips(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer) TO authenticated;