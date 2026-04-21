---
name: shared-rate-limiter
description: Wspólny helper supabase/functions/_shared/rate-limit.ts z dwiema implementacjami rate-limitu (in-memory legacy + DB-backed global) i loggerem failure'ów do token_validation_failures
type: feature
---

# Shared Rate Limiter & Failure Logger

Plik: `supabase/functions/_shared/rate-limit.ts`

## Dwie implementacje rate-limitu

### `checkRateLimit()` — in-memory, BEST-EFFORT (legacy)
Per-isolate fixed-window. Każdy Deno isolate ma własną Mapę → burst rozproszony na K isolate'ów efektywnie podnosi limit Kx. **Nie używać w nowych endpointach.** Pozostawione tylko dla `on-booking-created` (DB webhook, niski ryzyko, 60/60s).

### `checkRateLimitDb()` — DB-backed, GLOBAL (preferowane)
Atomowy UPSERT na `rate_limit_buckets` przez RPC `check_and_increment_rate_limit(p_endpoint, p_ip, p_max, p_window_sec)`. Jeden licznik wspólny dla wszystkich isolate'ów. **Fail-open**: jeśli RPC padnie → request przechodzi + warn w logach.

## Schema DB
- Tabela `rate_limit_buckets (endpoint, ip, window_start, count)` PRIMARY KEY `(endpoint, ip, window_start)`.
- RLS: tylko service_role (RPC) + admin (SELECT do podglądu w panelu).
- Cleanup: `cleanup_rate_limit_buckets()` + cron `cleanup-rate-limit-buckets` co 5 min usuwa wpisy starsze niż 1h.

## Eksportowane API
- `getClientIp(req)` — wyciąga IP z `x-forwarded-for` / `cf-connecting-ip` / `x-real-ip`, fallback `'unknown'`.
- `ipForLog(ip)` — konwersja `'unknown'` → `null` dla insertów do DB.
- `checkRateLimit(endpoint, ip, config?)` — **legacy in-memory**. Default 10/60s.
- `checkRateLimitDb(supabase, endpoint, ip, config?)` — **preferowane**, DB-backed, async.
- `rateLimitedResponse(rl, corsHeaders)` — gotowy 429 z `Retry-After` + `X-RateLimit-*`.
- `logTokenFailure(supabase, { endpoint, reason, ip, userAgent, metadata })` — fire-and-forget insert do `token_validation_failures` przez `EdgeRuntime.waitUntil`. Reasons: `invalid_token` | `rate_limited` | `expired` | `already_used` | `unauthorized` | `invalid_payload`.

## Konsumenci (stan aktualny)
| Endpoint | Limiter | Limit | Logowane reasons |
|---|---|---|---|
| `handle-email-unsubscribe` | **DB** | 10/60s | invalid_token, rate_limited, already_used |
| `handle-reminder-opt-out` | **DB** | 10/60s | invalid_token, rate_limited, expired, already_used |
| `verify-turnstile` | **DB** | 30/60s | invalid_token, rate_limited, invalid_payload |
| `preview-transactional-email` | **DB** | 10/60s | rate_limited, unauthorized |
| `on-booking-created` | **DB** | 60/60s | rate_limited (DB webhook ma exponential backoff retry) |
| `update-booking-status` | **brak RL** | — | invalid_token, expired, already_used (token 256-bit single-use 7d to jedyna obrona) |

## Widoki w admin UI (`/admin/system-health`)
- **Podejrzane IP** — z view `recent_token_abuse_ips`: ≥10 failures w 10 min per IP (z `token_validation_failures`).
- **Top rate-limited IP** — z RPC `get_top_rate_limited_ips(p_limit)` agregującego `rate_limit_buckets` (IP × endpoint przekraczające limit). Pokazuje aktywne nadużycia w czasie rzeczywistym, niezależnie od `token_validation_failures`. Limity per endpoint hardcoded w RPC — przy zmianie limitu w edge function trzeba zaktualizować też CTE `limits` w `get_top_rate_limited_ips`.
