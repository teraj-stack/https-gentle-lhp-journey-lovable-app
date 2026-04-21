---
name: Retry DLQ Emails
description: Mechanizm retry dla wpisów email_send_log status=dlq z whitelistą transient errors (Emails disabled, 429, 5xx) — cron 1h + manualny przycisk z /admin/email-dashboard
type: feature
---

# Retry DLQ Emails

Edge function `retry-dlq-emails` automatycznie wznawia wysyłkę maili które trafiły do DLQ z powodu transient errors. Dzięki idempotency_key bezpieczne dla wielokrotnych wywołań.

## Whitelist retryable errors
- `Emails disabled for this project` (403 — fix: toggle w Cloud → Emails)
- `429` / `rate limit`
- `5xx` / `Internal Server Error` / `Bad Gateway` / `Service Unavailable` / `Gateway Timeout`

NIE są retryable: template not found, invalid recipient, suppression — bo re-invoke dałby ten sam błąd.

## Triggery
- **Cron pg_cron** `retry-dlq-emails-hourly` co 1h (`0 * * * *`), uwierzytelniony przez Vault secret `email_queue_service_role_key`.
- **Manualny przycisk** "Retry DLQ" w `/admin/email-dashboard` (komponent `RetryDlqButton`) — toast pokazuje rezultat (succeeded/total).

## Algorytm (24h lookback)
1. Pobierz `email_send_log` WHERE status='dlq' AND created_at > now()-24h (limit 500).
2. Filter po `isRetryableError(error_message)` (whitelist powyżej).
3. Dedup po `metadata.idempotency_key` (pomiń duplikaty + wpisy bez idempotency_key).
4. Per kandydat: sprawdź czy istnieje już nowszy wpis ze status IN ('sent','pending') po dlq.created_at — jeśli tak, pomiń ("already retried").
5. Re-invoke `send-transactional-email` z oryginalnym idempotencyKey + templateData (z metadata) + flagą `metadata.retried_from_dlq=true`.
6. 100ms delay między invokami.

## Idempotency safety
`send-transactional-email` używa `idempotencyKey` jako stable identifier — jeśli admin kliknie "Retry DLQ" 2x lub cron+manual nakładają się, drugi invoke zostanie albo deduplikowany przez Go API (purpose=transactional + idempotency_key), albo nasz pre-check `already_retried` go odfiltruje.

## Krytyczna zmiana w send-transactional-email
Dodano `template_data` do `metadata` w `email_send_log` insert (linia ~362). Bez tego retry renderowałby email z domyślnymi propami (np. `name` undefined → fallback "Thank you for reaching out!" zamiast "Thank you, Jane!"). Mała zmiana, brak migracji — jsonb przyjmuje arbitralne payloads.

## Autoryzacja
- service_role (cron) → pass
- authenticated user → sprawdza `has_role('admin')` przez user-scoped client
- inne → 401

## Logi
Każdy run loguje pełny breakdown (scanned/candidates/succeeded/failed/skipped categories + max 10 failures). Widoczne w `supabase--edge_function_logs retry-dlq-emails`.
