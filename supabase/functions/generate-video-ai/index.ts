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

    console.log(`Generating video for prompt: "${prompt}"`);

    const response = await fetch('https://daminicodes.vercel.app/api/veo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    console.log('Veo API status:', response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Veo API error:', errText);
      throw new Error(`Veo API error (${response.status}): ${errText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('Veo response content-type:', contentType);

    // Handle both JSON (video_url) and raw video binary responses
    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Veo JSON response keys:', Object.keys(data));
      // Common response fields: video_url, url, videoUrl, output
      const videoUrl = data.video_url || data.url || data.videoUrl || data.output || data.result;
      if (!videoUrl) {
        throw new Error(`Unexpected JSON response: ${JSON.stringify(data)}`);
      }
      return new Response(
        JSON.stringify({ video_url: videoUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Raw video binary — convert to base64 data URL
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const mimeType = contentType.includes('mp4') ? 'video/mp4' : contentType || 'video/mp4';
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return new Response(
        JSON.stringify({ video_url: dataUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Video generation failed';
    console.error('generate-video-ai error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
