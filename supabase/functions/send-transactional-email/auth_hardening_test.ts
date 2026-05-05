// Integration tests for `send-transactional-email` — pins the unified 401
// contract for every malformed/missing Authorization shape PLUS the
// function-specific case of the anon publishable key being presented as a
// Bearer token (must also 401 — anon callers MUST go through
// `submit-contact-form`, not this service-role-only path).
//
// The malformed-Authorization matrix and the best-effort positive smoke
// come from `_shared/auth_test_helpers.ts` via `runAuthMatrix`. Only the
// anon-JWT scenario lives here because it's specific to this function.

import {
  HAS_ANON_KEY,
  SUPABASE_ANON_KEY,
  assertUnauthorizedShape,
  callFunction,
  runAuthMatrix,
} from '../_shared/auth_test_helpers.ts'

const FN = 'send-transactional-email'

const SAMPLE_BODY = {
  templateName: 'contact-confirmation',
  recipientEmail: 'qa+auth-test@example.invalid',
  templateData: { name: 'QA' },
}

// 12 negative variants + 1 best-effort positive smoke.
runAuthMatrix({ name: FN, body: SAMPLE_BODY })

// Function-specific extra: anon publishable key must NOT be accepted.
Deno.test(
  `[stx-auth] ${FN} — rejects anon JWT (publishable key) as Bearer (unified 401)`,
  async () => {
    if (!HAS_ANON_KEY) {
      console.warn(
        `[stx-auth] ${FN}: anon publishable key not in local env — ` +
          `anon-JWT rejection test skipped.`,
      )
      return
    }
    const res = await callFunction(
      FN,
      { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      SAMPLE_BODY,
    )
    assertUnauthorizedShape('anon JWT Bearer', res, FN)
  },
)
