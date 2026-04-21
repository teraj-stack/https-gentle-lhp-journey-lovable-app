import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import {
  checkRateLimitDb,
  getClientIp,
  ipForLog,
  logTokenFailure,
  rateLimitedResponse,
} from '../_shared/rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const ENDPOINT = 'preview-transactional-email'

// Renders all registered templates with their previewData.
// Gated by LOVABLE_API_KEY — only the Go API calls this.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  const ipLog = ipForLog(ip)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // Audit-only client — must not fail the request if missing.
  const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

  // DB-backed rate limit (cross-isolate, atomic) + log denials.
  // Fail-open if supabase client missing.
  const rl = supabase
    ? await checkRateLimitDb(supabase, ENDPOINT, ip)
    : { allowed: true, retryAfterSec: 0, remaining: 10, limit: 10 }
  if (!rl.allowed) {
    console.warn(`Rate limit exceeded for IP ${ip} on ${ENDPOINT}`)
    if (supabase) {
      logTokenFailure(supabase, {
        endpoint: ENDPOINT,
        reason: 'rate_limited',
        ip: ipLog,
        userAgent,
        metadata: { retryAfterSec: rl.retryAfterSec, method: req.method },
      })
    }
    return rateLimitedResponse(rl, corsHeaders)
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Verify the caller is authorized with LOVABLE_API_KEY
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (token !== apiKey) {
    if (supabase) {
      logTokenFailure(supabase, {
        endpoint: ENDPOINT,
        reason: 'unauthorized',
        ip: ipLog,
        userAgent,
        metadata: { hasAuthHeader: !!authHeader },
      })
    }
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const templateNames = Object.keys(TEMPLATES)
  const results: Array<{
    templateName: string
    displayName: string
    subject: string
    html: string
    status: 'ready' | 'preview_data_required' | 'render_failed'
    errorMessage?: string
  }> = []

  for (const name of templateNames) {
    const entry = TEMPLATES[name]
    const displayName = entry.displayName || name

    if (!entry.previewData) {
      results.push({
        templateName: name,
        displayName,
        subject: '',
        html: '',
        status: 'preview_data_required',
      })
      continue
    }

    try {
      const html = await renderAsync(
        React.createElement(entry.component, entry.previewData)
      )
      const resolvedSubject =
        typeof entry.subject === 'function'
          ? entry.subject(entry.previewData)
          : entry.subject

      results.push({
        templateName: name,
        displayName,
        subject: resolvedSubject,
        html,
        status: 'ready',
      })
    } catch (err) {
      console.error('Failed to render template for preview', {
        template: name,
        error: err,
      })
      results.push({
        templateName: name,
        displayName,
        subject: '',
        html: '',
        status: 'render_failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return new Response(JSON.stringify({ templates: results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
