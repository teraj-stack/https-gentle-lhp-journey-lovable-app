---
name: Admin Email Dashboard
description: Panel /admin/email-dashboard z filtrami time/template/status, statsami i tabelą logów email_send_log z deduplikacją po message_id
type: feature
---

# Admin Email Dashboard (`/admin/email-dashboard`)

Monitoring wysyłki maili oparty na tabeli `email_send_log`. Chroniony przez `useIsAdmin()` + RLS policy `Admins can read email send log` (migracja: SELECT dla `has_role('admin')`).

## 6 wymaganych feature'ów
1. **Time range filter**: presety 24h / 7 dni / 30 dni + custom date range (Popover + Calendar). Default: 7 dni.
2. **Template filter**: Select z dynamiczną listą `template_name` (extracted from deduped rows).
3. **Status filter**: All / Sent / Failed (dlq+failed+bounced) / Suppressed / Pending. Color-coded Badges przez `STATUS_VARIANT` map.
4. **Summary stats**: 5 StatCard (Łącznie / Wysłane / Niepowodzenia / Suppressed / W kolejce) — liczone na deduped+filtered.
5. **Email log table**: kolumny Szablon / Odbiorca / Status / Data / Błąd. Sort by created_at DESC.
6. **Paginacja**: 50 wpisów na stronę, ChevronLeft/Right, reset page na zmianę filtra.

## Deduplikacja po message_id
Critical: pojedynczy email = N wpisów (pending → sent/dlq) z tym samym `message_id`. Client-side dedup w `useMemo`: Map<message_id, najnowszy wpis> ordered by `created_at DESC`. Bez tego stats są zawyżone.

## Alarm DLQ > 0 w 24h
Osobny `useQuery` (`email-dlq-24h`, refetchInterval 30s) liczy unique `message_id` ze statusem dlq/failed/bounced w ostatnich 24h. Jeśli > 0 → czerwony `Alert` z liczbą i wskazówką sprawdzić toggle "Emails enabled".

## Limity
Fetch top 5000 wpisów per zakres (Supabase ma 1000 default ale `.limit(5000)` przechodzi). Dla dłuższych zakresów / większego volumenu będzie wymagać paginacji server-side — na teraz (~50 wpisów/tydzień) wystarcza.

## Nawigacja
Link w `AdminDashboard` header (Mail icon) + route w `App.tsx` poniżej `system-health`.
