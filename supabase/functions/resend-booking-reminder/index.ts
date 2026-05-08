// Edge function — ręczny resend reminderu rezerwacji z panelu /admin/bookings.
//
// Bypass idempotency: do idempotencyKey doklejamy `-manual-${timestamp}`,
// dzięki czemu kolejka traktuje to jako nową wiadomość. Metadata zawiera
// manual_resend=true oraz email admina (dla audytu).
//
// Wymaga: zalogowanego admina (sprawdzane przez has_role('admin')).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildCorsHeaders } from '../_shared/cors.ts'
import { preflightResponse } from '../_shared/preflight.ts'

const corsHeaders = buildCorsHeaders({ allowMethods: 'POST, OPTIONS' })

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

type ReminderVariant = '24h' | '2h'

const LOCATION_LABELS: Array<{ match: string[]; label: string }> = [
  { match: ['wilanow', 'wilanów', 'branickiego'], label: 'Warszawa Wilanów, ul. Adama Branickiego 10/U6' },
  { match: ['fimedica', 'gieldowa', 'giełdowa'], label: 'Fimedica Warszawa, ul. Giełdowa 4D' },
  { match: ['siedlce', 'beauty', 'brzeska'], label: 'Beauty & Mind – Siedlce, ul. Brzeska 125' },
  { match: ['rzeszow', 'rzeszów', 'ipcliniq', 'rejtana'], label: 'IP Cliniq – Rzeszów, al. Rejtana 53' },
]

function resolveLocationLabel(location?: string): string {
  if (!location) return '—'
  const norm = location.toLowerCase()
  for (const { match, label } of LOCATION_LABELS) {
    if (match.some((m) => norm.includes(m))) return label
  }
  return location
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse(corsHeaders)
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return json(500, { error: 'Server configuration error' })
  }

  // Walidacja JWT + sprawdzenie roli admina
  const authHeader = req.headers.get('authorization') ?? ''
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return json(401, { error: 'unauthorized' })
  }
  const { data: isAdmin, error: roleError } = await userClient.rpc('has_role', { _role: 'admin' })
  if (roleError || !isAdmin) {
    return json(403, { error: 'forbidden' })
  }

  let body: { bookingId?: string; variant?: ReminderVariant }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  const bookingId = body.bookingId?.trim()
  const variant: ReminderVariant = body.variant === '2h' ? '2h' : '24h'
  if (!bookingId) return json(400, { error: 'Missing bookingId' })

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, patient_name, patient_email, appointment_date, appointment_time, location, status, reminder_opt_out')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError) {
    console.error('Booking lookup failed:', bookingError)
    return json(500, { error: 'Internal error' })
  }
  if (!booking) return json(404, { error: 'booking_not_found' })
  if (!booking.patient_email) return json(400, { error: 'missing_patient_email' })
  if (booking.reminder_opt_out) return json(409, { error: 'reminder_opt_out_active' })

  const templateName = variant === '2h' ? 'booking-reminder-2h' : 'booking-reminder'
  const ts = Date.now()
  const baseKey = variant === '2h'
    ? `booking-reminder-2h-${booking.id}-${booking.appointment_date}T${booking.appointment_time}`
    : `booking-reminder-${booking.id}-${booking.appointment_date}`
  const idempotencyKey = `${baseKey}-manual-${ts}`

  const { error: sendError } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName,
      recipientEmail: booking.patient_email,
      idempotencyKey,
      templateData: {
        patientName: booking.patient_name,
        appointmentDate: booking.appointment_date,
        appointmentTime: booking.appointment_time,
        location: booking.location,
        locationLabel: resolveLocationLabel(booking.location),
      },
      metadata: {
        manual_resend: true,
        resent_by: userData.user.email,
        resent_at: new Date(ts).toISOString(),
        booking_id: booking.id,
        variant,
      },
    },
  })

  if (sendError) {
    console.error('Manual resend failed:', sendError)
    return json(500, { error: 'send_failed', details: sendError.message })
  }

  return json(200, {
    success: true,
    bookingId: booking.id,
    variant,
    idempotencyKey,
    resentBy: userData.user.email,
  })
})
