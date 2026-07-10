import { corsHeaders } from '../_shared/cors.ts';

const OMEGATECH_BASE = 'https://omegatech-api.dixonomega.tech/api/ai';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enc = encodeURIComponent(prompt.trim());
    console.log('Video generation request, prompt:', prompt.slice(0, 80));

    // Use veo3 GET endpoint — returns video_url directly
    const res = await fetch(`${OMEGATECH_BASE}/veo3?prompt=${enc}`, {
      method: 'GET',
      signal: AbortSignal.timeout(120000), // 2 minutes
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Veo3 error:', res.status, errText.slice(0, 200));
      throw new Error(`Video generation failed (${res.status})`);
    }

    const contentType = res.headers.get('content-type') || '';
    console.log('Veo3 content-type:', contentType);

    // Direct video binary
    if (contentType.startsWith('video/')) {
      const binary = await res.arrayBuffer();
      const arr = new Uint8Array(binary);
      const b64 = btoa(String.fromCharCode(...arr));
      return new Response(
        JSON.stringify({ video_url: `data:${contentType};base64,${b64}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // JSON response
    if (contentType.includes('json')) {
      const data = await res.json();
      console.log('Veo3 JSON:', JSON.stringify(data).slice(0, 300));

      const videoUrl =
        data?.video_url || data?.url || data?.result || data?.output ||
        data?.data?.url || data?.data?.video_url || data?.videoUrl;

      if (videoUrl && typeof videoUrl === 'string') {
        return new Response(
          JSON.stringify({ video_url: videoUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Has task_id — poll for result
      const taskId = data?.task_id || data?.taskId || data?.id;
      if (taskId) {
        console.log('Veo3 async task:', taskId, '— polling...');
        const finalUrl = await pollVideoTask(taskId);
        return new Response(
          JSON.stringify({ video_url: finalUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Veo3: no video URL in response: ${JSON.stringify(data).slice(0, 200)}`);
    }

    throw new Error('Veo3: unexpected response format');

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('generate-video-ai error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function pollVideoTask(taskId: string, maxAttempts = 24): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const res = await fetch(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${taskId}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 'completed') {
        const url = data.video_url || data.url || data.result || data.output;
        if (url) return url;
        throw new Error('Task completed but no video URL');
      }
      if (data.status === 'failed') throw new Error('Video task failed on server');
      console.log(`Poll ${i + 1}: ${data.status || 'pending'}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('failed') || msg.includes('no video')) throw e;
    }
  }
  throw new Error('Video generation timed out');
}
