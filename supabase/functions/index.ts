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

    // Use your specialized Video Key
    const apiKey = Deno.env.get('ONSPACE_VIDEO_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      throw new Error('OnSpace Video configuration missing in Secrets');
    }

    console.log('Requesting Veo Video for:', prompt);

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/veo-1',
        modalities: ['video'], // Fixed to single modality
        messages: [
          {
            role: 'user',
            content: `Generate a high-quality video of: ${prompt}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`Cloud API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract the video URL from the response structure
    const videoUrl = aiData?.choices?.[0]?.message?.videos?.[0]?.video_url?.url || 
                     aiData?.choices?.[0]?.message?.content;

    if (!videoUrl) {
      throw new Error('No video URL in AI response');
    }

    // This matches the "data.video_url" ChatTab is looking for
    return new Response(
      JSON.stringify({ video_url: videoUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Video Logic Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});