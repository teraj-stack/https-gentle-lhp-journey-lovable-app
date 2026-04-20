// Scheduled Edge Function — invoked hourly by pg_cron.
// Scans bookings for "tomorrow" (Europe/Warsaw) and sends booking-reminder emails.
//
// Idempotency: idempotencyKey = `booking-reminder-${bookingId}-${appointmentDate}`
// → guarantees each patient receives exactly ONE reminder per booking,
//   even if the cron runs multiple times within the 24h window.
//
// Schedule: every hour at minute 0.

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

// Compute "tomorrow" in Europe/Warsaw timezone as YYYY-MM-DD.
// Using Intl with sv-SE locale gives ISO-like format.
function tomorrowInWarsaw(): string {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow)
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

  const targetDate = tomorrowInWarsaw()
  console.log(`[send-booking-reminders] Scanning bookings for ${targetDate}`)

  // Fetch all non-cancelled bookings for tomorrow
  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select('id, patient_name, patient_email, appointment_date, appointment_time, location, status, reminder_opt_out')
    .eq('appointment_date', targetDate)
    .neq('status', 'cancelled')
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
    console.log('[send-booking-reminders] No bookings for tomorrow.')
    return new Response(
      JSON.stringify({ ok: true, targetDate, processed: 0, results: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[send-booking-reminders] Found ${bookings.length} booking(s) for ${targetDate}`)

  // Pre-check email_send_log: defense-in-depth na wypadek wielokrotnego cron run.
  // Queue też dedupe'uje po idempotencyKey, ale to oszczędza nam invoke per booking.
  const recipientEmails = bookings.map((b) => b.patient_email).filter(Boolean)
  const { data: existingLogs } = await supabase
    .from('email_send_log')
    .select('recipient_email, status, metadata')
    .eq('template_name', 'booking-reminder')
    .in('recipient_email', recipientEmails)
    .in('status', ['pending', 'sent'])

  // Mapa już-obsłużonych idempotencyKey
  const handledKeys = new Set<string>()
  for (const row of existingLogs ?? []) {
    const key = (row.metadata as Record<string, unknown> | null)?.idempotency_key
    if (typeof key === 'string') handledKeys.add(key)
  }

  const results = await Promise.all(
    bookings.map(async (booking) => {
      if (!booking.patient_email) {
        return { id: booking.id, ok: false, skipped: false, error: 'missing patient_email' }
      }
      const idempotencyKey = `booking-reminder-${booking.id}-${booking.appointment_date}`

      if (handledKeys.has(idempotencyKey)) {
        console.log(`[send-booking-reminders] Skip ${booking.id} — already in email_send_log (${idempotencyKey})`)
        return { id: booking.id, ok: true, skipped: true }
      }

      try {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'booking-reminder',
            recipientEmail: booking.patient_email,
            idempotencyKey,
            templateData: {
              patientName: booking.patient_name,
              appointmentDate: booking.appointment_date,
              appointmentTime: booking.appointment_time,
              location: booking.location,
              locationLabel: resolveLocationLabel(booking.location),
            },
          },
        })
        if (error) {
          console.error(`Reminder failed for ${booking.id}:`, error)
          return { id: booking.id, ok: false, skipped: false, error: error.message }
        }
        return { id: booking.id, ok: true, skipped: false }
      } catch (err) {
        console.error(`Reminder threw for ${booking.id}:`, err)
        return { id: booking.id, ok: false, skipped: false, error: String(err) }
      }
    })
  )

  const sent = results.filter((r) => r.ok && !r.skipped).length
  const skipped = results.filter((r) => r.ok && r.skipped).length
  const failed = results.length - sent - skipped

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
