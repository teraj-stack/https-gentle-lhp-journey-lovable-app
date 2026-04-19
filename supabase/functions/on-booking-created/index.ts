// Database webhook handler triggered on INSERT into public.bookings.
// Configure in Supabase: Database → Webhooks → New webhook
//   Table: public.bookings
//   Events: INSERT
//   Type: Supabase Edge Functions
//   Edge Function: on-booking-created
//   HTTP Method: POST
//   HTTP Headers: (default — Authorization with service-role JWT is added automatically)
//
// The webhook payload follows Supabase's standard format:
// { type: 'INSERT', table: 'bookings', schema: 'public', record: {...}, old_record: null }

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
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: BookingRecord | null
  old_record: BookingRecord | null
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

  // Only process INSERT events
  if (payload.type !== 'INSERT' || payload.table !== 'bookings' || !payload.record) {
    return new Response(
      JSON.stringify({ skipped: true, reason: 'not an INSERT on bookings' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const booking = payload.record

  // Basic validation: must have email + id to send confirmation
  if (!booking.id || !booking.patient_email) {
    console.warn('Booking missing id or email — skipping email send', { id: booking.id })
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

  try {
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'booking-confirmation',
        recipientEmail: booking.patient_email,
        // Idempotent per booking — safe against webhook retries / duplicate events
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

    if (error) {
      console.error('send-transactional-email invoke failed:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, bookingId: booking.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
