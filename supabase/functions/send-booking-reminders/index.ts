// Scheduled Edge Function — generic booking reminder dispatcher.
//
// Replaces the previous separate `send-booking-reminders` (24h) and
// `send-booking-reminders-2h` functions. Behaviour is selected via the
// `window` body param: "24h" (tomorrow's bookings) or "2h" (today, in a
// 90–150 min window from now).
//
// Schedules (configured via pg_cron):
//   - hourly  → POST { "window": "24h" }
//   - /30 min → POST { "window": "2h" }
//
// Idempotency: keys differ per window — see WINDOW_CONFIG below.
// Pre-checks email_send_log to skip already-pending/sent reminders.

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'

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

type WindowKey = '24h' | '2h'

// ---------- Location label resolution (shared) ----------

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

// ---------- Time helpers (Europe/Warsaw) ----------

function dateInWarsaw(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function timeInWarsaw(offsetMinutes: number): string {
  const future = new Date(Date.now() + offsetMinutes * 60 * 1000)
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(future)
}

function normalizeTime(t: string): string {
  return t?.slice(0, 5) ?? ''
}

// ---------- Per-window config ----------

interface WindowConfig {
  templateName: string
  /** Date to scan in Europe/Warsaw (YYYY-MM-DD). */
  targetDate: () => string
  /** Optional time-window filter applied client-side after fetch. */
  timeWindow?: () => { start: string; end: string }
  /** Idempotency key for a given booking. */
  idempotencyKey: (b: BookingRow) => string
  /** Build template payload sent to send-transactional-email. */
  buildTemplateData: (b: BookingRow) => Record<string, unknown>
}

const WINDOW_CONFIG: Record<WindowKey, WindowConfig> = {
  '24h': {
    templateName: 'booking-reminder',
    targetDate: () => dateInWarsaw(1), // tomorrow
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
    targetDate: () => dateInWarsaw(0), // today
    timeWindow: () => ({ start: timeInWarsaw(90), end: timeInWarsaw(150) }),
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
): Promise<{ bookings: BookingRow[]; targetDate: string; timeWindow?: { start: string; end: string } }> {
  const targetDate = cfg.targetDate()
  const timeWindow = cfg.timeWindow?.()

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, patient_name, patient_email, appointment_date, appointment_time, location, status, reminder_opt_out',
    )
    .eq('appointment_date', targetDate)
    .neq('status', 'cancelled')
    .eq('reminder_opt_out', false)
    .returns<BookingRow[]>()

  if (error) throw error

  let bookings = data ?? []
  if (timeWindow) {
    bookings = bookings.filter((b) => {
      const t = normalizeTime(b.appointment_time)
      return t >= timeWindow.start && t <= timeWindow.end
    })
  }
  return { bookings, targetDate, timeWindow }
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

async function dispatchOne(
  supabase: SupabaseClient,
  cfg: WindowConfig,
  booking: BookingRow,
  handledKeys: Set<string>,
) {
  if (!booking.patient_email) {
    return { id: booking.id, ok: false, skipped: false, error: 'missing patient_email' }
  }
  const idempotencyKey = cfg.idempotencyKey(booking)

  if (handledKeys.has(idempotencyKey)) {
    console.log(`[reminders] Skip ${booking.id} — already handled (${idempotencyKey})`)
    return { id: booking.id, ok: true, skipped: true, reason: 'already_sent' as const }
  }

  try {
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: cfg.templateName,
        recipientEmail: booking.patient_email,
        idempotencyKey,
        templateData: cfg.buildTemplateData(booking),
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
    return new Response(null, { headers: corsHeaders })
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
  let targetDate: string
  let timeWindow: { start: string; end: string } | undefined
  try {
    const fetched = await fetchEligibleBookings(supabase, cfg)
    bookings = fetched.bookings
    targetDate = fetched.targetDate
    timeWindow = fetched.timeWindow
  } catch (err) {
    console.error(`[reminders/${windowKey}] fetch failed:`, err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch bookings', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  console.log(
    `[reminders/${windowKey}] target=${targetDate}` +
      (timeWindow ? ` window=${timeWindow.start}..${timeWindow.end}` : '') +
      ` candidates=${bookings.length}`,
  )

  if (bookings.length === 0) {
    return new Response(
      JSON.stringify({
        ok: true,
        window: windowKey,
        targetDate,
        ...(timeWindow ? { windowStart: timeWindow.start, windowEnd: timeWindow.end } : {}),
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

  const results = await Promise.all(
    bookings.map((b) => dispatchOne(supabase, cfg, b, handledKeys)),
  )

  const sent = results.filter((r) => r.ok && !r.skipped).length
  const skipped = results.filter((r) => r.ok && r.skipped).length
  const failed = results.length - sent - skipped

  return new Response(
    JSON.stringify({
      ok: failed === 0,
      window: windowKey,
      targetDate,
      ...(timeWindow ? { windowStart: timeWindow.start, windowEnd: timeWindow.end } : {}),
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
