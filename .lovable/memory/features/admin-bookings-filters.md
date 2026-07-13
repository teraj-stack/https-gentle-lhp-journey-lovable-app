---
name: admin-bookings-filters
description: Filtry w /admin/bookings — Status, Lokalizacja (4 kliniki, substring match), Date range (Dzisiaj/Tydzień/Wszystkie/Custom), Reminder opt-out, URL query params persistence
type: feature
---
Strona /admin/bookings ma cztery filtry z URL persistence (`?status=&location=&datePreset=&from=&to=&reminderOptOut=`):

- **Status** (select): all (default) / pending / confirmed / needs_contact / cancelled / completed. Push do Supabase query (`.eq('status', ...)`).
- **Lokalizacja** (select): all (default) / wilanow. Każda opcja ma listę match patterns (wilanow → ['wilanow','wilanów','branickiego','warszawa-wilanow']) — filtr aplikowany **po stronie klienta** bo `bookings.location` to free text. Wzorce zsynchronizowane z `send-booking-reminders` edge function.
- **Zakres dat** (select + opcjonalnie 2 date pickery): Dzisiaj (default) / Najbliższe 7 dni / Wszystkie / Custom. Custom otwiera dwa Popover+Calendar (Od/Do) z `pointer-events-auto` i locale `pl`. Push do Supabase query (`.gte('appointment_date',from).lte(..to)`). Floor query at -30d niezależnie od wyboru.
- **Reminder** (select): all (default) / active (`reminder_opt_out=false`) / optedOut (`reminder_opt_out=true`). Push do Supabase query (`.eq('reminder_opt_out', ...)`). URL key: `reminderOptOut`. Pomaga recepcji szybko wylistować pacjentów którzy wypisali się z przypomnień.

Komponent `src/components/admin/AdminBookingsFilters.tsx` eksportuje `BookingFilters`, `DEFAULT_FILTERS`, `filtersFromSearchParams`, `filtersToSearchParams`, `resolveDateRange`, `matchesLocation`, `ReminderOptOutFilter`. Page używa `useSearchParams` jako single source of truth — `setFilters` robi `setSearchParams(..., {replace: true})`. Pusty stan rozróżnia "0 bookings w DB" vs "filtr lokalizacji nic nie pasuje".

Liczniki "Razem / Oczekujące" oraz reminder badges liczą się od `filteredBookings`. Reminder/tokens query nadal używa pełnego `bookings` (nie ma sensu refetchować logów per filtr). Przycisk "Wyczyść" wraca do DEFAULT_FILTERS i czyści URL params.
