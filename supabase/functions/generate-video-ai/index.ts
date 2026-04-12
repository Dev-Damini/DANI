import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // 1. Handle Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    // 2. Pull the specific Video API Key
    const videoApiKey = Deno.env.get('ONSPACE_VIDEO_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!videoApiKey || !baseUrl) {
      throw new Error('Video API configuration missing in OnSpace Secrets');
    }

    console.log(`Calling Gemini Veo for prompt: ${prompt}`);

    // 3. Exact fetch structure for Gemini Veo via OnSpace
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${videoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/veo-1',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        // Ensuring the API knows to generate a video
        modalities: ['video'],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error Response:', data);
      throw new Error(data.error?.message || 'The AI service failed to generate video');
    }

    // 4. MAPPING DATA TO MATCH YOUR FRONTEND
    // Your ChatTab.tsx expects "video_url" inside the response
    const videoUrl = data?.choices?.[0]?.message?.videos?.[0]?.video_url?.url || 
                     data?.choices?.[0]?.message?.content;

    if (!videoUrl) {
      throw new Error('Video generated but no URL found in response');
    }

    return new Response(
      JSON.stringify({ video_url: videoUrl }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Edge Function Crash:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});