import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const daysRaw = Number(url.searchParams.get('days') ?? '7');
    const days = Number.isFinite(daysRaw)
      ? Math.max(1, Math.min(90, Math.floor(daysRaw)))
      : 7;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.rpc('get_public_web_vitals_summary', { p_days: days });
    if (error) throw error;

    return new Response(JSON.stringify({ data: data ?? [] }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to load web vitals summary' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
