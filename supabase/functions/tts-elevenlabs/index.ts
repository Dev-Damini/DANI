import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Beatrice TTS endpoint
    const encodedText = encodeURIComponent(text);
    const ttsUrl = `https://apis.prexzyvilla.site/tts/beatrice?text=${encodedText}`;

    console.log('Calling Beatrice TTS for text length:', text.length);

    const response = await fetch(ttsUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Beatrice TTS error:', errorText);
      throw new Error(`TTS request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const audioBlob = await response.blob();

    return new Response(audioBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType.startsWith('audio') ? contentType : 'audio/mpeg',
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('TTS error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
