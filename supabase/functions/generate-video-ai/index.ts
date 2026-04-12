import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Step 1: Parse body
    let prompt: string;
    try {
      const body = await req.json();
      prompt = body?.prompt;
      if (!prompt) throw new Error('Missing "prompt" in request body');
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: `Body parse failed: ${e.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check env vars
    const apiKey = Deno.env.get('ONSPACE_VIDEO_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'Config missing: Check ONSPACE_VIDEO_API_KEY and ONSPACE_AI_BASE_URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Build URL safely (strip trailing slash)
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    // Step 4: Make the API call
    let aiResponse: Response;
    try {
      aiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/veo-1',
          messages: [{ role: 'user', content: prompt }],
          modalities: ['video'],
        }),
      });
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: `Fetch failed: ${e.message}`, endpoint }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return new Response(
        JSON.stringify({ error: `API Error ${aiResponse.status}`, detail: errorText, endpoint }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();

    // Step 5: Extract video URL — also return raw data so you can inspect the shape
    const videoUrl =
      aiData?.choices?.[0]?.message?.videos?.[0]?.video_url?.url ||
      aiData?.choices?.[0]?.message?.content ||
      aiData?.video_url ||
      aiData?.output;

    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
      return new Response(
        JSON.stringify({ error: 'No video URL found in response', raw: aiData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ video_url: videoUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error', stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});