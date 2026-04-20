ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS reminder_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.reminder_opt_out IS
'Gdy TRUE, send-booking-reminders i send-booking-reminders-2h pomijają tę rezerwację.';