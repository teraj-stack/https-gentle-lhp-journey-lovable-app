// Database webhook handler triggered on INSERT into public.bookings.
// Configure in Supabase: Database → Webhooks → New webhook
//   Table: public.bookings
//   Events: INSERT
//   Type: Supabase Edge Functions
//   Edge Function: on-booking-created
//   HTTP Method: POST
//
// Sends two emails:
//   1) booking-confirmation → patient
//   2) booking-notification → reception of the chosen location + global HQ/doctor recipients
//
// For every staff recipient we generate ONE-TIME action tokens (confirm / cancel /
// needs_contact) valid for 7 days, persist them in public.booking_action_tokens,
// and inject the resulting /booking-action URLs into the email template so the
// reception can change booking status with a single click.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { unauthorizedResponse } from '../_shared/unauthorized.ts'
import {
  checkRateLimitDb,
  getClientIp,
  ipForLog,
  logTokenFailure,
  rateLimitedResponse,
} from '../_shared/rate-limit.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { preflightResponse } from '../_shared/preflight.ts'

const ENDPOINT = 'on-booking-created'
// Limit centralized in _shared/rate-limit.ts → RATE_LIMITS[ENDPOINT].
// Webhook handler — legitimate traffic = 1 req per booking insert. Higher
// ceiling than token endpoints because Supabase webhook delivery can retry.

interface BookingRecord {
  id: string
  patient_name: string
  patient_email: string
  patient_phone?: string | null
  appointment_date: string
  appointment_time: string
  location: string
  message?: string | null
  status?: string
  cc_emails?: string[] | null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Public site origin used in booking-action links inside emails.
// Falls back to the canonical custom domain if env not set.
const ACTION_SITE_ORIGIN = (Deno.env.get('PUBLIC_SITE_URL') ?? 'https://mcml.pro').replace(/\/+$/, '')

// Token TTL — 7 days, jednorazowy (decision: 7 dni, jednorazowy).
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

type BookingActionType = 'confirm' | 'cancel' | 'needs_contact'
const ACTIONS: BookingActionType[] = ['confirm', 'cancel', 'needs_contact']

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: BookingRecord | null
  old_record: BookingRecord | null
}

interface NotificationRecipientRow {
  email: string
  role: 'reception' | 'hq' | 'doctor'
  location_match: string | null
  location_match_patterns: string[] | null
  location_label: string | null
  enabled: boolean
}

// Strip Polish/Latin diacritics so location_match in DB can stay ASCII
// (e.g. "wilanow" matches "Wilanów").
function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Collect all alias patterns for a recipient: prefer the new array column
// `location_match_patterns`, fall back to legacy single `location_match`.
// Returns normalized (lowercase, ASCII-only, trimmed, non-empty) strings.
function collectPatterns(row: NotificationRecipientRow): string[] {
  const raw: string[] = []
  if (Array.isArray(row.location_match_patterns)) {
    for (const p of row.location_match_patterns) {
      if (typeof p === 'string') raw.push(p)
    }
  }
  if (row.location_match && typeof row.location_match === 'string') {
    raw.push(row.location_match)
  }
  const out = new Set<string>()
  for (const p of raw) {
    const norm = stripDiacritics(p.toLowerCase()).trim()
    if (norm.length > 0) out.add(norm)
  }
  return Array.from(out)
}

function resolveLocation(
  location: string | undefined,
  recipients: NotificationRecipientRow[],
): { email: string | null; label: string; matchedPattern: string | null } {
  if (!location) return { email: null, label: '—', matchedPattern: null }
  const norm = stripDiacritics(location.toLowerCase())
  for (const row of recipients) {
    if (row.role !== 'reception' || !row.enabled) continue
    const patterns = collectPatterns(row)
    for (const pattern of patterns) {
      if (norm.includes(pattern)) {
        return {
          email: row.email,
          label: row.location_label ?? location,
          matchedPattern: pattern,
        }
      }
    }
  }
  return { email: null, label: location, matchedPattern: null }
}

// Build a URL-safe random token. crypto.randomUUID + extra entropy = 32+ chars.
function generateToken(): string {
  const a = crypto.randomUUID().replace(/-/g, '')
  const b = crypto.randomUUID().replace(/-/g, '')
  return `${a}${b}` // 64 hex chars
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse(corsHeaders)
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  const ipLog = ipForLog(ip)

  const earlySupabaseUrl = Deno.env.get('SUPABASE_URL')
  const earlySupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!earlySupabaseUrl || !earlySupabaseKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  // Single client used for rate-limit RPC, audit log, and main logic below.
  const supabase = createClient(earlySupabaseUrl, earlySupabaseKey)

  // DB-backed rate limit (cross-isolate, atomic) + log denials.
  // Fail-open: RPC failure → request proceeds (warning logged).
  const rl = await checkRateLimitDb(supabase, ENDPOINT, ip)
  if (!rl.allowed) {
    console.warn(`Rate limit exceeded for IP ${ip} on ${ENDPOINT}`)
    logTokenFailure(supabase, {
      endpoint: ENDPOINT,
      reason: 'rate_limited',
      ip: ipLog,
      userAgent,
      metadata: { retryAfterSec: rl.retryAfterSec, method: req.method },
    })
    return rateLimitedResponse(rl, corsHeaders)
  }

  // Webhook authentication: require service-role bearer token. Configure the
  // Supabase Database Webhook with header `Authorization: Bearer <SERVICE_ROLE_KEY>`.
  // Prevents internet callers from POSTing fake booking payloads to trigger
  // phishing emails from our trusted sender domain.
  {
    const authHeader = req.headers.get('Authorization') || ''
    const presented = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : ''
    let okAuth = false
    if (presented.length === earlySupabaseKey.length) {
      let diff = 0
      for (let i = 0; i < presented.length; i++) diff |= presented.charCodeAt(i) ^ earlySupabaseKey.charCodeAt(i)
      okAuth = diff === 0
    }
    if (!okAuth) {
      logTokenFailure(supabase, {
        endpoint: ENDPOINT,
        reason: 'unauthorized_webhook',
        ip: ipLog,
        userAgent,
        metadata: { method: req.method },
      })
      return unauthorizedResponse(corsHeaders)
    }
  }

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (payload.type !== 'INSERT' || payload.table !== 'bookings' || !payload.record?.id) {
    return new Response(
      JSON.stringify({ skipped: true, reason: 'not an INSERT on bookings' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // SECURITY: re-read the booking from the DB using only the id from the
  // payload. Discard all other fields from the webhook payload — guarantees
  // emails are only sent for real, RLS-vetted bookings.
  const { data: dbBooking, error: dbBookingError } = await supabase
    .from('bookings')
    .select('id, patient_name, patient_email, patient_phone, appointment_date, appointment_time, location, message, status, cc_emails')
    .eq('id', payload.record.id)
    .maybeSingle<BookingRecord>()

  if (dbBookingError || !dbBooking) {
    console.warn('Booking not found for webhook id — skipping', {
      id: payload.record.id,
      error: dbBookingError?.message,
    })
    return new Response(
      JSON.stringify({ skipped: true, reason: 'booking_not_found' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const booking = dbBooking

  if (!booking.patient_email) {
    console.warn('Booking missing email — skipping', { id: booking.id })
    return new Response(
      JSON.stringify({ skipped: true, reason: 'missing patient_email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // (supabase client + env check already done above for rate-limit RPC)

  // Load active notification recipients from DB (managed via /admin).
  const { data: recipientsData, error: recipientsError } = await supabase
    .from('notification_recipients')
    .select('email, role, location_match, location_match_patterns, location_label, enabled')
    .eq('enabled', true)

  if (recipientsError) {
    console.error('Failed to load notification_recipients:', recipientsError)
    return new Response(
      JSON.stringify({ error: 'Failed to load notification recipients', details: recipientsError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const recipients = (recipientsData ?? []) as NotificationRecipientRow[]

  const { email: receptionEmail, label: locationLabel, matchedPattern } = resolveLocation(booking.location, recipients)

  const globalEmails = recipients
    .filter((r) => (r.role === 'hq' || r.role === 'doctor') && r.enabled)
    .map((r) => r.email)

  const ccEmails = (booking.cc_emails ?? [])
    .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter((e) => e.length > 0 && EMAIL_REGEX.test(e))

  const staffRecipients = Array.from(
    new Set(
      [receptionEmail, ...globalEmails, ...ccEmails]
        .filter((e): e is string => !!e)
        .map((e) => e.toLowerCase())
    )
  )

  const sendResults: Record<string, { ok: boolean; error?: string }> = {}

  // 1) Patient confirmation
  try {
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'booking-confirmation',
        recipientEmail: booking.patient_email,
        idempotencyKey: `booking-confirm-${booking.id}`,
        templateData: {
          patientName: booking.patient_name,
          appointmentDate: booking.appointment_date,
          appointmentTime: booking.appointment_time,
          location: booking.location,
          message: booking.message ?? undefined,
        },
        metadata: { booking_id: booking.id, recipient_role: 'patient' },
      },
    })
    sendResults[`patient:${booking.patient_email}`] = error
      ? { ok: false, error: error.message }
      : { ok: true }
    if (error) console.error('booking-confirmation failed:', error)
  } catch (err) {
    sendResults[`patient:${booking.patient_email}`] = { ok: false, error: String(err) }
    console.error('booking-confirmation threw:', err)
  }

  // 2) Pre-generate action tokens for ALL staff recipients in one batch insert.
  //    Each recipient gets a unique set (confirm/cancel/needs_contact) so we know
  //    via audit log which mailbox actually clicked.
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  const tokenRows = staffRecipients.flatMap((recipient) =>
    ACTIONS.map((action) => ({
      booking_id: booking.id,
      action,
      token: generateToken(),
      recipient_email: recipient,
      expires_at: expiresAt,
    }))
  )

  // recipient → { confirm: url, cancel: url, needs_contact: url }
  const tokensByRecipient: Record<string, Record<BookingActionType, string>> = {}

  if (tokenRows.length > 0) {
    const { error: insertError } = await supabase
      .from('booking_action_tokens')
      .insert(tokenRows)

    if (insertError) {
      console.error('Failed to insert booking_action_tokens:', insertError)
      // Mail wyśle się bez przycisków akcji — recepcja zadzwoni jak dotychczas.
    } else {
      for (const row of tokenRows) {
        tokensByRecipient[row.recipient_email] ??= {} as Record<BookingActionType, string>
        const url = `${ACTION_SITE_ORIGIN}/booking-action?token=${encodeURIComponent(row.token)}`
        tokensByRecipient[row.recipient_email][row.action as BookingActionType] = url
      }
    }
  }

  // 3) Staff notifications (reception + HQ + doctor + per-booking CC)
  await Promise.all(
    staffRecipients.map(async (recipient) => {
      const urls = tokensByRecipient[recipient] ?? {} as Partial<Record<BookingActionType, string>>
      try {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'booking-notification',
            recipientEmail: recipient,
            idempotencyKey: `booking-notify-${booking.id}-${recipient}`,
            templateData: {
              patientName: booking.patient_name,
              patientEmail: booking.patient_email,
              patientPhone: booking.patient_phone ?? undefined,
              appointmentDate: booking.appointment_date,
              appointmentTime: booking.appointment_time,
              location: booking.location,
              locationLabel,
              message: booking.message ?? undefined,
              bookingId: booking.id,
              confirmUrl: urls.confirm,
              cancelUrl: urls.cancel,
              needsContactUrl: urls.needs_contact,
            },
            metadata: { booking_id: booking.id, recipient_role: 'staff' },
          },
        })
        sendResults[`staff:${recipient}`] = error
          ? { ok: false, error: error.message }
          : { ok: true }
        if (error) console.error(`booking-notification → ${recipient} failed:`, error)
      } catch (err) {
        sendResults[`staff:${recipient}`] = { ok: false, error: String(err) }
        console.error(`booking-notification → ${recipient} threw:`, err)
      }
    })
  )

  const allOk = Object.values(sendResults).every((r) => r.ok)

  return new Response(
    JSON.stringify({
      success: allOk,
      bookingId: booking.id,
      receptionEmail,
      locationLabel,
      matchedPattern,
      globalRecipients: globalEmails,
      tokensIssued: tokenRows.length,
      results: sendResults,
    }),
    {
      status: allOk ? 200 : 207,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
