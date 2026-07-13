---
name: Booking Location Matching
description: Matchowanie pola location z rezerwacji na recepcję w on-booking-created — wymaga normalizacji NFD do obsługi polskich diakrytyków
type: feature
---

`supabase/functions/on-booking-created/index.ts → resolveLocation()` matchuje pole `bookings.location` na `notification_recipients.location_match` (np. "wilanow") przez `String.includes()`.

**KRYTYCZNE**: oba stringi muszą być znormalizowane przez `stripDiacritics()` (NFD + usunięcie znaków `\u0300-\u036f`). W przeciwnym razie "Wilanów" NIE matchuje "wilanow" — recepcja nie dostaje notyfikacji, a webhook zwraca `receptionEmail: null` mimo że wpis istnieje w DB.

Pole `location_match` w `notification_recipients` jest celowo trzymane jako ASCII (lowercase, bez diakrytyków) — funkcja musi normalizować input przed porównaniem.

Aktualnie obsługiwana lokalizacja: **Warszawa Wilanów** (jedyna). Globalni odbiorcy (biuro@cml.pl, dr.bujok@cml.pl) muszą zawsze być w `globalRecipients`.
