// E2E test: wysyła wiele równoległych zdarzeń webhook do on-booking-created
// z tego samego IP (poprzez nagłówek x-forwarded-for) i sprawdza, że:
//   1) część odpowiedzi to 429 (rate-limited),
//   2) w tabeli rate_limit_buckets pojawia się bucket z count > limit (60).
//
// Uruchamiane lokalnie / w sandboxie z dostępem do .env (VITE_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY w Edge Function secrets).
//
// UWAGA: Ten test wymaga deployu funkcji + dostępu do prawdziwej bazy.
// Używa fikcyjnego booking_id który NIE istnieje w bookings → on-booking-created
// dotrze do logiki insertowania action tokenów, ale to OK — sprawdzamy
// wyłącznie warstwę rate-limitu, która działa PRZED logiką biznesową.

import 'https://deno.land/std@0.224.0/dotenv/load.ts'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

import { RATE_LIMITS } from '../_shared/rate-limit.ts'

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!

const ENDPOINT = 'on-booking-created'
// Single source of truth — pulled from shared registry, never hardcoded.
const LIMIT = RATE_LIMITS[ENDPOINT].max
const TOTAL_REQUESTS = LIMIT + 20 // 20 powyżej limitu

// UWAGA: Supabase Functions runtime nadpisuje x-forwarded-for własnym
// IP wychodzącym (klient testowy nie może go sfałszować). Dlatego nie
// filtrujemy bucketu po IP testera — szukamy bucketu o count >= TOTAL_REQUESTS
// w aktualnym oknie czasowym dla naszego endpointu.

function buildPayload() {
  return {
    type: 'INSERT',
    table: 'bookings',
    schema: 'public',
    record: {
      // Fikcyjny UUID — booking_action_tokens.insert padnie przez FK,
      // ale rate-limit i tak zadziała wcześniej. Email patient_email
      // zostawiamy pusty żeby wyjść wcześnie ze 'skipped' i nie spamować poczty.
      id: '00000000-0000-0000-0000-000000000000',
      patient_name: 'RL Test',
      patient_email: '', // wymusza skipped: 'missing id or patient_email'
      appointment_date: '2099-01-01',
      appointment_time: '10:00',
      location: 'Wilanów',
    },
    old_record: null,
  }
}

Deno.test({
  name: 'on-booking-created — DB rate-limit triggers 429 after LIMIT requests/minute from same IP',
  // supabase-js trzyma heartbeat na realtime channel — nieistotne dla naszego testu.
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    throw new Error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  const url = `${SUPABASE_URL}/functions/v1/${ENDPOINT}`
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Wyczyść WSZYSTKIE buckety dla tego endpointu, żeby start był deterministyczny.
  // (W środowisku dev nie ma realnego ruchu webhookowego współbieżnie z testem.)
  await admin.from('rate_limit_buckets').delete().eq('endpoint', ENDPOINT)

  // Cofamy się o 90s — bucket window_start jest zaokrąglony do początku minuty,
  // więc nasz burst może trafić w bucket startujący do ~60s wcześniej.
  const windowStartIso = new Date(Date.now() - 90_000).toISOString()

  // Równoległy burst
  const responses = await Promise.all(
    Array.from({ length: TOTAL_REQUESTS }, () =>
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Anon key wystarczy — funkcja deployowana z verify_jwt=false,
          // ale platforma wymaga apikey w nagłówku.
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify(buildPayload()),
      }).then(async (r) => {
        await r.text() // consume body
        return r.status
      })
    )
  )

  const ok = responses.filter((s) => s === 200).length
  const rateLimited = responses.filter((s) => s === 429).length

  console.log(`[rate-limit-test] 200=${ok} 429=${rateLimited} other=${TOTAL_REQUESTS - ok - rateLimited}`)

  // Asercje na warstwie HTTP — to jest właściwy kontrakt rate-limitu.
  assert(
    rateLimited >= TOTAL_REQUESTS - LIMIT - 5,
    `expected at least ${TOTAL_REQUESTS - LIMIT - 5} 429s, got ${rateLimited}`
  )
  assert(ok > 0, `expected some 200 responses, got 0`)

  // Bucket w DB powinien istnieć z count >= TOTAL_REQUESTS. Filtrujemy
  // po endpointcie + window_start z naszego przebiegu — Supabase Functions
  // runtime nadpisuje x-forwarded-for swoim outbound IP, więc nie filtrujemy
  // po IP testera.
  const { data: buckets, error } = await admin
    .from('rate_limit_buckets')
    .select('endpoint, ip, count, window_start')
    .eq('endpoint', ENDPOINT)
    .gte('window_start', windowStartIso)
    .order('count', { ascending: false })
    .limit(1)

  assertEquals(error, null)
  assert(buckets && buckets.length >= 1, 'expected at least one bucket row in current window')
  console.log(`[rate-limit-test] bucket ip=${buckets![0].ip} count=${buckets![0].count}`)
  // 5-req margines: pojedyncze żądania mogą paść na poziomie transportu
  // (timeouty/connection reset) i nie dotrzeć do RPC, więc bucket może
  // być nieco mniejszy od TOTAL_REQUESTS.
  assert(
    buckets![0].count >= TOTAL_REQUESTS - 5,
    `expected bucket count >= ${TOTAL_REQUESTS - 5}, got ${buckets![0].count}`
  )
  },
})
