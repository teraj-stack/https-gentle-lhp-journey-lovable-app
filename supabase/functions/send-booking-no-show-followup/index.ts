// Scheduled Edge Function — invoked daily at 22:00 (Europe/Warsaw) by pg_cron.
// Sends a "How was your visit / didn't make it?" follow-up email to bookings
// that are still in pending status at end of day (recepcja nie potwierdzi\u0142a
// ani nie anulowa\u0142a).
//
// Filter: appointment_date = today (Europe/Warsaw) AND status = 'pending'
//         AND reminder_opt_out = false
//
// Idempotency: idempotencyKey = `booking-no-show-${bookingId}-${date}`
// → guarantees ONE follow-up per booking per day. Pre-checks email_send_log.
//
// Schedule: daily at 22:00 Warsaw time (= 20:00 UTC summer / 21:00 UTC winter).

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface BookingRow {
  id: string
  patient_name: string
  patient_email: string
  appointment_date: string
  appointment_time: string
  location: string
  status: string
  reminder_opt_out: boolean
}

const LOCATION_LABELS: Record<string, { match: string[]; label: string }> = {
  wilanow: {
    match: ['wilanow', 'wilanów', 'branickiego', 'warszawa-wilanow'],
    label: 'Warszawa Wilanów, ul. Adama Branickiego 10/U6',
  },
  fimedica: {
    match: ['fimedica', 'gieldowa', 'giełdowa'],
    label: 'Fimedica Warszawa, ul. Giełdowa 4D',
  },
  siedlce: {
    match: ['siedlce', 'beauty-and-mind', 'beauty', 'brzeska'],
    label: 'Beauty & Mind – Siedlce, ul. Brzeska 125',
  },
  rzeszow: {
    match: ['rzeszow', 'rzeszów', 'ipcliniq', 'ip-cliniq', 'rejtana'],
    label: 'IP Cliniq – Rzeszów, al. Rejtana 53',
  },
}

function resolveLocationLabel(location?: string): string {
  if (!location) return '—'
  const norm = location.toLowerCase()
  for (const { match, label } of Object.values(LOCATION_LABELS)) {
    if (match.some((m) => norm.includes(m))) return label
  }
  return location
}

// Returns YYYY-MM-DD for today in Europe/Warsaw.
function todayInWarsaw(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// Polish display date (DD.MM.YYYY) for email body.
function formatPolishDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

  // Cron-only endpoint — require service-role bearer token (passed by pg_cron
  // via Vault). Reject anonymous internet callers to prevent forced sends.
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
  let okAuth = false
  if (token.length === supabaseServiceKey.length) {
    let diff = 0
    for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ supabaseServiceKey.charCodeAt(i)
    okAuth = diff === 0
  }
  if (!okAuth) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const targetDate = todayInWarsaw()

  console.log(`[no-show-followup] Scanning ${targetDate} for status='pending'`)

  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select('id, patient_name, patient_email, appointment_date, appointment_time, location, status, reminder_opt_out')
    .eq('appointment_date', targetDate)
    .eq('status', 'pending')
    .eq('reminder_opt_out', false)
    .returns<BookingRow[]>()

  if (fetchError) {
    console.error('Failed to fetch bookings:', fetchError)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch bookings', details: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!bookings || bookings.length === 0) {
    console.log('[no-show-followup] No pending bookings for today.')
    return new Response(
      JSON.stringify({
        ok: true,
        targetDate,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        results: [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[no-show-followup] Found ${bookings.length} pending booking(s)`)

  const results = await Promise.all(
    bookings.map(async (booking) => {
      if (!booking.patient_email) {
        return { id: booking.id, ok: false, error: 'missing patient_email' }
      }

      const idempotencyKey = `booking-no-show-${booking.id}-${booking.appointment_date}`

      // Caller-side guard: skip if a no-show follow-up for this booking was
      // already enqueued/sent.
      const { data: existing, error: lookupErr } = await supabase
        .from('email_send_log')
        .select('id, status')
        .eq('template_name', 'booking-no-show-check')
        .eq('recipient_email', booking.patient_email)
        .filter('metadata->>idempotency_key', 'eq', idempotencyKey)
        .in('status', ['pending', 'sent'])
        .limit(1)

      if (lookupErr) {
        console.warn(`Idempotency lookup failed for ${booking.id}:`, lookupErr)
        // Fail-open.
      } else if (existing && existing.length > 0) {
        console.log(`Skip ${booking.id} — no-show follow-up already ${existing[0].status}`)
        return { id: booking.id, ok: true, skipped: true, reason: 'already_sent' }
      }

      try {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'booking-no-show-check',
            recipientEmail: booking.patient_email,
            idempotencyKey,
            templateData: {
              patientName: booking.patient_name,
              appointmentDate: formatPolishDate(booking.appointment_date),
              locationLabel: resolveLocationLabel(booking.location),
            },
            metadata: { booking_id: booking.id },
          },
        })
        if (error) {
          console.error(`No-show follow-up failed for ${booking.id}:`, error)
          return { id: booking.id, ok: false, error: error.message }
        }
        return { id: booking.id, ok: true }
      } catch (err) {
        console.error(`No-show follow-up threw for ${booking.id}:`, err)
        return { id: booking.id, ok: false, error: String(err) }
      }
    })
  )

  const sent = results.filter((r) => r.ok && !('skipped' in r && r.skipped)).length
  const skipped = results.filter((r) => 'skipped' in r && r.skipped).length
  const failed = results.filter((r) => !r.ok).length

  return new Response(
    JSON.stringify({
      ok: failed === 0,
      targetDate,
      processed: results.length,
      sent,
      skipped,
      failed,
      results,
    }),
    {
      status: failed === 0 ? 200 : 207,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
