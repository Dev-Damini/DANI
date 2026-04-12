import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. CALL THE SHARED BASE URL AND THE UNIQUE VIDEO KEY
    const videoApiKey = Deno.env.get('ONSPACE_VIDEO_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL'); // Using the existing shared base URL

    if (!videoApiKey || !baseUrl) {
      throw new Error('Video configuration missing in Cloud Secrets');
    }

    console.log(`Generating video with specialized Video Key...`);

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${videoApiKey}`, // Injected Video Key
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/veo-1', 
        modalities: ['video', 'text'],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`OnSpace API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract video URL based on the standard OnSpace/Gemini response structure
    const videoUrl = aiData?.choices?.[0]?.message?.videos?.[0]?.video_url?.url || 
                     aiData?.choices?.[0]?.message?.content?.[0]?.video_url;

    if (!videoUrl) {
      throw new Error('No video URL returned from the AI service');
    }

    return new Response(
      JSON.stringify({ video_url: videoUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('generate-video-ai error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});