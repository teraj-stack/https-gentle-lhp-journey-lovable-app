// Integration tests: verify that protected Edge Functions reject requests
// without the correct `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
// header. All assertions use the unified 401 contract from
// `_shared/unauthorized.ts` (status 401, application/json,
// body = { error: "Unauthorized", code: "unauthorized" }).
//
// Adding a new protected Edge Function to the suite is a ONE-LINER —
// just push another entry into the FUNCTIONS array below and the full
// matrix (12 negative variants + 1 best-effort positive smoke) is
// generated for it automatically.
//
// `send-transactional-email` is intentionally NOT in this list — it has
// its own dedicated suite at
// `send-transactional-email/auth_hardening_test.ts` because its allowed
// callers (service-role only) and bogus-token surface (anon JWT) differ.

import { runAuthMatrix } from './auth_test_helpers.ts'

const FUNCTIONS = [
  {
    name: 'on-booking-created',
    body: {
      type: 'INSERT',
      table: 'bookings',
      schema: 'public',
      record: { id: '00000000-0000-0000-0000-000000000000' },
      old_record: null,
    },
  },
  { name: 'send-booking-reminders', body: { window: '24h' } },
  { name: 'send-booking-no-show-followup', body: {} },
  { name: 'retry-dlq-emails', body: {} },
] as const

for (const fn of FUNCTIONS) {
  runAuthMatrix(fn)
}
