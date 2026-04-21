// Edge function obsługująca tokenizowane linki "Potwierdź / Odwołaj / Wymaga kontaktu"
// z maila booking-notification.
//
// Endpointy:
//   GET  ?token=...                         → walidacja tokena (zwraca metadane do strony /booking-action)
//   POST { token, confirmedByEmail? }       → zatwierdzenie akcji (zmiana statusu w bazie + mail do pacjenta)
//
// Token jest jednorazowy (oznaczany jako użyty po POST) i ważny 7 dni od wygenerowania.

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  getClientIp,
  ipForLog,
  logTokenFailure,
} from '../_shared/rate-limit.ts'

// ============================================================
// RATE LIMITING — INTENTIONALLY REMOVED (2026-04-21)
// ============================================================
// Wcześniej używaliśmy in-memory rate limit (10 req / 60s per IP).
// Usunięte ponieważ:
//   1) Supabase Edge Functions fan-out na N isolate'ów Deno — każdy ma własną
//      Mapę. Burst rozproszony na K isolate'ów efektywnie podnosi limit Kx.
//      E2E potwierdzone: 30 sequential requests → 30x404, 0x429.
//   2) Komplikuje kod bez realnej ochrony.
//
// Jedyną warstwą obrony tego endpointu jest walidacja tokena:
//   - 256-bit entropy (gen_random_bytes(32) → base64url) — niemożliwe do zgadnięcia
//   - single-use (atomowy UPDATE ... WHERE used_at IS NULL)
//   - 7-day expiry (WHERE expires_at > now())
//   - sibling-token invalidation po pierwszym użyciu
//
// Audit log (logTokenFailure → token_validation_failures) zostaje — admin
// widzi nadużycia w /admin/system-health (próg ≥10 fail/10min per IP).
// Globalny rate-limit wymaga Postgres-backed bucket (osobny temat).
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

type BookingAction = 'confirm' | 'cancel' | 'needs_contact'

const ACTION_TO_STATUS: Record<BookingAction, 'confirmed' | 'cancelled' | 'needs_contact'> = {
  confirm: 'confirmed',
  cancel: 'cancelled',
  needs_contact: 'needs_contact',
}

const ENDPOINT = 'update-booking-status'

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  const ipLog = ipForLog(ip)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return json(500, { error: 'Server configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Rate-limit usunięty — patrz komentarz na górze pliku.
  // Token sam w sobie (256-bit + single-use + 7d) jest jedyną warstwą obrony.

  // ============================================================
  // GET — walidacja tokena (preview na stronie /booking-action)
  // ============================================================
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token) return json(400, { error: 'Missing token' })

    const { data: tokenRow, error: tokenError } = await supabase
      .from('booking_action_tokens')
      .select('id, action, booking_id, expires_at, used_at, used_by_email, recipient_email')
      .eq('token', token)
      .maybeSingle()

    if (tokenError) {
      console.error('Token lookup failed:', tokenError)
      return json(500, { error: 'Internal error' })
    }
    if (!tokenRow) {
      logTokenFailure(supabase, { endpoint: ENDPOINT, reason: 'invalid_token', ip: ipLog, userAgent, metadata: { method: 'GET', tokenPreview: token.slice(0, 8) } })
      return json(404, { valid: false, reason: 'not_found' })
    }

    const expired = new Date(tokenRow.expires_at).getTime() < Date.now()
    const used = !!tokenRow.used_at

    // Pobierz powiązaną rezerwację
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, patient_name, appointment_date, appointment_time, location, status')
      .eq('id', tokenRow.booking_id)
      .maybeSingle()

    if (bookingError) {
      console.error('Booking lookup failed:', bookingError)
      return json(500, { error: 'Internal error' })
    }
    if (!booking) return json(404, { valid: false, reason: 'booking_not_found' })

    return json(200, {
      valid: !expired && !used,
      reason: expired ? 'expired' : used ? 'already_used' : null,
      action: tokenRow.action,
      targetStatus: ACTION_TO_STATUS[tokenRow.action as BookingAction],
      recipientEmail: tokenRow.recipient_email,
      usedAt: tokenRow.used_at,
      usedByEmail: tokenRow.used_by_email,
      booking: {
        id: booking.id,
        patientName: booking.patient_name,
        appointmentDate: booking.appointment_date,
        appointmentTime: booking.appointment_time,
        location: booking.location,
        currentStatus: booking.status,
      },
    })
  }

  // ============================================================
  // POST — zatwierdzenie akcji
  // ============================================================
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  let body: { token?: string; confirmedByEmail?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  const token = body.token?.trim()
  if (!token) return json(400, { error: 'Missing token' })

  const confirmedByEmail = (body.confirmedByEmail ?? '').trim().toLowerCase() || null
  const ua = req.headers.get('user-agent') ?? null

  // 1) Atomowy token consume — UPDATE z warunkiem used_at IS NULL gwarantuje single-use
  //    (concurrent kliknięcia: tylko jedno wygra).
  const nowIso = new Date().toISOString()
  const { data: claimed, error: claimError } = await supabase
    .from('booking_action_tokens')
    .update({
      used_at: nowIso,
      used_by_email: confirmedByEmail,
      used_by_ip: ipLog,
      used_by_ua: ua,
    })
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .select('id, action, booking_id')
    .maybeSingle()

  if (claimError) {
    console.error('Token claim failed:', claimError)
    return json(500, { error: 'Internal error' })
  }
  if (!claimed) {
    // Wyjaśnij dlaczego (sprawdź ponownie row żeby dać sensowny komunikat)
    const { data: row } = await supabase
      .from('booking_action_tokens')
      .select('used_at, expires_at')
      .eq('token', token)
      .maybeSingle()
    if (!row) {
      logTokenFailure(supabase, { endpoint: ENDPOINT, reason: 'invalid_token', ip: ipLog, userAgent, metadata: { method: 'POST', tokenPreview: token.slice(0, 8) } })
      return json(404, { error: 'invalid_token' })
    }
    if (row.used_at) {
      logTokenFailure(supabase, { endpoint: ENDPOINT, reason: 'already_used', ip: ipLog, userAgent, metadata: { method: 'POST', usedAt: row.used_at } })
      return json(409, { error: 'already_used' })
    }
    logTokenFailure(supabase, { endpoint: ENDPOINT, reason: 'expired', ip: ipLog, userAgent, metadata: { method: 'POST', expiresAt: row.expires_at } })
    return json(410, { error: 'expired' })
  }

  const action = claimed.action as BookingAction
  const newStatus = ACTION_TO_STATUS[action]

  // 2) Update statusu rezerwacji (trigger DB sam ustawi status_changed_at).
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: newStatus,
      status_changed_by: confirmedByEmail,
    })
    .eq('id', claimed.booking_id)
    .select('id, patient_name, patient_email, appointment_date, appointment_time, location')
    .maybeSingle()

  if (updateError || !updatedBooking) {
    console.error('Booking status update failed:', updateError)
    // Token został spalony, ale update padł — zwracamy błąd dla retry przez recepcję ręcznie
    return json(500, { error: 'status_update_failed', details: updateError?.message })
  }

  // 3) Wczytaj label lokalizacji (z notification_recipients)
  let locationLabel = updatedBooking.location
  try {
    const { data: recipients } = await supabase
      .from('notification_recipients')
      .select('location_match, location_label')
      .eq('role', 'reception')
      .eq('enabled', true)
    const norm = (updatedBooking.location ?? '').toLowerCase()
    const match = (recipients ?? []).find((r) => {
      const m = (r.location_match ?? '').toLowerCase().trim()
      return m.length > 0 && norm.includes(m)
    })
    if (match?.location_label) locationLabel = match.location_label
  } catch (err) {
    console.warn('Failed to resolve location label:', err)
  }

  // 4) Wyślij mail do pacjenta z aktualizacją statusu
  let patientEmailResult: { ok: boolean; error?: string } = { ok: true }
  if (updatedBooking.patient_email) {
    try {
      const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'booking-status-update',
          recipientEmail: updatedBooking.patient_email,
          // Idempotency per (booking, status) — jeśli akcja jest powtórzona przez admina ręcznie,
          // mail się nie zduplikuje.
          idempotencyKey: `booking-status-${updatedBooking.id}-${newStatus}`,
          templateData: {
            patientName: updatedBooking.patient_name,
            appointmentDate: updatedBooking.appointment_date,
            appointmentTime: updatedBooking.appointment_time,
            locationLabel,
            status: newStatus,
          },
          metadata: { booking_id: updatedBooking.id, status_after: newStatus, action },
        },
      })
      patientEmailResult = emailError ? { ok: false, error: emailError.message } : { ok: true }
      if (emailError) console.error('Patient status update email failed:', emailError)
    } catch (err) {
      patientEmailResult = { ok: false, error: String(err) }
      console.error('Patient status update email threw:', err)
    }
  }

  // 5) Inwalidacja pozostałych nieużytych tokenów dla tej rezerwacji
  //    (np. recepcja kliknęła "Potwierdź" — link "Odwołaj" z tego samego maila powinien przestać działać).
  await supabase
    .from('booking_action_tokens')
    .update({
      used_at: nowIso,
      used_by_email: confirmedByEmail,
      used_by_ip: ipLog,
      used_by_ua: 'auto-invalidated:sibling-action-used',
    })
    .eq('booking_id', claimed.booking_id)
    .is('used_at', null)

  return json(200, {
    success: true,
    action,
    newStatus,
    bookingId: updatedBooking.id,
    patientEmailSent: patientEmailResult.ok,
    patientEmailError: patientEmailResult.error,
  })
})
