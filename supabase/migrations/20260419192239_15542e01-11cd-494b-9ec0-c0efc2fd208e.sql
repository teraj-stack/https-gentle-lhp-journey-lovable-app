-- Enum dla typów akcji recepcji
CREATE TYPE public.booking_action_type AS ENUM ('confirm', 'cancel', 'needs_contact');

-- Tabela tokenów jednorazowych dla one-click action linków
CREATE TABLE public.booking_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  action public.booking_action_type NOT NULL,
  token text NOT NULL UNIQUE,
  recipient_email text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  used_by_email text,
  used_by_ip text,
  used_by_ua text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_action_tokens IS
  'Tokeny one-click do potwierdzania/odwoływania rezerwacji z maila booking-notification. Generowane per (booking, action, recipient). Ważne 7 dni, jednorazowe.';
COMMENT ON COLUMN public.booking_action_tokens.action IS
  'confirm = potwierdź wizytę; cancel = odwołaj; needs_contact = wymaga kontaktu z pacjentem.';
COMMENT ON COLUMN public.booking_action_tokens.recipient_email IS
  'Email odbiorcy maila, dla którego wygenerowano token (audyt — kto dostał link).';
COMMENT ON COLUMN public.booking_action_tokens.used_by_email IS
  'Email recepcji która kliknęła link (z formularza potwierdzenia). Może różnić się od recipient_email gdy mail był forwardowany.';

-- Indeksy
CREATE INDEX idx_booking_action_tokens_booking ON public.booking_action_tokens (booking_id);
CREATE INDEX idx_booking_action_tokens_expires ON public.booking_action_tokens (expires_at) WHERE used_at IS NULL;

-- Rozszerzenie tabeli bookings o metadane zmiany statusu
ALTER TABLE public.bookings
  ADD COLUMN status_changed_at timestamp with time zone,
  ADD COLUMN status_changed_by text;

COMMENT ON COLUMN public.bookings.status_changed_at IS
  'Kiedy ostatnio zmieniono status (kliknięcie linku przez recepcję LUB zmiana z /admin).';
COMMENT ON COLUMN public.bookings.status_changed_by IS
  'Email recepcji/admina która zmieniła status. NULL dla statusu początkowego "pending".';

-- Walidacja dozwolonych statusów (trigger zamiast CHECK żeby móc rozszerzać w przyszłości)
CREATE OR REPLACE FUNCTION public.validate_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed', 'cancelled', 'needs_contact', 'completed') THEN
    RAISE EXCEPTION 'Invalid booking status: %. Allowed: pending, confirmed, cancelled, needs_contact, completed.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_booking_status
BEFORE INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_status();

-- Auto-update status_changed_at gdy status faktycznie się zmienia (UPDATE only)
CREATE OR REPLACE FUNCTION public.touch_booking_status_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_booking_status_changed_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.touch_booking_status_changed_at();

-- RLS na booking_action_tokens
ALTER TABLE public.booking_action_tokens ENABLE ROW LEVEL SECURITY;

-- Service role: pełen dostęp (edge function generuje + waliduje tokeny)
CREATE POLICY "Service role full access to booking action tokens"
ON public.booking_action_tokens FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Admin: tylko podgląd (audyt z /admin)
CREATE POLICY "Admins can view booking action tokens"
ON public.booking_action_tokens FOR SELECT
TO authenticated
USING (public.has_role('admin'::app_role));