// Extract structured training details from a free-form text using Lovable AI.
// Returns: { title, company_name, location, deadline (YYYY-MM-DD|null), tags[] }
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return new Response(JSON.stringify({ error: 'missing_key' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'text_too_short' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const system = `You extract training/internship metadata from Arabic or English descriptions.
Return STRICT JSON with keys: title (short catchy title, <80 chars), company_name (or null),
location (city/remote or null), deadline (ISO date YYYY-MM-DD or null; infer from Arabic dates too),
tags (array of 2-6 short skill/topic keywords in same language). No prose. No markdown fences.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text.slice(0, 4000) },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      return new Response(JSON.stringify({ error: 'ai_failed', detail: errTxt, status: res.status }), {
        status: res.status === 429 || res.status === 402 ? res.status : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const out = {
      title: typeof parsed.title === 'string' ? parsed.title.trim().slice(0, 120) : null,
      company_name: typeof parsed.company_name === 'string' ? parsed.company_name.trim() : null,
      location: typeof parsed.location === 'string' ? parsed.location.trim() : null,
      deadline: typeof parsed.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.deadline) ? parsed.deadline : null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: any) => typeof t === 'string').slice(0, 6) : [],
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'unexpected', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
