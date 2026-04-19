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
//   2) booking-notification → reception of the chosen location + biuro@cml.pl

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
  /** Per-booking extra recipients added from the admin panel (e.g. day-shift assistant). */
  cc_emails?: string[] | null
}

// Basic RFC 5322-ish email check — strict enough to drop obvious garbage,
// loose enough not to false-reject valid corporate addresses.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: BookingRecord | null
  old_record: BookingRecord | null
}

// Always-CC for every booking notification (HQ + lekarz prowadzący)
const HQ_NOTIFICATION_EMAILS = ['biuro@cml.pl', 'dr.bujok@cml.pl']

// Map booking.location → reception email + friendly label.
// `match` is checked as a case-insensitive substring against the raw location value,
// so different shapes (slug, name, label) all resolve correctly.
interface LocationMapping {
  match: string[]
  email: string
  label: string
}

const LOCATION_MAP: LocationMapping[] = [
  {
    match: ['wilanow', 'wilanów', 'branickiego', 'warszawa-wilanow'],
    email: 'warszawa@cml.pl',
    label: 'Warszawa Wilanów (ul. Adama Branickiego 10/U6)',
  },
  {
    match: ['fimedica', 'gieldowa', 'giełdowa'],
    email: 'fimedica@fimedica.pl',
    label: 'Fimedica – Warszawa (ul. Giełdowa 5)',
  },
  {
    match: ['siedlce', 'beauty-and-mind', 'beauty', 'brzeska'],
    email: 'siedlce@cml.pl',
    label: 'Beauty & Mind – Siedlce (ul. Brzeska 125)',
  },
  {
    match: ['rzeszow', 'rzeszów', 'ipcliniq', 'ip-cliniq', 'rejtana'],
    email: 'recepcja@ipcliniq.pl',
    label: 'IP Cliniq – Rzeszów (al. Rejtana 53)',
  },
]

function resolveLocation(location?: string): { email: string | null; label: string } {
  if (!location) return { email: null, label: '—' }
  const norm = location.toLowerCase()
  for (const mapping of LOCATION_MAP) {
    if (mapping.match.some((m) => norm.includes(m))) {
      return { email: mapping.email, label: mapping.label }
    }
  }
  return { email: null, label: location }
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

  const { email: receptionEmail, label: locationLabel } = resolveLocation(booking.location)

  // Validate per-booking extra recipients (cc_emails) — drop empties and malformed addresses.
  const ccEmails = (booking.cc_emails ?? [])
    .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter((e) => e.length > 0 && EMAIL_REGEX.test(e))

  // Build deduplicated recipient list for the staff notification:
  //   reception (if known) + biuro@cml.pl + dr.bujok@cml.pl (always) + cc_emails (per-booking, optional)
  const staffRecipients = Array.from(
    new Set(
      [receptionEmail, ...HQ_NOTIFICATION_EMAILS, ...ccEmails]
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

  // 2) Staff notifications (reception + HQ)
  await Promise.all(
    staffRecipients.map(async (recipient) => {
      try {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'booking-notification',
            recipientEmail: recipient,
            // Per-recipient idempotency key — each address gets exactly one notification per booking
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
      results: sendResults,
    }),
    {
      status: allOk ? 200 : 207, // 207 Multi-Status if some sends failed
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
