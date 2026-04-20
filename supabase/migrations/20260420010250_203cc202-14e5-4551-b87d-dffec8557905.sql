-- 1) CHECK constraint na format emaila (immutable regex, bezpieczne dla CHECK)
--    Wzorzec spójny z EMAIL_REGEX w edge functions.
ALTER TABLE public.notification_recipients
DROP CONSTRAINT IF EXISTS notification_recipients_email_format;

ALTER TABLE public.notification_recipients
ADD CONSTRAINT notification_recipients_email_format
CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

-- 2) Unique constraint na (role, email, location_match)
--    UWAGA: NULL w UNIQUE jest traktowany jako różny od NULL, więc dwa wpisy
--    globalne (location_match=NULL) z tą samą rolą+emailem przeszły by walidację.
--    Rozwiązanie: dwa partial unique indexy.

-- (a) Wpisy z konkretnym dopasowaniem lokalizacji
DROP INDEX IF EXISTS public.uniq_notification_recipients_role_email_match;
CREATE UNIQUE INDEX uniq_notification_recipients_role_email_match
ON public.notification_recipients (role, lower(email), lower(location_match))
WHERE location_match IS NOT NULL;

-- (b) Wpisy globalne (location_match IS NULL) — unikalność per (role, email)
DROP INDEX IF EXISTS public.uniq_notification_recipients_role_email_global;
CREATE UNIQUE INDEX uniq_notification_recipients_role_email_global
ON public.notification_recipients (role, lower(email))
WHERE location_match IS NULL;