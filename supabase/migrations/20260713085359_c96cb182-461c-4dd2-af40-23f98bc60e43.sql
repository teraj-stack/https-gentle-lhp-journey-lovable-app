-- Revoke public/anon EXECUTE on SECURITY DEFINER functions that must not be callable from the anon Data API.
-- All of these are used by triggers, cron jobs, or edge functions (service_role), never by the browser.

REVOKE EXECUTE ON FUNCTION public.cleanup_old_bookings()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_buckets()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_token_failures()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_booking_reminder_schedule()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake()                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_vein_image_override_history()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_rate_limited_ips(integer)         FROM PUBLIC, anon, authenticated;

-- has_role() is referenced inside RLS policies for authenticated users — keep EXECUTE for authenticated, revoke from anon.
REVOKE EXECUTE ON FUNCTION public.has_role(app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(app_role) TO authenticated, service_role;

-- Ensure service_role can still invoke maintenance/queue helpers from edge functions and cron.
GRANT EXECUTE ON FUNCTION public.cleanup_old_bookings()                    TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_buckets()              TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_token_failures()              TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)    TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)                TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer)  TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint)                TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch()                    TO service_role;
GRANT EXECUTE ON FUNCTION public.get_top_rate_limited_ips(integer)         TO service_role;
-- compute_booking_reminder_schedule, email_queue_wake, log_vein_image_override_history are trigger-only — no direct callers.