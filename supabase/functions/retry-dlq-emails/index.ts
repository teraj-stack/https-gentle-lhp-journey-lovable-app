// Retry DLQ emails — reads email_send_log for entries with status='dlq' from
// the last 24h whose error_message matches a whitelist of transient errors,
// deduplicates by idempotency_key, and re-invokes send-transactional-email
// with the original idempotency_key (which guarantees no duplicate sends).
//
// Triggered:
//   - automatically by pg_cron every 1h
//   - manually from /admin/email-dashboard ("Retry DLQ" button)
//
// Whitelist of retryable errors:
//   - "Emails disabled for this project" (403 Forbidden — fixed by toggle)
//   - "429" rate-limit responses
//   - "5xx" / "Internal Server Error" / "Bad Gateway" — transient server errors
//
// Anything else (template not found, invalid recipient, suppression, etc.)
// is intentionally NOT retried — re-invoking would just fail again.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { unauthorizedResponse } from '../_shared/unauthorized.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { preflightResponse } from '../_shared/preflight.ts'

const LOOKBACK_HOURS = 24

// Returns true if error_message indicates a transient error worth retrying.
function isRetryableError(errorMessage: string | null): boolean {
  if (!errorMessage) return false
  const msg = errorMessage.toLowerCase()
  if (msg.includes('emails disabled')) return true
  if (msg.includes('429')) return true
  if (msg.includes('rate limit')) return true
  // 5xx server errors
  if (/\b5\d\d\b/.test(msg)) return true
  if (msg.includes('internal server error')) return true
  if (msg.includes('bad gateway')) return true
  if (msg.includes('service unavailable')) return true
  if (msg.includes('gateway timeout')) return true
  return false
}

type DlqRow = {
  id: string
  message_id: string | null
  template_name: string
  recipient_email: string
  error_message: string | null
  metadata: Record<string, any> | null
  created_at: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse(corsHeaders)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Authorize: admin (verified JWT with has_role='admin') OR service_role
  // (cron, identified by presenting the service-role key as Bearer token).
  // We do NOT decode JWT payloads ourselves — payloads are unsigned input
  // when verify_jwt=false. Instead:
  //   - service-role: constant-time compare token to SUPABASE_SERVICE_ROLE_KEY
  //   - admin user:   verify JWT cryptographically via supabase.auth.getUser(),
  //                   then check has_role('admin') with their session.
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
  let isAuthorized = false
  let callerLabel = 'unknown'

  function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
  }

  if (token && timingSafeEqual(token, supabaseServiceKey)) {
    isAuthorized = true
    callerLabel = 'service_role (cron)'
  } else if (token) {
    try {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } },
      })
      // Cryptographically verify the JWT signature against Supabase's keys.
      const { data: userData, error: userError } = await userClient.auth.getUser(token)
      if (!userError && userData?.user) {
        const { data: hasAdmin } = await userClient.rpc('has_role', { _role: 'admin' })
        if (hasAdmin === true) {
          isAuthorized = true
          callerLabel = `admin:${userData.user.id}`
        }
      }
    } catch {
      // fall through — unauthorized
    }
  }

  if (!isAuthorized) {
    return unauthorizedResponse(corsHeaders)
  }

  console.log(`retry-dlq-emails invoked by ${callerLabel}`)

  // 2. Fetch DLQ entries from the last 24h
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
  const { data: dlqRows, error: fetchError } = await supabase
    .from('email_send_log')
    .select('id, message_id, template_name, recipient_email, error_message, metadata, created_at')
    .eq('status', 'dlq')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)

  if (fetchError) {
    console.error('Failed to fetch DLQ rows', fetchError)
    return new Response(JSON.stringify({ error: 'Failed to fetch DLQ rows' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rows = (dlqRows ?? []) as DlqRow[]

  // 3. Filter retryable + deduplicate by idempotency_key (or message_id fallback)
  const seen = new Set<string>()
  const candidates: DlqRow[] = []
  let skippedNonRetryable = 0
  let skippedNoIdempotencyKey = 0
  let skippedAlreadyRetried = 0

  for (const row of rows) {
    if (!isRetryableError(row.error_message)) {
      skippedNonRetryable++
      continue
    }
    const idempotencyKey = row.metadata?.idempotency_key as string | undefined
    if (!idempotencyKey) {
      skippedNoIdempotencyKey++
      continue
    }
    if (seen.has(idempotencyKey)) continue
    seen.add(idempotencyKey)

    // Check if this idempotency_key already has a successful retry attempt
    // (status='sent' or 'pending' AFTER the dlq entry's created_at)
    const { count: successCount } = await supabase
      .from('email_send_log')
      .select('id', { count: 'exact', head: true })
      .eq('metadata->>idempotency_key', idempotencyKey)
      .in('status', ['sent', 'pending'])
      .gte('created_at', row.created_at)

    if ((successCount ?? 0) > 0) {
      skippedAlreadyRetried++
      continue
    }

    candidates.push(row)
  }

  console.log('Retry candidates assembled', {
    total_dlq_rows: rows.length,
    candidates: candidates.length,
    skipped_non_retryable: skippedNonRetryable,
    skipped_no_idempotency_key: skippedNoIdempotencyKey,
    skipped_already_retried: skippedAlreadyRetried,
  })

  // 4. Re-invoke send-transactional-email for each candidate
  let succeeded = 0
  let failed = 0
  const failures: Array<{ template: string; recipient: string; error: string }> = []

  for (const row of candidates) {
    const idempotencyKey = row.metadata!.idempotency_key as string
    const templateData = (row.metadata?.template_data as Record<string, any>) ?? {}

    // Strip internal fields from metadata when forwarding
    const forwardedMetadata = { ...row.metadata }
    delete forwardedMetadata.caller_ip
    delete forwardedMetadata.idempotency_key
    delete forwardedMetadata.template_data

    const { error: invokeError } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: row.template_name,
        recipientEmail: row.recipient_email,
        idempotencyKey,
        templateData,
        metadata: { ...forwardedMetadata, retried_from_dlq: true, original_dlq_at: row.created_at },
      },
    })

    if (invokeError) {
      failed++
      failures.push({
        template: row.template_name,
        recipient: row.recipient_email,
        error: invokeError.message ?? String(invokeError),
      })
      console.error('Retry invoke failed', { template: row.template_name, recipient: row.recipient_email, error: invokeError })
    } else {
      succeeded++
    }

    // Small delay between invokes to avoid hammering the queue
    await new Promise((r) => setTimeout(r, 100))
  }

  const summary = {
    success: true,
    caller: callerLabel,
    lookback_hours: LOOKBACK_HOURS,
    dlq_rows_scanned: rows.length,
    candidates_found: candidates.length,
    retried_succeeded: succeeded,
    retried_failed: failed,
    skipped_non_retryable: skippedNonRetryable,
    skipped_no_idempotency_key: skippedNoIdempotencyKey,
    skipped_already_retried: skippedAlreadyRetried,
    failures: failures.slice(0, 10),
  }

  console.log('retry-dlq-emails complete', summary)

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
