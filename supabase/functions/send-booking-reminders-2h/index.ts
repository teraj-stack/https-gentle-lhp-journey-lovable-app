// Scheduled Edge Function — invoked every 30 minutes by pg_cron.
// Sends a SHORT "2 hours before appointment" reminder.
//
// Window: scans bookings with appointment_date = today (Europe/Warsaw)
//         AND appointment_time in [now+90min, now+150min] (also Europe/Warsaw).
//
// Idempotency: idempotencyKey = `booking-reminder-2h-${bookingId}-${date}T${time}`
// → guarantees ONE 2h reminder per booking. Combined with caller-side guard
//   that pre-checks email_send_log, even running every 5 min wouldn't duplicate.
//
// Schedule: every 30 minutes.

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

// Returns HH:MM (24h) in Europe/Warsaw, offset by `offsetMinutes` from now.
function timeInWarsaw(offsetMinutes: number): string {
  const future = new Date(Date.now() + offsetMinutes * 60 * 1000)
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(future)
}

// Normalize "HH:MM" or "HH:MM:SS" to "HH:MM" for comparison.
function normalizeTime(t: string): string {
  return t?.slice(0, 5) ?? ''
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

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const targetDate = todayInWarsaw()
  // Window: now+90min .. now+150min (i.e. ~2h ± 30min)
  const windowStart = timeInWarsaw(90)
  const windowEnd = timeInWarsaw(150)

  console.log(
    `[send-booking-reminders-2h] Scanning ${targetDate} between ${windowStart} and ${windowEnd}`
  )

  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select('id, patient_name, patient_email, appointment_date, appointment_time, location, status')
    .eq('appointment_date', targetDate)
    .neq('status', 'cancelled')
    .returns<BookingRow[]>()

  if (fetchError) {
    console.error('Failed to fetch bookings:', fetchError)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch bookings', details: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Filter to the time window in JS (date column lacks time, time is plain text).
  const inWindow = (bookings ?? []).filter((b) => {
    const t = normalizeTime(b.appointment_time)
    return t >= windowStart && t <= windowEnd
  })

  if (inWindow.length === 0) {
    console.log('[send-booking-reminders-2h] No bookings in 2h window.')
    return new Response(
      JSON.stringify({
        ok: true,
        targetDate,
        windowStart,
        windowEnd,
        processed: 0,
        results: [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[send-booking-reminders-2h] Found ${inWindow.length} booking(s) in window`)

  const results = await Promise.all(
    inWindow.map(async (booking) => {
      if (!booking.patient_email) {
        return { id: booking.id, ok: false, error: 'missing patient_email' }
      }

      const idempotencyKey = `booking-reminder-2h-${booking.id}-${booking.appointment_date}T${normalizeTime(booking.appointment_time)}`

      // Caller-side guard: skip if a 2h reminder for this booking+slot was
      // already enqueued/sent. Matches by metadata.idempotency_key prefix.
      const { data: existing, error: lookupErr } = await supabase
        .from('email_send_log')
        .select('id, status')
        .eq('template_name', 'booking-reminder-2h')
        .eq('recipient_email', booking.patient_email)
        .filter('metadata->>idempotency_key', 'eq', idempotencyKey)
        .in('status', ['pending', 'sent'])
        .limit(1)

      if (lookupErr) {
        console.warn(`Idempotency lookup failed for ${booking.id}:`, lookupErr)
        // Fail-open: continue and let send-transactional-email handle it.
      } else if (existing && existing.length > 0) {
        console.log(`Skip ${booking.id} — 2h reminder already ${existing[0].status}`)
        return { id: booking.id, ok: true, skipped: true, reason: 'already_sent' }
      }

      try {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'booking-reminder-2h',
            recipientEmail: booking.patient_email,
            idempotencyKey,
            templateData: {
              patientName: booking.patient_name,
              appointmentTime: normalizeTime(booking.appointment_time),
              locationLabel: resolveLocationLabel(booking.location),
            },
          },
        })
        if (error) {
          console.error(`2h reminder failed for ${booking.id}:`, error)
          return { id: booking.id, ok: false, error: error.message }
        }
        return { id: booking.id, ok: true }
      } catch (err) {
        console.error(`2h reminder threw for ${booking.id}:`, err)
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
      windowStart,
      windowEnd,
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
