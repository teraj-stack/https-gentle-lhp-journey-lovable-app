---
name: shared-rate-limiter
description: Wspólny helper supabase/functions/_shared/rate-limit.ts używany przez wszystkie publiczne edge functions do rate-limitu (best-effort) i logowania failure'ów do token_validation_failures
type: feature
---

# Shared Rate Limiter & Failure Logger

Plik: `supabase/functions/_shared/rate-limit.ts`

## Eksportowane API
- `getClientIp(req)` — wyciąga IP z `x-forwarded-for` / `cf-connecting-ip` / `x-real-ip`, fallback `'unknown'`.
- `ipForLog(ip)` — konwersja `'unknown'` → `null` dla insertów do DB.
- `checkRateLimit(endpoint, ip, config?)` — fixed-window per `(endpoint, ip)`. Default: 10 req / 60s. Zwraca `{ allowed, retryAfterSec, remaining, limit }`.
- `rateLimitedResponse(rl, corsHeaders)` — gotowy 429 z `Retry-After` + `X-RateLimit-*`.
- `logTokenFailure(supabase, { endpoint, reason, ip, userAgent, metadata })` — fire-and-forget insert do `token_validation_failures` przez `EdgeRuntime.waitUntil`. Reasons: `invalid_token` | `rate_limited` | `expired` | `already_used` | `unauthorized` | `invalid_payload`.

## Endpointy używające helpera
| Endpoint | Limit | Logowane reasons |
|---|---|---|
| `update-booking-status` | 10/60s | invalid_token, rate_limited, expired, already_used |
| `handle-email-unsubscribe` | 10/60s | invalid_token, rate_limited, already_used |
| `handle-reminder-opt-out` | 10/60s | invalid_token, rate_limited, expired, already_used |
| `verify-turnstile` | 30/60s | invalid_token, rate_limited, invalid_payload |
| `preview-transactional-email` | 10/60s | rate_limited, unauthorized |
| `on-booking-created` | 60/60s | rate_limited (wyższy próg — webhook DB może retry'ować) |

## Ograniczenia (CRITICAL)
**Rate-limit jest BEST-EFFORT.** Supabase Edge Functions fan-out na wiele isolate'ów Deno, każdy ma własną in-memory Mapę. Burst N requestów rozproszony na K isolate'ów efektywnie podnosi limit Kx. Potwierdzone E2E: 30 sequential requests → 30x404, 0x429.

Wartość helpera leży w **ujednoliconym audit logu** (token_validation_failures) widocznym w `/admin/system-health`, NIE w faktycznym blokowaniu. Prawdziwy global rate-limit wymaga Postgres-backed bucket (separate concern).

## Próg alertu w admin UI
Widok `recent_token_abuse_ips`: ≥10 failures w 10 min per IP → highlight w `/admin/system-health`.
