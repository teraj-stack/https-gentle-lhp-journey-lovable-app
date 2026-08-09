// Scheduled Edge Function — generic booking reminder dispatcher.
//
// DST-safe: filters bookings by precomputed `next_reminder_24h_at` /
// `next_reminder_2h_at` columns (TIMESTAMPTZ, computed in Europe/Warsaw
// by the `compute_booking_reminder_schedule` trigger). pg_cron runs in UTC
// but the schedule column already stores the correct UTC instant for
// "24h before appointment" and "2h before appointment" in Warsaw local
// time — automatically correct across spring/autumn DST transitions.
//
// Schedules (configured via pg_cron):
//   - 0 19-22 * * *   → POST { "window": "24h" }  (covers 22:00 Warsaw winter+summer with buffer)
//   - */30 * * * *    → POST { "window": "2h" }
//
// Catch-up: each window has a backwards lookback (4h for 24h, 1h for 2h)
// so a missed cron tick does not cause a missed reminder.
// Idempotency: keys differ per window — see WINDOW_CONFIG below.
// Pre-checks email_send_log to skip already-pending/sent reminders.

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { unauthorizedResponse } from '../_shared/unauthorized.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { preflightResponse } from '../_shared/preflight.ts'

interface BookingRow {
  id: string
  patient_name: string
  patient_email: string
  appointment_date: string
  appointment_time: string
  location: string
  status: string
  reminder_opt_out: boolean
  next_reminder_24h_at?: string | null
  next_reminder_2h_at?: string | null
}

type WindowKey = '24h' | '2h'

// ---------- Location label resolution (shared) ----------

const LOCATION_LABELS: Record<string, { match: string[]; label: string }> = {
  wilanow: {
    match: ['wilanow', 'wilanów', 'branickiego', 'warszawa-wilanow'],
    label: 'Warszawa Wilanów, ul. Adama Branickiego 10/U6',
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

// ---------- Time helpers ----------

function normalizeTime(t: string): string {
  return t?.slice(0, 5) ?? ''
}

// ---------- Per-window config ----------

interface WindowConfig {
  templateName: string
  /** Column on bookings storing the precomputed (DST-safe) trigger time. */
  scheduleColumn: 'next_reminder_24h_at' | 'next_reminder_2h_at'
  /** How far back from now() we still consider a reminder eligible (catch-up window). */
  catchUpInterval: string
  /** Idempotency key for a given booking. */
  idempotencyKey: (b: BookingRow) => string
  /** Build template payload sent to send-transactional-email. */
  buildTemplateData: (b: BookingRow) => Record<string, unknown>
}

const WINDOW_CONFIG: Record<WindowKey, WindowConfig> = {
  '24h': {
    templateName: 'booking-reminder',
    scheduleColumn: 'next_reminder_24h_at',
    // Cron runs hourly between 19-22 UTC (covers 22:00 Warsaw winter+summer).
    // 4h catch-up tolerates one missed cron tick or a delayed boot.
    catchUpInterval: '4 hours',
    idempotencyKey: (b) => `booking-reminder-${b.id}-${b.appointment_date}`,
    buildTemplateData: (b) => ({
      patientName: b.patient_name,
      appointmentDate: b.appointment_date,
      appointmentTime: b.appointment_time,
      location: b.location,
      locationLabel: resolveLocationLabel(b.location),
    }),
  },
  '2h': {
    templateName: 'booking-reminder-2h',
    scheduleColumn: 'next_reminder_2h_at',
    // Cron runs every 30 min — 1h catch-up handles one missed tick.
    catchUpInterval: '1 hour',
    idempotencyKey: (b) =>
      `booking-reminder-2h-${b.id}-${b.appointment_date}T${normalizeTime(b.appointment_time)}`,
    buildTemplateData: (b) => ({
      patientName: b.patient_name,
      appointmentTime: normalizeTime(b.appointment_time),
      locationLabel: resolveLocationLabel(b.location),
    }),
  },
}

// ---------- Core dispatcher ----------

async function fetchEligibleBookings(
  supabase: SupabaseClient,
  cfg: WindowConfig,
): Promise<{ bookings: BookingRow[]; windowStart: string; windowEnd: string }> {
  // Window: [now() - catchUpInterval, now()] on the schedule column.
  // Postgres computes both bounds — TZ-agnostic, DST-safe.
  const nowIso = new Date().toISOString()
  const windowStart = new Date(Date.now() - parseIntervalMs(cfg.catchUpInterval)).toISOString()

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, patient_name, patient_email, appointment_date, appointment_time, location, status, reminder_opt_out, next_reminder_24h_at, next_reminder_2h_at',
    )
    .neq('status', 'cancelled')
    .eq('reminder_opt_out', false)
    .gte(cfg.scheduleColumn, windowStart)
    .lte(cfg.scheduleColumn, nowIso)
    .returns<BookingRow[]>()

  if (error) throw error
  return { bookings: data ?? [], windowStart, windowEnd: nowIso }
}

function parseIntervalMs(interval: string): number {
  const m = /^(\d+)\s*(hour|hours|minute|minutes)$/.exec(interval.trim())
  if (!m) throw new Error(`Unsupported interval: ${interval}`)
  const value = Number(m[1])
  const unit = m[2]
  return unit.startsWith('hour') ? value * 3600 * 1000 : value * 60 * 1000
}

async function preloadHandledKeys(
  supabase: SupabaseClient,
  templateName: string,
  bookings: BookingRow[],
): Promise<Set<string>> {
  const handled = new Set<string>()
  const recipients = bookings.map((b) => b.patient_email).filter(Boolean)
  if (recipients.length === 0) return handled

  const { data, error } = await supabase
    .from('email_send_log')
    .select('metadata')
    .eq('template_name', templateName)
    .in('recipient_email', recipients)
    .in('status', ['pending', 'sent'])

  if (error) {
    console.warn(`[reminders] Idempotency preload failed for ${templateName}:`, error.message)
    return handled // fail-open
  }
  for (const row of data ?? []) {
    const key = (row.metadata as Record<string, unknown> | null)?.idempotency_key
    if (typeof key === 'string') handled.add(key)
  }
  return handled
}

async function ensureOptOutToken(
  supabase: SupabaseClient,
  booking: BookingRow,
  siteUrl: string,
): Promise<string | null> {
  // Re-use an unused, non-expired token if one exists for this booking.
  const { data: existing } = await supabase
    .from('booking_reminder_opt_out_tokens')
    .select('token, used_at, expires_at')
    .eq('booking_id', booking.id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.token) {
    return `${siteUrl}/reminder-opt-out?token=${encodeURIComponent(existing.token)}`
  }

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const { error } = await supabase
    .from('booking_reminder_opt_out_tokens')
    .insert({
      booking_id: booking.id,
      patient_email: booking.patient_email,
      token,
    })
  if (error) {
    console.warn(`[reminders] Failed to create opt-out token for ${booking.id}:`, error.message)
    return null // fail-open: send reminder without opt-out link
  }
  return `${siteUrl}/reminder-opt-out?token=${encodeURIComponent(token)}`
}

async function dispatchOne(
  supabase: SupabaseClient,
  cfg: WindowConfig,
  booking: BookingRow,
  handledKeys: Set<string>,
  siteUrl: string,
) {
  if (!booking.patient_email) {
    return { id: booking.id, ok: false, skipped: false, error: 'missing patient_email' }
  }
  const idempotencyKey = cfg.idempotencyKey(booking)

  if (handledKeys.has(idempotencyKey)) {
    console.log(`[reminders] Skip ${booking.id} — already handled (${idempotencyKey})`)
    return { id: booking.id, ok: true, skipped: true, reason: 'already_sent' as const }
  }

  const reminderOptOutUrl = await ensureOptOutToken(supabase, booking, siteUrl)

  try {
    const templateData = {
      ...cfg.buildTemplateData(booking),
      ...(reminderOptOutUrl ? { reminderOptOutUrl } : {}),
    }
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: cfg.templateName,
        recipientEmail: booking.patient_email,
        idempotencyKey,
        templateData,
        metadata: { booking_id: booking.id, variant: cfg.templateName === 'booking-reminder-2h' ? '2h' : '24h' },
      },
    })
    if (error) {
      console.error(`[reminders] ${cfg.templateName} failed for ${booking.id}:`, error)
      return { id: booking.id, ok: false, skipped: false, error: error.message }
    }
    return { id: booking.id, ok: true, skipped: false }
  } catch (err) {
    console.error(`[reminders] ${cfg.templateName} threw for ${booking.id}:`, err)
    return { id: booking.id, ok: false, skipped: false, error: String(err) }
  }
}

// ---------- HTTP entrypoint ----------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse(corsHeaders)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
    return unauthorizedResponse(corsHeaders)
  }

  // Parse body — default to "24h" for backward-compat with older cron calls.
  let windowKey: WindowKey = '24h'
  try {
    const body = await req.json().catch(() => ({}))
    const raw = body?.window
    if (raw === '24h' || raw === '2h') windowKey = raw
    else if (raw !== undefined) {
      return new Response(
        JSON.stringify({ error: `Invalid window: ${raw}. Use "24h" or "2h".` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  } catch {
    // no body → default
  }

  const cfg = WINDOW_CONFIG[windowKey]
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let bookings: BookingRow[]
  let windowStart: string
  let windowEnd: string
  try {
    const fetched = await fetchEligibleBookings(supabase, cfg)
    bookings = fetched.bookings
    windowStart = fetched.windowStart
    windowEnd = fetched.windowEnd
  } catch (err) {
    console.error(`[reminders/${windowKey}] fetch failed:`, err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch bookings', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  console.log(
    `[reminders/${windowKey}] column=${cfg.scheduleColumn} window=${windowStart}..${windowEnd} candidates=${bookings.length}`,
  )

  if (bookings.length === 0) {
    return new Response(
      JSON.stringify({
        ok: true,
        window: windowKey,
        scheduleColumn: cfg.scheduleColumn,
        windowStart,
        windowEnd,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        results: [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const handledKeys = await preloadHandledKeys(supabase, cfg.templateName, bookings)
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://mcml.pro'

  const results = await Promise.all(
    bookings.map((b) => dispatchOne(supabase, cfg, b, handledKeys, siteUrl)),
  )

  const sent = results.filter((r) => r.ok && !r.skipped).length
  const skipped = results.filter((r) => r.ok && r.skipped).length
  const failed = results.length - sent - skipped

  return new Response(
    JSON.stringify({
      ok: failed === 0,
      window: windowKey,
      scheduleColumn: cfg.scheduleColumn,
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
    },
  )
})
