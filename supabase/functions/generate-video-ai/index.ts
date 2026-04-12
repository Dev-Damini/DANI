import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // 1. Handle Preflight
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    const videoApiKey = Deno.env.get('ONSPACE_VIDEO_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!videoApiKey || !baseUrl) {
      throw new Error('CONFIG_ERROR: Missing Keys in Cloud Secrets');
    }

    console.log(`Sending Video Prompt: ${prompt}`);

    // 2. The Fetch Call
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${videoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/veo-1', // Ensure this is the exact model name OnSpace expects
        messages: [{ role: 'user', content: prompt }],
        // Adding both common formats for safety
        modalities: ['video'], 
      }),
    });

    // 3. Robust Error Handling (Avoids the 500 crash)
    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error details:', errorData);
      throw new Error(`API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log('API Raw Response:', JSON.stringify(data));

    // 4. THE DEEP SCAN (Find the video URL no matter where they hide it)
    let finalVideoUrl = "";

    // Check Choice 1: The standard multimodal path
    if (data?.choices?.[0]?.message?.videos?.[0]?.video_url?.url) {
       finalVideoUrl = data.choices[0].message.videos[0].video_url.url;
    } 
    // Check Choice 2: The standard "content" path (sometimes it's just a string)
    else if (data?.choices?.[0]?.message?.content && data.choices[0].message.content.includes('http')) {
       finalVideoUrl = data.choices[0].message.content;
    }
    // Check Choice 3: The 'output' or 'result' path
    else if (data?.output || data?.result) {
       finalVideoUrl = data.output || data.result;
    }

    if (!finalVideoUrl) {
      console.error('Data structure received:', data);
      throw new Error('Video was created but the URL is missing from the response.');
    }

    // 5. Send back to DANI UI
    return new Response(
      JSON.stringify({ video_url: finalVideoUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('CRITICAL FUNCTION ERROR:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
