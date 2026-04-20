---
name: admin-bookings-filters
description: Filtry w /admin/bookings — Status select, Lokalizacja select (4 kliniki, substring match), date range picker (Dzisiaj/Tydzień/Wszystkie/Custom), URL query params persistence
type: feature
---
Strona /admin/bookings ma trzy filtry z URL persistence (`?status=&location=&datePreset=&from=&to=`):

- **Status** (select): all (default) / pending / confirmed / needs_contact / cancelled / completed. Push do Supabase query (`.eq('status', ...)`).
- **Lokalizacja** (select): all (default) / wilanow / fimedica / siedlce / rzeszow. Każda opcja ma listę match patterns (np. wilanow → ['wilanow','wilanów','branickiego']) — filtr aplikowany **po stronie klienta** bo `bookings.location` to free text. Wzorce zsynchronizowane z `send-booking-reminders` edge function.
- **Zakres dat** (select + opcjonalnie 2 date pickery): Dzisiaj (default) / Najbliższe 7 dni / Wszystkie / Custom. Custom otwiera dwa Popover+Calendar (Od/Do) z `pointer-events-auto` i locale `pl`. Push do Supabase query (`.gte('appointment_date',from).lte(..to)`). Floor query at -30d niezależnie od wyboru.

Komponent `src/components/admin/AdminBookingsFilters.tsx` eksportuje `BookingFilters`, `DEFAULT_FILTERS`, `filtersFromSearchParams`, `filtersToSearchParams`, `resolveDateRange`, `matchesLocation`. Page używa `useSearchParams` jako single source of truth — `setFilters` robi `setSearchParams(..., {replace: true})`. Pusty stan rozróżnia "0 bookings w DB" vs "filtr lokalizacji nic nie pasuje".

Liczniki "Razem / Oczekujące" oraz reminder badges liczą się od `filteredBookings`. Reminder/tokens query nadal używa pełnego `bookings` (nie ma sensu refetchować logów per filtr). Przycisk "Wyczyść" wraca do DEFAULT_FILTERS i czyści URL params.
