-- Remove the Siedlce / Beauty & Mind notification recipient after the location was removed from the website.
DELETE FROM public.notification_recipients
WHERE location_match = 'siedlce'
  AND location_label ILIKE '%Siedlce%';