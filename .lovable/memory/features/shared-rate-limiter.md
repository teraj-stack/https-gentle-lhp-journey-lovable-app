---
name: shared-rate-limiter
description: Wspólny helper supabase/functions/_shared/rate-limit.ts z dwiema implementacjami rate-limitu (in-memory legacy + DB-backed global) i loggerem failure'ów do token_validation_failures
type: feature
---

# Shared Rate Limiter & Failure Logger

Plik: `supabase/functions/_shared/rate-limit.ts`

## Centralny rejestr limitów (single source of truth)

`RATE_LIMITS` w `_shared/rate-limit.ts` — JEDNO miejsce definicji limitów per endpoint. Konsumenci wołają `checkRateLimitDb(supabase, ENDPOINT, ip)` BEZ podawania configa — auto-resolve przez `getRateLimitConfig(endpoint)`.

```ts
export const RATE_LIMITS = {
  'handle-email-unsubscribe':    { max: 10, windowMs: 60_000 },
  'handle-reminder-opt-out':     { max: 10, windowMs: 60_000 },
  'preview-transactional-email': { max: 10, windowMs: 60_000 },
  'verify-turnstile':            { max: 30, windowMs: 60_000 },
  'on-booking-created':          { max: 60, windowMs: 60_000 },
} as const
```

**KAŻDA zmiana** w `RATE_LIMITS` wymaga migracji aktualizującej CTE `limits` w `public.get_top_rate_limited_ips` (panel admina liczy "denied" = `count − max_per_window`).

## Dwie implementacje rate-limitu

### `checkRateLimit()` — in-memory, BEST-EFFORT (legacy)
Per-isolate fixed-window. Bez aktywnych konsumentów — może zostać usunięte w przyszłej iteracji.

### `checkRateLimitDb()` — DB-backed, GLOBAL (preferowane)
Atomowy UPSERT na `rate_limit_buckets` przez RPC `check_and_increment_rate_limit(p_endpoint, p_ip, p_max, p_window_sec)`. Jeden licznik wspólny dla wszystkich isolate'ów. **Fail-open**: jeśli RPC padnie → request przechodzi + strukturalny log `[rate-limit][fail-open]` + audyt do `token_validation_failures` z reason `rate_limit_failopen`.

## Schema DB
- Tabela `rate_limit_buckets (endpoint, ip, window_start, count)` PRIMARY KEY `(endpoint, ip, window_start)`.
- RLS: tylko service_role (RPC) + admin (SELECT do podglądu w panelu).
- Cleanup: `cleanup_rate_limit_buckets()` + cron `cleanup-rate-limit-buckets` co 5 min usuwa wpisy starsze niż 1h.

## Eksportowane API
- `RATE_LIMITS` / `getRateLimitConfig(endpoint)` — centralny rejestr.
- `getClientIp(req)` — wyciąga IP z `x-forwarded-for` / `cf-connecting-ip` / `x-real-ip`, fallback `'unknown'`.
- `ipForLog(ip)` — konwersja `'unknown'` → `null` dla insertów do DB.
- `checkRateLimitDb(supabase, endpoint, ip, config?)` — preferowane. Jeśli `config` pominięty, auto-resolve z `RATE_LIMITS`.
- `rateLimitedResponse(rl, corsHeaders)` — gotowy 429 z `Retry-After` + `X-RateLimit-*`.
- `logTokenFailure(supabase, { endpoint, reason, ip, userAgent, metadata })` — fire-and-forget insert do `token_validation_failures`. Reasons: `invalid_token` | `rate_limited` | `expired` | `already_used` | `unauthorized` | `invalid_payload` | `rate_limit_failopen`.

## Konsumenci (wszyscy biorą limit z RATE_LIMITS)
| Endpoint | Limit | Notatka |
|---|---|---|
| `handle-email-unsubscribe` | 10/60s | |
| `handle-reminder-opt-out` | 10/60s | |
| `verify-turnstile` | 30/60s | |
| `preview-transactional-email` | 10/60s | |
| `on-booking-created` | 60/60s | DB webhook ma exponential backoff retry |
| `update-booking-status` | brak RL | token 256-bit single-use 7d to jedyna obrona |

## Widoki w admin UI (`/admin/system-health`)
- **Webhook on-booking-created — odrzucenia 15 min** — pulsujący alert + toast przy ≥50 odrzuceń z `token_validation_failures` (reason=rate_limited).
- **Podejrzane IP** — z view `recent_token_abuse_ips`: ≥10 failures w 10 min per IP.
- **Top rate-limited IP** — z RPC `get_top_rate_limited_ips(p_limit)` agregującego `rate_limit_buckets`.

## E2E test
`supabase/functions/on-booking-created/index_test.ts` importuje `RATE_LIMITS` zamiast hardcodowania liczby — wysyła `LIMIT + 20` żądań i oczekuje 60 OK / 20 × 429.
