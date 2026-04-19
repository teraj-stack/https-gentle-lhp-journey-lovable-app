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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

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
const ACTION_SITE_ORIGIN = (Deno.env.get('PUBLIC_SITE_URL') ?? 'https://www.bestcml.io').replace(/\/+$/, '')

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
  location_label: string | null
  enabled: boolean
}

function resolveLocation(
  location: string | undefined,
  recipients: NotificationRecipientRow[],
): { email: string | null; label: string } {
  if (!location) return { email: null, label: '—' }
  const norm = location.toLowerCase()
  for (const row of recipients) {
    if (row.role !== 'reception' || !row.enabled) continue
    const match = (row.location_match ?? '').toLowerCase().trim()
    if (match.length > 0 && norm.includes(match)) {
      return { email: row.email, label: row.location_label ?? location }
    }
  }
  return { email: null, label: location }
}

// Build a URL-safe random token. crypto.randomUUID + extra entropy = 32+ chars.
function generateToken(): string {
  const a = crypto.randomUUID().replace(/-/g, '')
  const b = crypto.randomUUID().replace(/-/g, '')
  return `${a}${b}` // 64 hex chars
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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

  if (payload.type !== 'INSERT' || payload.table !== 'bookings' || !payload.record) {
    return new Response(
      JSON.stringify({ skipped: true, reason: 'not an INSERT on bookings' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const booking = payload.record

  if (!booking.id || !booking.patient_email) {
    console.warn('Booking missing id or email — skipping', { id: booking.id })
    return new Response(
      JSON.stringify({ skipped: true, reason: 'missing id or patient_email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Load active notification recipients from DB (managed via /admin).
  const { data: recipientsData, error: recipientsError } = await supabase
    .from('notification_recipients')
    .select('email, role, location_match, location_label, enabled')
    .eq('enabled', true)

  if (recipientsError) {
    console.error('Failed to load notification_recipients:', recipientsError)
    return new Response(
      JSON.stringify({ error: 'Failed to load notification recipients', details: recipientsError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const recipients = (recipientsData ?? []) as NotificationRecipientRow[]

  const { email: receptionEmail, label: locationLabel } = resolveLocation(booking.location, recipients)

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
