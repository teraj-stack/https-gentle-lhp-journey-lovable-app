
ALTER TABLE public.security_checklist_items
ADD COLUMN IF NOT EXISTS policies JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Seed policies for existing baseline items.
UPDATE public.security_checklist_items SET policies = '[
  {"name":"Admins can view all bookings","table":"bookings","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Admins can update bookings","table":"bookings","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Admins can delete bookings","table":"bookings","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Service role can insert bookings","table":"bookings","sql":"WITH CHECK (auth.role() = ''service_role'')"}
]'::jsonb WHERE slug = 'rls-bookings';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"Admins can view all roles","table":"user_roles","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Admins can insert roles","table":"user_roles","sql":"WITH CHECK (has_role(''admin''::app_role))"},
  {"name":"Admins can update roles","table":"user_roles","sql":"USING (has_role(''admin''::app_role)) WITH CHECK (has_role(''admin''::app_role))"},
  {"name":"Admins can delete roles","table":"user_roles","sql":"USING (has_role(''admin''::app_role))"}
]'::jsonb WHERE slug = 'rls-user-roles';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"Admins can view booking action tokens","table":"booking_action_tokens","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Service role full access to booking action tokens","table":"booking_action_tokens","sql":"USING (auth.role() = ''service_role'')"}
]'::jsonb WHERE slug = 'rls-tokens-action';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"Admins can view reminder opt-out tokens","table":"booking_reminder_opt_out_tokens","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Service role full access to reminder opt-out tokens","table":"booking_reminder_opt_out_tokens","sql":"USING (auth.role() = ''service_role'')"}
]'::jsonb WHERE slug = 'rls-tokens-optout';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"Admins can view booking status history","table":"booking_status_history","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Service role full access to booking status history","table":"booking_status_history","sql":"USING (auth.role() = ''service_role'')"}
]'::jsonb WHERE slug = 'rls-status-history';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"Admins can read email send log","table":"email_send_log","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Service role can read send log","table":"email_send_log","sql":"USING (auth.role() = ''service_role'')"}
]'::jsonb WHERE slug = 'rls-email-log';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"Admins can view notification recipients","table":"notification_recipients","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Admins can insert notification recipients","table":"notification_recipients","sql":"WITH CHECK (has_role(''admin''::app_role))"},
  {"name":"Admins can update notification recipients","table":"notification_recipients","sql":"USING (has_role(''admin''::app_role)) WITH CHECK (has_role(''admin''::app_role))"},
  {"name":"Admins can delete notification recipients","table":"notification_recipients","sql":"USING (has_role(''admin''::app_role))"}
]'::jsonb WHERE slug = 'rls-notification-recipients';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"Anyone can read published blog posts","table":"blog_posts","sql":"USING (published = true)"},
  {"name":"Admins can read all blog posts","table":"blog_posts","sql":"USING (has_role(''admin''::app_role))"},
  {"name":"Admins can insert blog posts","table":"blog_posts","sql":"WITH CHECK (has_role(''admin''::app_role))"},
  {"name":"Admins can update blog posts","table":"blog_posts","sql":"USING (has_role(''admin''::app_role)) WITH CHECK (has_role(''admin''::app_role))"},
  {"name":"Admins can delete blog posts","table":"blog_posts","sql":"USING (has_role(''admin''::app_role))"}
]'::jsonb WHERE slug = 'rls-blog';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"postgres_changes (RLS-enforced)","table":"bookings","sql":"-- Realtime via postgres_changes inherits the source table''s SELECT policies.\n-- See: Admins can view all bookings"}
]'::jsonb WHERE slug = 'realtime-bookings';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"public.has_role(_role app_role)","table":"function","sql":"CREATE OR REPLACE FUNCTION public.has_role(_role app_role)\nRETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER\nSET search_path TO ''public'' AS $$\n  SELECT EXISTS (\n    SELECT 1 FROM public.user_roles\n    WHERE user_id = auth.uid() AND role = _role\n  )\n$$;"}
]'::jsonb WHERE slug = 'auth-rbac';

UPDATE public.security_checklist_items SET policies = '[
  {"name":"public.check_and_increment_rate_limit(...)","table":"function","sql":"-- Atomic INSERT ... ON CONFLICT increment per (endpoint, ip, window_start).\n-- Used by edge functions: handle-email-unsubscribe, handle-reminder-opt-out,\n-- preview-transactional-email, verify-turnstile, on-booking-created."},
  {"name":"Service role full access to rate_limit_buckets","table":"rate_limit_buckets","sql":"USING (auth.role() = ''service_role'')"}
]'::jsonb WHERE slug = 'auth-rate-limit';
