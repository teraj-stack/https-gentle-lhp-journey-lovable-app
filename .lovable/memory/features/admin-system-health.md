---
name: Admin System Health & Token Abuse Detection
description: Strona /admin/system-health z monitoringiem podejrzanych prób użycia tokenów (404 invalid + 429 rate-limit + 410 expired + 409 already_used) — alert dla IP ≥10 prób / 10 min
type: feature
---

Tabela `token_validation_failures` (RLS: service_role insert, admin SELECT) loguje wszystkie nieudane próby użycia tokena na endpoincie `update-booking-status`. Kolumny: `endpoint`, `reason` (CHECK: invalid_token | rate_limited | expired | already_used), `ip`, `user_agent`, `metadata` (jsonb, np. `tokenPreview`, `method`, `retryAfterSec`).

Edge function `update-booking-status` używa `EdgeRuntime.waitUntil()` (fire-and-forget) żeby nie blokować response — logowanie nie wpływa na latencję.

View `recent_token_abuse_ips` (security_invoker = on) agreguje IP z ≥10 nieudanymi próbami w ostatnich 10 min — to próg detekcji brute-force pokazywany w alercie na `/admin/system-health`.

Cleanup: funkcja `cleanup_old_token_failures()` usuwa wpisy >30 dni (do podpięcia pod cron).

UI: `src/pages/AdminSystemHealth.tsx` — 3 karty stats (total/24h/unique IPs) + tabela podejrzanych IP (auto-refresh 30s) + ostatnie 100 nieudanych prób z kolorowymi badge'ami per `reason`. Link z `AdminDashboard` (przycisk "System Health" z ikoną Activity).

Znana ograniczenia: rate_limited count w praktyce zawsze = 0, bo in-memory rate limiter w edge function jest per-isolate i Supabase fan-out praktycznie go obchodzi (zweryfikowane: 30/30 → 404). Realny sygnał alarmowy daje `invalid_token_count` (próby brute-force fake tokenami).

Scroll-to-row w tabeli "Top retry sources" używa wspólnego helpera `scrollRowIntoView(el, force=false)` zamiast natywnego `scrollIntoView({ block: "center" })` — natywna metoda ignoruje sticky page header (CSS var `--header-height` z Header.tsx) i potrafi schować górną część wiersza. Helper liczy `targetY = scrollY + rect.top - headerH - 16px buffer`. Parametr `force=true` (klik badge'a numeru porządkowego, Enter/J/K, Next/Prev w nawigatorze) zawsze scrolluje — wizualne potwierdzenie intencji usera. `force=false` (auto-reveal w `revealRowInTable` po zamknięciu modala) pomija scroll gdy wiersz już w pełni widoczny w bezpiecznym oknie (między `headerH+16` a `viewport-24`), żeby nie szarpać widokiem. Behavior: `smooth` domyślnie, ale auto-degradacja na `auto` (instant) gdy `prefers-reduced-motion: reduce` (a11y) lub gdy poprzedni scroll był <250ms temu (`lastScrollAtRef` — spam J/K przez autorepeat anulowałby smooth animacje, instant utrzymuje 1:1 sync z klawiszem). Używany w 4 miejscach: `revealRowInTable` (force=false), `scrollToNavigatorIndex` (force=true), `performJumpToMatch` (force=true), `jumpToMatchIndex` tryb modalny (force=true).
