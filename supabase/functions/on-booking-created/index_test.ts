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

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!

const ENDPOINT = 'on-booking-created'
const LIMIT = 60 // musi pasować do WEBHOOK_LIMIT.max w index.ts
const TOTAL_REQUESTS = 80 // 20 powyżej limitu

// Unikalne IP per przebieg testu, aby nie kolidować z innymi przebiegami
// w tym samym oknie 60s (fixed-window).
const TEST_IP = `203.0.113.${Math.floor(Math.random() * 200) + 10}`

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

Deno.test('on-booking-created — DB rate-limit triggers 429 after LIMIT requests/minute from same IP', async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    throw new Error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  const url = `${SUPABASE_URL}/functions/v1/${ENDPOINT}`
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Czysty stan dla tego IP w aktualnym oknie
  await admin.from('rate_limit_buckets').delete().eq('endpoint', ENDPOINT).eq('ip', TEST_IP)

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
          'x-forwarded-for': TEST_IP,
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

  console.log(`[rate-limit-test] IP=${TEST_IP} 200=${ok} 429=${rateLimited} other=${TOTAL_REQUESTS - ok - rateLimited}`)

  // Co najmniej (TOTAL - LIMIT) powinno dostać 429. Dajemy mały margines
  // bo równoległe wywołania mogą trafić w skraj okna fixed-window.
  assert(
    rateLimited >= TOTAL_REQUESTS - LIMIT - 5,
    `expected at least ${TOTAL_REQUESTS - LIMIT - 5} 429s, got ${rateLimited}`
  )
  assert(ok > 0, `expected some 200 responses, got 0`)

  // Bucket w DB powinien mieć count >= TOTAL_REQUESTS (atomic UPSERT).
  const { data: buckets, error } = await admin
    .from('rate_limit_buckets')
    .select('endpoint, ip, count, window_start')
    .eq('endpoint', ENDPOINT)
    .eq('ip', TEST_IP)
    .order('window_start', { ascending: false })
    .limit(1)

  assertEquals(error, null)
  assert(buckets && buckets.length === 1, 'expected one bucket row')
  console.log(`[rate-limit-test] bucket count=${buckets[0].count}`)
  assert(
    buckets[0].count >= TOTAL_REQUESTS,
    `expected bucket count >= ${TOTAL_REQUESTS}, got ${buckets[0].count}`
  )

  // Cleanup
  await admin.from('rate_limit_buckets').delete().eq('endpoint', ENDPOINT).eq('ip', TEST_IP)
})
