// Handles one-click "stop sending me reminders" links from booking
// reminder emails. Mirrors handle-email-unsubscribe but flips
// bookings.reminder_opt_out=true for the booking owning the token.

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  checkRateLimitDb,
  getClientIp,
  ipForLog,
  logTokenFailure,
  rateLimitedResponse,
} from '../_shared/rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const ENDPOINT = 'handle-reminder-opt-out'

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  const ipLog = ipForLog(ip)

  // DB-backed rate limit (cross-isolate, atomic) + log denials.
  const rl = await checkRateLimitDb(supabase, ENDPOINT, ip)
  if (!rl.allowed) {
    console.warn(`Rate limit exceeded for IP ${ip} on ${ENDPOINT}`)
    logTokenFailure(supabase, {
      endpoint: ENDPOINT,
      reason: 'rate_limited',
      ip: ipLog,
      userAgent,
      metadata: { retryAfterSec: rl.retryAfterSec, method: req.method },
    })
    return rateLimitedResponse(rl, corsHeaders)
  }

  const url = new URL(req.url)
  let token: string | null = url.searchParams.get('token')

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // RFC 8058 one-click: List-Unsubscribe=One-Click in body
      const formText = await req.text()
      const params = new URLSearchParams(formText)
      if (!params.get('List-Unsubscribe')) {
        const formToken = params.get('token')
        if (formToken) token = formToken
      }
    } else {
      try {
        const body = await req.json()
        if (body?.token) token = body.token as string
      } catch {
        // fall through
      }
    }
  }

  if (!token) {
    return jsonResponse({ error: 'Token is required' }, 400)
  }

  const { data: tokenRecord, error: lookupError } = await supabase
    .from('booking_reminder_opt_out_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (lookupError || !tokenRecord) {
    logTokenFailure(supabase, {
      endpoint: ENDPOINT,
      reason: 'invalid_token',
      ip: ipLog,
      userAgent,
      metadata: { method: req.method, tokenPreview: token.slice(0, 8) },
    })
    return jsonResponse({ error: 'Invalid or expired token' }, 404)
  }

  if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
    logTokenFailure(supabase, {
      endpoint: ENDPOINT,
      reason: 'expired',
      ip: ipLog,
      userAgent,
      metadata: { method: req.method, expiresAt: tokenRecord.expires_at },
    })
    return jsonResponse({ valid: false, reason: 'expired' }, 200)
  }

  if (tokenRecord.used_at) {
    logTokenFailure(supabase, {
      endpoint: ENDPOINT,
      reason: 'already_used',
      ip: ipLog,
      userAgent,
      metadata: { method: req.method, usedAt: tokenRecord.used_at },
    })
    return jsonResponse({ valid: false, reason: 'already_opted_out' })
  }

  // GET: just validate
  if (req.method === 'GET') {
    return jsonResponse({
      valid: true,
      patientEmail: tokenRecord.patient_email,
    })
  }

  // POST: process opt-out
  const ua = req.headers.get('user-agent') ?? null

  const { data: updated, error: updateError } = await supabase
    .from('booking_reminder_opt_out_tokens')
    .update({
      used_at: new Date().toISOString(),
      used_by_ip: ipLog,
      used_by_ua: ua,
    })
    .eq('token', token)
    .is('used_at', null)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error('[reminder-opt-out] Failed to mark token used', {
      error: updateError,
      token,
    })
    return jsonResponse({ error: 'Failed to process opt-out' }, 500)
  }

  if (!updated) {
    logTokenFailure(supabase, {
      endpoint: ENDPOINT,
      reason: 'already_used',
      ip: ipLog,
      userAgent,
      metadata: { method: 'POST', raceCondition: true },
    })
    return jsonResponse({ success: false, reason: 'already_opted_out' })
  }

  // Flip the bookings flag
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({ reminder_opt_out: true })
    .eq('id', tokenRecord.booking_id)

  if (bookingError) {
    console.error('[reminder-opt-out] Failed to set reminder_opt_out', {
      error: bookingError,
      bookingId: tokenRecord.booking_id,
    })
    return jsonResponse({ error: 'Failed to update booking' }, 500)
  }

  console.log('[reminder-opt-out] Patient opted out of reminders', {
    bookingId: tokenRecord.booking_id,
    email: tokenRecord.patient_email,
  })

  return jsonResponse({ success: true })
})
