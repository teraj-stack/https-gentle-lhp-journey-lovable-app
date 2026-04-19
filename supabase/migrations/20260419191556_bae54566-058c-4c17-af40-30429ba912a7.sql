ALTER TABLE public.bookings
ADD COLUMN cc_emails text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.bookings.cc_emails IS
  'Dodatkowi odbiorcy powiadomienia booking-notification dodawani per-rezerwację z panelu admin (np. asystent zabiegowy danego dnia). Dołączani do recepcji + biuro@cml.pl + dr.bujok@cml.pl, deduplikowani i walidowani po stronie edge function on-booking-created.';