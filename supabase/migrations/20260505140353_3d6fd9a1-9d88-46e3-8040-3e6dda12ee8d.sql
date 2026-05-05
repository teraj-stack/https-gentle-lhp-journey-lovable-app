
-- 1. Fix permissive RLS on seo_redirect_hits (anon INSERT with `true`)
DROP POLICY IF EXISTS "Anyone can insert redirect hits" ON public.seo_redirect_hits;

-- 2. Revoke EXECUTE on internal SECURITY DEFINER functions from public roles.
REVOKE EXECUTE ON FUNCTION public.cleanup_old_bookings()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_token_failures()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_buckets()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_booking_reminder_schedule()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_vein_image_override_history()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer)
                                                                                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_rate_limited_ips(integer)            FROM PUBLIC, anon, authenticated;

-- has_role() must remain callable by authenticated (used in client-side admin checks
-- via supabase.rpc('has_role')) and from RLS policy contexts.
REVOKE EXECUTE ON FUNCTION public.has_role(public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;

-- get_top_rate_limited_ips is consumed by the admin dashboard.
GRANT EXECUTE ON FUNCTION public.get_top_rate_limited_ips(integer) TO authenticated;
