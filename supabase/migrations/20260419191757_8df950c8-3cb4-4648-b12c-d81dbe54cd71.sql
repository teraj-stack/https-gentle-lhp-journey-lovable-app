-- Enum dla roli odbiorcy powiadomienia
CREATE TYPE public.notification_recipient_role AS ENUM ('reception', 'hq', 'doctor');

-- Tabela mapowania odbiorców powiadomień booking-notification
CREATE TABLE public.notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_match text,
  location_label text,
  email text NOT NULL,
  role public.notification_recipient_role NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_recipients IS
  'Mapowanie lokalizacja → recepcja + globalni odbiorcy HQ/lekarz dla edge function on-booking-created. Zarządzane z /admin zamiast hardkodowane w kodzie.';
COMMENT ON COLUMN public.notification_recipients.location_match IS
  'Fragment lokalizacji do dopasowania case-insensitive (np. "wilanow"). NULL/pusty = odbiorca globalny (zawsze CC, niezależnie od lokalizacji).';
COMMENT ON COLUMN public.notification_recipients.location_label IS
  'Czytelna etykieta lokalizacji wyświetlana w treści maila (np. "Warszawa Wilanów (ul. Adama Branickiego 10/U6)").';
COMMENT ON COLUMN public.notification_recipients.role IS
  'reception = recepcja konkretnej lokalizacji; hq = biuro główne (zawsze CC); doctor = lekarz prowadzący (zawsze CC).';

-- Indeks pomagający w lookupie po location_match (case-insensitive substring matching robione w kodzie)
CREATE INDEX idx_notification_recipients_enabled ON public.notification_recipients (enabled) WHERE enabled = true;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_notification_recipients_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notification_recipients_updated_at
BEFORE UPDATE ON public.notification_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_recipients_updated_at();

-- RLS
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- Admin: pełen dostęp
CREATE POLICY "Admins can view notification recipients"
ON public.notification_recipients FOR SELECT
TO authenticated
USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can insert notification recipients"
ON public.notification_recipients FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin'::app_role));

CREATE POLICY "Admins can update notification recipients"
ON public.notification_recipients FOR UPDATE
TO authenticated
USING (public.has_role('admin'::app_role))
WITH CHECK (public.has_role('admin'::app_role));

CREATE POLICY "Admins can delete notification recipients"
ON public.notification_recipients FOR DELETE
TO authenticated
USING (public.has_role('admin'::app_role));

-- Service role: pełen dostęp (edge function)
CREATE POLICY "Service role full access to notification recipients"
ON public.notification_recipients FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Seed: aktualne mapowanie z edge function on-booking-created
INSERT INTO public.notification_recipients (location_match, location_label, email, role, notes) VALUES
  ('wilanow',   'Warszawa Wilanów (ul. Adama Branickiego 10/U6)', 'warszawa@cml.pl',       'reception', 'Recepcja Wilanów. Dopasowanie też do "wilanów", "branickiego", "warszawa-wilanow".'),
  ('fimedica',  'Fimedica – Warszawa (ul. Giełdowa 5)',           'fimedica@fimedica.pl',  'reception', 'Recepcja Fimedica. Dopasowanie też do "gieldowa", "giełdowa".'),
  ('siedlce',   'Beauty & Mind – Siedlce (ul. Brzeska 125)',      'siedlce@cml.pl',        'reception', 'Recepcja Siedlce. Dopasowanie też do "beauty-and-mind", "beauty", "brzeska".'),
  ('rzeszow',   'IP Cliniq – Rzeszów (al. Rejtana 53)',           'recepcja@ipcliniq.pl',  'reception', 'Recepcja Rzeszów. Dopasowanie też do "rzeszów", "ipcliniq", "ip-cliniq", "rejtana".'),
  (NULL, NULL, 'biuro@cml.pl',    'hq',     'Biuro główne — zawsze CC dla każdej rezerwacji.'),
  (NULL, NULL, 'dr.bujok@cml.pl', 'doctor', 'Lekarz prowadzący — zawsze CC dla każdej rezerwacji.');