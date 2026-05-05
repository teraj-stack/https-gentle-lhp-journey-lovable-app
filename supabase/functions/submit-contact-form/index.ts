// submit-contact-form: secure intermediary for the public contact &
// partnership forms.
//
// This function is the ONLY anon-callable path that produces clinic-
// branded emails. It exists because `send-transactional-email` was
// hardened to reject all non-service-role callers (closing the open
// email-relay vulnerability where any internet caller could send
// branded emails to arbitrary recipients).
//
// Flow:
//   1. Verify Cloudflare Turnstile token server-side
//   2. Validate inputs (zod-style manual checks — Deno-friendly)
//   3. Cap recipient list to a small fixed set (no arbitrary recipients)
//   4. Invoke `send-transactional-email` with the SERVICE-ROLE key
//
// Fixed allowlists prevent a caller from supplying arbitrary
// recipientEmail / templateName values to dispatch unrelated templates.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// Two supported public-form flows. Each one fixes the templates that
// can be invoked AND the internal recipients that may receive a
// notification copy. Adding a new public form means adding a new
// entry here — never widening these allowlists per-request.
type FormType = 'contact' | 'b2b'

interface FormConfig {
  confirmationTemplate: string
  // null = no internal notification copies for this form
  notificationTemplate: string | null
  internalRecipients: readonly string[]
}

const FORMS: Record<FormType, FormConfig> = {
  contact: {
    confirmationTemplate: 'contact-confirmation',
    // Original Kontakt flow only sent a confirmation to the submitter.
    // Preserve that — no internal notification template exists yet.
    notificationTemplate: null,
    internalRecipients: [],
  },
  b2b: {
    confirmationTemplate: 'contact-confirmation',
    notificationTemplate: 'b2b-inquiry-notification',
    internalRecipients: ['dr.bujok@cml.pl', 'biuro@cml.pl'],
  },
}

interface RequestBody {
  formType?: string
  turnstileToken?: string
  email?: string
  name?: string
  phone?: string
  message?: string
  facility?: string
  source?: string
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidEmail(value: string): boolean {
  // RFC-light, matches what zod's .email() accepts in the client form
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 255
}

function trimOrEmpty(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  const v = value.trim()
  return v.length > max ? v.slice(0, max) : v
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('submit-contact-form: missing Supabase env vars')
    return jsonResponse(500, { error: 'Server configuration error' })
  }
  if (!turnstileSecret) {
    console.error('submit-contact-form: TURNSTILE_SECRET_KEY not configured')
    return jsonResponse(503, { error: 'CAPTCHA verification unavailable' })
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' })
  }

  // ----- Validate formType -----
  const formType = body.formType as FormType
  if (formType !== 'contact' && formType !== 'b2b') {
    return jsonResponse(400, { error: 'Invalid formType' })
  }
  const config = FORMS[formType]

  // ----- Verify Turnstile -----
  if (!body.turnstileToken || typeof body.turnstileToken !== 'string') {
    return jsonResponse(400, { error: 'Missing CAPTCHA token' })
  }
  try {
    const formData = new FormData()
    formData.append('secret', turnstileSecret)
    formData.append('response', body.turnstileToken)
    const tsRes = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
    })
    const outcome = await tsRes.json()
    if (!outcome.success) {
      console.warn('submit-contact-form: Turnstile rejection', outcome['error-codes'])
      return jsonResponse(403, { error: 'CAPTCHA verification failed' })
    }
  } catch (err) {
    console.error('submit-contact-form: Turnstile verify error', err)
    return jsonResponse(502, { error: 'CAPTCHA verification unavailable' })
  }

  // ----- Validate fields -----
  const email = trimOrEmpty(body.email, 255)
  if (!isValidEmail(email)) {
    return jsonResponse(400, { error: 'Invalid email' })
  }
  const message = trimOrEmpty(body.message, 2000)
  if (message.length === 0) {
    return jsonResponse(400, { error: 'Message is required' })
  }
  const name = trimOrEmpty(body.name, 100) || undefined
  const phone = trimOrEmpty(body.phone, 30) || undefined
  const facility = trimOrEmpty(body.facility, 150) || undefined
  const source = trimOrEmpty(body.source, 50) || formType

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  const id = crypto.randomUUID()

  // ----- Confirmation to the submitter -----
  const confirmationData =
    formType === 'b2b'
      ? { name: facility, subject: 'Współpraca B2B – CML', message }
      : { name }

  const sends: Promise<unknown>[] = [
    supabaseAdmin.functions.invoke('send-transactional-email', {
      body: {
        templateName: config.confirmationTemplate,
        recipientEmail: email,
        idempotencyKey: `${formType}-confirm-${id}`,
        templateData: confirmationData,
      },
    }),
  ]

  // ----- Internal notification copies -----
  for (const recipient of config.internalRecipients) {
    const notifData =
      formType === 'b2b'
        ? { senderEmail: email, facility, message, source }
        : { name, email, phone, message, source }

    sends.push(
      supabaseAdmin.functions.invoke('send-transactional-email', {
        body: {
          templateName: config.notificationTemplate,
          recipientEmail: recipient,
          idempotencyKey: `${formType}-notify-${id}-${recipient}`,
          templateData: notifData,
        },
      }),
    )
  }

  const results = await Promise.allSettled(sends)
  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error('submit-contact-form: some sends failed', failed)
    // Still return success to the client if at least the confirmation
    // was attempted — internal notification failures shouldn't block UX.
    if (results[0].status === 'rejected') {
      return jsonResponse(502, { error: 'Failed to send confirmation' })
    }
  }

  return jsonResponse(200, { success: true, id })
})
