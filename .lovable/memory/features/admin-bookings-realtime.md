---
name: admin-bookings-realtime
description: Realtime subscription na bookings w /admin/bookings — auto-refetch listy + toast przy INSERT/UPDATE statusu, wskaźnik Live w nagłówku
type: feature
---
**Migracja**: `ALTER TABLE bookings REPLICA IDENTITY FULL` + `ALTER PUBLICATION supabase_realtime ADD TABLE bookings` (idempotent przez `BEGIN/EXCEPTION duplicate_object`).

**Subskrypcja w `src/pages/AdminBookings.tsx`**: `useEffect` zależny od `[authLoading, session, queryClient]`, kanał `admin-bookings-realtime` na `postgres_changes` event=`*`, schema=`public`, table=`bookings`. Każde zdarzenie:
- `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] })` → useQuery refetchuje z aktualnymi filtrami
- INSERT → `toast.success("Nowa rezerwacja", { description })` z imieniem + datą/godziną
- UPDATE z faktyczną zmianą `status` → `toast.message("Status zaktualizowany")`, dodatkowo invalidate `booking-status-history` i `admin-bookings-action-tokens` (popover historii też się odświeża)

**Cleanup**: `supabase.removeChannel(channel)` w return useEffect. Stan `realtimeReady` ustawiany w callbacku `.subscribe()` przy `status === "SUBSCRIBED"`.

**Wskaźnik UI**: w nagłówku `/admin/bookings` (obok email + Odśwież), kropka emerald-500 z `animate-pulse` + label "Live" (lub "Offline" gdy nie SUBSCRIBED). `hidden sm:inline-flex` — niewidoczne na mobile. Tooltip wyjaśnia stan.
