---
name: Booking Location Matching
description: Matchowanie pola location z rezerwacji na recepcję w on-booking-created — wymaga normalizacji NFD do obsługi polskich diakrytyków
type: feature
---

`supabase/functions/on-booking-created/index.ts → resolveLocation()` matchuje pole `bookings.location` na `notification_recipients.location_match` (np. "wilanow", "rzeszow", "fimedica", "siedlce") przez `String.includes()`.

**KRYTYCZNE**: oba stringi muszą być znormalizowane przez `stripDiacritics()` (NFD + usunięcie znaków `\u0300-\u036f`). W przeciwnym razie "Wilanów" NIE matchuje "wilanow", a "Rzeszów" NIE matchuje "rzeszow" — recepcja nie dostaje notyfikacji, a webhook zwraca `receptionEmail: null` mimo że wpis istnieje w DB.

Pole `location_match` w `notification_recipients` jest celowo trzymane jako ASCII (lowercase, bez diakrytyków) — funkcja musi normalizować input przed porównaniem.

Pokrycie testowe: ręczny test E2E przez `curl on-booking-created` × 4 lokalizacje (Wilanów/Fimedica/Siedlce/Rzeszów) — wszystkie 4 muszą zwrócić niepusty `receptionEmail` w odpowiedzi i wpis `staff:<reception>:ok` w `results`. Globalni odbiorcy (biuro@cml.pl, dr.bujok@cml.pl) muszą zawsze być w `globalRecipients`.
