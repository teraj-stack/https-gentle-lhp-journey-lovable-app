-- Dodaj kolumnę location_match_patterns (tablica aliasów) do notification_recipients
ALTER TABLE public.notification_recipients
ADD COLUMN IF NOT EXISTS location_match_patterns text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Backfill: skopiuj istniejący location_match jako pierwszy element tablicy
UPDATE public.notification_recipients
SET location_match_patterns = ARRAY[location_match]
WHERE location_match IS NOT NULL
  AND location_match <> ''
  AND (location_match_patterns IS NULL OR cardinality(location_match_patterns) = 0);

-- Indeks GIN dla szybkiego wyszukiwania po elemencie tablicy
CREATE INDEX IF NOT EXISTS idx_notification_recipients_match_patterns
ON public.notification_recipients
USING GIN (location_match_patterns);