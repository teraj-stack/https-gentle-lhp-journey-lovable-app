// Edge function obsługująca tokenizowane linki "Potwierdź / Odwołaj / Wymaga kontaktu"
// z maila booking-notification.
//
// Endpointy:
//   GET  ?token=...                         → walidacja tokena (zwraca metadane do strony /booking-action)
//   POST { token, confirmedByEmail? }       → zatwierdzenie akcji (zmiana statusu w bazie + mail do pacjenta)
//
// Token jest jednorazowy (oznaczany jako użyty po POST) i ważny 7 dni od wygenerowania.

import { createClient } from 'npm:@supabase/supabase-js@2'

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

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// ============================================================
// In-memory rate limiter per IP (fixed-window, 10 req / 60 s).
// Ad-hoc — backend nie ma jeszcze KV/Redis dla globalnego limitu.
// Działa per isolate Deno Deploy: bot trafiający w wiele isolate'ów
// obejdzie limit proporcjonalnie. Akceptowalne jako warstwa obrony
// dla tokenów o 256-bit entropii (64 hex znaków).
// ============================================================
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? 'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now()
  const bucket = rateLimitBuckets.get(ip)

  // Lazy cleanup wygasłych bucketów (co ~100 wpisów) — żeby Map nie rosła w nieskończoność.
  if (rateLimitBuckets.size > 100) {
    for (const [key, value] of rateLimitBuckets) {
      if (value.resetAt < now) rateLimitBuckets.delete(key)
    }
  }

  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterSec: 0, remaining: RATE_LIMIT_MAX - 1 }
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000), remaining: 0 }
  }

  bucket.count += 1
  return { allowed: true, retryAfterSec: 0, remaining: RATE_LIMIT_MAX - bucket.count }
}

// Fire-and-forget log do tabeli token_validation_failures.
// Wykorzystuje EdgeRuntime.waitUntil żeby nie blokować response (jeśli dostępne),
// w przeciwnym wypadku po prostu nie czekamy na rezultat.
function logFailure(
  supabase: ReturnType<typeof createClient>,
  payload: { endpoint: string; reason: 'invalid_token' | 'rate_limited' | 'expired' | 'already_used'; ip: string | null; userAgent: string | null; metadata?: Record<string, unknown> },
) {
  const promise = supabase.from('token_validation_failures').insert({
    endpoint: payload.endpoint,
    reason: payload.reason,
    ip: payload.ip,
    user_agent: payload.userAgent,
    metadata: payload.metadata ?? null,
  }).then(({ error }) => {
    if (error) console.error('Failed to log token_validation_failure:', error.message)
  })
  // @ts-ignore - EdgeRuntime jest dostępne w Supabase Edge Runtime
  if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
    // @ts-ignore
    EdgeRuntime.waitUntil(promise)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return json(500, { error: 'Server configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ipForLog = ip === 'unknown' ? null : ip
  const ENDPOINT = 'update-booking-status'

  // Rate limit dla GET i POST (OPTIONS przepuszczamy dla CORS preflight).
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    console.warn(`Rate limit exceeded for IP ${ip} on ${ENDPOINT}`)
    logFailure(supabase, {
      endpoint: ENDPOINT,
      reason: 'rate_limited',
      ip: ipForLog,
      userAgent,
      metadata: { retryAfterSec: rl.retryAfterSec, method: req.method },
    })
    return new Response(
      JSON.stringify({ error: 'rate_limited', retryAfterSec: rl.retryAfterSec }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfterSec),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

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
    if (!tokenRow) return json(404, { valid: false, reason: 'not_found' })

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
  // `ip` already computed above for rate limiting; reuse here for audit trail.
  const auditIp = ip === 'unknown' ? null : ip
  const ua = req.headers.get('user-agent') ?? null

  // 1) Atomowy token consume — UPDATE z warunkiem used_at IS NULL gwarantuje single-use
  //    (concurrent kliknięcia: tylko jedno wygra).
  const nowIso = new Date().toISOString()
  const { data: claimed, error: claimError } = await supabase
    .from('booking_action_tokens')
    .update({
      used_at: nowIso,
      used_by_email: confirmedByEmail,
      used_by_ip: auditIp,
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
    if (!row) return json(404, { error: 'invalid_token' })
    if (row.used_at) return json(409, { error: 'already_used' })
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
      used_by_ip: auditIp,
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
