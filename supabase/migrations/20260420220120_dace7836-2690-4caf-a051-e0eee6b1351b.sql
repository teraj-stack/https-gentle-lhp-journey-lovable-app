CREATE TABLE public.booking_reminder_opt_out_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  patient_email text NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  used_at timestamptz,
  used_by_ip text,
  used_by_ua text
);

CREATE INDEX idx_reminder_opt_out_tokens_token ON public.booking_reminder_opt_out_tokens (token);
CREATE INDEX idx_reminder_opt_out_tokens_booking ON public.booking_reminder_opt_out_tokens (booking_id);

ALTER TABLE public.booking_reminder_opt_out_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to reminder opt-out tokens"
ON public.booking_reminder_opt_out_tokens
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view reminder opt-out tokens"
ON public.booking_reminder_opt_out_tokens
FOR SELECT
TO authenticated
USING (has_role('admin'::app_role));