import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // 1. Handle Preflight
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    
    // 2. Pull Keys from Cloud
    const apiKey = Deno.env.get('ONSPACE_VIDEO_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'Config missing: Check ONSPACE_VIDEO_API_KEY and ONSPACE_AI_BASE_URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. The API Call - Matching your Image Logic structure
    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/veo-1', // Ensure this model name is supported on your OnSpace plan
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['video'], 
      }),
    });

    // Handle non-OK responses without crashing
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return new Response(
        JSON.stringify({ error: `API Error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();

    // 4. SMART DATA EXTRACTION
    // We look for the video URL in every possible place Gemini/OnSpace might put it
    const videoUrl = 
      aiData?.choices?.[0]?.message?.videos?.[0]?.video_url?.url || 
      aiData?.choices?.[0]?.message?.content ||
      aiData?.video_url || 
      aiData?.output;

    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
      return new Response(
        JSON.stringify({ error: 'AI generated a response but no video link was found.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. SUCCESS: Send to ChatTab.tsx
    return new Response(
      JSON.stringify({ video_url: videoUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    // This prevents the 500 Internal Server Error crash
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});